"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ApiError,
  createRound,
  getGame,
  type GameDetail,
} from "../../../../lib/api";
import {
  MAX_UNIT,
  MIN_UNIT,
  TARGET_UNITS,
  UNIT_SCALE,
  applyAutoCalc,
  parseValue,
  sumUnits,
  type ScoreFlag,
} from "../../../../lib/score-input";

type Status = "loading" | "ready" | "error";

// 点数入力フォーム（MPA 版 rounds#new の移植）。
// round_number 指定時は既存局の上書き編集になる。
export default function NewRoundPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const gameId = Number(params.id);

  const [status, setStatus] = useState<Status>("loading");
  const [game, setGame] = useState<GameDetail | null>(null);
  const [values, setValues] = useState<string[]>([]);
  const [flags, setFlags] = useState<ScoreFlag[]>([]);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const loaded = await getGame(gameId);
        setGame(loaded);
        setValues(Array(loaded.players.length).fill(""));
        setFlags(Array(loaded.players.length).fill(null));
        setStatus("ready");
      } catch (error) {
        setErrors(
          error instanceof ApiError
            ? error.messages
            : ["ゲームの取得に失敗しました。時間をおいて再読み込みしてください"]
        );
        setStatus("error");
      }
    };

    load();
  }, [gameId]);

  const requestedRoundNumber = parseValue(
    searchParams.get("round_number") ?? ""
  );
  const nextRoundNumber =
    game == null
      ? null
      : requestedRoundNumber ??
        Math.max(0, ...game.rounds.map((r) => r.round_number)) + 1;

  const handleChange = (index: number, raw: string) => {
    setHasInteracted(true);
    const inputValues = values.map((v, i) => (i === index ? raw : v));
    const inputFlags = flags.map<ScoreFlag>((f, i) =>
      i === index ? "manual" : f
    );
    const next = applyAutoCalc(inputValues, inputFlags);
    setValues(next.values);
    setFlags(next.flags);
  };

  const units = values.map(parseValue);
  const totalUnits = sumUnits(values);
  const allFilled = units.length > 0 && units.every((u) => u != null);
  const inRange = units.every(
    (u) => u == null || (u >= MIN_UNIT && u <= MAX_UNIT)
  );
  const isValid = allFilled && inRange && totalUnits === TARGET_UNITS;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid || submitting || game == null || nextRoundNumber == null) {
      return;
    }

    setSubmitting(true);
    setErrors([]);
    try {
      await createRound(gameId, {
        round_number: nextRoundNumber,
        scores: game.players.map((player, i) => ({
          player_id: player.id,
          point: units[i] as number,
        })),
      });
      router.push(`/games/${gameId}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.messages);
      } else {
        setErrors(["点数の保存に失敗しました。時間をおいて再度お試しください"]);
      }
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <main style={{ padding: "2rem", textAlign: "center" }}>
        <p>読み込み中…</p>
      </main>
    );
  }

  if (status === "error" || game === null) {
    return (
      <main style={{ padding: "2rem", textAlign: "center" }}>
        <p role="alert">{errors.join("、")}</p>
        <p>
          <Link href="/">← 一覧に戻る</Link>
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: "1.5rem" }}>
      <h1>点数入力</h1>
      <h2>{nextRoundNumber}回戦</h2>

      {errors.length > 0 && (
        <ul role="alert" style={{ color: "red" }}>
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit}>
        {game.players.map((player, i) => (
          <div key={player.id}>
            <label htmlFor={`score_${player.id}`}>{player.name}の点数</label>
            <input
              type="text"
              id={`score_${player.id}`}
              inputMode="numeric"
              pattern="-?[0-9]*"
              autoComplete="off"
              maxLength={5}
              value={values[i] ?? ""}
              onChange={(event) => handleChange(i, event.target.value)}
            />
            <span>00点</span>
          </div>
        ))}

        <p>
          合計 <span>{totalUnits * UNIT_SCALE}</span> 点
        </p>

        <button type="submit" disabled={!isValid || submitting}>
          入力完了
        </button>
        {hasInteracted && !isValid && <p>入力内容を確認してください</p>}
      </form>

      <p>
        <Link href={`/games/${gameId}`}>← スコア一覧に戻る</Link>
      </p>
    </main>
  );
}
