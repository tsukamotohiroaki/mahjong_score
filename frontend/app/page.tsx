"use client";

import { useEffect, useState } from "react";
import liff from "@line/liff";
import GameList from "./components/GameList";
import { getGames, type GameSummary } from "./lib/api";

type Status = "loading" | "ready" | "error";

export default function Page() {
  const [status, setStatus] = useState<Status>("loading");
  const [games, setGames] = useState<GameSummary[]>([]);
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

      try {
        setGames(await getGames());
        setStatus("ready");
      } catch {
        setErrorMessage(
          "ゲーム一覧の取得に失敗しました。時間をおいて再読み込みしてください"
        );
        setStatus("error");
      }
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

  return <GameList games={games} />;
}
