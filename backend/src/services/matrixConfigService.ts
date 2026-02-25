import { pool } from "../drizzle/db";
import { v4 as uuidv4 } from "uuid";
import type {
  MatrixConfigRow,
  MatrixConfigJson,
  MatrixScopeType,
  MatrixConfigStatus,
  ValidationResult,
  ValidationStatusSummary,
} from "../../../shared/types/matrixV2";
import { MODIFIER_TABLE_KEYS } from "../../../shared/types/matrixV2";
import {
  runFullValidation,
  runStructuralValidation,
  type ReferentialContext,
} from "../../../shared/validators/matrixV2Validator";

function toConfigRow(row: Record<string, unknown>): MatrixConfigRow {
  return {
    id: row.id as string,
    scope_type: row.scope_type as MatrixScopeType,
    scope_id: row.scope_id as string,
    status: row.status as MatrixConfigStatus,
    schema_version: row.schema_version as string,
    config_version: row.config_version as number,
    config_json: row.config_json as MatrixConfigJson,
    notes: row.notes as string | null,
    validation_status: row.validation_status as ValidationStatusSummary | null,
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

export class MatrixConfigService {
  async list(filters?: {
    scope_type?: MatrixScopeType;
    scope_id?: string;
    status?: MatrixConfigStatus;
    include_deleted?: boolean;
  }): Promise<MatrixConfigRow[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (!filters?.include_deleted) {
      conditions.push("is_deleted = FALSE");
    }
    if (filters?.scope_type) {
      conditions.push(`scope_type = $${idx++}`);
      params.push(filters.scope_type);
    }
    if (filters?.scope_id) {
      conditions.push(`scope_id = $${idx++}`);
      params.push(filters.scope_id);
    }
    if (filters?.status) {
      conditions.push(`status = $${idx++}`);
      params.push(filters.status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT * FROM motion_matrix_configs ${where} ORDER BY updated_at DESC`,
      params,
    );
    return rows.map(toConfigRow);
  }

  async getById(id: string): Promise<MatrixConfigRow | null> {
    const { rows } = await pool.query(
      `SELECT * FROM motion_matrix_configs WHERE id = $1 AND is_deleted = FALSE`,
      [id],
    );
    return rows.length > 0 ? toConfigRow(rows[0]) : null;
  }

  private async nextVersion(
    scopeType: MatrixScopeType,
    scopeId: string,
    client?: import("pg").PoolClient,
  ): Promise<number> {
    const q = client ?? pool;
    const { rows } = await q.query(
      `SELECT COALESCE(MAX(config_version), 0) AS max_ver
       FROM motion_matrix_configs
       WHERE scope_type = $1 AND scope_id = $2`,
      [scopeType, scopeId],
    );
    return (Number(rows[0]?.max_ver) || 0) + 1;
  }

  async create(data: {
    scope_type: MatrixScopeType;
    scope_id: string;
    config_json: MatrixConfigJson;
    notes?: string;
  }): Promise<MatrixConfigRow> {
    const id = uuidv4();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const lockKey = this.scopeLockKey(data.scope_type, data.scope_id);
      await client.query(`SELECT pg_advisory_xact_lock($1)`, [lockKey]);
      const version = await this.nextVersion(data.scope_type, data.scope_id, client);
      const { rows } = await client.query(
        `INSERT INTO motion_matrix_configs
          (id, scope_type, scope_id, status, schema_version, config_version, config_json, notes)
         VALUES ($1, $2, $3, 'draft', '1.0', $4, $5, $6)
         RETURNING *`,
        [id, data.scope_type, data.scope_id, version, JSON.stringify(data.config_json), data.notes ?? null],
      );
      await client.query("COMMIT");
      return toConfigRow(rows[0]);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  private scopeLockKey(scopeType: string, scopeId: string): number {
    let hash = 0x1505;
    const str = `mmc:${scopeType}:${scopeId}`;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0x7fffffff;
    }
    return hash;
  }

  async update(
    id: string,
    data: { config_json?: MatrixConfigJson; notes?: string; force?: boolean },
  ): Promise<MatrixConfigRow | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    if (existing.status === "active" && !data.force) {
      throw new Error("Cannot edit an active config. Clone it to a draft first.");
    }

    const setClauses: string[] = ["updated_at = NOW()"];
    const params: unknown[] = [];
    let idx = 1;

    if (data.config_json !== undefined) {
      setClauses.push(`config_json = $${idx++}`);
      params.push(JSON.stringify(data.config_json));
    }
    if (data.notes !== undefined) {
      setClauses.push(`notes = $${idx++}`);
      params.push(data.notes);
    }

    params.push(id);
    const { rows } = await pool.query(
      `UPDATE motion_matrix_configs SET ${setClauses.join(", ")}
       WHERE id = $${idx} AND is_deleted = FALSE RETURNING *`,
      params,
    );
    return rows.length > 0 ? toConfigRow(rows[0]) : null;
  }

  /**
   * Soft-delete with safety guards:
   * 1. Cannot delete active configs without deactivation
   * 2. Soft-deleted configs are excluded from all default queries
   */
  async softDelete(
    id: string,
    force = false,
  ): Promise<{ ok: boolean; was_active?: boolean; error?: string }> {
    const existing = await this.getById(id);
    if (!existing) {
      return { ok: false, error: "Config not found" };
    }

    if (existing.status === "active" && !force) {
      return {
        ok: false,
        error:
          "Cannot delete an active config. Deactivate it first by activating a replacement, or pass force=true.",
      };
    }

    const wasActive = existing.status === "active";

    const { rowCount } = await pool.query(
      `UPDATE motion_matrix_configs SET is_deleted = TRUE, status = 'draft', updated_at = NOW()
       WHERE id = $1 AND is_deleted = FALSE`,
      [id],
    );
    return { ok: (rowCount ?? 0) > 0, was_active: wasActive };
  }

  async validate(id: string): Promise<ValidationResult> {
    const config = await this.getById(id);
    if (!config) {
      return {
        errors: [
          {
            severity: "error",
            code: "CONFIG_NOT_FOUND",
            path: "",
            message: `Config "${id}" not found`,
          },
        ],
        warnings: [],
        info: [],
        valid: false,
        can_activate: false,
      };
    }

    const ctx = await this.buildReferentialContext();
    const result = runFullValidation(config, ctx);

    const summary: ValidationStatusSummary = result.errors.length > 0
      ? "error"
      : result.warnings.length > 0
        ? "warning"
        : "valid";

    await pool.query(
      `UPDATE motion_matrix_configs
       SET validation_status = $1, validation_summary = $2, updated_at = NOW()
       WHERE id = $3`,
      [summary, JSON.stringify([...result.errors, ...result.warnings, ...result.info]), id],
    );

    return result;
  }

  async activate(
    id: string,
  ): Promise<{ config: MatrixConfigRow; superseded_id?: string } | { error: string }> {
    const config = await this.getById(id);
    if (!config) return { error: "Config not found" };
    if (config.status === "active") return { error: "Config is already active" };

    const validation = await this.validate(id);
    if (!validation.can_activate) {
      return {
        error: `Cannot activate: ${validation.errors.length} validation error(s)`,
      };
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const lockKey = this.scopeLockKey(config.scope_type, config.scope_id);
      await client.query(`SELECT pg_advisory_xact_lock($1)`, [lockKey]);

      const { rows: existing } = await client.query(
        `SELECT id FROM motion_matrix_configs
         WHERE scope_type = $1 AND scope_id = $2 AND status = 'active'
           AND is_deleted = FALSE AND id != $3`,
        [config.scope_type, config.scope_id, id],
      );

      let supersededId: string | undefined;
      if (existing.length > 0) {
        supersededId = existing[0].id;
        const allIds = existing.map((r: any) => r.id as string);
        await client.query(
          `UPDATE motion_matrix_configs SET status = 'draft', updated_at = NOW()
           WHERE id = ANY($1)`,
          [allIds],
        );
      }

      const newVersion = await this.nextVersion(config.scope_type, config.scope_id, client);
      const { rows: activated } = await client.query(
        `UPDATE motion_matrix_configs
         SET status = 'active', config_version = $1, published_at = NOW(),
             updated_at = NOW(), validation_status = 'valid'
         WHERE id = $2 RETURNING *`,
        [newVersion, id],
      );

      await client.query("COMMIT");

      return {
        config: toConfigRow(activated[0]),
        superseded_id: supersededId,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async clone(id: string): Promise<MatrixConfigRow | null> {
    const source = await this.getById(id);
    if (!source) return null;

    const newId = uuidv4();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const lockKey = this.scopeLockKey(source.scope_type, source.scope_id);
      await client.query(`SELECT pg_advisory_xact_lock($1)`, [lockKey]);
      const version = await this.nextVersion(source.scope_type, source.scope_id, client);
      const { rows } = await client.query(
        `INSERT INTO motion_matrix_configs
          (id, scope_type, scope_id, status, schema_version, config_version, config_json, notes)
         VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7)
         RETURNING *`,
        [
          newId,
          source.scope_type,
          source.scope_id,
          source.schema_version,
          version,
          JSON.stringify(source.config_json),
          source.notes ? `Clone of ${source.id}: ${source.notes}` : `Clone of ${source.id}`,
        ],
      );
      await client.query("COMMIT");
      return toConfigRow(rows[0]);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Scan all modifier tables for rows whose delta_rules reference the given motionId.
   * If no active config exists for that motion (or its parent group), auto-create one.
   * If an active config exists, ensure its allowed_row_ids include all rows with deltas.
   */
  async syncDeltasForMotion(
    motionId: string,
  ): Promise<{ action: "created" | "updated" | "noop"; config_id?: string }> {
    const tableKeyToPg: Record<string, string> = {
      motionPaths: "motion_paths",
      torsoAngles: "torso_angles",
      torsoOrientations: "torso_orientations",
      resistanceOrigin: "resistance_origin",
      grips: "grips",
      gripWidths: "grip_widths",
      elbowRelationship: "elbow_relationship",
      executionStyles: "execution_styles",
      footPositions: "foot_positions",
      stanceWidths: "stance_widths",
      stanceTypes: "stance_types",
      loadPlacement: "load_placement",
      supportStructures: "support_structures",
      loadingAids: "loading_aids",
      rangeOfMotion: "range_of_motion",
    };

    const motionResult = await pool.query(
      `SELECT id, parent_id FROM motions WHERE id = $1 AND is_active = true`,
      [motionId],
    );
    if (motionResult.rows.length === 0) {
      return { action: "noop" };
    }
    const motion = motionResult.rows[0];
    const parentId = motion.parent_id as string | null;

    const scopeType: MatrixScopeType = parentId ? "motion" : "motion_group";
    const scopeId = motionId;

    const rowsByTable: Record<string, string[]> = {};
    for (const key of MODIFIER_TABLE_KEYS) {
      const pgName = tableKeyToPg[key];
      if (!pgName) continue;
      try {
        const { rows } = await pool.query(
          `SELECT id FROM "${pgName}" WHERE is_active = true AND delta_rules ? $1`,
          [motionId],
        );
        if (rows.length > 0) {
          rowsByTable[key] = rows.map((r: any) => r.id as string);
        }
      } catch {
        // table may not have delta_rules column
      }
    }

    if (Object.keys(rowsByTable).length === 0) {
      return { action: "noop" };
    }

    const existingConfigs = await this.list({
      scope_type: scopeType,
      scope_id: scopeId,
      status: "active",
    });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const lockKey = this.scopeLockKey(scopeType, scopeId);
      await client.query(`SELECT pg_advisory_xact_lock($1)`, [lockKey]);

      const { rows: activeRows } = await client.query(
        `SELECT id, config_json FROM motion_matrix_configs
         WHERE scope_type = $1 AND scope_id = $2 AND status = 'active' AND is_deleted = FALSE
         ORDER BY updated_at DESC`,
        [scopeType, scopeId],
      );

      if (activeRows.length > 0) {
        const primary = activeRows[0];
        const configJson: MatrixConfigJson = primary.config_json ?? {
          meta: {},
          tables: {},
          rules: [],
          extensions: {},
        };
        let updated = false;
        for (const [tKey, rowIds] of Object.entries(rowsByTable)) {
          if (!configJson.tables[tKey]) {
            configJson.tables[tKey] = {
              applicability: true,
              allowed_row_ids: rowIds,
              default_row_id: rowIds[0] || null,
              null_noop_allowed: false,
            };
            updated = true;
          } else {
            const tc = configJson.tables[tKey];
            for (const rid of rowIds) {
              if (!tc.allowed_row_ids.includes(rid)) {
                tc.allowed_row_ids.push(rid);
                updated = true;
              }
            }
          }
        }

        if (activeRows.length > 1) {
          const dupeIds = activeRows.slice(1).map((r: any) => r.id as string);
          await client.query(
            `UPDATE motion_matrix_configs SET status = 'draft', updated_at = NOW()
             WHERE id = ANY($1)`,
            [dupeIds],
          );
          updated = true;
        }

        if (updated) {
          await client.query(
            `UPDATE motion_matrix_configs SET config_json = $1, updated_at = NOW()
             WHERE id = $2`,
            [JSON.stringify(configJson), primary.id],
          );
        }

        await client.query("COMMIT");
        return updated
          ? { action: "updated", config_id: primary.id }
          : { action: "noop" };
      }

      const configJson: MatrixConfigJson = {
        meta: { description: `Auto-created from delta_rules`, scope_type: scopeType, scope_id: scopeId },
        tables: {},
        rules: [],
        extensions: {},
      };
      for (const [tKey, rowIds] of Object.entries(rowsByTable)) {
        configJson.tables[tKey] = {
          applicability: true,
          allowed_row_ids: rowIds,
          default_row_id: rowIds[0] || null,
          null_noop_allowed: false,
        };
      }

      const newId = uuidv4();
      const version = await this.nextVersion(scopeType, scopeId, client);
      const { rows: created } = await client.query(
        `INSERT INTO motion_matrix_configs
          (id, scope_type, scope_id, status, schema_version, config_version, config_json, notes,
           published_at, validation_status)
         VALUES ($1, $2, $3, 'active', '1.0', $4, $5, 'Auto-created from delta_rules sync',
                 NOW(), 'valid')
         RETURNING *`,
        [newId, scopeType, scopeId, version, JSON.stringify(configJson)],
      );

      await client.query("COMMIT");
      return { action: "created", config_id: created[0].id };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Batch-sync: ensure every motion ID that appears in any delta_rules column
   * across all modifier tables has at least one active Matrix V2 config.
   */
  async syncAllDeltaMotions(): Promise<{
    created: string[];
    updated: string[];
    skipped: string[];
  }> {
    const tableKeyToPg: Record<string, string> = {
      motionPaths: "motion_paths",
      torsoAngles: "torso_angles",
      torsoOrientations: "torso_orientations",
      resistanceOrigin: "resistance_origin",
      grips: "grips",
      gripWidths: "grip_widths",
      elbowRelationship: "elbow_relationship",
      executionStyles: "execution_styles",
      footPositions: "foot_positions",
      stanceWidths: "stance_widths",
      stanceTypes: "stance_types",
      loadPlacement: "load_placement",
      supportStructures: "support_structures",
      loadingAids: "loading_aids",
      rangeOfMotion: "range_of_motion",
    };

    const allMotionIds = new Set<string>();
    for (const key of MODIFIER_TABLE_KEYS) {
      const pgName = tableKeyToPg[key];
      if (!pgName) continue;
      try {
        const { rows } = await pool.query(
          `SELECT DISTINCT jsonb_object_keys(delta_rules) AS mid
           FROM "${pgName}"
           WHERE is_active = true AND delta_rules IS NOT NULL AND delta_rules != 'null'::jsonb`,
        );
        for (const r of rows) {
          allMotionIds.add(r.mid as string);
        }
      } catch {
        // table may not have delta_rules column
      }
    }

    const created: string[] = [];
    const updated: string[] = [];
    const skipped: string[] = [];

    for (const mid of allMotionIds) {
      try {
        const result = await this.syncDeltasForMotion(mid);
        if (result.action === "created") created.push(mid);
        else if (result.action === "updated") updated.push(mid);
        else skipped.push(mid);
      } catch (err) {
        console.warn(`syncDeltasForMotion failed for ${mid}:`, err);
        skipped.push(mid);
      }
    }

    return { created, updated, skipped };
  }

  async buildReferentialContext(): Promise<ReferentialContext> {
    const motionResult = await pool.query(
      `SELECT id, parent_id FROM motions WHERE is_active = true`,
    );
    const validMotionIds = new Set(motionResult.rows.map((r: any) => r.id as string));
    const validGroupIds = new Set(
      motionResult.rows
        .filter((r: any) => !r.parent_id)
        .map((r: any) => r.id as string),
    );
    for (const r of motionResult.rows) {
      if (r.parent_id) validGroupIds.add(r.parent_id as string);
    }

    const modifierTableRows: Record<string, Set<string>> = {};
    const tableKeyToPg: Record<string, string> = {
      motionPaths: "motion_paths",
      torsoAngles: "torso_angles",
      torsoOrientations: "torso_orientations",
      resistanceOrigin: "resistance_origin",
      grips: "grips",
      gripWidths: "grip_widths",
      elbowRelationship: "elbow_relationship",
      executionStyles: "execution_styles",
      footPositions: "foot_positions",
      stanceWidths: "stance_widths",
      stanceTypes: "stance_types",
      loadPlacement: "load_placement",
      supportStructures: "support_structures",
      loadingAids: "loading_aids",
      rangeOfMotion: "range_of_motion",
    };

    for (const key of MODIFIER_TABLE_KEYS) {
      const pgName = tableKeyToPg[key];
      if (!pgName) continue;
      try {
        const { rows } = await pool.query(
          `SELECT id FROM "${pgName}" WHERE is_active = true`,
        );
        modifierTableRows[key] = new Set(rows.map((r: any) => r.id as string));
      } catch {
        modifierTableRows[key] = new Set();
      }
    }

    return { validMotionIds, validGroupIds, modifierTableRows };
  }

  /**
   * One-time cleanup: for every (scope_type, scope_id) with multiple active configs,
   * keep the most recently updated one active and demote the rest to draft.
   * Also re-number any duplicate config_version values within a scope.
   */
  async deduplicateConfigs(): Promise<{
    demoted_active: number;
    renumbered_versions: number;
  }> {
    const client = await pool.connect();
    let demotedActive = 0;
    let renumbered = 0;

    try {
      await client.query("BEGIN");

      const { rows: dupeActives } = await client.query(
        `SELECT scope_type, scope_id, COUNT(*) AS cnt
         FROM motion_matrix_configs
         WHERE status = 'active' AND is_deleted = FALSE
         GROUP BY scope_type, scope_id
         HAVING COUNT(*) > 1`,
      );

      for (const dup of dupeActives) {
        const { rows: actives } = await client.query(
          `SELECT id FROM motion_matrix_configs
           WHERE scope_type = $1 AND scope_id = $2 AND status = 'active' AND is_deleted = FALSE
           ORDER BY updated_at DESC`,
          [dup.scope_type, dup.scope_id],
        );
        if (actives.length <= 1) continue;
        const demoteIds = actives.slice(1).map((r: any) => r.id as string);
        const { rowCount } = await client.query(
          `UPDATE motion_matrix_configs SET status = 'draft', updated_at = NOW()
           WHERE id = ANY($1)`,
          [demoteIds],
        );
        demotedActive += rowCount ?? 0;
      }

      const { rows: dupeVersions } = await client.query(
        `SELECT scope_type, scope_id, config_version, COUNT(*) AS cnt
         FROM motion_matrix_configs
         WHERE is_deleted = FALSE
         GROUP BY scope_type, scope_id, config_version
         HAVING COUNT(*) > 1`,
      );

      for (const dv of dupeVersions) {
        const { rows: configs } = await client.query(
          `SELECT id FROM motion_matrix_configs
           WHERE scope_type = $1 AND scope_id = $2 AND config_version = $3 AND is_deleted = FALSE
           ORDER BY status DESC, updated_at DESC`,
          [dv.scope_type, dv.scope_id, dv.config_version],
        );
        const { rows: maxVerRows } = await client.query(
          `SELECT COALESCE(MAX(config_version), 0) AS max_ver
           FROM motion_matrix_configs
           WHERE scope_type = $1 AND scope_id = $2 AND is_deleted = FALSE`,
          [dv.scope_type, dv.scope_id],
        );
        let nextVer = (Number(maxVerRows[0]?.max_ver) || 0) + 1;
        for (let i = 1; i < configs.length; i++) {
          await client.query(
            `UPDATE motion_matrix_configs SET config_version = $1, updated_at = NOW()
             WHERE id = $2`,
            [nextVer++, configs[i].id],
          );
          renumbered++;
        }
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return { demoted_active: demotedActive, renumbered_versions: renumbered };
  }

  /**
   * Ensure a motion has at least one config row (draft or active).
   * If none exists, creates an empty draft.
   */
  async ensureDraftForMotion(motionId: string): Promise<{ action: "created" | "exists"; config_id?: string }> {
    const motionResult = await pool.query(
      `SELECT id, parent_id FROM motions WHERE id = $1 AND is_active = true`,
      [motionId],
    );
    if (motionResult.rows.length === 0) return { action: "exists" };

    const motion = motionResult.rows[0];
    const scopeType: MatrixScopeType = motion.parent_id ? "motion" : "motion_group";

    const existing = await this.list({ scope_type: scopeType, scope_id: motionId });
    if (existing.length > 0) return { action: "exists" };

    const draft = await this.create({
      scope_type: scopeType,
      scope_id: motionId,
      config_json: emptyConfigJson(),
      notes: "Auto-created placeholder",
    });
    return { action: "created", config_id: draft.id };
  }

  /**
   * Ensure every active motion has at least one config draft.
   */
  async ensureDraftsForAllMotions(): Promise<{ created: string[]; skipped: string[] }> {
    const { rows: allMotions } = await pool.query(
      `SELECT id, parent_id FROM motions WHERE is_active = true`,
    );
    const created: string[] = [];
    const skipped: string[] = [];

    for (const m of allMotions) {
      try {
        const result = await this.ensureDraftForMotion(m.id);
        if (result.action === "created") created.push(m.id);
        else skipped.push(m.id);
      } catch (err) {
        console.warn(`ensureDraftForMotion(${m.id}) failed:`, err);
        skipped.push(m.id);
      }
    }
    return { created, skipped };
  }

  /**
   * Soft-delete all configs for a given motion scope (when the motion itself is deleted).
   */
  async deleteConfigsForMotion(motionId: string): Promise<number> {
    const { rowCount } = await pool.query(
      `UPDATE motion_matrix_configs
       SET is_deleted = TRUE, status = 'draft', updated_at = NOW()
       WHERE scope_id = $1 AND is_deleted = FALSE`,
      [motionId],
    );
    return rowCount ?? 0;
  }
}

function emptyConfigJson(): MatrixConfigJson {
  return { meta: {}, tables: {}, rules: [], extensions: {} };
}

export const matrixConfigService = new MatrixConfigService();
