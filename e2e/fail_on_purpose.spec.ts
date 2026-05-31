import { test, expect } from "@playwright/test";

test("わざと失敗するテスト（Artifacts確認用）", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "存在しない見出し" })).toBeVisible();
});
