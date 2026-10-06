import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  globalTimeout: 12 * 60 * 1000,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173/PsychGame/",
    trace: "retain-on-failure"
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: {
      ...devices["Desktop Firefox"],
      headless: process.env.CI ? false : true,
      firefoxUserPrefs: {
        "webgl.force-enabled": true,
        "webgl.forbid-software": false,
        "layers.acceleration.force-enabled": true,
        "gfx.webrender.all": true
      }
    } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } }
  ]
});
