// Types
export type {
  MuscleTargetNode,
  MuscleTargets,
  FlatMuscleScores,
  DeltaEntry,
  DeltaRules,
  ModifierRow,
  Motion,
  Equipment,
  ModifierConstraints,
  RefExerciseCategory,
  ExerciseCategoryRef,
  ExerciseInputPermissions,
  PermissionLevel,
  Muscle,
  ScorePolicy,
  ConstraintState,
  ModifierFieldConstraint,
  ModifierTableConstraint,
  ConstraintEvaluatorOutput,
  ResolvedDelta,
  ActivationResult,
  ModifierSelection,
  ScoringInput,
  DataContext,
} from "./types";

// Scoring
export {
  resolveSingleDelta,
  resolveAllDeltas,
} from "./scoring/resolveDeltas";
export {
  flattenMuscleTargets,
  sumDeltas,
  applyDeltas,
  computeActivation,
} from "./scoring/computeActivation";

// Constraints
export {
  evaluateConstraints,
  upperLowerIsolation,
  equipmentConstraints,
  torsoOrientationGating,
} from "./constraints";
export type { ConstraintEvaluatorInput } from "./constraints";

// Policy
export {
  DEFAULT_SCORE_POLICY,
  NORMALIZED_POLICY,
  STRICT_POLICY,
  createScorePolicy,
} from "./policy/scorePolicy";

// Schemas (Zod)
export {
  muscleTargetsSchema,
  deltaRulesSchema,
  modifierRowSchema,
  motionSchema,
  equipmentSchema,
  modifierConstraintsSchema,
  exerciseCategorySchema,
  exerciseInputPermissionsSchema,
  muscleSchema,
  scorePolicySchema,
  validateMotion,
  validateModifierRow,
  validateEquipment,
  validateExerciseCategory,
  validateMuscle,
  validateDeltaRules,
} from "./schemas";

// Linter
export {
  lintAll,
  formatLintResults,
} from "./linter/deltaLinter";
export type { LintIssue, LintSeverity } from "./linter/deltaLinter";

// Version Manifest
export {
  generateManifest,
  hasChanged,
  changedTables,
} from "./version/manifest";
export type { VersionManifest } from "./version/manifest";
