// #146: README 掲載用のデモ動画を録画するスクリプト（CI では実行しない）
// 使い方: docker compose up でアプリを起動した状態で `node scripts/record_demo.mjs`
// 出力: tmp/demo-video/ に webm が保存される（GIF 変換は ffmpeg で行う）
import { chromium } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const OUT_DIR = "tmp/demo-video";
const VIEWPORT = { width: 390, height: 700 }; // スマホ想定の縦長ビューポート

const browser = await chromium.launch({ slowMo: 600 });
const context = await browser.newContext({
  viewport: VIEWPORT,
  recordVideo: { dir: OUT_DIR, size: VIEWPORT },
});
const page = await context.newPage();

// 1. メンバー入力
await page.goto(`${BASE_URL}/games/new`);
await page.getByLabel("プレイヤー1").fill("たかし");
await page.getByLabel("プレイヤー2").fill("ゆうこ");
await page.getByLabel("プレイヤー3").fill("けんた");
await page.getByLabel("プレイヤー4").fill("あやか");

// 2. ルール設定を開いて見せる（持ち点・返し点・順位点）
await page.getByText("ルール設定").click();
await page.waitForTimeout(1200);

// 3. ゲーム開始 → スコア表
await page.getByRole("button", { name: "ゲーム開始" }).click();
await page.waitForTimeout(800);

// 4. 1局目の点数入力（リアルタイム合計が動く様子を見せる）
await page.getByRole("link", { name: "1", exact: true }).click();
const inputs = page.locator(".score-input");
const scores = ["425", "289", "186", "100"]; // 42,500 / 28,900 / 18,600 / 10,000 点
for (let i = 0; i < 4; i++) {
  await inputs.nth(i).fill(scores[i]);
}
await page.waitForTimeout(1200);

// 5. 入力完了 → 順位点まで自動計算された結果
await page.getByRole("button", { name: "入力完了" }).click();
await page.waitForTimeout(2500);

await context.close(); // 動画はクローズ時に保存される
await browser.close();
console.log(`saved: ${OUT_DIR}/`);
