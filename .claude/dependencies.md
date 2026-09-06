# 依存マップ（TDAD: Test-Driven Agentic Development）

コード変更時に確認すべきテストの一覧。
変更対象のファイルに対して、直接テストだけでなく間接的に影響を受けるテストも列挙する。
`e2e/` の Playwright は MPA 版（:3000）と LIFF 版（:3001）の両方に流れる（#175）。画面を直すときは MPA 版と LIFF 版の両方を直す。

## app/models/game.rb

Game は Player・Round の親モデルであり、順位点計算ロジックと、ゲーム作成の入口となる `create_with_players!`（プレイヤーちょうど4人の検証を含む）を持つ。

- `spec/models/game_spec.rb`（直接）
- `spec/models/player_spec.rb`（has_many :players）
- `spec/models/round_spec.rb`（has_many :rounds）
- `spec/models/score_spec.rb`（calculate_ranking_scores が Score を参照）
- `spec/requests/games_spec.rb`（Game の CRUD。create は create_with_players! を呼ぶ）
- `spec/requests/rounds_spec.rb`（Round 作成時に Game のルール設定を使用）
- `spec/requests/api/v1/games_spec.rb`（JSON API。一覧・詳細・作成、順位点計算を含む）
- `spec/requests/api/v1/rounds_spec.rb`（JSON API。Round 作成時に Game のルール設定を使用）
- `e2e/home.spec.ts`（`/` からメンバー入力画面への直行導線。#216）
- `e2e/new_game.spec.ts`（ルール設定を折りたたんだまま・開いて変更してゲーム開始）
- `e2e/score_input.spec.ts`（点数入力は Game 配下の Round/Score に依存）

## app/models/player.rb

Player は Game に従属し、Score と紐づく。

- `spec/models/player_spec.rb`（直接）
- `spec/models/game_spec.rb`（has_many :players）
- `spec/models/score_spec.rb`（belongs_to :player）
- `spec/requests/games_spec.rb`（ゲーム作成時に Player も作成）
- `spec/requests/api/v1/games_spec.rb`（JSON API のゲーム詳細に Player をネストして返す）
- `e2e/score_input.spec.ts`（点数入力画面に Player 名が表示される）

## app/models/round.rb

Round は Game に従属し、Score を持つ。

- `spec/models/round_spec.rb`（直接）
- `spec/models/game_spec.rb`（has_many :rounds、calculate_ranking_scores）
- `spec/models/score_spec.rb`（belongs_to :round）
- `spec/requests/rounds_spec.rb`（Round の CRUD）
- `spec/requests/api/v1/rounds_spec.rb`（JSON API。Round 作成・スコア上書き）
- `spec/requests/api/v1/games_spec.rb`（JSON API のゲーム詳細に Round をネストして返す）
- `e2e/score_input.spec.ts`（点数入力 → Round/Score 作成）

## app/models/score.rb

Score は Round・Player に従属する。

- `spec/models/score_spec.rb`（直接）
- `spec/models/round_spec.rb`（has_many :scores）
- `spec/models/player_spec.rb`（has_many :scores）
- `spec/models/game_spec.rb`（calculate_ranking_scores が Score を使用）
- `spec/requests/rounds_spec.rb`（Round 作成時に Score も作成）
- `spec/requests/api/v1/rounds_spec.rb`（JSON API。Round 作成時に Score も作成）
- `spec/requests/api/v1/games_spec.rb`（JSON API のスコアを順位点としてネストして返す）
- `e2e/score_input.spec.ts`（点数入力 → Score 作成）

## app/controllers/api/v1/application_controller.rb

LIFF 版 JSON API の基底コントローラー。共通のシリアライズ（`round_detail`）と RecordNotFound 時の 404 応答を持つ。

- `spec/requests/api/v1/games_spec.rb`（直接。一覧・詳細・作成）
- `spec/requests/api/v1/rounds_spec.rb`（直接。Round 作成）
- `frontend/app/lib/api.test.ts`（Vitest。`round_detail` の JSON の形を `Round` 型として検証）

## app/controllers/games_controller.rb

MPA 版のゲーム作成・スコア一覧表示。作成は `Game.create_with_players!` に委譲し、失敗時はメンバー入力画面へリダイレクトする。

- `spec/requests/games_spec.rb`（直接）
- `spec/models/game_spec.rb`（create_with_players! と順位点計算 calculate_ranking_scores を使用）
- `spec/models/player_spec.rb`（ゲーム作成時に Player も作成）
- `e2e/home.spec.ts`（`/` からメンバー入力画面への直行導線。#216）
- `e2e/new_game.spec.ts`（メンバー入力画面のルール設定トグルとゲーム開始）

## app/controllers/api/v1/games_controller.rb

ゲームの一覧・詳細・作成を JSON で返す。詳細は Player・Round・順位点をネストして返す。作成は `Game.create_with_players!` に委譲する。

- `spec/requests/api/v1/games_spec.rb`（直接）
- `spec/models/game_spec.rb`（create_with_players! と順位点計算 calculate_ranking_scores を使用）
- `spec/requests/games_spec.rb`（MPA 版と同じ create_with_players! を共有するため、片方の変更が両経路に影響する）
- `frontend/app/lib/api.test.ts`（Vitest。`getGame` / `createGame` の URL とレスポンスの形。JSON の形を変えたら `frontend/app/lib/api.ts` の型も直す）
- `frontend/app/games/[id]/page.test.tsx`・`frontend/app/games/new/page.test.tsx`（Vitest。`api.ts` をモックしているため、レスポンスの形が変わるとテストデータが実態とずれる）

## app/controllers/api/v1/rounds_controller.rb

ラウンド（点数）入力を JSON で受け付ける。検証は `RoundScoreForm` に委譲し、保存時に百点棒単位を 100 倍する。

- `spec/requests/api/v1/rounds_spec.rb`（直接）
- `spec/requests/api/v1/games_spec.rb`（作成したラウンドはゲーム詳細に反映される）
- `spec/forms/round_score_form_spec.rb`（検証ロジックの実体）
- `frontend/app/lib/api.test.ts`（Vitest。`createRound` の URL・送信パラメータ・422 時の `ApiError`）
- `frontend/app/games/[id]/rounds/new/page.test.tsx`（Vitest。`api.ts` をモックしているため、エラー応答の形が変わると表示テストがずれる）

## app/controllers/rounds_controller.rb

MPA 版のラウンド（点数）入力。検証は `RoundScoreForm` に委譲し、失敗時は一律メッセージで入力画面を再表示する。

- `spec/requests/rounds_spec.rb`（直接）
- `spec/forms/round_score_form_spec.rb`（検証ロジックの実体）
- `e2e/score_input.spec.ts`（点数入力フロー）

## app/forms/round_score_form.rb

点数入力（整数・±1000・合計1000。百点棒単位）の検証を MPA / API 共通で担うフォームオブジェクト。ここを変更すると両経路の受け付け条件が同時に変わる。

- `spec/forms/round_score_form_spec.rb`（直接）
- `spec/requests/rounds_spec.rb`（MPA 経路の配線。エラー時 422 / 再表示）
- `spec/requests/api/v1/rounds_spec.rb`（API 経路の配線。エラー時 422 / 原因別メッセージ）
- `e2e/score_input.spec.ts`（点数入力 → バリデーションエラー表示）

## config/routes.rb

`/` はメンバー入力画面へ 302 リダイレクトする（#216）。

- `spec/requests/home_spec.rb`（直接。リダイレクト先と 302）
- `e2e/home.spec.ts`（`/` からメンバー入力画面への直行導線）

## frontend/app/lib/api.ts

LIFF 版の JSON API クライアント。URL・型・`ApiError` をここに集約している。

- `frontend/app/lib/api.test.ts`（直接）
- `frontend/app/games/new/page.test.tsx`・`frontend/app/games/[id]/page.test.tsx`・`frontend/app/games/[id]/rounds/new/page.test.tsx`（`api.ts` の関数をモックし `ApiError` は実物を使う）
- `e2e/new_game.spec.ts`・`e2e/score_input.spec.ts`（LIFF 版は実 API 経由で動く）
