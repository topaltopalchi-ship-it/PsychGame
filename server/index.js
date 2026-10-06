import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, "data");
const dataFile = path.join(dataDir, "sessions.json");
const patientsFile = path.join(dataDir, "patients.json");
const PORT = Number(process.env.PORT || 8787);
const AUTHOR_TOKEN = process.env.AUTHOR_TOKEN || "";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const NODE_ENV = String(process.env.NODE_ENV || "development").toLowerCase();

if (NODE_ENV === "production") {
  if (!AUTHOR_TOKEN) throw new Error("AUTHOR_TOKEN must be configured in production");
  if (!ADMIN_TOKEN) throw new Error("ADMIN_TOKEN must be configured in production");
  if (!CORS_ORIGIN || CORS_ORIGIN === "*") throw new Error("CORS_ORIGIN must be an exact origin in production");
}

fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, "[]", "utf8");
if (!fs.existsSync(patientsFile)) fs.writeFileSync(patientsFile, "[]", "utf8");

function readSessions() {
  try { return JSON.parse(fs.readFileSync(dataFile, "utf8")); }
  catch { return []; }
}

function readPatients() {
  try { return JSON.parse(fs.readFileSync(patientsFile, "utf8")); }
  catch { return []; }
}

function writePatients(items) {
  const tempFile = patientsFile + ".tmp";
  fs.writeFileSync(tempFile, JSON.stringify(items, null, 2), "utf8");
  fs.renameSync(tempFile, patientsFile);
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

function ingestAuthorized(req) {
  if (!AUTHOR_TOKEN) return true;
  return req.headers.authorization === "Bearer " + AUTHOR_TOKEN;
}

function adminAuthorized(req) {
  if (!ADMIN_TOKEN) return false;
  return req.headers.authorization === "Bearer " + ADMIN_TOKEN;
}

function send(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": CORS_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});
  if (req.url === "/api/health" && req.method === "GET") return send(res, 200, { ok: true });

  if (req.url === "/api/sessions" && req.method === "POST") {
    if (!ingestAuthorized(req)) return send(res, 401, { error: "Unauthorized" });
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

  if (req.url.startsWith("/api/patients") && req.method === "POST") {
    if (!adminAuthorized(req)) return send(res, 401, { error: "Unauthorized" });
    let raw = "";
    req.on("data", chunk => { raw += chunk; if (Buffer.byteLength(raw, "utf8") > 10000) req.destroy(); });
    req.on("end", () => {
      try {
        const body = JSON.parse(raw || "{}");
        const name = String(body.name || "").trim();
        let code = String(body.code || "").trim().toUpperCase();
        if (!name || name.length > 200) return send(res, 400, { error: "Invalid patient name" });
        if (!code) code = "P-" + Math.floor(100000 + Math.random() * 900000);
        if (!/^[A-Z0-9_-]{4,64}$/.test(code)) return send(res, 400, { error: "Invalid patient code" });
        const patients = readPatients();
        if (patients.some(p => p.code === code)) return send(res, 409, { error: "Patient code already exists" });
        const patient = { code, name, createdAt: new Date().toISOString() };
        patients.push(patient); writePatients(patients.slice(-10000));
        return send(res, 201, { ok: true, patient });
      } catch { return send(res, 400, { error: "Invalid JSON" }); }
    });
    return;
  }

  if (req.url.startsWith("/api/patients") && req.method === "GET") {
    if (!adminAuthorized(req)) return send(res, 401, { error: "Unauthorized" });
    const url = new URL(req.url, "http://localhost");
    const search = String(url.searchParams.get("search") || "").trim().toLowerCase();
    const patients = readPatients().filter(p => !search || String(p.code).toLowerCase().includes(search) || String(p.name).toLowerCase().includes(search));
    return send(res, 200, { patients: patients.slice(-100) });
  }

  if (req.url === "/api/sessions" && req.method === "GET") {
    if (!adminAuthorized(req)) return send(res, 401, { error: "Unauthorized" });
    const url = new URL(req.url, "http://localhost");
    const patientCode = String(url.searchParams.get("patientCode") || "").trim();
    const sessions = readSessions().filter(item => !patientCode || item.playerCode === patientCode || item.report?.playerCode === patientCode).map(({ report, ...meta }) => ({
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
    if (!adminAuthorized(req)) return send(res, 401, { error: "Unauthorized" });
    const id = decodeURIComponent(req.url.slice("/api/sessions/".length));
    const record = readSessions().find(item => item.id === id);
    return record ? send(res, 200, record) : send(res, 404, { error: "Not found" });
  }

  send(res, 404, { error: "Not found" });
});

server.listen(PORT, () => console.log("PsychGame API listening on port " + PORT));