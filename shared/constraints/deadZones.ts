import type { Motion, ModifierTableConstraint } from "../types";

/**
 * Dead zone rules encode biomechanical impossibilities.
 * Each rule takes the current context and returns constraint overrides.
 */

const UPPER_BODY_MODIFIERS = [
  "grips",
  "gripWidths",
  "elbowRelationship",
] as const;

const LOWER_BODY_MODIFIERS = [
  "footPositions",
  "stanceWidths",
  "stanceTypes",
] as const;

/**
 * Upper/Lower isolation: hide irrelevant body-region modifiers.
 * - UPPER-only motions hide lower body modifiers
 * - LOWER-only motions hide upper body modifiers
 * - BOTH or mixed: show everything
 */
export function upperLowerIsolation(
  motion: Motion
): Record<string, ModifierTableConstraint> {
  const constraints: Record<string, ModifierTableConstraint> = {};
  const regions = motion.upper_lower;

  if (!regions || regions.length === 0) return constraints;

  const isUpperOnly =
    regions.length === 1 && regions[0] === "UPPER";
  const isLowerOnly =
    regions.length === 1 && regions[0] === "LOWER";

  if (isUpperOnly) {
    for (const mod of LOWER_BODY_MODIFIERS) {
      constraints[mod] = {
        tableState: "hidden",
        reason: "Upper-body motion: lower body modifiers not applicable",
      };
    }
  }

  if (isLowerOnly) {
    for (const mod of UPPER_BODY_MODIFIERS) {
      constraints[mod] = {
        tableState: "hidden",
        reason: "Lower-body motion: upper body modifiers not applicable",
      };
    }
  }

  return constraints;
}

/**
 * Equipment constraint application: when equipment has modifier_constraints,
 * restrict the allowedValues for each constrained modifier table.
 * Modifiers not listed in constraints are unaffected.
 */
export function equipmentConstraints(
  equipmentModifierConstraints: Record<string, string[]> | undefined
): Record<string, ModifierTableConstraint> {
  const constraints: Record<string, ModifierTableConstraint> = {};
  if (!equipmentModifierConstraints) return constraints;

  const keyMap: Record<string, string> = {
    GRIPS: "grips",
    GRIP_WIDTHS: "gripWidths",
    TORSO_ANGLES: "torsoAngles",
    TORSO_ORIENTATIONS: "torsoOrientations",
    STANCE_WIDTHS: "stanceWidths",
    STANCE_TYPES: "stanceTypes",
    FOOT_POSITIONS: "footPositions",
    SUPPORT_STRUCTURES: "supportStructures",
    ELBOW_RELATIONSHIP: "elbowRelationship",
    EXECUTION_STYLES: "executionStyles",
    MOTION_PATHS: "motionPaths",
    RESISTANCE_ORIGIN: "resistanceOrigin",
    LOADING_AIDS: "loadingAids",
    LOAD_PLACEMENT: "loadPlacement",
    RANGE_OF_MOTION: "rangeOfMotion",
    EQUIPMENT_CATEGORIES: "equipmentCategories",
    EQUIPMENT: "equipment",
  };

  for (const [rawKey, allowedIds] of Object.entries(
    equipmentModifierConstraints
  )) {
    const tableKey = keyMap[rawKey] ?? rawKey.toLowerCase();
    constraints[tableKey] = {
      tableState: "allowed",
      allowedValues: allowedIds,
      reason: `Equipment restricts ${tableKey} to: ${allowedIds.join(", ")}`,
    };
  }

  return constraints;
}

/**
 * Torso orientation gating: torsoOrientations are only relevant
 * when the selected torsoAngle allows them.
 */
export function torsoOrientationGating(
  selectedTorsoAngle: { allow_torso_orientations?: boolean } | null
): Record<string, ModifierTableConstraint> {
  const constraints: Record<string, ModifierTableConstraint> = {};

  if (
    selectedTorsoAngle &&
    selectedTorsoAngle.allow_torso_orientations === false
  ) {
    constraints["torsoOrientations"] = {
      tableState: "hidden",
      reason:
        "Selected torso angle does not support torso orientations",
    };
  }

  return constraints;
}
