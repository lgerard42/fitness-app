import type { ExerciseItem, Exercise, ExerciseGroup, FlatExerciseRow, GroupType, Set } from '@/types/workout';
import { defaultSupersetColorScheme, defaultHiitColorScheme } from '@/constants/defaultStyles';

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

export const formatDurationTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
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

export const parseDurationInput = (input: string): number => {
  const num = parseInt(input, 10);
  if (isNaN(num) || num <= 0) return 0;
  
  // Handle different input lengths:
  // 1-2 digits: seconds (e.g., "85" = 85 seconds)
  // 3-4 digits: MMSS format (e.g., "1234" = 12:34 = 12 minutes 34 seconds)
  // 5+ digits: HHMMSS format (e.g., "12345" = 1:23:45 = 1 hour 23 minutes 45 seconds)
  
  if (num <= 99) {
    // 1-2 digits: treat as seconds
    return num;
  } else if (num <= 9999) {
    // 3-4 digits: MMSS format
    const lastTwo = num % 100; // seconds
    const rest = Math.floor(num / 100); // minutes
    
    if (lastTwo < 60) {
      return rest * 60 + lastTwo;
    } else {
      // If seconds >= 60, treat entire number as seconds
      return num;
    }
  } else {
    // 5+ digits: parse based on length
    const inputStr = input.replace(/[^0-9]/g, '');
    const numDigits = inputStr.length;
    
    if (numDigits === 5) {
      // 5 digits: HMMSS format (e.g., "94500" = 9:45:00)
      // Extract: first digit = hours, next 2 digits = minutes, last 2 digits = seconds
      const lastTwo = num % 100; // seconds (last 2 digits)
      const middleTwo = Math.floor((num % 10000) / 100); // minutes (digits 2-3)
      const firstDigit = Math.floor(num / 10000); // hours (first digit)
      
      if (lastTwo < 60 && middleTwo < 60) {
        return firstDigit * 3600 + middleTwo * 60 + lastTwo;
      } else if (lastTwo < 60) {
        // If minutes invalid, treat as MMSS format
        const mins = Math.floor(num / 100);
        return mins * 60 + lastTwo;
      } else {
        // If seconds invalid, treat entire number as seconds
        return num;
      }
    } else {
      // 6+ digits: HHMMSS format (e.g., "123456" = 12:34:56)
      const lastTwo = num % 100; // seconds
      const middleTwo = Math.floor((num % 10000) / 100); // minutes
      const rest = Math.floor(num / 10000); // hours
      
      if (lastTwo < 60 && middleTwo < 60) {
        return rest * 3600 + middleTwo * 60 + lastTwo;
      } else if (lastTwo < 60) {
        // If only seconds are valid, treat as MMSS format
        const mins = Math.floor(num / 100);
        return mins * 60 + lastTwo;
      } else {
        // If seconds >= 60, treat entire number as seconds
        return num;
      }
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
      weight: exercise.category === 'Lifts' ? convert(s.weight) : s.weight,
      weight2: exercise.category === 'Lifts' && s.weight2 ? convert(s.weight2) : s.weight2
    }))
  };
};

/**
 * Groups items alphabetically by their name property
 * @param items - Array of items with a name property
 * @returns Array of sections with title (letter) and data (items starting with that letter)
 */
export const groupExercisesAlphabetically = <T extends { name: string }>(
  items: T[]
): Array<{ title: string; data: T[] }> => {
  const grouped: Record<string, T[]> = {};
  items.forEach(item => {
    const letter = item.name.charAt(0).toUpperCase();
    if (!grouped[letter]) grouped[letter] = [];
    grouped[letter].push(item);
  });
  return Object.keys(grouped).sort().map(letter => ({ title: letter, data: grouped[letter] }));
};

/**
 * Returns the color scheme for a given group type
 * @param type - The group type ('HIIT' or 'Superset')
 * @returns The corresponding color scheme object
 */
export const getGroupColorScheme = (type: GroupType | null | undefined): typeof defaultSupersetColorScheme => {
  return type === 'HIIT' ? defaultHiitColorScheme : defaultSupersetColorScheme;
};

/**
 * Effective weight for a set: for assisted/negative Machine (Selectorized), use bodyWeight - weightInput; otherwise use weightInput.
 * Used for PR/history/volume calculations.
 */
export const getEffectiveWeight = (
  exercise: Exercise,
  set: Set,
  bodyWeight?: number | null
): number => {
  const inputWeight = parseFloat(set.weight || '0') || 0;
  const isAssistedNegative =
    exercise.assistedNegative === true &&
    exercise.weightEquipTags &&
    exercise.weightEquipTags.includes('Machine (Selectorized)');
  if (isAssistedNegative && bodyWeight != null && bodyWeight > 0) {
    return Math.max(0, bodyWeight - inputWeight);
  }
  return inputWeight;
};
