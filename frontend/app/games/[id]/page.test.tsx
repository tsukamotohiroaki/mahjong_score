import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

  it("日付を MPA 版と同じゼロ埋め形式で表示する", async () => {
    mockedGetGame.mockResolvedValue(game);

    render(<GameDetailPage />);

    // created_at: 2026-07-01T10:00:00Z（JST 2026/07/01）
    expect(await screen.findByText("2026/07/01")).toBeInTheDocument();
  });

  it("マイナスの順位点と合計に negative クラスを付ける（赤字表示）", async () => {
    mockedGetGame.mockResolvedValue(gameWithRounds);

    render(<GameDetailPage />);

    // 各局のマイナス順位点
    expect(await screen.findByText("-52.0")).toHaveClass("negative");
    // マイナスの合計
    expect(screen.getByText("-90.0")).toHaveClass("negative");
    // プラスの値には付かない
    expect(screen.getByText("62.0")).not.toHaveClass("negative");
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

  // トップページ廃止（#216）に伴い、導線は「新しいゲームを始める」に変更。
  // `/` 経由のリダイレクト1ホップと LIFF 初期化待ちを避けるため /games/new を直接指す
  it("「新しいゲームを始める」リンクが /games/new を指す", async () => {
    mockedGetGame.mockResolvedValue(game);

    render(<GameDetailPage />);

    expect(
      await screen.findByRole("link", { name: /新しいゲームを始める/ })
    ).toHaveAttribute("href", "/games/new");
  });

  it("取得に失敗したらエラーメッセージを表示する", async () => {
    mockedGetGame.mockRejectedValue(new ApiError(["ゲームが見つかりません"]));

    render(<GameDetailPage />);

    expect(
      await screen.findByText(/ゲームが見つかりません/)
    ).toBeInTheDocument();
  });
});

describe("GameDetailPage (URLを共有する)", () => {
  const shareUrl = "https://liff.line.me/test-liff-id/games/1";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_LIFF_ID", "test-liff-id");
    mockedGetGame.mockResolvedValue(game);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    // テストごとに navigator へ生やしたモックを片付ける
    Reflect.deleteProperty(window.navigator, "share");
    Reflect.deleteProperty(window.navigator, "clipboard");
  });

  it("「URLを共有する」ボタンを表示する", async () => {
    render(<GameDetailPage />);

    expect(
      await screen.findByRole("button", { name: "URLを共有する" })
    ).toBeInTheDocument();
  });

  it("navigator.share が使える環境では LIFF リンク付きで共有シートを開く", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "share", {
      value: share,
      configurable: true,
    });

    render(<GameDetailPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "URLを共有する" })
    );

    await vi.waitFor(() => {
      expect(share).toHaveBeenCalledWith({
        title: "麻雀スコア",
        url: shareUrl,
      });
    });
  });

  it("navigator.share がない環境ではコピーして「コピーしました！」を2秒表示する", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<GameDetailPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "URLを共有する" })
    );

    expect(
      await screen.findByRole("button", { name: "コピーしました！" })
    ).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(shareUrl);

    // 2秒後に元の文言へ戻る
    await vi.waitFor(
      () => {
        expect(
          screen.getByRole("button", { name: "URLを共有する" })
        ).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("共有シートをキャンセルしてもエラーにならない", async () => {
    const share = vi
      .fn()
      .mockRejectedValue(new DOMException("Share canceled", "AbortError"));
    Object.defineProperty(window.navigator, "share", {
      value: share,
      configurable: true,
    });

    render(<GameDetailPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "URLを共有する" })
    );

    await vi.waitFor(() => {
      expect(share).toHaveBeenCalled();
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
