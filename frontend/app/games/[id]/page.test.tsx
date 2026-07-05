import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, getGame } from "../../lib/api";
import GameDetailPage from "./page";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "1" }),
}));

// getGame だけモックし、ApiError などは実物をそのまま使う
vi.mock("../../lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/api")>()),
  getGame: vi.fn(),
}));

const mockedGetGame = vi.mocked(getGame);

const game = {
  id: 1,
  mochi_ten: 25000,
  kaeshi_ten: 30000,
  rank_1_bonus: 50,
  rank_2_bonus: 10,
  rank_3_bonus: -10,
  rank_4_bonus: -30,
  players: [
    { id: 1, name: "東" },
    { id: 2, name: "南" },
    { id: 3, name: "西" },
    { id: 4, name: "北" },
  ],
  rounds: [],
  created_at: "2026-07-01T10:00:00Z",
};

describe("GameDetailPage (ゲーム詳細)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("プレイヤー名とルールを表示する", async () => {
    mockedGetGame.mockResolvedValue(game);

    render(<GameDetailPage />);

    expect(await screen.findByText("東")).toBeInTheDocument();
    expect(screen.getByText("南")).toBeInTheDocument();
    expect(screen.getByText("西")).toBeInTheDocument();
    expect(screen.getByText("北")).toBeInTheDocument();
    expect(screen.getByText(/25000/)).toBeInTheDocument();
    expect(screen.getByText(/30000/)).toBeInTheDocument();
    expect(mockedGetGame).toHaveBeenCalledWith(1);
  });

  it("一覧へ戻るリンクを表示する", async () => {
    mockedGetGame.mockResolvedValue(game);

    render(<GameDetailPage />);

    expect(
      await screen.findByRole("link", { name: /一覧に戻る/ })
    ).toHaveAttribute("href", "/");
  });

  it("取得に失敗したらエラーメッセージを表示する", async () => {
    mockedGetGame.mockRejectedValue(new ApiError(["ゲームが見つかりません"]));

    render(<GameDetailPage />);

    expect(
      await screen.findByText(/ゲームが見つかりません/)
    ).toBeInTheDocument();
  });
});
