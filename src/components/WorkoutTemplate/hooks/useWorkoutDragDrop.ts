import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { Workout, ExerciseItem, Exercise, ExerciseGroup, FlatExerciseRow, GroupType } from '@/types/workout';
import { flattenExercises, reconstructExercises } from '@/utils/workoutHelpers';
import DraggableFlatList from 'react-native-draggable-flatlist';

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
export type { ExerciseDragItem };

interface UseWorkoutDragDropProps {
  currentWorkout: Workout;
  handleWorkoutUpdate: (workout: Workout) => void;
}

interface UseWorkoutDragDropReturn {
  isDragging: boolean;
  dragItems: WorkoutDragItem[];
  collapsedGroupId: string | null;
  pendingDragCallback: React.MutableRefObject<(() => void) | null>;
  pendingDragItemId: React.MutableRefObject<string | null>;
  listRef: React.RefObject<React.ComponentRef<typeof DraggableFlatList<WorkoutDragItem>>>;
  itemHeights: React.MutableRefObject<Map<string, number>>;
  collapsedItemHeights: React.MutableRefObject<Map<string, number>>;
  preCollapsePaddingTop: number | null;
  recordTouchPosition: (itemId: string, pageY: number) => void;
  setListLayoutY: (y: number) => void;
  initiateGroupDrag: (groupId: string, dragCallback: () => void) => void;
  handlePrepareDrag: (dragCallback: () => void, itemId: string) => void;
  handleDragBegin: () => void;
  handleDragEnd: (params: { data: WorkoutDragItem[]; from: number; to: number }) => void;
  alignAfterCollapse: (itemId: string, items: WorkoutDragItem[]) => void;
}

export const useWorkoutDragDrop = ({
  currentWorkout,
  handleWorkoutUpdate,
}: UseWorkoutDragDropProps): UseWorkoutDragDropReturn => {
  const [isDragging, setIsDragging] = useState(false);
  const [collapsedGroupId, setCollapsedGroupId] = useState<string | null>(null);
  const [reorderedDragItems, setReorderedDragItems] = useState<WorkoutDragItem[]>([]);
  const [preCollapsePaddingTop, setPreCollapsePaddingTop] = useState<number | null>(null);
  const originalExercisesRef = useRef<ExerciseItem[] | null>(null);
  const pendingDragCallback = useRef<(() => void) | null>(null);
  const pendingDragItemId = useRef<string | null>(null);
  const listRef = useRef<React.ComponentRef<typeof DraggableFlatList<WorkoutDragItem>>>(null);
  const itemHeights = useRef<Map<string, number>>(new Map());
  const collapsedItemHeights = useRef<Map<string, number>>(new Map());
  const touchYRef = useRef<number | null>(null);
  const touchItemIdRef = useRef<string | null>(null);
  const listLayoutYRef = useRef<number | null>(null);
  const isProcessingDragEndRef = useRef<boolean>(false);
  const originalHeaderIndexRef = useRef<number | null>(null);

  // Helper to collapse a group
  const collapseGroup = useCallback((items: WorkoutDragItem[], groupId: string): WorkoutDragItem[] => {
    return items.map(item => {
      if (item.type === 'Exercise' && item.groupId === groupId) {
        return { ...item, isCollapsed: true };
      }
      if (item.type === 'GroupHeader' && item.groupId === groupId) {
        return { ...item, isCollapsed: true };
      }
      if (item.type === 'GroupFooter' && item.groupId === groupId) {
        return { ...item, isCollapsed: true };
      }
      return item;
    });
  }, []);

  // Helper to collapse all other groups
  const collapseAllOtherGroups = useCallback((items: WorkoutDragItem[], draggedGroupId: string): WorkoutDragItem[] => {
    const otherGroupIds = new Set<string>();
    items.forEach(item => {
      if (item.groupId && item.groupId !== draggedGroupId) {
        otherGroupIds.add(item.groupId);
      }
    });

    return items.map(item => {
      if (item.groupId && otherGroupIds.has(item.groupId)) {
        if (item.type === 'GroupHeader' || item.type === 'Exercise' || item.type === 'GroupFooter') {
          return { ...item, isCollapsed: true };
        }
      }
      return item;
    });
  }, []);

  // Helper to expand all groups - matches DragAndDropModal pattern
  const expandAllGroups = useCallback((items: WorkoutDragItem[]): WorkoutDragItem[] => {
    const collapsedGroupIds = new Set<string>();
    items.forEach(item => {
      if (item.isCollapsed && item.groupId) {
        collapsedGroupIds.add(item.groupId);
      }
    });

    if (collapsedGroupIds.size === 0) {
      return items.map(item => {
        if (item.isCollapsed) {
          const { isCollapsed, ...rest } = item;
          return rest as WorkoutDragItem;
        }
        return item;
      });
    }

    let result = [...items];

    collapsedGroupIds.forEach(groupId => {
      const headerIndex = result.findIndex(item =>
        item.type === 'GroupHeader' && item.groupId === groupId
      );

      if (headerIndex === -1) {
        result = result.map(item => {
          if (item.groupId === groupId && item.isCollapsed) {
            const { isCollapsed, ...rest } = item;
            return rest as WorkoutDragItem;
          }
          return item;
        });
        return;
      }

      const groupItems: WorkoutDragItem[] = [];
      result.forEach(item => {
        if (item.groupId === groupId && (item.type === 'Exercise' || item.type === 'GroupFooter')) {
          if (item.isCollapsed) {
            const { isCollapsed, ...rest } = item;
            groupItems.push(rest as WorkoutDragItem);
          } else {
            groupItems.push(item);
          }
        }
      });

      // Sort group items: exercises first (maintain their order in the data array), footer last
      groupItems.sort((a, b) => {
        if (a.type === 'GroupFooter') return 1;
        if (b.type === 'GroupFooter') return -1;
        // For exercises, maintain order by checking their position in the current result array
        const aIndex = result.findIndex(item => item.id === a.id);
        const bIndex = result.findIndex(item => item.id === b.id);
        return aIndex - bIndex;
      });

      const newResult: WorkoutDragItem[] = [];

      // Add items before the header
      for (let i = 0; i < headerIndex; i++) {
        if (result[i].groupId !== groupId || result[i].type === 'GroupHeader') {
          newResult.push(result[i]);
        }
      }

      // Add the header (remove isCollapsed flag)
      const header = result[headerIndex];
      if (header.type === 'GroupHeader') {
        const { isCollapsed, ...headerRest } = header;
        newResult.push(headerRest);
      }

      // Add the group items (exercises and footer)
      newResult.push(...groupItems);

      // Add items after the header
      for (let i = headerIndex + 1; i < result.length; i++) {
        if (result[i].groupId !== groupId || result[i].type === 'GroupHeader') {
          newResult.push(result[i]);
        }
      }

      result = newResult;
    });

    return result.map(item => {
      if (item.isCollapsed) {
        const { isCollapsed, ...rest } = item;
        return rest as WorkoutDragItem;
      }
      return item;
    });
  }, []);

  // Convert workout exercises to drag items (base items, no collapse applied)
  const baseDragItems = useMemo((): WorkoutDragItem[] => {
    console.log('[DRAG DEBUG] baseDragItems useMemo RECALCULATING', {
      currentWorkoutExercisesCount: currentWorkout.exercises.length,
      stackTrace: new Error().stack?.split('\n').slice(1, 4).join('\n'),
    });
    const items: WorkoutDragItem[] = [];
    const flatRows = flattenExercises(currentWorkout.exercises);

    let currentGroupId: string | null = null;
    let currentGroupType: GroupType | null = null;
    let exercisesInCurrentGroup: string[] = [];

    flatRows.forEach((row) => {
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

    console.log('[DRAG DEBUG] baseDragItems useMemo COMPLETED', {
      itemsCount: items.length,
      headers: items.filter(i => i.type === 'GroupHeader').map(i => ({ id: i.id, groupId: i.groupId })),
    });
    return items;
  }, [currentWorkout.exercises]);

  // Use reorderedDragItems if available (for collapsed state), otherwise use baseDragItems
  const dragItems = reorderedDragItems.length > 0 ? reorderedDragItems : baseDragItems;

  // Debug: Log when dragItems computation changes
  useEffect(() => {
    if (isDragging || collapsedGroupId) {
      console.log('[DRAG DEBUG] dragItems computation changed', {
        usingReordered: reorderedDragItems.length > 0,
        reorderedCount: reorderedDragItems.length,
        baseCount: baseDragItems.length,
        resultCount: dragItems.length,
        isDragging,
        collapsedGroupId,
      });
    }
  }, [reorderedDragItems.length, baseDragItems.length, dragItems.length, isDragging, collapsedGroupId]);

  // Reset reorderedDragItems when workout changes (unless we're actively dragging)
  useEffect(() => {
    if (!isDragging && reorderedDragItems.length > 0) {
      console.log('[DRAG DEBUG] useEffect clearing reorderedDragItems', {
        isDragging,
        reorderedDragItemsCount: reorderedDragItems.length,
        currentWorkoutExercisesCount: currentWorkout.exercises.length,
        stackTrace: new Error().stack?.split('\n').slice(1, 4).join('\n'),
      });
      setReorderedDragItems([]);
    }
  }, [currentWorkout.exercises, isDragging, reorderedDragItems.length]);

  // Initiate group drag - matches DragAndDropModal pattern
  const initiateGroupDrag = useCallback((groupId: string, dragCallback: () => void) => {
    // Prevent initiating drag if we're still processing a drag end
    if (isProcessingDragEndRef.current) {
      console.log('[DRAG DEBUG] initiateGroupDrag BLOCKED - still processing drag end');
      return;
    }

    console.log('[DRAG DEBUG] initiateGroupDrag called', {
      groupId,
      baseDragItemsCount: baseDragItems.length,
      currentWorkoutExercisesCount: currentWorkout.exercises.length,
      hasOriginalExercises: !!originalExercisesRef.current,
      isProcessingDragEnd: isProcessingDragEndRef.current,
    });

    // Save original state
    if (!originalExercisesRef.current) {
      originalExercisesRef.current = currentWorkout.exercises;
      console.log('[DRAG DEBUG] Saved originalExercisesRef', {
        exercisesCount: originalExercisesRef.current.length,
        firstExerciseId: originalExercisesRef.current[0]?.instanceId,
      });
    }

    // Find the group header item ID
    const groupHeaderItem = baseDragItems.find(
      item => item.type === 'GroupHeader' && item.groupId === groupId
    );
    if (!groupHeaderItem) {
      console.log('[DRAG DEBUG] Group header not found in baseDragItems');
      // Fallback if header not found
      setCollapsedGroupId(groupId);
      setIsDragging(true);
      pendingDragCallback.current = dragCallback;
      return;
    }

    console.log('[DRAG DEBUG] Found group header item', {
      headerId: groupHeaderItem.id,
      groupType: groupHeaderItem.groupType,
    });

    // Collapse the dragged group and freeze all other groups
    // This prevents dropping one group into another group
    let collapsed = collapseGroup(baseDragItems, groupId);
    collapsed = collapseAllOtherGroups(collapsed, groupId);

    console.log('[DRAG DEBUG] After collapse', {
      collapsedItemsCount: collapsed.length,
      collapsedGroupHeaders: collapsed.filter(i => i.type === 'GroupHeader').map(i => ({ id: i.id, groupId: i.groupId })),
      collapsedExercises: collapsed.filter(i => i.type === 'Exercise').length,
    });

    // Find the header index in the collapsed array
    const headerIndexInCollapsed = collapsed.findIndex(
      item => item.type === 'GroupHeader' && item.groupId === groupId
    );

    setReorderedDragItems(collapsed);
    setCollapsedGroupId(groupId);
    setIsDragging(true); // Set dragging state so UI shows collapsed items
    pendingDragCallback.current = dragCallback;
    // Store the header item ID for alignment after layout settles
    pendingDragItemId.current = groupHeaderItem.id;
    // Store the original header index in the collapsed structure
    originalHeaderIndexRef.current = headerIndexInCollapsed;

    console.log('[DRAG DEBUG] State set', {
      collapsedGroupId: groupId,
      isDragging: true,
      reorderedDragItemsCount: collapsed.length,
      pendingDragItemId: pendingDragItemId.current,
      originalHeaderIndex: originalHeaderIndexRef.current,
    });
  }, [baseDragItems, collapseGroup, collapseAllOtherGroups, currentWorkout.exercises]);

  const recordTouchPosition = useCallback((itemId: string, pageY: number) => {
    touchItemIdRef.current = itemId;
    touchYRef.current = pageY;
  }, []);

  const setListLayoutY = useCallback((y: number) => {
    listLayoutYRef.current = y;
  }, []);

  const getCollapsedHeight = useCallback((item: WorkoutDragItem) => {
    const measured = collapsedItemHeights.current.get(item.id);
    if (measured !== undefined) return measured;
    if (item.type === 'Exercise') return 70;
    if (item.type === 'GroupHeader') return 55;
    return 0; // footer
  }, []);

  const getCollapsedTop = useCallback((itemId: string, items: WorkoutDragItem[]) => {
    let top = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.id === itemId) break;
      top += getCollapsedHeight(it);
    }
    return top;
  }, [getCollapsedHeight]);

  const alignAfterCollapse = useCallback((itemId: string, items: WorkoutDragItem[]) => {
    if (!listRef.current || touchYRef.current === null || listLayoutYRef.current === null) return;
    const touchRel = touchYRef.current - listLayoutYRef.current;
    const collapsedTop = getCollapsedTop(itemId, items);
    let scrollOffset = collapsedTop - touchRel;
    let paddingTop = 0;
    if (scrollOffset < 0) {
      paddingTop = -scrollOffset;
      scrollOffset = 0;
    }
    setPreCollapsePaddingTop(paddingTop);
    listRef.current.scrollToOffset?.({ offset: scrollOffset, animated: false });
  }, [getCollapsedTop]);

  // Calculate padding needed to prevent item shift when collapsing (kept for fallback usage)
  const calculatePaddingTop = useCallback((itemId: string, items: WorkoutDragItem[]): number => {
    const itemIndex = items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return 0;

    let totalHeightBefore = 0;
    let totalHeightAfter = 0;

    // Sum heights of all items before the dragged item
    for (let i = 0; i < itemIndex; i++) {
      const item = items[i];
      const height = itemHeights.current.get(item.id) || 0;
      totalHeightBefore += height;

      // Use measured collapsed height if available, otherwise fall back to approximations
      const collapsedMeasured = collapsedItemHeights.current.get(item.id);
      let collapsedHeight = collapsedMeasured ?? 0;
      if (collapsedMeasured === undefined) {
        if (item.type === 'Exercise') {
          collapsedHeight = 70;
        } else if (item.type === 'GroupHeader') {
          collapsedHeight = 55;
        } else if (item.type === 'GroupFooter') {
          collapsedHeight = 0;
        }
      }
      totalHeightAfter += collapsedHeight;
    }

    // Include the dragged item itself (it also collapses)
    const dragged = items[itemIndex];
    const draggedHeight = itemHeights.current.get(dragged.id) || 0;
    const draggedCollapsedMeasured = collapsedItemHeights.current.get(dragged.id);
    let draggedCollapsed = draggedCollapsedMeasured ?? 0;
    if (draggedCollapsedMeasured === undefined) {
      if (dragged.type === 'Exercise') {
        draggedCollapsed = 70;
      } else if (dragged.type === 'GroupHeader') {
        draggedCollapsed = 55;
      } else if (dragged.type === 'GroupFooter') {
        draggedCollapsed = 0;
      }
    }

    totalHeightBefore += draggedHeight;
    totalHeightAfter += draggedCollapsed;

    return Math.max(0, totalHeightBefore - totalHeightAfter);
  }, []);

  // Phase 1: Collapse all items, then schedule the drag (for regular exercises)
  const handlePrepareDrag = useCallback((dragCallback: () => void, itemId: string) => {
    if (isDragging) {
      // Already dragging, just call directly
      dragCallback();
      return;
    }

    // Save original state
    originalExercisesRef.current = currentWorkout.exercises;

    // Regular exercise drag - collapse all items (not a group header)
    setCollapsedGroupId(null);
    setReorderedDragItems([]); // Reset to use baseDragItems

    // Store the item being dragged so we can scroll to it
    pendingDragItemId.current = itemId;

    // Set dragging to collapse all items
    setIsDragging(true);

    // Store the drag callback to be executed after layout settles
    pendingDragCallback.current = dragCallback;

    // Align after collapse to keep item at touch position
    setTimeout(() => {
      requestAnimationFrame(() => {
        alignAfterCollapse(itemId, baseDragItems);
      });
    }, 30);
  }, [isDragging, currentWorkout.exercises, baseDragItems, alignAfterCollapse]);

  // Called when drag actually begins (from DraggableFlatList onDragBegin)
  const handleDragBegin = useCallback(() => {
    console.log('[DRAG DEBUG] handleDragBegin called', {
      isDragging,
      stackTrace: new Error().stack?.split('\n').slice(1, 4).join('\n'),
    });
    // This is called by DraggableFlatList when drag actually starts
    // At this point, items should already be collapsed
    if (!isDragging) {
      originalExercisesRef.current = currentWorkout.exercises;
      setIsDragging(true);
    }
  }, [isDragging, currentWorkout.exercises]);

  const handleDragEnd = useCallback(({ data, from, to }: { data: WorkoutDragItem[]; from: number; to: number }) => {
    console.log('[DRAG DEBUG] handleDragEnd called', {
      from,
      to,
      fromEqualsTo: from === to,
      dataLength: data.length,
      collapsedGroupId,
      isDragging,
      reorderedDragItemsCount: reorderedDragItems.length,
      currentWorkoutExercisesCount: currentWorkout.exercises.length,
      hasOriginalExercises: !!originalExercisesRef.current,
      isProcessingDragEnd: isProcessingDragEndRef.current,
    });

    // Prevent re-entry if already processing
    if (isProcessingDragEndRef.current) {
      console.log('[DRAG DEBUG] Already processing drag end, ignoring');
      return;
    }

    isProcessingDragEndRef.current = true;
    pendingDragCallback.current = null;

    // 1. CAPTURE the item identity BEFORE doing anything else
    // Use a local constant so it doesn't matter if the ref changes later
    const draggedItem = data[to];
    const currentDragId = pendingDragItemId.current;
    const originalHeaderIndex = originalHeaderIndexRef.current;
    const fromEqualsTo = from === to;

    // Check if the dragged item is the original header by ID
    const isOriginalHeader = draggedItem?.id === currentDragId;

    // Check if 'from' matches the original header index (even if 'to' is different)
    const fromMatchesOriginalIndex = originalHeaderIndex !== null && originalHeaderIndex !== -1
      ? from === originalHeaderIndex
      : false;

    // LOG THIS specifically to debug
    console.log('[DRAG DEBUG] Identity Check:', {
      draggedItemId: draggedItem?.id,
      savedId: currentDragId,
      isMatch: isOriginalHeader,
      from,
      to,
      originalHeaderIndex,
      fromMatchesOriginalIndex,
    });

    // 2. THE CORRECTED SAFETY CHECK
    // Even if from (2) !== to (5), if it's the same physical item, it's a "No-op"
    const isSamePosition = fromEqualsTo ||
      (collapsedGroupId && isOriginalHeader);

    console.log('[DRAG DEBUG] Position check', {
      from,
      to,
      originalHeaderIndex,
      fromEqualsTo,
      fromMatchesOriginalIndex,
      draggedItemId: draggedItem?.id,
      savedId: currentDragId,
      isOriginalHeader,
      itemAtFromType: data[from]?.type,
      itemAtFromGroupId: data[from]?.groupId,
      itemAtToType: data[to]?.type,
      itemAtToGroupId: data[to]?.groupId,
      collapsedGroupId,
      isSamePosition,
    });

    if (isSamePosition) {
      console.log('[DRAG DEBUG] Same position detected - Aborting Reconstruction');
      console.log('[DRAG DEBUG] Before clear - dragItems source:', {
        usingReordered: reorderedDragItems.length > 0,
        reorderedCount: reorderedDragItems.length,
        baseCount: baseDragItems.length,
        baseDragItemsHeaders: baseDragItems.filter(i => i.type === 'GroupHeader').map(i => ({ id: i.id, groupId: i.groupId })),
      });

      // FIX: Delay the state reset to allow FlatList's drop animation to complete
      // Double requestAnimationFrame ensures we wait for the next paint cycle (~16-33ms on 60fps)
      // This is the minimum delay needed while still allowing the animation to finish
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsDragging(false);
          setCollapsedGroupId(null);
          setReorderedDragItems([]);
          setPreCollapsePaddingTop(null);
          collapsedItemHeights.current.clear();
          itemHeights.current.clear();
          touchYRef.current = null;
          touchItemIdRef.current = null;
          originalExercisesRef.current = null;
          originalHeaderIndexRef.current = null;
          // ONLY clear the ref here (early return)
          pendingDragItemId.current = null;

          console.log('[DRAG DEBUG] After clear - state should switch to baseDragItems', {
            isDragging: false,
            collapsedGroupId: null,
            reorderedDragItemsCount: 0,
            baseDragItemsCount: baseDragItems.length,
            currentWorkoutExercisesCount: currentWorkout.exercises.length,
          });
          console.log('[DRAG DEBUG] handleDragEnd RETURNING - no further processing should happen');

          // Reset processing flag immediately after state change (no additional delay needed)
          isProcessingDragEndRef.current = false;
          console.log('[DRAG DEBUG] Reset isProcessingDragEndRef flag');
        });
      });

      return;
    }

    console.log('[DRAG DEBUG] from !== to, proceeding with normal drag end processing');

    console.log('[DRAG DEBUG] Processing drag end - expanding groups and reconstructing');

    // Expand groups if a group was being dragged (matches DragAndDropModal pattern)
    let expandedData = data;
    if (collapsedGroupId) {
      console.log('[DRAG DEBUG] Expanding collapsed groups');
      expandedData = expandAllGroups(data);
      setCollapsedGroupId(null);
    }
    setReorderedDragItems([]);

    console.log('[DRAG DEBUG] Converting drag items back to exercises');
    // Convert drag items back to flat rows, then reconstruct exercises
    const newFlatRows: FlatExerciseRow[] = [];

    expandedData.forEach((item, itemIndex) => {
      if (item.type === 'GroupHeader') {
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

        // Look backwards for a group header (that hasn't been closed by a footer)
        let foundGroupId: string | null = null;
        for (let i = itemIndex - 1; i >= 0; i--) {
          const prevItem = expandedData[i];
          if (prevItem.type === 'GroupFooter') {
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
              foundGroupId = null;
              break;
            }
            if (nextItem.type === 'GroupFooter' && nextItem.groupId === foundGroupId) {
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
    console.log('[DRAG DEBUG] Calling handleWorkoutUpdate with new exercises', {
      newExercisesCount: newExercises.length,
      oldExercisesCount: currentWorkout.exercises.length,
    });
    handleWorkoutUpdate({ ...currentWorkout, exercises: newExercises });

    console.log('[DRAG DEBUG] Clearing drag state after workout update');
    setIsDragging(false);
    setPreCollapsePaddingTop(null);
    collapsedItemHeights.current.clear();
    itemHeights.current.clear();
    touchYRef.current = null;
    touchItemIdRef.current = null;
    originalExercisesRef.current = null;
    originalHeaderIndexRef.current = null;
    // 3. FINALLY clear the ref at the very end of the function
    pendingDragItemId.current = null;
    isProcessingDragEndRef.current = false;
    console.log('[DRAG DEBUG] handleDragEnd completed (from !== to path)');
  }, [currentWorkout, handleWorkoutUpdate, collapsedGroupId, expandAllGroups]);

  return {
    isDragging,
    dragItems,
    collapsedGroupId,
    pendingDragCallback,
    pendingDragItemId,
    listRef,
    itemHeights,
    collapsedItemHeights,
    preCollapsePaddingTop,
    recordTouchPosition,
    setListLayoutY,
    initiateGroupDrag,
    handlePrepareDrag,
    handleDragBegin,
    handleDragEnd,
    alignAfterCollapse,
  };
};
