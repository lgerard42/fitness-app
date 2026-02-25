/**
 * RemotePostgresProvider: fetches reference data from the backend API.
 *
 * Uses AsyncStorage as a warm cache:
 *   - On startup: check version endpoint
 *   - If stale (or first launch): fetch full bootstrap, store in cache
 *   - If fresh: return cached data
 *   - Offline with cache: return stale cache (if allowStaleCache)
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FEATURE_FLAGS } from "../../config/featureFlags";
import type {
  ReferenceDataProvider,
  BootstrapData,
  VersionInfo,
} from "./types";

const CACHE_KEY_BOOTSTRAP = "@ref:bootstrap";
const CACHE_KEY_VERSION = "@ref:version";

export class RemotePostgresProvider implements ReferenceDataProvider {
  private baseUrl: string;
  private cachedBootstrap: BootstrapData | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl =
      baseUrl || FEATURE_FLAGS.REFERENCE_API_BASE_URL;
  }

  async getVersion(): Promise<VersionInfo> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/reference/version`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return {
        schemaVersion: data.schemaVersion,
        referenceVersion: data.referenceVersion,
      };
    } catch {
      const cached = await AsyncStorage.getItem(CACHE_KEY_VERSION);
      if (cached) return JSON.parse(cached);
      throw new Error("Cannot reach backend and no cached version available");
    }
  }

  async getBootstrap(
    options?: { allowStaleCache?: boolean }
  ): Promise<BootstrapData> {
    if (this.cachedBootstrap) return this.cachedBootstrap;

    const cachedStr = await AsyncStorage.getItem(CACHE_KEY_BOOTSTRAP);
    const cachedData: BootstrapData | null = cachedStr
      ? JSON.parse(cachedStr)
      : null;

    try {
      const remoteVersion = await this.getVersion();

      if (
        cachedData &&
        cachedData.referenceVersion === remoteVersion.referenceVersion
      ) {
        this.cachedBootstrap = cachedData;
        return cachedData;
      }

      const res = await fetch(`${this.baseUrl}/api/v1/reference/bootstrap`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const freshData: BootstrapData = await res.json();

      await AsyncStorage.setItem(
        CACHE_KEY_BOOTSTRAP,
        JSON.stringify(freshData)
      );
      await AsyncStorage.setItem(
        CACHE_KEY_VERSION,
        JSON.stringify({
          schemaVersion: freshData.schemaVersion,
          referenceVersion: freshData.referenceVersion,
        })
      );

      this.cachedBootstrap = freshData;
      return freshData;
    } catch (err) {
      if (cachedData && options?.allowStaleCache) {
        console.warn(
          "Using stale cached bootstrap (offline mode):",
          (err as Error).message
        );
        this.cachedBootstrap = cachedData;
        return cachedData;
      }
      throw err;
    }
  }

  async getTable(key: string): Promise<unknown[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/reference/${key}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.rows;
    } catch {
      const bootstrap = await this.getBootstrap({ allowStaleCache: true });
      return bootstrap.tables[key] || [];
    }
  }
}
