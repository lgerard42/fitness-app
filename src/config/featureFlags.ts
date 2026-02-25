/**
 * Feature flags for controlled rollout of backend migrations.
 *
 * USE_BACKEND_REFERENCE:
 *   false = current behavior (local JSON/SQLite)
 *   true  = fetch reference data from PostgreSQL backend API
 *
 * USE_BACKEND_USERDATA:
 *   false = current behavior (AsyncStorage only)
 *   true  = sync user data (workouts, exercises, measurements, goals, profile, settings) with the backend
 */

export const BACKEND_PORT = 4000;

export const FEATURE_FLAGS = {
  USE_BACKEND_REFERENCE: true,
  USE_BACKEND_USERDATA: true,

  /** Fallback base URL; overridden at runtime by resolveBackendUrl() in api/client.ts */
  REFERENCE_API_BASE_URL: `http://localhost:${BACKEND_PORT}`,
} as const;

export type FeatureFlags = typeof FEATURE_FLAGS;
