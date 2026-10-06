import { test, expect } from "@playwright/test";

test("explicit consent gate is shown before telemetry starts", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await expect(page.locator("#pg-consent")).toBeVisible();
  await expect(page.locator("#pg-consent-accept")).toBeVisible();
  await expect(page.locator("#pg-consent-decline")).toBeVisible();
  const before = await page.evaluate(() => window.psychGame?.getPlayerCode?.());
  expect(before).toBeTruthy();
  await page.locator("#pg-consent-decline").click();
  await expect(page.locator("#pg-consent")).toHaveCount(0);
});

test("desktop browser smoke test", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await page.locator("#pg-consent-accept").click();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator("#pg-title")).toContainText("اتاق ۰۱");
  expect(errors).toEqual([]);
});

test("mobile touch UI smoke test", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    userAgent: "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36"
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await page.locator("#pg-consent-accept").click();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator("#pg-joystick")).toBeVisible();
  await expect(page.locator("#pg-touch-look")).toBeVisible();
  await expect(page.locator("#pg-touch-interact")).toBeVisible();
  await expect(page.locator("#pg-title")).toContainText("اتاق ۰۱");
  expect(errors).toEqual([]);
  await context.close();
});

async function completeRoom01(page) {
  await page.keyboard.down("KeyA");
  await page.waitForTimeout(2400);
  await page.keyboard.up("KeyA");
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(1250);
  await page.keyboard.up("KeyW");
  await page.keyboard.press("KeyE");

  await page.keyboard.down("KeyD");
  await page.waitForTimeout(3000);
  await page.keyboard.up("KeyD");
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(1000);
  await page.keyboard.up("KeyW");
  await page.keyboard.press("KeyE");
  await page.waitForTimeout(200);
  await page.keyboard.press("KeyE");

  await page.keyboard.down("KeyD");
  await page.waitForTimeout(2500);
  await page.keyboard.up("KeyD");

  const doorInteracted = await page.evaluate(() => {
    const xs = [0.68, 0.72, 0.76, 0.80, 0.84, 0.88];
    return xs.some((ratio) => window.psychGame?.interactAt?.(
      window.innerWidth * ratio,
      window.innerHeight * 0.5
    ) === true);
  });
  expect(doorInteracted).toBe(true);
}



async function interactCenter(page, xRatio = 0.5, yRatios = [0.45, 0.5, 0.55, 0.6]) {
  return page.evaluate(({ xRatio, yRatios }) => {
    return yRatios.some((ratio) =>
      window.psychGame?.interactAt?.(
        window.innerWidth * xRatio,
        window.innerHeight * ratio
      ) === true
    );
  }, { xRatio, yRatios });
}

async function walk(page, key, ms) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

async function completeRooms04To08(page) {
  // Room 04: exit is sufficient; mark inspection is optional.
  await walk(page, "KeyW", 20000);
  expect(await interactCenter(page)).toBe(true);
  await expect(page.locator("#pg-title")).toContainText("اتاق ۰۵", { timeout: 5000 });

  // Room 05: inspect a mirror, then return to the exit.
  await walk(page, "KeyW", 3000);
  expect(await interactCenter(page)).toBe(true);
  await walk(page, "KeyS", 4000);
  expect(await interactCenter(page)).toBe(true);
  await expect(page.locator("#pg-title")).toContainText("اتاق ۰۶", { timeout: 5000 });

  // Room 06: inspect one recording before leaving.
  await walk(page, "KeyW", 3000);
  expect(await interactCenter(page)).toBe(true);
  await walk(page, "KeyS", 4000);
  expect(await interactCenter(page)).toBe(true);
  await expect(page.locator("#pg-title")).toContainText("اتاق ۰۷", { timeout: 5000 });

  // Room 07: make one trust choice, then leave.
  await walk(page, "KeyW", 3000);
  expect(await interactCenter(page, 0.35)).toBe(true);
  await walk(page, "KeyS", 4000);
  expect(await interactCenter(page)).toBe(true);
  await expect(page.locator("#pg-title")).toContainText("اتاق ۰۸", { timeout: 5000 });

  // Room 08: inspect the core, then take the exit.
  await walk(page, "KeyW", 2200);
  expect(await interactCenter(page)).toBe(true);
  await walk(page, "KeyS", 5000);
  expect(await interactCenter(page)).toBe(true);
  await expect(page.locator("#pg-title")).toContainText("پایان", { timeout: 5000 });
}

test("Room 01 gameplay completes and transitions to Room 02", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await page.locator("#pg-consent-accept").click();
  await expect(page.locator("#pg-title")).toContainText("اتاق ۰۱");

  await completeRoom01(page);

  await expect(page.locator("#pg-title")).toContainText("اتاق ۰۲", { timeout: 3000 });
  expect(errors).toEqual([]);
});

test("Room 02 gameplay completes and transitions to Room 03", async ({ page }) => {
  test.setTimeout(45000);
  const errors = [];
  const crashes = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("crash", () => crashes.push("PAGE_CRASH"));

  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await page.locator("#pg-consent-accept").click();
  await expect(page.locator("#pg-title")).toContainText("اتاق ۰۱");

  await completeRoom01(page);
  await expect(page.locator("#pg-title")).toContainText("اتاق ۰۲", { timeout: 3000 });

  // Target the lower part of the center path panel so the decorative
  // PATH_CLUE glow above it cannot consume the raycast.
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(3500);
  await page.keyboard.up("KeyW");
  const pathInteracted = await page.evaluate(() => {
    const ys = [0.54, 0.56, 0.58, 0.60];
    return ys.some((ratio) => window.psychGame?.interactAt?.(
      window.innerWidth * 0.5,
      window.innerHeight * ratio
    ) === true);
  });
  expect(pathInteracted).toBe(true);

  await page.waitForTimeout(1500);
  expect(crashes).toEqual([]);
  await expect(page.locator("#pg-title")).toContainText("اتاق ۰۳", { timeout: 5000 });
  expect(errors).toEqual([]);
});


test("Rooms 03 through 08 complete and Room 08 ends the game", async ({ page }) => {
  test.setTimeout(90000);
  const errors = [];
  const crashes = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("crash", () => crashes.push("PAGE_CRASH"));

  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await page.locator("#pg-consent-accept").click();
  await expect(page.locator("#pg-title")).toContainText("اتاق ۰۱");

  await completeRoom01(page);
  await expect(page.locator("#pg-title")).toContainText("اتاق ۰۲", { timeout: 3000 });

  await walk(page, "KeyW", 3500);
  expect(await interactCenter(page)).toBe(true);
  await expect(page.locator("#pg-title")).toContainText("اتاق ۰۳", { timeout: 5000 });

  // Room 03 is intentionally wait-based; allow its completion timer to fire.
  await page.waitForTimeout(3500);
  await expect(page.locator("#pg-title")).toContainText("اتاق ۰۴", { timeout: 5000 });

  await completeRooms04To08(page);
  expect(crashes).toEqual([]);
  expect(errors).toEqual([]);

  const sessionSnapshot = await page.evaluate(() => {
    const playerCode = window.psychGame?.getPlayerCode?.();
    const raw = playerCode ? localStorage.getItem(`psychgame_${playerCode}`) : null;
    if (!raw) return null;
    const session = JSON.parse(raw);
    return {
      playerCode,
      eventTypes: Array.isArray(session.events) ? session.events.map((event) => event.type) : [],
      eventCount: Array.isArray(session.events) ? session.events.length : 0
    };
  });

  expect(sessionSnapshot).not.toBeNull();
  expect(sessionSnapshot.eventCount).toBeGreaterThan(0);
  expect(sessionSnapshot.eventTypes).toContain("ROOM_08_FINAL_SEQUENCE");
});


test("Session upload queues failed payloads and flushes them after recovery", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await page.locator("#pg-consent-accept").click();

  const result = await page.evaluate(async () => {
    const { SessionUploader } = await import("/PsychGame/src/session/SessionUploader.js");
    const queueKey = "psychgame_upload_queue_v1";
    localStorage.removeItem(queueKey);

    let attempts = 0;
    const originalFetch = window.fetch;
    window.fetch = async (url, options) => {
      attempts += 1;
      if (attempts === 1) throw new Error("simulated network failure");
      return new Response(JSON.stringify({ ok: true }), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      });
    };

    try {
      const uploader = new SessionUploader({ endpoint: "http://upload.test", token: "test-token" });
      const report = {
        sessionId: "upload-queue-smoke",
        playerCode: "PLAYER-UPLOAD",
        events: [],
        eventCount: 0
      };

      const first = await uploader.upload(report, { completed: true });
      const queuedAfterFailure = uploader.readQueue();

      const second = await uploader.upload(report, { completed: true });
      const queuedAfterRecovery = uploader.readQueue();

      return {
        first,
        second,
        attempts,
        queuedAfterFailure: queuedAfterFailure.length,
        queuedAfterRecovery: queuedAfterRecovery.length
      };
    } finally {
      window.fetch = originalFetch;
      localStorage.removeItem(queueKey);
    }
  });

  expect(result.first.queued).toBe(true);
  expect(result.queuedAfterFailure).toBe(1);
  expect(result.second.uploaded).toBe(true);
  expect(result.queuedAfterRecovery).toBe(0);
  expect(result.attempts).toBe(3);
});


test("Session upload queue preserves completed sessions and deduplicates progress", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await page.locator("#pg-consent-accept").click();

  const result = await page.evaluate(async () => {
    const { SessionUploader } = await import("/PsychGame/src/session/SessionUploader.js");
    const uploader = new SessionUploader({ endpoint: "http://upload.test" });
    const queueKey = "psychgame_upload_queue_v1";
    localStorage.removeItem(queueKey);

    const progress = {
      version: 1,
      completed: false,
      uploadedAt: "2026-01-01T00:00:00.000Z",
      report: { sessionId: "queue-order", playerCode: "PLAYER-QUEUE", events: [] }
    };
    const progressLater = {
      ...progress,
      uploadedAt: "2026-01-01T00:00:01.000Z"
    };
    const completed = {
      ...progress,
      completed: true,
      uploadedAt: "2026-01-01T00:00:02.000Z"
    };

    uploader.queue(progress);
    uploader.queue(progressLater);
    const afterProgressRetry = uploader.readQueue();

    uploader.queue(completed);
    const afterCompleted = uploader.readQueue();

    uploader.queue(progressLater);
    const afterLateProgress = uploader.readQueue();

    return {
      afterProgressRetry: afterProgressRetry.map(item => ({
        completed: item.completed,
        uploadedAt: item.uploadedAt
      })),
      afterCompleted: afterCompleted.map(item => item.completed),
      afterLateProgress: afterLateProgress.map(item => item.completed)
    };
  });

  expect(result.afterProgressRetry).toEqual([
    { completed: false, uploadedAt: "2026-01-01T00:00:01.000Z" }
  ]);
  expect(result.afterCompleted).toEqual([true]);
  expect(result.afterLateProgress).toEqual([true]);
});


test("Session upload queue retains only failed payloads during partial flush", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await page.locator("#pg-consent-accept").click();

  const result = await page.evaluate(async () => {
    const { SessionUploader } = await import("/PsychGame/src/session/SessionUploader.js");
    const uploader = new SessionUploader({ endpoint: "http://upload.test" });
    const queueKey = "psychgame_upload_queue_v1";
    localStorage.removeItem(queueKey);

    uploader.queue({
      version: 1,
      completed: false,
      uploadedAt: "2026-01-01T00:00:00.000Z",
      report: { sessionId: "flush-success", playerCode: "PLAYER-FLUSH", events: [] }
    });
    uploader.queue({
      version: 1,
      completed: false,
      uploadedAt: "2026-01-01T00:00:01.000Z",
      report: { sessionId: "flush-fail", playerCode: "PLAYER-FLUSH", events: [] }
    });

    let calls = 0;
    const originalFetch = window.fetch;
    window.fetch = async (_url, options) => {
      calls += 1;
      const payload = JSON.parse(options.body);
      if (payload.report.sessionId === "flush-fail") {
        return new Response(JSON.stringify({ error: "temporary" }), { status: 503 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 201 });
    };

    try {
      await uploader.flushQueue();
      return {
        calls,
        remaining: uploader.readQueue().map(item => item.report.sessionId)
      };
    } finally {
      window.fetch = originalFetch;
      localStorage.removeItem(queueKey);
    }
  });

  expect(result.calls).toBe(2);
  expect(result.remaining).toEqual(["flush-fail"]);
});


test("Concurrent session uploads are serialized without duplicate queue entries", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await page.locator("#pg-consent-accept").click();

  const result = await page.evaluate(async () => {
    const { SessionUploader } = await import("/PsychGame/src/session/SessionUploader.js");
    const uploader = new SessionUploader({ endpoint: "http://upload.test" });
    const queueKey = "psychgame_upload_queue_v1";
    localStorage.removeItem(queueKey);

    const calls = [];
    const originalFetch = window.fetch;
    window.fetch = async (_url, options) => {
      const payload = JSON.parse(options.body);
      calls.push(payload.report.sessionId);
      await new Promise(resolve => setTimeout(resolve, 5));
      throw new Error("simulated outage");
    };

    try {
      const first = {
        sessionId: "concurrent-a",
        playerCode: "PLAYER-CONCURRENT",
        events: []
      };
      const second = {
        sessionId: "concurrent-b",
        playerCode: "PLAYER-CONCURRENT",
        events: []
      };

      const results = await Promise.all([
        uploader.upload(first),
        uploader.upload(second)
      ]);

      return {
        results,
        calls,
        queue: uploader.readQueue().map(item => item.report.sessionId)
      };
    } finally {
      window.fetch = originalFetch;
      localStorage.removeItem(queueKey);
    }
  });

  expect(result.calls).toEqual(["concurrent-a", "concurrent-b"]);
  expect(result.queue).toEqual(["concurrent-a", "concurrent-b"]);
  expect(result.results.every(item => item.queued === true)).toBe(true);
});


test("Session uploader tolerates corrupted local upload queue storage", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await page.locator("#pg-consent-accept").click();

  const result = await page.evaluate(async () => {
    const { SessionUploader } = await import("/PsychGame/src/session/SessionUploader.js");
    const uploader = new SessionUploader({ endpoint: "http://upload.test" });
    const queueKey = "psychgame_upload_queue_v1";
    localStorage.setItem(queueKey, "{not-valid-json");

    const before = uploader.readQueue();

    let fetchCalls = 0;
    const originalFetch = window.fetch;
    window.fetch = async () => {
      fetchCalls += 1;
      throw new Error("simulated outage");
    };

    try {
      const result = await uploader.upload({
        sessionId: "corrupt-storage",
        playerCode: "PLAYER-CORRUPT",
        events: []
      });
      return {
        before,
        result,
        stored: localStorage.getItem(queueKey)
      };
    } finally {
      window.fetch = originalFetch;
      localStorage.removeItem(queueKey);
    }
  });

  expect(result.before).toEqual([]);
  expect(result.result.queued).toBe(true);
  expect(JSON.parse(result.stored)).toHaveLength(1);
});


test("Session uploader reports when local queue storage is unavailable", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await page.locator("#pg-consent-accept").click();

  const result = await page.evaluate(async () => {
    const { SessionUploader } = await import("/PsychGame/src/session/SessionUploader.js");
    const uploader = new SessionUploader({ endpoint: "http://upload.test" });
    const storage = window.localStorage;
    const originalFetch = window.fetch;
    const originalSetItem = storage.setItem.bind(storage);
    window.fetch = async () => { throw new Error("simulated outage"); };
    storage.setItem = () => { throw new Error("simulated storage failure"); };

    try {
      return await uploader.upload({
        sessionId: "storage-failure",
        playerCode: "PLAYER-STORAGE",
        events: []
      });
    } finally {
      storage.setItem = originalSetItem;
      window.fetch = originalFetch;
      storage.removeItem("psychgame_upload_queue_v1");
    }
  });

  expect(result.uploaded).toBe(false);
  expect(result.queued).toBe(false);
});
