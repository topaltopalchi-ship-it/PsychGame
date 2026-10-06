import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4173/PsychGame/",
    trace: "on-first-retry"
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: {
      ...devices["Desktop Firefox"],
      firefoxUserPrefs: {
        "webgl.force-enabled": true,
        "layers.acceleration.force-enabled": true,
        "gfx.webrender.all": true
      }
    } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } }
  ]
});
