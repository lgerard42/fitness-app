// Shared workout/app types — single source of truth for Mobile, Web, Admin, Backend

export type SetType = 'Working' | 'Warmup' | 'Failure';
export type WeightUnit = 'lbs' | 'kg';
export type DistanceUnitSystem = 'US' | 'Metric';
export type DistanceUnitUS = 'ft' | 'yd' | 'mi';
export type DistanceUnitMetric = 'm' | 'km';
export type DistanceUnit = DistanceUnitUS | DistanceUnitMetric;
export type ExerciseCategory = 'Lifts' | 'Cardio' | 'Training';
export type WorkoutMode = 'live' | 'edit' | 'readonly';
export type GroupType = 'Superset' | 'HIIT';
export type GroupSetType = 'warmup' | 'dropset' | 'failure' | null;
export type SupersetMode = 'create' | 'add' | 'edit';
export type GoalType = 'strength' | 'consistency';

export interface Set {
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
  restTimerCompleted?: boolean;
  dropSetId?: string;
  isWarmup?: boolean;
  isDropset?: boolean;
  isFailure?: boolean;
}

export interface Exercise {
  instanceId: string;
  exerciseId: string;
  name: string;
  category: ExerciseCategory;
  type: 'exercise';
  sets: Set[];
  notes?: Note[];
  weightUnit?: WeightUnit;
  collapsed?: boolean;
  trackDuration?: boolean;
  trackReps?: boolean;
  trackDistance?: boolean;
  weightEquipTags?: string[];
  /** @deprecated Use weightCalcMode instead */
  multiplyWeightBy2?: boolean;
  /** @deprecated Use repsConfigMode instead */
  alternatingRepsBy2?: boolean;
  weightCalcMode?: '1x' | '2x';
  repsConfigMode?: '1x' | '2x' | 'lrSplit';
  distanceUnitSystem?: DistanceUnitSystem;
  distanceUnit?: DistanceUnit;
  /** When true (Machine Selectorized only), effective weight = bodyWeight - weight input */
  assistedNegative?: boolean;
}

export interface ExerciseGroup {
  instanceId: string;
  type: 'group';
  groupType: GroupType;
  children: Exercise[];
}

export type ExerciseItem = Exercise | ExerciseGroup;

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

export interface SupersetSelection {
  exerciseId: string;
  mode: SupersetMode;
  supersetId?: string;
}

export interface GroupSelectionMode {
  exerciseId: string;
  type: 'drop_set';
  editingGroupId?: string;
  triggeringSetId?: string;
}

export interface RestTimer {
  exerciseId: string;
  setId: string;
  remainingSeconds: number;
  totalSeconds: number;
  isPaused: boolean;
}

export interface FlatExerciseRow {
  type: 'group_header' | 'exercise';
  id: string;
  data: ExerciseItem;
  depth: number;
  groupId: string | null;
}

export interface RestPeriodSetInfo {
  exerciseId: string;
  setId: string;
}

export interface FocusNextSet {
  exerciseId: string;
  setId: string;
  field: 'weight' | 'weight2' | 'reps' | 'reps2' | 'duration' | 'distance';
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

export interface ExerciseLibraryItem {
  id: string;
  name: string;
  category: ExerciseCategory;
  pinnedNotes?: Note[];
  /** When true (Machine Selectorized only), effective weight = bodyWeight - weight input */
  assistedNegative?: boolean;
  [key: string]: unknown;
}

export type ExerciseStatsMap = Record<string, ExerciseStats>;

// ─── Profile & Settings Types ───────────────────────────────────────────────

export interface UserSettings {
  distanceUnit: DistanceUnitSystem;
  weightUnit: WeightUnit;
  weightCalcMode: '1x' | '2x';
  repsConfigMode: '1x' | '2x' | 'lrSplit';
  defaultRestTimerSeconds: number;
  vibrateOnTimerFinish: boolean;
  keepScreenAwake: boolean;
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
  circumferenceUnit: 'in' | 'cm';
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
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  avatarUrl?: string;
  profilePictureUri?: string;
  dateOfBirth?: string;
  bio?: string;
  bodyWeight?: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Dashboard Aggregate ────────────────────────────────────────────────────

export interface DashboardData {
  user: UserProfile;
  workoutHistory: Workout[];
  exerciseStats: ExerciseStatsMap;
  bodyMeasurements: BodyMeasurement[];
  goals: UserGoal[];
  personalRecords: PersonalRecord[];
}
