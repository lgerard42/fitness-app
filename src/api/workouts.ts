import { apiFetch } from "./client";
import type {
  Workout,
  Exercise,
  ExerciseGroup,
  ExerciseItem,
  Set,
} from "../types/workout";

interface BackendSet {
  id: string;
  position: number;
  type: string;
  weight: string;
  weight2?: string;
  reps: string;
  reps2?: string;
  duration: string;
  distance: string;
  completed: boolean;
  isWarmup: boolean;
  isDropset: boolean;
  isFailure: boolean;
  restPeriodSeconds?: number;
  dropSetId?: string;
}

interface BackendExercise {
  id: string;
  exerciseId?: string;
  exerciseName: string;
  category: string;
  position: number;
  notes: unknown;
  groupType?: string;
  config: unknown;
  sets: BackendSet[];
  children?: BackendExercise[];
}

interface BackendWorkout {
  id: string;
  name: string;
  startedAt: string;
  finishedAt?: string;
  duration?: string;
  sessionNotes: unknown;
  exercises: BackendExercise[];
}

interface ListResponse {
  workouts: BackendWorkout[];
  total: number;
  page: number;
  limit: number;
}

function backendSetToMobile(s: BackendSet): Set {
  return {
    id: s.id,
    type: (s.type as Set["type"]) || "Working",
    weight: s.weight,
    weight2: s.weight2,
    reps: s.reps,
    reps2: s.reps2,
    duration: s.duration,
    distance: s.distance,
    completed: s.completed,
    isWarmup: s.isWarmup,
    isDropset: s.isDropset,
    isFailure: s.isFailure,
    restPeriodSeconds: s.restPeriodSeconds,
    dropSetId: s.dropSetId,
  };
}

function backendExerciseToMobile(ex: BackendExercise): Exercise {
  return {
    instanceId: ex.id,
    exerciseId: ex.exerciseId || ex.id,
    name: ex.exerciseName,
    category: (ex.category as Exercise["category"]) || "Lifts",
    type: "exercise",
    sets: ex.sets.map(backendSetToMobile),
    notes: Array.isArray(ex.notes) ? ex.notes : [],
  };
}

function backendItemToMobile(ex: BackendExercise): ExerciseItem {
  if (ex.groupType && ex.children && ex.children.length > 0) {
    const group: ExerciseGroup = {
      instanceId: ex.id,
      type: "group",
      groupType: ex.groupType as ExerciseGroup["groupType"],
      children: ex.children.map(backendExerciseToMobile),
    };
    return group;
  }
  return backendExerciseToMobile(ex);
}

function backendWorkoutToMobile(w: BackendWorkout): Workout {
  return {
    id: w.id,
    name: w.name,
    startedAt: new Date(w.startedAt).getTime(),
    finishedAt: w.finishedAt ? new Date(w.finishedAt).getTime() : undefined,
    endedAt: w.finishedAt ? new Date(w.finishedAt).getTime() : undefined,
    duration: w.duration,
    date: new Date(w.startedAt).toLocaleDateString(),
    exercises: w.exercises.map(backendItemToMobile),
    sessionNotes: Array.isArray(w.sessionNotes) ? w.sessionNotes : [],
  };
}

function mobileSetToBackend(s: Set, position: number) {
  return {
    position,
    type: s.type,
    weight: s.weight || "",
    weight2: s.weight2,
    reps: s.reps || "",
    reps2: s.reps2,
    duration: s.duration || "",
    distance: s.distance || "",
    completed: s.completed,
    isWarmup: s.isWarmup || false,
    isDropset: s.isDropset || false,
    isFailure: s.isFailure || false,
    restPeriodSeconds: s.restPeriodSeconds,
    dropSetId: s.dropSetId,
  };
}

function mobileExerciseToBackend(ex: Exercise, position: number) {
  return {
    exerciseId: ex.exerciseId,
    exerciseName: ex.name,
    category: ex.category,
    position,
    notes: ex.notes || [],
    config: {
      weightCalcMode: ex.weightCalcMode,
      repsConfigMode: ex.repsConfigMode,
      trackDuration: ex.trackDuration,
      trackReps: ex.trackReps,
      trackDistance: ex.trackDistance,
      assistedNegative: ex.assistedNegative,
      distanceUnitSystem: ex.distanceUnitSystem,
      distanceUnit: ex.distanceUnit,
      weightUnit: ex.weightUnit,
    },
    sets: ex.sets.map((s, i) => mobileSetToBackend(s, i)),
  };
}

function mobileWorkoutToBackend(w: Workout) {
  const exercises = w.exercises.map((item, pos) => {
    if (item.type === "group") {
      const group = item as ExerciseGroup;
      return {
        exerciseName: `Group ${pos + 1}`,
        category: "Lifts",
        position: pos,
        groupType: group.groupType,
        notes: [],
        config: {},
        sets: [],
        children: group.children.map((child, cPos) =>
          mobileExerciseToBackend(child, cPos)
        ),
      };
    }
    return mobileExerciseToBackend(item as Exercise, pos);
  });

  return {
    name: w.name,
    startedAt: new Date(w.startedAt).toISOString(),
    finishedAt: w.endedAt
      ? new Date(w.endedAt).toISOString()
      : w.finishedAt
        ? new Date(w.finishedAt).toISOString()
        : undefined,
    duration: w.duration,
    sessionNotes: w.sessionNotes || [],
    exercises,
  };
}

export async function fetchWorkouts(): Promise<Workout[]> {
  const all: Workout[] = [];
  let page = 1;
  const limit = 50;
  let hasMore = true;

  while (hasMore) {
    const data = await apiFetch<ListResponse>(
      `/workouts?page=${page}&limit=${limit}`
    );
    all.push(...data.workouts.map(backendWorkoutToMobile));
    hasMore = data.workouts.length === limit;
    page++;
  }

  return all;
}

export async function createWorkout(
  workout: Workout
): Promise<BackendWorkout> {
  return apiFetch<BackendWorkout>("/workouts", {
    method: "POST",
    body: JSON.stringify(mobileWorkoutToBackend(workout)),
  });
}

export async function deleteWorkout(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/workouts/${id}`, { method: "DELETE" });
}
