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
    └ LIFFアプリ②（開発）→ endpoint: ngrok の URL                          ← 更新してよいのはこちらだけ
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

表示された `https://xxxx.ngrok-free.dev` の URL を控える。

無料プランでもアカウントに固定ドメインが割り当てられている場合、**起動し直しても同じ URL になる**
（2026-08-22 の検証では3回の起動すべてで同一だった）。その場合は手順3の更新を省略できる。
URL が変わっていたときだけ手順3を実施する。

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

**再起動だけでは足りないことがある。** Turbopack が古いビルドキャッシュを使い回し、
変更前の LIFF ID が埋め込まれたままになる（2026-08-22 に実際に発生）。確実に反映するには
キャッシュごと消して起動する。

```bash
rm -rf .next && npm run dev
```

反映されたかは配信中の JS を直接見て確認できる。

```bash
curl -s http://localhost:3001/games/<id> | grep -o '/_next/static/chunks/[^"]*\.js' | sort -u \
  | while read c; do curl -s "http://localhost:3001$c" | grep -o '<チャネルID>-[A-Za-z0-9]\{8\}'; done | sort -u
```

この LIFF ID はスコア一覧画面の共有リンク（`https://liff.line.me/<LIFF ID>/games/<id>`）にも
使われる。開発用 LIFF ID のまま共有した URL は開発環境を指すので、他人には共有しない。

### 5. 実機の LINE から開く

`https://liff.line.me/<開発用 LIFF ID>` を自分とのトークに送り、実機の LINE から開く。
ローカルの画面が表示されれば成功。

### 6. 確認が終わったら

- ngrok は停止してよい（開発用 LIFF アプリのエンドポイントは古い URL のまま残るが、本番に影響はない）
- **本番の LIFF アプリのエンドポイントが CloudFront の URL のままであることを確認する**
- 本番相当の動作を見たい場合は `.env.local` を本番用 LIFF ID に戻す

## 実機で確認した挙動（記録）

Vitest は `navigator.share` をモックに差し替えるため、「呼び出し方が正しい」ことしか保証しない。
LINE アプリ内で実際にどちらの分岐に入るかは実機でしか分からないので、確認結果をここに残す。

| 確認日 | 項目 | 結果 |
|---|---|---|
| 2026-08-22 | LINE アプリ内ブラウザの `navigator.share` | **存在する**（共有シートが開いた） |

つまり LINE アプリ内では共有シート側の分岐に入る。クリップボードへのフォールバックは
デスクトップブラウザなど `navigator.share` がない環境向けの経路。

共有リンクの組み立て・スコア一覧の画面構造・LIFF SDK や Next.js のバージョンを変えたときは、
この確認をやり直して表を更新する。

## トラブルシューティング

| 症状 | 原因・対処 |
|---|---|
| 「LIFF ID が設定されていません」と表示される | `.env.local` の `NEXT_PUBLIC_LIFF_ID` が未設定。設定後 `npm run dev` を再起動する |
| 画面が真っ白・JS が動かない | `next.config.ts` の `allowedDevOrigins` に ngrok のドメインが含まれているか確認する |
| ngrok の警告ページが出る | ngrok 無料プランの初回警告。「Visit Site」で進む（同じブラウザなら1回だけ） |
| 「Visit Site」を押す前に画面が真っ白・データが出ない | 警告を通過するまで `/api/*` も警告HTMLを返すため。先に「Visit Site」を押す |
| 変更したはずの LIFF ID が反映されない | Turbopack のビルドキャッシュ。`rm -rf .next && npm run dev` で起動し直す |
| API が 404 / 通信エラー | `docker compose up` で Rails（3000）が起動しているか確認する |
| 開いたら本番の画面が出る | 本番用 LIFF ID を開いている。開発用の LIFF ID か確認する |
