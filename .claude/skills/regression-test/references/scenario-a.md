# §6・§11（本ファイルは SKILL.md の分冊。ID・モード・報告の定義は SKILL.md が正）

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
