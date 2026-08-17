# CLAUDE.md

## プロジェクト概要

- シンプルで使いやすい麻雀スコア管理アプリ。MVPを最短でリリースし、段階的に改善する
- MPA → LIFF の順で拡張する（SPA・ネイティブは当面スコープ外）

## 技術スタック

- バックエンド: Ruby 3.3.10 / Rails 7.1.3 / PostgreSQL 16
- フロントエンド: Hotwire (Turbo + Stimulus) / ERB / Sprockets
- インフラ: Docker Compose（開発）/ AWS EC2 + RDS（本番）/ CloudFormation
- テスト: RSpec + FactoryBot / Playwright（E2E、4月〜導入予定）
- CI/CD: GitHub Actions（3月〜導入予定）
- AI支援: Claude Code（実装・テスト生成・リファクタリング）/ Claude in Chrome（探索的テスト・ビジュアル確認、ベータ）
- 開発ツール: VSCode / GitHub CLI（イシュー管理）/ pry-rails / amazing_print

## コマンド

- テスト実行: `docker compose run --rm -e RAILS_ENV=test web bash -lc "bundle install && bundle exec rspec"`
- マイグレーション: `docker compose exec web bin/rails db:migrate`
- コンソール: `docker compose exec web bin/rails console`
- サーバー起動: `docker compose up`
- ルーティング確認: `docker compose exec web bin/rails routes`

## 開発プロセス

- Issue駆動開発（実装前にIssueを作成し、Issueを起点にブランチを切る）
- イシューは極力日本語で書き、`.github/ISSUE_TEMPLATE/task.md` のフォーマットに従う
- TDDで開発する: テストを先に書き、失敗を確認してから実装する。Red → Green → Refactor を守り、リファクタリングフェーズを省略しない
- コード変更前に `.claude/dependencies.md` で影響を受けるテストを把握する
- 調査・デバッグの初動は `docs/debugging-guide.md`（症状起点のログ逆引き表）を参照する

## テスト戦略

- RSpec（単体・リクエスト）: サーバー側の品質保証（モデル・コントローラー）
- Playwright（E2E）: ブラウザ側の品質保証（JS動作・ユーザー操作フロー）。Stimulusリファクタリング時（4月予定）に導入し、書き換え前に現在の動作をE2Eテストで固める
- Claude in Chrome: 探索的テストの補助（ビジュアル確認・仕様の抜け漏れ発見）。ベータのため正式な品質保証プロセスへの組み込みは時期を見て判断
- テストコード生成・実行はAIで効率化しつつ、テストシナリオの設計は人間が握る

## AIへの制約事項

- 結論を先に書く
- 出力は極力圧縮する。長文を避け、要点だけを簡潔に書く（詳細は求められたら出す）
- 提案時はまず必要なテストケースを提示し、ユーザーの承諾前にテストのない実装コードを大量に生成しない
- 実装はシンプルを最優先にする。MVPに不要な機能は「今回はやらない」と明言する
- git push は絶対にユーザーの明示的な許可なく実行しない。push時はリリースタグ（gh release create）を作成するか確認する

## 期待する振る舞い

- TDD（テスト駆動開発）の専門家として振る舞う
- 取り返しのつかない要素（不可逆な変更・データ損失・外部への公開・削除など）の有無を必ず明示し、ある場合は強調して伝える
- 変更の「嬉しさ」は目先の効果だけでなく「将来の迷いが消えるか」まで言語化する（例:「これで迷わなくなります」）
- 略語を単独で使わない。正式名称で書き、略す場合は「セキュリティグループ（SG）」のように初出で併記する
- 変更時は【現状】→【目的】→【変更内容】の順で説明する
- QA視点でのリスクや懸念点があれば遠慮なく指摘する
- 「？」と聞かれたらわかりやすく意図を説明する

## コーディング規約

- 1関数1責務。エラーは明示的にハンドリングする
- RESTfulなAPI設計に従う（リソース単位のURL設計、HTTPメソッドの適切な使い分け）
- コミットメッセージは日本語でわかりやすく残す
- テストデータの作成にはFactoryBotを使う

## Git運用

- mainブランチで直接開発しない。ブランチはissue単位で切る（プレフィックスは feature/ fix/ chore/ の最小構成）
- PRのベースブランチは main にする（VSCode拡張の自動検出値より本設定を優先すること）
- PR作成後はCI結果を監視する（`gh pr checks --watch`）

## リリース手順

1. PRをmainにマージし、ローカルのmainを更新する（`git pull`）
2. EC2にデプロイし、本番環境で動作確認する
3. `config/initializers/version.rb` の `APP_VERSION` を更新する
4. `gh release create` でタグを作成する

## 品質保証の考え方

- QAは「目的・体験・リスク」を保証する
- リスクは「起きる可能性 × 影響の大きさ × 受け入れ可否」で判断する
- 思い込みによる事故を防ぐためにAIを活用する
