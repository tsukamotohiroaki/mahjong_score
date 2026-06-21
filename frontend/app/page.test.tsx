import { render, screen } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import liff from "@line/liff";
import Page from "./page";

vi.mock("@line/liff", () => ({
  default: {
    init: vi.fn(),
    isLoggedIn: vi.fn(),
    login: vi.fn(),
    getProfile: vi.fn(),
  },
}));

const mockedLiff = vi.mocked(liff, true);

describe("Page (LIFF Hello World)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_LIFF_ID", "test-liff-id");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("初期化中はローディングを表示する", () => {
    // init が解決しない Promise を返すことでローディング状態を保つ
    mockedLiff.init.mockReturnValue(new Promise(() => {}));
    render(<Page />);
    expect(screen.getByText(/読み込み中/)).toBeInTheDocument();
  });

  it("ログイン済みならプロフィールの表示名を表示する", async () => {
    mockedLiff.init.mockResolvedValue(undefined);
    mockedLiff.isLoggedIn.mockReturnValue(true);
    mockedLiff.getProfile.mockResolvedValue({
      userId: "U123",
      displayName: "花子",
      pictureUrl: "",
      statusMessage: "",
    });

    render(<Page />);

    expect(await screen.findByText("Hello World")).toBeInTheDocument();
    expect(screen.getByText(/花子/)).toBeInTheDocument();
    expect(mockedLiff.init).toHaveBeenCalledWith({ liffId: "test-liff-id" });
  });

  it("未ログイン時は liff.login() を呼んでログインへ誘導する", async () => {
    mockedLiff.init.mockResolvedValue(undefined);
    mockedLiff.isLoggedIn.mockReturnValue(false);

    render(<Page />);

    // login() が呼ばれるまで待つ（リダイレクト相当）
    await vi.waitFor(() => {
      expect(mockedLiff.login).toHaveBeenCalled();
    });
    // 未ログインでは getProfile を呼ばない
    expect(mockedLiff.getProfile).not.toHaveBeenCalled();
  });

  it("liff.init 失敗時はエラーメッセージを表示する", async () => {
    mockedLiff.init.mockRejectedValue(new Error("init failed"));

    render(<Page />);

    expect(await screen.findByText(/初期化に失敗/)).toBeInTheDocument();
  });
});
