"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, createGame } from "../../lib/api";

const PLAYER_COUNT = 4;

const defaultRules = {
  mochi_ten: 25000,
  kaeshi_ten: 30000,
  rank_1_bonus: 50,
  rank_2_bonus: 10,
  rank_3_bonus: -10,
  rank_4_bonus: -30,
};

type RuleKey = keyof typeof defaultRules;

const ruleFields: { key: RuleKey; label: string }[] = [
  { key: "mochi_ten", label: "持ち点" },
  { key: "kaeshi_ten", label: "返し点" },
  { key: "rank_1_bonus", label: "1位" },
  { key: "rank_2_bonus", label: "2位" },
  { key: "rank_3_bonus", label: "3位" },
  { key: "rank_4_bonus", label: "4位" },
];

export default function NewGamePage() {
  const router = useRouter();
  const [players, setPlayers] = useState<string[]>(
    Array(PLAYER_COUNT).fill("")
  );
  const [rules, setRules] = useState(defaultRules);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const updatePlayer = (index: number, name: string) => {
    setPlayers((current) =>
      current.map((value, i) => (i === index ? name : value))
    );
  };

  const updateRule = (key: RuleKey, value: string) => {
    setRules((current) => ({ ...current, [key]: Number(value) }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setErrors([]);
    try {
      const created = await createGame({ ...rules, players });
      // MPA 版と同じく、作成したゲームのスコア一覧へ遷移する
      router.push(`/games/${created.id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.messages);
      } else {
        setErrors([
          "ゲームの作成に失敗しました。時間をおいて再度お試しください",
        ]);
      }
      setSubmitting(false);
    }
  };

  return (
    <main style={{ padding: "1.5rem" }}>
      <h1>新規ゲーム作成</h1>

      {errors.length > 0 && (
        <ul role="alert" style={{ color: "red" }}>
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit}>
        <h2>メンバー</h2>
        {players.map((name, i) => (
          <div key={i}>
            <label htmlFor={`player_${i + 1}`}>プレイヤー{i + 1}</label>
            <input
              type="text"
              id={`player_${i + 1}`}
              value={name}
              required
              onChange={(event) => updatePlayer(i, event.target.value)}
            />
          </div>
        ))}

        <h2>ルール設定</h2>
        {ruleFields.map(({ key, label }) => (
          <div key={key}>
            <label htmlFor={`rule_${key}`}>{label}</label>
            <input
              type="number"
              id={`rule_${key}`}
              value={rules[key]}
              onChange={(event) => updateRule(key, event.target.value)}
            />
          </div>
        ))}

        <button type="submit" disabled={submitting}>
          ゲーム開始
        </button>
      </form>

      <p>
        <Link href="/">← 一覧に戻る</Link>
      </p>
    </main>
  );
}
