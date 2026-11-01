import { defineConfig, devices } from "@playwright/test"

import { E2E_BASE_URL } from "./e2e/env.mjs"

const isCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: "./e2e",
  // The tests share one database and one admin
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: E2E_BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node e2e/start-server.mjs",
    url: `${E2E_BASE_URL}/api/health`,
    // Never reuse a running server: it could be a dev server connected to another database
    reuseExistingServer: false,
    timeout: 5 * 60 * 1000,
    stdout: "pipe",
  },
})
