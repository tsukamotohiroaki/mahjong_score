---
name: response-time
description: ボタンを押してからスコア一覧が表示されるまでの時間を Chrome で実測する。「速度を測って」「応答速度を確認して」「遅くなっていないか見て」と言われたときに使う。ローカル（既定）と本番（EC2）を引数で切り替える。機能の正しさは見ない（Playwright・RSpec が担当）。
argument-hint: "[local|production] — 既定は local"
allowed-tools: Bash, Read, mcp__claude-in-chrome__tabs_context_mcp, mcp__claude-in-chrome__tabs_create_mcp, mcp__claude-in-chrome__tabs_close_mcp, mcp__claude-in-chrome__navigate, mcp__claude-in-chrome__computer, mcp__claude-in-chrome__read_page, mcp__claude-in-chrome__form_input, mcp__claude-in-chrome__javascript_tool, mcp__claude-in-chrome__browser_batch
---

# 応答速度の計測

操作してから次の画面が出るまでの時間を実測する。**自動テストが誰も見ていない「体感の速さ」だけを見る。**

## 分かること / 分からないこと

**分かる**: ボタンを押してからスコア一覧が表示されるまでの実測値。前回より遅くなっていないか。

**分からない**（他の手段が担当）:
- 機能が正しく動くか → Playwright（`e2e/`）・RSpec（`spec/`）
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

| 引数 | MPA 版 | LIFF 版 |
|---|---|---|
| `local`（既定） | `http://localhost:3000` | `http://localhost:3001` |
| `production` | `https://doc9xlvbx6gap.cloudfront.net` | `https://dxop25dcw25sl.cloudfront.net` |

> **⚠️ `production` は本番データベースに対局データを作る。削除は手作業で、取り返しがつかない。**
> 実行前に「本番に書き込む」と明示してから始め、作成したゲームの ID を必ず報告に残す。
>
> EC2 は使わないとき停止する運用のため、疎通しないことがある。**勝手に起動せず**、疎通不可として報告して終わる。

## 手順

1. **疎通確認**（MPA と LIFF を**別々の**コマンドで。`;` でつなぐと接続失敗時に手順が止まる）
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" --max-time 10 <MPA>/games/new
   ```
2. **ウォームアップ**: シナリオ1を1回実行し、**結果は捨てる**。開発サーバーは初回アクセス時にその場でビルドするため、混ぜると数値が無意味になる
3. 各シナリオを**3回**実行し、**中央値**を採用する（1回では、ぶれる）
4. `measurements.md` に追記する

## 計測のやり方

**入力は `form_input` で行い、計測に含めない。** 計測するのは「クリック → 表示」の区間だけ。

**クリックと待機は必ず1回の `javascript_tool` にまとめる。** 分けるとツールの往復時間が数値に混ざる。

**`read_page` は毎回やり直す。** 要素の参照番号（`ref_1` など）はページを移動すると無効になり、使い回すと `No element found with reference` で止まる。1回の計測は「移動 → 待機 → `read_page` → `form_input` × 4 → 計測」の6手順。`browser_batch` にまとめると3回分を1回の呼び出しで実行できる。

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

- **初回は基準値を作るだけ**。合否をつけない
- 2回目以降は前回の中央値と比べ、**1.5倍以上遅くなっていたら報告**する

絶対的な速さは次の3段階で見る。**根拠を聞かれたらこの出典で答える。**

| 判定 | 基準 | 根拠 |
|---|---|---|
| 良好 | **1秒以内** | ヤコブ・ニールセンの「思考が途切れない上限」（1993年。元は1968年のミラーの研究） |
| 要改善 | 1〜3秒 | 遅いと自覚されるが操作は続く |
| 不良 | **3秒超** | 「モバイルで表示に3秒以上かかると訪問の53%が離脱する」（Google の調査・2016年） |

参考: Google の Core Web Vitals（コアウェブバイタル）では、**操作から次の描画まで**（Interaction to Next Paint、略称 INP）が200ミリ秒以下で良好・500ミリ秒超で不良、**主要コンテンツの表示**（Largest Contentful Paint、略称 LCP）が2.5秒以下で良好とされる。ここで測っている区間はこの2つが混ざるため、全体としては上の3段階で判断する。

**中央値は3回計測ゆえの代用。** Core Web Vitals の作法では75パーセンタイル（遅い側から4分の1を切り捨てた値）で見る。速かった回だけを見て安心しないための決まり。

**ローカルの数値には通信の遅延が含まれない。** 実際のスマートフォンは携帯回線の往復に50〜150ミリ秒程度かかり、本番ではこれが上乗せされる。ローカルで1秒近い値が出ていたら、本番では超えていると考える。

**しきい値で自動的に失敗にはしない。** 計測値はぶれるので、数値を残して人が判断する。

## 報告

結論（遅くなっているかどうか）を先に書き、次の表を出す。

| シナリオ | MPA | LIFF |
|---|---|---|
| 1 ゲーム開始 | ○○ms | ○○ms |
| 2 点数入力 | ○○ms | ○○ms |
| 3 上書き修正 | ○○ms | ○○ms |

あわせて、環境（`local` / `production`）・作成したゲームの ID・前回との比較を書く。

## 制約

- 同じ操作が3回失敗したら、原因を添えて止める。リトライを繰り返さない
- 認証情報は入力しない
- ダイアログ（`alert` / `confirm`）を出す操作をしない。ブラウザ操作が止まる
- 計測用に作ったデータは**自動で削除しない**（削除は不可逆）。ID を報告に残すだけにする
