import AsyncStorage from "@react-native-async-storage/async-storage";
import { FEATURE_FLAGS } from "../config/featureFlags";

const TOKEN_KEY = "@auth:access_token";
const REFRESH_KEY = "@auth:refresh_token";

const HARDCODED_EMAIL = "alex@example.com";
const HARDCODED_PASSWORD = "password123";

let memoryToken: string | null = null;

export function getBaseUrl(): string {
  return FEATURE_FLAGS.REFERENCE_API_BASE_URL;
}

export async function getToken(): Promise<string | null> {
  if (memoryToken) return memoryToken;
  try {
    memoryToken = await AsyncStorage.getItem(TOKEN_KEY);
    return memoryToken;
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  memoryToken = token;
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  memoryToken = null;
  await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY]);
}

export async function autoLogin(): Promise<void> {
  const existing = await getToken();
  if (existing) return;

  try {
    const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: HARDCODED_EMAIL,
        password: HARDCODED_PASSWORD,
      }),
    });

    if (!res.ok) {
      console.warn("[api] auto-login failed:", res.status);
      return;
    }

    const data = await res.json();
    await setToken(data.accessToken);
    if (data.refreshToken) {
      await AsyncStorage.setItem(REFRESH_KEY, data.refreshToken);
    }
    console.log("[api] auto-login successful");
  } catch (err) {
    console.warn("[api] auto-login error (offline?):", (err as Error).message);
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${getBaseUrl()}/api${path}`, { ...init, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}
