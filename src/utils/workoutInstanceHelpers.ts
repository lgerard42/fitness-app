import type { ExerciseLibraryItem, Exercise, Set, SetType, Note } from '@/types/workout';

/**
 * Creates a new exercise instance from a library exercise
 * @param ex - The library exercise to create an instance from
 * @param setCount - Number of sets to create (default: 1)
 * @param isDropset - Whether the sets should be grouped as a dropset (default: false)
 * @returns A new Exercise instance
 */
export const createExerciseInstance = (
  ex: ExerciseLibraryItem, 
  setCount: number = 1, 
  isDropset: boolean = false,
  pinnedNotes: Note[] = []
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

  return {
    instanceId: `inst-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    exerciseId: ex.id,
    name: ex.name,
    category: ex.category,
    type: 'exercise',
    sets: sets,
    notes: [...pinnedNotes], // Include pinned notes from library
    collapsed: false,
    // Copy configuration fields from library item
    ...(ex.trackDuration !== undefined && { trackDuration: ex.trackDuration }),
    ...(ex.trackReps !== undefined && { trackReps: ex.trackReps }),
    ...(ex.trackDistance !== undefined && { trackDistance: ex.trackDistance }),
    ...(ex.weightEquipTags && ex.weightEquipTags.length > 0 && { weightEquipTags: ex.weightEquipTags }),
    // Set default distance unit system and unit if trackDistance is true
    ...(ex.trackDistance === true && {
      distanceUnitSystem: (ex.distanceUnitSystem as 'US' | 'Metric' | undefined) || 'US',
      distanceUnit: (ex.distanceUnit as 'ft' | 'yd' | 'mi' | 'm' | 'km' | undefined) || ((ex.distanceUnitSystem as 'US' | 'Metric' | undefined) === 'Metric' ? 'm' : 'mi')
    })
  };
};

/**
 * Creates an exercise instance with multiple set groups (for dropsets, warmups, etc.)
 * @param ex - The library exercise to create an instance from
 * @param setGroups - Array of set group configurations
 * @param pinnedNotes - Pinned notes from the library exercise
 * @returns A new Exercise instance
 */
export const createExerciseInstanceWithSetGroups = (
  ex: ExerciseLibraryItem, 
  setGroups: Array<{ count: number; isDropset: boolean; isWarmup?: boolean; isFailure?: boolean }>,
  pinnedNotes: Note[] = []
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

  return {
    instanceId: `inst-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    exerciseId: ex.id,
    name: ex.name,
    category: ex.category,
    type: 'exercise',
    sets: sets,
    notes: [...pinnedNotes], // Include pinned notes from library
    collapsed: false,
    // Copy configuration fields from library item
    ...(ex.trackDuration !== undefined && { trackDuration: ex.trackDuration }),
    ...(ex.trackReps !== undefined && { trackReps: ex.trackReps }),
    ...(ex.trackDistance !== undefined && { trackDistance: ex.trackDistance }),
    ...(ex.weightEquipTags && ex.weightEquipTags.length > 0 && { weightEquipTags: ex.weightEquipTags }),
    // Set default distance unit system and unit if trackDistance is true
    ...(ex.trackDistance === true && {
      distanceUnitSystem: (ex.distanceUnitSystem as 'US' | 'Metric' | undefined) || 'US',
      distanceUnit: (ex.distanceUnit as 'ft' | 'yd' | 'mi' | 'm' | 'km' | undefined) || ((ex.distanceUnitSystem as 'US' | 'Metric' | undefined) === 'Metric' ? 'm' : 'mi')
    })
  };
};
