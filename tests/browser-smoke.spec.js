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

  // Use the real interaction API across a narrow horizontal range around
  // the projected door position. This avoids coupling the test to one
  // fragile hard-coded pixel coordinate while still requiring the actual
  // EXIT_DOOR hit target to be returned by the game.
  const doorInteracted = await page.evaluate(() => {
    const xs = [0.68, 0.72, 0.76, 0.80, 0.84, 0.88];
    return xs.some((ratio) => window.psychGame?.interactAt?.(
      window.innerWidth * ratio,
      window.innerHeight * 0.5
    ) === true);
  });
  expect(doorInteracted).toBe(true);
}

test("Room 01 gameplay completes and transitions to Room 02", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await expect(page.locator("#pg-title")).toContainText("اتاق ۰۱");

  await completeRoom01(page);

  await expect(page.locator("#pg-title")).toContainText("اتاق ۰۲", { timeout: 3000 });
  expect(errors).toEqual([]);
});

test("Room 02 gameplay completes and transitions to Room 03", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));

  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await expect(page.locator("#pg-title")).toContainText("اتاق ۰۱");

  await completeRoom01(page);
  await expect(page.locator("#pg-title")).toContainText("اتاق ۰۲", { timeout: 3000 });

  // Room 02 movement is bounded by Main.js, so move to the forward limit
  // and use the real interaction API at the center of the viewport.
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(4200);
  await page.keyboard.up("KeyW");
  const pathInteracted = await page.evaluate(() =>
    window.psychGame?.interactAt?.(window.innerWidth * 0.5, window.innerHeight * 0.5) === true
  );
  expect(pathInteracted).toBe(true);

  await expect(page.locator("#pg-title")).toContainText("اتاق ۰۳", { timeout: 3000 });
  expect(errors).toEqual([]);
});
