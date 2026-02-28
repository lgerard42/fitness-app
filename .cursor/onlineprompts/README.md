# Online Prompts / Key Tables

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

The script reads all configured reference tables from the database and writes them into the corresponding CSV files under `keyTables/`. Filenames match the database table names (snake_case), e.g. `DeltaModifierTables/grips.csv`, `Muscles_MotionsTables/muscles.csv`.
