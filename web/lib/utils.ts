import type { Workout, ExerciseItem, Exercise } from "@/types";

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(dateStr: string | number): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0) return `${hours}h ${remainingMinutes}m`;
  return `${minutes}m`;
}

export function getExercisesFromItems(items: ExerciseItem[]): Exercise[] {
  const exercises: Exercise[] = [];
  for (const item of items) {
    if (item.type === "exercise") {
      exercises.push(item);
    } else if (item.type === "group") {
      exercises.push(...item.children);
    }
  }
  return exercises;
}

export function calculateTotalVolume(workouts: Workout[]): number {
  let total = 0;
  for (const workout of workouts) {
    const exercises = getExercisesFromItems(workout.exercises);
    for (const ex of exercises) {
      for (const set of ex.sets) {
        if (set.completed && !set.isWarmup) {
          const weight = parseFloat(set.weight) || 0;
          const reps = parseInt(set.reps) || 0;
          total += weight * reps;
        }
      }
    }
  }
  return total;
}

export function calculateStreak(workouts: Workout[]): number {
  if (workouts.length === 0) return 0;

  const sorted = [...workouts].sort(
    (a, b) => (b.finishedAt || b.startedAt) - (a.finishedAt || a.startedAt)
  );

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (const workout of sorted) {
    const wDate = new Date(workout.finishedAt || workout.startedAt);
    wDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor(
      (currentDate.getTime() - wDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays <= 1) {
      streak++;
      currentDate = wDate;
    } else {
      break;
    }
  }

  return streak;
}

export function formatWeight(weight: number, unit: string = "lbs"): string {
  return `${weight.toFixed(0)} ${unit}`;
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(0);
}
