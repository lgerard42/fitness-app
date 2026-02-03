import { PRIMARY_TO_SECONDARY_MAP } from '@/constants/data';
import type { ExerciseLibraryItem } from '@/types/workout';

export interface ExerciseFilters {
  search: string;
  category: string[];
  primaryMuscle: string[];
  secondaryMuscle: string[];
  equipment: string[];
}

/**
 * Filters exercises based on search query and filter criteria
 * @param exercises - Array of exercises to filter
 * @param filters - Filter criteria object
 * @returns Filtered array of exercises
 */
export const filterExercises = (
  exercises: ExerciseLibraryItem[],
  filters: ExerciseFilters
): ExerciseLibraryItem[] => {
  const { search, category, primaryMuscle, secondaryMuscle, equipment } = filters;

  return exercises.filter(ex => {
    // Search filter
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());

    // Category filter
    const matchesCategory = category.length === 0 || category.includes(ex.category);

    // Primary muscle filter
    const primaryMuscles = (ex.primaryMuscles as string[]) || [];
    const matchesPrimaryMuscle = primaryMuscle.length === 0 ||
      primaryMuscle.some(muscle => primaryMuscles.includes(muscle));

    // Secondary muscle filter
    const secondaryMuscles = (ex.secondaryMuscles as string[]) || [];
    const matchesSecondaryMuscle = secondaryMuscle.length === 0 ||
      (ex.secondaryMuscles && secondaryMuscle.some(muscle => secondaryMuscles.includes(muscle)));

    // Equipment filter
    const weightEquipTags = (ex.weightEquipTags as string[]) || [];
    const matchesEquip = equipment.length === 0 ||
      (ex.weightEquipTags && equipment.some(equip => weightEquipTags.includes(equip)));

    return matchesSearch && matchesCategory && matchesPrimaryMuscle && matchesSecondaryMuscle && matchesEquip;
  });
};

/**
 * Gets available secondary muscles for a list of primary muscles
 * @param primaries - Array of primary muscle names
 * @returns Sorted array of unique secondary muscle names
 */
export const getAvailableSecondaryMusclesForPrimaries = (primaries: string[]): string[] => {
  if (primaries.length === 0) return [];
  
  const secondarySet = new Set<string>();
  primaries.forEach(primary => {
    const secondaries = (PRIMARY_TO_SECONDARY_MAP as Record<string, string[]>)[primary] || [];
    secondaries.forEach((sec: string) => secondarySet.add(sec));
  });
  
  return Array.from(secondarySet).sort();
};
