# テスト戦略

リスクの高い箇所に厚く、単純な箇所は浅くテストを配分する。その判断を1枚で示す。テスト構成を変えたらこのドキュメントも更新する。

## 方針

- リスクは「起きる可能性 × 影響の大きさ」で評価し、高い順に厚く守る
- 同じことを2つの手段で確認しない（重複すると続かず、実施漏れも分からなくなる）
- テストを先に書く（TDD）。変更前に `.claude/dependencies.md` で影響するテストを把握する
- テスト技法（同値分割・境界値分析など）と実例の対応は [README の「テスト設計」](../README.md#テスト設計テスト技法との対応)

## リスクと備え

影響の大きい順。テスト名がそのまま仕様なので、詳細は各ファイルを参照。

| リスク | 備え | 厚み |
|---|---|---|
| 順位点を黙って間違える（例外が出ないため気づけない） | `spec/models/game_spec.rb`: 同点分配・ゼロサム・境界値を個別に網羅 | ◎ |
| 不正な点数が保存され、以後の全計算を汚染する（範囲外・合計不一致・非整数・人数不足） | `spec/forms/round_score_form_spec.rb`: 検証順序まで固定。`spec/requests/**/rounds_spec.rb`: MPA / API の両経路。クライアント側検証は UX のためで、正はサーバー側 `RoundScoreForm` | ◎ |
| 不正なゲームが作られる（3/5/0人・名前重複・ゼロサム不成立） | `game_spec` + `spec/requests/**/games_spec.rb`: MPA / API の両経路。Game と Player 4件は全部成功 or 全部ロールバック | ◎ |
| 入力補助（合計・自動補完・送信可否）が壊れ、「紙より速い」体験が消える | `e2e/score_input.spec.ts`（MPA）・`frontend/app/games/[id]/rounds/new/page.test.tsx`（LIFF）。ブラウザ内で完結するためサーバー側では守れない | ◎ |
| MPA 版と LIFF 版の仕様が乖離し、片方だけ壊れても気づけない | 計算はサーバー側 `Game` 1箇所に集約し API で共有（契約は `docs/openapi.yaml`）。二重実装は入力補助のみで、両版に E2E を流す（`e2e/` `e2e-liff/`。1本の spec を両版に流す統合は [#175](https://github.com/tsukamotohiroaki/mahjong_score/issues/175)） | ○ |
| 局の上書き・採番がずれ、記録が消える／重複する | `rounds_spec`（既存最大 + 1・上書き）・`spec/models/round_spec.rb`・`score_spec`（同一局内の重複禁止） | ○ |
| API のエラーが画面に届かず、失敗に気づけない | `frontend/app/lib/api.test.ts`（404 / 422 / ネットワーク → ApiError）・各 `page.test.tsx` のエラー表示 | ○ |
| 二重送信で同じゲームが2件できる | `frontend/app/games/new/page.test.tsx` | △ |
| 画面表示の崩れ（入力欄・日付・負数の赤字・リンク先） | リクエストスペック・各 `page.test.tsx` | △ |
| LIFF ログイン分岐の誤りでアプリに入れない | `frontend/app/page.test.tsx`（SDK をモック）＋実機 | △ |
| 本番だけ POST が失敗する（CloudFront 経由の CSRF） | `spec/configuration_spec.rb` | △ |
| 応答が遅くなる（Playwright は速度を見ない） | Claude in Chrome で実測。手順は [`/response-time`](../.claude/skills/response-time/SKILL.md)（`production` で本番） | 手動 |
| LINE アプリ内でしか起きないこと（共有シート・テンキー・起動導線） | 実機。項目は [`docs/manual-test-checklist.md`](manual-test-checklist.md) | 手動 |

## 確認手段の分担

![テストピラミッド。上から順に、E2E（Playwright）= JS挙動・ユーザー操作フロー、リクエストスペック（RSpec）= HTTP入出力・バリデーション、モデルスペック（RSpec）= 計算ロジック・不変条件](images/test-pyramid.svg)

| 手段 | 守る範囲 | MPA 版 | LIFF 版 |
|---|---|---|---|
| **RSpec**（`spec/`） | サーバー側の計算・検証・HTTP 入出力 | ○ | ○（計算はサーバー側に集約されているため共有） |
| **Vitest**（`frontend/app/**/*.test.*`） | React コンポーネント・API クライアント。jsdom + モックのため HTTP 通信は発生しない | – | ○ |
| **Playwright**（`e2e/` `e2e-liff/`） | 本物のブラウザでの機能挙動。確認項目は [#175 のコメント](https://github.com/tsukamotohiroaki/mahjong_score/issues/175#issuecomment-5381018205) | ○ | ○ |
| **Claude in Chrome** | 応答速度の実測 | ○ | – |
| **実機（人間 + スマホ）** | LINE アプリの中でしか起きないこと（Chrome からは WebView に到達できない） | – | ○ |
