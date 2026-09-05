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
          <Link href="/">← トップに戻る</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="rounds-new">
      <div className="rounds-panel">
        <h1>点数入力</h1>

        {errors.length > 0 && (
          <div className="form-error" role="alert">
            {errors.join("、")}
          </div>
        )}

        <form onSubmit={handleSubmit} className="rounds-form">
          <table className="scoreboard">
            <caption className="scoreboard-caption">
              {nextRoundNumber}回戦
            </caption>
            <thead>
              <tr>
                <th>プレイヤー</th>
                <th>点数</th>
              </tr>
            </thead>
            <tbody>
              {game.players.map((player, i) => (
                <tr key={player.id}>
                  <td className="player-name">{player.name}</td>
                  <td className="score-cell">
                    <label htmlFor={`score_${player.id}`} className="sr-only">
                      {player.name}の点数
                    </label>
                    <div className="score-field">
                      <input
                        type="text"
                        id={`score_${player.id}`}
                        className="score-input"
                        inputMode="numeric"
                        pattern="-?[0-9]*"
                        autoComplete="off"
                        maxLength={5}
                        value={values[i] ?? ""}
                        onChange={(event) => handleChange(i, event.target.value)}
                      />
                      <span className="score-unit score-unit--hundreds">
                        00点
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="score-total">
                <th>合計</th>
                <td className="score-total-value">
                  <span data-testid="score-total">{totalUnits * UNIT_SCALE}</span>
                  <span className="score-unit">点</span>
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary rounds-submit"
              disabled={!isValid || submitting}
            >
              入力完了
            </button>
            {hasInteracted && !isValid && (
              <p className="validation-message">入力内容を確認してください</p>
            )}
          </div>
        </form>
      </div>

      <div className="back-link">
        <Link href={`/games/${gameId}`}>← スコア一覧に戻る</Link>
      </div>
    </main>
  );
}
