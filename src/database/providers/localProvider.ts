/**
 * LocalJsonSqliteProvider: wraps the existing SQLite-based behavior.
 *
 * When the feature flag is OFF (default), all reference data reads
 * come through this provider -- behavior is identical to pre-migration.
 */
import * as SQLite from "expo-sqlite";
import type {
  ReferenceDataProvider,
  BootstrapData,
  VersionInfo,
} from "./types";

const TABLE_NAMES = [
  "exerciseCategories",
  "cardioTypes",
  "trainingFocus",
  "muscles",
  "motions",
  "grips",
  "equipmentCategories",
  "motionPaths",
  "torsoAngles",
  "torsoOrientations",
  "resistanceOrigin",
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
  "equipment",
  "equipmentIcons",
];

export class LocalJsonSqliteProvider implements ReferenceDataProvider {
  private db: SQLite.SQLiteDatabase | null = null;

  private async getDb(): Promise<SQLite.SQLiteDatabase> {
    if (!this.db) {
      const { initDatabase } = await import("../initDatabase");
      this.db = await initDatabase();
    }
    return this.db;
  }

  async getVersion(): Promise<VersionInfo> {
    return {
      schemaVersion: "local",
      referenceVersion: "local",
    };
  }

  async getBootstrap(): Promise<BootstrapData> {
    const db = await this.getDb();
    const tables: Record<string, unknown[]> = {};

    for (const name of TABLE_NAMES) {
      try {
        const rows = await db.getAllAsync(
          `SELECT * FROM ${name} ORDER BY sort_order, id`
        );
        tables[name] = rows;
      } catch {
        tables[name] = [];
      }
    }

    return {
      schemaVersion: "local",
      referenceVersion: "local",
      generatedAt: new Date().toISOString(),
      tables,
    };
  }

  async getTable(key: string): Promise<unknown[]> {
    const db = await this.getDb();
    try {
      return await db.getAllAsync(
        `SELECT * FROM ${key} ORDER BY sort_order, id`
      );
    } catch {
      return [];
    }
  }
}
