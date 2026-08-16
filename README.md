# Mahjong Score

<p>
  <a href="https://github.com/tsukamotohiroaki/mahjong_score/actions/workflows/ci.yml">
    <img src="https://github.com/tsukamotohiroaki/mahjong_score/actions/workflows/ci.yml/badge.svg" alt="CI" vspace="10">
  </a>
  <img src="https://img.shields.io/badge/version-v0.2.0-blue" alt="Version" vspace="10">
  <img src="https://img.shields.io/badge/Ruby-3.3-CC342D?logo=ruby&logoColor=white" alt="Ruby 3.3" vspace="10">
  <img src="https://img.shields.io/badge/Rails-7.1-D30001?logo=rubyonrails&logoColor=white" alt="Rails 7.1" vspace="10">
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL 16" vspace="10">
  <img src="https://img.shields.io/badge/Hotwire-Turbo%20%2B%20Stimulus-FFE801?logo=hotwire&logoColor=black" alt="Hotwire" vspace="10">
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" alt="Docker Compose" vspace="10">
</p>

麻雀の半荘結果を記録し、順位点まで自動計算するシンプルなスコア管理アプリ 🀄

MPA（Rails + ERB + Hotwire）で MVP を最短リリースし、動かしたまま LIFF 版（Next.js）へ段階的に移行しています（ストラングラーフィグパターン）。

> 面倒で間違えやすい計算作業を自動化して、人が本来やりたいこと（対局を楽しむ・ルールを学ぶ）に集中できるようにする——このアプリが解決する課題は [`docs/value-proposition.md`](docs/value-proposition.md) にまとめています。

## Try it on LINE

LINE 公式アカウントを友だち追加すると、リッチメニューから LIFF 版アプリをすぐに試せます。

<img src="docs/images/line-add-friend-qr.png" alt="LINE友だち追加QRコード" width="240">

1. QR コード（または [友だち追加リンク](https://line.me/R/ti/p/@165fpsbq)）から「麻雀スコア帳」を友だち追加する
2. トーク画面下部のリッチメニュー「麻雀スコア帳を開く」をタップする
3. LIFF 版アプリが起動し、そのままゲームを作成できる

> **Note**: デモ環境（AWS EC2）はコスト節約のため停止していることがあります。動かない場合はイシューでお知らせください。

## Features

**対局の記録** — 4人固定のゲームを作成し、半荘（ラウンド）ごとに素点を入力。ゲーム作成とプレイヤー登録はトランザクションでまとめて行い、不整合を防ぎます。

**順位点の自動計算** — 持ち点・返し点・順位点（ウマ）をゲームごとのルールとして設定。順位点はゼロサム検証つきで、同点時は該当順位のボーナスを均等分配します。

**JSON API** — LIFF 版（Next.js）向けの `/api/v1` エンドポイント。OpenAPI 3.0 仕様書（[`docs/openapi.yaml`](docs/openapi.yaml)）を MPA 版と LIFF 版の「契約」として運用しています。

**Hotwire スタック** — importmap-rails + Turbo + Stimulus。バンドラー不要の Rails 標準構成です。

**TDAD（Test-Driven Agentic Development）** — AI エージェント（Claude Code）との協働開発で、依存マップ（`.claude/dependencies.md`）を起点にデグレを防ぐ運用をしています。

## Quick Start

### 必要なもの

- Docker Desktop（または Docker Engine + Docker Compose）

### 起動手順

1. リポジトリをクローンする:

   ```bash
   git clone <repository-url>
   cd mahjong_score
   ```

2. コンテナを起動する（初回は gem のインストールが自動で走ります）:

   ```bash
   docker compose up
   ```

3. データベースを作成する（初回のみ、別ターミナルで）:

   ```bash
   docker compose exec web bin/rails db:create db:migrate
   ```

4. http://localhost:3000 にアクセスする 🎉

## Commands

よく使うコマンドの早見表です。

| やりたいこと | コマンド |
|---|---|
| サーバー起動 | `docker compose up` |
| Rails コンソール | `docker compose exec web bin/rails console` |
| マイグレーション実行 | `docker compose exec web bin/rails db:migrate` |
| ルーティング確認 | `docker compose exec web bin/rails routes` |
| RSpec 実行 | `docker compose run --rm -e RAILS_ENV=test web bash -lc "bundle install && bundle exec rspec"` |
| E2E テスト（ホスト） | `npx playwright test` ※事前に `docker compose up` でアプリを起動 |
| E2E テスト（Docker） | `docker compose run --rm playwright` |

<details>
<summary><b>コンテナ操作</b></summary>

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

</details>

<details>
<summary><b>Rails ジェネレーター</b></summary>

```bash
# マイグレーション作成
docker compose exec web bin/rails generate migration AddColumnToTable

# モデル生成
docker compose exec web bin/rails generate model ModelName field:type

# Stimulus コントローラー生成
docker compose exec web bin/rails generate stimulus controller_name
```

</details>

<details>
<summary><b>その他</b></summary>

```bash
# コンテナ内でシェルを開く
docker compose exec web bash

# ログ確認
docker compose logs -f web

# gem 追加後の反映
docker compose exec web bundle install

# OpenAPI 仕様書の構文チェック
npx @redocly/cli lint docs/openapi.yaml
```

</details>

## Architecture

MPA 版 + JSON API + LIFF 版の併存構成です。全体像は [`docs/architecture.md`](docs/architecture.md) を参照してください。

```
mahjong_score/
├── app/
│   ├── controllers/            # MPA 版コントローラー + api/v1（JSON API）
│   ├── javascript/             # Stimulus コントローラー等
│   ├── models/                 # Game / Player / Round / Score
│   └── views/                  # ERB テンプレート
├── config/
│   ├── database.yml            # DB 設定
│   └── routes.rb               # ルーティング
├── db/
│   ├── migrate/                # マイグレーションファイル
│   └── schema.rb               # スキーマ定義
├── docs/
│   ├── architecture.md         # アーキテクチャ構成図（Mermaid）
│   └── openapi.yaml            # API 仕様書（OpenAPI 3.0）
├── e2e/                        # E2E テスト（Playwright）
├── frontend/                   # LIFF 版（Next.js）
├── infra/                      # CloudFormation テンプレート等
├── spec/                       # RSpec（モデル・リクエスト）
├── docker-compose.yml          # 開発環境の Docker Compose 設定
└── Gemfile                     # gem 定義
```

### Hotwire（Turbo + Stimulus）

- **importmap-rails** — JS モジュールの配信（バンドラー不要）
- **Turbo** — ページ遷移の高速化（Turbo Drive）
- **Stimulus** — HTML 属性ベースの軽量 JS フレームワーク

<details>
<summary><b>Stimulus コントローラーの使い方</b></summary>

`bin/rails generate stimulus controller_name` で `app/javascript/controllers/` にファイルが生成されます。

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

```
app/javascript/
├── application.js                 # エントリーポイント（Turbo + Stimulus を読み込み）
└── controllers/
    ├── application.js             # Stimulus アプリケーション設定
    ├── index.js                   # コントローラーの自動読み込み
    └── hello_controller.js        # サンプルコントローラー
config/
└── importmap.rb                   # JS モジュールのピン定義
```

</details>

## Testing & CI

| レイヤー | ツール | 役割 |
|---|---|---|
| 単体・リクエスト | RSpec + FactoryBot | サーバー側の品質保証（モデル・コントローラー） |
| E2E | Playwright | ブラウザ側の品質保証（JS 動作・ユーザー操作フロー） |
| 探索的テスト | Claude in Chrome | ビジュアル確認・仕様の抜け漏れ発見（ベータ） |

`main` ブランチへの push / PR で GitHub Actions により **RSpec** と **Playwright E2E** が自動実行されます。

> **Note**: E2E テストが失敗した場合、スクリーンショットと動画が Artifacts として保存されます。GitHub の Actions タブ → 該当ワークフロー → `playwright-report` から確認できます。

## Production（AWS）

- EC2（t2.micro）+ RDS（PostgreSQL 16）
- CloudFormation でインフラをコード化（`infra/cloudformation.yml`）
- Docker Compose で Rails アプリを起動

### デプロイ手順

1. EC2 に SSH 接続する
2. アプリを更新する（`git pull`）
3. コンテナを再起動する（`docker-compose up -d`）
4. 本番環境で動作確認する

<details>
<summary><b>systemd サービスの設定（初回のみ）</b></summary>

EC2 再起動時にアプリが自動起動するよう設定する:

```bash
sudo cp infra/mahjong-score.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable mahjong-score
```

※ CloudFormation で新規構築した場合は UserData で自動設定済み

</details>

## Troubleshooting

<details>
<summary><b><code>localhost:3000</code> にアクセスできない</b></summary>

```bash
# コンテナが起動しているか確認
docker compose ps

# ログを確認
docker compose logs web
```

</details>

<details>
<summary><b>DB 接続エラー</b></summary>

```bash
# DB コンテナが起動しているか確認
docker compose ps

# DB を再作成（データは消える）
docker compose exec web bin/rails db:drop db:create db:migrate
```

</details>

<details>
<summary><b>gem のインストールエラー</b></summary>

```bash
# コンテナを再ビルド
docker compose down
docker compose up --build
```

</details>

## Development

Issue 駆動 + TDD（テスト駆動開発）で進めます。

1. イシューを作成する
2. ブランチを切る（`feature/` `fix/` `chore/`）
3. テストを書く（TDD: Red → Green → Refactor）
4. 実装する
5. 動作確認する
6. PR を作成する（ベースブランチは `main`）
7. マージする
8. イシューを Close する

コード変更前に `.claude/dependencies.md` を確認し、影響を受けるテストを把握してから作業します（TDAD）。「気をつける」ではなく「気をつけなくても壊れない仕組み」で品質を守ります。

> **Note**: `chore/initial-setup` ブランチは Rails + Docker + PostgreSQL の初期構成保存用です（以後更新しない）。

---

関連ドキュメント: [価値提案（なぜ作ったか）](docs/value-proposition.md) · [アーキテクチャ構成図](docs/architecture.md) · [API 仕様書（OpenAPI）](docs/openapi.yaml) · [LIFF 版 frontend](frontend/README.md) · [CLAUDE.md](CLAUDE.md)
