"use client";

import { useState, type FormEvent } from "react";
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
  // ルール設定はデフォルト値のまま使うことが多いため、初期表示では折りたたむ（#217）
  const [rulesOpen, setRulesOpen] = useState(false);
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
    <main className="games-new">
      <h1>メンバー入力</h1>

      {errors.length > 0 && (
        <div className="form-error" role="alert">
          <ul style={{ listStyle: "none" }}>
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="member-form">
        <div className="player-inputs">
          {players.map((name, i) => (
            <div key={i} className="player-input">
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
        </div>

        {/* MPA 版（details/summary）と見た目を揃えるため、同じマークアップを state で制御する */}
        <details className="rule-settings" open={rulesOpen}>
          <summary
            onClick={(event) => {
              event.preventDefault();
              setRulesOpen((current) => !current);
            }}
          >
            ルール設定
          </summary>
          <div className="rule-inputs">
            {ruleFields.map(({ key, label }) => (
              <div key={key} className="rule-input">
                <label htmlFor={`rule_${key}`}>{label}</label>
                <input
                  type="number"
                  id={`rule_${key}`}
                  value={rules[key]}
                  onChange={(event) => updateRule(key, event.target.value)}
                />
              </div>
            ))}
          </div>
        </details>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            ゲーム開始
          </button>
        </div>
      </form>

    </main>
  );
}
