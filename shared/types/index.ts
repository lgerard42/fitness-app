export * from "./matrixV2";

// ─── Muscle Targets ──────────────────────────────────────────────────
// Flat map: muscleId → score. Hierarchy is built at display time from
// the muscles table's parent_ids. Parent scores are computed dynamically
// as the sum of their children present in the map.

export type MuscleTargets = Record<string, number>;

/** Alias kept for backward compat; identical to MuscleTargets now. */
export type FlatMuscleScores = Record<string, number>;

// ─── Delta Rules ─────────────────────────────────────────────────────
// Stored in modifier rows (grips, torsoAngles, stanceWidths, etc.)
// Keyed by motion ID → flat muscle deltas or "inherit"

export type DeltaEntry = Record<string, number> | "inherit";

/** Full delta_rules field: { MOTION_ID: { MUSCLE_ID: delta } | "inherit", ... } */
export type DeltaRules = Record<string, DeltaEntry>;

// ─── Modifier Row ────────────────────────────────────────────────────
// A single row from any modifier table (grips, stanceWidths, etc.)

export interface ModifierRow {
  id: string;
  label: string;
  delta_rules: DeltaRules;
  parent_id?: string | null;
  is_active?: boolean;
  [key: string]: unknown;
}

// ─── Motion ──────────────────────────────────────────────────────────

export interface Motion {
  id: string;
  label: string;
  parent_id: string | null;
  upper_lower: ("UPPER" | "LOWER")[];
  muscle_targets: MuscleTargets;
  default_delta_configs: Record<string, string>;
  common_names?: string[];
  short_description?: string;
  sort_order?: number;
  is_active?: boolean;
  icon?: string | null;
}

// ─── Equipment ───────────────────────────────────────────────────────

export type ModifierConstraints = Record<string, string[]>;

export interface Equipment {
  id: string;
  label: string;
  category_id: string;
  modifier_constraints: ModifierConstraints;
  is_attachment?: boolean;
  requires_attachment?: boolean;
  max_instances?: number;
  common_names?: string[];
  short_description?: string;
  is_active?: boolean;
}

// ─── Exercise Category ───────────────────────────────────────────────

export type PermissionLevel = "allowed" | "required" | "disallowed";

export type ExerciseInputPermissions = Record<string, PermissionLevel>;

export interface ExerciseCategory {
  id: string;
  label: string;
  exercise_input_permissions: ExerciseInputPermissions;
  is_active?: boolean;
}

// ─── Muscle Definition ───────────────────────────────────────────────

export interface Muscle {
  id: string;
  label: string;
  parent_ids: string[];
  upper_lower?: ("UPPER" | "LOWER")[];
  technical_name?: string;
  common_names?: string[];
  is_active?: boolean;
}

// ─── Score Policy ────────────────────────────────────────────────────

export interface ScorePolicy {
  clampMin: number;
  clampMax: number;
  normalizeOutput: boolean;
  missingKeyBehavior: "skip" | "zero" | "error";
  outputMode: "raw" | "normalized" | "both";
}

// ─── Constraint Evaluator ────────────────────────────────────────────

export type ConstraintState =
  | "allowed"
  | "hidden"
  | "disabled"
  | "defaulted"
  | "suppressed";

export interface ModifierFieldConstraint {
  state: ConstraintState;
  defaultValue?: string;
  reason?: string;
}

/** Per-modifier-table constraint output */
export interface ModifierTableConstraint {
  tableState: ConstraintState;
  defaultValue?: string;
  reason?: string;
  /** Per-row-ID overrides (e.g., only certain grip IDs allowed) */
  allowedValues?: string[];
}

export interface ConstraintEvaluatorOutput {
  modifiers: Record<string, ModifierTableConstraint>;
}

// ─── Scoring Engine Output ───────────────────────────────────────────

export interface ResolvedDelta {
  modifierTable: string;
  modifierId: string;
  motionId: string;
  deltas: Record<string, number>;
  inherited: boolean;
  inheritChain?: string[];
}

export interface ActivationResult {
  baseScores: FlatMuscleScores;
  appliedDeltas: ResolvedDelta[];
  finalScores: FlatMuscleScores;
  rawScores: FlatMuscleScores;
}

// ─── Resolver Input ──────────────────────────────────────────────────

export interface ModifierSelection {
  tableKey: string;
  rowId: string;
}

export interface ScoringInput {
  motionId: string;
  selectedModifiers: ModifierSelection[];
}

// ─── Data Context (all loaded tables needed for computation) ─────────

export interface DataContext {
  motions: Record<string, Motion>;
  muscles: Record<string, Muscle>;
  modifierTables: Record<string, Record<string, ModifierRow>>;
  equipment: Record<string, Equipment>;
  exerciseCategories: Record<string, ExerciseCategory>;
}
