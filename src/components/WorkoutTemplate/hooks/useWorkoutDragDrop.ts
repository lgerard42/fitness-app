import { useState, useCallback, useMemo, useRef } from 'react';
import type { Workout, ExerciseItem, Exercise, ExerciseGroup, FlatExerciseRow, GroupType } from '@/types/workout';
import { flattenExercises, reconstructExercises } from '@/utils/workoutHelpers';

// Drag item types matching DragAndDropModal pattern
interface DragItemBase {
  id: string;
  isCollapsed?: boolean;
  groupId: string | null;
}

interface GroupHeaderDragItem extends DragItemBase {
  type: 'GroupHeader';
  groupType: GroupType;
  childCount: number;
  data: ExerciseGroup;
}

interface GroupFooterDragItem extends DragItemBase {
  type: 'GroupFooter';
  groupType: GroupType;
}

interface ExerciseDragItem extends DragItemBase {
  type: 'Exercise';
  exercise: Exercise;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  setCount: number;
}

export type WorkoutDragItem = GroupHeaderDragItem | GroupFooterDragItem | ExerciseDragItem;

interface UseWorkoutDragDropProps {
  currentWorkout: Workout;
  handleWorkoutUpdate: (workout: Workout) => void;
}

interface UseWorkoutDragDropReturn {
  isDragMode: boolean;
  draggingItemId: string | null;
  dragItems: WorkoutDragItem[];
  handleDragStart: (itemId: string) => void;
  handleDragEnd: (params: { data: WorkoutDragItem[]; from: number; to: number }) => void;
  handleCancelDrag: () => void;
  collapseGroupForDrag: (items: WorkoutDragItem[], groupId: string) => WorkoutDragItem[];
  expandAllGroups: (items: WorkoutDragItem[]) => WorkoutDragItem[];
}

export const useWorkoutDragDrop = ({
  currentWorkout,
  handleWorkoutUpdate,
}: UseWorkoutDragDropProps): UseWorkoutDragDropReturn => {
  const [isDragMode, setIsDragMode] = useState(false);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const originalExercisesRef = useRef<ExerciseItem[] | null>(null);

  // Convert workout exercises to drag items
  const dragItems = useMemo((): WorkoutDragItem[] => {
    const items: WorkoutDragItem[] = [];
    const flatRows = flattenExercises(currentWorkout.exercises);

    let currentGroupId: string | null = null;
    let currentGroupType: GroupType | null = null;
    let exercisesInCurrentGroup: string[] = [];

    flatRows.forEach((row, index) => {
      if (row.type === 'group_header') {
        const group = row.data as ExerciseGroup;
        currentGroupId = row.id;
        currentGroupType = group.groupType;
        exercisesInCurrentGroup = group.children?.map(c => c.instanceId) || [];

        items.push({
          id: `header-${row.id}`,
          type: 'GroupHeader',
          groupId: row.id,
          groupType: group.groupType,
          childCount: group.children?.length || 0,
          data: group,
        });
      } else if (row.type === 'exercise') {
        const exercise = row.data as Exercise;
        const isInGroup = row.depth === 1;
        const groupId = isInGroup ? row.groupId : null;

        // Determine first/last in group
        let isFirstInGroup = false;
        let isLastInGroup = false;

        if (isInGroup && groupId) {
          const groupExercises = exercisesInCurrentGroup;
          const positionInGroup = groupExercises.indexOf(exercise.instanceId);
          isFirstInGroup = positionInGroup === 0;
          isLastInGroup = positionInGroup === groupExercises.length - 1;

          // If this is the last exercise in the group, we'll add a footer after
          if (isLastInGroup) {
            items.push({
              id: row.id,
              type: 'Exercise',
              groupId,
              exercise,
              isFirstInGroup,
              isLastInGroup,
              setCount: exercise.sets?.length || 0,
            });

            items.push({
              id: `footer-${groupId}`,
              type: 'GroupFooter',
              groupId,
              groupType: currentGroupType!,
            });

            // Reset group tracking
            currentGroupId = null;
            currentGroupType = null;
            exercisesInCurrentGroup = [];
            return;
          }
        }

        items.push({
          id: row.id,
          type: 'Exercise',
          groupId,
          exercise,
          isFirstInGroup,
          isLastInGroup,
          setCount: exercise.sets?.length || 0,
        });
      }
    });

    return items;
  }, [currentWorkout.exercises]);

  const handleDragStart = useCallback((itemId: string) => {
    if (!isDragMode) {
      originalExercisesRef.current = currentWorkout.exercises;
      setIsDragMode(true);
    }
    setDraggingItemId(itemId);
  }, [isDragMode, currentWorkout.exercises]);

  const handleCancelDrag = useCallback(() => {
    if (originalExercisesRef.current) {
      handleWorkoutUpdate({ ...currentWorkout, exercises: originalExercisesRef.current });
    }
    setIsDragMode(false);
    setDraggingItemId(null);
    originalExercisesRef.current = null;
  }, [currentWorkout, handleWorkoutUpdate]);

  const collapseGroupForDrag = useCallback((items: WorkoutDragItem[], groupId: string): WorkoutDragItem[] => {
    return items.map(item => {
      if (item.groupId === groupId) {
        return { ...item, isCollapsed: true };
      }
      return item;
    });
  }, []);

  const expandAllGroups = useCallback((items: WorkoutDragItem[]): WorkoutDragItem[] => {
    return items.map(item => {
      if (item.isCollapsed) {
        const { isCollapsed, ...rest } = item;
        return rest as WorkoutDragItem;
      }
      return item;
    });
  }, []);

  const handleDragEnd = useCallback(({ data, from, to }: { data: WorkoutDragItem[]; from: number; to: number }) => {
    if (from === to) {
      setIsDragMode(false);
      setDraggingItemId(null);
      originalExercisesRef.current = null;
      return;
    }

    // Expand any collapsed items
    const expandedData = expandAllGroups(data);

    // Convert drag items back to flat rows, then reconstruct exercises
    const newFlatRows: FlatExerciseRow[] = [];
    let currentGroupId: string | null = null;

    expandedData.forEach((item) => {
      if (item.type === 'GroupHeader') {
        currentGroupId = item.groupId;
        newFlatRows.push({
          type: 'group_header',
          id: item.groupId!,
          data: item.data,
          depth: 0,
          groupId: null,
        });
      } else if (item.type === 'Exercise') {
        // Determine depth based on whether item is between a header and footer
        let depth = 0;
        let exerciseGroupId: string | null = null;

        // Find the item's position and check what's before it
        const itemIndex = expandedData.indexOf(item);

        // Look backwards for a group header (that hasn't been closed by a footer)
        let foundGroupId: string | null = null;
        for (let i = itemIndex - 1; i >= 0; i--) {
          const prevItem = expandedData[i];
          if (prevItem.type === 'GroupFooter') {
            // Found a footer before finding a header - not in a group
            break;
          }
          if (prevItem.type === 'GroupHeader') {
            foundGroupId = prevItem.groupId;
            break;
          }
        }

        // Check if there's a corresponding footer after this item
        if (foundGroupId) {
          for (let i = itemIndex + 1; i < expandedData.length; i++) {
            const nextItem = expandedData[i];
            if (nextItem.type === 'GroupHeader') {
              // Found another header - not in the previous group
              foundGroupId = null;
              break;
            }
            if (nextItem.type === 'GroupFooter' && nextItem.groupId === foundGroupId) {
              // Found the matching footer - we ARE in this group
              depth = 1;
              exerciseGroupId = foundGroupId;
              break;
            }
          }
        }

        newFlatRows.push({
          type: 'exercise',
          id: item.id,
          data: item.exercise,
          depth,
          groupId: exerciseGroupId,
        });
      }
      // Skip GroupFooter items - they're just visual markers
    });

    const newExercises = reconstructExercises(newFlatRows);
    handleWorkoutUpdate({ ...currentWorkout, exercises: newExercises });

    setIsDragMode(false);
    setDraggingItemId(null);
    originalExercisesRef.current = null;
  }, [currentWorkout, handleWorkoutUpdate, expandAllGroups]);

  return {
    isDragMode,
    draggingItemId,
    dragItems,
    handleDragStart,
    handleDragEnd,
    handleCancelDrag,
    collapseGroupForDrag,
    expandAllGroups,
  };
};
