import { defineConfig, devices } from "@playwright/test";

// @playwright/test はクラウド環境に入っているブラウザと同じ版（1.63.0）に固定している
export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  use: { baseURL: "http://localhost:5173" },
  projects: [{ name: "mobile", use: { ...devices["iPhone 15"], browserName: "chromium" } }],
  webServer: {
    command: "pnpm dev --port 5173 --strictPort",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
