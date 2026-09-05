import { test, expect, Page } from "@playwright/test";

async function createGameAndGoToScoreInput(page: Page) {
  await page.goto("/games/new");
  await page.getByLabel("プレイヤー1").fill("Alice");
  await page.getByLabel("プレイヤー2").fill("Bob");
  await page.getByLabel("プレイヤー3").fill("Carol");
  await page.getByLabel("プレイヤー4").fill("Dave");
  await page.getByRole("button", { name: "ゲーム開始" }).click();

  await page.getByRole("link", { name: "1", exact: true }).click();
  await expect(page.getByRole("heading", { name: "点数入力" })).toBeVisible();
}

function scoreInputs(page: Page) {
  return page.locator(".score-input");
}

function totalOutput(page: Page) {
  // MPA（ERB）と LIFF（React）の両実装に同じ data-testid を付けてある
  return page.getByTestId("score-total");
}

function submitButton(page: Page) {
  return page.getByRole("button", { name: "入力完了" });
}

test.describe("点数入力画面", () => {
  test("点数を入力すると合計がリアルタイムで更新される", async ({ page }) => {
    await createGameAndGoToScoreInput(page);

    await scoreInputs(page).nth(0).fill("250");
    await expect(totalOutput(page)).toHaveText("25000");

    await scoreInputs(page).nth(1).fill("300");
    await expect(totalOutput(page)).toHaveText("55000");
  });

  test("3人分入力すると4人目が自動補完される", async ({ page }) => {
    await createGameAndGoToScoreInput(page);

    await scoreInputs(page).nth(0).fill("250");
    await scoreInputs(page).nth(1).fill("300");
    await scoreInputs(page).nth(2).fill("200");

    await expect(scoreInputs(page).nth(3)).toHaveValue("250");
    await expect(totalOutput(page)).toHaveText("100000");
  });

  test("合計が10万点でないと送信ボタンが無効のまま", async ({ page }) => {
    await createGameAndGoToScoreInput(page);

    await scoreInputs(page).nth(0).fill("250");
    await scoreInputs(page).nth(1).fill("300");
    await scoreInputs(page).nth(2).fill("200");
    await scoreInputs(page).nth(3).fill("200");

    await expect(submitButton(page)).toBeDisabled();
  });

  test("範囲外の値で送信ボタンが無効のまま", async ({ page }) => {
    await createGameAndGoToScoreInput(page);

    await scoreInputs(page).nth(0).fill("1001");
    await scoreInputs(page).nth(1).fill("0");
    await scoreInputs(page).nth(2).fill("0");

    await expect(submitButton(page)).toBeDisabled();
  });

  test("全項目が正しく入力されると送信ボタンが有効になる", async ({ page }) => {
    await createGameAndGoToScoreInput(page);

    await scoreInputs(page).nth(0).fill("250");
    await scoreInputs(page).nth(1).fill("300");
    await scoreInputs(page).nth(2).fill("200");

    await expect(scoreInputs(page).nth(3)).toHaveValue("250");
    await expect(submitButton(page)).toBeEnabled();
  });

  test("自動補完された値を手動で書き換えると再計算される", async ({ page }) => {
    await createGameAndGoToScoreInput(page);

    await scoreInputs(page).nth(0).fill("250");
    await scoreInputs(page).nth(1).fill("300");
    await scoreInputs(page).nth(2).fill("200");
    await expect(scoreInputs(page).nth(3)).toHaveValue("250");

    await scoreInputs(page).nth(3).fill("100");
    await expect(totalOutput(page)).toHaveText("85000");
    await expect(submitButton(page)).toBeDisabled();
  });

  test("正しい点数で送信するとスコア一覧に遷移する", async ({ page }) => {
    await createGameAndGoToScoreInput(page);

    await scoreInputs(page).nth(0).fill("250");
    await scoreInputs(page).nth(1).fill("300");
    await scoreInputs(page).nth(2).fill("200");
    await expect(scoreInputs(page).nth(3)).toHaveValue("250");

    await submitButton(page).click();
    await expect(page.getByText("1回戦")).toBeVisible();
  });
});
