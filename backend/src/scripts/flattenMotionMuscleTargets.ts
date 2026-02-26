/**
 * One-off script: flatten nested muscle_targets in the motions table to the new
 * flat format { muscleId: score }. Run with: npx tsx src/scripts/flattenMotionMuscleTargets.ts
 *
 * Uses the same logic as the seed JSON flattener: recursively collect only leaf
 * nodes (nodes that have _score but no child objects).
 */
import dotenv from "dotenv";
import path from "node:path";
import pg from "pg";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

type NestedNode = { _score?: number; [k: string]: unknown };

function isLeafNode(val: unknown): val is { _score: number } {
  if (!val || typeof val !== "object") return false;
  const o = val as Record<string, unknown>;
  if (typeof o._score !== "number") return false;
  const otherKeys = Object.keys(o).filter((k) => k !== "_score");
  return !otherKeys.some((k) => typeof o[k] === "object" && o[k] !== null);
}

function isAlreadyFlat(obj: unknown): obj is Record<string, number> {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return Object.keys(o).length > 0 && Object.values(o).every((v) => typeof v === "number");
}

/**
 * Recursively flatten nested { GROUP: { _score?, CHILD: { _score?, ... } } } to
 * flat { muscleId: score } (leaf _score only).
 */
function flattenMuscleTargets(obj: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!obj || typeof obj !== "object") return out;
  const o = obj as NestedNode;

  for (const key of Object.keys(o)) {
    if (key === "_score") continue;
    const val = o[key];
    if (typeof val === "number") {
      out[key] = val;
      continue;
    }
    if (val && typeof val === "object") {
      if (isLeafNode(val)) {
        out[key] = (val as { _score: number })._score;
      } else {
        Object.assign(out, flattenMuscleTargets(val));
      }
    }
  }
  return out;
}

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  console.log("Connected to database.");

  try {
    const res = await client.query<{ id: string; muscle_targets: unknown }>(
      `SELECT id, muscle_targets FROM motions WHERE muscle_targets IS NOT NULL AND muscle_targets != '{}'::jsonb`
    );
    console.log(`Found ${res.rows.length} motions with muscle_targets.`);

    let updated = 0;
    for (const row of res.rows) {
      const raw = row.muscle_targets;
      if (isAlreadyFlat(raw)) {
        continue;
      }
      const flat = flattenMuscleTargets(raw);
      await client.query(
        `UPDATE motions SET muscle_targets = $1::jsonb WHERE id = $2`,
        [JSON.stringify(flat), row.id]
      );
      updated += 1;
      console.log(`  Flattened: ${row.id}`);
    }
    console.log(`Done. Updated ${updated} rows.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
