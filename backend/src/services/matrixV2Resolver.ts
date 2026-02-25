import { pool } from "../drizzle/db";
import type {
  MatrixConfigRow,
  MatrixConfigJson,
  ResolverOutput,
  ResolvedFrom,
  EffectiveTableConfig,
  TableConfig,
  LocalRule,
  GlobalRule,
  ValidationMessage,
  ResolverMode,
  ModifierTableKey,
} from "../../../shared/types/matrixV2";

const RESOLVER_VERSION = "1.0.0";

export class MatrixV2Resolver {
  async resolve(
    motionId: string,
    mode: ResolverMode = "active_only",
  ): Promise<ResolverOutput> {
    const diagnostics: ValidationMessage[] = [];

    const motion = await this.loadMotion(motionId);
    if (!motion) {
      return this.emptyOutput(motionId, null, mode, [
        {
          severity: "error",
          code: "MOTION_NOT_FOUND",
          path: "motion_id",
          message: `Motion "${motionId}" not found`,
        },
      ]);
    }

    const groupId = await this.resolveGroupId(motionId);

    const statusFilter = mode === "active_only" ? "active" : null;

    const groupConfig = groupId
      ? await this.loadConfig("motion_group", groupId, statusFilter)
      : null;
    const motionConfig = await this.loadConfig("motion", motionId, statusFilter);

    if (!groupConfig && !motionConfig) {
      diagnostics.push({
        severity: "info",
        code: "NO_CONFIG_FOUND",
        path: "",
        message: `No matrix config found for motion "${motionId}" or group "${groupId}"`,
      });
      return this.emptyOutput(motionId, groupId, mode, diagnostics);
    }

    if (!groupConfig && motionConfig) {
      diagnostics.push({
        severity: "info",
        code: "MOTION_ONLY_CONFIG",
        path: "",
        message: `Only motion-level config exists (no group config for "${groupId}")`,
      });
    }

    if (groupConfig && !motionConfig) {
      diagnostics.push({
        severity: "info",
        code: "GROUP_ONLY_CONFIG",
        path: "",
        message: `Only group-level config exists (no motion-specific override)`,
      });
    }

    const resolvedFrom: ResolvedFrom = {
      group_config_id: groupConfig?.id ?? null,
      group_config_version: groupConfig?.config_version ?? null,
      group_status: groupConfig?.status ?? null,
      motion_config_id: motionConfig?.id ?? null,
      motion_config_version: motionConfig?.config_version ?? null,
      motion_status: motionConfig?.status ?? null,
      resolved_at: new Date().toISOString(),
    };

    const groupJson = groupConfig?.config_json;
    const motionJson = motionConfig?.config_json;

    const effectiveTables = this.mergeTables(groupJson, motionJson, diagnostics);
    const effectiveRules = this.mergeGlobalRules(groupJson, motionJson, diagnostics);

    return {
      resolver_version: RESOLVER_VERSION,
      resolved_from: resolvedFrom,
      motion_id: motionId,
      resolved_group_id: groupId,
      mode,
      effective_tables: effectiveTables,
      effective_rules: effectiveRules,
      diagnostics,
    };
  }

  private mergeTables(
    groupJson: MatrixConfigJson | undefined,
    motionJson: MatrixConfigJson | undefined,
    diagnostics: ValidationMessage[],
  ): Partial<Record<ModifierTableKey, EffectiveTableConfig>> {
    const result: Partial<Record<ModifierTableKey, EffectiveTableConfig>> = {};

    const allTableKeys = new Set<string>();
    if (groupJson) Object.keys(groupJson.tables).forEach((k) => allTableKeys.add(k));
    if (motionJson) Object.keys(motionJson.tables).forEach((k) => allTableKeys.add(k));

    for (const key of allTableKeys) {
      const tableKey = key as ModifierTableKey;
      const groupTC = groupJson?.tables[tableKey];
      const motionTC = motionJson?.tables[tableKey];

      if (motionTC && groupTC) {
        result[tableKey] = this.mergeTableConfig(groupTC, motionTC, tableKey, diagnostics);
      } else if (motionTC) {
        result[tableKey] = this.tableConfigToEffective(motionTC, "motion");
      } else if (groupTC) {
        result[tableKey] = this.tableConfigToEffective(groupTC, "group");
      }
    }

    return result;
  }

  private mergeTableConfig(
    group: TableConfig,
    motion: TableConfig,
    tableKey: string,
    diagnostics: ValidationMessage[],
  ): EffectiveTableConfig {
    const applicability = motion.applicability;

    const allowed_row_ids =
      motion.allowed_row_ids.length > 0
        ? motion.allowed_row_ids
        : group.allowed_row_ids;

    const default_row_id =
      motion.default_row_id !== undefined
        ? motion.default_row_id
        : group.default_row_id;

    const null_noop_allowed = motion.null_noop_allowed;
    const selection_required = motion.selection_required ?? group.selection_required;

    const mergedLocalRules = this.mergeLocalRules(
      group.local_rules ?? [],
      motion.local_rules ?? [],
      tableKey,
      diagnostics,
    );

    if (
      default_row_id &&
      allowed_row_ids.length > 0 &&
      !allowed_row_ids.includes(default_row_id)
    ) {
      diagnostics.push({
        severity: "warning",
        code: "MERGED_DEFAULT_NOT_IN_ALLOWED",
        path: `effective_tables.${tableKey}`,
        message: `Merged default "${default_row_id}" is not in the resolved allowed rows`,
      });
    }

    return {
      applicability,
      allowed_row_ids,
      default_row_id: default_row_id ?? null,
      null_noop_allowed,
      selection_required,
      local_rules: mergedLocalRules,
      source: "merged",
    };
  }

  private mergeLocalRules(
    groupRules: LocalRule[],
    motionRules: LocalRule[],
    tableKey: string,
    diagnostics: ValidationMessage[],
  ): LocalRule[] {
    const ruleMap = new Map<string, LocalRule>();

    for (const rule of groupRules) {
      ruleMap.set(rule.rule_id, rule);
    }

    for (const rule of motionRules) {
      if (rule._tombstoned) {
        if (ruleMap.has(rule.rule_id)) {
          ruleMap.delete(rule.rule_id);
        } else {
          diagnostics.push({
            severity: "warning",
            code: "TOMBSTONE_NO_TARGET",
            path: `effective_tables.${tableKey}.local_rules`,
            message: `Tombstone for rule "${rule.rule_id}" has no matching group rule`,
            rule_id: rule.rule_id,
          });
        }
      } else {
        ruleMap.set(rule.rule_id, rule);
      }
    }

    return Array.from(ruleMap.values()).filter((r) => !r._tombstoned);
  }

  private mergeGlobalRules(
    groupJson: MatrixConfigJson | undefined,
    motionJson: MatrixConfigJson | undefined,
    diagnostics: ValidationMessage[],
  ): GlobalRule[] {
    const ruleMap = new Map<string, GlobalRule>();

    if (groupJson) {
      for (const rule of groupJson.rules) {
        ruleMap.set(rule.rule_id, rule);
      }
    }

    if (motionJson) {
      for (const rule of motionJson.rules) {
        if (rule._tombstoned) {
          if (ruleMap.has(rule.rule_id)) {
            ruleMap.delete(rule.rule_id);
          } else {
            diagnostics.push({
              severity: "warning",
              code: "GLOBAL_TOMBSTONE_NO_TARGET",
              path: "effective_rules",
              message: `Global tombstone for rule "${rule.rule_id}" has no matching group rule`,
              rule_id: rule.rule_id,
            });
          }
        } else {
          ruleMap.set(rule.rule_id, rule);
        }
      }
    }

    return Array.from(ruleMap.values()).filter((r) => !r._tombstoned);
  }

  private tableConfigToEffective(
    tc: TableConfig,
    source: "group" | "motion",
  ): EffectiveTableConfig {
    return {
      applicability: tc.applicability,
      allowed_row_ids: tc.allowed_row_ids,
      default_row_id: tc.default_row_id,
      null_noop_allowed: tc.null_noop_allowed,
      selection_required: tc.selection_required,
      local_rules: (tc.local_rules ?? []).filter((r) => !r._tombstoned),
      source,
    };
  }

  private emptyOutput(
    motionId: string,
    groupId: string | null,
    mode: ResolverMode,
    diagnostics: ValidationMessage[],
  ): ResolverOutput {
    return {
      resolver_version: RESOLVER_VERSION,
      resolved_from: {
        group_config_id: null,
        group_config_version: null,
        group_status: null,
        motion_config_id: null,
        motion_config_version: null,
        motion_status: null,
        resolved_at: new Date().toISOString(),
      },
      motion_id: motionId,
      resolved_group_id: groupId,
      mode,
      effective_tables: {},
      effective_rules: [],
      diagnostics,
    };
  }

  async loadMotion(
    motionId: string,
  ): Promise<{ id: string; parent_id: string | null } | null> {
    const { rows } = await pool.query(
      `SELECT id, parent_id FROM motions WHERE id = $1 AND is_active = true`,
      [motionId],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async resolveGroupId(motionId: string): Promise<string | null> {
    let currentId: string | null = motionId;
    let parentId: string | null = null;
    const visited = new Set<string>();

    while (currentId) {
      if (visited.has(currentId)) break;
      visited.add(currentId);

      const { rows } = await pool.query(
        `SELECT parent_id FROM motions WHERE id = $1 AND is_active = true`,
        [currentId],
      );

      if (rows.length === 0) break;

      if (rows[0].parent_id) {
        parentId = rows[0].parent_id;
        currentId = rows[0].parent_id;
      } else {
        if (currentId !== motionId) {
          parentId = currentId;
        }
        break;
      }
    }

    return parentId;
  }

  async loadConfig(
    scopeType: string,
    scopeId: string,
    statusFilter: string | null,
  ): Promise<MatrixConfigRow | null> {
    let sql = `SELECT * FROM motion_matrix_configs
      WHERE scope_type = $1 AND scope_id = $2 AND is_deleted = FALSE`;
    const params: unknown[] = [scopeType, scopeId];

    if (statusFilter) {
      sql += ` AND status = $3`;
      params.push(statusFilter);
    }

    sql += ` ORDER BY
      CASE WHEN status = 'active' THEN 0 ELSE 1 END,
      updated_at DESC
      LIMIT 1`;

    const { rows } = await pool.query(sql, params);
    return rows.length > 0 ? this.toConfigRow(rows[0]) : null;
  }

  private toConfigRow(row: Record<string, unknown>): MatrixConfigRow {
    return {
      id: row.id as string,
      scope_type: row.scope_type as any,
      scope_id: row.scope_id as string,
      status: row.status as any,
      schema_version: row.schema_version as string,
      config_version: row.config_version as number,
      config_json: row.config_json as any,
      notes: row.notes as string | null,
      validation_status: row.validation_status as any,
      validation_summary: row.validation_summary as any,
      is_deleted: row.is_deleted as boolean,
      created_at: (row.created_at as Date).toISOString(),
      updated_at: (row.updated_at as Date).toISOString(),
      published_at: row.published_at
        ? (row.published_at as Date).toISOString()
        : null,
      created_by: row.created_by as string | null,
      updated_by: row.updated_by as string | null,
    };
  }
}

export const matrixV2Resolver = new MatrixV2Resolver();
