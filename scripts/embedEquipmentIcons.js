/**
 * Build script: reads equipment IDs, matches PNGs from assets/Equipment by label,
 * and outputs base64 to equipmentIcons.json.
 * Run: node scripts/embedEquipmentIcons.js
 */
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'Equipment');
const EQUIPMENT_FILE = path.join(__dirname, '..', 'src', 'database', 'tables', 'equipment.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'database', 'tables', 'equipmentIcons.json');

const equipment = JSON.parse(fs.readFileSync(EQUIPMENT_FILE, 'utf8'));
const result = {};
let hadError = false;

for (const row of equipment) {
  const icon = row.label ? row.label.replace(/[^a-zA-Z0-9]/g, '') + '.png' : '';
  if (!icon || !row.label) continue;

  const filePath = path.join(ASSETS_DIR, icon);
  try {
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      result[row.id] = buffer.toString('base64');
    } else {
      console.warn(`Skipping ${row.id}: icon file not found ${icon}`);
    }
  } catch (err) {
    console.error(`Error reading ${icon} for ${row.id}:`, err.message);
    hadError = true;
  }
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 0));
console.log(`Wrote ${Object.keys(result).length} icons to ${OUTPUT_FILE}`);
if (hadError) process.exit(1);
