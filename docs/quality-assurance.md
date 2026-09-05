# 品質保証

守る対象は利用者と開発者の2つ。どちらも「集中」を守る。品質保証に関わる構成を変えたら、このドキュメントも更新する。

| 守る対象 | 目的 | 約束 |
|---|---|---|
| 利用者 | 記録に気を取られず、麻雀に集中できる | 正しい・速い・止まらない |
| 開発者 | 壊す不安なく、開発に集中できる | 迷わない・壊さない・繰り返さない |

- リスクは「起きる可能性 × 影響の大きさ」で評価し、高い順に厚く守る
- 同じことを2つの手段で確認しない（重複すると続かず、実施漏れも分からなくなる）
- テスト技法（同値分割・境界値分析など）と実例の対応は [README の「テスト設計」](../README.md#テスト設計テスト技法との対応)
- 確認手段（RSpec・Vitest・Playwright・Claude in Chrome・人間）の分担は [README の「テストと CI」](../README.md#テストと-ci)

## 利用者を守る

テスト名がそのまま仕様なので、詳細は各ファイルを参照。

![テストピラミッド。上から順に、E2E（Playwright）= JS挙動・ユーザー操作フロー、リクエストスペック（RSpec）= HTTP入出力・バリデーション、モデルスペック（RSpec）= 計算ロジック・不変条件](images/test-pyramid.svg)

### 正しい（壊れると記録の信頼が消える）

| リスク | 守り方 | テスト |
|---|---|---|
| 順位点を黙って間違える（例外が出ないため気づけない） | 同点分配・ゼロサム・境界値を1ケースずつ検証 | [`spec/models/game_spec.rb`](../spec/models/game_spec.rb) |
| 不正な点数が保存される（範囲外・合計不一致・非整数・人数不足） | サーバー側 `RoundScoreForm` で拒否し、検証順序も固定。クライアント側検証は UX 用 | [`spec/forms/round_score_form_spec.rb`](../spec/forms/round_score_form_spec.rb)・[`spec/requests/rounds_spec.rb`](../spec/requests/rounds_spec.rb)・[`spec/requests/api/v1/rounds_spec.rb`](../spec/requests/api/v1/rounds_spec.rb) |
| 不正なゲームが作られる（3/5/0人・名前重複・ゼロサム不成立） | 入口で拒否。Game と Player 4件は全部成功 or 全部ロールバック | [`spec/models/game_spec.rb`](../spec/models/game_spec.rb)・[`spec/requests/games_spec.rb`](../spec/requests/games_spec.rb)・[`spec/requests/api/v1/games_spec.rb`](../spec/requests/api/v1/games_spec.rb) |
| 局の採番・上書きがずれ、記録が消える／重複する | 既存最大 + 1 で採番し、同一局内の重複を禁止 | [`spec/requests/rounds_spec.rb`](../spec/requests/rounds_spec.rb)・[`spec/requests/api/v1/rounds_spec.rb`](../spec/requests/api/v1/rounds_spec.rb)・[`spec/models/round_spec.rb`](../spec/models/round_spec.rb)・[`spec/models/score_spec.rb`](../spec/models/score_spec.rb) |

### 速い（壊れると「紙より速い」が消える）

| リスク | 守り方 | テスト |
|---|---|---|
| 入力補助（合計・自動補完・送信可否）が壊れる | ブラウザ内で完結するため、本物のブラウザと React コンポーネントで検証 | [`e2e/score_input.spec.ts`](../e2e/score_input.spec.ts)・[`frontend/app/games/[id]/rounds/new/page.test.tsx`](../frontend/app/games/[id]/rounds/new/page.test.tsx) |
| API のエラーが画面に届かず、失敗に気づけない | 404 / 422 / ネットワーク断を ApiError に変換し、各画面で表示 | [`frontend/app/lib/api.test.ts`](../frontend/app/lib/api.test.ts)・各 [`page.test.tsx`](../frontend/app/) |
| 二重送信で同じゲームが2件できる | 送信中はボタンを無効化 | [`frontend/app/games/new/page.test.tsx`](../frontend/app/games/new/page.test.tsx) |
| 画面表示が崩れる（入力欄・日付・負数の赤字・リンク先） | 表示内容を確認 | リクエストスペック・各 [`page.test.tsx`](../frontend/app/) |
| 応答が遅くなる | Playwright は速度を見ないため、Claude in Chrome で実測 | [`/response-time`](../.claude/skills/response-time/SKILL.md)（`production` で本番） |

### 止まらない（本番・実機でしか起きない）

| リスク | 守り方 | テスト |
|---|---|---|
| 本番だけフォーム送信が全部 422 になる（Rails が自分を HTTP だと誤認し、CSRF（クロスサイトリクエストフォージェリ）検証で弾く） | 本番でしか再現しないため、`config.assume_ssl = true` が消えていないことだけを固定。仕組みは [`docs/debugging-guide.md`](debugging-guide.md) | [`spec/configuration_spec.rb`](../spec/configuration_spec.rb) |
| LIFF 版を開いてもメンバー入力画面に進めない | LINE SDK をモックし、ログイン済み → 進む / 未ログイン → LINE ログインへ / 初期化失敗 → エラー表示 の3分岐を検証。本物の LINE ログインは実機 | [`frontend/app/page.test.tsx`](../frontend/app/page.test.tsx) |
| スマホ実機でしか再現できないこと。LINE アプリの機能（QR・リッチメニュー・LINE ログイン）は LIFF 版だけ、スマホの入力・共有（テンキー・共有シート・セーフエリア）は両版で起きる | LIFF 版を実機で確認 | [`docs/manual-test-checklist.md`](manual-test-checklist.md) |

## 開発者を守る

フック4本（[`.claude/hooks/`](../.claude/hooks/)）は Claude Code 経由の操作にだけ効き、人間の git 操作と PR のマージは止めない（main にブランチ保護は未設定）。

### 迷わない仕組み

| リスク | 守り方 | ファイル |
|---|---|---|
| スコープが膨らみ、手戻りする | Issue で目的・やること・やらないことを固定してから着手。1 Issue = 1 PR | [`.github/ISSUE_TEMPLATE/task.md`](../.github/ISSUE_TEMPLATE/task.md)・[`.github/pull_request_template.md`](../.github/pull_request_template.md) |
| AI が使えないとき、起動・テスト・デプロイの手が止まる | 実行確認済みのコマンドだけを残し、AI なしで再現できる状態を保つ | [`docs/commands.md`](commands.md) |
| 構成の判断がブレる | 構成図と受け入れたリスクを文書化 | [`docs/architecture.md`](architecture.md)・[`docs/infrastructure.md`](infrastructure.md) |
| AI が方針を忘れる | プロセス・制約・Git 運用を1枚に固定 | [`CLAUDE.md`](../CLAUDE.md) |
| 環境の状態を知らずに作業を始める | セッション開始時に git の状態を表示 | [`.claude/hooks/session-start-info.sh`](../.claude/hooks/session-start-info.sh) |

### 壊さない仕組み

| リスク | 守り方 | ファイル |
|---|---|---|
| 壊れた変更が main に入り、気づかないまま残る | main 向け PR と main への push のたびに RSpec・Vitest・Playwright（MPA 版 / LIFF 版）を全部流し、壊れていれば自動で気づける。push 前にも RSpec | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)・[`.claude/hooks/pre-push-test.sh`](../.claude/hooks/pre-push-test.sh) |
| main に直接コミットする | ブランチが main なら止める | [`.claude/hooks/prevent-main-commit.sh`](../.claude/hooks/prevent-main-commit.sh) |
| 古い main から分岐し、コンフリクトする | `git checkout -b` の前に pull | [`.claude/hooks/pre-branch-pull.sh`](../.claude/hooks/pre-branch-pull.sh) |
| 変更の影響範囲を見落とし、間接的に壊す | 変更前に影響する spec を引く。実装とテストは常にセットで入れる（TDD） | [`.claude/dependencies.md`](../.claude/dependencies.md) |
| MPA 版と LIFF 版の仕様が乖離し、片方だけ壊れても気づけない | 順位点計算とサーバー側の検証は Rails 側1箇所に集約。二重実装の入力補助は共通 E2E テストを両版に流し、同じ DOM 契約（見出し・ラベル・`data-testid`）に縛る。片方だけ壊れると落ちる | [二重実装マップ](architecture.md#二重実装マップ)・[`e2e/`](../e2e/)（[`playwright.config.ts`](../playwright.config.ts) の mpa / liff 両 project） |
| API 変更で LIFF 版だけ静かに壊れる | 契約を明文化し、振る舞いはリクエストスペックで検証 | [`docs/openapi.yaml`](openapi.yaml)・[`spec/requests/api/v1/`](../spec/requests/api/v1/) |

### 繰り返さない仕組み

| リスク | 守り方 | ファイル |
|---|---|---|
| 同じ事故を再調査する | 遭遇した事故だけを症状 → 原因で残す | [`docs/debugging-guide.md`](debugging-guide.md) |
| なぜそう決めたか、すぐ思い出せない | 決定と理由を記録する | [`docs/adr/`](adr/) |
| 本番環境を手作業で作り直す | VPC・EC2・RDS・CloudFront・アラームを1テンプレートで定義 | [`infra/cloudformation.yml`](../infra/cloudformation.yml) |
