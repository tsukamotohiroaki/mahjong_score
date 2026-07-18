"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ApiError, getGame, type GameDetail } from "../../lib/api";

// MPA 版 games#show と同じく 12 局分の枠を表示する
const ROUND_COUNT = 12;

type Status = "loading" | "ready" | "error";

// スコア一覧（MPA 版 games#show の移植）。局番号から点数入力画面へ遷移する。
export default function GameDetailPage() {
  const params = useParams<{ id: string }>();
  const [status, setStatus] = useState<Status>("loading");
  const [game, setGame] = useState<GameDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [shareLabel, setShareLabel] = useState("URLを共有する");

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
          <Link href="/">← トップに戻る</Link>
        </p>
      </main>
    );
  }

  const findRankingScore = (roundNumber: number, playerId: number) => {
    const round = game.rounds.find((r) => r.round_number === roundNumber);
    const score = round?.scores.find((s) => s.player_id === playerId);
    return score?.ranking_score ?? null;
  };

  const totalRankingScore = (playerId: number) =>
    game.rounds.reduce((sum, round) => {
      const score = round.scores.find((s) => s.player_id === playerId);
      return sum + (score?.ranking_score ?? 0);
    }, 0);

  // MPA 版 games#show と同挙動: 共有シートが使えなければクリップボードコピーにフォールバック
  const handleShare = async () => {
    const url = `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}/games/${game.id}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "麻雀スコア", url });
      } catch {
        // 共有シートのキャンセルはエラー扱いしない
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setShareLabel("コピーしました！");
      setTimeout(() => setShareLabel("URLを共有する"), 2000);
    } catch {
      // コピーできない環境では何もしない
    }
  };

  return (
    <main style={{ padding: "1.5rem" }}>
      <h1>スコア一覧</h1>

      <p>{new Date(game.created_at).toLocaleDateString("ja-JP")}</p>

      <table>
        <thead>
          <tr>
            <th></th>
            {game.players.map((player) => (
              <th key={player.id}>{player.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: ROUND_COUNT }, (_, i) => i + 1).map(
            (roundNumber) => (
              <tr key={roundNumber}>
                <td>
                  <Link
                    href={`/games/${game.id}/rounds/new?round_number=${roundNumber}`}
                  >
                    {roundNumber}
                  </Link>
                </td>
                {game.players.map((player) => {
                  const score = findRankingScore(roundNumber, player.id);
                  return (
                    <td key={player.id}>
                      {score != null ? score.toFixed(1) : ""}
                    </td>
                  );
                })}
              </tr>
            )
          )}
        </tbody>
        <tfoot>
          <tr>
            <td>合計</td>
            {game.players.map((player) => (
              <td key={player.id}>{totalRankingScore(player.id).toFixed(1)}</td>
            ))}
          </tr>
        </tfoot>
      </table>

      <p>
        <button type="button" onClick={handleShare}>
          {shareLabel}
        </button>
      </p>

      <p>
        <Link href="/">← トップに戻る</Link>
      </p>
    </main>
  );
}
