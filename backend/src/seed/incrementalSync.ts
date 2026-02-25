/**
 * Incremental single-table sync from JSON to Postgres.
 * Called after every admin JSON write to keep Postgres in sync.
 * Reuses the same upsert/deprecation logic as the full seed pipeline.
 */
import path from "node:path";
import fs from "node:fs";
import pg from "pg";
import { config } from "../config";
import { SEED_ORDER, type SeedTableEntry } from "./topologicalOrder";

const TABLES_DIR = config.tablesDir;

const FIELD_MAP: Record<string, string> = {
  technical_name: "technical_name",
  common_names: "common_names",
  short_description: "short_description",
  exercise_input_permissions: "exercise_input_permissions",
  sort_order: "sort_order",
  is_active: "is_active",
  parent_id: "parent_id",
  parent_ids: "parent_ids",
  upper_lower: "upper_lower",
  muscle_targets: "muscle_targets",
  default_delta_configs: "default_delta_configs",
  delta_rules: "delta_rules",
  angle_range: "angle_range",
  allow_torso_orientations: "allow_torso_orientations",
  is_dynamic: "is_dynamic",
  grip_category: "grip_category",
  rotation_path: "rotation_path",
  load_category: "load_category",
  allows_secondary: "allows_secondary",
  is_valid_secondary: "is_valid_secondary",
  category_id: "category_id",
  is_attachment: "is_attachment",
  requires_attachment: "requires_attachment",
  max_instances: "max_instances",
  modifier_constraints: "modifier_constraints",
  sub_label: "sub_label",
};

const TABLE_COLUMNS: Record<string, string[]> = {
  exercise_categories: ["id", "label", "technical_name", "common_names", "short_description", "exercise_input_permissions", "sort_order", "icon", "is_active", "source_type"],
  cardio_types: ["id", "label", "technical_name", "common_names", "short_description", "sort_order", "icon", "is_active", "source_type"],
  training_focus: ["id", "label", "technical_name", "common_names", "short_description", "sort_order", "icon", "is_active", "source_type"],
  muscles: ["id", "label", "parent_ids", "common_names", "technical_name", "short_description", "function", "location", "triggers", "upper_lower", "sort_order", "icon", "is_active", "source_type"],
  motions: ["id", "label", "parent_id", "upper_lower", "muscle_targets", "default_delta_configs", "common_names", "short_description", "sort_order", "icon", "is_active", "source_type"],
  grips: ["id", "label", "parent_id", "is_dynamic", "grip_category", "rotation_path", "common_names", "delta_rules", "short_description", "sort_order", "icon", "is_active", "source_type"],
  equipment_categories: ["id", "label", "parent_id", "common_names", "short_description", "sort_order", "icon", "is_active", "source_type"],
  motion_paths: ["id", "label", "common_names", "delta_rules", "short_description", "sort_order", "icon", "is_active", "source_type"],
  torso_angles: ["id", "label", "common_names", "short_description", "delta_rules", "angle_range", "allow_torso_orientations", "sort_order", "icon", "is_active", "source_type"],
  torso_orientations: ["id", "label", "common_names", "short_description", "delta_rules", "sort_order", "icon", "is_active", "source_type"],
  resistance_origin: ["id", "label", "common_names", "delta_rules", "short_description", "sort_order", "icon", "is_active", "source_type"],
  grip_widths: ["id", "label", "common_names", "short_description", "delta_rules", "sort_order", "icon", "is_active", "source_type"],
  elbow_relationship: ["id", "label", "common_names", "short_description", "delta_rules", "sort_order", "icon", "is_active", "source_type"],
  execution_styles: ["id", "label", "common_names", "delta_rules", "short_description", "sort_order", "icon", "is_active", "source_type"],
  foot_positions: ["id", "label", "common_names", "short_description", "delta_rules", "sort_order", "icon", "is_active", "source_type"],
  stance_widths: ["id", "label", "common_names", "short_description", "delta_rules", "sort_order", "icon", "is_active", "source_type"],
  stance_types: ["id", "label", "common_names", "short_description", "delta_rules", "sort_order", "icon", "is_active", "source_type"],
  load_placement: ["id", "label", "common_names", "load_category", "allows_secondary", "is_valid_secondary", "delta_rules", "short_description", "sort_order", "icon", "is_active", "source_type"],
  support_structures: ["id", "label", "common_names", "short_description", "delta_rules", "sort_order", "icon", "is_active", "source_type"],
  loading_aids: ["id", "label", "common_names", "short_description", "delta_rules", "sort_order", "icon", "is_active", "source_type"],
  range_of_motion: ["id", "label", "common_names", "short_description", "delta_rules", "sort_order", "icon", "is_active", "source_type"],
  equipment: ["id", "label", "category_id", "common_names", "short_description", "is_attachment", "requires_attachment", "max_instances", "modifier_constraints", "sort_order", "icon", "is_active", "source_type"],
  equipment_icons: ["id", "value", "is_active", "source_type"],
};

function loadJsonFile(filename: string): unknown[] {
  const filePath = path.resolve(TABLES_DIR, filename);
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    return Object.entries(parsed).map(([k, v]) => ({ id: k, value: v }));
  }
  return [];
}

function buildRowValues(row: Record<string, unknown>, columns: string[]): unknown[] {
  return columns.map((col) => {
    if (col === "source_type") return "admin";
    if (col === "is_active") return row.is_active !== undefined ? row.is_active : true;
    const val = row[col];
    if (val === undefined || val === null || val === "null") return null;
    if (typeof val === "object") return JSON.stringify(val);
    return val;
  });
}

function buildUpsertSQL(pgTable: string, columns: string[]): string {
  const colList = columns.map((c) => `"${c}"`).join(", ");
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
  const updates = columns
    .filter((c) => c !== "id")
    .map((c) => `"${c}" = EXCLUDED."${c}"`)
    .join(", ");
  return `INSERT INTO "${pgTable}" (${colList}) VALUES (${placeholders})
    ON CONFLICT ("id") DO UPDATE SET ${updates}`;
}

function buildDeprecateSQL(pgTable: string): string {
  return `UPDATE "${pgTable}" SET is_active = false
    WHERE is_active = true AND id != ALL($1::text[])`;
}

function findSeedEntry(tableKey: string): SeedTableEntry | undefined {
  return SEED_ORDER.find((e) => e.key === tableKey);
}

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({ connectionString: config.databaseUrl });
  }
  return pool;
}

/**
 * Sync a single table from its JSON file into Postgres.
 * Upserts all rows and deprecates (is_active=false) any rows
 * present in Postgres but missing from the JSON.
 */
export async function syncTableToPostgres(tableKey: string): Promise<void> {
  const entry = findSeedEntry(tableKey);
  if (!entry) {
    console.warn(`[incrementalSync] No seed entry for "${tableKey}", skipping Postgres sync`);
    return;
  }

  const columns = TABLE_COLUMNS[entry.pgTable];
  if (!columns) {
    console.warn(`[incrementalSync] No column def for "${entry.pgTable}", skipping`);
    return;
  }

  const rows = loadJsonFile(entry.file);
  if (rows.length === 0) {
    console.log(`[incrementalSync] ${tableKey}: 0 rows, skipping`);
    return;
  }

  const p = getPool();
  const client = await p.connect();

  try {
    await client.query("BEGIN");

    const upsertSql = buildUpsertSQL(entry.pgTable, columns);

    const sortedRows = entry.selfRefColumn
      ? [...rows].sort((a: any, b: any) => {
          const aIsRoot = !a[entry.selfRefColumn!];
          const bIsRoot = !b[entry.selfRefColumn!];
          return aIsRoot === bIsRoot ? 0 : aIsRoot ? -1 : 1;
        })
      : rows;

    for (const row of sortedRows) {
      const values = buildRowValues(row as Record<string, unknown>, columns);
      await client.query(upsertSql, values);
    }

    const seedIds = rows.map((r: any) => r.id);
    if (seedIds.length > 0) {
      const deprecateSql = buildDeprecateSQL(entry.pgTable);
      const result = await client.query(deprecateSql, [seedIds]);
      if (result.rowCount && result.rowCount > 0) {
        console.log(`[incrementalSync] ${tableKey}: deprecated ${result.rowCount} stale row(s)`);
      }
    }

    await client.query("COMMIT");
    console.log(`[incrementalSync] ${tableKey}: synced ${rows.length} rows`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
