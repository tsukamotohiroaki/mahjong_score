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

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
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

  it("ログイン済みならメンバー入力画面（/games/new）へリダイレクトする", async () => {
    mockedLiff.init.mockResolvedValue(undefined);
    mockedLiff.isLoggedIn.mockReturnValue(true);

    render(<Page />);

    await vi.waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/games/new");
    });
    expect(mockedLiff.init).toHaveBeenCalledWith({ liffId: "test-liff-id" });
  });

  it("未ログイン時は liff.login() を呼んでログインへ誘導し、リダイレクトしない", async () => {
    mockedLiff.init.mockResolvedValue(undefined);
    mockedLiff.isLoggedIn.mockReturnValue(false);

    render(<Page />);

    await vi.waitFor(() => {
      expect(mockedLiff.login).toHaveBeenCalled();
    });
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("liff.init 失敗時はエラーメッセージを表示し、リダイレクトしない", async () => {
    mockedLiff.init.mockRejectedValue(new Error("init failed"));

    render(<Page />);

    expect(await screen.findByText(/初期化に失敗/)).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
