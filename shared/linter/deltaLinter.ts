import type { DeltaRules, ModifierRow, Motion, Muscle, ComboRule } from "../types";
import { MODIFIER_TABLE_KEYS } from "../types/matrixV2";

export type LintSeverity = "error" | "warning" | "info";

export interface LintIssue {
  severity: LintSeverity;
  table: string;
  rowId: string;
  field: string;
  message: string;
}

interface LintContext {
  motionIds: Set<string>;
  muscleIds: Set<string>;
  motions: Record<string, Motion>;
}

function buildContext(
  motions: Motion[],
  muscles: Muscle[]
): LintContext {
  return {
    motionIds: new Set(motions.map((m) => m.id)),
    muscleIds: new Set(muscles.map((m) => m.id)),
    motions: Object.fromEntries(motions.map((m) => [m.id, m])),
  };
}

/**
 * Check a single modifier row's delta_rules for issues.
 */
function lintDeltaRules(
  tableKey: string,
  row: ModifierRow,
  ctx: LintContext
): LintIssue[] {
  const issues: LintIssue[] = [];
  const deltaRules = row.delta_rules;

  if (!deltaRules || typeof deltaRules !== "object") return issues;
  if (Array.isArray(deltaRules)) {
    if (deltaRules.length > 0) {
      issues.push({
        severity: "error",
        table: tableKey,
        rowId: row.id,
        field: "delta_rules",
        message: "delta_rules is a non-empty array (should be object or empty array)",
      });
    }
    return issues;
  }

  for (const [motionId, entry] of Object.entries(
    deltaRules as Record<string, unknown>
  )) {
    // Check motion ID exists
    if (!ctx.motionIds.has(motionId)) {
      issues.push({
        severity: "error",
        table: tableKey,
        rowId: row.id,
        field: `delta_rules.${motionId}`,
        message: `Unknown motion ID "${motionId}"`,
      });
      continue;
    }

    if (entry === "inherit") {
      // Validate that inherit can actually resolve
      const motion = ctx.motions[motionId];
      if (!motion?.parent_id) {
        issues.push({
          severity: "error",
          table: tableKey,
          rowId: row.id,
          field: `delta_rules.${motionId}`,
          message: `"inherit" used but motion "${motionId}" has no parent_id`,
        });
      } else {
        // Check for circular inheritance
        const visited = new Set<string>();
        let current = motionId;
        let circular = false;
        while (current) {
          if (visited.has(current)) {
            circular = true;
            break;
          }
          visited.add(current);
          const m = ctx.motions[current];
          if (!m?.parent_id) break;

          const parentEntry = (deltaRules as DeltaRules)[m.parent_id];
          if (parentEntry === "inherit") {
            current = m.parent_id;
          } else {
            break;
          }
        }
        if (circular) {
          issues.push({
            severity: "error",
            table: tableKey,
            rowId: row.id,
            field: `delta_rules.${motionId}`,
            message: `Circular inheritance detected starting at "${motionId}"`,
          });
        }
      }
      continue;
    }

    if (typeof entry === "object" && entry !== null && !Array.isArray(entry)) {
      // Validate muscle IDs in delta values
      for (const [muscleId, value] of Object.entries(
        entry as Record<string, unknown>
      )) {
        if (!ctx.muscleIds.has(muscleId)) {
          issues.push({
            severity: "warning",
            table: tableKey,
            rowId: row.id,
            field: `delta_rules.${motionId}.${muscleId}`,
            message: `Unknown muscle ID "${muscleId}"`,
          });
        }
        if (typeof value !== "number") {
          issues.push({
            severity: "error",
            table: tableKey,
            rowId: row.id,
            field: `delta_rules.${motionId}.${muscleId}`,
            message: `Delta value must be a number, got ${typeof value}`,
          });
        }
      }
    } else if (entry !== null) {
      issues.push({
        severity: "error",
        table: tableKey,
        rowId: row.id,
        field: `delta_rules.${motionId}`,
        message: `Invalid delta entry type: ${typeof entry}`,
      });
    }
  }

  return issues;
}

/**
 * Lint muscle_targets (flat map) for unknown muscle IDs and non-number values.
 */
function lintMuscleTargets(
  motion: Motion,
  muscleIds: Set<string>
): LintIssue[] {
  const issues: LintIssue[] = [];
  if (!motion.muscle_targets) return issues;

  const mt = motion.muscle_targets as Record<string, unknown>;
  for (const [muscleId, value] of Object.entries(mt)) {
    if (!muscleIds.has(muscleId)) {
      issues.push({
        severity: "warning",
        table: "motions",
        rowId: motion.id,
        field: `muscle_targets.${muscleId}`,
        message: `Unknown muscle ID "${muscleId}" in muscle_targets`,
      });
    }
    if (typeof value !== "number") {
      issues.push({
        severity: "error",
        table: "motions",
        rowId: motion.id,
        field: `muscle_targets.${muscleId}`,
        message: `Score must be a number, got ${typeof value}`,
      });
    }
  }

  return issues;
}

/**
 * Lint combo rules for referential integrity and structural issues.
 */
function lintComboRules(
  comboRules: ComboRule[],
  ctx: LintContext,
  modifierTableKeys: Set<string>
): LintIssue[] {
  const issues: LintIssue[] = [];

  for (const rule of comboRules) {
    if (!ctx.motionIds.has(rule.motion_id)) {
      issues.push({
        severity: "error",
        table: "combo_rules",
        rowId: rule.id,
        field: "motion_id",
        message: `Unknown motion ID "${rule.motion_id}"`,
      });
    }

    const conditions = Array.isArray(rule.trigger_conditions_json)
      ? rule.trigger_conditions_json
      : [];
    for (let i = 0; i < conditions.length; i++) {
      const cond = conditions[i];
      if (!modifierTableKeys.has(cond.tableKey)) {
        issues.push({
          severity: "warning",
          table: "combo_rules",
          rowId: rule.id,
          field: `trigger_conditions_json[${i}].tableKey`,
          message: `Unknown modifier table key "${cond.tableKey}"`,
        });
      }
    }

    if (conditions.length === 0) {
      issues.push({
        severity: "warning",
        table: "combo_rules",
        rowId: rule.id,
        field: "trigger_conditions_json",
        message: "Rule has no trigger conditions and will never fire",
      });
    }

    const payload = rule.action_payload_json as Record<string, unknown>;

    if (rule.action_type === "SWITCH_MOTION") {
      const proxyId = payload?.proxy_motion_id as string | undefined;
      if (!proxyId) {
        issues.push({
          severity: "error",
          table: "combo_rules",
          rowId: rule.id,
          field: "action_payload_json.proxy_motion_id",
          message: "SWITCH_MOTION requires proxy_motion_id in payload",
        });
      } else if (!ctx.motionIds.has(proxyId)) {
        issues.push({
          severity: "error",
          table: "combo_rules",
          rowId: rule.id,
          field: "action_payload_json.proxy_motion_id",
          message: `Proxy motion "${proxyId}" not found in motions`,
        });
      } else {
        const proxyMotion = ctx.motions[proxyId];
        if (!proxyMotion?.muscle_targets || Object.keys(proxyMotion.muscle_targets).length === 0) {
          issues.push({
            severity: "warning",
            table: "combo_rules",
            rowId: rule.id,
            field: "action_payload_json.proxy_motion_id",
            message: `Proxy motion "${proxyId}" has no muscle_targets (umbrella motion)`,
          });
        }
      }
    }

    if (rule.action_type === "REPLACE_DELTA") {
      const tableKey = payload?.table_key as string | undefined;
      const rowId = payload?.row_id as string | undefined;
      if (!tableKey || !rowId) {
        issues.push({
          severity: "error",
          table: "combo_rules",
          rowId: rule.id,
          field: "action_payload_json",
          message: "REPLACE_DELTA requires table_key and row_id in payload",
        });
      } else if (!modifierTableKeys.has(tableKey)) {
        issues.push({
          severity: "error",
          table: "combo_rules",
          rowId: rule.id,
          field: "action_payload_json.table_key",
          message: `Unknown modifier table key "${tableKey}" in REPLACE_DELTA payload`,
        });
      }
    }

    if (rule.action_type === "CLAMP_MUSCLE") {
      const clamps = payload?.clamps as Record<string, unknown> | undefined;
      if (!clamps || typeof clamps !== "object") {
        issues.push({
          severity: "error",
          table: "combo_rules",
          rowId: rule.id,
          field: "action_payload_json.clamps",
          message: "CLAMP_MUSCLE requires a clamps object in payload",
        });
      } else {
        for (const [muscleId, value] of Object.entries(clamps)) {
          if (!ctx.muscleIds.has(muscleId)) {
            issues.push({
              severity: "warning",
              table: "combo_rules",
              rowId: rule.id,
              field: `action_payload_json.clamps.${muscleId}`,
              message: `Unknown muscle ID "${muscleId}" in CLAMP_MUSCLE`,
            });
          }
          if (typeof value !== "number") {
            issues.push({
              severity: "error",
              table: "combo_rules",
              rowId: rule.id,
              field: `action_payload_json.clamps.${muscleId}`,
              message: `Clamp value must be a number, got ${typeof value}`,
            });
          }
        }
      }
    }

    if (!["SWITCH_MOTION", "REPLACE_DELTA", "CLAMP_MUSCLE"].includes(rule.action_type)) {
      issues.push({
        severity: "error",
        table: "combo_rules",
        rowId: rule.id,
        field: "action_type",
        message: `Unknown action type "${rule.action_type}" — expected SWITCH_MOTION, REPLACE_DELTA, or CLAMP_MUSCLE`,
      });
    }
  }

  return issues;
}

/**
 * Verify each modifier table has a NONE row with empty delta_rules.
 */
function lintNoneRows(
  modifierTables: Record<string, ModifierRow[]>,
): LintIssue[] {
  const issues: LintIssue[] = [];

  for (const tableKey of MODIFIER_TABLE_KEYS) {
    const rows = modifierTables[tableKey];
    if (!rows) continue;

    const noneRow = rows.find((r) => r.id === "NONE");
    if (!noneRow) {
      issues.push({
        severity: "error",
        table: tableKey,
        rowId: "(missing)",
        field: "id",
        message: `Modifier table "${tableKey}" has no NONE row — every table must have a NONE anchor`,
      });
      continue;
    }

    const dr = noneRow.delta_rules;
    if (dr && typeof dr === "object" && !Array.isArray(dr)) {
      for (const [motionId, entry] of Object.entries(dr as Record<string, unknown>)) {
        if (
          entry !== null &&
          entry !== "inherit" &&
          typeof entry === "object" &&
          Object.keys(entry as Record<string, unknown>).length > 0
        ) {
          issues.push({
            severity: "error",
            table: tableKey,
            rowId: "NONE",
            field: `delta_rules.${motionId}`,
            message: `NONE row must not have real deltas (found muscle entries for "${motionId}")`,
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Validate default_delta_configs row IDs against modifier table data.
 */
function lintDefaultDeltaConfigs(
  motion: Motion,
  modifierTables: Record<string, ModifierRow[]>,
): LintIssue[] {
  const issues: LintIssue[] = [];
  const ddc = motion.default_delta_configs;
  if (!ddc || typeof ddc !== "object") return issues;

  const validTableKeys = new Set<string>(MODIFIER_TABLE_KEYS);

  for (const [tableKey, rowId] of Object.entries(ddc)) {
    if (!validTableKeys.has(tableKey)) {
      issues.push({
        severity: "warning",
        table: "motions",
        rowId: motion.id,
        field: `default_delta_configs.${tableKey}`,
        message: `Unknown modifier table key "${tableKey}"`,
      });
      continue;
    }

    const rows = modifierTables[tableKey];
    if (!rows) continue;

    if (!rows.some((r) => r.id === rowId)) {
      issues.push({
        severity: "warning",
        table: "motions",
        rowId: motion.id,
        field: `default_delta_configs.${tableKey}`,
        message: `Default row ID "${rowId}" not found in ${tableKey}`,
      });
    }
  }

  return issues;
}

/**
 * Run the full linter across all tables.
 */
export function lintAll(
  motions: Motion[],
  muscles: Muscle[],
  modifierTables: Record<string, ModifierRow[]>,
  comboRules?: ComboRule[]
): LintIssue[] {
  const ctx = buildContext(motions, muscles);
  const issues: LintIssue[] = [];

  issues.push(...lintNoneRows(modifierTables));

  for (const motion of motions) {
    issues.push(...lintMuscleTargets(motion, ctx.muscleIds));
    issues.push(...lintDefaultDeltaConfigs(motion, modifierTables));

    if (motion.parent_id && !ctx.motionIds.has(motion.parent_id)) {
      issues.push({
        severity: "error",
        table: "motions",
        rowId: motion.id,
        field: "parent_id",
        message: `Unknown parent motion ID "${motion.parent_id}"`,
      });
    }
  }

  for (const [tableKey, rows] of Object.entries(modifierTables)) {
    for (const row of rows) {
      issues.push(...lintDeltaRules(tableKey, row, ctx));
    }
  }

  if (comboRules && comboRules.length > 0) {
    const modifierTableKeys = new Set(Object.keys(modifierTables));
    issues.push(...lintComboRules(comboRules, ctx, modifierTableKeys));
  }

  return issues;
}

/**
 * Format lint results for console output.
 */
export function formatLintResults(issues: LintIssue[]): string {
  if (issues.length === 0) return "No issues found.";

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const infos = issues.filter((i) => i.severity === "info");

  const lines: string[] = [];

  for (const issue of issues) {
    const icon =
      issue.severity === "error"
        ? "ERR"
        : issue.severity === "warning"
          ? "WRN"
          : "INF";
    lines.push(
      `[${icon}] ${issue.table}/${issue.rowId} → ${issue.field}: ${issue.message}`
    );
  }

  lines.push("");
  lines.push(
    `Summary: ${errors.length} errors, ${warnings.length} warnings, ${infos.length} info`
  );

  return lines.join("\n");
}
