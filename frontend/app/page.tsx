"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import liff from "@line/liff";

type Status = "loading" | "error";

// トップページは廃止し、メンバー入力画面へ直行させる（#216）。
// LIFF の初期化とログイン誘導だけをここで行い、成功したら /games/new へリダイレクトする。
export default function Page() {
  const router = useRouter();
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

      router.replace("/games/new");
    };

    initialize();
  }, [router]);

  if (status === "error") {
    return (
      <main style={{ padding: "2rem", textAlign: "center" }}>
        <p role="alert">{errorMessage}</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem", textAlign: "center" }}>
      <p>読み込み中…</p>
    </main>
  );
}
