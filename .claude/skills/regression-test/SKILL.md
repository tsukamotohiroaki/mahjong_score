---
name: regression-test
description: デスクトップの Chrome でローカルの MPA 版（localhost:3000）と LIFF 版（localhost:3001）を操作し、見た目・API 通信の実際・両版の一貫性・コンソールエラーを回帰確認する。「回帰テストして」「リリース前に画面まわりを確認して」「Chrome で動作確認して」と言われたとき、および画面を変更した PR の確認時に使う。LINE アプリ実機での確認は対象外（docs/manual-test-checklist.md が担当）。
argument-hint: "[pr|release|feature] — pr=変更画面のみ / release=全部（既定）/ feature=全部＋探索的テスト"
allowed-tools: Bash, Read, mcp__Claude_Browser__navigate, mcp__Claude_Browser__computer, mcp__Claude_Browser__read_page, mcp__Claude_Browser__find, mcp__Claude_Browser__form_input, mcp__Claude_Browser__get_page_text, mcp__Claude_Browser__javascript_tool, mcp__Claude_Browser__read_console_messages, mcp__Claude_Browser__read_network_requests, mcp__Claude_Browser__resize_window, mcp__Claude_Browser__preview_start, mcp__Claude_Browser__tabs_context, mcp__Claude_Browser__tabs_select, mcp__claude-in-chrome__navigate, mcp__claude-in-chrome__computer, mcp__claude-in-chrome__read_page, mcp__claude-in-chrome__find, mcp__claude-in-chrome__form_input, mcp__claude-in-chrome__get_page_text, mcp__claude-in-chrome__javascript_tool, mcp__claude-in-chrome__read_console_messages, mcp__claude-in-chrome__read_network_requests, mcp__claude-in-chrome__resize_window, mcp__claude-in-chrome__tabs_context_mcp, mcp__claude-in-chrome__tabs_create_mcp, mcp__claude-in-chrome__tabs_close_mcp
---

# 回帰テスト（Claude in Chrome）

デスクトップの Chrome でローカルの MPA 版（`localhost:3000`）と LIFF 版（`localhost:3001`）を実際に操作し、**見た目・API 通信の実際・両版の一貫性・コンソールエラー**を確認する。

**対象外**: LINE アプリの中でしか起きないこと（共有シート・テンキー・LIFF の起動導線）。これは [`docs/manual-test-checklist.md`](../../../docs/manual-test-checklist.md) が担当する。

> **更新ルール**: 画面・API・自動テストを変更する PR では、本スキルの該当箇所（references/ 配下を含む）も更新する。
>
> 最終通し実行: **2026-08-23**（`release` モード。§12 の既知一覧はこのときの実測値）。

## このスキルが保証すること / しないこと

このスキルは、自動テストがモックや単体で飛ばしている「**実物どうしのつなぎ目**」を、実際のブラウザ・実際の HTTP 通信・実際の DB で確認する。**実行した時点のスナップショット確認**であり、CI のような継続的な保証ではない。

**保証すること**（全項目が合格だったとき、次のことが言える）

- 画面操作が実際の API 呼び出し・DB 保存まで正しくつながっている（A・DB 突合）。特に「画面は正しく見えるが DB がズレている」事故がないこと
- MPA 版と LIFF 版が、同じデータで同じ結果を表示している（C）。二重実装が乖離していないこと
- スマホ幅（375px）で画面が崩れていない（B）。※道具の制約で計測できなかった場合は、報告の「確認できていないこと」に必ず明示される
- タイトル・`lang`・favicon などメタ情報の現状が把握されている（D。合否ではなく現状把握）

**保証しないこと**（他の手段が担当。§1 に詳細）

- 計算ロジックの正しさ → RSpec
- 操作フローの回帰（ボタン活性・自動補完など）→ Playwright
- LINE アプリ実機でしか起きないこと → `docs/manual-test-checklist.md`
- 画面から到達できない API（`GET /api/v1/games`）→ 契約テストが別途必要
- 実行していない期間の品質（このスキルは実行した瞬間の確認）

## ファイル構成

役割で3つに分かれている。章番号（§0〜§16）は分割前から通しで維持している。

| ファイル | 役割 | いつ読む・いつ更新する |
|---|---|---|
| `SKILL.md`（本ファイル） | **決まりごと**: 何を・いつ・どう判定し・どう報告するか（§1〜3・13〜14・16） | 毎回。滅多に変えない |
| [`references/procedure.md`](references/procedure.md) | **手順書**: 道具の注意 → 準備 → シナリオ A〜E → DB 突合 → 後始末（§0・4〜11・15） | 実行時に上から順に。道具や画面が変わったら更新 |
| [`references/known-issues.md`](references/known-issues.md) | **現状メモ**: 既知の不具合・差分・ノイズ（§12） | **判定・報告時に必ず**。実行のたびに更新 |

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

## 16. 関連ドキュメント

| ドキュメント | 内容 |
|---|---|
| [`docs/test-strategy.md`](../../../docs/test-strategy.md) | 5手段の分担。本スキルの守備範囲の出典 |
| [`docs/manual-test-checklist.md`](../../../docs/manual-test-checklist.md) | 実機（LINE アプリ）で確認すること。本スキルの対象外 |
| [`docs/architecture.md`](../../../docs/architecture.md) | 二重実装マップ。C の対象を決める根拠 |
| [`docs/openapi.yaml`](../../../docs/openapi.yaml) | API の契約。A3 の照合先 |
| [`docs/debugging-guide.md`](../../../docs/debugging-guide.md) | 症状起点のログ逆引き |
