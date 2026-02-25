import { apiFetch } from "./client";
import type { BodyMeasurement } from "../types/workout";

interface BackendMeasurement {
  id: string;
  date: string;
  weight?: number | null;
  bodyFatPercent?: number | null;
  neck?: number | null;
  chest?: number | null;
  waist?: number | null;
  leftArm?: number | null;
  rightArm?: number | null;
  leftThigh?: number | null;
  rightThigh?: number | null;
  unit: string;
  circumferenceUnit: string;
}

function backendToMobile(m: BackendMeasurement): BodyMeasurement {
  return {
    id: m.id,
    date: m.date,
    weight: m.weight ?? undefined,
    bodyFatPercent: m.bodyFatPercent ?? undefined,
    neck: m.neck ?? undefined,
    chest: m.chest ?? undefined,
    waist: m.waist ?? undefined,
    leftArm: m.leftArm ?? undefined,
    rightArm: m.rightArm ?? undefined,
    leftThigh: m.leftThigh ?? undefined,
    rightThigh: m.rightThigh ?? undefined,
    unit: m.unit as BodyMeasurement["unit"],
    circumferenceUnit: m.circumferenceUnit as BodyMeasurement["circumferenceUnit"],
  };
}

export async function fetchMeasurements(): Promise<BodyMeasurement[]> {
  const data = await apiFetch<BackendMeasurement[]>("/measurements");
  return data.map(backendToMobile);
}

export async function createMeasurement(
  m: Omit<BodyMeasurement, "id">
): Promise<BackendMeasurement> {
  return apiFetch<BackendMeasurement>("/measurements", {
    method: "POST",
    body: JSON.stringify({
      date: m.date,
      weight: m.weight,
      bodyFatPercent: m.bodyFatPercent,
      neck: m.neck,
      chest: m.chest,
      waist: m.waist,
      leftArm: m.leftArm,
      rightArm: m.rightArm,
      leftThigh: m.leftThigh,
      rightThigh: m.rightThigh,
      unit: m.unit,
      circumferenceUnit: m.circumferenceUnit,
    }),
  });
}

export async function deleteMeasurement(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/measurements/${id}`, { method: "DELETE" });
}
