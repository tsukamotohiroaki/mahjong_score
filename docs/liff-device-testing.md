# LIFF 版のローカル実機確認手順

LINE アプリ（実機）からローカルの LIFF 版（Next.js）を開いて確認するための手順。
**本番の設定には一切触らない**のがこのドキュメントの目的。

## 前提: LIFF アプリは本番用と開発用の2つある

LIFF のエンドポイントURLは LINE Developers コンソール側に登録する値であり、ローカルの
`.env.local` では変えられない。そのため実機確認のたびに本番 LIFF アプリのエンドポイントを
ngrok の URL に書き換えると、次の事故が起きる。

- 公式アカウントの友だちが LIFF を開くと、本番ではなく開発者のローカル環境に繋がる
- Mac を閉じる・ngrok を止めた瞬間に、本番が落ちたのと同じ状態になる
- ngrok の URL は起動のたびに変わるため、戻し忘れが起きやすい

これを構造的に防ぐため、同一チャネル内に LIFF アプリを2つ持つ（[#273](https://github.com/tsukamotohiroaki/mahjong_score/issues/273)）。

```
プロバイダー
 └ チャネル（LINEログイン）
    ├ LIFFアプリ①（本番）→ endpoint: https://dxop25dcw25sl.cloudfront.net  ← 触らない
    └ LIFFアプリ②（開発）→ endpoint: ngrok の URL                          ← 毎回ここだけ更新する
```

チャネルとプロバイダーは分けない。Messaging API のプロバイダーは LIFF と同一である必要があり、
分けると公式アカウントとの連携が壊れるため。

> **書き換えてよいのは開発用 LIFF アプリのエンドポイントURLだけ。**
> 本番用 LIFF アプリの設定画面は、確認以外の目的で開かない。

## 通信経路

ngrok は Next.js（3001）だけをトンネルする。API は Next.js の rewrites が Rails（3000）へ
プロキシするため、Rails 用のトンネルは不要（詳細は [`api-proxy.md`](api-proxy.md)）。

```
LINE アプリ（実機）
  └─ https://xxxx.ngrok-free.app  →  ngrok  →  localhost:3001（Next.js）
                                                   └─ /api/* を localhost:3000（Rails）へプロキシ
```

## 手順

### 1. Rails と Next.js を起動する

```bash
docker compose up
```

別ターミナルで:

```bash
cd frontend && npm run dev
```

Next.js は 3001 番で起動する（`package.json` の `dev` スクリプト）。

### 2. ngrok を起動する

```bash
ngrok http 3001
```

表示された `https://xxxx.ngrok-free.app` の URL を控える。**この URL は ngrok を起動し直すたびに変わる。**

### 3. 開発用 LIFF アプリのエンドポイントURLを更新する

LINE Developers コンソール > 対象チャネル > LIFF タブ > **開発用の LIFF アプリ** を開き、
エンドポイントURLを手順2の ngrok の URL に更新する。

本番用の LIFF アプリと取り違えないこと（本番用のエンドポイントは CloudFront の URL）。

### 4. `.env.local` に開発用 LIFF ID を設定する

```
# frontend/.env.local
NEXT_PUBLIC_LIFF_ID=<開発用 LIFF アプリの LIFF ID>
```

`NEXT_PUBLIC_` 変数はビルド時に埋め込まれるため、変更後は `npm run dev` を再起動する。

この LIFF ID はスコア一覧画面の共有リンク（`https://liff.line.me/<LIFF ID>/games/<id>`）にも
使われる。開発用 LIFF ID のまま共有した URL は開発環境を指すので、他人には共有しない。

### 5. 実機の LINE から開く

`https://liff.line.me/<開発用 LIFF ID>` を自分とのトークに送り、実機の LINE から開く。
ローカルの画面が表示されれば成功。

### 6. 確認が終わったら

- ngrok は停止してよい（開発用 LIFF アプリのエンドポイントは古い URL のまま残るが、本番に影響はない）
- **本番の LIFF アプリのエンドポイントが CloudFront の URL のままであることを確認する**
- 本番相当の動作を見たい場合は `.env.local` を本番用 LIFF ID に戻す

## トラブルシューティング

| 症状 | 原因・対処 |
|---|---|
| 「LIFF ID が設定されていません」と表示される | `.env.local` の `NEXT_PUBLIC_LIFF_ID` が未設定。設定後 `npm run dev` を再起動する |
| 画面が真っ白・JS が動かない | `next.config.ts` の `allowedDevOrigins` に ngrok のドメインが含まれているか確認する |
| ngrok の警告ページが出る | ngrok 無料プランの初回警告。「Visit Site」で進む |
| API が 404 / 通信エラー | `docker compose up` で Rails（3000）が起動しているか確認する |
| 開いたら本番の画面が出る | 本番用 LIFF ID を開いている。開発用の LIFF ID か確認する |
