import { defineConfig, devices } from "@playwright/test"

// The service worker is only generated for production builds, so offline
// tests run against `vite preview` instead of the dev server.
export default defineConfig({
  testDir: "./tests/offline",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4174",
    serviceWorkers: "allow",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
  webServer: {
    command:
      "pnpm build && pnpm preview --host 127.0.0.1 --port 4174 --strictPort",
    url: "http://127.0.0.1:4174",
    // Always rebuild so the tests never run against a stale service worker.
    reuseExistingServer: false,
  },
})
