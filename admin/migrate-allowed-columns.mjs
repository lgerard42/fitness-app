/**
 * One-time migration script: adds allowed_grip_types, allowed_grip_widths,
 * allowed_stance_types, allowed_stance_widths columns to gymEquipment.json
 * and cableAttachments.json based on the hardcoded data in data.js.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TABLES_DIR = path.resolve(__dirname, '../src/database/tables');

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(TABLES_DIR, file), 'utf-8'));
}

function writeJson(file, data) {
  fs.writeFileSync(path.join(TABLES_DIR, file), JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

// ─── Hardcoded data from data.js ─────────────────────────────────

const GRIP_WIDTH_FULL_IDS = ['WIDTH_EXTRA_NARROW', 'WIDTH_NARROW', 'WIDTH_SHOULDER', 'WIDTH_WIDE', 'WIDTH_EXTRA_WIDE'];
const STANCE_TYPE_FULL_IDS = ['neutral_feet_forward', 'toes_out_external_rotation', 'toes_in_internal_rotation', 'split_stance', 'other'];
const STANCE_WIDTH_FULL_IDS = ['extra_narrow', 'narrow', 'shoulder_width', 'wide', 'extra_wide'];
const STANCE_TYPE_LEG_MACHINE_IDS = ['neutral_feet_forward', 'toes_out_external_rotation', 'other'];
const STANCE_TYPE_TRAP_IDS = ['neutral_feet_forward', 'toes_out_external_rotation'];

const EQUIPMENT_GRIP_STANCE_OPTIONS = {
  "Barbell": {
    gripType: ["GRIP_PRONATED", "GRIP_SUPINATED", "GRIP_ALTERNATING"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "EZ Bar": {
    gripType: ["GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED"],
    gripWidth: ["WIDTH_NARROW", "WIDTH_SHOULDER", "WIDTH_WIDE"],
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Trap Bar (Hex Bar)": {
    gripType: ["GRIP_NEUTRAL", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED"],
    gripWidth: null,
    stanceType: STANCE_TYPE_TRAP_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Safety Squat Bar": {
    gripType: null,
    gripWidth: null,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Swiss / Football Bar": {
    gripType: ["GRIP_NEUTRAL", "GRIP_SEMI_PRONATED"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Cambered Bar": {
    gripType: ["GRIP_PRONATED", "GRIP_ALTERNATING", "GRIP_SUPINATED", "GRIP_NEUTRAL", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Dumbbell": {
    gripType: ["GRIP_PRONATED", "GRIP_SUPINATED", "GRIP_NEUTRAL", "GRIP_ALTERNATING", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED", "GRIP_ROTATING", "GRIP_OTHER"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Kettlebell": {
    gripType: ["GRIP_PRONATED", "GRIP_SUPINATED", "GRIP_NEUTRAL", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Plate": {
    gripType: ["GRIP_PRONATED", "GRIP_NEUTRAL", "GRIP_OTHER", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED", "GRIP_FLAT", "GRIP_SUPINATED"],
    gripWidth: null,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Medicine Ball": {
    gripType: null,
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Sandbag": {
    gripType: ["GRIP_NEUTRAL", "GRIP_PRONATED", "GRIP_OTHER"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Weighted Vest": {
    gripType: null,
    gripWidth: null,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Bodyweight": {
    gripType: ["GRIP_PRONATED", "GRIP_SUPINATED", "GRIP_NEUTRAL", "GRIP_ROTATING", "GRIP_ALTERNATING", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED", "GRIP_OTHER"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Band": {
    gripType: ["GRIP_PRONATED", "GRIP_SUPINATED", "GRIP_NEUTRAL", "GRIP_ALTERNATING", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED", "GRIP_ROTATING", "GRIP_OTHER"],
    gripWidth: null,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Chains": {
    gripType: null,
    gripWidth: null,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Assisted Machine": {
    gripType: ["GRIP_NEUTRAL", "GRIP_PRONATED", "GRIP_SEMI_PRONATED", "GRIP_SUPINATED", "GRIP_ALTERNATING", "GRIP_SEMI_SUPINATED", "GRIP_ROTATING"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_LEG_MACHINE_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Machine (Selectorized)": {
    gripType: ["GRIP_NEUTRAL", "GRIP_PRONATED", "GRIP_SEMI_PRONATED", "GRIP_SUPINATED", "GRIP_ALTERNATING", "GRIP_SEMI_SUPINATED", "GRIP_ROTATING"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_LEG_MACHINE_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Plate Loaded (Machine)": {
    gripType: ["GRIP_NEUTRAL", "GRIP_PRONATED", "GRIP_SEMI_PRONATED", "GRIP_SUPINATED", "GRIP_ALTERNATING", "GRIP_SEMI_SUPINATED", "GRIP_ROTATING"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_LEG_MACHINE_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Smith Machine": {
    gripType: ["GRIP_PRONATED", "GRIP_ALTERNATING", "GRIP_SUPINATED"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_LEG_MACHINE_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Cable": {
    gripType: ["GRIP_PRONATED", "GRIP_SUPINATED", "GRIP_NEUTRAL", "GRIP_ALTERNATING", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED", "GRIP_ROTATING", "GRIP_OTHER"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "TRX / Suspension Trainer": {
    gripType: ["GRIP_NEUTRAL", "GRIP_ROTATING", "GRIP_SEMI_SUPINATED", "GRIP_ALTERNATING", "GRIP_SEMI_PRONATED", "GRIP_SUPINATED", "GRIP_PRONATED"],
    gripWidth: null,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Rings": {
    gripType: ["GRIP_NEUTRAL", "GRIP_ROTATING", "GRIP_SEMI_SUPINATED", "GRIP_ALTERNATING", "GRIP_SEMI_PRONATED", "GRIP_SUPINATED", "GRIP_PRONATED"],
    gripWidth: ["WIDTH_EXTRA_NARROW", "WIDTH_NARROW", "WIDTH_SHOULDER", "WIDTH_EXTRA_WIDE", "WIDTH_WIDE"],
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: null,
  },
  "Stability Ball": { gripType: null, gripWidth: null, stanceType: null, stanceWidth: null },
  "BOSU": { gripType: null, gripWidth: null, stanceType: STANCE_TYPE_FULL_IDS, stanceWidth: null },
  "Balance Pad": { gripType: null, gripWidth: null, stanceType: null, stanceWidth: null },
  "Sliders": { gripType: null, gripWidth: null, stanceType: STANCE_TYPE_FULL_IDS, stanceWidth: null },
  "Sled / Prowler": { gripType: null, gripWidth: null, stanceType: null, stanceWidth: null },
  "Log": { gripType: null, gripWidth: null, stanceType: null, stanceWidth: null },
  "Yoke": { gripType: null, gripWidth: null, stanceType: null, stanceWidth: null },
  "Tire": { gripType: null, gripWidth: null, stanceType: null, stanceWidth: null },
  "Mace": { gripType: null, gripWidth: null, stanceType: null, stanceWidth: null },
  "Steel / Indian Club": { gripType: null, gripWidth: null, stanceType: null, stanceWidth: null },
  "Battle Ropes": {
    gripType: ["GRIP_NEUTRAL", "GRIP_OTHER", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED", "GRIP_SUPINATED", "GRIP_PRONATED"],
    gripWidth: null,
    stanceType: null,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Other": {
    gripType: ["GRIP_PRONATED", "GRIP_SUPINATED", "GRIP_NEUTRAL", "GRIP_ALTERNATING", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED", "GRIP_ROTATING", "GRIP_OTHER"],
    gripWidth: null,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
};

const CABLE_ATTACHMENT_GRIP_STANCE_OPTIONS = {
  "ROPE": {
    gripType: ["GRIP_NEUTRAL", "GRIP_SEMI_SUPINATED", "GRIP_SEMI_PRONATED", "GRIP_ROTATING"],
    gripWidth: null,
    stanceType: null,
    stanceWidth: null,
  },
  "LAT_PULLDOWN_BAR": {
    gripType: ["GRIP_SUPINATED", "GRIP_PRONATED"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: null,
    stanceWidth: null,
  },
  "STRAIGHT_BAR": {
    gripType: ["GRIP_SUPINATED", "GRIP_PRONATED"],
    gripWidth: ["WIDTH_EXTRA_WIDE", "WIDTH_EXTRA_NARROW", "WIDTH_WIDE", "WIDTH_SHOULDER", "WIDTH_NARROW"],
    stanceType: null,
    stanceWidth: null,
  },
  "SINGLE_HANDLE": {
    gripType: ["GRIP_NEUTRAL", "GRIP_PRONATED", "GRIP_SUPINATED", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED", "GRIP_ROTATING", "GRIP_OTHER"],
    gripWidth: null,
    stanceType: null,
    stanceWidth: null,
  },
  "V_GRIP": {
    gripType: ["GRIP_NEUTRAL", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED"],
    gripWidth: ["WIDTH_NARROW", "WIDTH_EXTRA_NARROW"],
    stanceType: null,
    stanceWidth: null,
  },
  "MAG_GRIP_BAR": {
    gripType: ["GRIP_NEUTRAL", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: null,
    stanceWidth: null,
  },
  "PRO_STYLE_BAR": {
    gripType: ["GRIP_NEUTRAL", "GRIP_PRONATED", "GRIP_SUPINATED", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: null,
    stanceWidth: null,
  },
  "MULTI_T_BAR_STYLE": {
    gripType: ["GRIP_NEUTRAL"],
    gripWidth: ["WIDTH_SHOULDER"],
    stanceType: null,
    stanceWidth: null,
  },
  "MULTI_ROW": {
    gripType: ["GRIP_NEUTRAL", "GRIP_PRONATED", "GRIP_SUPINATED", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: null,
    stanceWidth: null,
  },
  "EZ_BAR": {
    gripType: ["GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED"],
    gripWidth: ["WIDTH_NARROW", "WIDTH_SHOULDER", "WIDTH_WIDE"],
    stanceType: null,
    stanceWidth: null,
  },
  "V_BAR": {
    gripType: ["GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED"],
    gripWidth: ["WIDTH_NARROW", "WIDTH_EXTRA_NARROW"],
    stanceType: null,
    stanceWidth: null,
  },
  "ANKLE_STRAP": {
    gripType: ["GRIP_NEUTRAL"],
    gripWidth: null,
    stanceType: null,
    stanceWidth: null,
  },
  "AB_HARNESS": {
    gripType: null,
    gripWidth: null,
    stanceType: null,
    stanceWidth: null,
  },
  "LANDMINE": {
    gripType: ["GRIP_NEUTRAL", "GRIP_PRONATED", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED"],
    gripWidth: ["WIDTH_NARROW", "WIDTH_SHOULDER", "WIDTH_WIDE"],
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "OTHER": {
    gripType: ["GRIP_NEUTRAL", "GRIP_PRONATED", "GRIP_SUPINATED", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED", "GRIP_ROTATING", "GRIP_ALTERNATING", "GRIP_FLAT", "GRIP_OTHER"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
};

// ─── Migrate gymEquipment.json ───────────────────────────────────

console.log('Migrating gymEquipment.json...');
const gymEquipment = readJson('gymEquipment.json');
let matchCount = 0;
let noMatchCount = 0;

for (const row of gymEquipment) {
  const rules = EQUIPMENT_GRIP_STANCE_OPTIONS[row.label];
  if (rules) {
    row.allowed_grip_types = rules.gripType;
    row.allowed_grip_widths = rules.gripWidth;
    row.allowed_stance_types = rules.stanceType;
    row.allowed_stance_widths = rules.stanceWidth;
    matchCount++;
  } else {
    // Equipment not in the hardcoded map - set all to null (will need manual config)
    if (!row.hasOwnProperty('allowed_grip_types')) {
      row.allowed_grip_types = null;
      row.allowed_grip_widths = null;
      row.allowed_stance_types = null;
      row.allowed_stance_widths = null;
    }
    noMatchCount++;
  }
}

writeJson('gymEquipment.json', gymEquipment);
console.log(`  Matched: ${matchCount}, No match (set null): ${noMatchCount}`);

// ─── Migrate cableAttachments.json ───────────────────────────────

console.log('Migrating cableAttachments.json...');
const cableAttachments = readJson('cableAttachments.json');
let caMatchCount = 0;
let caNoMatchCount = 0;

for (const row of cableAttachments) {
  const rules = CABLE_ATTACHMENT_GRIP_STANCE_OPTIONS[row.id];
  if (rules) {
    row.allowed_grip_types = rules.gripType;
    row.allowed_grip_widths = rules.gripWidth;
    row.allowed_stance_types = rules.stanceType;
    row.allowed_stance_widths = rules.stanceWidth;
    caMatchCount++;
  } else {
    if (!row.hasOwnProperty('allowed_grip_types')) {
      row.allowed_grip_types = null;
      row.allowed_grip_widths = null;
      row.allowed_stance_types = null;
      row.allowed_stance_widths = null;
    }
    caNoMatchCount++;
  }
}

writeJson('cableAttachments.json', cableAttachments);
console.log(`  Matched: ${caMatchCount}, No match (set null): ${caNoMatchCount}`);

console.log('Migration complete!');
