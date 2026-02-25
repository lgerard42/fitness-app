import Constants from "expo-constants";
import { BACKEND_PORT, REFERENCE_API_BASE_URL } from "./featureFlags";

let resolved: string | null = null;

/**
 * Derive the backend URL from the Expo dev server address so the app
 * works on both emulators and physical devices without manual config.
 * The result is cached after the first call.
 */
export function resolveBackendUrl(): string {
  if (resolved) return resolved;
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ??
      (Constants.manifest2 as { extra?: { expoGo?: { debuggerHost?: string } } })?.extra?.expoGo
        ?.debuggerHost;
    if (hostUri) {
      const host = hostUri.split(":")[0];
      resolved = `http://${host}:${BACKEND_PORT}`;
      return resolved;
    }
  } catch {
    // expo-constants unavailable (e.g. web build)
  }
  resolved = REFERENCE_API_BASE_URL;
  return resolved;
}
