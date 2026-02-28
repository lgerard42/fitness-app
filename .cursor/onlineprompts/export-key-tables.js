#!/usr/bin/env node
/**
 * Export key tables from PostgreSQL (Docker/pgAdmin) to .cursor/onlineprompts/keyTables/
 * Run from repo root or from .cursor/onlineprompts/:
 *   node .cursor/onlineprompts/export-key-tables.js
 *   (or: cd .cursor/onlineprompts && node export-key-tables.js)
 * Requires: npm install in .cursor/onlineprompts/ (see package.json).
 * Uses DATABASE_URL from backend/.env (loaded automatically).
 */

const path = require("path");
const fs = require("fs");

// Load backend/.env (relative to this script's directory)
const scriptDir = __dirname;
const backendEnv = path.resolve(scriptDir, "../../backend/.env");
require("dotenv").config({ path: backendEnv });

const { Client } = require("pg");

/** Table key (camelCase) -> { pgTable, subfolder, filename } for keyTables we export. Filenames match DB table names (snake_case). */
const TABLE_KEY_TO_EXPORT = {
  exerciseCategories: {
    pgTable: "exercise_categories",
    subfolder: "ExerciseCategoryTables",
    filename: "exercise_categories.csv",
  },
  cardioTypes: {
    pgTable: "cardio_types",
    subfolder: "ExerciseCategoryTables",
    filename: "cardio_types.csv",
  },
  trainingFocus: {
    pgTable: "training_focus",
    subfolder: "ExerciseCategoryTables",
    filename: "training_focus.csv",
  },
  muscles: {
    pgTable: "muscles",
    subfolder: "Muscles_MotionsTables",
    filename: "muscles.csv",
  },
  motions: {
    pgTable: "motions",
    subfolder: "Muscles_MotionsTables",
    filename: "motions.csv",
  },
  grips: {
    pgTable: "grips",
    subfolder: "DeltaModifierTables",
    filename: "grips.csv",
  },
  motionPaths: {
    pgTable: "motion_paths",
    subfolder: "DeltaModifierTables",
    filename: "motion_paths.csv",
  },
  torsoAngles: {
    pgTable: "torso_angles",
    subfolder: "DeltaModifierTables",
    filename: "torso_angles.csv",
  },
  torsoOrientations: {
    pgTable: "torso_orientations",
    subfolder: "DeltaModifierTables",
    filename: "torso_orientations.csv",
  },
  resistanceOrigin: {
    pgTable: "resistance_origin",
    subfolder: "DeltaModifierTables",
    filename: "resistance_origin.csv",
  },
  gripWidths: {
    pgTable: "grip_widths",
    subfolder: "DeltaModifierTables",
    filename: "grip_widths.csv",
  },
  elbowRelationship: {
    pgTable: "elbow_relationship",
    subfolder: "DeltaModifierTables",
    filename: "elbow_relationship.csv",
  },
  executionStyles: {
    pgTable: "execution_styles",
    subfolder: "DeltaModifierTables",
    filename: "execution_styles.csv",
  },
  footPositions: {
    pgTable: "foot_positions",
    subfolder: "DeltaModifierTables",
    filename: "foot_positions.csv",
  },
  stanceWidths: {
    pgTable: "stance_widths",
    subfolder: "DeltaModifierTables",
    filename: "stance_widths.csv",
  },
  stanceTypes: {
    pgTable: "stance_types",
    subfolder: "DeltaModifierTables",
    filename: "stance_types.csv",
  },
  loadPlacement: {
    pgTable: "load_placement",
    subfolder: "DeltaModifierTables",
    filename: "load_placement.csv",
  },
  supportStructures: {
    pgTable: "support_structures",
    subfolder: "DeltaModifierTables",
    filename: "support_structures.csv",
  },
  loadingAids: {
    pgTable: "loading_aids",
    subfolder: "DeltaModifierTables",
    filename: "loading_aids.csv",
  },
  rangeOfMotion: {
    pgTable: "range_of_motion",
    subfolder: "DeltaModifierTables",
    filename: "range_of_motion.csv",
  },
  equipment: {
    pgTable: "equipment",
    subfolder: "EquipmentTables",
    filename: "equipment.csv",
  },
};

function escapeCsvValue(val) {
  if (val === null || val === undefined) return "";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "object") {
    const str = JSON.stringify(val);
    return escapeCsvValue(str);
  }
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function rowToCsvLine(columns, row) {
  return columns.map((col) => escapeCsvValue(row[col])).join(",");
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error("DATABASE_URL not set. Ensure backend/.env exists and contains DATABASE_URL.");
    process.exit(1);
  }

  const keyTablesDir = path.resolve(scriptDir, "keyTables");
  if (!fs.existsSync(keyTablesDir)) {
    console.error("keyTables directory not found:", keyTablesDir);
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
  } catch (err) {
    console.error("Failed to connect to database. Is Docker/PostgreSQL running?", err.message);
    process.exit(1);
  }

  let ok = 0;
  let fail = 0;
  for (const [key, { pgTable, subfolder, filename }] of Object.entries(TABLE_KEY_TO_EXPORT)) {
    try {
      const res = await client.query(`SELECT * FROM "${pgTable}" ORDER BY sort_order NULLS LAST, id`);
      const rows = res.rows;
      const columns = res.fields.map((f) => f.name);
      const header = columns.join(",");
      const lines = [header, ...rows.map((row) => rowToCsvLine(columns, row))];
      const outPath = path.join(keyTablesDir, subfolder, filename);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
      console.log(`OK ${key} -> ${subfolder}/${filename} (${rows.length} rows)`);
      ok++;
    } catch (err) {
      console.error(`FAIL ${key} (${pgTable}):`, err.message);
      fail++;
    }
  }

  await client.end();
  console.log(`Done. ${ok} exported, ${fail} failed.`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
