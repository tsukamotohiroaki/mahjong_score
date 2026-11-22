# コマンドリファレンス

AI を介さず自分で環境を動かすためのコマンド集。**すべて実際に実行して確認したもの**（2026-08-30）。

## 起動・停止

| 対象 | 起動 | 停止 |
|---|---|---|
| Rails + PostgreSQL | `docker compose up -d` | `docker compose down` |
| LIFF 版（Next.js） | `cd frontend && npm run dev` | Ctrl+C |

LINE から使う日は「リアル麻雀で使う日の起動」の手順で ngrok も動かす。

### 疎通確認

`200` が返れば起動している。**MPA と LIFF は別々に実行する**（`;` でつなぐと接続失敗時にコマンド全体が止まる）。

```bash
curl -s -o /dev/null -w "%{http_code}\n" --max-time 10 http://localhost:3000/up
curl -s -o /dev/null -w "%{http_code}\n" --max-time 10 http://localhost:3001/games/new
```

## リアル麻雀で使う日の起動（家の Mac + ngrok）

対局の日だけ、家の Mac で次の4つを動かす。**1つでも止まると LINE から使えない**（2026-11-16 に停止時の症状まで確認）。

```
スマホの LINE → ngrok（外部への中継）→ LIFF 版（Next.js）→ Rails → PostgreSQL
```

### 起動する

コマンドは3つ、動くものは4つ。2 と 3 は別々のターミナルで実行し、閉じずに残す。

| 順 | コマンド | 動くもの | 停止 |
|---|---|---|---|
| 1 | `docker compose up -d` | Rails + PostgreSQL | `docker compose down` |
| 2 | `cd frontend && npm run dev` | LIFF 版 | Ctrl+C |
| 3 | `caffeinate -s ngrok http 3001` | ngrok（スリープ防止つき） | Ctrl+C |

- `caffeinate -s` は ngrok が動いている間だけ Mac 本体のスリープを止める。止めれば普段の省電力に戻る
- 公開 URL は固定: `https://zippy-comrade-goal.ngrok-free.dev`
- ローカルの DB が本番データを兼ねる。`db:reset` などで消すと戻せない（RSpec はテスト用 DB なので影響しない）
- `docker compose up -d` が `Cannot connect to the Docker daemon` で失敗したら、Docker Desktop を起動してからやり直す

### 出かける前に確認する

外出先からは直せないため、家を出る前に3点を確かめる。

- 電源アダプタをつないでいる（`caffeinate -s` は電源接続時だけ効く）
- ふたを開けたままにしている（閉じるとスリープする）
- スマホの Wi-Fi を切り、LINE のリッチメニューから画面が開く

### 開けないときに止まっているものを見分ける

| スマホに出る症状 | 止まっているもの |
|---|---|
| `ERR_NGROK_3200`（offline）の画面が出る | ngrok、または Mac 本体（スリープ・電源断） |
| `ERR_NGROK_8012` の画面が出る | LIFF 版 |
| 画面は開くが、対局の作成・保存・表示で失敗する | Rails か PostgreSQL |

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

順序は固定。**`APP_VERSION` の更新はタグ作成前**に行う（後だとタグと画面のバージョン番号が食い違う）。

1. `config/initializers/version.rb` の `APP_VERSION` を feature/chore ブランチで更新し、PR を main にマージする（main への直接コミットは禁止）
2. ローカルの main を更新する（`git pull`）。マイグレーションを含むときは `docker compose exec web bin/rails db:migrate` も実行する
3. 次に「リアル麻雀で使う日の起動」で起動したとき、LINE から動作確認する（応答速度は `/response-time`、実機は [`docs/manual-test-checklist.md`](manual-test-checklist.md)）
4. `gh release create vX.Y.Z --notes-file <ファイル>` でタグを作成する

## 関連

- 症状から原因を探すとき → [`docs/debugging-guide.md`](debugging-guide.md)
- 開発でよく使うコマンド（マイグレーション・コンソール等） → [`CLAUDE.md`](../CLAUDE.md)
