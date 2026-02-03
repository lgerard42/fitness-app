import { useState, useCallback, useRef } from 'react';
import type { Workout, Exercise, Set } from '@/types/workout';
import { updateExercisesDeep, findExerciseDeep } from '@/utils/workoutHelpers';

interface SetDragItem {
  id: string;
  type: 'set';
  set: Set;
  hasRestTimer: boolean;
}

interface DropSetHeaderItem {
  id: string;
  type: 'dropset_header';
  dropSetId: string;
  setCount: number;
}

interface DropSetFooterItem {
  id: string;
  type: 'dropset_footer';
  dropSetId: string;
}

export type SetDragListItem = SetDragItem | DropSetHeaderItem | DropSetFooterItem;
export type { SetDragItem, DropSetHeaderItem, DropSetFooterItem };

interface UseSetDragAndDropProps {
  currentWorkout: Workout;
  handleWorkoutUpdate: (workout: Workout) => void;
}

interface UseSetDragAndDropReturn {
  isSetDragActive: boolean;
  activeExercise: Exercise | null;
  setDragItems: SetDragListItem[];
  startSetDrag: (exercise: Exercise) => void;
  cancelSetDrag: () => void;
  handleSetDragEnd: (params: { data: SetDragListItem[]; from: number; to: number }) => void;
}

/**
 * Hook for managing set-level drag and drop within a single exercise.
 * Uses a modal-based approach to avoid conflicts with exercise-level drag.
 */
export const useSetDragAndDrop = ({
  currentWorkout,
  handleWorkoutUpdate,
}: UseSetDragAndDropProps): UseSetDragAndDropReturn => {
  const [isSetDragActive, setIsSetDragActive] = useState(false);
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [setDragItems, setSetDragItems] = useState<SetDragItem[]>([]);
  const originalSetsRef = useRef<Set[] | null>(null);
  
  // Use ref to always have access to current workout (avoids stale closure)
  const workoutRef = useRef(currentWorkout);
  workoutRef.current = currentWorkout;

  // Find the active exercise from the workout
  const activeExercise = activeExerciseId 
    ? findExerciseDeep(currentWorkout.exercises, activeExerciseId) 
    : null;

  /**
   * Start set drag mode for a specific exercise
   * @param exercise - The exercise object directly (avoids stale data issues)
   */
  const startSetDrag = useCallback((exercise: Exercise) => {
    if (!exercise) {
      console.warn('[useSetDragAndDrop] Exercise is null/undefined');
      return;
    }

    if (!exercise.sets || exercise.sets.length === 0) {
      console.warn('[useSetDragAndDrop] Exercise has no sets:', exercise.instanceId);
      return;
    }

    // Store original sets for potential cancel
    originalSetsRef.current = [...exercise.sets];

    // Transform sets into drag items with dropset headers/footers
    const items: SetDragListItem[] = [];
    const processedDropSetIds = new Set<string>();
    
    exercise.sets.forEach((set, index) => {
      // Check if this is the start of a new dropset
      const isDropSetStart = set.dropSetId && 
        (index === 0 || exercise.sets[index - 1].dropSetId !== set.dropSetId);
      
      // Check if this is the end of a dropset
      const isDropSetEnd = set.dropSetId && 
        (index === exercise.sets.length - 1 || exercise.sets[index + 1]?.dropSetId !== set.dropSetId);
      
      // Add dropset header if this is the start
      if (isDropSetStart && set.dropSetId && !processedDropSetIds.has(set.dropSetId)) {
        // Count sets in this dropset
        const dropSetSets = exercise.sets.filter(s => s.dropSetId === set.dropSetId);
        items.push({
          id: `dropset-header-${set.dropSetId}`,
          type: 'dropset_header',
          dropSetId: set.dropSetId,
          setCount: dropSetSets.length,
        });
        processedDropSetIds.add(set.dropSetId);
      }
      
      // Add the set itself
      items.push({
        id: set.id,
        type: 'set',
        set,
        hasRestTimer: !!set.restPeriodSeconds,
      });
      
      // Add dropset footer if this is the end
      if (isDropSetEnd && set.dropSetId) {
        items.push({
          id: `dropset-footer-${set.dropSetId}`,
          type: 'dropset_footer',
          dropSetId: set.dropSetId,
        });
      }
    });

    setSetDragItems(items);
    setActiveExerciseId(exercise.instanceId);
    setIsSetDragActive(true);
  }, []);

  /**
   * Cancel set drag and restore original order
   */
  const cancelSetDrag = useCallback(() => {
    setIsSetDragActive(false);
    setActiveExerciseId(null);
    setSetDragItems([]);
    originalSetsRef.current = null;
  }, []);

  /**
   * Handle the end of a set drag operation.
   * Updates dropSetId based on position relative to dropset headers/footers.
   */
  const handleSetDragEnd = useCallback(({ data, from, to }: { 
    data: SetDragListItem[]; 
    from: number; 
    to: number 
  }) => {
    if (!activeExerciseId || from === to) {
      // No change, just close
      cancelSetDrag();
      return;
    }

    // Extract only the sets (filter out headers/footers)
    const reorderedSets: Set[] = [];
    const setItems: SetDragItem[] = [];
    
    data.forEach(item => {
      if (item.type === 'set') {
        setItems.push(item);
        reorderedSets.push(item.set);
      }
    });

    // Determine dropset membership based on position between headers/footers
    const updatedSets = reorderedSets.map((set, setIndex) => {
      // Find the position of this set in the full data array
      let positionInFullArray = -1;
      let setCount = 0;
      for (let i = 0; i < data.length; i++) {
        if (data[i].type === 'set') {
          if (setCount === setIndex) {
            positionInFullArray = i;
            break;
          }
          setCount++;
        }
      }

      if (positionInFullArray === -1) {
        // Fallback: keep original dropSetId
        return { ...set };
      }

      // Look backwards to find the nearest dropset header
      let nearestHeader: DropSetHeaderItem | null = null;
      for (let i = positionInFullArray; i >= 0; i--) {
        if (data[i].type === 'dropset_header') {
          nearestHeader = data[i] as DropSetHeaderItem;
          break;
        }
        if (data[i].type === 'dropset_footer') {
          // Hit a footer before a header, so we're outside a dropset
          break;
        }
      }

      // Look forwards to find the nearest dropset footer
      let nearestFooter: DropSetFooterItem | null = null;
      for (let i = positionInFullArray; i < data.length; i++) {
        if (data[i].type === 'dropset_footer') {
          nearestFooter = data[i] as DropSetFooterItem;
          break;
        }
        if (data[i].type === 'dropset_header') {
          // Hit a header before a footer, so we're outside a dropset
          break;
        }
      }

      // If we're between a matching header and footer, we're in that dropset
      let newDropSetId: string | undefined = undefined;
      if (nearestHeader && nearestFooter && 
          nearestHeader.dropSetId === nearestFooter.dropSetId) {
        newDropSetId = nearestHeader.dropSetId;
      }

      return {
        ...set,
        dropSetId: newDropSetId,
      };
    });

    // Update the workout with reordered sets (use ref for current workout)
    const workout = workoutRef.current;
    handleWorkoutUpdate({
      ...workout,
      exercises: updateExercisesDeep(workout.exercises, activeExerciseId, (ex) => {
        if (ex.type === 'group') return ex;
        return {
          ...ex,
          sets: updatedSets,
        };
      }),
    });

    // Close the drag modal
    cancelSetDrag();
  }, [activeExerciseId, handleWorkoutUpdate, cancelSetDrag]);

  return {
    isSetDragActive,
    activeExercise,
    setDragItems,
    startSetDrag,
    cancelSetDrag,
    handleSetDragEnd,
  };
};
