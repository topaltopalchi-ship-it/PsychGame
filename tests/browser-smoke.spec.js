import { test, expect } from "@playwright/test";

test("desktop browser smoke test", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
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
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator("#pg-joystick")).toBeVisible();
  await expect(page.locator("#pg-touch-look")).toBeVisible();
  await expect(page.locator("#pg-touch-interact")).toBeVisible();
  await expect(page.locator("#pg-title")).toContainText("اتاق ۰۱");
  expect(errors).toEqual([]);
  await context.close();
});

test("Room 01 gameplay completes and transitions to Room 02", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await expect(page.locator("#pg-title")).toContainText("اتاق ۰۱");

  // Initial camera is at (0, 1.7, 3.5), looking toward -Z.
  // Reach the red button at (-3.8, 1.8, 1.2).
  await page.keyboard.down("KeyA");
  await page.waitForTimeout(2400);
  await page.keyboard.up("KeyA");
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(1250);
  await page.keyboard.up("KeyW");
  await page.keyboard.press("KeyE");

  // Reach the drawer at (0.8, 1.2, -1.0).
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(3000);
  await page.keyboard.up("KeyD");
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(1000);
  await page.keyboard.up("KeyW");
  await page.keyboard.press("KeyE");

  // The drawer reveals the key at the same location.
  await page.waitForTimeout(200);
  await page.keyboard.press("KeyE");

  // Move to the east wall. The door is slightly to the right of the
  // camera's forward ray, so use the real pointer interaction API at the
  // projected door position instead of relying on an imprecise center ray.
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(2500);
  await page.keyboard.up("KeyD");
  const doorInteracted = await page.evaluate(() =>
    window.psychGame?.interactAt?.(window.innerWidth * 0.825, window.innerHeight * 0.5) === true
  );
  expect(doorInteracted).toBe(true);

  await expect(page.locator("#pg-title")).toContainText("اتاق ۰۲", { timeout: 3000 });
  expect(errors).toEqual([]);
});
