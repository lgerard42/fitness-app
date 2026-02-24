import type { ScorePolicy } from "../types";

export const DEFAULT_SCORE_POLICY: ScorePolicy = {
  clampMin: 0,
  clampMax: 5,
  normalizeOutput: false,
  missingKeyBehavior: "skip",
  outputMode: "raw",
};

export const NORMALIZED_POLICY: ScorePolicy = {
  clampMin: 0,
  clampMax: 5,
  normalizeOutput: true,
  missingKeyBehavior: "skip",
  outputMode: "normalized",
};

export const STRICT_POLICY: ScorePolicy = {
  clampMin: 0,
  clampMax: 5,
  normalizeOutput: false,
  missingKeyBehavior: "error",
  outputMode: "raw",
};

export function createScorePolicy(
  overrides: Partial<ScorePolicy> = {}
): ScorePolicy {
  return { ...DEFAULT_SCORE_POLICY, ...overrides };
}
