export type SetType = "Working" | "Warmup" | "Failure";
export type WeightUnit = "lbs" | "kg";
export type ExerciseCategory = "Lifts" | "Cardio" | "Training";
export type GoalType = "strength" | "consistency";

export interface WorkoutSet {
  id: string;
  type: SetType;
  weight: string;
  weight2?: string;
  reps: string;
  reps2?: string;
  duration: string;
  distance: string;
  completed: boolean;
  restPeriodSeconds?: number;
  isWarmup?: boolean;
  isDropset?: boolean;
  isFailure?: boolean;
}

export interface Note {
  id: string;
  text: string;
  date: string;
  pinned: boolean;
}

export interface SessionNote {
  id: string;
  text: string;
  date: string;
  pinned: boolean;
}

export interface Exercise {
  instanceId: string;
  exerciseId: string;
  name: string;
  category: ExerciseCategory;
  type: "exercise";
  sets: WorkoutSet[];
  notes?: Note[];
  weightUnit?: WeightUnit;
}

export interface ExerciseGroup {
  instanceId: string;
  type: "group";
  groupType: "Superset" | "HIIT";
  children: Exercise[];
}

export type ExerciseItem = Exercise | ExerciseGroup;

export interface Workout {
  id: string;
  name: string;
  startedAt: number;
  exercises: ExerciseItem[];
  sessionNotes?: SessionNote[];
  finishedAt?: number;
  endedAt?: number;
  duration?: string;
  date?: string;
}

export interface ExerciseStats {
  pr: number;
  lastPerformed: string | null;
  history: Array<{
    date: string;
    sets: Array<{
      weight: string;
      weight2?: string;
      reps: string;
      duration: string;
      distance: string;
      isWarmup: boolean;
      isFailure: boolean;
      dropSetId: string | null;
    }>;
  }>;
}

export type ExerciseStatsMap = Record<string, ExerciseStats>;

export interface ExerciseLibraryItem {
  id: string;
  name: string;
  category: ExerciseCategory;
  pinnedNotes?: Note[];
}

export interface UserSettings {
  weightUnit: WeightUnit;
  defaultRestTimerSeconds: number;
}

export interface BodyMeasurement {
  id: string;
  date: string;
  weight?: number;
  bodyFatPercent?: number;
  neck?: number;
  chest?: number;
  waist?: number;
  leftArm?: number;
  rightArm?: number;
  leftThigh?: number;
  rightThigh?: number;
  unit: WeightUnit;
  circumferenceUnit: "in" | "cm";
}

export interface UserGoal {
  id: string;
  type: GoalType;
  exerciseId?: string;
  exerciseName?: string;
  targetWeight?: number;
  targetWeightUnit?: WeightUnit;
  targetWorkoutsPerWeek?: number;
  currentProgress?: number;
  createdAt: string;
  completed: boolean;
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  weightUnit: WeightUnit;
  date: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardData {
  user: UserProfile;
  workoutHistory: Workout[];
  exerciseStats: ExerciseStatsMap;
  bodyMeasurements: BodyMeasurement[];
  goals: UserGoal[];
  personalRecords: PersonalRecord[];
}
