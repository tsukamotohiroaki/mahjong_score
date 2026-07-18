// バックエンドの JSON API（/api/v1）を呼び出す共通クライアント。
// 開発環境では next.config.ts の rewrites() で Rails（localhost:3000）にプロキシされる。

export type Player = {
  id: number;
  name: string;
};

export type RoundScore = {
  player_id: number;
  ranking_score: number | null;
  rank: number | null;
};

export type Round = {
  id: number;
  round_number: number;
  scores: RoundScore[];
};

export type GameDetail = {
  id: number;
  mochi_ten: number;
  kaeshi_ten: number;
  rank_1_bonus: number;
  rank_2_bonus: number;
  rank_3_bonus: number;
  rank_4_bonus: number;
  players: Player[];
  rounds: Round[];
  created_at: string;
};

export type CreateRoundParams = {
  round_number: number;
  // point は百点棒単位（350 = 35,000点）
  scores: { player_id: number; point: number }[];
};

export type CreateGameParams = {
  mochi_ten: number;
  kaeshi_ten: number;
  rank_1_bonus: number;
  rank_2_bonus: number;
  rank_3_bonus: number;
  rank_4_bonus: number;
  players: string[];
};

// API のエラーを表す例外。messages は画面にそのまま表示できる日本語メッセージ。
export class ApiError extends Error {
  messages: string[];
  status: number;

  constructor(messages: string[], status = 0) {
    super(messages.join("、"));
    this.name = "ApiError";
    this.messages = messages;
    this.status = status;
  }
}

async function extractErrorMessages(response: Response): Promise<string[]> {
  try {
    const body = await response.json();
    if (Array.isArray(body?.errors) && body.errors.length > 0) {
      return body.errors;
    }
  } catch {
    // JSON でないレスポンスは汎用メッセージにフォールバックする
  }
  return [`サーバーエラーが発生しました（HTTP ${response.status}）`];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = init ? await fetch(path, init) : await fetch(path);
  } catch {
    throw new ApiError([
      "通信に失敗しました。ネットワーク状態を確認してください",
    ]);
  }

  if (!response.ok) {
    throw new ApiError(await extractErrorMessages(response), response.status);
  }

  return (await response.json()) as T;
}

export async function getGame(id: number): Promise<GameDetail> {
  return request<GameDetail>(`/api/v1/games/${id}`);
}

export async function createGame(
  params: CreateGameParams
): Promise<GameDetail> {
  return request<GameDetail>("/api/v1/games", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
}

export async function createRound(
  gameId: number,
  params: CreateRoundParams
): Promise<Round> {
  return request<Round>(`/api/v1/games/${gameId}/rounds`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
}
