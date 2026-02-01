# Mahjong Score

麻雀の半荘結果を記録・集計できるスコア管理アプリ（Web）

## 技術スタック

- Ruby 3.3.10
- Rails 7.1.3
- PostgreSQL 16
- Docker / Docker Compose
- Hotwire (Turbo + Stimulus)

## 必要なもの

- Docker Desktop（または Docker Engine + Docker Compose）

## セットアップ

### 1. リポジトリをクローン

```bash
git clone <repository-url>
cd mahjong_score
```

### 2. コンテナを起動

```bash
docker compose up
```

初回起動時は以下が自動で実行されます：
- gem のインストール（`bundle install`）
- Rails サーバーの起動

### 3. データベースを作成（初回のみ）

別ターミナルで以下を実行：

```bash
docker compose exec web bin/rails db:create db:migrate
```

### 4. アクセス

http://localhost:3000

## よく使うコマンド

### コンテナ操作

```bash
# 起動（フォアグラウンド）
docker compose up

# 起動（バックグラウンド）
docker compose up -d

# 停止
docker compose down

# 停止 + ボリューム削除（DBデータも消える）
docker compose down -v
```

### Rails コマンド

```bash
# Rails コンソール
docker compose exec web bin/rails console

# マイグレーション実行
docker compose exec web bin/rails db:migrate

# マイグレーション作成
docker compose exec web bin/rails generate migration AddColumnToTable

# モデル生成
docker compose exec web bin/rails generate model ModelName field:type

# ルーティング確認
docker compose exec web bin/rails routes

# RSpec実行
docker compose run --rm -e RAILS_ENV=test web bash -lc "bundle install && bundle exec rspec"
```

### その他

```bash
# コンテナ内でシェルを開く
docker compose exec web bash

# ログ確認
docker compose logs -f web

# gem 追加後の反映
docker compose exec web bundle install
```

## ディレクトリ構成（主要部分）

```
mahjong_score/
├── app/
│   ├── controllers/    # コントローラー
│   ├── models/         # モデル
│   └── views/          # ビュー
├── config/
│   ├── database.yml    # DB設定
│   └── routes.rb       # ルーティング
├── db/
│   ├── migrate/        # マイグレーションファイル
│   └── schema.rb       # スキーマ定義
├── docker-compose.yml  # Docker Compose 設定
└── Gemfile             # gem 定義
```

## トラブルシューティング

### `localhost:3000` にアクセスできない

```bash
# コンテナが起動しているか確認
docker compose ps

# ログを確認
docker compose logs web
```

### DB 接続エラー

```bash
# DB コンテナが起動しているか確認
docker compose ps

# DB を再作成
docker compose exec web bin/rails db:drop db:create db:migrate
```

### gem のインストールエラー

```bash
# コンテナを再ビルド
docker compose down
docker compose up --build
```

## 開発メモ
- `chore/initial-setup` ブランチ: Rails + Docker + PostgreSQL の初期構成保存用（以後更新しない）

## 開発フロー
1. イシューを作成する
2. ブランチを切る
3. 実装する
4. 動作確認する
5. PRを作成する
6. マージする
7. イシューをCloseする
