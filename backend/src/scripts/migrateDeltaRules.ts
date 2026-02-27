/**
 * One-off migration: normalize all delta_rules in Delta Modifier Tables to the
 * new format and remove muscle IDs that do not exist in the MUSCLES table.
 *
 * New format: { [motionId]: { [muscleId]: number } | "inherit" }
 * - Converts empty array or non-object to {}
 * - Preserves "inherit" entries
 * - For object entries: keeps only (muscleId, number) where muscleId is in muscles table
 * - Flattens any nested object structure to leaf scores only
 *
 * Run: npx tsx src/scripts/migrateDeltaRules.ts
 */
import dotenv from "dotenv";
import path from "node:path";
import pg from "pg";
import { TABLE_KEY_TO_PG } from "../drizzle/schema/referenceTables";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const DELTA_RULES_TABLE_KEYS = [
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
] as const;

function isLeafScoreNode(val: unknown): val is { _score: number } {
  if (!val || typeof val !== "object") return false;
  const o = val as Record<string, unknown>;
  if (typeof o._score !== "number") return false;
  const otherKeys = Object.keys(o).filter((k) => k !== "_score");
  return !otherKeys.some((k) => typeof o[k] === "object" && o[k] !== null);
}

/**
 * Flatten nested { _score?, CHILD: { _score?, ... } } to flat { muscleId: score } (leaf only).
 */
function flattenEntryToScores(obj: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!obj || typeof obj !== "object") return out;
  const o = obj as Record<string, unknown>;

  for (const key of Object.keys(o)) {
    if (key === "_score") continue;
    const val = o[key];
    if (typeof val === "number") {
      out[key] = val;
      continue;
    }
    if (val && typeof val === "object" && !Array.isArray(val)) {
      if (isLeafScoreNode(val)) {
        out[key] = (val as { _score: number })._score;
      } else {
        Object.assign(out, flattenEntryToScores(val));
      }
    }
  }
  return out;
}

/**
 * Normalize a single motion entry to flat Record<muscleId, number> or "inherit".
 * Invalid muscle IDs are stripped; only validMuscleIds and numeric values kept.
 */
function normalizeEntry(
  entry: unknown,
  validMuscleIds: Set<string>
): Record<string, number> | "inherit" {
  if (entry === "inherit") return "inherit";
  const flat = flattenEntryToScores(entry);
  const out: Record<string, number> = {};
  for (const [muscleId, value] of Object.entries(flat)) {
    if (validMuscleIds.has(muscleId) && typeof value === "number" && !Number.isNaN(value)) {
      out[muscleId] = value;
    }
  }
  return out;
}

/**
 * Convert delta_rules to new format: object with motionId -> flat scores or "inherit".
 * Removes invalid muscle IDs. Converts array or malformed to {}.
 */
function normalizeDeltaRules(
  raw: unknown,
  validMuscleIds: Set<string>
): Record<string, Record<string, number> | "inherit"> {
  const out: Record<string, Record<string, number> | "inherit"> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;

  const obj = raw as Record<string, unknown>;
  for (const [motionId, entry] of Object.entries(obj)) {
    if (typeof motionId !== "string" || !motionId) continue;
    const normalized = normalizeEntry(entry, validMuscleIds);
    if (normalized === "inherit") {
      out[motionId] = "inherit";
    } else if (Object.keys(normalized).length > 0) {
      out[motionId] = normalized;
    }
    // empty object after stripping invalid muscles: omit motion entry (clean)
  }
  return out;
}

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  console.log("Connected to database.");

  try {
    const { rows: muscleRows } = await client.query<{ id: string }>(
      `SELECT id FROM muscles WHERE is_active = true`
    );
    const validMuscleIds = new Set(muscleRows.map((r) => r.id));
    console.log(`Loaded ${validMuscleIds.size} muscle IDs.`);

    let totalUpdated = 0;

    for (const tableKey of DELTA_RULES_TABLE_KEYS) {
      const pgTable = TABLE_KEY_TO_PG[tableKey];
      if (!pgTable) continue;

      const { rows } = await client.query<{ id: string; delta_rules: unknown }>(
        `SELECT id, delta_rules FROM "${pgTable}" WHERE delta_rules IS NOT NULL`
      );

      for (const row of rows) {
        const raw = row.delta_rules;
        const normalized = normalizeDeltaRules(raw, validMuscleIds);
        const normalizedStr = JSON.stringify(normalized);
        const rawStr = JSON.stringify(raw);
        if (normalizedStr === rawStr) continue;

        await client.query(
          `UPDATE "${pgTable}" SET delta_rules = $1::jsonb WHERE id = $2`,
          [normalizedStr, row.id]
        );
        totalUpdated += 1;
        console.log(`  ${pgTable}.${row.id}`);
      }
    }

    console.log(`Done. Updated ${totalUpdated} rows.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
