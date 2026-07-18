import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import liff from "@line/liff";
import Page from "./page";

vi.mock("@line/liff", () => ({
  default: {
    init: vi.fn(),
    isLoggedIn: vi.fn(),
    login: vi.fn(),
  },
}));

const mockedLiff = vi.mocked(liff, true);

describe("Page (トップ)", () => {
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

  it("ログイン済みならタイトルと「新しく始める」ボタンを表示する", async () => {
    mockedLiff.init.mockResolvedValue(undefined);
    mockedLiff.isLoggedIn.mockReturnValue(true);

    render(<Page />);

    expect(
      await screen.findByRole("heading", { name: "麻雀スコア管理アプリ" })
    ).toBeInTheDocument();
    const startLink = screen.getByRole("link", { name: "新しく始める" });
    expect(startLink).toHaveAttribute("href", "/games/new");
    expect(mockedLiff.init).toHaveBeenCalledWith({ liffId: "test-liff-id" });
  });

  it("ゲーム一覧と「つづきから」ボタンは表示しない", async () => {
    mockedLiff.init.mockResolvedValue(undefined);
    mockedLiff.isLoggedIn.mockReturnValue(true);

    render(<Page />);

    await screen.findByRole("heading", { name: "麻雀スコア管理アプリ" });
    expect(screen.queryByText(/ゲーム一覧/)).not.toBeInTheDocument();
    expect(screen.queryByText("つづきから")).not.toBeInTheDocument();
  });

  it("未ログイン時は liff.login() を呼んでログインへ誘導する", async () => {
    mockedLiff.init.mockResolvedValue(undefined);
    mockedLiff.isLoggedIn.mockReturnValue(false);

    render(<Page />);

    await vi.waitFor(() => {
      expect(mockedLiff.login).toHaveBeenCalled();
    });
    // 未ログインではトップの内容を表示しない
    expect(
      screen.queryByRole("link", { name: "新しく始める" })
    ).not.toBeInTheDocument();
  });

  it("liff.init 失敗時はエラーメッセージを表示する", async () => {
    mockedLiff.init.mockRejectedValue(new Error("init failed"));

    render(<Page />);

    expect(await screen.findByText(/初期化に失敗/)).toBeInTheDocument();
  });
});
