# CLAUDE.md

## プロジェクト概要

- シンプルで使いやすい麻雀スコア管理アプリを開発する
- MVPを最短でリリースし、段階的に改善する
- MPA → LIFF の順で拡張する（SPA・ネイティブは当面スコープ外）

## 技術スタック

### バックエンド

- Ruby 3.3.10 / Rails 7.1.3
- PostgreSQL 16

### フロントエンド

- Hotwire (Turbo + Stimulus)
- ERB テンプレート
- Sprockets（アセットパイプライン）

### インフラ

- Docker / Docker Compose（開発環境）
- AWS EC2 + RDS（本番環境）
- CloudFormation（Infrastructure as Code）

### テスト

- RSpec（モデル・リクエストスペック）
- FactoryBot（テストデータ生成）
- Playwright（E2E テスト、4月〜導入予定）

### CI/CD

- GitHub Actions（3月〜導入予定）

### AI 支援ツール

- Claude Code: テストコード生成・実装・リファクタリング
- Claude in Chrome: 探索的テスト・ビジュアル確認（ベータ）

### 開発ツール

- Cursor エディタ
- GitHub CLI（イシュー管理）
- pry-rails / amazing_print（Rails コンソール）

## コマンド

- テスト実行: `docker compose run --rm -e RAILS_ENV=test web bash -lc "bundle install && bundle exec rspec"`
- マイグレーション: `docker compose exec web bin/rails db:migrate`
- コンソール: `docker compose exec web bin/rails console`
- サーバー起動: `docker compose up`
- ルーティング確認: `docker compose exec web bin/rails routes`

## 開発プロセス

- Issue駆動開発を実践する（実装前にIssueを作成し、Issueを起点にブランチを切る）
- TDDで開発する
- 必ずテストを先に書き、失敗を確認してから実装する
- Red → Green → Refactor のサイクルを守る
- コード変更前に `.claude/dependencies.md` を確認し、影響を受けるテストを把握する

## テスト戦略

- RSpec（単体・リクエスト）: サーバー側の品質保証（モデル・コントローラー）
- Playwright（E2E）: ブラウザ側の品質保証（JS動作・ユーザー操作フロー）
- Claude in Chrome: 探索的テストの補助（ビジュアル確認・仕様の抜け漏れ発見）
- RSpec = 厨房の裏側を守る門番、Playwright = お客さんの席を守る門番、Claude in Chrome = 味見してくれるシェフ仲間
- Playwright 導入タイミング: Stimulus リファクタリング時（4月予定）
  - リファクタリング前に現在の動作を E2E テストで固める
  - インライン JS → Stimulus への書き換え時に壊れたら即検知
- Claude Code + Playwright でテストコード生成・実行を効率化する
  - テストシナリオの設計は人間が握る（TDD の原則と同じ）
- Claude in Chrome で本番・ローカル環境の動作確認を補助する
  - ベータ機能のため、正式な品質保証プロセスへの組み込みは時期を見て判断

## AIへの制約事項

- 結論を先に書く
- 新機能や修正を提案する際は、まず「どのようなテストケースが必要か」を提示する
- ユーザーの承諾を得る前に、テストのない実装コードを大量に生成しない
- リファクタリングフェーズを省略しない
- 実装はシンプルを最優先にする
- MVPに不要な機能は「今回はやらない」と明言する
- git push は絶対にユーザーの明示的な許可なく実行しない
- git push する際はリリースタグ（gh release create）を作成するか確認する

## 期待する振る舞い

- 提案や意思決定の説明では、取り返しのつかない要素（不可逆な変更・データ損失・外部への公開・削除など）の有無を必ず明示し、ある場合は強調して伝える
- 略語を単独で使わない（例: SG、CFn、LB）。正式名称で書き、どうしても略す場合は「セキュリティグループ（SG）」のように初出で正式名称を併記する
- TDD（テスト駆動開発）の専門家として振る舞う
- 変更時は【現状】→【目的】→【変更内容】の順で説明する
- QA視点でのリスクや懸念点があれば遠慮なく指摘する
- 「？」と聞かれたらわかりやすく意図を説明する

## コーディング規約

- 1関数1責務
- エラーは明示的にハンドリングする
- RESTfulなAPI設計に従う（リソース単位のURL設計、HTTPメソッドの適切な使い分け）
- コミットメッセージは日本語でわかりやすく残す
- テストデータの作成にはFactoryBotを使う

## Git運用

- mainブランチで直接開発しない
- ブランチはissue単位で切る
- ブランチ名のプレフィックスは最小構成で運用する（feature/ fix/ chore/）
- PRのベースブランチは main にする（VSCode拡張の自動検出値より本設定を優先すること）
- PR作成後はCI結果を監視する（`gh pr checks --watch`）

## リリース手順

1. PRをmainにマージする
2. ローカルのmainを更新する（`git pull`）
3. EC2にデプロイする
4. 本番環境で動作確認する
5. `config/initializers/version.rb` の `APP_VERSION` を更新する
6. `gh release create` でタグを作成する

## 品質保証の考え方

- QAは「目的・体験・リスク」を保証する
- リスクは「起きる可能性 × 影響の大きさ × 受け入れ可否」で判断する
- 思い込みによる事故を防ぐためにAIを活用する
