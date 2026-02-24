/**
 * CLI script: coverage-report
 * Analyzes delta_rules coverage across all modifier tables.
 *
 * Usage: npx tsx shared/linter/coverage-report.ts
 */

import fs from "node:fs";
import path from "node:path";
import type { Motion, ModifierRow } from "../types";

const TABLES_DIR = path.resolve(__dirname, "../../src/database/tables");

const HIGH_IMPACT_TABLES = [
  "grips",
  "gripWidths",
  "torsoAngles",
  "stanceWidths",
  "motionPaths",
];

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
  return JSON.parse(
    fs.readFileSync(path.join(TABLES_DIR, filename), "utf-8")
  ) as T;
}

function main() {
  const motions = readJson<Motion[]>("motions.json");
  const activeMotions = motions.filter((m) => m.is_active !== false);
  const motionIds = activeMotions.map((m) => m.id);

  console.log("=== Delta Rules Coverage Report ===\n");
  console.log(`Active motions: ${activeMotions.length}\n`);

  // Per-table coverage
  const tableCoverage: Record<
    string,
    { covered: number; total: number; empty: number; inherit: number }
  > = {};

  const motionCoverage: Record<
    string,
    { covered: number; total: number; tables: string[] }
  > = {};

  for (const motionId of motionIds) {
    motionCoverage[motionId] = { covered: 0, total: 0, tables: [] };
  }

  for (const [tableKey, filename] of Object.entries(MODIFIER_TABLE_FILES)) {
    const filePath = path.join(TABLES_DIR, filename);
    if (!fs.existsSync(filePath)) continue;

    const rows = readJson<ModifierRow[]>(filename);
    const activeRows = rows.filter((r) => r.is_active !== false);

    let coveredMotions = 0;
    let emptyMotions = 0;
    let inheritMotions = 0;

    for (const motionId of motionIds) {
      let hasEntry = false;

      for (const row of activeRows) {
        const rules = row.delta_rules;
        if (!rules || typeof rules !== "object" || Array.isArray(rules))
          continue;

        if (motionId in rules) {
          hasEntry = true;
          const entry = rules[motionId];
          if (entry === "inherit") {
            inheritMotions++;
          } else if (
            typeof entry === "object" &&
            entry !== null &&
            Object.keys(entry).length === 0
          ) {
            emptyMotions++;
          }
          break;
        }
      }

      if (hasEntry) {
        coveredMotions++;
        motionCoverage[motionId].covered++;
        motionCoverage[motionId].tables.push(tableKey);
      }
      motionCoverage[motionId].total++;
    }

    tableCoverage[tableKey] = {
      covered: coveredMotions,
      total: motionIds.length,
      empty: emptyMotions,
      inherit: inheritMotions,
    };
  }

  // Table coverage summary
  console.log("── Table Coverage ──\n");
  const sortedTables = Object.entries(tableCoverage).sort(
    ([, a], [, b]) => a.covered / a.total - b.covered / b.total
  );

  for (const [tableKey, stats] of sortedTables) {
    const pct = ((stats.covered / stats.total) * 100).toFixed(1);
    const isHighImpact = HIGH_IMPACT_TABLES.includes(tableKey);
    const marker = isHighImpact ? " ★" : "";
    console.log(
      `  ${tableKey}${marker}: ${stats.covered}/${stats.total} motions (${pct}%) [${stats.empty} home-base, ${stats.inherit} inherit]`
    );
  }

  // Motion coverage (worst first)
  console.log("\n── Bottom 10 Motions (worst coverage) ──\n");
  const sortedMotions = Object.entries(motionCoverage).sort(
    ([, a], [, b]) => a.covered / a.total - b.covered / b.total
  );

  for (const [motionId, stats] of sortedMotions.slice(0, 10)) {
    const pct = ((stats.covered / stats.total) * 100).toFixed(1);
    const motion = activeMotions.find((m) => m.id === motionId);
    console.log(
      `  ${motionId} (${motion?.label ?? "?"}): ${stats.covered}/${stats.total} tables (${pct}%)`
    );
    if (stats.tables.length > 0) {
      console.log(`    Present in: ${stats.tables.join(", ")}`);
    }
  }

  // High-impact gaps
  console.log("\n── High-Impact Gaps (★ tables x top motions) ──\n");
  const topMotions = activeMotions.slice(0, 15);

  for (const tableKey of HIGH_IMPACT_TABLES) {
    const filePath = path.join(TABLES_DIR, MODIFIER_TABLE_FILES[tableKey]);
    if (!fs.existsSync(filePath)) continue;

    const rows = readJson<ModifierRow[]>(MODIFIER_TABLE_FILES[tableKey]);
    const activeRows = rows.filter((r) => r.is_active !== false);

    const missing: string[] = [];
    for (const motion of topMotions) {
      let found = false;
      for (const row of activeRows) {
        const rules = row.delta_rules;
        if (!rules || typeof rules !== "object" || Array.isArray(rules))
          continue;
        if (motion.id in rules) {
          found = true;
          break;
        }
      }
      if (!found) missing.push(motion.id);
    }

    if (missing.length > 0) {
      console.log(`  ${tableKey}: missing ${missing.length} top motions`);
      console.log(`    ${missing.join(", ")}`);
    } else {
      console.log(`  ${tableKey}: fully covered for top motions`);
    }
  }
}

main();
