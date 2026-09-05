import { test, expect, Page } from "@playwright/test";

async function fillPlayers(page: Page) {
  await page.getByLabel("プレイヤー1").fill("Alice");
  await page.getByLabel("プレイヤー2").fill("Bob");
  await page.getByLabel("プレイヤー3").fill("Carol");
  await page.getByLabel("プレイヤー4").fill("Dave");
}

test.describe("メンバー入力画面", () => {
  test("初期表示ではルール設定が折りたたまれている", async ({ page }) => {
    await page.goto("/games/new");

    await expect(page.getByText("ルール設定")).toBeVisible();
    await expect(page.getByLabel("持ち点")).toBeHidden();
  });

  test("トグルをタップするとルール設定が開く", async ({ page }) => {
    await page.goto("/games/new");

    await page.getByText("ルール設定").click();

    await expect(page.getByLabel("持ち点")).toBeVisible();
    await expect(page.getByLabel("持ち点")).toHaveValue("25000");
  });

  test("折りたたんだまま（デフォルト値のまま）ゲーム開始できる", async ({ page }) => {
    await page.goto("/games/new");
    await fillPlayers(page);

    await page.getByRole("button", { name: "ゲーム開始" }).click();

    // スコア一覧（1回戦目の入力リンクが表示される）に遷移する
    await expect(page.getByRole("heading", { name: "スコア一覧" })).toBeVisible();
    await expect(page.getByRole("link", { name: "1", exact: true })).toBeVisible();
  });
});
