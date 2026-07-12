import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, createRound, getGame } from "../../../../lib/api";
import NewRoundPage from "./page";

const { pushMock, searchParamsHolder } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  searchParamsHolder: { query: "" },
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "1" }),
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams(searchParamsHolder.query),
}));

// getGame / createRound だけモックし、ApiError などは実物をそのまま使う
vi.mock("../../../../lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../../lib/api")>()),
  getGame: vi.fn(),
  createRound: vi.fn(),
}));

const mockedGetGame = vi.mocked(getGame);
const mockedCreateRound = vi.mocked(createRound);

// 1・2回戦が入力済みのゲーム（次は3回戦）
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
  rounds: [
    { id: 1, round_number: 1, scores: [] },
    { id: 2, round_number: 2, scores: [] },
  ],
  created_at: "2026-07-01T10:00:00Z",
};

const createdRound = {
  id: 3,
  round_number: 3,
  scores: [
    { player_id: 1, ranking_score: 62.0, rank: 1 },
    { player_id: 2, ranking_score: 10.0, rank: 2 },
    { player_id: 3, ranking_score: -20.0, rank: 3 },
    { player_id: 4, ranking_score: -52.0, rank: 4 },
  ],
};

// 東・南・西の3人分を入力する（北は自動計算対象）
async function fillThreeScores(values: [string, string, string]) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("東の点数"), values[0]);
  await user.type(screen.getByLabelText("南の点数"), values[1]);
  await user.type(screen.getByLabelText("西の点数"), values[2]);
  return user;
}

describe("NewRoundPage (点数入力フォーム)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsHolder.query = "";
    mockedGetGame.mockResolvedValue(game);
  });

  it("プレイヤー4人分の入力欄と回戦番号を表示する", async () => {
    render(<NewRoundPage />);

    expect(await screen.findByLabelText("東の点数")).toBeInTheDocument();
    expect(screen.getByLabelText("南の点数")).toBeInTheDocument();
    expect(screen.getByLabelText("西の点数")).toBeInTheDocument();
    expect(screen.getByLabelText("北の点数")).toBeInTheDocument();
    // 未指定なら次の回戦（入力済み最大 2 + 1）
    expect(screen.getByText("3回戦")).toBeInTheDocument();
    expect(mockedGetGame).toHaveBeenCalledWith(1);
  });

  it("入力に応じて合計（点数換算）を表示する", async () => {
    render(<NewRoundPage />);
    await screen.findByLabelText("東の点数");

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("東の点数"), "350");

    // 350（百点棒単位）→ 35000点
    expect(screen.getByText("35000")).toBeInTheDocument();
  });

  it("3人入力すると残り1人が自動計算される", async () => {
    render(<NewRoundPage />);
    await screen.findByLabelText("東の点数");

    await fillThreeScores(["350", "300", "250"]);

    expect(screen.getByLabelText("北の点数")).toHaveValue("100");
    expect(screen.getByText("100000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "入力完了" })).toBeEnabled();
  });

  it("自動計算された欄を手入力すると自動計算の対象から外れる", async () => {
    render(<NewRoundPage />);
    await screen.findByLabelText("東の点数");

    const user = await fillThreeScores(["350", "300", "250"]);
    // 自動計算された北を手で書き換える
    await user.clear(screen.getByLabelText("北の点数"));
    await user.type(screen.getByLabelText("北の点数"), "90");
    // 他の欄を変更しても北は再計算されない
    await user.clear(screen.getByLabelText("東の点数"));
    await user.type(screen.getByLabelText("東の点数"), "340");

    expect(screen.getByLabelText("北の点数")).toHaveValue("90");
  });

  it("合計が100,000点にならない場合は送信できずメッセージを表示する", async () => {
    render(<NewRoundPage />);
    await screen.findByLabelText("東の点数");

    const user = await fillThreeScores(["350", "300", "250"]);
    await user.clear(screen.getByLabelText("北の点数"));
    await user.type(screen.getByLabelText("北の点数"), "90");

    expect(screen.getByRole("button", { name: "入力完了" })).toBeDisabled();
    expect(
      screen.getByText("入力内容を確認してください")
    ).toBeInTheDocument();
  });

  it("範囲外の値（±1000超）では送信できない", async () => {
    render(<NewRoundPage />);
    await screen.findByLabelText("東の点数");

    await fillThreeScores(["1001", "300", "250"]);

    expect(screen.getByRole("button", { name: "入力完了" })).toBeDisabled();
  });

  it("有効な入力で送信すると createRound を呼び、スコア一覧へ戻る", async () => {
    mockedCreateRound.mockResolvedValue(createdRound);
    render(<NewRoundPage />);
    await screen.findByLabelText("東の点数");

    const user = await fillThreeScores(["350", "300", "250"]);
    await user.click(screen.getByRole("button", { name: "入力完了" }));

    expect(mockedCreateRound).toHaveBeenCalledWith(1, {
      round_number: 3,
      scores: [
        { player_id: 1, point: 350 },
        { player_id: 2, point: 300 },
        { player_id: 3, point: 250 },
        { player_id: 4, point: 100 },
      ],
    });
    await vi.waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/games/1");
    });
  });

  it("round_number 指定時はその回戦として上書き保存する", async () => {
    searchParamsHolder.query = "round_number=2";
    mockedCreateRound.mockResolvedValue({ ...createdRound, round_number: 2 });
    render(<NewRoundPage />);
    await screen.findByLabelText("東の点数");

    expect(screen.getByText("2回戦")).toBeInTheDocument();

    const user = await fillThreeScores(["350", "300", "250"]);
    await user.click(screen.getByRole("button", { name: "入力完了" }));

    expect(mockedCreateRound).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ round_number: 2 })
    );
  });

  it("API エラー時にメッセージを表示する", async () => {
    mockedCreateRound.mockRejectedValue(
      new ApiError(["点数の合計が 1000 になりません"])
    );
    render(<NewRoundPage />);
    await screen.findByLabelText("東の点数");

    const user = await fillThreeScores(["350", "300", "250"]);
    await user.click(screen.getByRole("button", { name: "入力完了" }));

    expect(
      await screen.findByText(/点数の合計が 1000 になりません/)
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
