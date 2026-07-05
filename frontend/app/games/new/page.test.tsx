import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, createGame } from "../../lib/api";
import NewGamePage from "./page";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// createGame だけモックし、ApiError などは実物をそのまま使う
vi.mock("../../lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/api")>()),
  createGame: vi.fn(),
}));

const mockedCreateGame = vi.mocked(createGame);

const createdGame = {
  id: 10,
  mochi_ten: 25000,
  kaeshi_ten: 30000,
  rank_1_bonus: 50,
  rank_2_bonus: 10,
  rank_3_bonus: -10,
  rank_4_bonus: -30,
  players: [],
  rounds: [],
  created_at: "2026-07-05T10:00:00Z",
};

async function fillPlayerNames(names: string[]) {
  const user = userEvent.setup();
  for (const [i, name] of names.entries()) {
    await user.type(screen.getByLabelText(`プレイヤー${i + 1}`), name);
  }
  return user;
}

describe("NewGamePage (ゲーム作成フォーム)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("プレイヤー4人分の入力欄とルールの初期値を表示する", () => {
    render(<NewGamePage />);

    [1, 2, 3, 4].forEach((i) => {
      expect(screen.getByLabelText(`プレイヤー${i}`)).toBeInTheDocument();
    });
    expect(screen.getByLabelText("持ち点")).toHaveValue(25000);
    expect(screen.getByLabelText("返し点")).toHaveValue(30000);
    expect(screen.getByLabelText("1位")).toHaveValue(50);
    expect(screen.getByLabelText("2位")).toHaveValue(10);
    expect(screen.getByLabelText("3位")).toHaveValue(-10);
    expect(screen.getByLabelText("4位")).toHaveValue(-30);
  });

  it("入力した値で createGame を呼び、成功したら一覧へ戻る", async () => {
    mockedCreateGame.mockResolvedValue(createdGame);
    render(<NewGamePage />);

    const user = await fillPlayerNames(["東", "南", "西", "北"]);
    await user.click(screen.getByRole("button", { name: "ゲーム開始" }));

    expect(mockedCreateGame).toHaveBeenCalledWith({
      mochi_ten: 25000,
      kaeshi_ten: 30000,
      rank_1_bonus: 50,
      rank_2_bonus: 10,
      rank_3_bonus: -10,
      rank_4_bonus: -30,
      players: ["東", "南", "西", "北"],
    });
    await vi.waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });
  });

  it("バリデーションエラー(422)のメッセージを表示する", async () => {
    mockedCreateGame.mockRejectedValue(
      new ApiError(["順位点の合計が正しくありません（現在: 0、期待値: 20）"])
    );
    render(<NewGamePage />);

    const user = await fillPlayerNames(["東", "南", "西", "北"]);
    await user.click(screen.getByRole("button", { name: "ゲーム開始" }));

    expect(
      await screen.findByText(/順位点の合計が正しくありません/)
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("送信中はボタンが無効になり二重送信できない", async () => {
    // 解決しない Promise で送信中の状態を保つ
    mockedCreateGame.mockReturnValue(new Promise(() => {}));
    render(<NewGamePage />);

    const user = await fillPlayerNames(["東", "南", "西", "北"]);
    const button = screen.getByRole("button", { name: "ゲーム開始" });
    await user.click(button);
    await user.click(button);

    expect(mockedCreateGame).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
  });
});
