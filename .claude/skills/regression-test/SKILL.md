---
name: regression-test
description: Claude in Chrome で MPA（Rails）と LIFF（Next.js）の主要フローを手動操作で回帰確認する。リリース前や広範囲のリファクタリング後、「ブラウザで動作確認して」「回帰テストして」と言われたときに使う。
---

# 回帰テスト（Claude in Chrome）

## このテストの役割

自動テストが守れない範囲だけを人手（Claude in Chrome）で見る。

| 手段 | 守る範囲 |
|---|---|
| RSpec | サーバー側のロジック・バリデーション・レスポンス |
| Playwright | ブラウザ上の JS 動作・操作フロー |
| **このスキル** | **見た目・MPA と LIFF の一貫性・自動テスト未整備の穴** |

**重複は書かない。** 下の「やらないこと」に該当する確認を見つけたら、実行せずユーザーに報告する。

## 事前準備

### 1. MPA（Rails / localhost:3000）

```bash
docker compose up -d
```

起動後 `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` が `302` になるまで待つ。

**応答しない場合はまず `docker compose logs --tail=50 web` を見る。**
`A server is already running (pid: 1)` が出ていたら stale な pid ファイルが原因:

```bash
rm -f tmp/pids/server.pid && docker compose up -d web
```

### 2. LIFF（Next.js / localhost:3001）※ LIFF も対象にする場合のみ

**ローカルの docker-compose には frontend サービスがない。** 直接起動する。

```bash
cd frontend && npm run dev   # バックグラウンド実行にすること（終了しないコマンド）
```

- 事前に `frontend/.env.local` に `NEXT_PUBLIC_LIFF_ID` が必要（`.env.local.example` 参照）
- `/api/*` は Rails（3000）へプロキシされるため、**Rails が起動していないと LIFF 版は動かない**

### 3. 確認範囲をユーザーに確認する

MPA のみか、MPA + LIFF か。LIFF を含めるなら上記 2 が必要。

## シナリオ

`結果` 列を実施のたびに埋める。未実施は空欄のままにし、`✅` を先に埋めない。

### A. 基本フロー（毎回流す）

| # | 操作 | 期待結果 | 結果 |
|---|---|---|---|
| A-1 | `/` を開く | メンバー入力画面（`/games/new`）に着地 | |
| A-2 | 4人の名前を入力 →「ゲーム開始」 | スコア一覧（`/games/:id`）へ遷移 | |
| A-3 | 半荘「1」をクリック | 点数入力画面へ遷移 | |
| A-4 | 4人分の点数を入力（合計 100000 になる値） | 合計表示が更新され「入力完了」が活性化 | |
| A-5 | 「入力完了」 | スコア一覧へ戻り、1回戦に計算結果が反映 | |
| A-6 | 表示を確認 | マイナス点が赤字・合計行の総和が 0.0 | |
| A-7 | 「← 新しいゲームを始める」 | `/games/new` へ遷移（`/` を経由しない） | |

**A-5 の後は DB も確認する**（画面表示だけでは保存を保証できない）:

```bash
docker compose exec -T web bin/rails runner 'g=Game.last; puts g.attributes.inspect; g.rounds.order(:round_number).each { |r| puts "round#{r.round_number}: " + r.scores.map { |s| "#{s.player.name}=#{s.point}" }.join(", ") }'
```

### B. 計算の検算（A-5 の結果に対して行う）

素点・オカ・ウマを分解して手計算と突き合わせる。ルール設定は上の runner 出力の
`mochi_ten` / `kaeshi_ten` / `rank_1_bonus`〜`rank_4_bonus` を使う。

- [ ] 4人の合計が 0.0（ゼロサム）
- [ ] 同点プレイヤーがいる場合、順位ウマが分配されている

**同点は壊れやすい分岐なので、意図的に同点を含む点数で入力する。**

### C. 未自動化の穴（優先度順・時間があれば）

| # | 操作 | 期待結果 | 結果 |
|---|---|---|---|
| C-1 | 入力済みの半荘をもう一度開いて別の点数で保存 | 二重登録されず上書きされる | |
| C-2 | ルール設定を変更してゲーム開始 → 点数入力 | 変更後のウマで計算される | |
| C-3 | 存在しない `/games/999999` を開く | エラー画面が出る（500 で落ちない） | |
| C-4 | 「URLを共有する」ボタン | 押下後の表示が壊れない | |

### D. MPA と LIFF の一貫性（LIFF を対象にした場合）

同じシナリオ A を **localhost:3000 と localhost:3001 の両方**で流し、差分を報告する。

- [ ] 画面遷移が同じ
- [ ] 表示される数値が同じ
- [ ] 文言が同じ（特に「← 新しいゲームを始める」）
- [ ] 見た目の崩れがない

**LIFF 版の `/` は自動操作しない。** `liff.login()` で LINE のログイン画面へ外部リダイレクトするため。
LIFF 版は `/games/new` から開始し、`/` の挙動は実機（LINE アプリ）で人が確認する。

### E. 横断チェック（各シナリオの後に毎回）

```
mcp__claude-in-chrome__read_console_messages（onlyErrors: true）
```

- [ ] コンソールエラーが出ていない

## やらないこと（自動テストがカバー済み）

以下は **Playwright / RSpec / Vitest が既に守っている**。ブラウザで手動確認しない。

- 送信ボタンの活性・非活性の条件（合計が10万点でない、範囲外の値）→ `e2e/score_input.spec.ts`
- 3人分入力時の4人目の自動補完 → `e2e/score_input.spec.ts`
- ルール設定の折りたたみ・展開 → `e2e/new_game.spec.ts`
- 合計のリアルタイム更新（数値の正しさ） → `e2e/score_input.spec.ts`
- `/` のリダイレクト先とステータスコード → `spec/requests/home_spec.rb`
- 「新しいゲームを始める」の href → `spec/requests/games_spec.rb`, `frontend/app/games/[id]/page.test.tsx`

A-1 や A-4 を流すのは「実際に目で見て破綻がないか」を確かめるためであり、
**条件分岐の網羅を目的にしない**。網羅が必要だと感じたら自動テストの追加を提案する。

## 制約

- **ダイアログ（alert / confirm）を発生させる操作をしない。** 発生するとブラウザ操作が停止する
- **認証情報を入力しない。** LINE ログイン画面に到達したらそこで止めてユーザーに報告する
- 同じ操作が 2〜3 回失敗したら、原因を添えてユーザーに判断を仰ぐ。リトライを繰り返さない

## テストデータの後始末

このテストはローカル DB にゲームを作成する。**自動で削除しない。**
実行後、作成した game の id を報告し、削除するかユーザーに確認する。

```bash
# 削除する場合（ユーザーの承諾を得てから）
docker compose exec -T web bin/rails runner 'Game.find(<id>).destroy!'
```

## 報告フォーマット

```
## 回帰テスト結果（<対象: MPA / MPA+LIFF>・<ブランチ名>）

| # | シナリオ | 結果 |
|---|---|---|
| A-1 | ... | ✅ |
| C-1 | ... | ❌ <症状> |

### 確認できていないこと
- <未実施のシナリオと理由>

### 作成したテストデータ
- game id: <id>（削除しますか？）
```

**未実施のシナリオは必ず「確認できていないこと」に書く。** 全部流したように見せない。
