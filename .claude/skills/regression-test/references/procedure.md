# 手順書（§0・§4〜11・§15。実行順に上から読む。ID・モード・報告の定義は SKILL.md が正）

## 0. 使う道具と、使えなかったときの扱い

道具は2系統ある。**用途で使い分ける**（2026-08-23 の通し実行で確認した挙動）。

| 系統 | 使いどころ | 注意 |
|---|---|---|
| `mcp__Claude_Browser__*`（アプリ内ブラウザ） | **B の 375px 計測はこちらでしか成立しない。** `resize_window` に `preset: "mobile"` があり、実際にビューポートが 375×812 になる | `computer` のクリックはペインが表示されていないと 30 秒でタイムアウトする。`javascript_tool` はトップレベル `await` が使えない |
| `mcp__claude-in-chrome__*`（実物の Chrome） | ログイン済みセッションが要るとき | **`resize_window` は「成功」を返すのにビューポートが変わらない**（`window.outerWidth` が 0 になる）。B の計測には使えない |

**どちらを使っても、リサイズ後は必ず `window.innerWidth` を実測して 375 になっているか確認する。** ツールの戻り値を信用しない。

**道具が使えずに項目を実行できなかったら、その項目を §13 の「確認できていないこと」に落として先へ進む。** 許可を求めて手順を止めない。ツール名の相違が原因なら、報告に「どの名前で試して失敗したか」を書く。

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

## 6. シナリオ A: コンソール・ネットワーク

### 共通ループ（対象 URL ごとに回す）

1. `resize_window`（`preset: "mobile"`）→ `window.innerWidth` が `375` か実測して確認
2. `navigate`
3. LIFF 版は fetch の完了を待つ（`computer` の `wait` を 2 秒）
4. `read_console_messages` → §12 の既知ノイズ表に無いものだけ記録
5. `read_network_requests` → URL・メソッド・ステータス・件数を記録

### A1: コンソールエラー（両版・6画面）

| 版 | URL |
|---|---|
| MPA | `http://localhost:3000/games/new` ／ `/games/{G_FULL}` ／ `/games/{G_FULL}/rounds/new?round_number=1` |
| LIFF | `http://localhost:3001/games/new` ／ `/games/{G_FULL}` ／ `/games/{G_FULL}/rounds/new?round_number=1` |

判定: **error が0件なら合格。** warning は §12 の既知ノイズ表に無ければ全部報告する。

### A2: ゲーム作成（LIFF）

1. `http://localhost:3001/games/new` を開く
2. `read_page` で ref を取り、`form_input` で4人分の名前を入れる（`東 / 南 / 西 / 北`）
3. 「ゲーム開始」をクリック
4. `read_network_requests`（`urlPattern: "api/v1/games"`）
5. 遷移後の URL から `G_BASE` の ID を控える
6. **→ §11 の突合1 を実行**

判定: `POST /api/v1/games` が**1件**・201。`requestId` でボディを取り、`players` が4件・入力順どおり、ルール値が画面の入力と一致している。

### A2': 点数送信（単位の確認）

`/games/{G_BASE}/rounds/new?round_number=1` で `400 / 300 / 200 / 100` を入力して「入力完了」。

判定: `POST /api/v1/games/{id}/rounds` が 201。ボディが `{"round_number":1,"scores":[{"player_id":..,"point":400},...]}`。

> **`point` は百点棒単位（`400`）。`40000` のような実点数が飛んでいたらバグ。** 100 倍は Rails 側（`app/controllers/api/v1/rounds_controller.rb`）の仕事。

**→ §11 の突合2 を実行**

### A2'': 既存の局を上書き修正（このスキルの本丸）

1. **→ §11 の突合3「修正前」を先に取る**
2. `/games/{G_BASE}/rounds/new?round_number=1` を開き、値を `350 / 250 / 250 / 150` に打ち直して送信
3. **→ §11 の突合3「修正後」**

判定: リクエストボディに **`round_number: 1` が入っていること**。未指定だと上書きではなく新しい局が増えるが、**画面には修正後の値が正しく出るため目視では気づけない**。

### A3: OpenAPI との照合（LIFF）

`GET /api/v1/games/{id}` のレスポンスボディを `requestId` で取り、[`docs/openapi.yaml`](../../../../docs/openapi.yaml) の `GameDetail` とキーを突き合わせる。

> A3 は「担保」ではなく**照合**。画面から呼ばれない API は検証できない。**`GET /api/v1/games`（ゲーム一覧）はどの画面からも呼ばれていない**ので、この手段では永久に検証できない。§13 の「確認できていないこと」に毎回載せる。

### A4: 重複リクエスト（LIFF）

`http://localhost:3001/games/{G_BASE}` を開いて `read_network_requests`。

判定: `GET /api/v1/games/{id}` が**ちょうど1件**。

> **落とし穴**: Next.js の dev サーバーは React Strict Mode が既定で有効なため、effect が2回走って2件になることがある。**2件だったら即不合格にせず**、`cd frontend && npm run build && npm start` で本番ビルドを立てて測り直して切り分ける（時間がかかるので疑わしいときだけ）。

### A5: エラー時のステータスとボディ（LIFF）

**UI からは 422 に到達できない。** LIFF は `handleSubmit` が `if (!isValid) return`、MPA は `score_input_controller.js` が `submitButton.disabled = !isValid` で、クライアント側の検証が `RoundScoreForm` の拒否条件を完全に覆っているため。これは仕様どおりの二重防御。

実通信としての 422 は `javascript_tool` で確認する。**Vitest は API を全モックしていて実 HTTP 通信を一度も見ていないので、ここが唯一の実測点になる。**

**トップレベル `await` は使えない**（アプリ内ブラウザの `javascript_tool` は `SyntaxError` になる）。`.then()` で書く。

```js
fetch('/api/v1/games/{G_BASE}/rounds', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ round_number: 9, scores: [
    { player_id: P1, point: 400 }, { player_id: P2, point: 400 },
    { player_id: P3, point: 400 }, { player_id: P4, point: 400 }
  ] })
}).then(r => r.json().then(b => ({ status: r.status, body: b })))
```

判定: `422`、ボディが `{"errors":["点数の合計が 1000 になりません"]}`。続けて**§11 の突合で `rounds` が増えていないこと**（422 でロールバックされているか）を確認する。

「サーバー側の 422 表示経路が画面から到達不能」という事実自体は E1 に所見として残す。

### A6: 存在しない ID（両版）

| 版 | URL | 期待 |
|---|---|---|
| MPA | `http://localhost:3000/games/99999` | 開発環境は `consider_all_requests_local = true` のため **Rails の例外ページ**が出る（ステータスは 404）。本番は `public/404.html`。**開発と本番で見えるものが違う**点に注意 |
| LIFF | `http://localhost:3001/games/99999` | `GET /api/v1/games/99999` が 404 → `{"errors":["ゲームが見つかりません"]}` → 画面に日本語のエラー表示 |

ここで **C4（エラー文言の一致）が同時に取れる**。あわせて `docs/architecture.md` が名指ししている既知の乖離（LIFF のエラー画面にだけ「← トップに戻る」が残り、押すと `liff.login()` が走る）が再現するはずなので、§12 の既知一覧と突き合わせる。

## 7. シナリオ B: 見た目・レイアウト（375px 基準）

**`mcp__Claude_Browser__resize_window` に `preset: "mobile"` を指定**して 375 × 812 にする。実物の Chrome 側の `resize_window` は効かない（§0）。

リサイズ直後に実測して確認する。**`375` でなければ B は全項目を「確認できていないこと」に落とす**（デスクトップ幅で測った B の結果は意味がない）。

```js
[window.innerWidth, window.innerHeight]   // → [375, 812] を確認してから先へ進む
```

判定は**目視ではなく数値**で取る。

| # | 判定方法 | 合否 |
|---|---|---|
| B1 | `({s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth})` | `s <= c`。1px でも超えたら報告 |
| B2 | `[...document.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right > document.documentElement.clientWidth+1).map(e=>e.tagName+'.'+e.className).slice(0,20)` | 空配列。あわせて `computer` の `screenshot` を目視 |
| B3 | `G_FULL` を開く | **所見**（表の横幅・行の詰まり。合否をつけない） |
| B4 | `G_LONG` を開いて列幅を計測 | **所見**（名前列が他列を圧迫していないか） |
| B5 | `G_LONG` の合計行（`1438.8` / `-600.0`） | セル内で折り返し・見切れが無いこと |
| B6 | `[...document.querySelectorAll('a,button,input,summary')].map(e=>{const r=e.getBoundingClientRect();return{t:e.tagName,txt:(e.textContent||'').trim().slice(0,12),w:Math.round(r.width),h:Math.round(r.height)}}).filter(x=>x.h<44)` | **0件を要求しない。** 操作の主導線（ゲーム開始・入力完了・URLを共有する）が 44px 未満なら報告 |
| B7 | `window.scrollTo(0,0)` 後に日付要素の `getBoundingClientRect()` | `top >= 0` かつ文字が全部描画されている |

> **B6 で「0件でなければ不合格」にしない。** スコア一覧の局番号リンク（1〜12）は構造上小さくて当然で、毎回赤が出るチェックは1か月で読まれなくなる。

## 8. シナリオ C: MPA と LIFF の一貫性

**同じ `game_id` を両方で開く**（DB は共有なので同一データで比較できる）。

- **C1**: 両版のスクリーンショットを 375px で撮って並べる（**所見**）
- **C2**: 下のコードを両版で実行して差分を出す

**セレクタは画面ごとに違う。** スコア一覧には `.btn-primary` も `.score-cell` も存在しない（`null` が返る）。開いている画面に合う組を使う。

| 画面 | 使うセレクタ |
|---|---|
| スコア一覧 `/games/:id` | `.score-table` ／ `.share-button` ／ `.back-link` ／ `body` |
| メンバー入力 `/games/new` | `.member-form` ／ `.player-input` ／ `.rule-settings` ／ `body` |
| 点数入力 `/games/:id/rounds/new` | `.rounds-form` ／ `.score-field` ／ `.rounds-submit` ／ `body` |

```js
const pick=(sel,ps)=>{const e=document.querySelector(sel);if(!e)return null;const s=getComputedStyle(e);return Object.fromEntries(ps.map(p=>[p,s[p]]))};
({ table: pick('.score-table',['fontSize','width','borderCollapse']),
   share: pick('.share-button',['height','padding','fontSize','backgroundColor']),
   back:  pick('.back-link',['fontSize','color']),
   body:  pick('body',['fontFamily','fontSize','backgroundColor']) })
```

判定: §12 の「既知の差分」に載っているもの以外はすべて報告する。**要素が見つからず `null` が返ったら「確認できていないこと」に落とす。代替セレクタを勝手に探さない。**

- **C3**: 同じデータで表の中身を比較

```js
[...document.querySelectorAll('.score-table tr')].map(tr=>[...tr.cells].map(td=>td.textContent.trim()).join('|'))
```

判定: **完全一致。ここは緩めない**（数字が違ったら当たり前品質の崩壊）。ただし日付は MPA がサーバー時刻（`config.time_zone = "Tokyo"`）、LIFF がブラウザのタイムゾーンなので、Chrome が JST 以外だと1日ずれうる。

- **C4**: A6 の結果を流用して文言を比較する
- **C5**: 同じ手順（3人分入力 → 4人目の自動補完 → 送信ボタンの活性）を両版で実行し、タイミングの差を見る。**[#175](https://github.com/tsukamotohiroaki/mahjong_score/issues/175) 完了時にこの項目は削除する**

> **CSS は二重実装**。`app/assets/stylesheets/application.css` と `frontend/app/globals.css` はクラスセレクタが完全に一致しており、意図的なコピーになっている。**`docs/architecture.md` の二重実装マップには載っていない**ため、片方だけ直しても両版のテストは緑のまま通る。C1・C2 が実質的に唯一の検出手段。

## 9. シナリオ D: メタ情報

4件とも**検出して報告するだけ。直さない**（§12 の手順に従う）。

| # | 取得方法 |
|---|---|
| D1 | `document.title` |
| D2 | `document.documentElement.getAttribute('lang')` |
| D3 | `curl -s -o /dev/null -w "%{http_code} %{size_download}\n" http://localhost:3000/favicon.ico`（LIFF は `:3001`） |
| D4 | `getComputedStyle(document.body).fontFamily` ＋ スクリーンショットで豆腐（□）が出ていないか目視 |

## 10. シナリオ E: 探索的テスト（`feature` のみ）

チェックリストにできない枠。**合否をつけず所見だけ書く。**

| # | 観点 | 呼び水 |
|---|---|---|
| E1 | 仕様の抜け | `G_LONG` の同点（3位・4位がどちらも -600.0）の見せ方／作成直後の0局のゲームの表示／サーバー 422 の表示経路が画面から到達不能なこと |
| E2 | 導線の迷いやすさ | エラー画面からの復帰導線（LIFF の「← トップに戻る」は `liff.login()` に落ちる） |
| E3 | 「これ変じゃない？」 | 何でも |

**最低1件は書く。何も見つからなければ「探索して何も見つからなかった」と明記する**（空欄にしない）。

## 11. DB 突合（画面確認だけで合格にしない）

画面と DB がズレうる最大の箇所は**既存の局の上書き修正**。`round_number` が送られないと上書きではなく局が増えるが、画面には修正後の値が正しく出るため目視では絶対に気づけない。**[#216](https://github.com/tsukamotohiroaki/mahjong_score/issues/216) の確認漏れがまさにこれ。**

期待値は**「画面に入れた値との関係」で判定する。実数値を直書きしない**（ルールのデフォルトが変わると手順が壊れるため）。

### 突合1: ゲーム作成の裏取り（A2 の後）

```bash
docker compose exec -T web bin/rails runner 'g = Game.find(ID); puts({id: g.id, mochi: g.mochi_ten, kaeshi: g.kaeshi_ten, bonus: [g.rank_1_bonus, g.rank_2_bonus, g.rank_3_bonus, g.rank_4_bonus], players: g.players.order(:created_at).pluck(:name), rounds: g.rounds.count}.to_json)'
```

合格: `players` が画面に入れた4名と**同じ順序** ／ ルール値が画面の入力と一致 ／ `rounds` が `0`

### 突合2: 点数送信（A2' の後）

```bash
docker compose exec -T web bin/rails runner 'g = Game.find(ID); r = g.rounds.find_by(round_number: 1); puts({points: r.scores.joins(:player).order("players.created_at").pluck(:point), sum: r.scores.sum(:point), scores: r.scores.count, rounds_total: g.rounds.count}.to_json)'
```

合格: `points` が**画面に入れた値の100倍** ／ `sum` が `100000` ／ `scores` が `4` ／ `rounds_total` が `1`

### 突合3: 上書きで局が増えていないか（A2'' の前後で同じコマンドを打つ）

```bash
docker compose exec -T web bin/rails runner 'g = Game.find(ID); puts({rounds: g.rounds.count, numbers: g.rounds.order(:round_number).pluck(:round_number), r1_scores: g.rounds.find_by(round_number: 1).scores.count, r1_points: g.rounds.find_by(round_number: 1).scores.joins(:player).order("players.created_at").pluck(:point)}.to_json)'
```

| 見るもの | 合格 | 不合格のとき疑うもの |
|---|---|---|
| `rounds` | 前後で**変化なし** | `round_number` がリクエストに乗っていない（新規局が増えた） |
| `numbers` | 重複なし・前後で同じ | 同上 |
| `r1_scores` | **`4` のまま** | Score が追記されている |
| `r1_points` | 新しい入力値の100倍に**置き換わっている** | 上書きが保存されていない（画面だけ更新されて見えていた） |

### 突合4: 全体の不変条件（`release` / `feature` のみ）

```bash
docker compose exec -T web bin/rails runner 'ids = [G_BASE, G_FULL, G_LONG]; bad = Round.where(game_id: ids).includes(:scores).select { |r| r.scores.count != 4 || r.scores.sum(&:point) != 100000 }; dup = Round.where(game_id: ids).group(:game_id, :round_number).having("count(*) > 1").count; puts({bad_rounds: bad.map(&:id), duplicate_round_numbers: dup}.to_json)'
```

合格: 両方とも空。**`Round.all` にせず今回作った ID に限定する**（全件スキャンにすると過去のゴミデータで毎回赤くなり、突合そのものが信用されなくなる）。

## 15. テストデータの後始末

ローカル DB にゲームが残る。**自動で削除しない**（開発 DB なので残っても害がなく、削除は不可逆）。作成した game の id を §13 に記録するだけにする。

まとめて消したい場合はユーザーが判断する。

```bash
docker compose exec web bin/rails db:reset
```
