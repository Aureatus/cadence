import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    serviceWorkers: "block",
    timezoneId: "UTC",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "bun run build && bun run preview -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    timeout: 120_000,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
