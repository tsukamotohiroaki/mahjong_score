import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import GameList from "./GameList";

const games = [
  {
    id: 1,
    mochi_ten: 25000,
    kaeshi_ten: 30000,
    players: [
      { id: 1, name: "東" },
      { id: 2, name: "南" },
      { id: 3, name: "西" },
      { id: 4, name: "北" },
    ],
    rounds_count: 2,
    created_at: "2026-07-01T10:00:00Z",
  },
  {
    id: 2,
    mochi_ten: 30000,
    kaeshi_ten: 30000,
    players: [
      { id: 5, name: "春" },
      { id: 6, name: "夏" },
      { id: 7, name: "秋" },
      { id: 8, name: "冬" },
    ],
    rounds_count: 0,
    created_at: "2026-07-02T10:00:00Z",
  },
];

describe("GameList", () => {
  it("各ゲームのプレイヤー名とラウンド数を表示する", () => {
    render(<GameList games={games} />);

    expect(screen.getByText(/東、南、西、北/)).toBeInTheDocument();
    expect(screen.getByText(/春、夏、秋、冬/)).toBeInTheDocument();
    expect(screen.getByText(/2 ラウンド/)).toBeInTheDocument();
    expect(screen.getByText(/0 ラウンド/)).toBeInTheDocument();
  });

  it("各ゲームがゲーム詳細ページへのリンクになっている", () => {
    render(<GameList games={games} />);

    expect(
      screen.getByRole("link", { name: /東、南、西、北/ })
    ).toHaveAttribute("href", "/games/1");
  });

  it("新規ゲーム作成へのリンクを表示する", () => {
    render(<GameList games={games} />);

    expect(screen.getByRole("link", { name: /新規ゲーム/ })).toHaveAttribute(
      "href",
      "/games/new"
    );
  });

  it("ゲームが 0 件のときは空メッセージを表示する", () => {
    render(<GameList games={[]} />);

    expect(screen.getByText(/まだゲームがありません/)).toBeInTheDocument();
  });
});
