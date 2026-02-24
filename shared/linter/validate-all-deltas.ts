/**
 * CLI script: validate-all-deltas
 * Scans all JSON table files and runs the delta/inheritance linter.
 *
 * Usage: npx tsx shared/linter/validate-all-deltas.ts
 */

import fs from "node:fs";
import path from "node:path";
import { lintAll, formatLintResults } from "./deltaLinter";
import type { Motion, Muscle, ModifierRow } from "../types";

const TABLES_DIR = path.resolve(__dirname, "../../src/database/tables");

const MODIFIER_TABLE_FILES: Record<string, string> = {
  motionPaths: "motionPaths.json",
  torsoAngles: "torsoAngles.json",
  torsoOrientations: "torsoOrientations.json",
  resistanceOrigin: "resistanceOrigin.json",
  grips: "grips.json",
  gripWidths: "gripWidths.json",
  elbowRelationship: "elbowRelationship.json",
  executionStyles: "executionStyles.json",
  footPositions: "footPositions.json",
  stanceWidths: "stanceWidths.json",
  stanceTypes: "stanceTypes.json",
  loadPlacement: "loadPlacement.json",
  supportStructures: "supportStructures.json",
  loadingAids: "loadingAids.json",
  rangeOfMotion: "rangeOfMotion.json",
};

function readJson<T>(filename: string): T {
  const filePath = path.join(TABLES_DIR, filename);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

function main() {
  console.log("=== validate-all-deltas ===");
  console.log(`Tables directory: ${TABLES_DIR}\n`);

  const motions = readJson<Motion[]>("motions.json");
  const muscles = readJson<Muscle[]>("muscles.json");

  console.log(`Loaded ${motions.length} motions, ${muscles.length} muscles`);

  const modifierTables: Record<string, ModifierRow[]> = {};
  let totalRows = 0;

  for (const [key, file] of Object.entries(MODIFIER_TABLE_FILES)) {
    const filePath = path.join(TABLES_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`  Skipping ${key}: file not found (${file})`);
      continue;
    }
    const rows = readJson<ModifierRow[]>(file);
    modifierTables[key] = rows;
    totalRows += rows.length;
    console.log(`  ${key}: ${rows.length} rows`);
  }

  console.log(`\nTotal modifier rows: ${totalRows}`);
  console.log("\nRunning linter...\n");

  const issues = lintAll(motions, muscles, modifierTables);
  console.log(formatLintResults(issues));

  const errorCount = issues.filter((i) => i.severity === "error").length;
  process.exit(errorCount > 0 ? 1 : 0);
}

main();
