/**
 * Parity harness orchestrator.
 *
 * Proves the PostgreSQL pipeline produces identical data to the JSON source.
 *
 * Flow:
 *   1. Load all 23 JSON files (source A)
 *   2. Fetch all 23 tables from Postgres via bootstrap endpoint (source B)
 *   3. Normalize both sources under the same contract
 *   4. Deep-compare per table/row/field
 *   5. Output actionable pass/fail report
 *
 * Usage: npx tsx src/parity/parityHarness.ts
 */
import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import pg from "pg";
import { SEED_ORDER } from "../seed/topologicalOrder";
import { normalizeTable } from "./normalize";
import { compareTables, formatTableDiff, type TableDiff } from "./compare";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const BACKEND_ROOT = path.resolve(__dirname, "../..");
const TABLES_DIR = path.resolve(
  BACKEND_ROOT,
  process.env.TABLES_DIR || "../src/database/tables"
);

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

async function fetchPostgresTable(
  pool: pg.Pool,
  pgTableName: string,
  isKeyValueMap = false
): Promise<unknown[]> {
  const orderClause = isKeyValueMap ? "ORDER BY id" : "ORDER BY sort_order, id";
  const result = await pool.query(
    `SELECT * FROM "${pgTableName}" WHERE is_active = true ${orderClause}`
  );
  return result.rows;
}

async function runParity() {
  const startTime = Date.now();
  console.log("═══ Reference Data Parity Harness ═══\n");

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const results: TableDiff[] = [];
    let allPass = true;

    for (const entry of SEED_ORDER) {
      const jsonRows = loadJsonFile(entry.file);
      const pgRows = await fetchPostgresTable(pool, entry.pgTable, entry.isKeyValueMap);

      const normalizedJson = normalizeTable(
        jsonRows,
        entry.isKeyValueMap
      );
      const normalizedPg = normalizeTable(pgRows, entry.isKeyValueMap);

      const diff = compareTables(entry.key, normalizedJson, normalizedPg);
      results.push(diff);

      if (!diff.match) allPass = false;
      console.log(formatTableDiff(diff));
    }

    const elapsed = Date.now() - startTime;
    const passCount = results.filter((r) => r.match).length;
    const failCount = results.length - passCount;

    console.log(`\n${"─".repeat(50)}`);
    console.log(
      `${allPass ? "✓ PARITY PASS" : "✗ PARITY FAIL"}: ${passCount}/${results.length} tables match (${elapsed}ms)`
    );

    if (failCount > 0) {
      console.log(`\n${failCount} table(s) with differences.`);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

if (process.argv[1]?.includes("parityHarness")) {
  runParity();
}

export { runParity };
