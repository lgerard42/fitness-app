// Re-export all workout/app types from shared — single source of truth
export type {
  SetType,
  WeightUnit,
  DistanceUnitSystem,
  DistanceUnit,
  ExerciseCategory,
  GoalType,
  Set,
  Exercise,
  ExerciseGroup,
  ExerciseItem,
  Note,
  SessionNote,
  Workout,
  ExerciseStats,
  ExerciseStatsMap,
  ExerciseLibraryItem,
  UserSettings,
  BodyMeasurement,
  UserGoal,
  PersonalRecord,
  UserProfile,
  DashboardData,
} from '@shared/types/workout';

/** @deprecated Use Set instead */
export type { Set as WorkoutSet } from '@shared/types/workout';
