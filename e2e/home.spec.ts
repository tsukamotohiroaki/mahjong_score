import { test, expect } from "@playwright/test";

test("トップページが表示される", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("App");
  await expect(page.getByRole("heading", { name: "麻雀スコア管理アプリ" })).toBeVisible();
  await expect(page.getByRole("link", { name: "新しく始める" })).toBeVisible();
  await expect(page.getByRole("button", { name: "つづきから" })).toBeVisible();
});
