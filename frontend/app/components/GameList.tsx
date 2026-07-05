import Link from "next/link";
import type { GameSummary } from "../lib/api";

type GameListProps = {
  games: GameSummary[];
};

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("ja-JP");
}

// ゲーム一覧を表示するだけの純粋な表示部品
export default function GameList({ games }: GameListProps) {
  return (
    <main style={{ padding: "1.5rem" }}>
      <h1>ゲーム一覧</h1>
      <p>
        <Link href="/games/new">新規ゲーム作成</Link>
      </p>
      {games.length === 0 ? (
        <p>まだゲームがありません。「新規ゲーム作成」から始めましょう。</p>
      ) : (
        <ul>
          {games.map((game) => (
            <li key={game.id}>
              <Link href={`/games/${game.id}`}>
                {formatDate(game.created_at)}{" "}
                {game.players.map((player) => player.name).join("、")}（
                {game.rounds_count} ラウンド）
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
