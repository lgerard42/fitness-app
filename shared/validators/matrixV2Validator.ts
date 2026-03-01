import { z } from "zod";
import type {
  MatrixConfigJson,
  MatrixConfigRow,
  ValidationMessage,
  ValidationResult,
  LocalRule,
  GlobalRule,
  TableConfig,
  ModifierTableKey,
} from "../types/matrixV2";
import { MODIFIER_TABLE_KEYS } from "../types/matrixV2";

// ─── Zod Schemas (Layer 1: Structural) ──────────────────────────────

const ruleConditionSchema = z.object({
  table: z.string().min(1),
  operator: z.enum(["equals", "in", "not_in"]),
  value: z.union([z.string(), z.array(z.string())]),
});

const localRuleSchema = z.object({
  rule_id: z.string().min(1),
  action: z.enum([
    "hide_table",
    "disable_table",
    "reset_to_default",
    "reset_to_null",
    "disable_row_ids",
    "filter_row_ids",
  ]),
  condition: ruleConditionSchema,
  target_row_ids: z.array(z.string()).optional(),
  description: z.string().optional(),
  _tombstoned: z.boolean().optional(),
});

const globalRuleSchema = z.object({
  rule_id: z.string().min(1),
  type: z.enum([
    "partition",
    "exclusivity",
    "invalid_combination",
    "cross_table_dependency",
  ]),
  tables: z.array(z.string().min(1)).min(1),
  conditions: z.array(ruleConditionSchema),
  description: z.string().optional(),
  _tombstoned: z.boolean().optional(),
});

const tableConfigSchema = z.object({
  applicability: z.boolean(),
  allowed_row_ids: z.array(z.string()),
  default_row_id: z.union([z.string(), z.null()]),
  null_noop_allowed: z.boolean(),
  selection_required: z.boolean().optional(),
  selection_mode: z.enum(["single", "multi"]).optional(),
  local_rules: z.array(localRuleSchema).optional(),
  ui_hints: z.record(z.string(), z.unknown()).optional(),
  one_per_group: z.boolean().optional(),
  row_motion_assignments: z.record(z.string(), z.string()).optional(),
  angle_range: z
    .object({ min: z.number(), max: z.number(), step: z.number(), default: z.number() })
    .optional(),
  secondary_overrides: z.record(z.string(), z.boolean()).optional(),
  valid_secondary_ids: z.array(z.string()).optional(),
});

const configMetaSchema = z.object({
  description: z.string().optional(),
  scope_type: z.enum(["motion", "motion_group"]).optional(),
  scope_id: z.string().optional(),
  inherits_from: z.string().optional(),
  generated_by: z.string().optional(),
});

const configJsonSchema = z
  .object({
    meta: configMetaSchema,
    tables: z.record(z.string(), tableConfigSchema),
    rules: z.array(globalRuleSchema),
    extensions: z.record(z.string(), z.unknown()),
  })
  .strict();

// ─── Layer 1: Structural Validation ─────────────────────────────────

export function validateStructural(
  configJson: unknown,
): ValidationMessage[] {
  const messages: ValidationMessage[] = [];
  const result = configJsonSchema.safeParse(configJson);

  if (!result.success) {
    for (const issue of result.error.issues) {
      messages.push({
        severity: "error",
        code: "STRUCTURAL_INVALID",
        path: issue.path.join("."),
        message: issue.message,
      });
    }
    return messages;
  }

  const parsed = result.data;
  const modSet = new Set<string>(MODIFIER_TABLE_KEYS);

  for (const tableKey of Object.keys(parsed.tables)) {
    if (!modSet.has(tableKey)) {
      messages.push({
        severity: "error",
        code: "UNKNOWN_TABLE_KEY",
        path: `tables.${tableKey}`,
        message: `"${tableKey}" is not a recognized modifier table`,
      });
    }
  }

  for (const rule of parsed.rules) {
    if (!rule.rule_id) {
      messages.push({
        severity: "error",
        code: "MISSING_RULE_ID",
        path: "rules",
        message: "Global rule is missing required rule_id",
      });
    }
  }

  for (const [tableKey, tc] of Object.entries(parsed.tables)) {
    const localRules = (tc as any).local_rules as LocalRule[] | undefined;
    if (localRules) {
      for (let i = 0; i < localRules.length; i++) {
        if (!localRules[i].rule_id) {
          messages.push({
            severity: "error",
            code: "MISSING_RULE_ID",
            path: `tables.${tableKey}.local_rules[${i}]`,
            message: "Local rule is missing required rule_id",
          });
        }
      }
    }
  }

  return messages;
}

// ─── Layer 2: Referential Validation ────────────────────────────────

export interface ReferentialContext {
  validMotionIds: Set<string>;
  validGroupIds: Set<string>;
  modifierTableRows: Record<string, Set<string>>;
}

export function validateReferential(
  config: MatrixConfigRow,
  ctx: ReferentialContext,
): ValidationMessage[] {
  const messages: ValidationMessage[] = [];
  const { scope_type, scope_id, config_json } = config;

  if (scope_type === "motion" && !ctx.validMotionIds.has(scope_id)) {
    messages.push({
      severity: "error",
      code: "INVALID_SCOPE_ID",
      path: "scope_id",
      message: `Motion "${scope_id}" does not exist`,
    });
  }

  if (scope_type === "motion_group" && !ctx.validGroupIds.has(scope_id)) {
    messages.push({
      severity: "warning",
      code: "UNKNOWN_GROUP_ID",
      path: "scope_id",
      message: `Group "${scope_id}" is not a recognized motion parent`,
    });
  }

  for (const [tableKey, tc] of Object.entries(config_json.tables)) {
    const knownRows = ctx.modifierTableRows[tableKey];
    if (!knownRows) {
      messages.push({
        severity: "error",
        code: "TABLE_NOT_IN_REGISTRY",
        path: `tables.${tableKey}`,
        message: `Modifier table "${tableKey}" not found in data`,
      });
      continue;
    }

    for (const rowId of tc.allowed_row_ids) {
      if (!knownRows.has(rowId)) {
        messages.push({
          severity: "error",
          code: "INVALID_ROW_ID",
          path: `tables.${tableKey}.allowed_row_ids`,
          message: `Row "${rowId}" does not exist in ${tableKey}`,
        });
      }
    }

    if (tc.default_row_id && !knownRows.has(tc.default_row_id)) {
      messages.push({
        severity: "error",
        code: "INVALID_DEFAULT_ROW",
        path: `tables.${tableKey}.default_row_id`,
        message: `Default row "${tc.default_row_id}" does not exist in ${tableKey}`,
      });
    }

    if (tc.local_rules) {
      for (let i = 0; i < tc.local_rules.length; i++) {
        const rule = tc.local_rules[i];
        const condTable = rule.condition.table;
        if (!ctx.modifierTableRows[condTable]) {
          messages.push({
            severity: "error",
            code: "RULE_REFS_UNKNOWN_TABLE",
            path: `tables.${tableKey}.local_rules[${i}].condition.table`,
            message: `Rule condition references unknown table "${condTable}"`,
          });
        }
        if (rule.target_row_ids) {
          for (const rid of rule.target_row_ids) {
            if (!knownRows.has(rid)) {
              messages.push({
                severity: "error",
                code: "RULE_REFS_UNKNOWN_ROW",
                path: `tables.${tableKey}.local_rules[${i}].target_row_ids`,
                message: `Rule target row "${rid}" does not exist in ${tableKey}`,
              });
            }
          }
        }
      }
    }
  }

  for (let i = 0; i < config_json.rules.length; i++) {
    const rule = config_json.rules[i];
    for (const t of rule.tables) {
      if (!ctx.modifierTableRows[t]) {
        messages.push({
          severity: "error",
          code: "GLOBAL_RULE_REFS_UNKNOWN_TABLE",
          path: `rules[${i}].tables`,
          message: `Global rule references unknown table "${t}"`,
          rule_id: rule.rule_id,
        });
      }
    }
    for (let ci = 0; ci < rule.conditions.length; ci++) {
      const cond = rule.conditions[ci];
      if (!ctx.modifierTableRows[cond.table]) {
        messages.push({
          severity: "error",
          code: "GLOBAL_RULE_COND_UNKNOWN_TABLE",
          path: `rules[${i}].conditions[${ci}].table`,
          message: `Global rule condition references unknown table "${cond.table}"`,
          rule_id: rule.rule_id,
        });
      }
    }
  }

  return messages;
}

// ─── Layer 3: Semantic / Coherence Validation ───────────────────────

export function validateSemantic(
  config: MatrixConfigRow,
): ValidationMessage[] {
  const messages: ValidationMessage[] = [];
  const { config_json } = config;

  for (const [tableKey, tc] of Object.entries(config_json.tables)) {
    if (!tc.applicability) {
      if (tc.allowed_row_ids.length > 0) {
        messages.push({
          severity: "warning",
          code: "INAPPLICABLE_WITH_ROWS",
          path: `tables.${tableKey}`,
          message: `Table "${tableKey}" is not applicable but has allowed rows defined`,
        });
      }
      if (tc.default_row_id) {
        messages.push({
          severity: "warning",
          code: "INAPPLICABLE_WITH_DEFAULT",
          path: `tables.${tableKey}.default_row_id`,
          message: `Table "${tableKey}" is not applicable but has a default row set`,
        });
      }
      if (tc.local_rules && tc.local_rules.length > 0) {
        messages.push({
          severity: "warning",
          code: "INAPPLICABLE_WITH_RULES",
          path: `tables.${tableKey}.local_rules`,
          message: `Table "${tableKey}" is not applicable but has local rules defined`,
        });
      }
      continue;
    }

    if (
      tc.default_row_id &&
      tc.allowed_row_ids.length > 0 &&
      !tc.allowed_row_ids.includes(tc.default_row_id)
    ) {
      messages.push({
        severity: "error",
        code: "DEFAULT_NOT_IN_ALLOWED",
        path: `tables.${tableKey}.default_row_id`,
        message: `Default row "${tc.default_row_id}" is not in the allowed rows list`,
        suggested_fix: `Add "${tc.default_row_id}" to allowed_row_ids or change the default`,
      });
    }

    if (
      tc.selection_required &&
      !tc.default_row_id &&
      !tc.null_noop_allowed
    ) {
      messages.push({
        severity: "warning",
        code: "NO_DEFAULT_SELECTION_REQUIRED",
        path: `tables.${tableKey}`,
        message: `Table "${tableKey}" requires selection but has no default and null/noop is not allowed`,
      });
    }

    if (tc.applicability && tc.allowed_row_ids.length === 0) {
      messages.push({
        severity: "warning",
        code: "APPLICABLE_EMPTY_ROWS",
        path: `tables.${tableKey}.allowed_row_ids`,
        message: `Table "${tableKey}" is applicable but has no allowed rows`,
      });
    }

    const dupRows = findDuplicates(tc.allowed_row_ids);
    if (dupRows.length > 0) {
      messages.push({
        severity: "error",
        code: "DUPLICATE_ROW_IDS",
        path: `tables.${tableKey}.allowed_row_ids`,
        message: `Duplicate row IDs: ${dupRows.join(", ")}`,
        suggested_fix: "Remove duplicate entries",
      });
    }
  }

  const globalRuleIds = config_json.rules.map((r) => r.rule_id);
  const dupRuleIds = findDuplicates(globalRuleIds);
  if (dupRuleIds.length > 0) {
    messages.push({
      severity: "error",
      code: "DUPLICATE_GLOBAL_RULE_IDS",
      path: "rules",
      message: `Duplicate global rule IDs: ${dupRuleIds.join(", ")}`,
    });
  }

  for (const [tableKey, tc] of Object.entries(config_json.tables)) {
    if (!tc.local_rules) continue;
    const localIds = tc.local_rules.map((r) => r.rule_id);
    const dupLocal = findDuplicates(localIds);
    if (dupLocal.length > 0) {
      messages.push({
        severity: "error",
        code: "DUPLICATE_LOCAL_RULE_IDS",
        path: `tables.${tableKey}.local_rules`,
        message: `Duplicate local rule IDs in ${tableKey}: ${dupLocal.join(", ")}`,
      });
    }
  }

  for (let i = 0; i < config_json.rules.length; i++) {
    const rule = config_json.rules[i];
    for (const tbl of rule.tables) {
      const tc = config_json.tables[tbl as ModifierTableKey];
      if (tc && !tc.applicability) {
        messages.push({
          severity: "warning",
          code: "GLOBAL_RULE_ON_INAPPLICABLE",
          path: `rules[${i}]`,
          message: `Global rule "${rule.rule_id}" references table "${tbl}" which is not applicable`,
          rule_id: rule.rule_id,
        });
      }
    }
  }

  return messages;
}

export function validateSemanticWithRows(
  config: MatrixConfigRow,
  modifierTableRows: Record<string, Set<string>>,
): ValidationMessage[] {
  const messages: ValidationMessage[] = [];
  const { config_json } = config;

  for (const [tableKey, tc] of Object.entries(config_json.tables)) {
    if (!tc.applicability) continue;

    const knownRows = modifierTableRows[tableKey];
    if (!knownRows) continue;

    if (knownRows.has("NONE") && !tc.allowed_row_ids.includes("NONE")) {
      messages.push({
        severity: "warning",
        code: "NONE_NOT_IN_ALLOWED",
        path: `tables.${tableKey}.allowed_row_ids`,
        message: `Table "${tableKey}" is applicable but NONE is not in allowed_row_ids — authors should always be able to select "unspecified"`,
        suggested_fix: `Add "NONE" to allowed_row_ids for ${tableKey}`,
      });
    }
  }

  return messages;
}

// ─── Full Validation Pipeline ───────────────────────────────────────

export function runStructuralValidation(configJson: unknown): ValidationResult {
  const messages = validateStructural(configJson);
  return buildResult(messages);
}

export function runFullValidation(
  config: MatrixConfigRow,
  ctx: ReferentialContext,
): ValidationResult {
  const structural = validateStructural(config.config_json);
  if (structural.some((m) => m.severity === "error")) {
    return buildResult(structural);
  }

  const referential = validateReferential(config, ctx);
  const semantic = validateSemantic(config);
  const noneChecks = validateSemanticWithRows(config, ctx.modifierTableRows);

  return buildResult([...structural, ...referential, ...semantic, ...noneChecks]);
}

function buildResult(messages: ValidationMessage[]): ValidationResult {
  const errors = messages.filter((m) => m.severity === "error");
  const warnings = messages.filter((m) => m.severity === "warning");
  const info = messages.filter((m) => m.severity === "info");

  return {
    errors,
    warnings,
    info,
    valid: errors.length === 0 && warnings.length === 0,
    can_activate: errors.length === 0,
  };
}

function findDuplicates(arr: string[]): string[] {
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const item of arr) {
    if (seen.has(item)) dups.add(item);
    seen.add(item);
  }
  return [...dups];
}
