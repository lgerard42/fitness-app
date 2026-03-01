# Online Prompts / Key Tables

This folder contains scripts and reference prompts for exporting/importing reference data and executing the scoring data-authoring plan.

## Documents

- **background_ScoringSystem.md** — System overview: scoring pipeline, table contracts, combo rules, Matrix V2 config, data authoring tooling and guardrails.
- **prompt_completeBackendData.md** — Data authoring plan (NONE rows, baselines, visibility, defaults, delta_rules, combo_rules) and technical notes for re-importing authored data into the admin.

## Exporting key tables from the database

To refresh the CSV files in `keyTables/` from your Docker/PostgreSQL database:

1. Ensure **backend/.env** contains **DATABASE_URL** and Docker/PostgreSQL is running.
2. From this directory (`.cursor/onlineprompts/`):
   ```bash
   npm install
   npm run export-key-tables
   ```
   Or from repo root:
   ```bash
   cd .cursor/onlineprompts && npm install && npm run export-key-tables
   ```

The script reads all configured reference tables from the database and writes them into the corresponding CSV files under `keyTables/`. Filenames match the database table names (snake_case), e.g. `DeltaModifierTables/grips.csv`, `Muscles_MotionsTables/muscles.csv`, `Muscles_MotionsTables/combo_rules.csv`. The list of tables and their subfolders is defined in `export-key-tables.js` (`TABLE_KEY_TO_EXPORT`).

## Supporting scripts

- **diff-snapshots.js** — Compare two export snapshots: `node diff-snapshots.js <before-dir> <after-dir>`. Compares DeltaModifierTables CSVs and reports row and delta changes.
- **authoring-checklist.ts** (in `backend/src/scripts/`) — Postgres-backed coverage report and NONE/combo checklist. Run from backend: `npx tsx src/scripts/authoring-checklist.ts`.
