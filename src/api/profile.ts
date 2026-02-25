import { apiFetch } from "./client";
import type { UserProfile, UserSettings } from "../types/workout";

interface BackendProfile {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  bio?: string | null;
  bodyWeight?: number | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  settings?: BackendSettings | null;
}

interface BackendSettings {
  weightUnit: string;
  distanceUnit: string;
  weightCalcMode: string;
  repsConfigMode: string;
  defaultRestTimerSeconds: number;
  vibrateOnTimerFinish: boolean;
  keepScreenAwake: boolean;
}

function backendProfileToMobile(p: BackendProfile): UserProfile {
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    phone: p.phone ?? undefined,
    dateOfBirth: p.dateOfBirth ?? undefined,
    bio: p.bio ?? undefined,
    bodyWeight: p.bodyWeight ?? undefined,
    profilePictureUri: p.avatarUrl ?? undefined,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

function backendSettingsToMobile(s: BackendSettings): UserSettings {
  return {
    weightUnit: s.weightUnit as UserSettings["weightUnit"],
    distanceUnit: s.distanceUnit as UserSettings["distanceUnit"],
    weightCalcMode: s.weightCalcMode as UserSettings["weightCalcMode"],
    repsConfigMode: s.repsConfigMode as UserSettings["repsConfigMode"],
    defaultRestTimerSeconds: s.defaultRestTimerSeconds,
    vibrateOnTimerFinish: s.vibrateOnTimerFinish,
    keepScreenAwake: s.keepScreenAwake,
  };
}

export async function fetchProfile(): Promise<UserProfile> {
  const data = await apiFetch<BackendProfile>("/users/me");
  return backendProfileToMobile(data);
}

export async function updateProfile(
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  const body: Record<string, unknown> = {};
  if (updates.name !== undefined) body.name = updates.name;
  if (updates.phone !== undefined) body.phone = updates.phone;
  if (updates.dateOfBirth !== undefined) body.dateOfBirth = updates.dateOfBirth;
  if (updates.bio !== undefined) body.bio = updates.bio;
  if (updates.bodyWeight !== undefined) body.bodyWeight = updates.bodyWeight;
  if (updates.profilePictureUri !== undefined)
    body.avatarUrl = updates.profilePictureUri;

  const data = await apiFetch<BackendProfile>("/users/me", {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return backendProfileToMobile(data);
}

export async function fetchSettings(): Promise<UserSettings | null> {
  const data = await apiFetch<BackendSettings | null>("/users/me/settings");
  if (!data) return null;
  return backendSettingsToMobile(data);
}

export async function updateSettings(
  updates: Partial<UserSettings>
): Promise<UserSettings> {
  const data = await apiFetch<BackendSettings>("/users/me/settings", {
    method: "PUT",
    body: JSON.stringify(updates),
  });
  return backendSettingsToMobile(data);
}
