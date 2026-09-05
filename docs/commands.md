# コマンドリファレンス

AI を介さず自分で環境を動かすためのコマンド集。**すべて実際に実行して確認したもの**（2026-08-30）。

## 起動・停止

| 対象 | 起動 | 停止 |
|---|---|---|
| Rails + PostgreSQL | `docker compose up -d` | `docker compose down` |
| LIFF 版（Next.js） | `cd frontend && npm run dev` | Ctrl+C |
| 本番（EC2） | `aws ec2 start-instances --instance-ids i-061932ee89db4e727` | `aws ec2 stop-instances --instance-ids i-061932ee89db4e727` |
| 実機確認用のトンネル | `ngrok http 3001` | Ctrl+C |

- **EC2 は使わないとき停止する**（コスト優先の運用）。起動から全サービス復帰まで約2分
- EC2 の状態確認: `aws ec2 describe-instances --instance-ids i-061932ee89db4e727 --query 'Reservations[0].Instances[0].State.Name' --output text`

### 起動できたかの確認

`200` が返れば起動している。**MPA と LIFF は別々に実行する**（`;` でつなぐと接続失敗時にコマンド全体が止まる）。

```bash
curl -s -o /dev/null -w "%{http_code}\n" --max-time 10 http://localhost:3000/up
curl -s -o /dev/null -w "%{http_code}\n" --max-time 10 http://localhost:3001/games/new
```

本番は `https://doc9xlvbx6gap.cloudfront.net`（MPA 版）／ `https://dxop25dcw25sl.cloudfront.net`（LIFF 版）。

## テスト実行

| 対象 | コマンド | 実行場所 |
|---|---|---|
| RSpec | `docker compose exec web bundle exec rspec` | リポジトリ直下 |
| Vitest | `npm test` | `frontend/` |
| Playwright（MPA + LIFF） | `npx playwright test` | リポジトリ直下 |
| Playwright（片方だけ） | `npx playwright test --project mpa`／`--project liff` | リポジトリ直下 |
| Playwright（片方の1ファイルだけ。ファイル名は `--project` より前に書く） | `npx playwright test score_input --project liff` | リポジトリ直下 |
| Playwright の確認項目一覧（テスト名 = 仕様。サーバー不要） | `npx playwright test --list` | リポジトリ直下 |

Playwright は Rails（`:3000`）と Next.js（`:3001`）が起動している必要がある。

## 本番の操作

```bash
# SSH 接続
ssh -i ~/.ssh/mahjong-score-key.pem ec2-user@3.114.238.160
```

以下は EC2 に接続してから実行する。アプリのパスは `/home/ec2-user/mahjong_score`、**本番は `docker-compose`（ハイフン付き）**。

```bash
cd /home/ec2-user/mahjong_score

git pull                        # 最新コードを取得
docker-compose restart web      # Rails を再起動（設定変更を反映するとき必須）
docker-compose ps               # コンテナの状態
docker-compose logs web --tail 100   # Rails のログ
```

frontend（LIFF 版）を更新したときのみ、ビルドが必要。

```bash
docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env \
  run --rm --no-deps frontend bash -c "npm ci && npm run build"
docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env \
  restart frontend
```

`--no-deps` を付けないと不要なイメージ取得が走り、ディスク不足でビルドが失敗する。

## 関連

- 症状から原因を探すとき → [`docs/debugging-guide.md`](debugging-guide.md)
- 開発でよく使うコマンド（マイグレーション・コンソール等） → [`CLAUDE.md`](../CLAUDE.md)
