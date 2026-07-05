"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ApiError, getGame, type GameDetail } from "../../lib/api";

type Status = "loading" | "ready" | "error";

// ゲーム詳細（プレイヤー・ルールの確認）。点数入力機能は #158 で追加する。
export default function GameDetailPage() {
  const params = useParams<{ id: string }>();
  const [status, setStatus] = useState<Status>("loading");
  const [game, setGame] = useState<GameDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setGame(await getGame(Number(params.id)));
        setStatus("ready");
      } catch (error) {
        setErrorMessage(
          error instanceof ApiError
            ? error.messages.join("、")
            : "ゲームの取得に失敗しました。時間をおいて再読み込みしてください"
        );
        setStatus("error");
      }
    };

    load();
  }, [params.id]);

  if (status === "loading") {
    return (
      <main style={{ padding: "2rem", textAlign: "center" }}>
        <p>読み込み中…</p>
      </main>
    );
  }

  if (status === "error" || game === null) {
    return (
      <main style={{ padding: "2rem", textAlign: "center" }}>
        <p role="alert">{errorMessage}</p>
        <p>
          <Link href="/">← 一覧に戻る</Link>
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: "1.5rem" }}>
      <h1>ゲーム詳細</h1>

      <h2>メンバー</h2>
      <ul>
        {game.players.map((player) => (
          <li key={player.id}>{player.name}</li>
        ))}
      </ul>

      <h2>ルール</h2>
      <ul>
        <li>持ち点: {game.mochi_ten}</li>
        <li>返し点: {game.kaeshi_ten}</li>
        <li>
          順位点: {game.rank_1_bonus} / {game.rank_2_bonus} /{" "}
          {game.rank_3_bonus} / {game.rank_4_bonus}
        </li>
      </ul>

      <p>点数入力機能は準備中です。</p>

      <p>
        <Link href="/">← 一覧に戻る</Link>
      </p>
    </main>
  );
}
