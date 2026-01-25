export type SetType = 'Working' | 'Warmup' | 'Failure';
export type WeightUnit = 'lbs' | 'kg';
export type ExerciseCategory = 'Lifts' | 'Cardio' | 'Bodyweight' | 'HIIT';
export type WorkoutMode = 'live' | 'edit' | 'readonly';
export type GroupType = 'Superset' | 'HIIT';
export type GroupSetType = 'warmup' | 'dropset' | 'failure' | null;
export type SupersetMode = 'create' | 'add' | 'edit';

export interface Set {
  id: string;
  type: SetType;
  weight: string;
  reps: string;
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
  field: 'weight' | 'reps' | 'duration' | 'distance';
}

export interface ExerciseStats {
  pr: number;
  lastPerformed: string | null;
  history: Array<{
    date: string;
    sets: Array<{
      weight: string;
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
  [key: string]: unknown;
}

export type ExerciseStatsMap = Record<string, ExerciseStats>;
