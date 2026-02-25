// ─── Matrix V2 Core Types ────────────────────────────────────────────
// Shared contract for matrix config storage, validation, and resolution.

export type MatrixScopeType = "motion" | "motion_group";
export type MatrixConfigStatus = "draft" | "active";
export type ValidationSeverity = "error" | "warning" | "info";
export type ValidationStatusSummary = "valid" | "warning" | "error";
export type ResolverMode = "active_only" | "draft_preview";

// ─── Modifier Table Registry ─────────────────────────────────────────

export const MODIFIER_TABLE_KEYS = [
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

export type ModifierTableKey = (typeof MODIFIER_TABLE_KEYS)[number];

// ─── Rule Types ──────────────────────────────────────────────────────

export type LocalRuleAction =
  | "hide_table"
  | "disable_table"
  | "reset_to_default"
  | "reset_to_null"
  | "disable_row_ids"
  | "filter_row_ids";

export interface RuleCondition {
  table: string;
  operator: "equals" | "in" | "not_in";
  value: string | string[];
}

export interface LocalRule {
  rule_id: string;
  action: LocalRuleAction;
  condition: RuleCondition;
  target_row_ids?: string[];
  description?: string;
  _tombstoned?: boolean;
}

export type GlobalRuleType =
  | "partition"
  | "exclusivity"
  | "invalid_combination"
  | "cross_table_dependency";

export interface GlobalRule {
  rule_id: string;
  type: GlobalRuleType;
  tables: string[];
  conditions: RuleCondition[];
  description?: string;
  _tombstoned?: boolean;
}

export interface RuleTombstone {
  rule_id: string;
  _tombstoned: true;
}

// ─── Table Config ────────────────────────────────────────────────────

export interface TableConfig {
  applicability: boolean;
  allowed_row_ids: string[];
  default_row_id: string | null;
  null_noop_allowed: boolean;
  selection_required?: boolean;
  selection_mode?: "single" | "multi";
  local_rules?: LocalRule[];
  ui_hints?: Record<string, unknown>;
  one_per_group?: boolean;
  row_motion_assignments?: Record<string, string>;
  angle_range?: { min: number; max: number; step: number; default: number };
  secondary_overrides?: Record<string, boolean>;
  valid_secondary_ids?: string[];
}

// ─── Config JSON Payload ─────────────────────────────────────────────

export interface MatrixConfigMeta {
  description?: string;
  scope_type?: MatrixScopeType;
  scope_id?: string;
  inherits_from?: string;
  generated_by?: string;
}

export interface MatrixConfigJson {
  meta: MatrixConfigMeta;
  tables: Partial<Record<ModifierTableKey, TableConfig>>;
  rules: GlobalRule[];
  extensions: Record<string, unknown>;
}

// ─── Config Row (flat storage metadata) ──────────────────────────────

export interface MatrixConfigRow {
  id: string;
  scope_type: MatrixScopeType;
  scope_id: string;
  status: MatrixConfigStatus;
  schema_version: string;
  config_version: number;
  config_json: MatrixConfigJson;
  notes: string | null;
  validation_status: ValidationStatusSummary | null;
  validation_summary: ValidationMessage[] | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

// ─── Validation ──────────────────────────────────────────────────────

export interface ValidationMessage {
  severity: ValidationSeverity;
  code: string;
  path: string;
  message: string;
  suggested_fix?: string;
  rule_id?: string;
  scope_context?: string;
}

export interface ValidationResult {
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
  info: ValidationMessage[];
  valid: boolean;
  can_activate: boolean;
}

// ─── Resolver Output ─────────────────────────────────────────────────

export interface ResolvedFrom {
  group_config_id: string | null;
  group_config_version: number | null;
  group_status: MatrixConfigStatus | null;
  motion_config_id: string | null;
  motion_config_version: number | null;
  motion_status: MatrixConfigStatus | null;
  resolved_at: string;
}

export interface EffectiveTableConfig {
  applicability: boolean;
  allowed_row_ids: string[];
  default_row_id: string | null;
  null_noop_allowed: boolean;
  selection_required?: boolean;
  local_rules: LocalRule[];
  source: "group" | "motion" | "merged";
}

export interface ResolverOutput {
  resolver_version: string;
  resolved_from: ResolvedFrom;
  motion_id: string;
  resolved_group_id: string | null;
  mode: ResolverMode;
  effective_tables: Partial<Record<ModifierTableKey, EffectiveTableConfig>>;
  effective_rules: GlobalRule[];
  diagnostics: ValidationMessage[];
}

// ─── API Request/Response Types ──────────────────────────────────────

export interface CreateMatrixConfigRequest {
  scope_type: MatrixScopeType;
  scope_id: string;
  config_json: MatrixConfigJson;
  notes?: string;
}

export interface UpdateMatrixConfigRequest {
  config_json?: MatrixConfigJson;
  notes?: string;
}

export interface ActivateMatrixConfigResponse {
  config: MatrixConfigRow;
  superseded_id?: string;
}

export interface ImportPreview {
  config: Partial<MatrixConfigRow>;
  validation: ValidationResult;
}
