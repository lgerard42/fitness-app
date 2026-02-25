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
import Constants from "expo-constants";

const BACKEND_PORT = 4000;

/**
 * Derive the backend URL from the Expo dev server address so the app
 * works on both emulators and physical devices without manual config.
 * Falls back to localhost for web / CI environments.
 */
function resolveBackendUrl(): string {
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ??
      (Constants.manifest2 as { extra?: { expoGo?: { debuggerHost?: string } } })?.extra?.expoGo
        ?.debuggerHost;
    if (hostUri) {
      const host = hostUri.split(":")[0];
      return `http://${host}:${BACKEND_PORT}`;
    }
  } catch {
    // expo-constants unavailable (e.g. web build)
  }
  return `http://localhost:${BACKEND_PORT}`;
}

export const FEATURE_FLAGS = {
  USE_BACKEND_REFERENCE: true,
  USE_BACKEND_USERDATA: true,

  /** Backend API base URL – auto-detected from Expo dev server */
  REFERENCE_API_BASE_URL: resolveBackendUrl(),
} as const;

export type FeatureFlags = typeof FEATURE_FLAGS;
