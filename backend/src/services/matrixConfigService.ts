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

  async create(data: {
    scope_type: MatrixScopeType;
    scope_id: string;
    config_json: MatrixConfigJson;
    notes?: string;
  }): Promise<MatrixConfigRow> {
    const id = uuidv4();
    const { rows } = await pool.query(
      `INSERT INTO motion_matrix_configs
        (id, scope_type, scope_id, status, schema_version, config_version, config_json, notes)
       VALUES ($1, $2, $3, 'draft', '1.0', 1, $4, $5)
       RETURNING *`,
      [id, data.scope_type, data.scope_id, JSON.stringify(data.config_json), data.notes ?? null],
    );
    return toConfigRow(rows[0]);
  }

  async update(
    id: string,
    data: { config_json?: MatrixConfigJson; notes?: string },
  ): Promise<MatrixConfigRow | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    if (existing.status === "active") {
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
  async softDelete(id: string): Promise<{ ok: boolean; error?: string }> {
    const existing = await this.getById(id);
    if (!existing) {
      return { ok: false, error: "Config not found" };
    }

    if (existing.status === "active") {
      return {
        ok: false,
        error:
          "Cannot delete an active config. Deactivate it first by activating a replacement, or use an explicit deactivate action.",
      };
    }

    const { rowCount } = await pool.query(
      `UPDATE motion_matrix_configs SET is_deleted = TRUE, updated_at = NOW()
       WHERE id = $1 AND is_deleted = FALSE`,
      [id],
    );
    return { ok: (rowCount ?? 0) > 0 };
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

      const { rows: existing } = await client.query(
        `SELECT id FROM motion_matrix_configs
         WHERE scope_type = $1 AND scope_id = $2 AND status = 'active'
           AND is_deleted = FALSE AND id != $3`,
        [config.scope_type, config.scope_id, id],
      );

      let supersededId: string | undefined;
      if (existing.length > 0) {
        supersededId = existing[0].id;
        await client.query(
          `UPDATE motion_matrix_configs SET status = 'draft', updated_at = NOW()
           WHERE id = $1`,
          [supersededId],
        );
      }

      const newVersion = config.config_version + 1;
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
    const { rows } = await pool.query(
      `INSERT INTO motion_matrix_configs
        (id, scope_type, scope_id, status, schema_version, config_version, config_json, notes)
       VALUES ($1, $2, $3, 'draft', $4, 1, $5, $6)
       RETURNING *`,
      [
        newId,
        source.scope_type,
        source.scope_id,
        source.schema_version,
        JSON.stringify(source.config_json),
        source.notes ? `Clone of ${source.id}: ${source.notes}` : `Clone of ${source.id}`,
      ],
    );
    return toConfigRow(rows[0]);
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
}

export const matrixConfigService = new MatrixConfigService();
