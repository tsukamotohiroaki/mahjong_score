import { defineConfig } from "@playwright/test";

// 1本の spec を MPA 版（Rails :3000）と LIFF 版（Next.js :3001）の両方に流す（#175）。
// 片方だけ直し忘れると、その project だけ落ちて乖離に気づける。
// 実行: npx playwright test（両方）/ npx playwright test --project liff（片方）
export default defineConfig({
  testDir: "./e2e",
  use: {
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "mpa",
      use: {
        browserName: "chromium",
        baseURL: process.env.BASE_URL || "http://localhost:3000",
      },
    },
    {
      name: "liff",
      // `/` は LIFF ログインへ外部遷移するため、トップ導線の spec は MPA 版だけに流す
      testIgnore: /home\.spec\.ts/,
      use: {
        browserName: "chromium",
        baseURL: process.env.LIFF_BASE_URL || "http://localhost:3001",
      },
    },
  ],
});
