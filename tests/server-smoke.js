import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SpecialistReport } from "../game/src/psychology/SpecialistReport.js";

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
    ADMIN_TOKEN: "admin-token",
    CORS_ORIGIN: "http://test.local"
  },
  stdio: ["ignore", "pipe", "pipe"]
});

const productionGuardScript = path.join(tempDir, "production-guard-smoke.mjs");
fs.writeFileSync(productionGuardScript, `import ${JSON.stringify(path.resolve(process.cwd(), "server/index.js"))};\n`, "utf8");

async function assertProductionGuard(envPatch, expectedMessage) {
  const probe = spawn(process.execPath, [productionGuardScript], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: "0",
      DATA_DIR: path.join(tempDir, "guard-data"),
      ...envPatch
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stderr = "";
  probe.stderr.on("data", chunk => { stderr += chunk.toString(); });
  const code = await new Promise(resolve => probe.on("exit", resolve));
  assert.notEqual(code, 0);
  assert.match(stderr, new RegExp(expectedMessage));
}

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
  await assertProductionGuard({ AUTHOR_TOKEN: "", CORS_ORIGIN: "http://test.local" }, "AUTHOR_TOKEN must be configured in production");
  await assertProductionGuard({ AUTHOR_TOKEN: "production-test-token", CORS_ORIGIN: "*" }, "CORS_ORIGIN must be an exact origin in production");

  const qualityReport = SpecialistReport.build({
    sessionId: "quality-smoke",
    playerCode: "PLAYER-QUALITY",
    events: [
      { eventIndex: 0, type: "ROOM_ENTER", roomId: "ROOM_01", elapsedMs: 100 },
      { eventIndex: 1, type: "RED_BUTTON_PRESS", roomId: "ROOM_01", elapsedMs: 1200 }
    ],
    analysis: { exploration: "LOW", riskTaking: "MODERATE", persistence: "LOW", strategyChange: "NOT_OBSERVED", decisionLatency: "NOT_OBSERVED", helpSeeking: "NOT_OBSERVED", roomBehavior: {} }
  });
  assert.equal(qualityReport.dataQuality.hasDecisionLatency, false);
  assert.equal(qualityReport.dataQuality.observedRooms.length, 1);

  await waitForServer();

  const health = await request("/api/health");
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true });

  const healthCors = health.headers.get("access-control-allow-origin");
  assert.equal(healthCors, "http://test.local");

  const unauthorized = await request("/api/sessions");
  assert.equal(unauthorized.status, 401);

  const preflight = await request("/api/sessions", {
    method: "OPTIONS",
    headers: {
      Origin: "http://test.local",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type, authorization"
    }
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), "http://test.local");
  assert.match(preflight.headers.get("access-control-allow-methods") || "", /POST/);
  assert.match(preflight.headers.get("access-control-allow-headers") || "", /Authorization/);

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
    headers: { Authorization: "Bearer admin-token" }
  });
  assert.equal(fetched.status, 200);
  const stored = await fetched.json();
  assert.equal(stored.id, "smoke-session");
  assert.equal(stored.completed, true);

  const progressAfterCompletion = await request("/api/sessions", {
    method: "POST",
    headers: {
      Authorization: "Bearer test-token",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ completed: false, report: { ...report, eventCount: 1 } })
  });
  assert.equal(progressAfterCompletion.status, 200);
  assert.equal((await progressAfterCompletion.json()).preservedCompleted, true);

  const listed = await request("/api/sessions", {
    headers: { Authorization: "Bearer admin-token" }
  });
  assert.equal(listed.status, 200);
  const listedSessions = await listed.json();
  assert.equal(Array.isArray(listedSessions.sessions), true);
  const listedSmoke = listedSessions.sessions.find((item) => item.id === "smoke-session");
  assert.ok(listedSmoke);
  assert.equal("events" in listedSmoke, false);
  assert.equal("analysis" in listedSmoke, false);

  const seededSessions = Array.from({ length: 5000 }, (_, index) => ({
    id: "retention-" + index,
    playerCode: "PLAYER-RETENTION",
    receivedAt: new Date().toISOString(),
    completed: false,
    report: {
      sessionId: "retention-" + index,
      playerCode: "PLAYER-RETENTION",
      events: [],
      eventCount: 0
    }
  }));
  fs.writeFileSync(path.join(dataDir, "sessions.json"), JSON.stringify(seededSessions), "utf8");

  const retentionReport = {
    sessionId: "retention-new",
    playerCode: "PLAYER-RETENTION",
    events: [],
    eventCount: 0
  };
  const retentionCreated = await request("/api/sessions", {
    method: "POST",
    headers: {
      Authorization: "Bearer test-token",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ completed: false, report: retentionReport })
  });
  assert.equal(retentionCreated.status, 201);

  const retentionList = await request("/api/sessions", {
    headers: { Authorization: "Bearer test-token" }
  });
  const retentionSessions = await retentionList.json();
  assert.equal(retentionSessions.sessions.length, 5000);
  assert.equal(retentionSessions.sessions.some((item) => item.id === "retention-0"), false);
  assert.equal(retentionSessions.sessions.some((item) => item.id === "retention-new"), true);

  const maxEventsReport = {
    sessionId: "max-events-session",
    playerCode: "PLAYER-LIMIT",
    events: Array.from({ length: 10000 }, (_, index) => ({
      eventIndex: index,
      type: "TEST_EVENT",
      elapsedMs: index
    })),
    eventCount: 10000
  };
  const maxEvents = await request("/api/sessions", {
    method: "POST",
    headers: {
      Authorization: "Bearer test-token",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ completed: false, report: maxEventsReport })
  });
  assert.equal(maxEvents.status, 201);

  const tooManyEventsReport = {
    ...maxEventsReport,
    sessionId: "too-many-events-session",
    events: [...maxEventsReport.events, { eventIndex: 10000, type: "TEST_EVENT", elapsedMs: 10000 }],
    eventCount: 10001
  };
  const tooManyEvents = await request("/api/sessions", {
    method: "POST",
    headers: {
      Authorization: "Bearer test-token",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ completed: false, report: tooManyEventsReport })
  });
  assert.equal(tooManyEvents.status, 400);

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
