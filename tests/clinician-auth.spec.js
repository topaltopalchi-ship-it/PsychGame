import { test, expect } from "@playwright/test";

test("clinician can authenticate against the protected report API", async ({ page }) => {
  test.skip(!process.env.PSYCHGAME_ADMIN_TOKEN, "PSYCHGAME_ADMIN_TOKEN is required in CI");

  const token = process.env.PSYCHGAME_ADMIN_TOKEN;
  const apiStatuses = [];

  page.on("response", (response) => {
    if (response.url().includes("/api/patients")) {
      apiStatuses.push(response.status());
    }
  });

  // In CI, test the deployed GitHub Pages origin so the production CORS policy
  // is exercised. Local runs can still use Playwright's local baseURL.
  const clinicianUrl = process.env.CLINICIAN_BASE_URL || "clinician.html";
  await page.goto(clinicianUrl, { waitUntil: "networkidle" });
  await expect(page.locator("#authCard")).toBeVisible();
  await page.locator("#adminToken").fill(token);
  await page.locator("#login").click();

  await expect(page.locator("#authStatus")).toContainText("دسترسی", { timeout: 10000 });
  await expect(page.locator("#app")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("#authCard")).toBeHidden();
  await expect(page.locator("#authStatus")).toContainText("دسترسی تأیید شد");
  expect(apiStatuses).toContain(200);

  // The token must never be rendered into the page as visible text.
  await expect(page.locator("body")).not.toContainText(token);
});
