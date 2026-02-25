import type { DashboardData, UserProfile } from "@/types";

const TOKEN_KEY = "onlyfit_token";
const REFRESH_KEY = "onlyfit_refresh";
const USER_KEY = "onlyfit_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getSavedUser(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`/api${path}`, { ...init, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

interface LoginResponse {
  user: { id: string; email: string; name: string };
  accessToken: string;
  refreshToken: string;
}

export async function apiLogin(
  email: string,
  password: string
): Promise<UserProfile> {
  const data = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  setToken(data.accessToken);
  localStorage.setItem(REFRESH_KEY, data.refreshToken);

  const profile: UserProfile = {
    id: data.user.id,
    name: data.user.name,
    email: data.user.email,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(USER_KEY, JSON.stringify(profile));

  return profile;
}

export async function apiGetProfile(): Promise<UserProfile> {
  const data = await apiFetch<any>("/users/me");
  const profile: UserProfile = {
    id: data.id,
    name: data.name,
    email: data.email,
    avatarUrl: data.avatarUrl || undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
  localStorage.setItem(USER_KEY, JSON.stringify(profile));
  return profile;
}

export async function apiGetDashboard(): Promise<DashboardData> {
  return apiFetch<DashboardData>("/dashboard");
}
