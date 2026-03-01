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
  ComboRuleActionType,
  TriggerCondition,
  SwitchMotionPayload,
  ReplaceDeltaPayload,
  ClampMusclePayload,
  ComboRule,
  RuleFiredEntry,
  ComboRuleResolutionResult,
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
export type { ComboRuleOverrides } from "./scoring/computeActivation";
export { resolveComboRules } from "./scoring/resolveComboRules";

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

// Validators
export { validateComboRule } from "./validators/comboRuleValidator";
export type { ComboRuleValidationResult } from "./validators/comboRuleValidator";

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
