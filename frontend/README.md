# frontend — LIFF 版（Next.js）

麻雀スコア管理アプリの LIFF（LINE Front-end Framework）版です。MPA 版（Rails + ERB）と並ぶ正式なクライアントとして維持するマルチクライアント構成の LIFF 側です（[ADR-0001](../docs/adr/0001-mpa-版を残す.md)）。全体像はルートの [README](../README.md) と [`docs/architecture.md`](../docs/architecture.md) を参照してください。

## 構成の要点

- **Next.js（App Router）** がポート **3001** で動きます（3000 は Rails）
- 画面からの API 呼び出しは `/api/*` を Next.js が Rails（3000）へプロキシします（[`docs/api-proxy.md`](../docs/api-proxy.md)）
- LINE 内で動かすときは LIFF SDK（`@line/liff`）で初期化します。ブラウザでの日常検証は `localhost:3001` で可能です

```
app/
├── page.tsx                    # ゲーム一覧
├── games/new/                  # メンバー入力（ゲーム作成）
├── games/[id]/                 # ゲーム詳細（スコア表）
├── games/[id]/rounds/new/      # 点数入力
└── lib/
    ├── api.ts                  # Rails API クライアント
    └── score-input.ts          # 点数入力ロジック
```

## 起動手順

前提: リポジトリルートで Rails 側が起動していること（`docker compose up`）。

1. LIFF ID を設定する（初回のみ）:

   ```bash
   cp .env.local.example .env.local
   # .env.local の NEXT_PUBLIC_LIFF_ID を設定する
   ```

2. 依存をインストールして開発サーバーを起動する:

   ```bash
   npm install
   npm run dev
   ```

3. http://localhost:3001 にアクセスする

## テスト

Vitest + Testing Library（jsdom）でコンポーネントと API クライアントをテストしています。

```bash
npm run test        # 一括実行
npm run test:watch  # ウォッチモード
```

CI（GitHub Actions の `frontend-test` ジョブ）でも PR ごとに自動実行されます。テスト全体の役割分担は [`docs/quality-assurance.md`](../docs/quality-assurance.md) を参照してください。
