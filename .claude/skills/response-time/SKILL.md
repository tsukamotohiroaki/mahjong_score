---
name: response-time
description: 非機能テスト（性能）。ボタンを押してからスコア一覧が表示されるまでの時間を Chrome で実測する。「速度を測って」「応答速度を確認して」「遅くなっていないか見て」と言われたときに使う。ローカル（既定）と本番（EC2）を引数で切り替える。機能の正しさは見ない（機能テスト = Playwright・RSpec が担当）。
argument-hint: "[local|production] — 既定は local"
allowed-tools: Bash, Read, mcp__claude-in-chrome__tabs_context_mcp, mcp__claude-in-chrome__tabs_create_mcp, mcp__claude-in-chrome__tabs_close_mcp, mcp__claude-in-chrome__navigate, mcp__claude-in-chrome__computer, mcp__claude-in-chrome__read_page, mcp__claude-in-chrome__form_input, mcp__claude-in-chrome__javascript_tool, mcp__claude-in-chrome__browser_batch
---

# 応答速度の計測

操作してから次の画面が出るまでの時間を実測する。**非機能テストのうち性能（応答速度）だけを見る。**

機能が動くかは**機能テスト**（Playwright・RSpec）が守る。ここは「動くけれど遅い」を拾う担当。

## 分かること / 分からないこと

**分かる**: ボタンを押してからスコア一覧が表示されるまでの実測値。1秒の壁を越えていないか。

**分からない**（他の手段が担当）:
- 機能が正しく動くか → **機能テスト**（Playwright `e2e/`・RSpec `spec/`）
- 負荷がかかったときの性能 → 負荷試験。これは1人で1回操作しただけの値
- 見た目の崩れ → 今回のスコープ外

## 計測する3つ

| # | 操作 | 計測する区間 |
|---|---|---|
| 1 | メンバー入力で4人の名前を入れて「ゲーム開始」 | クリック → スコア一覧の表が出るまで |
| 2 | 新しい局の点数を入れて「入力完了」 | 同上 |
| 3 | 既存の局を打ち直して「入力完了」（上書き修正） | 同上 |

**MPA 版と LIFF 版の両方**で測る（3シナリオ × 2版 = 6通り）。

> 3 は既存の点数が入力欄に復元されない仕様なので、4欄すべて打ち直す操作になる。

## 環境（引数で切り替え）

`$ARGUMENTS` の先頭1語だけを見る。空なら `local`。

```
/response-time              → 開発環境（既定）
/response-time production   → 本番環境（EC2）
```

| 引数 | MPA 版 | LIFF 版 |
|---|---|---|
| `local`（既定） | `http://localhost:3000` | `http://localhost:3001` |
| `production` | `https://doc9xlvbx6gap.cloudfront.net` | `https://dxop25dcw25sl.cloudfront.net` |

> **`production` は本番データベースに対局データを作る。** 実行前にその旨を伝えてから始める。
> 作成したデータは残して構わない（削除の提案も、残っていることの報告も不要）。
>
> EC2 は使わないとき停止する運用のため、疎通しないことがある。**勝手に起動せず**、疎通不可として報告して終わる。
>
> 本番ドメインは Chrome 拡張のサイト許可が要る。未許可だと `Navigation to this domain is not allowed` で止まるので、その旨を報告してユーザーに許可を依頼する。

## 手順

1. **疎通確認**（MPA と LIFF を**別々の**コマンドで。`;` でつなぐと接続失敗時に手順が止まる）
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" --max-time 10 <MPA>/games/new
   ```
2. **初回**: 各シナリオの1回目を「初回」として**別枠で記録する**（捨てない）
3. 続けて**5回**実行し、こちらを**定常値**として最小〜最大と中央値を出す
4. 結果を報告する（ファイルには記録しない）

## 計測のやり方

**入力は `form_input` で行い、計測に含めない。** 計測するのは「クリック → 表示」の区間だけ。

**クリックと待機は必ず1回の `javascript_tool` にまとめる。** 分けるとツールの往復時間が数値に混ざる。

**`read_page` は毎回やり直す。** 要素の参照番号（`ref_1` など）はページを移動すると無効になり、使い回すと `No element found with reference` で止まる。1回の計測は「移動 → 待機 → `read_page` → `form_input` × 4 → 計測」の6手順。`browser_batch` に3回分ずつまとめると、5回が2回の呼び出しで済む。

```js
const t0 = performance.now();
document.querySelector('form [type=submit]').click();
const done = await Promise.race([
  new Promise(r => { const iv = setInterval(() => {
    if (/\/games\/\d+$/.test(location.pathname) && document.querySelector('.score-table')) { clearInterval(iv); r(true); }
  }, 20); }),
  new Promise(r => setTimeout(() => r(false), 15000))
]);
({ ms: done ? Math.round(performance.now() - t0) : null, url: location.pathname })
```

- `form [type=submit]` は両版で通る（MPA は `input`、LIFF は `button`）
- 終点は**スコア一覧の表が実際に出た瞬間**。0局のゲームでも表は描画されるのでシナリオ1でも成立する
- `ms` が `null` なら15秒待っても表示されなかったということ。**その回は数値にせず、失敗として報告する**

## 判定

**1秒を超える回が出たら報告する。** 前回の数値との比較はしない — 同じ操作でも実行ごとに**10倍以上ぶれる**ため（2026-08-30 に 83〜1067ミリ秒を実測）。見るのは「1秒の壁を越えたかどうか」だけにする。

| 判定 | 基準 | 根拠 |
|---|---|---|
| 良好 | 1秒以内 | ニールセンの体感基準（思考が途切れない上限） |
| 要改善 | 1〜3秒 | — |
| 不良 | 3秒超 | モバイルで3秒超だと訪問の53%が離脱（Google・2016年） |

- 参考: Core Web Vitals は操作から次の描画まで（INP）200ミリ秒以下、主要コンテンツの表示（LCP）2.5秒以下が良好
- 速かった回だけを見て安心しない。**最も遅い回**が1秒を超えていないかで見る
- **初回の扱いは環境で変わる。** 本番は初回こそ利用者の体験なので**判定に含める**。開発環境の初回は開発サーバーがその場でビルドする時間を含むため**判定に含めない**（本番では起きない。記録だけ残す）
- ローカルには通信の遅延が含まれない。本番は携帯回線の往復（50〜150ミリ秒）が上乗せされる

## 報告

結論（遅くなっているかどうか）を先に書き、次の表を出す。

| シナリオ | 版 | 初回 | 定常5回 | 中央値 | 最大 |
|---|---|---|---|---|---|
| 1 ゲーム開始 | MPA / LIFF | ○○ms | ○○ / ○○ / ○○ / ○○ / ○○ | ○○ms | ○○ms |

あわせて環境（`local` / `production`）を書く。

**報告して終わり。ファイルには残さない**（数値はぶれるので履歴を比較しても意味がない）。

## 制約

- 同じ操作が3回失敗したら、原因を添えて止める。リトライを繰り返さない
- 認証情報は入力しない
- ダイアログ（`alert` / `confirm`）を出す操作をしない。ブラウザ操作が止まる
- 計測用に作ったデータは削除しない。残っていても問題ない
