// 点数入力の計算ロジック（MPA 版 score_input_controller.js の移植）。
// 点数は百点棒単位（350 = 35,000点）で扱い、合計は 1000（= 100,000点）固定。

export const TARGET_UNITS = 1000;
export const UNIT_SCALE = 100;
export const MIN_UNIT = -1000;
export const MAX_UNIT = 1000;

// manual: 手入力された欄 / auto: 自動計算で埋めた欄
export type ScoreFlag = "manual" | "auto" | null;

export function parseValue(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const number = Number(trimmed);
  if (!Number.isFinite(number)) return null;
  return Math.trunc(number);
}

export function sumUnits(
  values: string[],
  skipIndex: number | null = null
): number {
  return values.reduce((sum, value, i) => {
    if (i === skipIndex) return sum;
    const parsed = parseValue(value);
    return parsed == null ? sum : sum + parsed;
  }, 0);
}

function countFilled(values: string[], skipIndex: number | null = null): number {
  return values.filter(
    (value, i) => i !== skipIndex && parseValue(value) != null
  ).length;
}

// 3人分入力されたら残り1人を自動計算する（手入力済みの欄には触らない）
export function applyAutoCalc(
  values: string[],
  flags: ScoreFlag[]
): { values: string[]; flags: ScoreFlag[] } {
  const nextValues = [...values];
  const nextFlags = [...flags];
  const autoIndex = nextFlags.indexOf("auto");
  let targetIndex: number | null = null;

  if (
    autoIndex >= 0 &&
    countFilled(nextValues, autoIndex) === values.length - 1
  ) {
    targetIndex = autoIndex;
  } else if (autoIndex < 0 && countFilled(nextValues) === values.length - 1) {
    const emptyIndex = nextValues.findIndex((v) => parseValue(v) == null);
    if (emptyIndex >= 0 && nextFlags[emptyIndex] !== "manual") {
      targetIndex = emptyIndex;
    }
  }

  if (targetIndex != null) {
    nextValues[targetIndex] = String(
      TARGET_UNITS - sumUnits(nextValues, targetIndex)
    );
    nextFlags[targetIndex] = "auto";
  } else if (autoIndex >= 0) {
    nextValues[autoIndex] = "";
    nextFlags[autoIndex] = null;
  }

  return { values: nextValues, flags: nextFlags };
}
