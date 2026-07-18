"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import liff from "@line/liff";

type Status = "loading" | "ready" | "error";

// トップ画面（MPA 版 home#index の移植）。タイトルと「新しく始める」ボタンだけを表示する。
export default function Page() {
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const initialize = async () => {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
      if (!liffId) {
        setErrorMessage("LIFF ID が設定されていません（NEXT_PUBLIC_LIFF_ID）");
        setStatus("error");
        return;
      }

      try {
        await liff.init({ liffId });

        // 外部ブラウザでは未ログインのことがある。その場合は LINE ログインへ誘導する
        // （リダイレクトされるため、戻ってきた後に再度この処理が走る）
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        setErrorMessage(`LIFF の初期化に失敗しました: ${detail}`);
        setStatus("error");
        return;
      }

      setStatus("ready");
    };

    initialize();
  }, []);

  if (status === "loading") {
    return (
      <main style={{ padding: "2rem", textAlign: "center" }}>
        <p>読み込み中…</p>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main style={{ padding: "2rem", textAlign: "center" }}>
        <p role="alert">{errorMessage}</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem", textAlign: "center" }}>
      <h1>麻雀スコア管理アプリ</h1>
      <p>
        <Link href="/games/new">新しく始める</Link>
      </p>
    </main>
  );
}
