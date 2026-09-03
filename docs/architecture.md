# アーキテクチャ構成図

本プロジェクトの全体像（MPA 版 + JSON API + LIFF 版の併存構成）を1枚で掴むためのドキュメント。
構成に影響する実装変更（画面・コントローラー・API の追加や削除）をしたときは、この図も更新する。

## クライアント構成の方針

- **MPA 版（ブラウザ）と LIFF 版（LINE）は、どちらも正式なクライアント**とする（マルチクライアント構成）
- MPA 版は LIFF 版へ移行するための足場ではない。撤去予定はない
- 両版の橋渡しは、JSON API（`/api/v1`）と OpenAPI 仕様書（`docs/openapi.yaml`）を契約として行う
- SPA・ネイティブアプリは当面スコープ外（CLAUDE.md の方針）
- MPA 版を残すと決めた経緯は [ADR-0001: MPA 版を残す](adr/0001-mpa-%E7%89%88%E3%82%92%E6%AE%8B%E3%81%99.md) を参照

## 全体構成図

```mermaid
flowchart TB
    user(("ユーザー"))

    subgraph MPA["MPA版（ERB + Stimulus）"]
        gnew["games/new<br>ゲーム作成画面"]
        gshow["games/show<br>スコア一覧画面"]
        rnew["rounds/new<br>点数入力画面"]
        stim["score_input_controller.js<br>（合計計算・自動補完）"]
        rnew -.- stim
    end

    subgraph LIFF["LIFF版（Next.js / React）"]
        lpage["page.tsx<br>LIFFログイン"]
        lnew["games/new/page.tsx<br>ゲーム作成画面"]
        lshow["games/[id]/page.tsx<br>スコア一覧画面"]
        lrnew["games/[id]/rounds/new/page.tsx<br>点数入力画面"]
        sinput["lib/score-input.ts<br>（合計計算・自動補完）"]
        apits["lib/api.ts<br>通信層"]
        lrnew -.- sinput
        lnew & lshow & lrnew --> apits
    end

    subgraph Rails["Rails（サーバー）"]
        gc["GamesController"]
        rc["RoundsController"]
        agc["Api::V1::GamesController"]
        arc["Api::V1::RoundsController"]
        form["RoundScoreForm<br>点数バリデーション"]
        model["Game モデル<br>順位点計算・ゼロサム検証<br>プレイヤー4人検証"]
        db[("PostgreSQL<br>games / players<br>rounds / scores")]
    end

    user -- "通常（/ から 302）" --> gnew
    user -- 共有URL --> gshow
    user -- LIFF URL --> lpage
    user -- 共有URL --> lshow

    gnew & gshow --> gc
    rnew --> rc
    apits -- "JSON<br>（docs/openapi.yaml が契約）" --> agc & arc

    rc & arc --> form
    gc & rc & agc & arc --> model
    model --> db
```

## 二重実装マップ

MPA 版と LIFF 版で「同一仕様の別実装」になっているペアの一覧。
仕様変更時は必ずペアの両方を修正する。

```mermaid
flowchart LR
    subgraph M["MPA版"]
        m1["games/new.html.erb"]
        m2["games/show.html.erb"]
        m3["rounds/new.html.erb"]
        m4["score_input_controller.js<br>（JS: 合計・自動補完）"]
        m5["RoundsController"]
    end
    subgraph L["LIFF版"]
        l1["games/new/page.tsx"]
        l2["games/[id]/page.tsx"]
        l3["games/[id]/rounds/new/page.tsx"]
        l4["lib/score-input.ts<br>（TS: 合計・自動補完）"]
        l5["Api::V1::RoundsController"]
    end
    m1 <-. "同一仕様" .-> l1
    m2 <-. "同一仕様" .-> l2
    m3 <-. "同一仕様" .-> l3
    m4 <-. "同一ロジック別言語" .-> l4

    form["RoundScoreForm<br>（±1000・合計1000検証）<br>★共有＝一重"]
    m5 --> form
    l5 --> form

    shared["Game モデル（順位点計算）<br>★共有＝一重"]
    m5 --> shared
    l5 --> shared
```

- 点線ペア（m1〜m4）が「変更時に2箇所直す場所」。**実線の先（RoundScoreForm / Game モデル）は共有されており、二重実装ではない**

## 読みどころ

1. **利用者の入口は各版2つ** — 通常の入口（MPA は `/`、LIFF は LIFF URL）と、共有 URL でスコア一覧へ直接着地する経路。共有 URL は設計上の入口であり、内部リンクではない
2. **すべての矢印が Game モデルに集まる** — 順位点計算・ゼロサム検証は1箇所。壊れると全経路が壊れるため `spec/models/game_spec.rb` が最重要
3. **画面は二重、計算とデータは一重** — 点線ペアは恒久的な管理対象（[ADR-0001](adr/0001-mpa-%E7%89%88%E3%82%92%E6%AE%8B%E3%81%99.md)）。両版が同一挙動かを検証する手段は未整備（[#175](https://github.com/tsukamotohiroaki/mahjong_score/issues/175)）
4. **`lib/api.ts` と API コントローラーの間が契約境界** — ここを変えると LIFF 版だけが静かに壊れる。`docs/openapi.yaml` と `spec/requests/api/v1/` で守る。通信経路は `docs/api-proxy.md` を参照

箱とテストの対応は [`docs/test-strategy.md`](test-strategy.md) の「確認手段の分担」を参照。
