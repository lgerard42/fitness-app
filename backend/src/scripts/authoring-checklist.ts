/**
 * Postgres-backed authoring checklist and coverage report.
 *
 * Reads motions, modifier tables, and matrix configs from Postgres.
 * Outputs:
 *   - Per-table coverage (X/Y motions have delta_rules)
 *   - Per-motion coverage (X/Y tables have delta_rules)
 *   - Incomplete combos ("still to do" list)
 *   - NONE row status per table
 *
 * Run: npx tsx src/scripts/authoring-checklist.ts
 */
import dotenv from "dotenv";
import path from "node:path";
import pg from "pg";
import { TABLE_KEY_TO_PG } from "../drizzle/schema/referenceTables";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const MODIFIER_TABLE_KEYS = [
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
];

interface Motion {
  id: string;
  label: string;
  parent_id: string | null;
  is_active: boolean;
}

interface ModifierRow {
  id: string;
  label: string;
  delta_rules: Record<string, unknown> | null;
  is_active: boolean;
}

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const { rows: motions } = await pool.query<Motion>(
      `SELECT id, label, parent_id, is_active FROM motions WHERE is_active = true ORDER BY sort_order, id`
    );
    const motionIds = motions.map((m) => m.id);

    console.log("=== Authoring Checklist (Postgres) ===\n");
    console.log(`Active motions: ${motions.length}\n`);

    const tableCoverage: Record<string, { authored: number; total: number; empty: number; inherit: number }> = {};
    const motionCoverage: Record<string, { authored: number; total: number; tables: string[] }> = {};
    const noneStatus: Record<string, { exists: boolean; hasDeltas: boolean }> = {};

    for (const mid of motionIds) {
      motionCoverage[mid] = { authored: 0, total: MODIFIER_TABLE_KEYS.length, tables: [] };
    }

    for (const tableKey of MODIFIER_TABLE_KEYS) {
      const pgTable = TABLE_KEY_TO_PG[tableKey] || tableKey;
      let rows: ModifierRow[];
      try {
        const result = await pool.query<ModifierRow>(
          `SELECT id, label, delta_rules, is_active FROM "${pgTable}" WHERE is_active = true ORDER BY sort_order, id`
        );
        rows = result.rows;
      } catch {
        console.warn(`  [skip] Table ${pgTable} not found`);
        continue;
      }

      const noneRow = rows.find((r) => r.id === "NONE");
      const hasDeltas =
        noneRow?.delta_rules &&
        typeof noneRow.delta_rules === "object" &&
        Object.values(noneRow.delta_rules).some(
          (v) => v && typeof v === "object" && Object.keys(v as Record<string, unknown>).length > 0
        );
      noneStatus[tableKey] = { exists: !!noneRow, hasDeltas: !!hasDeltas };

      let authored = 0;
      let emptyCount = 0;
      let inheritCount = 0;

      for (const motionId of motionIds) {
        let found = false;
        for (const row of rows) {
          const dr = row.delta_rules;
          if (!dr || typeof dr !== "object") continue;
          if (!(motionId in dr)) continue;
          found = true;
          const entry = dr[motionId];
          if (entry === "inherit") inheritCount++;
          else if (typeof entry === "object" && entry !== null && Object.keys(entry as Record<string, unknown>).length === 0) emptyCount++;
          break;
        }
        if (found) {
          authored++;
          motionCoverage[motionId].authored++;
          motionCoverage[motionId].tables.push(tableKey);
        }
      }

      tableCoverage[tableKey] = { authored, total: motionIds.length, empty: emptyCount, inherit: inheritCount };
    }

    // NONE status
    console.log("── NONE Row Status ──\n");
    for (const tableKey of MODIFIER_TABLE_KEYS) {
      const s = noneStatus[tableKey];
      if (!s) continue;
      const status = !s.exists ? "MISSING" : s.hasDeltas ? "HAS DELTAS (error)" : "OK";
      const icon = !s.exists ? "X" : s.hasDeltas ? "!" : "v";
      console.log(`  [${icon}] ${tableKey}: ${status}`);
    }

    // Table coverage
    console.log("\n── Table Coverage ──\n");
    const sortedTables = Object.entries(tableCoverage).sort(
      ([, a], [, b]) => a.authored / a.total - b.authored / b.total
    );
    for (const [tableKey, stats] of sortedTables) {
      const pct = ((stats.authored / stats.total) * 100).toFixed(1);
      console.log(
        `  ${tableKey}: ${stats.authored}/${stats.total} motions (${pct}%) [${stats.empty} empty, ${stats.inherit} inherit]`
      );
    }

    // Bottom 10 motions
    console.log("\n── Bottom 10 Motions (worst coverage) ──\n");
    const sortedMotions = Object.entries(motionCoverage).sort(
      ([, a], [, b]) => a.authored / a.total - b.authored / b.total
    );
    for (const [motionId, stats] of sortedMotions.slice(0, 10)) {
      const pct = ((stats.authored / stats.total) * 100).toFixed(1);
      const motion = motions.find((m) => m.id === motionId);
      console.log(`  ${motionId} (${motion?.label ?? "?"}): ${stats.authored}/${stats.total} tables (${pct}%)`);
    }

    // Incomplete combos
    const incomplete: Array<{ motionId: string; motionLabel: string; missingTables: string[] }> = [];
    for (const motion of motions) {
      const stats = motionCoverage[motion.id];
      if (!stats || stats.authored >= stats.total) continue;
      const missingTables = MODIFIER_TABLE_KEYS.filter((tk) => !stats.tables.includes(tk));
      if (missingTables.length > 0) {
        incomplete.push({ motionId: motion.id, motionLabel: motion.label, missingTables });
      }
    }

    console.log(`\n── Incomplete Combos: ${incomplete.length} motions need work ──\n`);
    for (const item of incomplete.slice(0, 20)) {
      console.log(`  ${item.motionId} (${item.motionLabel}): missing ${item.missingTables.length} tables`);
      console.log(`    ${item.missingTables.join(", ")}`);
    }
    if (incomplete.length > 20) {
      console.log(`  ... and ${incomplete.length - 20} more`);
    }

    // Summary
    const totalCombos = motionIds.length * MODIFIER_TABLE_KEYS.length;
    const totalAuthored = Object.values(motionCoverage).reduce((s, v) => s + v.authored, 0);
    const pct = totalCombos > 0 ? ((totalAuthored / totalCombos) * 100).toFixed(1) : "0";
    console.log(`\n=== Overall: ${totalAuthored}/${totalCombos} combos authored (${pct}%) ===\n`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
