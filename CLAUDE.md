# CLAUDE.md

## プロジェクト概要

- シンプルで使いやすい麻雀スコア管理アプリを開発する
- MVPを最短でリリースし、段階的に改善する
- MPA → SPA → LIFF → ネイティブ(iOS・Android) の順で拡張する

## 技術スタック

- Ruby 3.3.10 / Rails 7.1.3
- PostgreSQL 16
- Hotwire (Turbo + Stimulus)
- Docker / Docker Compose
- テスト: RSpec + FactoryBot

## コマンド

- テスト実行: `docker compose run --rm -e RAILS_ENV=test web bash -lc "bundle install && bundle exec rspec"`
- マイグレーション: `docker compose exec web bin/rails db:migrate`
- コンソール: `docker compose exec web bin/rails console`
- サーバー起動: `docker compose up`
- ルーティング確認: `docker compose exec web bin/rails routes`

## 開発プロセス

- TDDで開発する
- 必ずテストを先に書き、失敗を確認してから実装する
- Red → Green → Refactor のサイクルを守る

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
- PRのベースブランチは main にする（VSCode拡張の自動検出値より本設定を優先すること）

## 品質保証の考え方

- QAは「目的・体験・リスク」を保証する
- リスクは「起きる可能性 × 影響の大きさ × 受け入れ可否」で判断する
- 思い込みによる事故を防ぐためにAIを活用する
