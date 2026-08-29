import { test, expect } from "@playwright/test";

// #184: LIFF 版の E2E を1本通す。
// `/games/new` 以降は LIFF SDK を使わないため、モックモード（#183）なしで検証できる。
// `/`（LIFF 初期化 → リダイレクト）の検証は #183 のモックモード導入後に追加する。
test("メンバー入力からゲームを作成するとスコア一覧が表示される", async ({ page }) => {
  await page.goto("/games/new");
  await expect(page.getByRole("heading", { name: "メンバー入力" })).toBeVisible();

  await page.getByLabel("プレイヤー1").fill("たかし");
  await page.getByLabel("プレイヤー2").fill("ゆうこ");
  await page.getByLabel("プレイヤー3").fill("けんた");
  await page.getByLabel("プレイヤー4").fill("あやか");
  await page.getByRole("button", { name: "ゲーム開始" }).click();

  // 実 Rails API 経由でゲームが作成され、スコア一覧へ遷移する
  await expect(page.getByRole("heading", { name: "スコア一覧" })).toBeVisible();
  await expect(page.getByText("たかし")).toBeVisible();
  await expect(page.getByText("あやか")).toBeVisible();
});
