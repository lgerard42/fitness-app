import pg from "pg";
import {
  ALL_REFERENCE_TABLES,
  TABLE_KEY_TO_PG,
  type ReferenceTableName,
} from "../drizzle/schema/referenceTables";

const PG_TO_KEY: Record<string, string> = {};
for (const [key, pgName] of Object.entries(TABLE_KEY_TO_PG)) {
  PG_TO_KEY[pgName] = key;
}

export interface VersionInfo {
  schemaVersion: string;
  referenceVersion: string;
  tables: Record<string, { versionSeq: number; lastUpdated: string }>;
}

export interface BootstrapData {
  schemaVersion: string;
  referenceVersion: string;
  generatedAt: string;
  tables: Record<string, unknown[]>;
}

const SCHEMA_VERSION = "1.0.0";

export class ReferenceService {
  constructor(private pool: pg.Pool) {}

  async getVersion(): Promise<VersionInfo> {
    const result = await this.pool.query(
      `SELECT table_name, version_seq, last_updated
       FROM reference_metadata
       ORDER BY table_name`
    );

    const tables: VersionInfo["tables"] = {};
    let maxVersion = 0;
    for (const row of result.rows) {
      tables[row.table_name] = {
        versionSeq: Number(row.version_seq),
        lastUpdated: row.last_updated.toISOString(),
      };
      maxVersion = Math.max(maxVersion, Number(row.version_seq));
    }

    return {
      schemaVersion: SCHEMA_VERSION,
      referenceVersion: String(maxVersion),
      tables,
    };
  }

  async getBootstrap(): Promise<BootstrapData> {
    const tablesData: Record<string, unknown[]> = {};

    const noSortOrderTables = new Set(["equipment_icons"]);

    for (const pgName of ALL_REFERENCE_TABLES) {
      const key = PG_TO_KEY[pgName] || pgName;
      const orderClause = noSortOrderTables.has(pgName)
        ? "ORDER BY id"
        : "ORDER BY sort_order, id";
      const result = await this.pool.query(
        `SELECT * FROM "${pgName}" WHERE is_active = true ${orderClause}`
      );
      tablesData[key] = result.rows.map((row) => cleanRow(row));
    }

    const versionInfo = await this.getVersion();

    return {
      schemaVersion: SCHEMA_VERSION,
      referenceVersion: versionInfo.referenceVersion,
      generatedAt: new Date().toISOString(),
      tables: tablesData,
    };
  }

  async getTable(tableKey: string): Promise<{ table: string; rows: unknown[] }> {
    const pgName = TABLE_KEY_TO_PG[tableKey];
    if (!pgName) {
      throw new Error(`Unknown table key: ${tableKey}`);
    }

    const noSortOrder = new Set(["equipment_icons"]);
    const orderClause = noSortOrder.has(pgName)
      ? "ORDER BY id"
      : "ORDER BY sort_order, id";
    const result = await this.pool.query(
      `SELECT * FROM "${pgName}" WHERE is_active = true ${orderClause}`
    );

    return {
      table: tableKey,
      rows: result.rows.map((row) => cleanRow(row)),
    };
  }
}

/**
 * Remove Postgres-only columns from API responses so the shape
 * matches the original JSON files.
 */
function cleanRow(row: Record<string, unknown>): Record<string, unknown> {
  const { source_type, ...rest } = row;
  return rest;
}
