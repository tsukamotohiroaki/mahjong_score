import { test, expect } from "@playwright/test";

// #216: トップページは廃止し、`/` はメンバー入力画面へ直行させる
test("トップ URL からメンバー入力画面に直接着地する", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/games\/new$/);
  await expect(page.getByRole("heading", { name: "メンバー入力" })).toBeVisible();
  await expect(page.getByLabel("プレイヤー1")).toBeVisible();
});

test("「新しく始める」ボタンを経由しない（ボタンが存在しない）", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "新しく始める" })).toHaveCount(0);
});
