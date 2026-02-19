import {
  settingsToDefaults,
  createExerciseInstance,
  createExerciseInstanceWithSetGroups,
  type ExerciseDefaults,
} from './workoutInstanceHelpers';

const mockLibraryItem = (overrides: Record<string, unknown> = {}) => ({
  id: 'lib-1',
  name: 'Bench Press',
  category: 'Lifts',
  ...overrides,
});

describe('workoutInstanceHelpers', () => {
  describe('settingsToDefaults', () => {
    it('converts UserSettings to ExerciseDefaults', () => {
      const settings = {
        distanceUnit: 'Metric' as const,
        weightUnit: 'kg' as const,
        weightCalcMode: '2x' as const,
        repsConfigMode: 'lrSplit' as const,
        defaultRestTimerSeconds: 90,
        vibrateOnTimerFinish: true,
        keepScreenAwake: false,
      };
      const result = settingsToDefaults(settings);
      expect(result).toEqual({
        weightUnit: 'kg',
        weightCalcMode: '2x',
        repsConfigMode: 'lrSplit',
        distanceUnitSystem: 'Metric',
        defaultRestTimerSeconds: 90,
      });
    });
  });

  describe('createExerciseInstance', () => {
    it('creates exercise with correct structure from library item', () => {
      const lib = mockLibraryItem({ id: 'ex-bench', name: 'Bench Press', category: 'Lifts' });
      const result = createExerciseInstance(lib);

      expect(result.exerciseId).toBe('ex-bench');
      expect(result.name).toBe('Bench Press');
      expect(result.category).toBe('Lifts');
      expect(result.type).toBe('exercise');
      expect(result.instanceId).toMatch(/^inst-/);
      expect(result.sets).toHaveLength(1);
      expect(result.sets[0]).toMatchObject({
        type: 'Working',
        weight: '',
        reps: '',
        completed: false,
      });
    });

    it('creates specified number of sets', () => {
      const lib = mockLibraryItem();
      const result = createExerciseInstance(lib, 5);
      expect(result.sets).toHaveLength(5);
    });

    it('applies defaults when provided', () => {
      const lib = mockLibraryItem();
      const defaults: ExerciseDefaults = {
        weightUnit: 'kg',
        weightCalcMode: '2x',
        repsConfigMode: 'lrSplit',
      };
      const result = createExerciseInstance(lib, 1, false, [], defaults);
      expect(result.weightUnit).toBe('kg');
      expect(result.weightCalcMode).toBe('2x');
      expect(result.repsConfigMode).toBe('lrSplit');
    });

    it('copies pinned notes', () => {
      const lib = mockLibraryItem();
      const notes = [{ id: 'n1', text: 'Form tip', date: '2025-01-01', pinned: true }];
      const result = createExerciseInstance(lib, 1, false, notes);
      expect(result.notes).toHaveLength(1);
      expect(result.notes![0].text).toBe('Form tip');
    });

    it('adds dropSetId when isDropset is true', () => {
      const lib = mockLibraryItem();
      const result = createExerciseInstance(lib, 3, true);
      expect(result.sets.every((s) => s.dropSetId === result.sets[0].dropSetId)).toBe(true);
      expect(result.sets[0].dropSetId).toMatch(/^dropset-/);
    });

    it('copies trackDuration, trackReps, trackDistance from library', () => {
      const lib = mockLibraryItem({
        trackDuration: true,
        trackReps: true,
        trackDistance: true,
      });
      const result = createExerciseInstance(lib);
      expect(result.trackDuration).toBe(true);
      expect(result.trackReps).toBe(true);
      expect(result.trackDistance).toBe(true);
    });

    it('copies weightEquipTags and assistedNegative when present', () => {
      const lib = mockLibraryItem({
        weightEquipTags: ['Machine (Selectorized)'],
        assistedNegative: true,
      });
      const result = createExerciseInstance(lib);
      expect(result.weightEquipTags).toEqual(['Machine (Selectorized)']);
      expect(result.assistedNegative).toBe(true);
    });
  });

  describe('createExerciseInstanceWithSetGroups', () => {
    it('creates sets according to setGroups configuration', () => {
      const lib = mockLibraryItem();
      const setGroups = [
        { id: 'g1', count: 2, isDropset: false },
        { id: 'g2', count: 1, isDropset: true },
      ];
      const result = createExerciseInstanceWithSetGroups(lib, setGroups);

      expect(result.sets).toHaveLength(3);
      expect(result.sets[0].dropSetId).toBeUndefined();
      expect(result.sets[1].dropSetId).toBeUndefined();
      expect(result.sets[2].dropSetId).toBe('g2');
    });

    it('applies warmup and failure set types from setGroup', () => {
      const lib = mockLibraryItem();
      const setGroups = [
        { id: 'g1', count: 1, isDropset: false, isWarmup: true },
        { id: 'g2', count: 1, isDropset: false, isFailure: true },
      ];
      const result = createExerciseInstanceWithSetGroups(lib, setGroups);

      expect(result.sets[0].type).toBe('Warmup');
      expect(result.sets[1].type).toBe('Failure');
    });

    it('uses setTypes array for dropset with mixed set types', () => {
      const lib = mockLibraryItem();
      const setGroups = [
        {
          id: 'g1',
          count: 2,
          isDropset: true,
          setTypes: [{ isWarmup: true, isFailure: false }, { isWarmup: false, isFailure: true }],
        },
      ];
      const result = createExerciseInstanceWithSetGroups(lib, setGroups);

      expect(result.sets[0].type).toBe('Warmup');
      expect(result.sets[1].type).toBe('Failure');
    });

    it('applies restPeriodSeconds from setGroup', () => {
      const lib = mockLibraryItem();
      const setGroups = [
        { id: 'g1', count: 1, isDropset: false, restPeriodSeconds: 90 },
      ];
      const result = createExerciseInstanceWithSetGroups(lib, setGroups);
      expect(result.sets[0].restPeriodSeconds).toBe(90);
    });

    it('applies restPeriodSecondsBySetId when provided', () => {
      const lib = mockLibraryItem();
      const setGroups = [
        {
          id: 'g1',
          count: 2,
          isDropset: false,
          restPeriodSecondsBySetId: { 'g1-0': 60, 'g1-1': 90 },
        },
      ];
      const result = createExerciseInstanceWithSetGroups(lib, setGroups);
      expect(result.sets[0].restPeriodSeconds).toBe(60);
      expect(result.sets[1].restPeriodSeconds).toBe(90);
    });
  });
});
