# 実機確認チェックリスト（LINE アプリ）

**LINE アプリの中でしか起こらないこと**だけを確認する。Chrome で分かること（応答速度）は [`response-time`](../.claude/skills/response-time/SKILL.md) が担当。重複して確認しない。

- 所要: 5〜10分 ／ いつ: リリース前に1回 ／ 対象: 本番（CloudFront）／ やる人: 人間（スマホ実機）
- URL: LIFF 版 `https://dxop25dcw25sl.cloudfront.net` ／ MPA 版 `https://doc9xlvbx6gap.cloudfront.net`

## 準備

- [ ] EC2 が起動している（停止中は両版とも開けない。起動から復帰まで約2分）
- [ ] スマホに LINE アプリ。公式アカウント「楽雀」を[友だち追加](https://line.me/R/ti/p/@165fpsbq)済み
- [ ] 12局すべて埋まったゲームの URL（項目6で使う）。無ければ「12局データの作り方」で作る

> **本番 DB にテストデータが残る。** ゲームが1〜2件増える。削除はしない（不可逆のため）。

## チェックリスト（★ = 必ず ／ ☆ = 環境が用意できたときだけ）

| # | 項目 | 期待 | 備考 |
|---|---|---|---|
| 1 ★ | QR コードを読む | メンバー入力の画面が開く | 開かなければ EC2 停止を疑う |
| 2 ☆ | 未ログインから LINE ログインを通過 | ログイン後に元の画面へ戻る | ログアウトした端末が要る |
| 3 ★ | 公式アカウント → リッチメニュー →「楽雀を開く」 | LIFF 版が起動する | |
| 4 ★ | ヘッダーのタイトル | 前回と変わっていない | 既知: LIFF は `Create Next App` のまま。悪化していないことだけ見る |
| 5 ★ | セーフエリア | ノッチ・ホームインジケーターに文字やボタンが隠れない | |
| 6 ★ | 12局の表がスクロールできる | 12局目まで縦に見える。横にはみ出さない | 準備した URL を開く |
| 7 ★ | 文字化け・フォント | 豆腐（□）や不自然な字形が無い | LIFF のフォント（Geist）は日本語を含まず WebView 任せ |
| 8 ★ | 点数入力欄のテンキー | テンキーが出て、箱下（マイナス点）を入力できる | iOS のテンキーに `−` が無い可能性。打てなければ不具合として報告 |
| 9 ★ | キーボードで隠れない | テンキー表示中も入力中の欄と「入力完了」が見える | |
| 10 ★ | 共有ボタンを押す | 共有シートが開く（開かなければ「コピーしました！」） | **どちらに入ったか記録する。** Vitest は `navigator.share` をモックしており、実在は実機でしか分からない |
| 11 ☆ | LINE を選んで送信 | トークに URL が貼られる | 送り先が要る |
| 12 ☆ | 送った URL を開く | 同じスコア一覧が出る | 本番 LIFF ID でのみ成立。開発用 LIFF ID の URL は人に送らない |
| 13 ★ | メンバー入力 → 点数入力 → 一覧反映 | 最後まで通る | 8・9 はこの途中で確認できる |
| 14 ★ | 入力済みの局を修正 → 一覧反映 | 修正が**操作しやすい**（成立するかは Playwright が担当） | 既知（2026-08-23）: 開いても入力欄は空・見出しに何回戦か出ない。4人分の打ち直しが現実的かを見る |
| 15 ★ | LIFF を閉じて開き直す | エラーにならない | |

## 最後に: 本番 DB を確認する（必須）

**画面に出ている＝DB に入っている、ではない。** 項目14は `round_number` が送られていないと上書きではなく局が増え、画面では気づけない。

```bash
ssh -i ~/.ssh/mahjong-score-key.pem -o StrictHostKeyChecking=no ec2-user@3.114.238.160
cd /home/ec2-user/mahjong_score && docker-compose exec -T web bin/rails runner 'g = Game.order(:created_at).last; puts({id: g.id, players: g.players.order(:created_at).pluck(:name), rounds: g.rounds.count, numbers: g.rounds.order(:round_number).pluck(:round_number), sums: g.rounds.map { |r| r.scores.sum(:point) }, counts: g.rounds.map { |r| r.scores.count }}.to_json)'
```

| 見るもの | 合格 |
|---|---|
| `players` | 入力した4名と同じ・同じ順序 |
| `rounds` | 入力した局数と一致（項目14で増えていない） |
| `numbers` | 重複なし |
| `sums` | 全部 `100000` |
| `counts` | 全部 `4` |

> `exec` を使う（`run --rm` は gem が無く失敗する）。本番は `docker-compose`（ハイフン付き）。

## 12局データの作り方（項目6の準備）

上の SSH 先で実行する。URL は `https://dxop25dcw25sl.cloudfront.net/games/<GAME_ID>`、合計は `720.0 / 120.0 / -240.0 / -600.0` になる。

```bash
cd /home/ec2-user/mahjong_score && docker-compose exec -T web bin/rails runner '
rule = { mochi_ten: 25000, kaeshi_ten: 30000, rank_1_bonus: 50, rank_2_bonus: 10, rank_3_bonus: -10, rank_4_bonus: -30 }
g = Game.create_with_players!(rule, %w[東 南 西 北])
ps = g.players.order(:created_at).to_a
(1..12).each do |n|
  r = g.rounds.create!(round_number: n)
  [40000, 30000, 20000, 10000].each_with_index { |pt, i| r.scores.create!(player: ps[i], point: pt) }
end
puts "GAME_ID=#{g.id}"
'
```

## 記録テンプレート

```markdown
## 実機確認（YYYY-MM-DD / iPhone xx / iOS xx / LINE xx.x.x）

| # | 結果 | メモ |
|---|---|---|
| 1 | ✅ | |
| 8 | ❌ | テンキーにマイナスが無く箱下を入力できなかった |
| 11 | 未実施 | 送り先を用意できなかった |

本番 DB: （runner の出力を貼る）
作ったデータ: game id xx（本番に残している）
```

未実施は「合格」ではなく「未実施」と書く。

## 対象外

| 除外するもの | 守っている手段 |
|---|---|
| 応答速度 | [`response-time`](../.claude/skills/response-time/SKILL.md) |
| 計算・保存・バリデーション | `spec/` |
| 基本フロー・送信ボタンの活性条件・自動補完 | `e2e/` |
| 共有ボタンの分岐ロジック | `frontend/app/games/[id]/page.test.tsx` |

ngrok でローカルを実機から開く手順は含めない（[#273](https://github.com/tsukamotohiroaki/mahjong_score/issues/273) で取りやめ済み）。LIFF アプリの使い分けは [`frontend/.env.local.example`](../frontend/.env.local.example) を参照。
