# §4〜5・§15（本ファイルは SKILL.md の分冊。ID・モード・報告の定義は SKILL.md が正）

## 4. 事前準備

### 4-1. Rails（MPA 版 / API）

まず疎通を確認する。**`docker compose ps` の `Up` は判定に使わない**（後述の PID 残留時も `Up` と表示される）。

```bash
curl -s -o /dev/null -w "%{http_code}\n" --max-time 5 http://localhost:3000/up
```

`200` なら起動済み。それ以外なら `docker compose up -d` してから 10 秒ほど待って再確認する。

> **MPA と LIFF の疎通確認を1コマンドにまとめない。** `curl` は接続できないと終了コード `7` を返すため、`;` でつなぐとコマンド全体が失敗扱いになり、手順が止まる。**必ず別々に実行する。**

#### ハマりどころ: `A server is already running`

コンテナを強制終了するとホスト側に `tmp/pids/server.pid` が残る。この状態で `docker compose up` すると Puma が即座に終了し、**コンテナは `Up` のままアクセスできなくなる**。

```bash
docker compose logs web --tail 20 | grep -i "already running"
```

引っかかったら、残った PID ファイルは古い実行の残骸なので削除してよい。

```bash
rm -f tmp/pids/server.pid && docker compose restart web
```

**削除したことは §13 の「実行した副作用」に必ず書く。**

初回のみ `ActiveRecord::NoDatabaseError` が出たら `docker compose exec web bin/rails db:create db:migrate`。

### 4-2. Next.js（LIFF 版）

`docker-compose.yml` に frontend サービスは**無い**。ホストで起動する。

```bash
curl -s -o /dev/null -w "%{http_code}\n" --max-time 5 http://localhost:3001/games/new
```

`200` なら起動済み。`000`（接続不可）なら Bash をバックグラウンドにして起動する。

```bash
cd frontend && npm run dev
```

`next dev -p 3001` で立つ。起動まで 5〜15 秒かかるので、`200` になるまで `curl` を繰り返す。

- `frontend/.env.local` の `NEXT_PUBLIC_LIFF_ID` が未設定でも本スキルは通る。困るのは `/` だけで、`/` は §1 のとおり対象外
- **Rails を落としたまま LIFF 版だけ見ると全画面がエラーになる**（`next.config.ts` の rewrites が `/api/*` を Rails:3000 へプロキシしているため）。LIFF 版でエラーが出たら、まず 4-1 の `/up` に戻る

## 5. テストデータの用意

B3・B4・B5・C3 で使う。12局を手入力するのは現実的でないので `rails runner` で作る。

```bash
docker compose exec -T web bin/rails runner '
rule = { mochi_ten: 25000, kaeshi_ten: 30000, rank_1_bonus: 50, rank_2_bonus: 10, rank_3_bonus: -10, rank_4_bonus: -30 }
fill = lambda do |game, points|
  ps = game.players.order(:created_at).to_a
  (1..12).each do |n|
    r = game.rounds.create!(round_number: n)
    ps.each_with_index { |p, i| r.scores.create!(player: p, point: points[i]) }
  end
end
full = Game.create_with_players!(rule, %w[東 南 西 北])
fill.call(full, [40000, 30000, 20000, 10000])
long = Game.create_with_players!(rule, ["ながいなまえのプレイヤーA", "テストユーザー山田太郎", "C", "D"])
fill.call(long, [99900, 100, 0, 0])
puts "G_FULL=#{full.id} G_LONG=#{long.id}"
'
```

| データ | 用途 | 表示されるはずの合計 |
|---|---|---|
| `G_FULL` | B3（12局すべて埋めた表）・C3 | 720.0 / 120.0 / -240.0 / -600.0 |
| `G_LONG` | B4（長い名前）・B5（4桁・マイナス）・E1（同点の見せ方） | 1438.8 / -238.8 / -600.0 / -600.0 |
| `G_BASE` | A2 で**画面から作る**（作成リクエストの確認を兼ねる） | — |

`G_LONG` は3位と4位が同点（どちらも素点 0）になるよう仕込んである。**同点時のウマ分配の見せ方が副産物で確認できる**。各局の素点合計は 100000 なのでゼロサムは崩れない。

**単位に注意**: 画面と API のやりとりは**百点棒単位**（`250` = 25,000点）。DB の `scores.point` には Rails が 100 倍して**実点数**（`25000`）で保存する。上のコマンドは DB に直接書くので実点数で書いている。

## 15. テストデータの後始末

ローカル DB にゲームが残る。**自動で削除しない**（開発 DB なので残っても害がなく、削除は不可逆）。作成した game の id を §13 に記録するだけにする。

まとめて消したい場合はユーザーが判断する。

```bash
docker compose exec web bin/rails db:reset
```
