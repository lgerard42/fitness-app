#!/usr/bin/env node
/**
 * Compare two snapshots produced by export-key-tables.js.
 *
 * Usage:
 *   node diff-snapshots.js <before-dir> <after-dir>
 *
 * Example:
 *   node export-key-tables.js          # run #1 -> keyTables/
 *   cp -r keyTables keyTables-before   # save snapshot
 *   # ... make changes in admin UI ...
 *   node export-key-tables.js          # run #2 -> keyTables/ (updated)
 *   node diff-snapshots.js keyTables-before keyTables
 *
 * Compares DeltaModifierTables/ CSVs. For each modifier table:
 *   - Reports added/removed rows
 *   - For each row with delta_rules, reports motions added/removed
 *   - For changed muscle deltas: shows old vs. new values
 */

const fs = require("fs");
const path = require("path");

const DELTA_SUBFOLDER = "DeltaModifierTables";

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const obj = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = values[i] ?? "";
    }
    return obj;
  });
  return { headers, rows };
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        values.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  values.push(current);
  return values;
}

function tryParseJson(str) {
  if (!str || str === "{}") return {};
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

function diffDeltaRules(beforeDr, afterDr) {
  const changes = [];
  const allMotionIds = new Set([...Object.keys(beforeDr), ...Object.keys(afterDr)]);

  for (const motionId of allMotionIds) {
    const before = beforeDr[motionId];
    const after = afterDr[motionId];

    if (before === undefined) {
      const summary =
        after === "inherit"
          ? "inherit"
          : typeof after === "object"
            ? `{${Object.entries(after).map(([k, v]) => `${k}:${v}`).join(", ")}}`
            : String(after);
      changes.push(`  + motion "${motionId}": ${summary}`);
      continue;
    }

    if (after === undefined) {
      changes.push(`  - motion "${motionId}" removed`);
      continue;
    }

    if (before === "inherit" && after === "inherit") continue;
    if (before === "inherit" && after !== "inherit") {
      changes.push(`  ~ motion "${motionId}": inherit -> ${JSON.stringify(after)}`);
      continue;
    }
    if (before !== "inherit" && after === "inherit") {
      changes.push(`  ~ motion "${motionId}": ${JSON.stringify(before)} -> inherit`);
      continue;
    }

    if (typeof before === "object" && typeof after === "object") {
      const allMuscles = new Set([...Object.keys(before), ...Object.keys(after)]);
      const muscleDiffs = [];
      for (const muscleId of allMuscles) {
        const bv = before[muscleId];
        const av = after[muscleId];
        if (bv === undefined) muscleDiffs.push(`    + ${muscleId}: ${av}`);
        else if (av === undefined) muscleDiffs.push(`    - ${muscleId} (was ${bv})`);
        else if (bv !== av) muscleDiffs.push(`    ~ ${muscleId}: ${bv} -> ${av}`);
      }
      if (muscleDiffs.length > 0) {
        changes.push(`  ~ motion "${motionId}":`);
        changes.push(...muscleDiffs);
      }
    }
  }

  return changes;
}

function main() {
  const [, , beforeDir, afterDir] = process.argv;
  if (!beforeDir || !afterDir) {
    console.error("Usage: node diff-snapshots.js <before-dir> <after-dir>");
    process.exit(1);
  }

  const beforeDelta = path.join(beforeDir, DELTA_SUBFOLDER);
  const afterDelta = path.join(afterDir, DELTA_SUBFOLDER);

  if (!fs.existsSync(beforeDelta)) {
    console.error(`Before directory not found: ${beforeDelta}`);
    process.exit(1);
  }
  if (!fs.existsSync(afterDelta)) {
    console.error(`After directory not found: ${afterDelta}`);
    process.exit(1);
  }

  const beforeFiles = fs.readdirSync(beforeDelta).filter((f) => f.endsWith(".csv"));
  const afterFiles = fs.readdirSync(afterDelta).filter((f) => f.endsWith(".csv"));
  const allFiles = [...new Set([...beforeFiles, ...afterFiles])].sort();

  let totalChanges = 0;

  for (const file of allFiles) {
    const bPath = path.join(beforeDelta, file);
    const aPath = path.join(afterDelta, file);

    if (!fs.existsSync(bPath)) {
      console.log(`\n=== ${file}: NEW TABLE ===`);
      totalChanges++;
      continue;
    }
    if (!fs.existsSync(aPath)) {
      console.log(`\n=== ${file}: DELETED TABLE ===`);
      totalChanges++;
      continue;
    }

    const bData = parseCsv(fs.readFileSync(bPath, "utf8"));
    const aData = parseCsv(fs.readFileSync(aPath, "utf8"));

    const bById = Object.fromEntries(bData.rows.map((r) => [r.id, r]));
    const aById = Object.fromEntries(aData.rows.map((r) => [r.id, r]));

    const allRowIds = [...new Set([...Object.keys(bById), ...Object.keys(aById)])].sort();
    const fileChanges = [];

    for (const rowId of allRowIds) {
      const bRow = bById[rowId];
      const aRow = aById[rowId];

      if (!bRow) {
        fileChanges.push(`+ Row "${rowId}" added`);
        continue;
      }
      if (!aRow) {
        fileChanges.push(`- Row "${rowId}" removed`);
        continue;
      }

      if (bRow.delta_rules !== undefined || aRow.delta_rules !== undefined) {
        const bDr = tryParseJson(bRow.delta_rules || "{}");
        const aDr = tryParseJson(aRow.delta_rules || "{}");

        if (typeof bDr === "object" && typeof aDr === "object") {
          const diffs = diffDeltaRules(bDr, aDr);
          if (diffs.length > 0) {
            fileChanges.push(`Row "${rowId}" delta_rules changed:`);
            fileChanges.push(...diffs);
          }
        }
      }

      for (const key of bData.headers) {
        if (key === "delta_rules" || key === "id") continue;
        if (bRow[key] !== aRow[key]) {
          fileChanges.push(`Row "${rowId}" field "${key}": "${bRow[key]}" -> "${aRow[key]}"`);
        }
      }
    }

    if (fileChanges.length > 0) {
      console.log(`\n=== ${file} (${fileChanges.length} change(s)) ===`);
      for (const c of fileChanges) console.log(`  ${c}`);
      totalChanges += fileChanges.length;
    }
  }

  if (totalChanges === 0) {
    console.log("\nNo differences found between the two snapshots.");
  } else {
    console.log(`\n--- Total: ${totalChanges} change(s) across ${allFiles.length} files ---`);
  }
}

main();
