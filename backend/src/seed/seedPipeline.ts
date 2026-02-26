/**
 * One-time migration script: seeds reference data from JSON files into Postgres.
 *
 * After initial seeding, Postgres is the sole data source for reference data.
 * This script is kept for re-seeding or resetting the database.
 *
 * - Loads JSON files in topological order
 * - Pre-validates all data
 * - Upserts inside a single transaction
 * - Deprecates stale seed-sourced rows (guarded)
 * - Logs counts, timings, and resulting version_seq
 *
 * Usage: npx tsx src/seed/seedPipeline.ts
 */
import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import pg from "pg";
import { SEED_ORDER, type SeedTableEntry } from "./topologicalOrder";
import {
  validateSeedData,
  formatValidationErrors,
} from "./validators";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const BACKEND_ROOT = path.resolve(__dirname, "../..");
const TABLES_DIR = path.resolve(
  BACKEND_ROOT,
  process.env.TABLES_DIR || "../src/database/tables"
);

/**
 * Column name mapping: JSON camelCase field -> Postgres snake_case column.
 * Only fields that differ from their JSON key need mapping.
 */
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

/**
 * Known columns for each PG table. Derived from the Drizzle schema.
 */
const TABLE_COLUMNS: Record<string, string[]> = {
  exercise_categories: ["id", "label", "technical_name", "common_names", "short_description", "exercise_input_permissions", "sort_order", "icon", "is_active", "source_type"],
  cardio_types: ["id", "label", "technical_name", "common_names", "short_description", "sort_order", "icon", "is_active", "source_type"],
  training_focus: ["id", "label", "technical_name", "common_names", "short_description", "sort_order", "icon", "is_active", "source_type"],
  muscles: ["id", "label", "parent_ids", "common_names", "technical_name", "short_description", "function", "location", "triggers", "upper_lower", "sort_order", "icon", "is_active", "source_type"],
  motions: ["id", "label", "parent_id", "upper_lower", "muscle_targets", "muscle_grouping_id", "default_delta_configs", "common_names", "short_description", "sort_order", "icon", "is_active", "source_type"],
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

function buildRowValues(
  row: Record<string, unknown>,
  columns: string[]
): unknown[] {
  return columns.map((col) => {
    if (col === "source_type") return "seed";
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
    WHERE source_type = 'seed' AND is_active = true AND id != ALL($1::text[])`;
}

async function runSeed() {
  const startTime = Date.now();
  console.log("═══ Reference Data Seed Pipeline ═══\n");
  console.log(`Tables dir: ${TABLES_DIR}`);

  // 1. Load all JSON
  const tableData = new Map<string, unknown[]>();
  for (const entry of SEED_ORDER) {
    const rows = loadJsonFile(entry.file);
    tableData.set(entry.key, rows);
    console.log(`  Loaded ${entry.key}: ${rows.length} rows`);
  }

  // 2. Pre-validate
  console.log("\n── Pre-validation ──");
  const errors = validateSeedData(tableData);
  const fatalErrors = errors.filter((e) => e.severity === "error");
  console.log(formatValidationErrors(errors));

  if (fatalErrors.length > 0) {
    console.error(`\n✗ ${fatalErrors.length} fatal error(s). Aborting seed.`);
    process.exit(1);
  }

  // 3. Connect and seed in transaction
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    console.log("\n── Seeding (transaction) ──");

    const counts: Record<string, number> = {};

    for (const entry of SEED_ORDER) {
      const rows = tableData.get(entry.key)!;
      if (rows.length === 0) {
        counts[entry.key] = 0;
        continue;
      }

      const columns = TABLE_COLUMNS[entry.pgTable];
      if (!columns) {
        throw new Error(`No column definition for ${entry.pgTable}`);
      }

      const sql = buildUpsertSQL(entry.pgTable, columns);

      let selfRefIds: Set<string> | undefined;
      if (entry.selfRefColumn) {
        selfRefIds = new Set(rows.map((r: any) => r.id));
      }

      // For self-referencing tables, insert parents first (null parent_id),
      // then children
      const sortedRows = entry.selfRefColumn
        ? [...rows].sort((a: any, b: any) => {
            const aIsRoot = !a[entry.selfRefColumn!];
            const bIsRoot = !b[entry.selfRefColumn!];
            return aIsRoot === bIsRoot ? 0 : aIsRoot ? -1 : 1;
          })
        : rows;

      for (const row of sortedRows) {
        const values = buildRowValues(row as Record<string, unknown>, columns);
        await client.query(sql, values);
      }

      // Guarded deprecation
      const seedIds = rows.map((r: any) => r.id);
      if (seedIds.length > 0) {
        const deprecateSql = buildDeprecateSQL(entry.pgTable);
        const result = await client.query(deprecateSql, [seedIds]);
        if (result.rowCount && result.rowCount > 0) {
          console.log(
            `  ⚠ ${entry.key}: deprecated ${result.rowCount} stale seed row(s)`
          );
        }
      }

      counts[entry.key] = rows.length;
      process.stdout.write(`  ✓ ${entry.key}: ${rows.length} rows\n`);
    }

    await client.query("COMMIT");
    console.log("\n── Transaction committed ──");

    // 4. Report version_seq
    const versionResult = await client.query(
      "SELECT table_name, version_seq FROM reference_metadata ORDER BY table_name"
    );
    if (versionResult.rows.length > 0) {
      console.log("\n── Version metadata ──");
      for (const r of versionResult.rows) {
        console.log(`  ${r.table_name}: v${r.version_seq}`);
      }
    }

    const elapsed = Date.now() - startTime;
    const totalRows = Object.values(counts).reduce((a, b) => a + b, 0);
    console.log(`\n✓ Seed complete: ${totalRows} rows across ${SEED_ORDER.length} tables in ${elapsed}ms`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n✗ Transaction rolled back due to error:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// CLI entrypoint
if (process.argv[1]?.includes("seedPipeline")) {
  runSeed();
}

export { runSeed, loadJsonFile };
