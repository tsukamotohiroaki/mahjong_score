import { defineConfig } from "@playwright/test";

// LIFF 版（Next.js, localhost:3001）用の E2E 設定。
// CI の e2e ジョブは Next.js を起動しないため、既定の playwright.config.ts とは分離している。
// CI への組み込みは #186 で行う。
// 実行方法: Rails（3000）と Next.js（3001）を起動した状態で
//   npx playwright test --config playwright.liff.config.ts
export default defineConfig({
  testDir: "./e2e-liff",
  use: {
    baseURL: process.env.LIFF_BASE_URL || "http://localhost:3001",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
