/**
 * Provider interface for reference data access.
 *
 * All reads in the app go through this interface.
 * Implementations:
 *   - LocalJsonSqliteProvider: current behavior (JSON -> SQLite)
 *   - RemotePostgresProvider: fetches from backend API with AsyncStorage cache
 */

export interface BootstrapData {
  schemaVersion: string;
  referenceVersion: string;
  generatedAt: string;
  tables: Record<string, unknown[]>;
}

export interface VersionInfo {
  schemaVersion: string;
  referenceVersion: string;
}

export interface ReferenceDataProvider {
  /** Fetch complete bootstrap (all active reference tables). */
  getBootstrap(options?: { allowStaleCache?: boolean }): Promise<BootstrapData>;

  /** Check current reference data version. */
  getVersion(): Promise<VersionInfo>;

  /** Fetch a single table by its camelCase key. */
  getTable(key: string): Promise<unknown[]>;
}
