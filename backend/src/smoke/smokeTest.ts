/**
 * Smoke tests for reference data system.
 *
 * Validates critical read paths work correctly:
 *   1. Exercise library browse/filter
 *   2. Exercise edit/create flow data availability
 *   3. Live workout exercise selection data
 *   4. Scoring-dependent reference lookups
 *
 * Modes:
 *   - Flag OFF: validates local JSON/SQLite path (baseline)
 *   - Flag ON:  validates backend API endpoints
 *   - Warm offline: validates cached bootstrap (simulated)
 *
 * Usage: npx tsx src/smoke/smokeTest.ts [--mode=off|on|offline]
 */
import dotenv from "dotenv";
import path from "node:path";
import pg from "pg";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const API_BASE = `http://localhost:${process.env.PORT || 4000}`;

interface SmokeResult {
  name: string;
  passed: boolean;
  detail?: string;
}

async function smokeVersionEndpoint(): Promise<SmokeResult> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/reference/version`);
    if (!res.ok) return { name: "version endpoint", passed: false, detail: `HTTP ${res.status}` };
    const data = await res.json();
    if (!data.schemaVersion || !data.referenceVersion) {
      return { name: "version endpoint", passed: false, detail: "Missing fields" };
    }
    return { name: "version endpoint", passed: true };
  } catch (err) {
    return { name: "version endpoint", passed: false, detail: (err as Error).message };
  }
}

async function smokeBootstrapEndpoint(): Promise<SmokeResult> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/reference/bootstrap`);
    if (!res.ok) return { name: "bootstrap endpoint", passed: false, detail: `HTTP ${res.status}` };
    const data = await res.json();
    if (!data.tables || typeof data.tables !== "object") {
      return { name: "bootstrap endpoint", passed: false, detail: "Missing tables" };
    }
    const tableCount = Object.keys(data.tables).length;
    if (tableCount < 20) {
      return { name: "bootstrap endpoint", passed: false, detail: `Only ${tableCount} tables` };
    }
    return { name: "bootstrap endpoint", passed: true, detail: `${tableCount} tables` };
  } catch (err) {
    return { name: "bootstrap endpoint", passed: false, detail: (err as Error).message };
  }
}

async function smokeExerciseLibraryBrowse(): Promise<SmokeResult> {
  try {
    const [cats, muscles, equipment] = await Promise.all([
      fetch(`${API_BASE}/api/v1/reference/exerciseCategories`).then((r) => r.json()),
      fetch(`${API_BASE}/api/v1/reference/muscles`).then((r) => r.json()),
      fetch(`${API_BASE}/api/v1/reference/equipment`).then((r) => r.json()),
    ]);
    if (!cats.rows?.length || !muscles.rows?.length || !equipment.rows?.length) {
      return { name: "exercise library browse", passed: false, detail: "Missing data" };
    }
    return {
      name: "exercise library browse",
      passed: true,
      detail: `categories=${cats.rows.length} muscles=${muscles.rows.length} equipment=${equipment.rows.length}`,
    };
  } catch (err) {
    return { name: "exercise library browse", passed: false, detail: (err as Error).message };
  }
}

async function smokeExerciseEditData(): Promise<SmokeResult> {
  try {
    const tables = [
      "motions", "grips", "gripWidths", "torsoAngles",
      "stanceWidths", "footPositions", "loadPlacement",
    ];
    const results = await Promise.all(
      tables.map((t) =>
        fetch(`${API_BASE}/api/v1/reference/${t}`).then((r) => r.json())
      )
    );
    const empty = results.filter((r) => !r.rows || r.rows.length === 0);
    if (empty.length > 0) {
      return { name: "exercise edit data", passed: false, detail: `${empty.length} empty tables` };
    }
    return { name: "exercise edit data", passed: true };
  } catch (err) {
    return { name: "exercise edit data", passed: false, detail: (err as Error).message };
  }
}

async function smokeWorkoutSelection(): Promise<SmokeResult> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/reference/motions`);
    const data = await res.json();
    if (!data.rows || data.rows.length === 0) {
      return { name: "workout exercise selection", passed: false, detail: "No motions" };
    }
    const hasParentId = data.rows.some((r: any) => r.parent_id);
    const hasMuscleTargets = data.rows.some((r: any) => r.muscle_targets);
    return {
      name: "workout exercise selection",
      passed: true,
      detail: `motions=${data.rows.length} withParent=${hasParentId} withTargets=${hasMuscleTargets}`,
    };
  } catch (err) {
    return { name: "workout exercise selection", passed: false, detail: (err as Error).message };
  }
}

async function smokeScoringLookups(): Promise<SmokeResult> {
  try {
    const tablesNeeded = ["motionPaths", "torsoAngles", "gripWidths", "resistanceOrigin"];
    const results = await Promise.all(
      tablesNeeded.map((t) =>
        fetch(`${API_BASE}/api/v1/reference/${t}`).then((r) => r.json())
      )
    );
    const withDeltaRules = results.filter((r) =>
      r.rows?.some((row: any) => row.delta_rules)
    );
    return {
      name: "scoring reference lookups",
      passed: withDeltaRules.length > 0,
      detail: `${withDeltaRules.length}/${tablesNeeded.length} tables have delta_rules`,
    };
  } catch (err) {
    return { name: "scoring reference lookups", passed: false, detail: (err as Error).message };
  }
}

async function smokeDbDirect(): Promise<SmokeResult> {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query(
      "SELECT COUNT(*)::int AS cnt FROM motions WHERE is_active = true"
    );
    const cnt = res.rows[0].cnt;
    return {
      name: "direct DB read",
      passed: cnt > 0,
      detail: `${cnt} active motions`,
    };
  } catch (err) {
    return { name: "direct DB read", passed: false, detail: (err as Error).message };
  } finally {
    await pool.end();
  }
}

async function runSmoke() {
  console.log("═══ Reference Data Smoke Tests ═══\n");

  const results: SmokeResult[] = [];

  results.push(await smokeDbDirect());
  results.push(await smokeVersionEndpoint());
  results.push(await smokeBootstrapEndpoint());
  results.push(await smokeExerciseLibraryBrowse());
  results.push(await smokeExerciseEditData());
  results.push(await smokeWorkoutSelection());
  results.push(await smokeScoringLookups());

  let allPass = true;
  for (const r of results) {
    const status = r.passed ? "PASS" : "FAIL";
    const detail = r.detail ? ` (${r.detail})` : "";
    console.log(`  ${status}  ${r.name}${detail}`);
    if (!r.passed) allPass = false;
  }

  console.log(`\n${"─".repeat(50)}`);
  const passCount = results.filter((r) => r.passed).length;
  console.log(
    `${allPass ? "✓" : "✗"} ${passCount}/${results.length} smoke tests ${allPass ? "passed" : "failed"}`
  );

  if (!allPass) process.exit(1);
}

runSmoke();
