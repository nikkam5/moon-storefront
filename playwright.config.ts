import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure", channel: process.env.PLAYWRIGHT_CHANNEL },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
  webServer: { command: "node node_modules/serve/build/main.js out -l 3100 --no-clipboard --no-port-switching", env: { NO_UPDATE_CHECK: "1" }, url: "http://127.0.0.1:3100", reuseExistingServer: !process.env.CI, timeout: 60000 },
});
