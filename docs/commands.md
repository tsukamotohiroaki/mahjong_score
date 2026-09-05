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

本番も同じ形で確認する（EC2 起動後、デプロイ後の反映確認）。

```bash
curl -s -o /dev/null -w "%{http_code}\n" --max-time 10 https://doc9xlvbx6gap.cloudfront.net/   # MPA 版
curl -s -o /dev/null -w "%{http_code}\n" --max-time 10 https://dxop25dcw25sl.cloudfront.net/   # LIFF 版
```

## テスト実行

| 対象 | コマンド | 実行場所 |
|---|---|---|
| RSpec | `docker compose exec web bundle exec rspec` | リポジトリ直下 |
| Vitest | `npm test` | `frontend/` |
| Playwright（MPA + LIFF） | `npx playwright test` | リポジトリ直下 |
| Playwright（片方だけ） | `npx playwright test --project mpa`／`--project liff` | リポジトリ直下 |
| Playwright（ファイルと版を絞る。ファイル名は `--project` より前に書く） | `npx playwright test <home / new_game / score_input> --project <mpa / liff>`（例: `npx playwright test score_input --project liff`） | リポジトリ直下 |
| Playwright の確認項目一覧（テスト名 = 仕様。サーバー不要） | `npx playwright test --list` | リポジトリ直下 |

Playwright は Rails（`:3000`）と Next.js（`:3001`）が起動している必要がある。`home` は MPA 版のみのため `--project liff` では 0 件になる。

## リリース

順序は固定。**`APP_VERSION` の更新はデプロイ前**に行う（後だと本番に旧バージョン番号のコードが載ったままになる）。

1. `config/initializers/version.rb` の `APP_VERSION` を feature/chore ブランチで更新し、PR を main にマージする（main への直接コミットは禁止）
2. ローカルの main を更新する（`git pull`）
3. EC2 にデプロイする（下記）
4. 本番の反映を確認する（「起動できたかの確認」の本番 curl で `200`）
5. `gh release create vX.Y.Z --notes-file <ファイル>` でタグを作成する
6. リリース後に確認する: 応答速度（`/response-time production`）と実機（[`docs/manual-test-checklist.md`](manual-test-checklist.md)）

### デプロイ

EC2 が停止していれば先に起動する（「起動・停止」参照）。

```bash
ssh -i ~/.ssh/mahjong-score-key.pem ec2-user@3.114.238.160
```

以下は EC2 に接続してから実行する。アプリのパスは `/home/ec2-user/mahjong_score`、**本番は `docker-compose`（ハイフン付き）**。

```bash
cd /home/ec2-user/mahjong_score
git pull

# Rails 更新。gem は永続化していないため EC2 起動後は bundle install が必須
# コード変更の反映には再起動が必須（eager load 済みのため git pull だけでは反映されない）
docker-compose exec -T web bundle install
docker-compose exec -T -e RAILS_ENV=production web bin/rails assets:precompile
docker-compose restart web

# LIFF 版更新（frontend/ を変更したときのみ）
docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env \
  run --rm --no-deps frontend bash -c "npm ci && npm run build"
docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env \
  restart frontend
```

- `--no-deps` を付けないと不要なイメージ取得が走り、ディスク不足でビルドが失敗する
- `up -d frontend` では新しいビルドが反映されない（設定が変わらないとコンテナが再作成されない）。`restart frontend` を使う

## 本番の操作

EC2 に接続してから実行する（接続は「デプロイ」参照）。

```bash
docker-compose ps                    # コンテナの状態
docker-compose logs web --tail 100   # Rails のログ
docker-compose restart web           # Rails を再起動（コード変更の反映に必須）
```

## 関連

- 症状から原因を探すとき → [`docs/debugging-guide.md`](debugging-guide.md)
- 開発でよく使うコマンド（マイグレーション・コンソール等） → [`CLAUDE.md`](../CLAUDE.md)
