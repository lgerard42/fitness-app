import { apiFetch } from "./client";
import type { ExerciseLibraryItem } from "../types/workout";

interface BackendExercise {
  id: string;
  name: string;
  category: string;
  assistedNegative: boolean;
  config: Record<string, unknown>;
}

function backendToMobile(ex: BackendExercise): ExerciseLibraryItem {
  return {
    id: ex.id,
    name: ex.name,
    category: ex.category as ExerciseLibraryItem["category"],
    assistedNegative: ex.assistedNegative,
    ...((ex.config && typeof ex.config === "object") ? ex.config : {}),
  };
}

export async function fetchExercises(): Promise<ExerciseLibraryItem[]> {
  const data = await apiFetch<BackendExercise[]>("/exercises");
  return data.map(backendToMobile);
}

export async function createExercise(
  item: ExerciseLibraryItem
): Promise<BackendExercise> {
  const { id, pinnedNotes, ...rest } = item;
  return apiFetch<BackendExercise>("/exercises", {
    method: "POST",
    body: JSON.stringify({
      name: rest.name,
      category: rest.category,
      assistedNegative: rest.assistedNegative || false,
      config: { pinnedNotes, ...rest },
    }),
  });
}

export async function updateExercise(
  id: string,
  updates: Partial<ExerciseLibraryItem>
): Promise<BackendExercise> {
  const body: Record<string, unknown> = {};
  if (updates.name !== undefined) body.name = updates.name;
  if (updates.category !== undefined) body.category = updates.category;
  if (updates.assistedNegative !== undefined)
    body.assistedNegative = updates.assistedNegative;
  return apiFetch<BackendExercise>(`/exercises/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteExercise(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/exercises/${id}`, { method: "DELETE" });
}
