import type {
  MuscleTargets,
  MuscleTargetNode,
  FlatMuscleScores,
  ResolvedDelta,
  ActivationResult,
  ScorePolicy,
} from "../types";

const DEFAULT_POLICY: ScorePolicy = {
  clampMin: 0,
  clampMax: 5,
  normalizeOutput: false,
  missingKeyBehavior: "skip",
  outputMode: "raw",
};

/**
 * Flatten a hierarchical muscle_targets tree into a flat muscleId → score map.
 * Walks recursively, collecting every node's _score.
 */
export function flattenMuscleTargets(
  targets: MuscleTargets
): FlatMuscleScores {
  const flat: FlatMuscleScores = {};

  function walk(node: Record<string, unknown>, parentKey?: string) {
    for (const [key, value] of Object.entries(node)) {
      if (key === "_score") continue;

      if (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
        const targetNode = value as MuscleTargetNode;
        if (typeof targetNode._score === "number") {
          flat[key] = targetNode._score;
        }
        walk(targetNode, key);
      }
    }
  }

  walk(targets);
  return flat;
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

/**
 * Full activation computation pipeline:
 * 1. Flatten base muscle_targets into flat scores
 * 2. Sum all resolved deltas
 * 3. Apply deltas to base + clamp/normalize
 */
export function computeActivation(
  muscleTargets: MuscleTargets,
  resolvedDeltas: ResolvedDelta[],
  policy: Partial<ScorePolicy> = {}
): ActivationResult {
  const mergedPolicy: ScorePolicy = { ...DEFAULT_POLICY, ...policy };

  const baseScores = flattenMuscleTargets(muscleTargets);
  const deltaSum = sumDeltas(resolvedDeltas);
  const rawScores = { ...baseScores };

  // Raw = base + deltas without clamping (for debug/trace)
  for (const [muscleId, delta] of Object.entries(deltaSum)) {
    if (muscleId in rawScores) {
      rawScores[muscleId] = rawScores[muscleId] + delta;
    } else if (mergedPolicy.missingKeyBehavior === "zero") {
      rawScores[muscleId] = delta;
    }
  }

  const finalScores = applyDeltas(baseScores, deltaSum, mergedPolicy);

  return {
    baseScores: flattenMuscleTargets(muscleTargets),
    appliedDeltas: resolvedDeltas,
    finalScores,
    rawScores,
  };
}
