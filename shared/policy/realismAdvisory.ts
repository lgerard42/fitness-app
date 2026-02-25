import type { ActivationResult, FlatMuscleScores } from "../types";

export type AdvisoryLevel = "green" | "yellow" | "red";

export interface RealismAdvisory {
  level: AdvisoryLevel;
  reasons: string[];
}

const MAX_SINGLE_DELTA = 2.0;
const MAX_TOTAL_DELTA_MAGNITUDE = 5.0;
const MIN_NEGATIVE_DELTA = -1.5;
const CLAMP_MAX = 5;

/**
 * Evaluates realism of a scoring simulation result.
 * Non-blocking, informational only.
 */
export function evaluateRealism(activation: ActivationResult): RealismAdvisory {
  const reasons: string[] = [];
  const { baseScores, finalScores, appliedDeltas } = activation;

  let hasRed = false;
  let hasYellow = false;

  // Check for muscles clamped at max
  const clampedMuscles = Object.entries(finalScores).filter(
    ([, score]) => score >= CLAMP_MAX
  );
  if (clampedMuscles.length > 0) {
    reasons.push(
      `${clampedMuscles.length} muscle(s) clamped at max (${CLAMP_MAX}): ${clampedMuscles.map(([id]) => id).slice(0, 3).join(", ")}${clampedMuscles.length > 3 ? "..." : ""}`
    );
    hasYellow = true;
  }

  // Check total delta magnitude
  let totalDeltaMagnitude = 0;
  for (const rd of appliedDeltas) {
    for (const delta of Object.values(rd.deltas)) {
      totalDeltaMagnitude += Math.abs(delta);
    }
  }
  if (totalDeltaMagnitude > MAX_TOTAL_DELTA_MAGNITUDE) {
    reasons.push(
      `Total delta magnitude (${totalDeltaMagnitude.toFixed(2)}) exceeds advisory threshold (${MAX_TOTAL_DELTA_MAGNITUDE})`
    );
    hasYellow = true;
  }

  // Check for extreme individual deltas
  for (const rd of appliedDeltas) {
    for (const [muscleId, delta] of Object.entries(rd.deltas)) {
      if (Math.abs(delta) > MAX_SINGLE_DELTA) {
        reasons.push(
          `Large delta on ${muscleId}: ${delta > 0 ? "+" : ""}${delta} from ${rd.modifierTable}.${rd.modifierId}`
        );
        hasRed = true;
      }
      if (delta < MIN_NEGATIVE_DELTA) {
        reasons.push(
          `Extreme negative delta on ${muscleId}: ${delta} from ${rd.modifierTable}.${rd.modifierId}`
        );
        hasRed = true;
      }
    }
  }

  // Check for muscles going to zero or negative
  const zeroedMuscles = Object.entries(finalScores).filter(
    ([id, score]) => score <= 0 && (baseScores[id] ?? 0) > 0
  );
  if (zeroedMuscles.length > 0) {
    reasons.push(
      `${zeroedMuscles.length} muscle(s) reduced to 0: ${zeroedMuscles.map(([id]) => id).slice(0, 3).join(", ")}`
    );
    hasYellow = true;
  }

  if (reasons.length === 0) {
    reasons.push("Score distribution looks reasonable");
  }

  const level: AdvisoryLevel = hasRed ? "red" : hasYellow ? "yellow" : "green";
  return { level, reasons };
}
