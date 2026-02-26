import type { DeltaRules, ModifierRow, Motion, Muscle } from "../types";

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
 * Run the full linter across all tables.
 */
export function lintAll(
  motions: Motion[],
  muscles: Muscle[],
  modifierTables: Record<string, ModifierRow[]>
): LintIssue[] {
  const ctx = buildContext(motions, muscles);
  const issues: LintIssue[] = [];

  // Lint motion muscle_targets
  for (const motion of motions) {
    issues.push(...lintMuscleTargets(motion, ctx.muscleIds));

    // Check parent_id references
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

  // Lint delta_rules in all modifier tables
  for (const [tableKey, rows] of Object.entries(modifierTables)) {
    for (const row of rows) {
      issues.push(...lintDeltaRules(tableKey, row, ctx));
    }
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
