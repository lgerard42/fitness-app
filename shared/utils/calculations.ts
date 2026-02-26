/**
 * Shared calculation utilities — single source of truth for Mobile, Web, Admin.
 */

import type { Workout, ExerciseItem, Exercise } from '../types/workout';

/** Extract flat list of exercises from nested ExerciseItem[] (flattens groups) */
export function getExercisesFromItems(items: ExerciseItem[]): Exercise[] {
  const exercises: Exercise[] = [];
  for (const item of items) {
    if (item.type === 'exercise') {
      exercises.push(item);
    } else if (item.type === 'group') {
      exercises.push(...item.children);
    }
  }
  return exercises;
}

/** Sum total volume (weight x reps) across completed, non-warmup sets */
export function calculateTotalVolume(workouts: Workout[]): number {
  let total = 0;
  for (const workout of workouts) {
    const exercises = getExercisesFromItems(workout.exercises);
    for (const ex of exercises) {
      for (const set of ex.sets) {
        if (set.completed && !set.isWarmup) {
          const weight = parseFloat(set.weight) || 0;
          const reps = parseInt(set.reps, 10) || 0;
          total += weight * reps;
        }
      }
    }
  }
  return total;
}

/** Count consecutive workout days (streak) from most recent backward */
export function calculateStreak(workouts: Workout[]): number {
  if (workouts.length === 0) return 0;

  const sorted = [...workouts].sort(
    (a, b) => (b.finishedAt || b.startedAt) - (a.finishedAt || a.startedAt),
  );

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (const workout of sorted) {
    const wDate = new Date(workout.finishedAt || workout.startedAt);
    wDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor(
      (currentDate.getTime() - wDate.getTime()) / (1000 * 60 * 60 * 24),
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
