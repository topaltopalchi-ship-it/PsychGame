import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const port = 8899;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "psychgame-api-"));
const dataDir = path.join(tempDir, "data");
fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(path.join(dataDir, "sessions.json"), "[]", "utf8");

const child = spawn(process.execPath, ["server/index.js"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
    DATA_DIR: dataDir,
    AUTHOR_TOKEN: "test-token",
    CORS_ORIGIN: "http://test.local"
  },
  stdio: ["ignore", "pipe", "pipe"]
});

const base = `http://127.0.0.1:${port}`;

async function waitForServer() {
  for (let i = 0; i < 50; i += 1) {
    try {
      const response = await fetch(base + "/api/health");
      if (response.ok) return;
    } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("API server did not start");
}

async function request(url, options = {}) {
  return fetch(base + url, options);
}

try {
  await waitForServer();

  const health = await request("/api/health");
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true });

  const healthCors = health.headers.get("access-control-allow-origin");
  assert.equal(healthCors, "http://test.local");

  const unauthorized = await request("/api/sessions");
  assert.equal(unauthorized.status, 401);

  const report = {
    sessionId: "smoke-session",
    playerCode: "PLAYER-SMOKE",
    events: [],
    eventCount: 0,
    sessionDurationMs: 0,
    completedRooms: [],
    path: []
  };

  const invalid = await request("/api/sessions", {
    method: "POST",
    headers: {
      Authorization: "Bearer test-token",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ report: { sessionId: "bad" } })
  });
  assert.equal(invalid.status, 400);

  const created = await request("/api/sessions", {
    method: "POST",
    headers: {
      Authorization: "Bearer test-token",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ completed: true, report })
  });
  assert.equal(created.status, 201);

  const fetched = await request("/api/sessions/smoke-session", {
    headers: { Authorization: "Bearer test-token" }
  });
  assert.equal(fetched.status, 200);
  const stored = await fetched.json();
  assert.equal(stored.id, "smoke-session");
  assert.equal(stored.completed, true);

  const oversized = await request("/api/sessions", {
    method: "POST",
    headers: {
      Authorization: "Bearer test-token",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      completed: false,
      report: {
        ...report,
        sessionId: "oversized-session",
        playerCode: "x".repeat(2_100_000)
      }
    })
  });
  assert.equal(oversized.status, 413);

  console.log("PsychGame API smoke test passed");
} finally {
  child.kill("SIGTERM");
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (_) {}
}
