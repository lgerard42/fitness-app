/**
 * Build script: reads icon filenames from gymEquipment.json, loads PNGs from assets/Equipment,
 * and outputs base64 to equipmentIcons.json. The gymEquipment table defines which icon each
 * equipment uses via the "icon" column (e.g. "Barbell.png").
 * Run: node scripts/embedEquipmentIcons.js
 */
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'Equipment');
const GYM_EQUIPMENT_FILE = path.join(__dirname, '..', 'src', 'database', 'tables', 'gymEquipment.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'database', 'tables', 'equipmentIcons.json');

const gymEquipment = JSON.parse(fs.readFileSync(GYM_EQUIPMENT_FILE, 'utf8'));
const result = {};
let hadError = false;

for (const row of gymEquipment) {
  const icon = row.icon && String(row.icon).trim();
  if (!icon) continue;

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
