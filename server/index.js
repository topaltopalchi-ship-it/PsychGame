import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "sessions.json");
const PORT = Number(process.env.PORT || 8787);
const AUTHOR_TOKEN = process.env.AUTHOR_TOKEN || "";

fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, "[]", "utf8");

function readSessions() {
  try { return JSON.parse(fs.readFileSync(dataFile, "utf8")); }
  catch { return []; }
}

function writeSessions(items) {
  const tempFile = dataFile + ".tmp";
  fs.writeFileSync(tempFile, JSON.stringify(items, null, 2), "utf8");
  fs.renameSync(tempFile, dataFile);
}

function isValidSessionReport(report) {
  return Boolean(
    report &&
    typeof report === "object" &&
    typeof report.sessionId === "string" &&
    report.sessionId.length > 0 &&
    report.sessionId.length <= 128 &&
    typeof report.playerCode === "string" &&
    report.playerCode.length > 0 &&
    report.playerCode.length <= 128 &&
    Array.isArray(report.events) &&
    report.events.length <= 10000
  );
}

function authorized(req) {
  if (!AUTHOR_TOKEN) return true;
  return req.headers.authorization === "Bearer " + AUTHOR_TOKEN;
}

function send(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});
  if (req.url === "/api/health" && req.method === "GET") return send(res, 200, { ok: true });

  if (req.url === "/api/sessions" && req.method === "POST") {
    if (!authorized(req)) return send(res, 401, { error: "Unauthorized" });
    const MAX_BODY_BYTES = 2_000_000;
    const contentLength = Number(req.headers["content-length"] || 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      req.resume();
      return send(res, 413, { error: "Payload too large" });
    }

    let raw = "";
    let tooLarge = false;
    req.on("data", chunk => {
      if (tooLarge) return;
      raw += chunk;
      if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
        tooLarge = true;
        raw = "";
        req.resume();
        send(res, 413, { error: "Payload too large" });
      }
    });
    req.on("end", () => {
      if (tooLarge) return;
      try {
        const payload = JSON.parse(raw);
        if (!isValidSessionReport(payload?.report)) {
          return send(res, 400, { error: "Invalid session report" });
        }

        const sessions = readSessions();
        const report = payload.report;
        const record = {
          id: report.sessionId,
          playerCode: report.playerCode,
          receivedAt: new Date().toISOString(),
          completed: Boolean(payload.completed),
          report
        };

        const index = sessions.findIndex(item => item.id === record.id);
        if (index >= 0) {
          const existing = sessions[index];
          if (existing.completed && !record.completed) {
            return send(res, 200, { ok: true, id: record.id, preservedCompleted: true });
          }
          sessions[index] = record;
        } else {
          sessions.push(record);
        }
        writeSessions(sessions.slice(-5000));
        return send(res, 201, { ok: true, id: record.id });
      } catch {
        return send(res, 400, { error: "Invalid JSON" });
      }
    });
    return;
  }

  if (req.url === "/api/sessions" && req.method === "GET") {
    if (!authorized(req)) return send(res, 401, { error: "Unauthorized" });
    const sessions = readSessions().map(({ report, ...meta }) => ({
      ...meta,
      playerCode: report.playerCode,
      sessionId: report.sessionId,
      eventCount: report.eventCount,
      sessionDurationMs: report.sessionDurationMs,
      completedRooms: report.completedRooms,
      path: report.path
    }));
    return send(res, 200, { sessions });
  }

  if (req.url.startsWith("/api/sessions/") && req.method === "GET") {
    if (!authorized(req)) return send(res, 401, { error: "Unauthorized" });
    const id = decodeURIComponent(req.url.slice("/api/sessions/".length));
    const record = readSessions().find(item => item.id === id);
    return record ? send(res, 200, record) : send(res, 404, { error: "Not found" });
  }

  send(res, 404, { error: "Not found" });
});

server.listen(PORT, () => console.log("PsychGame API listening on port " + PORT));