import {
  filterExercises,
  getAvailableSecondaryMusclesForPrimaries,
  type ExerciseFilters,
} from './exerciseFilters';

const mockLibraryItem = (
  overrides: Partial<{
    id: string;
    name: string;
    category: string;
    primaryMuscles: string[];
    secondaryMuscles: string[];
    weightEquipTags: string[];
  }> = {}
) => ({
  id: 'ex-1',
  name: 'Bench Press',
  category: 'Lifts',
  primaryMuscles: ['Chest'],
  secondaryMuscles: ['Triceps', 'Shoulders'],
  weightEquipTags: ['Barbell'],
  ...overrides,
});

const emptyFilters: ExerciseFilters = {
  search: '',
  category: [],
  primaryMuscle: [],
  secondaryMuscle: [],
  equipment: [],
};

describe('exerciseFilters', () => {
  describe('filterExercises', () => {
    it('returns all exercises when filters are empty', () => {
      const exercises = [
        mockLibraryItem({ id: '1', name: 'Squat' }),
        mockLibraryItem({ id: '2', name: 'Bench' }),
      ];
      const result = filterExercises(exercises, emptyFilters);
      expect(result).toHaveLength(2);
    });

    it('filters by search (case insensitive)', () => {
      const exercises = [
        mockLibraryItem({ name: 'Bench Press' }),
        mockLibraryItem({ name: 'Squat' }),
        mockLibraryItem({ name: 'Deadlift' }),
      ];
      const result = filterExercises(exercises, { ...emptyFilters, search: 'bench' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Bench Press');
    });

    it('filters by category', () => {
      const exercises = [
        mockLibraryItem({ category: 'Lifts', name: 'Squat' }),
        mockLibraryItem({ category: 'Cardio', name: 'Running' }),
        mockLibraryItem({ category: 'Lifts', name: 'Bench' }),
      ];
      const result = filterExercises(exercises, { ...emptyFilters, category: ['Lifts'] });
      expect(result).toHaveLength(2);
      expect(result.map((e) => e.name)).toContain('Squat');
      expect(result.map((e) => e.name)).toContain('Bench');
    });

    it('filters by primary muscle', () => {
      const exercises = [
        mockLibraryItem({ primaryMuscles: ['Chest'], name: 'Bench' }),
        mockLibraryItem({ primaryMuscles: ['Back'], name: 'Rows' }),
        mockLibraryItem({ primaryMuscles: ['Chest', 'Triceps'], name: 'Dips' }),
      ];
      const result = filterExercises(exercises, { ...emptyFilters, primaryMuscle: ['Chest'] });
      expect(result).toHaveLength(2);
    });

    it('filters by secondary muscle', () => {
      const exercises = [
        mockLibraryItem({ secondaryMuscles: ['Triceps'], name: 'Bench' }),
        mockLibraryItem({ secondaryMuscles: ['Biceps'], name: 'Rows' }),
      ];
      const result = filterExercises(exercises, { ...emptyFilters, secondaryMuscle: ['Triceps'] });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Bench');
    });

    it('filters by equipment', () => {
      const exercises = [
        mockLibraryItem({ weightEquipTags: ['Barbell'], name: 'Squat' }),
        mockLibraryItem({ weightEquipTags: ['Dumbbell'], name: 'Curls' }),
      ];
      const result = filterExercises(exercises, { ...emptyFilters, equipment: ['Barbell'] });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Squat');
    });

    it('combines multiple filters', () => {
      const exercises = [
        mockLibraryItem({ name: 'Bench Press', category: 'Lifts', primaryMuscles: ['Chest'] }),
        mockLibraryItem({ name: 'Squat', category: 'Lifts', primaryMuscles: ['Legs'] }),
      ];
      const result = filterExercises(exercises, {
        ...emptyFilters,
        search: 'bench',
        category: ['Lifts'],
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Bench Press');
    });

    it('handles missing optional arrays (treats as empty)', () => {
      const ex = mockLibraryItem({ primaryMuscles: undefined as any, secondaryMuscles: undefined, weightEquipTags: undefined });
      const result = filterExercises([ex], emptyFilters);
      expect(result).toHaveLength(1);
    });
  });

  describe('getAvailableSecondaryMusclesForPrimaries', () => {
    it('returns empty array when primaries is empty', () => {
      const map = { Chest: ['Triceps'] };
      expect(getAvailableSecondaryMusclesForPrimaries([], map)).toEqual([]);
    });

    it('returns secondaries for given primaries', () => {
      const map: Record<string, string[]> = {
        Chest: ['Triceps', 'Shoulders'],
        Back: ['Biceps'],
      };
      const result = getAvailableSecondaryMusclesForPrimaries(['Chest', 'Back'], map);
      expect(result).toContain('Triceps');
      expect(result).toContain('Shoulders');
      expect(result).toContain('Biceps');
    });

    it('returns sorted unique values', () => {
      const map = {
        A: ['Z', 'B'],
        B: ['A', 'Z'],
      };
      const result = getAvailableSecondaryMusclesForPrimaries(['A', 'B'], map);
      expect(result).toEqual(['A', 'B', 'Z']);
    });

    it('handles primary with no mapping (returns empty for that primary)', () => {
      const map = { Chest: ['Triceps'] };
      const result = getAvailableSecondaryMusclesForPrimaries(['Unknown'], map);
      expect(result).toEqual([]);
    });
  });
});
