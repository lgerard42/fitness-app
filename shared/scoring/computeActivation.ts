import type {
  MuscleTargets,
  FlatMuscleScores,
  ResolvedDelta,
  ActivationResult,
  ScorePolicy,
  ReplaceDeltaPayload,
} from "../types";

const DEFAULT_POLICY: ScorePolicy = {
  clampMin: 0,
  clampMax: 5,
  normalizeOutput: false,
  missingKeyBehavior: "skip",
  outputMode: "raw",
};

/**
 * MuscleTargets is now a flat Record<string, number>, so this is an
 * identity/shallow-copy. Kept for backward compat with call sites.
 */
export function flattenMuscleTargets(
  targets: MuscleTargets
): FlatMuscleScores {
  return { ...targets };
}

/**
 * Sum all resolved deltas into a single flat delta map.
 */
export function sumDeltas(
  resolvedDeltas: ResolvedDelta[]
): FlatMuscleScores {
  const summed: FlatMuscleScores = {};

  for (const rd of resolvedDeltas) {
    for (const [muscleId, delta] of Object.entries(rd.deltas)) {
      summed[muscleId] = (summed[muscleId] ?? 0) + delta;
    }
  }

  return summed;
}

/**
 * Apply deltas to base scores and return final activation scores.
 * Muscles in deltas that don't exist in base are handled per policy.
 */
export function applyDeltas(
  baseScores: FlatMuscleScores,
  deltaSum: FlatMuscleScores,
  policy: ScorePolicy = DEFAULT_POLICY
): FlatMuscleScores {
  const final: FlatMuscleScores = { ...baseScores };

  for (const [muscleId, delta] of Object.entries(deltaSum)) {
    if (muscleId in final) {
      final[muscleId] = final[muscleId] + delta;
    } else {
      switch (policy.missingKeyBehavior) {
        case "zero":
          final[muscleId] = delta;
          break;
        case "error":
          throw new Error(
            `Delta references unknown muscle "${muscleId}" not in base scores`
          );
        case "skip":
        default:
          break;
      }
    }
  }

  // Clamp
  for (const muscleId of Object.keys(final)) {
    final[muscleId] = Math.max(
      policy.clampMin,
      Math.min(policy.clampMax, final[muscleId])
    );
  }

  // Normalize (scale to 0–1 range relative to clampMax)
  if (policy.normalizeOutput && policy.clampMax > 0) {
    for (const muscleId of Object.keys(final)) {
      final[muscleId] = final[muscleId] / policy.clampMax;
    }
  }

  return final;
}

export interface ComboRuleOverrides {
  deltaOverrides?: ReplaceDeltaPayload[];
  clampMap?: Record<string, number>;
}

/**
 * Full activation computation pipeline:
 * 1. Flatten base muscle_targets into flat scores
 * 2. Apply REPLACE_DELTA overrides (swap out matching modifier contributions)
 * 3. Sum all resolved deltas
 * 4. Apply deltas to base + policy clamp/normalize
 * 5. Apply CLAMP_MUSCLE caps (combo-rule muscle ceilings)
 *
 * Combo-rule clamping ownership lives here — the route must not clamp again.
 */
export function computeActivation(
  muscleTargets: MuscleTargets,
  resolvedDeltas: ResolvedDelta[],
  policy: Partial<ScorePolicy> = {},
  comboOverrides?: ComboRuleOverrides
): ActivationResult {
  const mergedPolicy: ScorePolicy = { ...DEFAULT_POLICY, ...policy };

  let effectiveDeltas = resolvedDeltas;

  if (comboOverrides?.deltaOverrides && comboOverrides.deltaOverrides.length > 0) {
    effectiveDeltas = applyDeltaOverrides(resolvedDeltas, comboOverrides.deltaOverrides);
  }

  const baseScores = flattenMuscleTargets(muscleTargets);
  const deltaSum = sumDeltas(effectiveDeltas);
  const rawScores = { ...baseScores };

  for (const [muscleId, delta] of Object.entries(deltaSum)) {
    if (muscleId in rawScores) {
      rawScores[muscleId] = rawScores[muscleId] + delta;
    } else if (mergedPolicy.missingKeyBehavior === "zero") {
      rawScores[muscleId] = delta;
    }
  }

  const finalScores = applyDeltas(baseScores, deltaSum, mergedPolicy);

  if (comboOverrides?.clampMap) {
    for (const [muscleId, cap] of Object.entries(comboOverrides.clampMap)) {
      if (muscleId in finalScores && finalScores[muscleId] > cap) {
        finalScores[muscleId] = cap;
      }
    }
  }

  return {
    baseScores: flattenMuscleTargets(muscleTargets),
    appliedDeltas: effectiveDeltas,
    finalScores,
    rawScores,
  };
}

/**
 * Replace delta contributions for specific table_key + row_id combos
 * with the override deltas from REPLACE_DELTA combo rules.
 */
function applyDeltaOverrides(
  resolvedDeltas: ResolvedDelta[],
  overrides: ReplaceDeltaPayload[]
): ResolvedDelta[] {
  const overrideMap = new Map<string, ReplaceDeltaPayload>();
  for (const ov of overrides) {
    overrideMap.set(`${ov.table_key}::${ov.row_id}`, ov);
  }

  return resolvedDeltas.map((rd) => {
    const key = `${rd.modifierTable}::${rd.modifierId}`;
    const override = overrideMap.get(key);
    if (override) {
      return { ...rd, deltas: { ...override.deltas } };
    }
    return rd;
  });
}
