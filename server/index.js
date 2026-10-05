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
  fs.writeFileSync(dataFile, JSON.stringify(items, null, 2), "utf8");
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
    let raw = "";
    req.on("data", chunk => {
      raw += chunk;
      if (raw.length > 2_000_000) req.destroy();
    });
    req.on("end", () => {
      try {
        const payload = JSON.parse(raw);
        if (!payload?.report?.sessionId || !payload?.report?.playerCode) {
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
        if (index >= 0) sessions[index] = record;
        else sessions.push(record);
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
