# テスト戦略

リスクの高い箇所に厚く、単純な箇所は浅くテストを配分する。その判断を1枚で示す。テスト構成を変えたらこのドキュメントも更新する。

## 品質保証の考え方

このアプリの体験の核は **「記録したスコアが正しい」** こと。品質保証はすべてこの一点を守るためにある。

- リスクは「起きる可能性 × 影響の大きさ」で評価し、高い順に厚く守る
- 同じことを2つの手段で確認しない（重複すると続かず、実施漏れも分からなくなる）
- テストを先に書く（TDD）。変更前に `.claude/dependencies.md` で影響するテストを把握する
- テスト技法（同値分割・境界値分析など）と実例の対応は [README の「テスト設計」](../README.md#テスト設計テスト技法との対応)

![テストピラミッド。上から順に、E2E（Playwright）= JS挙動・ユーザー操作フロー、リクエストスペック（RSpec）= HTTP入出力・バリデーション、モデルスペック（RSpec）= 計算ロジック・不変条件](images/test-pyramid.svg)

## リスクと備え

影響の大きい順。厚みは ◎ 個別ケースを網羅 / ○ 主要ケース / △ スモーク / 手動。テスト名がそのまま仕様なので、詳細は各ファイルを参照。

### スコアの正しさ（壊れると記録の信頼が消える）

| リスク | 守り方 | テスト | 厚み |
|---|---|---|---|
| 順位点を黙って間違える（例外が出ないため気づけない） | 同点分配・ゼロサム・境界値を1ケースずつ検証 | `spec/models/game_spec.rb` | ◎ |
| 不正な点数が保存される（範囲外・合計不一致・非整数・人数不足） | サーバー側 `RoundScoreForm` で拒否し、検証順序も固定。クライアント側検証は UX 用 | `spec/forms/round_score_form_spec.rb`・`spec/requests/**/rounds_spec.rb` | ◎ |
| 不正なゲームが作られる（3/5/0人・名前重複・ゼロサム不成立） | 入口で拒否。Game と Player 4件は全部成功 or 全部ロールバック | `spec/models/game_spec.rb`・`spec/requests/**/games_spec.rb` | ◎ |
| 局の採番・上書きがずれ、記録が消える／重複する | 既存最大 + 1 で採番し、同一局内の重複を禁止 | `spec/requests/**/rounds_spec.rb`・`spec/models/round_spec.rb`・`spec/models/score_spec.rb` | ○ |

### 入力体験（壊れると「紙より速い」が消える）

| リスク | 守り方 | テスト | 厚み |
|---|---|---|---|
| 入力補助（合計・自動補完・送信可否）が壊れる | ブラウザ内で完結するため、本物のブラウザと React コンポーネントで検証 | `e2e/score_input.spec.ts`・`frontend/app/games/[id]/rounds/new/page.test.tsx` | ◎ |
| API のエラーが画面に届かず、失敗に気づけない | 404 / 422 / ネットワーク断を ApiError に変換し、各画面で表示 | `frontend/app/lib/api.test.ts`・各 `page.test.tsx` | ○ |
| 二重送信で同じゲームが2件できる | 送信中はボタンを無効化 | `frontend/app/games/new/page.test.tsx` | △ |
| 画面表示が崩れる（入力欄・日付・負数の赤字・リンク先） | 表示内容を確認 | リクエストスペック・各 `page.test.tsx` | △ |
| 応答が遅くなる | Playwright は速度を見ないため、Claude in Chrome で実測 | [`/response-time`](../.claude/skills/response-time/SKILL.md)（`production` で本番） | 手動 |

### 2つの実装（MPA 版と LIFF 版）

| リスク | 守り方 | テスト | 厚み |
|---|---|---|---|
| 仕様が乖離し、片方だけ壊れても気づけない | 計算は `Game` 1箇所に集約し API で共有（契約は `docs/openapi.yaml`）。二重実装の入力補助は両版に E2E を流す | `e2e/`・`e2e-liff/`（1本の spec を両版に流す統合は [#175](https://github.com/tsukamotohiroaki/mahjong_score/issues/175)） | ○ |

### 本番・LINE 環境（ローカルでは起きない）

| リスク | 守り方 | テスト | 厚み |
|---|---|---|---|
| 本番だけ POST が失敗する（CloudFront 経由の CSRF） | 本番設定を検証 | `spec/configuration_spec.rb` | △ |
| LIFF ログインの分岐を誤り、アプリに入れない | SDK をモックして分岐を確認。実物は実機 | `frontend/app/page.test.tsx` | △ |
| LINE アプリ内でしか起きないこと（共有シート・テンキー・起動導線） | 実機で確認 | [`docs/manual-test-checklist.md`](manual-test-checklist.md) | 手動 |

## 確認手段の分担

| 手段 | 守る範囲 | MPA 版 | LIFF 版 |
|---|---|---|---|
| **RSpec**（`spec/`） | サーバー側の計算・検証・HTTP 入出力 | ○ | ○（計算はサーバー側に集約されているため共有） |
| **Vitest**（`frontend/app/**/*.test.*`） | React コンポーネント・API クライアント。jsdom + モックのため HTTP 通信は発生しない | – | ○ |
| **Playwright**（`e2e/` `e2e-liff/`） | 本物のブラウザでの機能挙動。確認項目は [#175 のコメント](https://github.com/tsukamotohiroaki/mahjong_score/issues/175#issuecomment-5381018205) | ○ | ○ |
| **Claude in Chrome** | 応答速度の実測 | ○ | – |
| **実機（人間 + スマホ）** | LINE アプリの中でしか起きないこと（Chrome からは WebView に到達できない） | – | ○ |
