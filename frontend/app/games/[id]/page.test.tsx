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

// 2局分入力済みのゲーム（合計: 東75.0 / 南60.0 / 西-45.0 / 北-90.0）
const gameWithRounds = {
  ...game,
  rounds: [
    {
      id: 1,
      round_number: 1,
      scores: [
        { player_id: 1, ranking_score: 62.0, rank: 1 },
        { player_id: 2, ranking_score: 10.0, rank: 2 },
        { player_id: 3, ranking_score: -20.0, rank: 3 },
        { player_id: 4, ranking_score: -52.0, rank: 4 },
      ],
    },
    {
      id: 2,
      round_number: 2,
      scores: [
        { player_id: 1, ranking_score: 13.0, rank: 2 },
        { player_id: 2, ranking_score: 50.0, rank: 1 },
        { player_id: 3, ranking_score: -25.0, rank: 3 },
        { player_id: 4, ranking_score: -38.0, rank: 4 },
      ],
    },
  ],
};

describe("GameDetailPage (スコア一覧)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("プレイヤー名を表示する", async () => {
    mockedGetGame.mockResolvedValue(game);

    render(<GameDetailPage />);

    expect(await screen.findByText("東")).toBeInTheDocument();
    expect(screen.getByText("南")).toBeInTheDocument();
    expect(screen.getByText("西")).toBeInTheDocument();
    expect(screen.getByText("北")).toBeInTheDocument();
    expect(mockedGetGame).toHaveBeenCalledWith(1);
  });

  it("入力済みの局の順位点と合計を表示する", async () => {
    mockedGetGame.mockResolvedValue(gameWithRounds);

    render(<GameDetailPage />);

    // 各局の順位点
    expect(await screen.findByText("62.0")).toBeInTheDocument();
    expect(screen.getByText("-52.0")).toBeInTheDocument();
    expect(screen.getByText("50.0")).toBeInTheDocument();
    // プレイヤーごとの合計
    expect(screen.getByText("75.0")).toBeInTheDocument();
    expect(screen.getByText("-90.0")).toBeInTheDocument();
  });

  it("局番号から点数入力画面へのリンクを表示する（12局分）", async () => {
    mockedGetGame.mockResolvedValue(gameWithRounds);

    render(<GameDetailPage />);

    expect(await screen.findByRole("link", { name: "1" })).toHaveAttribute(
      "href",
      "/games/1/rounds/new?round_number=1"
    );
    // 未入力の局にもリンクがある
    expect(screen.getByRole("link", { name: "12" })).toHaveAttribute(
      "href",
      "/games/1/rounds/new?round_number=12"
    );
  });

  it("トップへ戻るリンクを表示する", async () => {
    mockedGetGame.mockResolvedValue(game);

    render(<GameDetailPage />);

    expect(
      await screen.findByRole("link", { name: /トップに戻る/ })
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
