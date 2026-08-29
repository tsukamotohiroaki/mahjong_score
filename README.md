# 楽雀（らくじゃん）

<p>
  <a href="https://github.com/tsukamotohiroaki/mahjong_score/actions/workflows/ci.yml">
    <img src="https://github.com/tsukamotohiroaki/mahjong_score/actions/workflows/ci.yml/badge.svg" alt="CI" vspace="10">
  </a>
  <img src="https://img.shields.io/badge/version-v0.2.3-blue" alt="Version" vspace="10">
  <img src="https://img.shields.io/badge/Ruby-3.3-CC342D?logo=ruby&logoColor=white" alt="Ruby 3.3" vspace="10">
  <img src="https://img.shields.io/badge/Rails-7.1-D30001?logo=rubyonrails&logoColor=white" alt="Rails 7.1" vspace="10">
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL 16" vspace="10">
  <img src="https://img.shields.io/badge/Hotwire-Turbo%20%2B%20Stimulus-FFE801?logo=hotwire&logoColor=black" alt="Hotwire" vspace="10">
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" alt="Docker Compose" vspace="10">
</p>

麻雀の半荘結果を記録し、順位点まで自動計算するシンプルなスコア管理アプリ 🀄

> 面倒で間違えやすい計算作業を自動化して、人が本来やりたいこと（対局を楽しむ・ルールを学ぶ）に集中できるようにする——このアプリが解決する課題は [`docs/value-proposition.md`](docs/value-proposition.md) にまとめています。

## デモ

メンバー入力からゲーム開始、点数入力（リアルタイム合計）、順位点の自動計算までの流れです。

<img src="docs/images/demo.gif" alt="デモ: メンバー入力 → 点数入力 → 順位点の自動計算" width="300">

## LINE で試す

LINE 公式アカウントを友だち追加すると、リッチメニューから LIFF 版アプリをすぐに試せます。

<img src="docs/images/line-add-friend-qr.png" alt="LINE友だち追加QRコード" width="240">

1. QR コード（または [友だち追加リンク](https://line.me/R/ti/p/@165fpsbq)）から「楽雀」を友だち追加する
2. トーク画面下部のリッチメニューから楽雀を開く
3. LIFF 版アプリが起動し、そのままゲームを作成できる

> **Note**: デモ環境（AWS EC2）はコスト節約のため停止していることがあります。動かない場合はイシューでお知らせください。

## セットアップ

Docker Desktop（または Docker Engine + Docker Compose）があれば動きます。

```bash
git clone <repository-url> && cd mahjong_score
docker compose up                                        # 初回は gem のインストールが自動で走ります
docker compose exec web bin/rails db:create db:migrate   # 初回のみ、別ターミナルで
```

http://localhost:3000 にアクセスする 🎉

## アーキテクチャ

MPA 版（Rails + ERB + Hotwire）・JSON API・LIFF 版（Next.js）の併存構成です。MPA で MVP を最短リリースした後に LIFF 版を追加し、現在は両者を正式なクライアントとして維持しています（[ADR-0001](docs/adr/0001-mpa-版を残す.md)）。全体像は [`docs/architecture.md`](docs/architecture.md) を参照してください。

本番環境（AWS）:

- EC2（t2.micro）+ RDS（PostgreSQL 16）
- CloudFormation でインフラをコード化（[`infra/cloudformation.yml`](infra/cloudformation.yml)）
- Docker Compose で Rails アプリを起動

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

## テストと CI

| レイヤー | ツール | 役割 |
|---|---|---|
| 単体・リクエスト | RSpec + FactoryBot | サーバー側の品質保証（モデル・コントローラー） |
| フロントエンド単体 | Vitest + Testing Library | LIFF 版（Next.js）のコンポーネント・API クライアント |
| E2E | Playwright | ブラウザ側の品質保証（JS 動作・ユーザー操作フロー） |
| 探索的テスト | Claude in Chrome | ビジュアル確認・仕様の抜け漏れ発見（ベータ） |

`main` ブランチへの push / PR で GitHub Actions により **RSpec**・**Vitest**・**Playwright E2E** が自動実行されます。

### テスト設計（テスト技法との対応）

テストケースは場当たりではなく、テスト技法（JSTQB）で設計しています。技法は「テストケースの導き方」、ツールは「実行のしかた」——この2軸を分けた上で、各技法をこのアプリの実例に対応させています。

<table>
  <thead>
    <tr><th>分類</th><th>テスト技法</th><th>このアプリでの実例</th><th>実行レイヤー</th></tr>
  </thead>
  <tbody>
    <tr>
      <td rowspan="4">ブラックボックステスト技法</td>
      <td>同値分割法（EP）</td>
      <td>点数入力の値クラス: 整数 / 整数以外 / 未入力（<a href="app/forms/round_score_form.rb"><code>RoundScoreForm</code></a> の正規化）</td>
      <td>RSpec</td>
    </tr>
    <tr>
      <td>境界値分析（BVA）</td>
      <td>点数の上下限 −1000 / +1000（百点棒単位）、合計 1000 ちょうど、持ち点 &gt; 0</td>
      <td>RSpec</td>
    </tr>
    <tr>
      <td>デシジョンテーブルテスト</td>
      <td>順位点のゼロサム検証: 持ち点 × 返し点 × 順位点4つの組み合わせ（<a href="app/models/game.rb"><code>Game#rank_bonuses_must_be_zero_sum</code></a>）</td>
      <td>RSpec</td>
    </tr>
    <tr>
      <td>状態遷移テスト</td>
      <td>ユーザーフロー: メンバー入力 → ゲーム開始 → 点数入力 → 結果表示</td>
      <td>Playwright</td>
    </tr>
    <tr>
      <td rowspan="2">ホワイトボックステスト技法</td>
      <td>ステートメントテスト</td>
      <td>順位点計算 <a href="app/models/game.rb"><code>Game#calculate_ranking_scores</code></a> の各行を通すケース</td>
      <td>RSpec ※網羅率は未計測（カバレッジ計測の導入はバックログ）</td>
    </tr>
    <tr>
      <td>ブランチテスト</td>
      <td>同点時の分岐: 同順位の引き継ぎ・ボーナス均等分配の有無</td>
      <td>RSpec ※同上</td>
    </tr>
    <tr>
      <td rowspan="3">経験ベースのテスト技法</td>
      <td>エラー推測</td>
      <td>事故りやすい入力: 全員同点・マイナス点・合計不一致・プレイヤー名重複</td>
      <td>RSpec</td>
    </tr>
    <tr>
      <td>探索的テスト</td>
      <td>画面を自由に操作して仕様の抜け漏れ・見た目の崩れを発見</td>
      <td>人間 + Claude in Chrome（補助）</td>
    </tr>
    <tr>
      <td>チェックリストベースドテスト</td>
      <td>LINE 実機でしか確認できない項目の消し込み（<a href="docs/manual-test-checklist.md"><code>docs/manual-test-checklist.md</code></a>）</td>
      <td>人間（実機）</td>
    </tr>
  </tbody>
</table>

どこに厚くテストを張り、どこを浅くしたかの判断は [`docs/test-strategy.md`](docs/test-strategy.md) に言語化しています。

> **Note**: E2E テストが失敗した場合、スクリーンショットと動画が Artifacts として保存されます。GitHub の Actions タブ → 該当ワークフロー → `playwright-report` から確認できます。

## 開発の進め方

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
