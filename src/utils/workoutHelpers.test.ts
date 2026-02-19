import {
  updateExercisesDeep,
  deleteExerciseDeep,
  findExerciseDeep,
  flattenExercises,
  reconstructExercises,
  formatRestTime,
  formatDurationTime,
  parseRestTimeInput,
  parseDurationInput,
  getStandaloneExercises,
  groupExercisesAlphabetically,
} from './workoutHelpers';

describe('workoutHelpers', () => {
  const mockExercise = (id: string, name: string) => ({
    instanceId: id,
    exerciseId: id,
    name,
    category: 'Lifts' as const,
    type: 'exercise' as const,
    sets: [{ id: '1', type: 'Working' as const, weight: '0', reps: '0', duration: '0', distance: '0', completed: false }],
  });

  describe('updateExercisesDeep', () => {
    it('updates a top-level exercise', () => {
      const list = [mockExercise('a', 'Squat'), mockExercise('b', 'Bench')];
      const result = updateExercisesDeep(list, 'a', (e) => ({ ...e, name: 'Squat Updated' }));
      expect(result[0].name).toBe('Squat Updated');
      expect(result[1].name).toBe('Bench');
    });

    it('returns same list when instanceId not found', () => {
      const list = [mockExercise('a', 'Squat')];
      const result = updateExercisesDeep(list, 'nonexistent', (e) => ({ ...e, name: 'X' }));
      expect(result).toEqual(list);
    });
  });

  describe('deleteExerciseDeep', () => {
    it('removes exercise by instanceId', () => {
      const list = [mockExercise('a', 'Squat'), mockExercise('b', 'Bench')];
      const result = deleteExerciseDeep(list, 'a');
      expect(result).toHaveLength(1);
      expect(result[0].instanceId).toBe('b');
    });

    it('returns empty array when deleting only item', () => {
      const list = [mockExercise('a', 'Squat')];
      const result = deleteExerciseDeep(list, 'a');
      expect(result).toEqual([]);
    });
  });

  describe('findExerciseDeep', () => {
    it('finds exercise by instanceId', () => {
      const list = [mockExercise('a', 'Squat')];
      const found = findExerciseDeep(list, 'a');
      expect(found).not.toBeNull();
      expect(found?.name).toBe('Squat');
    });

    it('returns null when not found', () => {
      const list = [mockExercise('a', 'Squat')];
      expect(findExerciseDeep(list, 'x')).toBeNull();
    });
  });

  describe('flattenExercises / reconstructExercises', () => {
    it('flattens and reconstructs a simple exercise list', () => {
      const list = [mockExercise('a', 'Squat'), mockExercise('b', 'Bench')];
      const flat = flattenExercises(list);
      expect(flat).toHaveLength(2);
      expect(flat.every((r) => r.type === 'exercise')).toBe(true);

      const reconstructed = reconstructExercises(flat);
      expect(reconstructed).toHaveLength(2);
      expect(reconstructed[0].instanceId).toBe('a');
      expect(reconstructed[1].instanceId).toBe('b');
    });

    it('returns empty array for invalid input', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      expect(flattenExercises(null as any)).toEqual([]);
      expect(flattenExercises(undefined as any)).toEqual([]);
      expect(reconstructExercises(null as any)).toEqual([]);
      warnSpy.mockRestore();
    });
  });

  describe('formatRestTime', () => {
    it('formats seconds as M:SS', () => {
      expect(formatRestTime(0)).toBe('0:00');
      expect(formatRestTime(65)).toBe('1:05');
      expect(formatRestTime(90)).toBe('1:30');
    });
  });

  describe('formatDurationTime', () => {
    it('formats seconds without hours', () => {
      expect(formatDurationTime(90)).toBe('1:30');
    });
    it('formats seconds with hours', () => {
      expect(formatDurationTime(3661)).toBe('1:01:01');
    });
  });

  describe('parseRestTimeInput', () => {
    it('parses plain seconds', () => {
      expect(parseRestTimeInput('45')).toBe(45);
      expect(parseRestTimeInput('99')).toBe(99);
    });
    it('parses MMSS format (e.g. 130 = 1:30)', () => {
      expect(parseRestTimeInput('130')).toBe(90);
    });
    it('returns 0 for invalid input', () => {
      expect(parseRestTimeInput('')).toBe(0);
      expect(parseRestTimeInput('abc')).toBe(0);
      expect(parseRestTimeInput('0')).toBe(0);
    });
  });

  describe('parseDurationInput', () => {
    it('parses 1–2 digits as seconds', () => {
      expect(parseDurationInput('85')).toBe(85);
    });
    it('parses 3–4 digits as MMSS', () => {
      expect(parseDurationInput('1234')).toBe(12 * 60 + 34);
    });
  });

  describe('getStandaloneExercises', () => {
    it('returns only exercises, not groups', () => {
      const list = [
        mockExercise('a', 'Squat'),
        { instanceId: 'g1', type: 'group' as const, groupType: 'Superset' as const, children: [mockExercise('b', 'Bench')] },
      ] as any;
      const standalone = getStandaloneExercises(list);
      expect(standalone).toHaveLength(1);
      expect(standalone[0].instanceId).toBe('a');
    });
  });

  describe('groupExercisesAlphabetically', () => {
    it('groups items by first letter', () => {
      const items = [
        { name: 'Bench Press' },
        { name: 'Squat' },
        { name: 'Deadlift' },
        { name: 'Rows' },
      ];
      const result = groupExercisesAlphabetically(items);
      expect(result.some((s) => s.title === 'B' && s.data.length === 1)).toBe(true);
      expect(result.some((s) => s.title === 'S' && s.data.length === 1)).toBe(true);
      expect(result.some((s) => s.title === 'D' && s.data.length === 1)).toBe(true);
      expect(result.some((s) => s.title === 'R' && s.data.length === 1)).toBe(true);
    });
  });
});
