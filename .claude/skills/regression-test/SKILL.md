---
name: regression-test
description: デスクトップの Chrome でローカルの MPA 版（localhost:3000）と LIFF 版（localhost:3001）を操作し、見た目・API 通信の実際・両版の一貫性・コンソールエラーを回帰確認する。「回帰テストして」「リリース前に画面まわりを確認して」「Chrome で動作確認して」と言われたとき、および画面を変更した PR の確認時に使う。LINE アプリ実機での確認は対象外（docs/manual-test-checklist.md が担当）。
argument-hint: "[pr|release|feature] — pr=変更画面のみ / release=全部（既定）/ feature=全部＋探索的テスト"
allowed-tools: Bash, Read, mcp__Claude_Browser__navigate, mcp__Claude_Browser__computer, mcp__Claude_Browser__read_page, mcp__Claude_Browser__find, mcp__Claude_Browser__form_input, mcp__Claude_Browser__get_page_text, mcp__Claude_Browser__javascript_tool, mcp__Claude_Browser__read_console_messages, mcp__Claude_Browser__read_network_requests, mcp__Claude_Browser__resize_window, mcp__Claude_Browser__preview_start, mcp__Claude_Browser__tabs_context, mcp__Claude_Browser__tabs_select, mcp__claude-in-chrome__navigate, mcp__claude-in-chrome__computer, mcp__claude-in-chrome__read_page, mcp__claude-in-chrome__find, mcp__claude-in-chrome__form_input, mcp__claude-in-chrome__get_page_text, mcp__claude-in-chrome__javascript_tool, mcp__claude-in-chrome__read_console_messages, mcp__claude-in-chrome__read_network_requests, mcp__claude-in-chrome__resize_window, mcp__claude-in-chrome__tabs_context_mcp, mcp__claude-in-chrome__tabs_create_mcp, mcp__claude-in-chrome__tabs_close_mcp
---

# 回帰テスト（Claude in Chrome）

デスクトップの Chrome でローカルの MPA 版（`localhost:3000`）と LIFF 版（`localhost:3001`）を実際に操作し、**見た目・API 通信の実際・両版の一貫性・コンソールエラー**を確認する。

**対象外**: LINE アプリの中でしか起きないこと（共有シート・テンキー・LIFF の起動導線）。これは [`docs/manual-test-checklist.md`](../../../docs/manual-test-checklist.md) が担当する。

> **更新ルール**: 画面・API・自動テストを変更する PR では、本ファイルの該当箇所も更新する。
>
> 最終通し実行: **2026-08-23**（`release` モード。§12 の既知一覧はこのときの実測値）。

## 0. 使う道具と、使えなかったときの扱い

道具は2系統ある。**用途で使い分ける**（2026-08-23 の通し実行で確認した挙動）。

| 系統 | 使いどころ | 注意 |
|---|---|---|
| `mcp__Claude_Browser__*`（アプリ内ブラウザ） | **B の 375px 計測はこちらでしか成立しない。** `resize_window` に `preset: "mobile"` があり、実際にビューポートが 375×812 になる | `computer` のクリックはペインが表示されていないと 30 秒でタイムアウトする。`javascript_tool` はトップレベル `await` が使えない |
| `mcp__claude-in-chrome__*`（実物の Chrome） | ログイン済みセッションが要るとき | **`resize_window` は「成功」を返すのにビューポートが変わらない**（`window.outerWidth` が 0 になる）。B の計測には使えない |

**どちらを使っても、リサイズ後は必ず `window.innerWidth` を実測して 375 になっているか確認する。** ツールの戻り値を信用しない。

**道具が使えずに項目を実行できなかったら、その項目を §13 の「確認できていないこと」に落として先へ進む。** 許可を求めて手順を止めない。ツール名の相違が原因なら、報告に「どの名前で試して失敗したか」を書く。

## 1. 守る範囲 / 守らない範囲

守る範囲は [`docs/test-strategy.md`](../../../docs/test-strategy.md) の「確認手段の分担」で Claude in Chrome に割り当てられた行だけ。**同じことを2つの手段で確認しない。**

以下は自動テストが既に守っているので、**ブラウザで手動確認しない**。該当する確認をしたくなったら、実行せず報告する。

| 手動でなぞらないもの | 守っている自動テスト |
|---|---|
| 順位点計算・同点分配・ゼロサム・プレイヤー4人固定 | `spec/models/game_spec.rb` |
| 点数の範囲（±1000）・合計ちょうど・全角数字・非整数 | `spec/forms/round_score_form_spec.rb` |
| 保存・上書き・round_number の自動採番・100倍保存 | `spec/requests/rounds_spec.rb` / `spec/requests/api/v1/rounds_spec.rb` |
| 基本フロー（作成 → 入力 → 一覧反映）・日付形式・マイナスの赤字 | `spec/requests/games_spec.rb` / `e2e/score_input.spec.ts` |
| 送信ボタンの活性条件・4人目の自動補完・合計のリアルタイム更新 | `e2e/score_input.spec.ts` |
| ルール設定の折りたたみ・展開・デフォルト値での開始 | `e2e/new_game.spec.ts` |
| `/` のリダイレクト先とステータスコード | `spec/requests/home_spec.rb` / `e2e/home.spec.ts` |
| API の 201 / 422 / 404・レスポンス構造 | `spec/requests/api/v1/` |
| LIFF 版の各画面の挙動（jsdom + API モック） | `frontend/app/**/*.test.tsx` |
| LIFF 版の `/`（`liff.login()` の分岐） | `frontend/app/page.test.tsx` |

**LIFF 版の `/` は自動操作しない。** `frontend/app/page.tsx` が `liff.login()` で LINE のログイン画面へ外部リダイレクトするため。LIFF SDK を import しているのは `app/page.tsx` だけなので、**`/games/new` 以降は LINE ログインなしで操作できる**。`/` の挙動は実機で人が確認する。

## 2. 確認項目の定義（ID 一覧）

`A1` `B2` といった ID は、モード表・報告・`docs/test-strategy.md` から参照される共通語彙。**定義はこの節が唯一の出典**にする。

### グループ

| グループ | 何を見るか | ひとことで言うと |
|---|---|---|
| **A** | コンソール・ネットワーク | 裏側の通信が想定どおりか |
| **B** | 見た目・レイアウト（375px） | スマホ幅で崩れていないか |
| **C** | MPA と LIFF の一貫性 | 2つの実装がズレていないか |
| **D** | メタ情報 | タイトル・`lang`・favicon・フォント |
| **E** | 探索的テスト | 手順を決めず「変だ」と感じたことを拾う |

`A`〜`D` はチェックリスト（合否がつく）。**`E` だけは合否をつけず所見のみ**。

### 内訳

| ID | 確認内容 | 対象 |
|---|---|---|
| **A. コンソール・ネットワーク** | | |
| A1 | コンソールにエラー・警告が出ていないか | 両版 |
| A2 | 想定どおりのリクエストが飛んでいるか（URL・メソッド・ボディ） | LIFF のみ |
| A3 | レスポンスが `docs/openapi.yaml` と一致しているか（担保ではなく**照合**） | LIFF のみ |
| A4 | 重複リクエスト・余計なリクエストがないか | LIFF のみ |
| A5 | エラー時のステータスとボディ（422 / 404） | LIFF のみ |
| A6 | 存在しない ID を開いたときの挙動 | 両版 |
| **B. 見た目・レイアウト（375px 基準）** | | |
| B1 | 横スクロールが発生していないか | 両版 |
| B2 | 文字の重なり・見切れ | 両版 |
| B3 | 12局すべて埋めたときのスコア一覧（表の横幅・行の詰まり） | 両版 |
| B4 | 長いプレイヤー名（10文字以上）を入れたときの列幅 | 両版 |
| B5 | マイナス点・4桁の値を入れたときの桁あふれ | 両版 |
| B6 | タップ領域が小さすぎないか（44px 未満のボタン） | 両版 |
| B7 | スクロール最上部で日付が全部見えるか | 両版 |
| **C. MPA と LIFF の一貫性** | | |
| C1 | 同じ画面を同じ幅で開いた表示の差分 | 両版を比較 |
| C2 | 余白・文字サイズ・ボタン高さの数値差 | 同上 |
| C3 | 表示される順位点・合計が一致するか | 同上 |
| C4 | エラーメッセージの文言が一致するか | 同上 |
| C5 | 自動補完・送信ボタン活性のタイミング差 | 同上 |
| **D. メタ情報** | | |
| D1 | ページタイトル | 両版 |
| D2 | `lang` 属性 | 両版 |
| D3 | favicon | 両版 |
| D4 | 文字化け・意図しないフォント | 両版 |
| **E. 探索的テスト（合否をつけない）** | | |
| E1 | 仕様の抜け（同点時の見せ方、0局のときの表示など） | 両版 |
| E2 | 導線の迷いやすさ（戻る手段があるか、次に何をすべきか分かるか） | 両版 |
| E3 | 「これ変じゃない？」と感じたこと全般 | 両版 |

> **C5 の削除条件**: [#175](https://github.com/tsukamotohiroaki/mahjong_score/issues/175) で Playwright を `baseURL` 違いの2プロジェクトにしたら、**C5 を丸ごと削除する**。それまでの穴埋め。

## 3. 実行モード

`$ARGUMENTS` の**先頭1語だけ**を見る。空・解釈できない語なら `release` として扱い、確認は取らずに報告の冒頭でモードを明示する。

| モード | 範囲 | 何を見るか | 目安 |
|---|---|---|---|
| `pr` | **A1・A2・B1・B2**（変更した画面のみ） | コンソールエラー・リクエスト・横スクロール・見切れ | 3分 |
| `release`（既定） | **A〜D 全部**（A1〜A6・B1〜B7・C1〜C5・D1〜D4／計22項目） | 通信・見た目・一貫性・メタ情報 | 15分 |
| `feature` | **A〜D 全部 ＋ E1〜E3**（計25項目） | 上記＋探索的テスト | 25分 |

`pr` の4項目は「変更した画面で最も壊れやすい4点」（コンソールにエラーが出た／リクエストが変わった／横に溢れた／文字が欠けた）。**A2 は LIFF 専用なので、MPA 版だけを変更した PR では A1・B1・B2 の3項目**になる。

### `pr` の対象画面の決め方

`git diff --name-only main...HEAD` の結果から決める。

| 変更ファイル | 開く画面 |
|---|---|
| `app/views/games/new.html.erb` / `frontend/app/games/new/page.tsx` | メンバー入力 |
| `app/views/games/show.html.erb` / `frontend/app/games/[id]/page.tsx` | スコア一覧 |
| `app/views/rounds/new.html.erb` / `frontend/app/games/[id]/rounds/new/page.tsx` | 点数入力 |
| `app/assets/stylesheets/application.css` / `frontend/app/globals.css` | 該当版の3画面すべて |
| `app/controllers/api/v1/**` / `frontend/app/lib/api.ts` | A2〜A5 を全部 |
| `app/views/layouts/application.html.erb` / `frontend/app/layout.tsx` | D も追加 |

**片版だけの変更でも、[`docs/architecture.md`](../../../docs/architecture.md) の二重実装マップにペアがある画面は両版とも開く。** 片方だけ直して仕様が乖離する事故の検出が、このスキルの存在理由そのものなので、ここは緩めない。

差分が空・判定できないときは**推測で決めず**、どの画面を変更したかユーザーに聞く。

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

`GET /api/v1/games/{id}` のレスポンスボディを `requestId` で取り、[`docs/openapi.yaml`](../../../docs/openapi.yaml) の `GameDetail` とキーを突き合わせる。

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

## 12. 既知の不具合・既知ノイズ

### 既知の不具合（今回は修正しない。検出して報告し、指示を仰ぐ）

| # | 内容 | 現状 | イシュー |
|---|---|---|---|
| D1 | ページタイトルがテンプレートの初期値 | MPA=`App` ／ LIFF=`Create Next App` | 未起票 |
| D2 | `lang` 属性 | MPA=**属性そのものが無い** ／ LIFF=`en` | 未起票 |
| D3 | favicon がアプリのアイコンでない | MPA=0バイトの空ファイル ／ LIFF=Next.js の既定アイコン | 未起票 |
| C2 | 共有ボタンに CSS ルールが1行も無い（両版ともブラウザ既定のボタン） | `.share-button` / `.share-section` が両 CSS に未定義 | 未起票 |
| C4 | LIFF のエラー画面にだけ「← トップに戻る」が残る（押すと `liff.login()` が走る） | `docs/architecture.md` に記載。2026-08-23 に再現を確認 | 未起票 |
| E1 | **既存の局を修正するとき、既存の点数が入力欄に復元されない** | `?round_number=1` で開いても4欄とも空。全部打ち直しになる。編集中の局番号も見出しに出ない（「点数入力」のみ） | 未起票 |
| C2 | `body` の `fontFamily` が両版で違う | MPA=ブラウザ既定 ／ LIFF=`Arial`（`globals.css:17` の create-next-app 初期値が Geist を上書き） | 未起票 |
| A4 | LIFF のスコア一覧で `GET /api/v1/games/:id` が**2回**飛ぶ | 2026-08-23 の実測。dev の React Strict Mode 起因か本物の重複かは未切り分け | 未起票 |

**ルール: イシュー番号が「未起票」の行は、報告のたびにユーザーへ「起票しますか」と聞く。** 番号が入ったら以降は1行の再掲で済ませる。修正されたら行ごと削除する。

### 既知の差分（MPA と LIFF で違って当然のもの）

| 項目 | MPA | LIFF | 備考 |
|---|---|---|---|
| 共有 URL | 自身の URL（`game_url`） | `https://liff.line.me/{LIFF ID}/games/{id}` | **意図的に異なる**。仕様どおり |
| A6 のエラー画面 | Rails の例外ページ（開発環境） | 「ゲームが見つかりません」 | 開発環境限定の差。本番の MPA は `public/404.html` |

**以下は「違って当然」ではなく、乖離として報告する対象**（2026-08-23 の通し実行の実測値）。

| 項目 | MPA | LIFF | 差 |
|---|---|---|---|
| `body` の `fontFamily` | `"Hiragino Kaku Gothic ProN"`（指定なし＝ブラウザ既定） | `Arial, Helvetica, sans-serif` | `globals.css:17` が create-next-app の初期値のまま。**`layout.tsx` が読み込んだ Geist はここで上書きされて使われていない** |
| `body` の `backgroundColor` | `rgba(0,0,0,0)`（透明） | `rgb(255,255,255)` | |
| `.score-table` の `width` | `361.539px` | `335px` | 375px 幅で **26.5px** の差 |
| `.back-link` の `color` | `rgb(0,0,0)` | `rgb(23,23,23)` | |
| `.share-button` の高さ | `25.5px` | `23.5px` | どちらも CSS 未定義（下記の既知の不具合） |

### 既知ノイズ（報告しなくてよい console 出力）

| 出力 | 出る場所 | 理由 |
|---|---|---|
| （初回実行時に埋める） | | |

**この表に無い警告は必ず報告する。**「いつも出てるから」で素通りさせない。

## 13. 報告フォーマット

**結論を先に書く。実施・未実施はすべて §2 の ID で表す**（「だいたい見た」を書けなくするため）。

```markdown
## 回帰テスト結果（モード: release / ブランチ chore/xxx @ abc1234）

**結論**: ❌ 1件（A2''：上書きで rounds が 12 → 13 に増えた）／ ⚠️ 2件 ／ 既知 5件

### 環境
- Rails `http://localhost:3000`（/up=200）／ Next.js `http://localhost:3001`
- 使ったデータ: G_BASE=21 ／ G_FULL=22 ／ G_LONG=23

### 結果
| グループ | 結果 | 備考 |
|---|---|---|
| A コンソール・ネットワーク | ❌ | A2'' で不合格 |
| （DB 突合） | ❌ | 突合3 |
| B 見た目 | ⚠️ | B6 に1件 |
| C 一貫性 | ✅ | |
| D メタ情報 | 既知3件 | |
| E 探索 | 未実施（release のため） | |

### 見つかったこと（新規）
1. **【重大】** 症状 ／ 再現手順 ／ 期待 ／ 実際 ／ 証跡（スクリーンショット・突合の出力）

### 既知の不具合（今回は直していない）
（§12 の表。**未起票の行があれば「起票しますか」と聞く**）

### 確認できていないこと  ← 空にしない
| ID | 理由 |
|---|---|
| A3（`GET /api/v1/games`） | どの画面からも呼ばれず、画面操作では到達不能（契約テストが別途必要） |
| C2 の一部 | `.share-button` が見つからず `getComputedStyle` を取れなかった |
| E1〜E3 | release モードのため未実施 |

### 実行した副作用
- `tmp/pids/server.pid` を削除した
- テストデータを2件作成した（削除していない）
- Next.js dev サーバーを起動した（起動したまま／停止済み）
```

- **未実施は「合格」ではなく「確認できていないこと」に落とす**
- **判定が曖昧な項目（B2・B3・B4・E）は合否をつけず所見だけ書く。** ✅ の水増しを防ぐ

## 14. 制約

- **ダイアログ（`alert` / `confirm`）を発生させる操作をしない。** 発生するとブラウザ操作が止まる
- **認証情報を入力しない。** LINE のログイン画面に到達したらそこで止めて報告する
- **同じ操作が2〜3回失敗したら、原因を添えてユーザーに判断を仰ぐ。** リトライを繰り返さない
- **セレクタを直書きして探さない。** 操作対象はまず `read_page` / `find` で探す。直書きは §7・§8 の計測コードだけに限定し、見つからなければ「確認できていないこと」に落とす
- **`computer` のクリックが「Browser pane is currently hidden」で 30 秒タイムアウトしたら、`javascript_tool` から実クリックに切り替える。** 何度も押し直さない

```js
document.querySelector('button[type=submit]').click(); "clicked"
```

  これは React の `onSubmit` を正規に通るため、送信の検証としては同等。**ただし「ボタンが見えているか・押せる位置にあるか」は検証できていない**ので、その旨を報告に残す

## 15. テストデータの後始末

ローカル DB にゲームが残る。**自動で削除しない**（開発 DB なので残っても害がなく、削除は不可逆）。作成した game の id を §13 に記録するだけにする。

まとめて消したい場合はユーザーが判断する。

```bash
docker compose exec web bin/rails db:reset
```

## 16. 関連ドキュメント

| ドキュメント | 内容 |
|---|---|
| [`docs/test-strategy.md`](../../../docs/test-strategy.md) | 5手段の分担。本スキルの守備範囲の出典 |
| [`docs/manual-test-checklist.md`](../../../docs/manual-test-checklist.md) | 実機（LINE アプリ）で確認すること。本スキルの対象外 |
| [`docs/architecture.md`](../../../docs/architecture.md) | 二重実装マップ。C の対象を決める根拠 |
| [`docs/openapi.yaml`](../../../docs/openapi.yaml) | API の契約。A3 の照合先 |
| [`docs/debugging-guide.md`](../../../docs/debugging-guide.md) | 症状起点のログ逆引き |
