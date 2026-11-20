import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3101",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: `${process.env.E2E_BUILD_COMMAND ?? "npm run build"} && npm run start -- --hostname 127.0.0.1 --port 3101`,
    url: "http://127.0.0.1:3101/fr",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
