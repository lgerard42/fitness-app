/**
 * Direct Postgres CRUD operations for admin routes.
 * All admin reads/writes go through here -- no JSON files involved.
 */
import { pool } from "../drizzle/db";

const INTERNAL_COLUMNS = new Set(["source_type"]);

function cleanRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (!INTERNAL_COLUMNS.has(k)) out[k] = v;
  }
  return out;
}

export async function listRows(pgTable: string): Promise<Record<string, unknown>[]> {
  const orderClause = pgTable === "equipment_icons"
    ? 'ORDER BY "id"'
    : 'ORDER BY "sort_order", "id"';
  const { rows } = await pool.query(
    `SELECT * FROM "${pgTable}" WHERE is_active = true ${orderClause}`
  );
  return rows.map(cleanRow);
}

/** Return all row ids in the table (active and inactive). Used for replace-import to clear table. */
export async function listAllRowIds(pgTable: string): Promise<string[]> {
  const { rows } = await pool.query(
    `SELECT id FROM "${pgTable}"`
  );
  return rows.map((r: { id: string }) => String(r.id));
}

export async function countRows(pgTable: string): Promise<number> {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM "${pgTable}" WHERE is_active = true`
  );
  return rows[0].count;
}

export async function getRow(pgTable: string, id: string): Promise<Record<string, unknown> | null> {
  const { rows } = await pool.query(
    `SELECT * FROM "${pgTable}" WHERE id = $1 AND is_active = true`,
    [id]
  );
  return rows.length > 0 ? cleanRow(rows[0]) : null;
}

export async function rowExists(pgTable: string, id: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM "${pgTable}" WHERE id = $1 AND is_active = true`,
    [id]
  );
  return rows.length > 0;
}

export async function insertRow(
  pgTable: string,
  columns: string[],
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const cols = columns.filter((c) => c !== "source_type");
  const allCols = [...cols, "source_type"];
  const colList = allCols.map((c) => `"${c}"`).join(", ");
  const placeholders = allCols.map((_, i) => `$${i + 1}`).join(", ");
  const values = cols.map((c) => {
    const v = data[c];
    if (c === "is_active") return v !== undefined ? v : true;
    if (v === undefined || v === null) return null;
    if (typeof v === "object") return JSON.stringify(v);
    return v;
  });
  values.push("admin");

  const { rows } = await pool.query(
    `INSERT INTO "${pgTable}" (${colList}) VALUES (${placeholders}) RETURNING *`,
    values,
  );
  return cleanRow(rows[0]);
}

export async function updateRow(
  pgTable: string,
  columns: string[],
  id: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const updatable = columns.filter((c) => c !== "id" && c !== "source_type");
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const col of updatable) {
    if (data[col] === undefined) continue;
    setClauses.push(`"${col}" = $${idx}`);
    const v = data[col];
    values.push(v !== null && typeof v === "object" ? JSON.stringify(v) : v ?? null);
    idx++;
  }

  if (setClauses.length === 0) return getRow(pgTable, id);

  values.push(id);
  const { rows } = await pool.query(
    `UPDATE "${pgTable}" SET ${setClauses.join(", ")} WHERE id = $${idx} AND is_active = true RETURNING *`,
    values,
  );
  return rows.length > 0 ? cleanRow(rows[0]) : null;
}

export async function softDeleteRow(pgTable: string, id: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE "${pgTable}" SET is_active = false WHERE id = $1 AND is_active = true`,
    [id],
  );
  return (rowCount ?? 0) > 0;
}

/** Permanently remove a row from the table. Use after cleanup (FKs, configs). */
export async function hardDeleteRow(pgTable: string, id: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM "${pgTable}" WHERE id = $1`,
    [id],
  );
  return (rowCount ?? 0) > 0;
}

export async function reorderRows(
  pgTable: string,
  idOrderPairs: Array<{ id: string; sortOrder: number }>,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const { id, sortOrder } of idOrderPairs) {
      await client.query(
        `UPDATE "${pgTable}" SET sort_order = $1 WHERE id = $2 AND is_active = true`,
        [sortOrder, id],
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function upsertFullTable(
  pgTable: string,
  columns: string[],
  rows: Record<string, unknown>[],
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const cols = columns.filter((c) => c !== "source_type");
    const allCols = [...cols, "source_type"];
    const colList = allCols.map((c) => `"${c}"`).join(", ");
    const placeholders = allCols.map((_, i) => `$${i + 1}`).join(", ");
    const updates = allCols
      .filter((c) => c !== "id")
      .map((c) => `"${c}" = EXCLUDED."${c}"`)
      .join(", ");
    const upsertSql = `INSERT INTO "${pgTable}" (${colList}) VALUES (${placeholders})
      ON CONFLICT ("id") DO UPDATE SET ${updates}`;

    for (const row of rows) {
      const values = cols.map((c) => {
        if (c === "is_active") return row.is_active !== undefined ? row.is_active : true;
        const v = row[c];
        if (v === undefined || v === null) return null;
        if (typeof v === "object") return JSON.stringify(v);
        return v;
      });
      values.push("admin");
      await client.query(upsertSql, values);
    }

    const liveIds = rows.map((r) => r.id as string).filter(Boolean);
    if (liveIds.length > 0) {
      await client.query(
        `UPDATE "${pgTable}" SET is_active = false WHERE is_active = true AND id != ALL($1::text[])`,
        [liveIds],
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function bulkUpdateRows(
  pgTable: string,
  columns: string[],
  updates: Record<string, Record<string, unknown>>,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const [id, data] of Object.entries(updates)) {
      const updatable = columns.filter((c) => c !== "id" && c !== "source_type");
      const setClauses: string[] = [];
      const values: unknown[] = [];
      let idx = 1;
      for (const col of updatable) {
        if (data[col] === undefined) continue;
        setClauses.push(`"${col}" = $${idx}`);
        const v = data[col];
        values.push(v !== null && typeof v === "object" ? JSON.stringify(v) : v ?? null);
        idx++;
      }
      if (setClauses.length === 0) continue;
      values.push(id);
      await client.query(
        `UPDATE "${pgTable}" SET ${setClauses.join(", ")} WHERE id = $${idx} AND is_active = true`,
        values,
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function queryFKIds(
  pgTable: string,
  ids: string[],
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const { rows } = await pool.query(
    `SELECT id FROM "${pgTable}" WHERE id = ANY($1::text[]) AND is_active = true`,
    [ids],
  );
  return new Set(rows.map((r: Record<string, unknown>) => r.id as string));
}

export async function findFKReferences(
  pgTable: string,
  fkColumn: string,
  fkType: "fk" | "fk[]",
  targetId: string,
  idField: string,
  labelField: string,
): Promise<Array<{ rowId: string; rowLabel: string }>> {
  let sql: string;
  if (fkType === "fk") {
    sql = `SELECT "${idField}", "${labelField}" FROM "${pgTable}" WHERE "${fkColumn}" = $1 AND is_active = true`;
  } else {
    sql = `SELECT "${idField}", "${labelField}" FROM "${pgTable}" WHERE "${fkColumn}"::jsonb @> $1::jsonb AND is_active = true`;
  }
  const param = fkType === "fk" ? targetId : JSON.stringify([targetId]);
  const { rows } = await pool.query(sql, [param]);
  return rows.map((r: Record<string, unknown>) => ({
    rowId: r[idField] as string,
    rowLabel: r[labelField] as string,
  }));
}

export async function handleFKCleanupPg(
  pgTable: string,
  fkColumn: string,
  fkType: "fk" | "fk[]",
  targetId: string,
  mode: "break" | "reassign",
  reassignTo?: string,
): Promise<void> {
  if (fkType === "fk") {
    const newVal = mode === "reassign" && reassignTo ? reassignTo : "";
    // Clear FK in all rows (including inactive) so delete can succeed when clearing table
    await pool.query(
      `UPDATE "${pgTable}" SET "${fkColumn}" = $1 WHERE "${fkColumn}" = $2`,
      [newVal, targetId],
    );
  } else {
    const allRows = await pool.query(
      `SELECT id, "${fkColumn}" FROM "${pgTable}" WHERE "${fkColumn}"::jsonb @> $1::jsonb`,
      [JSON.stringify([targetId])],
    );
    for (const row of allRows.rows) {
      const arr = row[fkColumn] as string[];
      const updated = mode === "reassign" && reassignTo
        ? arr.map((v: string) => (v === targetId ? reassignTo : v))
        : arr.filter((v: string) => v !== targetId);
      await pool.query(
        `UPDATE "${pgTable}" SET "${fkColumn}" = $1::jsonb WHERE id = $2`,
        [JSON.stringify(updated), row.id],
      );
    }
  }
}

/** Set of muscle IDs that appear as a parent (in any row's parent_ids). Used to strip parent keys with 0 from delta_rules. */
export async function getParentMuscleIds(): Promise<Set<string>> {
  const { rows } = await pool.query<{ parent_ids: unknown }>(
    `SELECT parent_ids FROM muscles WHERE is_active = true AND parent_ids IS NOT NULL`,
  );
  const parentIds = new Set<string>();
  for (const row of rows) {
    let pids = row.parent_ids;
    if (typeof pids === "string") {
      try {
        pids = JSON.parse(pids);
      } catch {
        continue;
      }
    }
    if (Array.isArray(pids)) {
      for (const id of pids) if (typeof id === "string") parentIds.add(id);
    }
  }
  return parentIds;
}

export async function cleanMotionDeltaRules(
  motionId: string,
): Promise<void> {
  const { rows } = await pool.query(
    `SELECT id, delta_rules FROM "motion_paths" WHERE is_active = true AND delta_rules IS NOT NULL`
  );
  for (const row of rows) {
    const rules = row.delta_rules;
    if (rules && typeof rules === "object" && motionId in rules) {
      delete rules[motionId];
      await pool.query(
        `UPDATE "motion_paths" SET delta_rules = $1::jsonb WHERE id = $2`,
        [JSON.stringify(rules), row.id],
      );
    }
  }
}
