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

# E2Eテスト実行（ホスト）※ 事前に docker compose up でアプリを起動しておく
npx playwright test

# E2Eテスト実行（Docker）
docker compose run --rm playwright
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

## Hotwire（Turbo + Stimulus）

Rails 標準の Hotwire スタックを使用しています。

### 構成

- **importmap-rails**: JSモジュールの配信（バンドラー不要）
- **Turbo**: ページ遷移の高速化（Turbo Drive）
- **Stimulus**: HTML属性ベースの軽量JSフレームワーク

### Stimulus コントローラーの追加方法

```bash
# コントローラーを作成
docker compose exec web bin/rails generate stimulus controller_name
```

`app/javascript/controllers/` にファイルが生成されます。

### ファイル構成

```
app/javascript/
├── application.js                 # エントリーポイント（Turbo + Stimulus を読み込み）
└── controllers/
    ├── application.js             # Stimulus アプリケーション設定
    ├── index.js                   # コントローラーの自動読み込み
    └── hello_controller.js        # サンプルコントローラー
config/
└── importmap.rb                   # JSモジュールのピン定義
```

### Stimulus コントローラーの使い方

```erb
<!-- ビューで data-controller 属性を指定 -->
<div data-controller="hello">
  <!-- connect() 時に "Hello World!" に置き換わる -->
</div>
```

```javascript
// app/javascript/controllers/hello_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    this.element.textContent = "Hello World!"
  }
}
```

## API 仕様書（OpenAPI）

`docs/openapi.yaml` に OpenAPI 3.0 形式の API 仕様書があります。
6月の Rails API 化で実装する予定のエンドポイント設計を記載しています。

### 構文チェック

```bash
npx @redocly/cli lint docs/openapi.yaml
```

## ディレクトリ構成（主要部分）

```
mahjong_score/
├── app/
│   ├── controllers/    # コントローラー
│   ├── javascript/     # JS（Stimulus コントローラー等）
│   ├── models/         # モデル
│   └── views/          # ビュー
├── config/
│   ├── database.yml    # DB設定
│   └── routes.rb       # ルーティング
├── db/
│   ├── migrate/        # マイグレーションファイル
│   └── schema.rb       # スキーマ定義
├── docs/
│   └── openapi.yaml    # API 仕様書（OpenAPI 3.0）
├── e2e/                # E2Eテスト（Playwright）
├── docker-compose.yml  # Docker Compose 設定
└── Gemfile             # gem 定義
```

## 本番環境（AWS）

### 構成

- EC2（t2.micro）+ RDS（PostgreSQL 16）
- CloudFormation でインフラをコード化（`infra/cloudformation.yml`）
- Docker Compose で Rails アプリを起動

### デプロイ手順

1. EC2 に SSH 接続する
2. アプリを更新する（`git pull`）
3. コンテナを再起動する（`docker-compose up -d`）
4. 本番環境で動作確認する

### systemd サービスの設定（初回のみ）

EC2 再起動時にアプリが自動起動するよう設定する：

```bash
sudo cp infra/mahjong-score.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable mahjong-score
```

※ CloudFormation で新規構築した場合は UserData で自動設定済み

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
3. テストを書く（TDD: Red → Green → Refactor）
4. 実装する
5. 動作確認する
6. PRを作成する
7. マージする
8. イシューをCloseする
