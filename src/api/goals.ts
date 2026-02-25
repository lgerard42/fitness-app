import { apiFetch } from "./client";
import type { UserGoal } from "../types/workout";

interface BackendGoal {
  id: string;
  type: string;
  exerciseId?: string | null;
  targetWeight?: number | null;
  targetWeightUnit?: string | null;
  targetWorkoutsPerWeek?: number | null;
  completed: boolean;
  createdAt: string;
  exercise?: { id: string; name: string } | null;
}

function backendToMobile(g: BackendGoal): UserGoal {
  return {
    id: g.id,
    type: g.type as UserGoal["type"],
    exerciseId: g.exerciseId ?? undefined,
    exerciseName: g.exercise?.name ?? undefined,
    targetWeight: g.targetWeight ?? undefined,
    targetWeightUnit: (g.targetWeightUnit as UserGoal["targetWeightUnit"]) ?? undefined,
    targetWorkoutsPerWeek: g.targetWorkoutsPerWeek ?? undefined,
    createdAt: g.createdAt,
    completed: g.completed,
  };
}

export async function fetchGoals(): Promise<UserGoal[]> {
  const data = await apiFetch<BackendGoal[]>("/goals");
  return data.map(backendToMobile);
}

export async function createGoal(
  g: Omit<UserGoal, "id" | "createdAt" | "completed">
): Promise<BackendGoal> {
  return apiFetch<BackendGoal>("/goals", {
    method: "POST",
    body: JSON.stringify({
      type: g.type,
      exerciseId: g.exerciseId,
      targetWeight: g.targetWeight,
      targetWeightUnit: g.targetWeightUnit,
      targetWorkoutsPerWeek: g.targetWorkoutsPerWeek,
    }),
  });
}

export async function updateGoal(
  id: string,
  updates: Partial<UserGoal>
): Promise<BackendGoal> {
  const body: Record<string, unknown> = {};
  if (updates.completed !== undefined) body.completed = updates.completed;
  if (updates.type !== undefined) body.type = updates.type;
  if (updates.exerciseId !== undefined) body.exerciseId = updates.exerciseId;
  if (updates.targetWeight !== undefined) body.targetWeight = updates.targetWeight;
  if (updates.targetWeightUnit !== undefined)
    body.targetWeightUnit = updates.targetWeightUnit;
  if (updates.targetWorkoutsPerWeek !== undefined)
    body.targetWorkoutsPerWeek = updates.targetWorkoutsPerWeek;
  return apiFetch<BackendGoal>(`/goals/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteGoal(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/goals/${id}`, { method: "DELETE" });
}
