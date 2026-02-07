import type { ExerciseLibraryItem, Exercise, Set, SetType, Note, UserSettings } from '@/types/workout';

/** Optional global defaults that can be applied when creating exercise instances */
export interface ExerciseDefaults {
  weightUnit?: 'lbs' | 'kg';
  weightCalcMode?: '1x' | '2x';
  repsConfigMode?: '1x' | '2x' | 'lrSplit';
  distanceUnitSystem?: 'US' | 'Metric';
  defaultRestTimerSeconds?: number;
}

/** Converts UserSettings to ExerciseDefaults */
export const settingsToDefaults = (settings: UserSettings): ExerciseDefaults => ({
  weightUnit: settings.weightUnit,
  weightCalcMode: settings.weightCalcMode,
  repsConfigMode: settings.repsConfigMode,
  distanceUnitSystem: settings.distanceUnit,
  defaultRestTimerSeconds: settings.defaultRestTimerSeconds,
});

/**
 * Creates a new exercise instance from a library exercise
 * @param ex - The library exercise to create an instance from
 * @param setCount - Number of sets to create (default: 1)
 * @param isDropset - Whether the sets should be grouped as a dropset (default: false)
 * @param pinnedNotes - Pinned notes from the library exercise
 * @param defaults - Optional global user setting defaults
 * @returns A new Exercise instance
 */
export const createExerciseInstance = (
  ex: ExerciseLibraryItem, 
  setCount: number = 1, 
  isDropset: boolean = false,
  pinnedNotes: Note[] = [],
  defaults?: ExerciseDefaults
): Exercise => {
  // Generate a shared dropSetId if this is a dropset (groups sets together visually)
  const dropSetId = isDropset ? `dropset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` : undefined;

  // Create the specified number of sets
  const sets: Set[] = Array.from({ length: setCount }, (_, i) => ({
    id: `s-${Date.now()}-${Math.random()}-${i}`,
    type: "Working" as SetType,
    weight: "",
    reps: "",
    duration: "",
    distance: "",
    completed: false,
    // If dropset, assign the shared dropSetId to group sets together
    ...(dropSetId && { dropSetId })
  }));

  const defaultDistSystem = defaults?.distanceUnitSystem || 'US';

  return {
    instanceId: `inst-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    exerciseId: ex.id,
    name: ex.name,
    category: ex.category,
    type: 'exercise',
    sets: sets,
    notes: [...pinnedNotes], // Include pinned notes from library
    collapsed: false,
    // Apply global defaults for weight/reps config (can be overridden per exercise)
    weightUnit: defaults?.weightUnit,
    weightCalcMode: defaults?.weightCalcMode,
    repsConfigMode: defaults?.repsConfigMode,
    // Copy configuration fields from library item
    ...(ex.trackDuration !== undefined && { trackDuration: ex.trackDuration }),
    ...(ex.trackReps !== undefined && { trackReps: ex.trackReps }),
    ...(ex.trackDistance !== undefined && { trackDistance: ex.trackDistance }),
    ...(ex.weightEquipTags && ex.weightEquipTags.length > 0 && { weightEquipTags: ex.weightEquipTags }),
    // Set default distance unit system and unit if trackDistance is true
    ...(ex.trackDistance === true && {
      distanceUnitSystem: (ex.distanceUnitSystem as 'US' | 'Metric' | undefined) || defaultDistSystem,
      distanceUnit: (ex.distanceUnit as 'ft' | 'yd' | 'mi' | 'm' | 'km' | undefined) || (((ex.distanceUnitSystem as 'US' | 'Metric' | undefined) || defaultDistSystem) === 'Metric' ? 'm' : 'mi')
    })
  };
};

/**
 * Creates an exercise instance with multiple set groups (for dropsets, warmups, etc.)
 * @param ex - The library exercise to create an instance from
 * @param setGroups - Array of set group configurations
 * @param pinnedNotes - Pinned notes from the library exercise
 * @param defaults - Optional global user setting defaults
 * @returns A new Exercise instance
 */
export const createExerciseInstanceWithSetGroups = (
  ex: ExerciseLibraryItem, 
  setGroups: Array<{ count: number; isDropset: boolean; isWarmup?: boolean; isFailure?: boolean }>,
  pinnedNotes: Note[] = [],
  defaults?: ExerciseDefaults
): Exercise => {
  // Create sets based on setGroups - each setGroup gets its own dropSetId if it's a dropset
  const sets: Set[] = [];
  setGroups.forEach((setGroup) => {
    const dropSetId = setGroup.isDropset ? `dropset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` : undefined;

    for (let i = 0; i < setGroup.count; i++) {
      sets.push({
        id: `s-${Date.now()}-${Math.random()}-${sets.length}`,
        type: setGroup.isWarmup ? "Warmup" as SetType : setGroup.isFailure ? "Failure" as SetType : "Working" as SetType,
        weight: "",
        reps: "",
        duration: "",
        distance: "",
        completed: false,
        ...(dropSetId && { dropSetId, isDropset: true }),
        ...(setGroup.isWarmup && { isWarmup: true }),
        ...(setGroup.isFailure && { isFailure: true })
      });
    }
  });

  const defaultDistSystem = defaults?.distanceUnitSystem || 'US';

  return {
    instanceId: `inst-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    exerciseId: ex.id,
    name: ex.name,
    category: ex.category,
    type: 'exercise',
    sets: sets,
    notes: [...pinnedNotes], // Include pinned notes from library
    collapsed: false,
    // Apply global defaults for weight/reps config (can be overridden per exercise)
    weightUnit: defaults?.weightUnit,
    weightCalcMode: defaults?.weightCalcMode,
    repsConfigMode: defaults?.repsConfigMode,
    // Copy configuration fields from library item
    ...(ex.trackDuration !== undefined && { trackDuration: ex.trackDuration }),
    ...(ex.trackReps !== undefined && { trackReps: ex.trackReps }),
    ...(ex.trackDistance !== undefined && { trackDistance: ex.trackDistance }),
    ...(ex.weightEquipTags && ex.weightEquipTags.length > 0 && { weightEquipTags: ex.weightEquipTags }),
    // Set default distance unit system and unit if trackDistance is true
    ...(ex.trackDistance === true && {
      distanceUnitSystem: (ex.distanceUnitSystem as 'US' | 'Metric' | undefined) || defaultDistSystem,
      distanceUnit: (ex.distanceUnit as 'ft' | 'yd' | 'mi' | 'm' | 'km' | undefined) || (((ex.distanceUnitSystem as 'US' | 'Metric' | undefined) || defaultDistSystem) === 'Metric' ? 'm' : 'mi')
    })
  };
};
