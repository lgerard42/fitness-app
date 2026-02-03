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
   * Updates dropSetId based on new position.
   */
  const handleSetDragEnd = useCallback(({ data, from, to }: { 
    data: SetDragItem[]; 
    from: number; 
    to: number 
  }) => {
    if (!activeExerciseId || from === to) {
      // No change, just close
      cancelSetDrag();
      return;
    }

    // Extract the reordered sets
    const reorderedSets = data.map(item => item.set);

    // Update dropSetId based on new position
    const updatedSets = reorderedSets.map((set, index) => {
      const prevSet = index > 0 ? reorderedSets[index - 1] : null;
      const nextSet = index < reorderedSets.length - 1 ? reorderedSets[index + 1] : null;

      // Determine if this set should be part of a dropset based on neighbors
      let newDropSetId = set.dropSetId;

      // If the set was moved (it's the one that changed position)
      if (reorderedSets[to]?.id === set.id) {
        // Check if both neighbors have the same dropSetId
        if (prevSet?.dropSetId && nextSet?.dropSetId && prevSet.dropSetId === nextSet.dropSetId) {
          // Dropped between two sets in the same dropset - inherit that ID
          newDropSetId = prevSet.dropSetId;
        } else if (prevSet?.dropSetId && !nextSet?.dropSetId) {
          // Dropped right after a dropset - check if we should join
          // Only join if the previous set is part of a contiguous dropset ending here
          const prevDropSetSets = reorderedSets.filter(s => s.dropSetId === prevSet.dropSetId);
          const lastInDropSet = prevDropSetSets[prevDropSetSets.length - 1];
          if (lastInDropSet?.id === prevSet.id) {
            // We're right after the last set in a dropset - join it
            newDropSetId = prevSet.dropSetId;
          }
        } else if (!prevSet?.dropSetId && nextSet?.dropSetId) {
          // Dropped right before a dropset - check if we should join
          const nextDropSetSets = reorderedSets.filter(s => s.dropSetId === nextSet.dropSetId);
          const firstInDropSet = nextDropSetSets[0];
          if (firstInDropSet?.id === nextSet.id) {
            // We're right before the first set in a dropset - join it
            newDropSetId = nextSet.dropSetId;
          }
        } else if (!prevSet?.dropSetId && !nextSet?.dropSetId) {
          // Neither neighbor is in a dropset - remove from dropset
          newDropSetId = undefined;
        }
        // If only one neighbor has a dropSetId and it doesn't match our logic, keep current
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
