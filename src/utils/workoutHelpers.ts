import type { ExerciseItem, Exercise, ExerciseGroup, FlatExerciseRow, GroupType } from '../types/workout';

export const updateExercisesDeep = (
  list: ExerciseItem[],
  instanceId: string,
  updateFn: (item: ExerciseItem) => ExerciseItem
): ExerciseItem[] => {
  return list.map(item => {
    if (item.instanceId === instanceId) return updateFn(item);
    if (item.type === 'group' && item.children) {
      return { ...item, children: updateExercisesDeep(item.children, instanceId, updateFn) };
    }
    return item;
  });
};

export const deleteExerciseDeep = (list: ExerciseItem[], instanceId: string): ExerciseItem[] => {
  return list.reduce((acc, item) => {
    if (item.instanceId === instanceId) return acc;
    if (item.type === 'group' && item.children) {
      const newChildren = deleteExerciseDeep(item.children, instanceId);
      if (newChildren.length === 0) return acc;
      return [...acc, { ...item, children: newChildren }];
    }
    return [...acc, item];
  }, [] as ExerciseItem[]);
};

export const findExerciseDeep = (list: ExerciseItem[], instanceId: string): Exercise | null => {
  for (const item of list) {
    if (item.instanceId === instanceId && item.type === 'exercise') return item;
    if (item.type === 'group' && item.children) {
      const found = findExerciseDeep(item.children, instanceId);
      if (found) return found;
    }
  }
  return null;
};

export const flattenExercises = (exercises: ExerciseItem[]): FlatExerciseRow[] => {
  const rows: FlatExerciseRow[] = [];
  exercises.forEach(item => {
    if (item.type === 'group') {
      rows.push({ type: 'group_header', id: item.instanceId, data: item, depth: 0, groupId: null });
      if (item.children) {
        item.children.forEach(child => {
          rows.push({ type: 'exercise', id: child.instanceId, data: child, depth: 1, groupId: item.instanceId });
        });
      }
    } else {
      rows.push({ type: 'exercise', id: item.instanceId, data: item, depth: 0, groupId: null });
    }
  });
  return rows;
};

export const reconstructExercises = (flatRows: FlatExerciseRow[]): ExerciseItem[] => {
  const newExercises: ExerciseItem[] = [];
  let currentGroup: ExerciseGroup | null = null;

  flatRows.forEach(row => {
    if (row.type === 'group_header') {
      currentGroup = { ...row.data as ExerciseGroup, children: [] };
      newExercises.push(currentGroup);
    } else if (row.type === 'exercise') {
      if (row.depth === 1 && currentGroup) {
        currentGroup.children.push(row.data as Exercise);
      } else {
        newExercises.push(row.data);
        currentGroup = null;
      }
    }
  });
  return newExercises;
};

export const formatRestTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const parseRestTimeInput = (input: string): number => {
  const num = parseInt(input, 10);
  if (isNaN(num) || num <= 0) return 0;
  
  if (num <= 99) {
    return num;
  } else {
    const lastTwo = num % 100;
    const rest = Math.floor(num / 100);
    
    if (lastTwo < 60) {
      return rest * 60 + lastTwo;
    } else {
      return num;
    }
  }
};

export const getAllSupersets = (exercises: ExerciseItem[]): ExerciseGroup[] => {
  return exercises.filter((ex): ex is ExerciseGroup => ex.type === 'group' && ex.groupType === 'Superset');
};

export const findExerciseSuperset = (exercises: ExerciseItem[], exerciseInstanceId: string): ExerciseGroup | null => {
  for (const item of exercises) {
    if (item.type === 'group' && item.groupType === 'Superset' && item.children) {
      const found = item.children.find(child => child.instanceId === exerciseInstanceId);
      if (found) return item;
    }
  }
  return null;
};

export const isExerciseInSuperset = (exercises: ExerciseItem[], exerciseInstanceId: string): boolean => {
  return !!findExerciseSuperset(exercises, exerciseInstanceId);
};

export const getStandaloneExercises = (exercises: ExerciseItem[]): Exercise[] => {
  const standalone: Exercise[] = [];
  exercises.forEach(item => {
    if (item.type === 'exercise') {
      standalone.push(item);
    }
  });
  return standalone;
};

export const convertWorkoutUnits = (exercise: Exercise): Exercise => {
  const isKg = exercise.weightUnit === 'kg';
  const newUnit = exercise.weightUnit === 'kg' ? 'lbs' : 'kg';

  const convert = (val: string | null | undefined): string => {
    if (val === "" || val === null || val === undefined) return val || "";
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    const result = isKg ? num * 2.20462 : num / 2.20462;
    return parseFloat(result.toFixed(1)).toString();
  };

  return {
    ...exercise,
    weightUnit: newUnit,
    sets: exercise.sets.map(s => ({
      ...s,
      weight: exercise.category === 'Lifts' ? convert(s.weight) : s.weight
    }))
  };
};
