# デバッグガイド（症状起点のログ逆引き）

開発・調査（デバッグ）の初動を速くするためのガイド。
「どういう症状のときに、どこのログを最初に見るか」を症状起点で逆引きできるようにする。

> **陳腐化対策（更新ルール）**: ログの出力先・サービス名・CI 設定・インフラ構成を変更するプルリクエストでは、本ファイルの該当箇所も併せて更新すること。

## 逆引き表

| 症状 | 最初に見る場所 | コマンド / 場所 |
|---|---|---|
| ローカルで 500 エラー | Rails のログ | `docker compose logs web -f` / `log/development.log` |
| テスト（RSpec）が落ちる | RSpec の失敗出力 | RSpec 出力 → `log/test.log` |
| E2E（Playwright）が落ちる | 失敗時のスクリーンショット・動画 | `test-results/` / HTML レポート |
| LIFF 版で画面異常 | ブラウザの開発者ツール | Console / Network タブ → Next.js dev サーバー出力 |
| CI（GitHub Actions）が赤い | 失敗したステップのログ | `gh run view --log-failed` |
| 本番だけおかしい | EC2 上のコンテナログ | EC2 に SSH → `docker-compose logs web` / `docker-compose logs frontend` |
| デプロイ・スタック更新が失敗 | CloudFormation スタックイベント | AWS コンソール または AWS CLI |

## 詳細

### ローカルで 500 エラー（画面が壊れる・エラー画面が出る）

```bash
# コンテナのログを追いかける（例外のバックトレースが出る）
docker compose logs web -f
```

```bash
# ファイルでも同じ内容を確認できる（ボリュームマウントされているためホスト側から読める）
tail -100 log/development.log
```

データベース起因が疑わしいとき（接続エラー・起動失敗）:

```bash
docker compose ps
docker compose logs db
```

### テスト（RSpec）が落ちる

1. まず RSpec の失敗出力（失敗メッセージ・バックトレース）を読む
2. コントローラー・モデルの挙動を追いたいときは `log/test.log` を見る

```bash
# テスト実行（CLAUDE.md 記載の標準コマンド）
docker compose run --rm -e RAILS_ENV=test web bash -lc "bundle install && bundle exec rspec"
```

```bash
# 直近のテスト実行時の Rails ログ
tail -200 log/test.log
```

### E2E（Playwright）が落ちる

失敗時のみスクリーンショットと動画が保存される（`playwright.config.ts` の設定）。

```bash
# ローカルで E2E を実行する（e2e プロファイル）
docker compose --profile e2e run --rm playwright
```

- 失敗時の証跡: `test-results/` 配下（スクリーンショット・動画）
- HTML レポート: `npx playwright show-report`
- CI で落ちた場合: GitHub の Actions タブ → 該当ワークフロー → Artifacts の `playwright-report`（保持期間 7 日）

### LIFF 版（Next.js）で画面異常

1. ブラウザの開発者ツールを開く
   - **Console タブ**: JavaScript のエラー・LIFF（LINE Front-end Framework）初期化エラー
   - **Network タブ**: API リクエストの失敗（ステータスコード・レスポンス内容）
2. サーバー側の出力を見る

```bash
# 開発時: dev サーバーを起動したターミナルの出力を確認する
cd frontend && npm run dev
```

本番（EC2 上）の場合は次項「本番だけおかしい」の `frontend` コンテナのログを見る。

### CI（GitHub Actions）が赤い

```bash
# 失敗したステップのログだけを表示する
gh run view --log-failed
```

```bash
# プルリクエストに紐づくチェックの状態を監視する
gh pr checks --watch
```

- RSpec 失敗 → ログ内の失敗メッセージを読む（ローカル再現は上記「テスト（RSpec）が落ちる」）
- E2E 失敗 → Artifacts の `playwright-report` をダウンロードしてスクリーンショット・動画を確認する

### 本番だけおかしい（ローカルでは再現しない）

```bash
# EC2 に SSH 接続してから実行する
docker-compose -f docker-compose.yml -f docker-compose.production.yml ps
docker-compose -f docker-compose.yml -f docker-compose.production.yml logs web
docker-compose -f docker-compose.yml -f docker-compose.production.yml logs frontend
```

- Rails のログは CloudWatch Logs にも送られている: ロググループ `/mahjong-score/rails/production`（EC2 に入らなくても AWS コンソールから確認できる）
- アプリが起動していないとき: `systemctl status mahjong-score` / `journalctl -u mahjong-score`
- EC2 初期構築（UserData）の失敗調査: `/var/log/user-data.log`
- データベースが疑わしいとき: RDS のログ（スロークエリ・エラー）が CloudWatch Logs に出力されている

### デプロイ・スタック更新が失敗する

- AWS コンソール → CloudFormation → 対象スタック → 「イベント」タブで、`CREATE_FAILED` / `UPDATE_FAILED` の行の理由（Status reason）を読む

```bash
# AWS CLI の場合（<スタック名> は置き換える）
aws cloudformation describe-stack-events --stack-name <スタック名> \
  --query "StackEvents[?contains(ResourceStatus, 'FAILED')].[LogicalResourceId, ResourceStatusReason]" \
  --output table
```

## 関連ドキュメント

- `docs/infrastructure.md` — 本番環境（AWS）の構成と監視の考え方
- `docs/test-strategy.md` — テスト戦略（RSpec / Playwright / Claude in Chrome の役割分担）
- `README.md` — デプロイ手順・トラブルシューティング
