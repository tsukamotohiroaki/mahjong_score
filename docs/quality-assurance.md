# 品質保証

守る対象は利用者と開発者の2つ。どちらも「集中」を守る。品質保証に関わる構成を変えたら、このドキュメントも更新する。

| 守る対象 | 目的 | 約束 |
|---|---|---|
| 利用者 | 記録に気を取られず、麻雀に集中できる | 正しい・速い・止まらない |
| 開発者 | 壊す不安なく、開発に集中できる | 迷わない・壊さない・繰り返さない |

- リスクは「起きる可能性 × 影響の大きさ」で評価し、高い順に厚く守る
- 同じことを2つの手段で確認しない（重複すると続かず、実施漏れも分からなくなる）
- テスト技法（同値分割・境界値分析など）と実例の対応は [README の「テスト設計」](../README.md#テスト設計テスト技法との対応)

## 利用者を守る

厚みは ◎ 個別ケースを網羅 / ○ 主要ケース / △ スモーク / 手動。テスト名がそのまま仕様なので、詳細は各ファイルを参照。

![テストピラミッド。上から順に、E2E（Playwright）= JS挙動・ユーザー操作フロー、リクエストスペック（RSpec）= HTTP入出力・バリデーション、モデルスペック（RSpec）= 計算ロジック・不変条件](images/test-pyramid.svg)

### 正しい（壊れると記録の信頼が消える）

| リスク | 守り方 | テスト | 厚み |
|---|---|---|---|
| 順位点を黙って間違える（例外が出ないため気づけない） | 同点分配・ゼロサム・境界値を1ケースずつ検証 | `spec/models/game_spec.rb` | ◎ |
| 不正な点数が保存される（範囲外・合計不一致・非整数・人数不足） | サーバー側 `RoundScoreForm` で拒否し、検証順序も固定。クライアント側検証は UX 用 | `spec/forms/round_score_form_spec.rb`・`spec/requests/**/rounds_spec.rb` | ◎ |
| 不正なゲームが作られる（3/5/0人・名前重複・ゼロサム不成立） | 入口で拒否。Game と Player 4件は全部成功 or 全部ロールバック | `spec/models/game_spec.rb`・`spec/requests/**/games_spec.rb` | ◎ |
| 局の採番・上書きがずれ、記録が消える／重複する | 既存最大 + 1 で採番し、同一局内の重複を禁止 | `spec/requests/**/rounds_spec.rb`・`spec/models/round_spec.rb`・`spec/models/score_spec.rb` | ○ |

### 速い（壊れると「紙より速い」が消える）

| リスク | 守り方 | テスト | 厚み |
|---|---|---|---|
| 入力補助（合計・自動補完・送信可否）が壊れる | ブラウザ内で完結するため、本物のブラウザと React コンポーネントで検証 | `e2e/score_input.spec.ts`・`frontend/app/games/[id]/rounds/new/page.test.tsx` | ◎ |
| API のエラーが画面に届かず、失敗に気づけない | 404 / 422 / ネットワーク断を ApiError に変換し、各画面で表示 | `frontend/app/lib/api.test.ts`・各 `page.test.tsx` | ○ |
| 二重送信で同じゲームが2件できる | 送信中はボタンを無効化 | `frontend/app/games/new/page.test.tsx` | △ |
| 画面表示が崩れる（入力欄・日付・負数の赤字・リンク先） | 表示内容を確認 | リクエストスペック・各 `page.test.tsx` | △ |
| 応答が遅くなる | Playwright は速度を見ないため、Claude in Chrome で実測 | [`/response-time`](../.claude/skills/response-time/SKILL.md)（`production` で本番） | 手動 |

### 止まらない（本番・LINE 環境でしか起きない）

| リスク | 守り方 | テスト | 厚み |
|---|---|---|---|
| 本番だけ POST が失敗する（CloudFront 経由だとクロスサイトリクエストフォージェリ（CSRF）検証に落ちる） | `assume_ssl` が有効なことを確認 | `spec/configuration_spec.rb` | △ |
| LIFF ログインの分岐を誤り、アプリに入れない | SDK をモックして分岐を確認。実物は実機 | `frontend/app/page.test.tsx` | △ |
| LINE アプリ内でしか起きないこと（共有シート・テンキー・起動導線） | 実機で確認 | [`docs/manual-test-checklist.md`](manual-test-checklist.md) | 手動 |

## 開発者を守る

フック4本（`.claude/hooks/`）は Claude Code 経由の操作にだけ効き、人間の git 操作と PR のマージは止めない（main にブランチ保護は未設定）。

### 迷わない

| リスク | 守り方 | 仕組み |
|---|---|---|
| スコープが膨らみ、手戻りする | Issue で目的・やること・やらないことを固定してから着手。1 Issue = 1 PR | `.github/ISSUE_TEMPLATE/task.md`・`.github/pull_request_template.md` |
| コマンドを思い出せない | 実行確認済みのコマンドだけを残す | `docs/commands.md` |
| 構成の判断がブレる | 構成図と受け入れたリスクを文書化 | `docs/architecture.md`・`docs/infrastructure.md` |
| AI が方針を忘れる | プロセス・制約・Git 運用を1枚に固定 | `CLAUDE.md` |
| 環境の状態を知らずに作業を始める | セッション開始時に git の状態を表示 | `.claude/hooks/session-start-info.sh` |

### 壊さない

| リスク | 守り方 | 仕組み |
|---|---|---|
| 壊れた変更が main に入る | main 向け PR と push で RSpec・Vitest・Playwright（MPA 版 / LIFF 版）を自動実行。push 前にも RSpec | `.github/workflows/ci.yml`・`.claude/hooks/pre-push-test.sh` |
| main に直接コミットする | ブランチが main なら止める | `.claude/hooks/prevent-main-commit.sh` |
| 古い main から分岐し、コンフリクトする | `git checkout -b` の前に pull | `.claude/hooks/pre-branch-pull.sh` |
| 変更の影響範囲を見落とし、間接的に壊す | 変更前に影響する spec を引く。実装とテストは常にセットで入れる（TDD） | `.claude/dependencies.md` |
| MPA 版と LIFF 版の仕様が乖離し、片方だけ壊れても気づけない | 順位点計算とサーバー側の検証は Rails 側1箇所に集約。二重実装の入力補助は1本の E2E spec を両版に流し、片方だけ壊れると落ちる | [二重実装マップ](architecture.md#二重実装マップ)・`e2e/`（`playwright.config.ts` の mpa / liff 両 project） |
| API 変更で LIFF 版だけ静かに壊れる | 契約を明文化し、振る舞いはリクエストスペックで検証 | `docs/openapi.yaml`・`spec/requests/api/v1/` |

### 繰り返さない

| リスク | 守り方 | 仕組み |
|---|---|---|
| 同じ事故を再調査する | 遭遇した事故だけを症状 → 原因で残す | `docs/debugging-guide.md` |
| 過去の判断を蒸し返す | 決定と理由を記録する | `docs/adr/` |
| 本番環境を手作業で作り直す | VPC・EC2・RDS・CloudFront・アラームを1テンプレートで定義 | `infra/cloudformation.yml` |

## 確認手段の分担

| 手段 | 守る範囲 | MPA 版 | LIFF 版 |
|---|---|---|---|
| **RSpec**（`spec/`） | サーバー側の計算・検証・HTTP 入出力 | ○ | ○（計算はサーバー側に集約されているため共有） |
| **Vitest**（`frontend/app/**/*.test.*`） | React コンポーネント・API クライアント。jsdom + モックのため HTTP 通信は発生しない | – | ○ |
| **Playwright**（`e2e/`） | 本物のブラウザでしか確認できない操作フロー: ルール設定の折りたたみ、合計のリアルタイム更新、4人目の自動補完、送信可否、送信後のスコア一覧遷移。1本の spec を mpa / liff の両 project に流す | ○ | ○（`/` は LINE ログインへ外部遷移するため除外） |
| **Claude in Chrome** | 応答速度の実測 | ○ | ○ |
| **実機（人間 + スマホ）** | LINE アプリの中でしか起きないこと（Chrome からは WebView に到達できない） | – | ○ |
