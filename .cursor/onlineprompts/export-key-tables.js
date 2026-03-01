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
  comboRules: {
    pgTable: "combo_rules",
    subfolder: "Muscles_MotionsTables",
    filename: "combo_rules.csv",
  },
};

/** Modifier table keys (same order as Matrix V2 / Table Visibility UI). */
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

/** Path for Table Visibility export (same format as admin UI Copy Table → Excel). */
const TABLE_VISIBILITY_SUBFOLDER = "AdminDynamicTables";
const TABLE_VISIBILITY_FILENAME = "motion_delta_table_visibility.csv";

/** Path for Matrix V2 Config master export (all motions, same columns as Copy Table from UI). */
const CONFIG_MASTER_FILENAME = "motion_delta_table_config_master.csv";

/** Modifier table key (camelCase) → Postgres table name (snake_case). */
const MODIFIER_TABLE_KEY_TO_PG = {
  motionPaths: "motion_paths",
  torsoAngles: "torso_angles",
  torsoOrientations: "torso_orientations",
  resistanceOrigin: "resistance_origin",
  grips: "grips",
  gripWidths: "grip_widths",
  elbowRelationship: "elbow_relationship",
  executionStyles: "execution_styles",
  footPositions: "foot_positions",
  stanceWidths: "stance_widths",
  stanceTypes: "stance_types",
  loadPlacement: "load_placement",
  supportStructures: "support_structures",
  loadingAids: "loading_aids",
  rangeOfMotion: "range_of_motion",
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

/** Build one CSV line from an array of values (comma-separated, quoted when needed). */
function valuesToCsvLine(values) {
  return values.map((v) => escapeCsvValue(v)).join(",");
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

  // ─── Table Visibility (Motion Delta Matrix): extract from motion_matrix_configs ───
  try {
    const motionsRes = await client.query(
      `SELECT id, label, parent_id FROM motions WHERE is_active = true ORDER BY sort_order NULLS LAST, id`
    );
    const motions = motionsRes.rows;
    const configsRes = await client.query(
      `SELECT scope_id, status, config_json FROM motion_matrix_configs WHERE scope_type = 'motion' AND is_deleted = false`
    );
    const configsByMotion = new Map();
    for (const row of configsRes.rows) {
      const sid = row.scope_id;
      if (!configsByMotion.has(sid)) configsByMotion.set(sid, []);
      configsByMotion.get(sid).push({ status: row.status, config_json: row.config_json });
    }
    // Prefer draft over active (same as TableVisibilityPanel getEditingConfigForMotion)
    function getApplicability(motionId) {
      const list = configsByMotion.get(motionId) || [];
      const draft = list.find((c) => c.status === "draft");
      const active = list.find((c) => c.status === "active");
      const cfg = draft || active;
      const tables = (cfg && cfg.config_json && cfg.config_json.tables) || {};
      const out = {};
      for (const tk of MODIFIER_TABLE_KEYS) {
        const tc = tables[tk];
        out[tk] = (tc && tc.applicability) !== false; // default true when missing (same as UI)
      }
      return out;
    }
    // Order: roots first (parent_id null) sorted by label, then children under each sorted by label (same as UI)
    const byParent = new Map();
    const roots = [];
    for (const m of motions) {
      const pid = m.parent_id ? String(m.parent_id).trim() : null;
      if (!pid) {
        roots.push(m);
      } else {
        if (!byParent.has(pid)) byParent.set(pid, []);
        byParent.get(pid).push(m);
      }
    }
    roots.sort((a, b) => String(a.label).localeCompare(String(b.label)));
    const sortedMotions = [];
    function add(parentId, level) {
      const list = parentId === null ? roots : byParent.get(parentId) || [];
      const sorted = [...list].sort((a, b) => String(a.label).localeCompare(String(b.label)));
      for (const m of sorted) {
        sortedMotions.push(m);
        add(m.id, level + 1);
      }
    }
    add(null, 0);
    const orphans = motions.filter((m) => !sortedMotions.includes(m));
    orphans.sort((a, b) => String(a.label).localeCompare(String(b.label)));
    sortedMotions.push(...orphans);

    const header = ["motion_id", "parent_motion_id", "motion_label", ...MODIFIER_TABLE_KEYS];
    const rows = sortedMotions.map((m) => {
      const app = getApplicability(m.id);
      return [
        m.id,
        m.parent_id != null ? String(m.parent_id) : "",
        m.label || "",
        ...MODIFIER_TABLE_KEYS.map((tk) => (app[tk] ? "TRUE" : "FALSE")),
      ];
    });
    // Comma-separated CSV with proper quoting so columns open correctly in Excel
    const csv = [valuesToCsvLine(header), ...rows.map((r) => valuesToCsvLine(r))].join("\n") + "\n";
    const outPath = path.join(keyTablesDir, TABLE_VISIBILITY_SUBFOLDER, TABLE_VISIBILITY_FILENAME);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, csv, "utf8");
    console.log(`OK table_visibility -> ${TABLE_VISIBILITY_SUBFOLDER}/${TABLE_VISIBILITY_FILENAME} (${rows.length} rows)`);
    ok++;
  } catch (err) {
    console.error("FAIL table_visibility:", err.message);
    fail++;
  }

  // ─── Matrix V2 Config master: one row per motion, same columns as Copy Table from Matrix V2 Config UI ───
  try {
    const motionsRes = await client.query(
      `SELECT id, label, parent_id, muscle_targets FROM motions WHERE is_active = true ORDER BY sort_order NULLS LAST, id`
    );
    const allMotions = motionsRes.rows;
    const configsRes = await client.query(
      `SELECT scope_id, status, config_json FROM motion_matrix_configs WHERE scope_type = 'motion' AND is_deleted = false`
    );
    const configsByMotion = new Map();
    for (const row of configsRes.rows) {
      const sid = row.scope_id;
      if (!configsByMotion.has(sid)) configsByMotion.set(sid, []);
      configsByMotion.get(sid).push({ status: row.status, config_json: row.config_json });
    }
    function getEditingConfig(motionId) {
      const list = configsByMotion.get(motionId) || [];
      const draft = list.find((c) => c.status === "draft");
      const active = list.find((c) => c.status === "active");
      const cfg = draft || active;
      return (cfg && cfg.config_json && cfg.config_json.tables) || {};
    }
    // Load modifier table data: for each table key, id -> { delta_rules }
    const modifierData = {};
    for (const tk of MODIFIER_TABLE_KEYS) {
      const pgTable = MODIFIER_TABLE_KEY_TO_PG[tk];
      if (!pgTable) continue;
      const res = await client.query(
        `SELECT id, delta_rules FROM "${pgTable}" WHERE is_active = true`
      );
      modifierData[tk] = {};
      for (const row of res.rows) {
        modifierData[tk][row.id] = { delta_rules: row.delta_rules || {} };
      }
    }
    // Same motion order as Table Visibility: roots then children, alphabetically
    const byParent = new Map();
    const roots = [];
    for (const m of allMotions) {
      const pid = m.parent_id ? String(m.parent_id).trim() : null;
      if (!pid) roots.push(m);
      else {
        if (!byParent.has(pid)) byParent.set(pid, []);
        byParent.get(pid).push(m);
      }
    }
    roots.sort((a, b) => String(a.label).localeCompare(String(b.label)));
    const sortedMotions = [];
    function add(parentId) {
      const list = parentId === null ? roots : byParent.get(parentId) || [];
      const sorted = [...list].sort((a, b) => String(a.label).localeCompare(String(b.label)));
      for (const m of sorted) {
        sortedMotions.push(m);
        add(m.id);
      }
    }
    add(null);
    const orphans = allMotions.filter((m) => !sortedMotions.includes(m));
    orphans.sort((a, b) => String(a.label).localeCompare(String(b.label)));
    sortedMotions.push(...orphans);

    const header = ["MOTION_ID", "PARENT_MOTION_ID", "MUSCLE_TARGETS", ...MODIFIER_TABLE_KEYS];
    const rows = sortedMotions.map((m) => {
      const tables = getEditingConfig(m.id);
      const mt = m.muscle_targets || {};
      const cells = [
        m.id,
        m.parent_id != null ? String(m.parent_id) : "",
        typeof mt === "object" ? JSON.stringify(mt) : String(mt),
      ];
      for (const tk of MODIFIER_TABLE_KEYS) {
        const tc = tables[tk];
        if (!tc || !tc.applicability) {
          cells.push("");
          continue;
        }
        const tableData = {};
        const allowed = tc.allowed_row_ids || [];
        const rowById = modifierData[tk] || {};
        for (const rid of allowed) {
          const rowData = rowById[rid];
          const delta = rowData && rowData.delta_rules && rowData.delta_rules[m.id];
          tableData[rid] = delta !== undefined ? delta : null;
        }
        cells.push(JSON.stringify({ config: tc, deltas: tableData }));
      }
      return cells;
    });
    // Comma-separated CSV with proper quoting (JSON cells contain commas)
    const csv = [valuesToCsvLine(header), ...rows.map((r) => valuesToCsvLine(r))].join("\n") + "\n";
    const outPath = path.join(keyTablesDir, TABLE_VISIBILITY_SUBFOLDER, CONFIG_MASTER_FILENAME);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, csv, "utf8");
    console.log(`OK config_master -> ${TABLE_VISIBILITY_SUBFOLDER}/${CONFIG_MASTER_FILENAME} (${rows.length} rows)`);
    ok++;
  } catch (err) {
    console.error("FAIL config_master:", err.message);
    fail++;
  }

  await client.end();
  console.log(`Done. ${ok} exported, ${fail} failed.`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
