import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, createGame, createRound, getGame, getGames } from "./api";

const gameSummary = {
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
};

const gameDetail = {
  ...gameSummary,
  rank_1_bonus: 50,
  rank_2_bonus: 10,
  rank_3_bonus: -10,
  rank_4_bonus: -30,
  rounds: [],
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("api クライアント", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const mockedFetch = () => vi.mocked(fetch);

  describe("getGames", () => {
    it("ゲーム一覧を配列で返す", async () => {
      mockedFetch().mockResolvedValue(jsonResponse({ games: [gameSummary] }));

      const games = await getGames();

      expect(mockedFetch()).toHaveBeenCalledWith("/api/v1/games");
      expect(games).toHaveLength(1);
      expect(games[0].players.map((p) => p.name)).toEqual([
        "東",
        "南",
        "西",
        "北",
      ]);
    });

    it("サーバーエラー時は ApiError を投げる", async () => {
      mockedFetch().mockResolvedValue(jsonResponse({}, 500));

      await expect(getGames()).rejects.toBeInstanceOf(ApiError);
    });

    it("ネットワークエラー時も ApiError を投げる", async () => {
      mockedFetch().mockRejectedValue(new TypeError("Failed to fetch"));

      await expect(getGames()).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe("getGame", () => {
    it("ゲーム詳細を返す", async () => {
      mockedFetch().mockResolvedValue(jsonResponse(gameDetail));

      const game = await getGame(1);

      expect(mockedFetch()).toHaveBeenCalledWith("/api/v1/games/1");
      expect(game.rank_1_bonus).toBe(50);
    });

    it("404 のときはサーバーのエラーメッセージを持つ ApiError を投げる", async () => {
      mockedFetch().mockResolvedValue(
        jsonResponse({ errors: ["ゲームが見つかりません"] }, 404)
      );

      await expect(getGame(999)).rejects.toMatchObject({
        messages: ["ゲームが見つかりません"],
      });
    });
  });

  describe("createGame", () => {
    const params = {
      mochi_ten: 25000,
      kaeshi_ten: 30000,
      rank_1_bonus: 50,
      rank_2_bonus: 10,
      rank_3_bonus: -10,
      rank_4_bonus: -30,
      players: ["東", "南", "西", "北"],
    };

    it("入力値を JSON で POST し、作成されたゲームを返す", async () => {
      mockedFetch().mockResolvedValue(jsonResponse(gameDetail, 201));

      const game = await createGame(params);

      expect(mockedFetch()).toHaveBeenCalledWith("/api/v1/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      expect(game.id).toBe(1);
    });

    it("422 のときはバリデーションメッセージを持つ ApiError を投げる", async () => {
      mockedFetch().mockResolvedValue(
        jsonResponse(
          { errors: ["順位点の合計が正しくありません（現在: 0、期待値: 20）"] },
          422
        )
      );

      await expect(createGame(params)).rejects.toMatchObject({
        messages: ["順位点の合計が正しくありません（現在: 0、期待値: 20）"],
      });
    });
  });

  describe("createRound", () => {
    // point は百点棒単位（350 = 35,000点）
    const params = {
      round_number: 3,
      scores: [
        { player_id: 1, point: 350 },
        { player_id: 2, point: 300 },
        { player_id: 3, point: 250 },
        { player_id: 4, point: 100 },
      ],
    };

    const roundDetail = {
      id: 5,
      round_number: 3,
      scores: [
        { player_id: 1, ranking_score: 62.0, rank: 1 },
        { player_id: 2, ranking_score: 10.0, rank: 2 },
        { player_id: 3, ranking_score: -20.0, rank: 3 },
        { player_id: 4, ranking_score: -52.0, rank: 4 },
      ],
    };

    it("点数を JSON で POST し、作成された局を返す", async () => {
      mockedFetch().mockResolvedValue(jsonResponse(roundDetail, 201));

      const round = await createRound(1, params);

      expect(mockedFetch()).toHaveBeenCalledWith("/api/v1/games/1/rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      expect(round.round_number).toBe(3);
    });

    it("422 のときはバリデーションメッセージを持つ ApiError を投げる", async () => {
      mockedFetch().mockResolvedValue(
        jsonResponse({ errors: ["点数の合計が 1000 になりません"] }, 422)
      );

      await expect(createRound(1, params)).rejects.toMatchObject({
        messages: ["点数の合計が 1000 になりません"],
      });
    });
  });
});
