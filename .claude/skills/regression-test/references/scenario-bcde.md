# §7〜10（本ファイルは SKILL.md の分冊。ID・モード・報告の定義は SKILL.md が正）

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
