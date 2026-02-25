import { FEATURE_FLAGS } from "../../config/featureFlags";
import type { ReferenceDataProvider } from "./types";
import { LocalJsonSqliteProvider } from "./localProvider";
import { RemotePostgresProvider } from "./remoteProvider";

let provider: ReferenceDataProvider | null = null;

/**
 * Returns the active ReferenceDataProvider based on the feature flag.
 *
 * Flag OFF (default) -> LocalJsonSqliteProvider (zero behavior change)
 * Flag ON            -> RemotePostgresProvider (backend API + cache)
 */
export function createReferenceProvider(): ReferenceDataProvider {
  if (provider) return provider;

  if (FEATURE_FLAGS.USE_BACKEND_REFERENCE) {
    provider = new RemotePostgresProvider();
  } else {
    provider = new LocalJsonSqliteProvider();
  }

  return provider;
}

/**
 * Reset the cached provider (useful for testing or flag changes).
 */
export function resetProvider(): void {
  provider = null;
}
