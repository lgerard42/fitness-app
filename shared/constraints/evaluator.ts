import type {
  Motion,
  Equipment,
  ExerciseCategory,
  ModifierTableConstraint,
  ConstraintEvaluatorOutput,
  ConstraintState,
} from "../types";
import {
  upperLowerIsolation,
  equipmentConstraints,
  torsoOrientationGating,
} from "./deadZones";

/** All modifier table keys in the system */
const ALL_MODIFIER_TABLES = [
  "motionPaths",
  "torsoAngles",
  "torsoOrientations",
  "resistanceOrigin",
  "grips",
  "gripWidths",
  "elbowRelationship",
  "executionStyles",
  "footPositions",
  "stanceWidths",
  "stanceTypes",
  "loadPlacement",
  "supportStructures",
  "loadingAids",
  "rangeOfMotion",
] as const;

export interface ConstraintEvaluatorInput {
  motion: Motion;
  equipment?: Equipment | null;
  category?: ExerciseCategory | null;
  /** The selected torso angle row (for orientation gating) */
  selectedTorsoAngle?: { allow_torso_orientations?: boolean } | null;
}

/**
 * The constraint evaluator merges multiple rule sources into a single
 * deterministic output per modifier table.
 *
 * Priority (highest wins): hidden > disabled > defaulted > suppressed > allowed
 */
function mergeConstraints(
  ...sources: Record<string, ModifierTableConstraint>[]
): Record<string, ModifierTableConstraint> {
  const merged: Record<string, ModifierTableConstraint> = {};

  const statePriority: Record<ConstraintState, number> = {
    hidden: 4,
    disabled: 3,
    defaulted: 2,
    suppressed: 1,
    allowed: 0,
  };

  for (const source of sources) {
    for (const [tableKey, constraint] of Object.entries(source)) {
      const existing = merged[tableKey];

      if (!existing) {
        merged[tableKey] = { ...constraint };
        continue;
      }

      const existingPrio = statePriority[existing.tableState];
      const newPrio = statePriority[constraint.tableState];

      if (newPrio > existingPrio) {
        merged[tableKey] = { ...constraint };
      } else if (
        newPrio === existingPrio &&
        constraint.allowedValues &&
        existing.allowedValues
      ) {
        // Intersect allowed values when same priority
        const intersection = existing.allowedValues.filter((v) =>
          constraint.allowedValues!.includes(v)
        );
        merged[tableKey] = {
          ...existing,
          allowedValues:
            intersection.length > 0 ? intersection : existing.allowedValues,
          reason: `${existing.reason ?? ""}; ${constraint.reason ?? ""}`,
        };
      }
    }
  }

  return merged;
}

/**
 * Evaluate constraints for all modifier tables given the current
 * exercise configuration context.
 *
 * Returns a deterministic output: for each modifier table, the state
 * (allowed/hidden/disabled/defaulted/suppressed), optional allowedValues,
 * and optional defaultValue.
 */
export function evaluateConstraints(
  input: ConstraintEvaluatorInput
): ConstraintEvaluatorOutput {
  const { motion, equipment, selectedTorsoAngle } = input;

  // Collect constraints from all rule sources
  const ulConstraints = upperLowerIsolation(motion);
  const eqConstraints = equipmentConstraints(
    equipment?.modifier_constraints
  );
  const toConstraints = torsoOrientationGating(
    selectedTorsoAngle ?? null
  );

  // Merge all constraint sources (priority: hidden > disabled > ...)
  const merged = mergeConstraints(
    ulConstraints,
    eqConstraints,
    toConstraints
  );

  // Build final output: default everything to "allowed"
  const modifiers: Record<string, ModifierTableConstraint> = {};

  for (const tableKey of ALL_MODIFIER_TABLES) {
    modifiers[tableKey] = merged[tableKey] ?? {
      tableState: "allowed",
    };
  }

  // Apply motion's default_delta_configs as defaulted values
  if (motion.default_delta_configs) {
    for (const [tableKey, defaultId] of Object.entries(
      motion.default_delta_configs
    )) {
      const existing = modifiers[tableKey];
      if (existing && existing.tableState === "allowed") {
        modifiers[tableKey] = {
          ...existing,
          tableState: "defaulted",
          defaultValue: defaultId,
          reason: `Motion default: ${defaultId}`,
        };
      }
    }
  }

  return { modifiers };
}
