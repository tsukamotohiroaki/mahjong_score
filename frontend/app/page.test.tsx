import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import liff from "@line/liff";
import { getGames } from "./lib/api";
import Page from "./page";

vi.mock("@line/liff", () => ({
  default: {
    init: vi.fn(),
    isLoggedIn: vi.fn(),
    login: vi.fn(),
  },
}));

// getGames だけモックし、ApiError などは実物をそのまま使う
vi.mock("./lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./lib/api")>()),
  getGames: vi.fn(),
}));

const mockedLiff = vi.mocked(liff, true);
const mockedGetGames = vi.mocked(getGames);

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
];

describe("Page (ゲーム一覧)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_LIFF_ID", "test-liff-id");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("初期化中はローディングを表示する", () => {
    mockedLiff.init.mockReturnValue(new Promise(() => {}));
    render(<Page />);
    expect(screen.getByText(/読み込み中/)).toBeInTheDocument();
  });

  it("ログイン済みならゲーム一覧を取得して表示する", async () => {
    mockedLiff.init.mockResolvedValue(undefined);
    mockedLiff.isLoggedIn.mockReturnValue(true);
    mockedGetGames.mockResolvedValue(games);

    render(<Page />);

    expect(await screen.findByText(/東、南、西、北/)).toBeInTheDocument();
    expect(mockedLiff.init).toHaveBeenCalledWith({ liffId: "test-liff-id" });
  });

  it("未ログイン時は liff.login() を呼んでログインへ誘導する", async () => {
    mockedLiff.init.mockResolvedValue(undefined);
    mockedLiff.isLoggedIn.mockReturnValue(false);

    render(<Page />);

    await vi.waitFor(() => {
      expect(mockedLiff.login).toHaveBeenCalled();
    });
    // 未ログインでは一覧を取得しない
    expect(mockedGetGames).not.toHaveBeenCalled();
  });

  it("liff.init 失敗時はエラーメッセージを表示する", async () => {
    mockedLiff.init.mockRejectedValue(new Error("init failed"));

    render(<Page />);

    expect(await screen.findByText(/初期化に失敗/)).toBeInTheDocument();
  });

  it("一覧取得に失敗したらエラーメッセージを表示する", async () => {
    mockedLiff.init.mockResolvedValue(undefined);
    mockedLiff.isLoggedIn.mockReturnValue(true);
    mockedGetGames.mockRejectedValue(new Error("fetch failed"));

    render(<Page />);

    expect(
      await screen.findByText(/ゲーム一覧の取得に失敗/)
    ).toBeInTheDocument();
  });
});
