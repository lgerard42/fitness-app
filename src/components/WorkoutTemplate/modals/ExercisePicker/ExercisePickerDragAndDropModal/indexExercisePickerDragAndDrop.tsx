import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { MoreVertical, Check, Plus, Minus, TrendingDown, Flame, Zap, Users, Copy, Trash2, Layers, Timer } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { defaultSupersetColorScheme, defaultHiitColorScheme, defaultPopupStyles } from '@/constants/defaultStyles';
import SwipeToDelete from '@/components/common/SwipeToDelete';
import type { ExerciseLibraryItem, GroupType, Exercise, Set } from '@/types/workout';
import SetDragModal from '../../SetRowDragAndDropModal/indexSetRowDragAndDrop';
import type { SetDragListItem } from '@/components/WorkoutTemplate/hooks/useSetDragAndDrop';
import type { SetGroup } from '@/utils/workoutInstanceHelpers';
import {
  collapseGroup,
  collapseAllOtherGroups,
  expandAllGroups,
  createHandleDragEnd,
  createInitiateGroupDrag,
  keyExtractor as dragKeyExtractor,
  type DragItem,
  type GroupHeaderItem,
  type GroupFooterItem,
  type ExerciseItem,
} from './exercisePickerDragAndDrop';

interface ExerciseGroup {
  id: string;
  type: GroupType;
  number: number;
  exerciseIndices: number[];
}

interface GroupedExercise {
  id: string;
  exercise: ExerciseLibraryItem;
  count: number;
  startIndex: number;
  orderIndices: number[];
}

interface GroupExerciseData {
  exercise: ExerciseLibraryItem;
  orderIndex: number;
  count: number;
}

interface DragAndDropModalProps {
  visible: boolean;
  onClose: () => void;
  selectedOrder: string[];
  exerciseGroups: ExerciseGroup[];
  groupedExercises: GroupedExercise[];
  filtered: ExerciseLibraryItem[];
  getExerciseGroup: ((index: number) => ExerciseGroup | null) | null;
  onReorder: (newOrder: string[], updatedGroups: ExerciseGroup[], dropsetExerciseIds?: string[], exerciseSetGroups?: Record<string, SetGroup[]>, itemIdToOrderIndices?: Record<string, number[]>, itemSetGroupsMap?: Record<string, SetGroup[]>) => void;
  exerciseSetGroups?: Record<string, SetGroup[]>; // Preserved setGroups from previous save
  itemIdToOrderIndices?: Record<string, number[]>; // Map of item.id to order indices (preserves separate cards)
  itemSetGroupsMap?: Record<string, SetGroup[]>; // Map of item.id to setGroups (preserves separate cards)
}

interface ItemGroupContext {
  currentGroupId: string | null;
  groupType: GroupType | null;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
}

const DragAndDropModal: React.FC<DragAndDropModalProps> = ({
  visible,
  onClose,
  selectedOrder,
  exerciseGroups,
  groupedExercises,
  filtered,
  getExerciseGroup,
  onReorder,
  exerciseSetGroups,
  itemIdToOrderIndices,
  itemSetGroupsMap,
}) => {
  const [dropsetExercises, setDropsetExercises] = useState<globalThis.Set<string>>(new globalThis.Set());

  const dragItems = useMemo((): DragItem[] => {
    const items: DragItem[] = [];
    const processedIndices = new Set<number>();

    // If we have item structure maps, use them to preserve separate cards
    if (itemIdToOrderIndices && itemSetGroupsMap && Object.keys(itemIdToOrderIndices).length > 0) {
      // Create items based on saved structure
      const itemIds = Object.keys(itemIdToOrderIndices).sort((a, b) => {
        const indicesA = itemIdToOrderIndices[a];
        const indicesB = itemIdToOrderIndices[b];
        return (indicesA[0] || 0) - (indicesB[0] || 0);
      });

      itemIds.forEach((itemId) => {
        const orderIndices = itemIdToOrderIndices[itemId];
        if (orderIndices.length === 0) return;

        const firstOrderIndex = orderIndices[0];
        const exerciseId = selectedOrder[firstOrderIndex];
        const exercise = filtered.find(ex => ex.id === exerciseId);
        if (!exercise) return;

        const exerciseGroup = getExerciseGroup ? getExerciseGroup(firstOrderIndex) : null;
        const setGroups = itemSetGroupsMap[itemId] || [];

        if (setGroups.length === 0) return;

        // Determine group context
        if (exerciseGroup) {
          const firstIndexInGroup = exerciseGroup.exerciseIndices[0];
          const lastIndexInGroup = exerciseGroup.exerciseIndices[exerciseGroup.exerciseIndices.length - 1];

          // Add header if this is the first item in the group
          if (firstOrderIndex === firstIndexInGroup) {
            // Check if header already exists
            const headerExists = items.some(item =>
              item.type === 'GroupHeader' && item.groupId === exerciseGroup.id
            );
            if (!headerExists) {
              const groupExercisesData: GroupExerciseData[] = [];
              // Collect exercises in this group from item structure
              exerciseGroup.exerciseIndices.forEach(idx => {
                const itemIdForIdx = Object.keys(itemIdToOrderIndices).find(id =>
                  itemIdToOrderIndices[id].includes(idx)
                );
                if (itemIdForIdx && itemSetGroupsMap[itemIdForIdx]) {
                  const exId = selectedOrder[idx];
                  const ex = filtered.find(e => e.id === exId);
                  if (ex) {
                    const totalCount = itemSetGroupsMap[itemIdForIdx].reduce((sum, sg) => sum + sg.count, 0);
                    groupExercisesData.push({
                      exercise: ex,
                      orderIndex: idx,
                      count: totalCount,
                    });
                  }
                }
              });

              items.push({
                id: `header-${exerciseGroup.id}`,
                type: 'GroupHeader',
                group: exerciseGroup,
                groupId: exerciseGroup.id,
                groupExercises: groupExercisesData,
              });
            }
          }

          // Determine if first/last in group
          const isFirstInGroup = firstOrderIndex === firstIndexInGroup;
          const isLastInGroup = orderIndices.some(idx => idx === lastIndexInGroup);

          const totalCount = setGroups.reduce((sum, sg) => sum + sg.count, 0);
          const hasAnyDropset = setGroups.some(sg => sg.isDropset);

          items.push({
            id: itemId,
            type: 'Item',
            exercise: exercise,
            orderIndex: firstOrderIndex,
            count: totalCount,
            setGroups: setGroups.map(sg => ({ ...sg })), // Deep copy to preserve all properties
            groupId: exerciseGroup.id,
            isFirstInGroup: isFirstInGroup,
            isLastInGroup: isLastInGroup,
            isDropset: hasAnyDropset,
          });

          // Add footer if this is the last item in the group
          if (isLastInGroup) {
            const footerExists = items.some(item =>
              item.type === 'GroupFooter' && item.groupId === exerciseGroup.id
            );
            if (!footerExists) {
              items.push({
                id: `footer-${exerciseGroup.id}`,
                type: 'GroupFooter',
                group: exerciseGroup,
                groupId: exerciseGroup.id,
              });
            }
          }
        } else {
          // Standalone exercise
          const totalCount = setGroups.reduce((sum, sg) => sum + sg.count, 0);
          const hasAnyDropset = setGroups.some(sg => sg.isDropset);

          items.push({
            id: itemId,
            type: 'Item',
            exercise: exercise,
            orderIndex: firstOrderIndex,
            count: totalCount,
            setGroups: setGroups.map(sg => ({ ...sg })), // Deep copy to preserve all properties
            groupId: null,
            isFirstInGroup: false,
            isLastInGroup: false,
            isDropset: hasAnyDropset,
          });
        }

        // Mark all indices as processed
        orderIndices.forEach(idx => processedIndices.add(idx));
      });
    }

    // Process remaining items that don't have itemIds (new exercises from list view)
    // This fallback handles exercises that weren't in the itemId structure
    selectedOrder.forEach((exerciseId, orderIndex) => {
      if (processedIndices.has(orderIndex)) return;

      const exercise = filtered.find(ex => ex.id === exerciseId);
      if (!exercise) return;

      const exerciseGroup = getExerciseGroup ? getExerciseGroup(orderIndex) : null;

      if (exerciseGroup) {
        const firstIndexInGroup = exerciseGroup.exerciseIndices[0];
        const lastIndexInGroup = exerciseGroup.exerciseIndices[exerciseGroup.exerciseIndices.length - 1];

        if (orderIndex === firstIndexInGroup) {
          const groupExercisesData: GroupExerciseData[] = [];
          // Collect unique exercises in the group (by their startIndex)
          // This ensures we only show each unique exercise once in the header, with its total count
          const processedStartIndices = new Set<number>();
          exerciseGroup.exerciseIndices.forEach(idx => {
            const groupedEx = groupedExercises.find(g => g.orderIndices.includes(idx));
            // Only add to groupExercisesData if this is the startIndex of the grouped exercise
            if (groupedEx && idx === groupedEx.startIndex && !processedStartIndices.has(idx)) {
              const exId = selectedOrder[idx];
              const ex = filtered.find(e => e.id === exId);
              if (ex) {
                groupExercisesData.push({
                  exercise: ex,
                  orderIndex: idx,
                  count: groupedEx.count,
                });
                processedStartIndices.add(idx);
              }
            }
          });

          items.push({
            id: `header-${exerciseGroup.id}`,
            type: 'GroupHeader',
            group: exerciseGroup,
            groupId: exerciseGroup.id,
            groupExercises: groupExercisesData,
          });
        }

        const groupedExercise = groupedExercises.find(g => g.orderIndices.includes(orderIndex));
        // Only create an item if this is the start index of the grouped exercise
        // This prevents creating multiple items for the same exercise when count > 1
        if (groupedExercise && orderIndex !== groupedExercise.startIndex) {
          // Skip this index - it's part of a grouped exercise that will be processed at startIndex
          return;
        }

        // Mark all indices in the grouped exercise as processed (if it exists)
        if (groupedExercise) {
          groupedExercise.orderIndices.forEach(idx => processedIndices.add(idx));
        } else {
          processedIndices.add(orderIndex);
        }

        const count = groupedExercise ? groupedExercise.count : 1;

        // Determine if this is first/last in group based on the grouped exercise's position
        let isFirstInGroup = false;
        let isLastInGroup = false;
        if (groupedExercise) {
          // Get all unique grouped exercises in this group (by startIndex)
          const exercisesInGroup = groupedExercises
            .filter(g => exerciseGroup.exerciseIndices.some(idx => g.orderIndices.includes(idx)))
            .sort((a, b) => a.startIndex - b.startIndex);

          isFirstInGroup = exercisesInGroup[0]?.startIndex === groupedExercise.startIndex;
          isLastInGroup = exercisesInGroup[exercisesInGroup.length - 1]?.startIndex === groupedExercise.startIndex;
        } else {
          isFirstInGroup = orderIndex === firstIndexInGroup;
          isLastInGroup = orderIndex === lastIndexInGroup;
        }

        const isDropset = dropsetExercises.has(exerciseId);

        // First check if this exercise has an itemId in itemSetGroupsMap (from sync)
        // If not, fall back to exerciseSetGroups, then create default
        let setGroupsToUse: SetGroup[] | undefined;

        // Check if there's an itemId for this orderIndex
        if (itemIdToOrderIndices && itemSetGroupsMap) {
          const itemIdForIndex = Object.keys(itemIdToOrderIndices).find(itemId =>
            itemIdToOrderIndices[itemId].includes(orderIndex)
          );
          if (itemIdForIndex && itemSetGroupsMap[itemIdForIndex]) {
            setGroupsToUse = itemSetGroupsMap[itemIdForIndex];
          }
        }

        // Fall back to exerciseSetGroups if no itemId found
        if (!setGroupsToUse) {
          const preservedSetGroups = exerciseSetGroups?.[exerciseId];
          setGroupsToUse = preservedSetGroups && preservedSetGroups.length > 0
            ? preservedSetGroups
            : [{
              id: `setgroup-${exerciseId}-${orderIndex}-0`,
              count: count,
              isDropset: isDropset,
            }];
        }
        const totalCount = setGroupsToUse.reduce((sum, sg) => sum + sg.count, 0);
        const hasAnyDropset = setGroupsToUse.some(sg => sg.isDropset);

        items.push({
          id: `item-${exerciseId}-${orderIndex}`,
          type: 'Item',
          exercise: exercise,
          orderIndex: orderIndex,
          count: totalCount,
          setGroups: setGroupsToUse.map(sg => ({ ...sg })), // Deep copy to preserve all properties
          groupId: exerciseGroup.id,
          isFirstInGroup: isFirstInGroup,
          isLastInGroup: isLastInGroup,
          isDropset: hasAnyDropset,
        });

        // Add footer if this is the last unique exercise in the group
        // Check if this grouped exercise's last index matches the group's last index
        if (groupedExercise) {
          const lastIndexOfGroupedExercise = groupedExercise.orderIndices[groupedExercise.orderIndices.length - 1];
          if (lastIndexOfGroupedExercise === lastIndexInGroup) {
            items.push({
              id: `footer-${exerciseGroup.id}`,
              type: 'GroupFooter',
              group: exerciseGroup,
              groupId: exerciseGroup.id,
            });
          }
        } else if (orderIndex === lastIndexInGroup) {
          items.push({
            id: `footer-${exerciseGroup.id}`,
            type: 'GroupFooter',
            group: exerciseGroup,
            groupId: exerciseGroup.id,
          });
        }
      } else {
        const groupedExercise = groupedExercises.find(g => g.orderIndices.includes(orderIndex));
        // Only create an item if this is the start index of the grouped exercise
        // This prevents creating multiple items for the same exercise when count > 1
        if (groupedExercise && orderIndex !== groupedExercise.startIndex) {
          // Skip this index - it's part of a grouped exercise that will be processed at startIndex
          return;
        }

        // Mark all indices in the grouped exercise as processed (if it exists)
        if (groupedExercise) {
          groupedExercise.orderIndices.forEach(idx => processedIndices.add(idx));
        } else {
          processedIndices.add(orderIndex);
        }

        const isDropset = dropsetExercises.has(exerciseId);
        const itemCount = groupedExercise ? groupedExercise.count : 1;

        // First check if this exercise has an itemId in itemSetGroupsMap (from sync)
        // If not, fall back to exerciseSetGroups, then create default
        let setGroupsToUse: SetGroup[] | undefined;

        // Check if there's an itemId for this orderIndex
        if (itemIdToOrderIndices && itemSetGroupsMap) {
          const itemIdForIndex = Object.keys(itemIdToOrderIndices).find(itemId =>
            itemIdToOrderIndices[itemId].includes(orderIndex)
          );
          if (itemIdForIndex && itemSetGroupsMap[itemIdForIndex]) {
            setGroupsToUse = itemSetGroupsMap[itemIdForIndex];
          }
        }

        // Fall back to exerciseSetGroups if no itemId found
        if (!setGroupsToUse) {
          const preservedSetGroups = exerciseSetGroups?.[exerciseId];
          setGroupsToUse = preservedSetGroups && preservedSetGroups.length > 0
            ? preservedSetGroups
            : [{
              id: `setgroup-${exerciseId}-${orderIndex}-0`,
              count: itemCount,
              isDropset: isDropset,
            }];
        }
        const totalCount = setGroupsToUse.reduce((sum, sg) => sum + sg.count, 0);
        const hasAnyDropset = setGroupsToUse.some(sg => sg.isDropset);

        items.push({
          id: `item-${exerciseId}-${orderIndex}`,
          type: 'Item',
          exercise: exercise,
          orderIndex: orderIndex,
          count: totalCount,
          setGroups: setGroupsToUse.map(sg => ({ ...sg })), // Deep copy to preserve all properties
          groupId: null,
          isFirstInGroup: false,
          isLastInGroup: false,
          isDropset: hasAnyDropset,
        });
      }
    });

    return items;
  }, [selectedOrder, exerciseGroups, groupedExercises, filtered, getExerciseGroup, dropsetExercises, exerciseSetGroups, itemIdToOrderIndices, itemSetGroupsMap]);

  const [reorderedItems, setReorderedItems] = useState<DragItem[]>(dragItems);
  const [collapsedGroupId, setCollapsedGroupId] = useState<string | null>(null);
  const [showGroupTypeModal, setShowGroupTypeModal] = useState(false);
  const [exerciseToGroup, setExerciseToGroup] = useState<ExerciseItem | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ x: number; y: number } | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedExercisesForGroup, setSelectedExercisesForGroup] = useState<globalThis.Set<string>>(new globalThis.Set());
  const [pendingGroupType, setPendingGroupType] = useState<GroupType | null>(null);
  const [pendingGroupInitialExercise, setPendingGroupInitialExercise] = useState<ExerciseItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState<ExerciseItem | null>(null);
  const [editDropdownPosition, setEditDropdownPosition] = useState<{ x: number; y: number } | null>(null);
  const [clickedSetGroupId, setClickedSetGroupId] = useState<string | null>(null); // Track which setGroup's edit icon was clicked
  const [showSetDragModal, setShowSetDragModal] = useState(false);
  const [exerciseForSetDrag, setExerciseForSetDrag] = useState<ExerciseItem | null>(null);
  const [setDragItems, setSetDragItems] = useState<SetDragListItem[]>([]);
  const [initialAddTimerMode, setInitialAddTimerMode] = useState(false);
  const [initialSelectedSetIds, setInitialSelectedSetIds] = useState<string[]>([]);

  const buttonRefsMap = useRef<Map<string, any>>(new Map());
  const prevVisibleRef = useRef(visible);
  const pendingDragRef = useRef<(() => void) | null>(null);
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null);
  const screenWidth = Dimensions.get('window').width;

  const getNextGroupNumber = useCallback((type: GroupType): number => {
    const existingGroups: ExerciseGroup[] = [];
    reorderedItems.forEach(item => {
      if (item.type === 'GroupHeader' && item.group) {
        existingGroups.push(item.group);
      }
    });

    const groupsOfType = existingGroups.filter(g => g.type === type);
    if (groupsOfType.length === 0) return 1;
    return Math.max(...groupsOfType.map(g => g.number), 0) + 1;
  }, [reorderedItems]);

  const createGroupWithExercises = useCallback((exerciseItems: ExerciseItem[], type: GroupType) => {
    if (exerciseItems.length === 0) return;

    const nextNumber = getNextGroupNumber(type);
    const newGroup: ExerciseGroup = {
      id: `group-${Date.now()}-${Math.random()}`,
      type: type,
      number: nextNumber,
      exerciseIndices: [],
    };

    // Sort exercises by their order index to maintain order
    const sortedExercises = [...exerciseItems].sort((a, b) => a.orderIndex - b.orderIndex);

    setReorderedItems(prev => {
      // Find all indices of exercises to be grouped
      const exerciseIndices: number[] = [];
      sortedExercises.forEach(exerciseItem => {
        const index = prev.findIndex(item => item.id === exerciseItem.id);
        if (index !== -1) {
          exerciseIndices.push(index);
        }
      });

      if (exerciseIndices.length === 0) return prev;

      // Get exercise data for group header
      const groupExercisesData: GroupExerciseData[] = sortedExercises.map(item => ({
        exercise: item.exercise,
        orderIndex: item.orderIndex,
        count: item.count,
      }));

      // Create new group items
      const newItems: DragItem[] = [
        {
          id: `header-${newGroup.id}`,
          type: 'GroupHeader',
          group: newGroup,
          groupId: newGroup.id,
          groupExercises: groupExercisesData,
        },
        ...sortedExercises.map((item, idx) => ({
          type: 'Item' as const,
          id: item.id,
          exercise: item.exercise,
          orderIndex: item.orderIndex,
          count: item.count,
          setGroups: item.setGroups ? item.setGroups.map(sg => ({ ...sg })) : [{
            id: `setgroup-${item.exercise.id}-${item.orderIndex}-0`,
            count: item.count,
            isDropset: item.isDropset || false,
          }],
          groupId: newGroup.id,
          isFirstInGroup: idx === 0,
          isLastInGroup: idx === sortedExercises.length - 1,
          isDropset: item.isDropset, // Preserve dropset state when adding to group
        } as ExerciseItem)),
        {
          id: `footer-${newGroup.id}`,
          type: 'GroupFooter',
          group: newGroup,
          groupId: newGroup.id,
        }
      ];

      // Remove old items starting from the highest index to avoid index shifting issues
      const result = [...prev];
      const sortedIndices = [...exerciseIndices].sort((a, b) => b - a); // Sort descending for safe removal

      // Find the insertion point (lowest index) before removing items
      const insertIndex = Math.min(...exerciseIndices);

      // Remove items in descending order
      sortedIndices.forEach(idx => {
        result.splice(idx, 1);
      });

      // Insert new group items at the original position of the first exercise
      // Adjust insertIndex if items were removed before it
      const itemsRemovedBeforeInsert = sortedIndices.filter(idx => idx < insertIndex).length;
      const adjustedInsertIndex = insertIndex - itemsRemovedBeforeInsert;

      result.splice(adjustedInsertIndex, 0, ...newItems);
      return result;
    });
  }, [getNextGroupNumber]);

  const addExerciseToGroup = useCallback((exerciseItem: ExerciseItem, type: GroupType) => {
    createGroupWithExercises([exerciseItem], type);
  }, [createGroupWithExercises]);

  useEffect(() => {
    const wasVisible = prevVisibleRef.current;
    const isVisible = visible;

    if (!wasVisible && isVisible) {
      setReorderedItems(dragItems);
      setCollapsedGroupId(null);
      setShowGroupTypeModal(false);
      setExerciseToGroup(null);
      setDropdownPosition(null);
      setIsSelectionMode(false);
      setSelectedExercisesForGroup(new globalThis.Set());
      setPendingGroupType(null);
      setPendingGroupInitialExercise(null);
      setShowEditModal(false);
      setExerciseToEdit(null);
      setEditDropdownPosition(null);
      setClickedSetGroupId(null);
      setDropsetExercises(new globalThis.Set());
      pendingDragRef.current = null;
      setSwipedItemId(null);
    }

    prevVisibleRef.current = isVisible;
  }, [visible, dragItems]);

  useEffect(() => {
    if (showGroupTypeModal && exerciseToGroup) {
      // Measure the button position after state updates
      const measureButton = () => {
        const buttonRef = buttonRefsMap.current.get(exerciseToGroup.id);
        if (buttonRef) {
          buttonRef.measureInWindow((pageX: number, pageY: number, pageWidth: number, pageHeight: number) => {
            setDropdownPosition({
              x: pageX + pageWidth - 140,
              y: pageY + pageHeight + 4,
            });
          });
        } else {
          // Retry if ref not available yet
          setTimeout(measureButton, 10);
        }
      };
      setTimeout(measureButton, 0);
    }
  }, [showGroupTypeModal, exerciseToGroup]);

  useEffect(() => {
    if (showEditModal && exerciseToEdit) {
      // Measure the button position after state updates
      const measureButton = () => {
        // Use clickedSetGroupId if available, otherwise try the first set group or old key format
        let buttonRef: any = null;
        if (clickedSetGroupId) {
          buttonRef = buttonRefsMap.current.get(`${exerciseToEdit.id}-${clickedSetGroupId}`);
        }
        if (!buttonRef) {
          buttonRef = buttonRefsMap.current.get(exerciseToEdit.id);
        }
        if (!buttonRef && exerciseToEdit.setGroups && exerciseToEdit.setGroups.length > 0) {
          buttonRef = buttonRefsMap.current.get(`${exerciseToEdit.id}-${exerciseToEdit.setGroups[0].id}`);
        }
        if (buttonRef) {
          buttonRef.measureInWindow((pageX: number, pageY: number, pageWidth: number, pageHeight: number) => {
            const dropdownWidth = 220; // Match minWidth from styles
            const padding = 16;

            // Start by aligning dropdown to the right edge of the button
            let x = pageX + pageWidth - dropdownWidth;

            // First, ensure dropdown doesn't go off the right edge (priority)
            if (x + dropdownWidth > screenWidth - padding) {
              x = screenWidth - dropdownWidth - padding;
            }

            // Then, ensure dropdown doesn't go off the left edge
            if (x < padding) {
              x = padding;
            }

            setEditDropdownPosition({
              x: x,
              y: pageY + pageHeight + 4,
            });
          });
        } else {
          // Retry if ref not available yet
          setTimeout(measureButton, 10);
        }
      };
      setTimeout(measureButton, 0);
    }
  }, [showEditModal, exerciseToEdit, clickedSetGroupId, screenWidth]);

  // Sync exerciseToEdit with reorderedItems when popup is open
  useEffect(() => {
    if (showEditModal && exerciseToEdit) {
      const updatedItem = reorderedItems.find(item => item.id === exerciseToEdit.id && item.type === 'Item');
      if (updatedItem && updatedItem.type === 'Item' && updatedItem !== exerciseToEdit) {
        setExerciseToEdit(updatedItem);
      }
    }
  }, [reorderedItems, showEditModal, exerciseToEdit]);

  // Use extracted drag-and-drop functionality
  // Drag-and-drop helper functions are imported from exercisePickerDragAndDrop.tsx

  useEffect(() => {
    if (collapsedGroupId && pendingDragRef.current) {
      const timeoutId = setTimeout(() => {
        if (pendingDragRef.current) {
          pendingDragRef.current();
          pendingDragRef.current = null;
        }
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [collapsedGroupId, reorderedItems]);

  // Helper function to close trash icon
  const closeTrashIcon = useCallback(() => {
    setSwipedItemId(null);
  }, []);

  const handleExerciseSelection = useCallback((exerciseId: string) => {
    if (!isSelectionMode) return;

    // Close trash icon if visible
    if (swipedItemId) {
      setSwipedItemId(null);
    }

    // Prevent deselection of the initial exercise
    if (pendingGroupInitialExercise && exerciseId === pendingGroupInitialExercise.id) {
      return;
    }

    setSelectedExercisesForGroup(prev => {
      const newSet = new globalThis.Set(prev);
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId);
      } else {
        newSet.add(exerciseId);
      }
      return newSet;
    });
  }, [isSelectionMode, pendingGroupInitialExercise, swipedItemId, closeTrashIcon]);

  const handleCancelSelection = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedExercisesForGroup(new globalThis.Set());
    setPendingGroupType(null);
    setPendingGroupInitialExercise(null);
  }, []);

  const handleCreateGroupWithSelectedExercises = useCallback(() => {
    if (!pendingGroupType || !pendingGroupInitialExercise) return;

    const selectedItems: ExerciseItem[] = [];

    // Always include the initial exercise
    selectedItems.push(pendingGroupInitialExercise);

    // Add other selected exercises
    reorderedItems.forEach(item => {
      if (item.type === 'Item' &&
        item.groupId === null &&
        item.id !== pendingGroupInitialExercise.id &&
        selectedExercisesForGroup.has(item.id)) {
        selectedItems.push(item);
      }
    });

    if (selectedItems.length > 0) {
      createGroupWithExercises(selectedItems, pendingGroupType);
    }

    // Reset selection mode
    handleCancelSelection();
  }, [pendingGroupType, pendingGroupInitialExercise, reorderedItems, selectedExercisesForGroup, createGroupWithExercises, handleCancelSelection]);

  const handleIncrementSet = useCallback((exerciseItem: ExerciseItem) => {
    // For backward compatibility, increment the first set group
    setReorderedItems(prev => prev.map(item => {
      if (item.id === exerciseItem.id && item.type === 'Item' && item.setGroups.length > 0) {
        const firstSetGroup = item.setGroups[0];
        const updatedSetGroups = item.setGroups.map((sg, idx) =>
          idx === 0 ? { ...sg, count: sg.count + 1 } : sg
        );
        const totalCount = updatedSetGroups.reduce((sum, sg) => sum + sg.count, 0);
        return {
          ...item,
          setGroups: updatedSetGroups,
          count: totalCount,
        };
      }
      return item;
    }));
  }, []);

  const handleDecrementSet = useCallback((exerciseItem: ExerciseItem) => {
    // For backward compatibility, decrement the first set group
    if (exerciseItem.setGroups.length > 0 && exerciseItem.setGroups[0].count <= 1) return;

    setReorderedItems(prev => prev.map(item => {
      if (item.id === exerciseItem.id && item.type === 'Item' && item.setGroups.length > 0) {
        const updatedSetGroups = item.setGroups.map((sg, idx) =>
          idx === 0 && sg.count > 1 ? { ...sg, count: sg.count - 1 } : sg
        );
        const totalCount = updatedSetGroups.reduce((sum, sg) => sum + sg.count, 0);
        return {
          ...item,
          setGroups: updatedSetGroups,
          count: totalCount,
        };
      }
      return item;
    }));
  }, []);

  const handleDeleteExercise = useCallback((itemId: string) => {
    setReorderedItems(prev => {
      const itemIndex = prev.findIndex(item => item.id === itemId);
      if (itemIndex === -1) return prev;

      const itemToDelete = prev[itemIndex];
      if (itemToDelete.type !== 'Item') return prev;

      const newItems = [...prev];
      const item = itemToDelete as ExerciseItem;
      const groupId = item.groupId;

      // Remove the item
      newItems.splice(itemIndex, 1);

      // If item was in a group, check if group needs cleanup
      if (groupId) {
        // Find the group header and footer
        let headerIndex = -1;
        let footerIndex = -1;
        const groupItems: ExerciseItem[] = [];

        for (let i = 0; i < newItems.length; i++) {
          const currentItem = newItems[i];
          if (currentItem.type === 'GroupHeader' && currentItem.groupId === groupId) {
            headerIndex = i;
          } else if (currentItem.type === 'GroupFooter' && currentItem.groupId === groupId) {
            footerIndex = i;
          } else if (currentItem.type === 'Item' && currentItem.groupId === groupId) {
            groupItems.push(currentItem);
          }
        }

        // If group has less than 2 items, remove the entire group
        if (groupItems.length < 2 && headerIndex !== -1 && footerIndex !== -1) {
          // Remove header, all remaining items, and footer
          const itemsToRemove = [headerIndex];
          // Adjust indices for items after header
          for (let i = headerIndex + 1; i <= footerIndex; i++) {
            itemsToRemove.push(i);
          }
          // Remove in reverse order to maintain indices
          itemsToRemove.sort((a, b) => b - a).forEach(idx => {
            newItems.splice(idx, 1);
          });
        } else if (groupItems.length > 0) {
          // Update first/last flags for remaining items
          const firstItem = groupItems[0];
          const lastItem = groupItems[groupItems.length - 1];

          for (let i = 0; i < newItems.length; i++) {
            const currentItem = newItems[i];
            if (currentItem.type === 'Item' && currentItem.groupId === groupId) {
              const isFirst = currentItem.id === firstItem.id;
              const isLast = currentItem.id === lastItem.id;
              newItems[i] = {
                ...currentItem,
                isFirstInGroup: isFirst,
                isLastInGroup: isLast,
              };
            }
          }
        }
      }

      // Clean up swipe state
      if (swipedItemId === itemId) {
        setSwipedItemId(null);
      }

      return newItems;
    });
  }, []);

  const handleToggleDropset = useCallback((exerciseItem: ExerciseItem, setGroupId: string | null) => {
    if (!setGroupId) return;

    setReorderedItems(prevItems => prevItems.map(item => {
      if (item.id === exerciseItem.id && item.type === 'Item') {
        const updatedSetGroups = item.setGroups.map(sg =>
          sg.id === setGroupId ? { ...sg, isDropset: !sg.isDropset } : sg
        );
        const totalCount = updatedSetGroups.reduce((sum, sg) => sum + sg.count, 0);
        const hasAnyDropset = updatedSetGroups.some(sg => sg.isDropset);

        // Update dropsetExercises set
        if (hasAnyDropset) {
          setDropsetExercises(prev => new globalThis.Set([...prev, exerciseItem.exercise.id]));
        } else {
          setDropsetExercises(prev => {
            const newSet = new globalThis.Set(prev);
            newSet.delete(exerciseItem.exercise.id);
            return newSet;
          });
        }

        return {
          ...item,
          setGroups: updatedSetGroups,
          count: totalCount,
          isDropset: hasAnyDropset
        };
      }
      return item;
    }));
  }, []);

  // Convert setGroups to Sets format for SetDragModal
  const convertSetGroupsToSets = useCallback((exerciseItem: ExerciseItem): Set[] => {
    const sets: Set[] = [];

    exerciseItem.setGroups.forEach((setGroup) => {
      for (let i = 0; i < setGroup.count; i++) {
        const setId = `${setGroup.id}-${i}`;

        // For dropsets with setTypes array, use individual set types
        let isWarmup = setGroup.isWarmup || false;
        let isFailure = setGroup.isFailure || false;

        if (setGroup.isDropset && setGroup.setTypes && setGroup.setTypes[i]) {
          isWarmup = setGroup.setTypes[i].isWarmup;
          isFailure = setGroup.setTypes[i].isFailure;
        }

        const set: Set = {
          id: setId,
          type: 'Working',
          weight: '',
          reps: '',
          duration: '',
          distance: '',
          completed: false,
          isWarmup: isWarmup,
          isFailure: isFailure,
          dropSetId: setGroup.isDropset ? setGroup.id : undefined,
          restPeriodSeconds: setGroup.restPeriodSecondsBySetId?.[setId] ?? setGroup.restPeriodSeconds,
        };
        sets.push(set);
      }
    });

    return sets;
  }, []);

  // Convert Sets back to setGroups, merging sequential sets of same type
  const convertSetsToSetGroups = useCallback((sets: Set[]): SetGroup[] => {
    if (sets.length === 0) return [];

    const setGroups: SetGroup[] = [];
    let currentGroup: SetGroup | null = null;
    const dropsetGroupsMap = new Map<string, SetGroup>();

    sets.forEach((set, index) => {
      const isDropset = !!set.dropSetId;
      const isWarmup = set.isWarmup || false;
      const isFailure = set.isFailure || false;
      const restPeriodSeconds = set.restPeriodSeconds;

      if (isDropset) {
        // For dropsets, collect all sets with the same dropSetId
        const dropSetId = set.dropSetId!;
        let dropsetGroup = dropsetGroupsMap.get(dropSetId);

        if (!dropsetGroup) {
          // Create new dropset group
          dropsetGroup = {
            id: dropSetId,
            count: 0,
            isDropset: true,
            setTypes: [], // Initialize array to store individual set types
            restPeriodSeconds: restPeriodSeconds, // Initialize with first set's rest timer
            restPeriodSecondsBySetId: restPeriodSeconds != null ? { [set.id]: restPeriodSeconds } : {},
          };
          dropsetGroupsMap.set(dropSetId, dropsetGroup);
          setGroups.push(dropsetGroup);
          currentGroup = null; // Reset currentGroup when we hit a dropset
        } else if (restPeriodSeconds != null) {
          // Store per-set timer when sets have different timers
          dropsetGroup.restPeriodSecondsBySetId = dropsetGroup.restPeriodSecondsBySetId ?? {};
          dropsetGroup.restPeriodSecondsBySetId[set.id] = restPeriodSeconds;
        }

        // Add this set to the dropset group
        dropsetGroup.count++;
        if (dropsetGroup.setTypes) {
          dropsetGroup.setTypes.push({ isWarmup, isFailure });
        }

        // Check if all sets in dropset have the same rest timer
        if (dropsetGroup.restPeriodSeconds !== restPeriodSeconds) {
          // Different rest timers, clear group-level rest timer
          dropsetGroup.restPeriodSeconds = undefined;
        }

        // Check if all sets in dropset have the same type
        if (dropsetGroup.setTypes && dropsetGroup.setTypes.length > 0) {
          const firstType = dropsetGroup.setTypes[0];
          const allSameType = dropsetGroup.setTypes.every(
            t => t.isWarmup === firstType.isWarmup && t.isFailure === firstType.isFailure
          );

          if (allSameType) {
            // All sets have the same type, set group-level properties for backward compatibility
            dropsetGroup.isWarmup = firstType.isWarmup;
            dropsetGroup.isFailure = firstType.isFailure;
          } else {
            // Multiple types in dropset, clear group-level properties
            dropsetGroup.isWarmup = undefined;
            dropsetGroup.isFailure = undefined;
          }
        }
      } else {
        // For non-dropset sets, merge sequential sets of the same type (regardless of rest timer)
        if (currentGroup &&
          !currentGroup.isDropset &&
          currentGroup.isWarmup === isWarmup &&
          currentGroup.isFailure === isFailure) {
          // Same type as current group, merge
          currentGroup.count++;
          if (restPeriodSeconds != null) {
            currentGroup.restPeriodSecondsBySetId = currentGroup.restPeriodSecondsBySetId ?? {};
            currentGroup.restPeriodSecondsBySetId[set.id] = restPeriodSeconds;
          }

          // If rest timers differ, clear group-level rest timer
          if (currentGroup.restPeriodSeconds !== restPeriodSeconds) {
            currentGroup.restPeriodSeconds = undefined;
          }
        } else {
          // Different type or first set, start new group.
          // Use stripped set id as group id so set ids stay stable (groupId-0, groupId-1).
          // If that would duplicate an existing group id (e.g. two groups from same prefix), use full set.id so ids stay unique.
          const strippedId = /-\d+$/.test(set.id) ? set.id.replace(/-\d+$/, '') : set.id;
          const idAlreadyUsed = setGroups.some(sg => sg.id === strippedId) || (currentGroup?.id === strippedId);
          const groupId = idAlreadyUsed ? set.id : strippedId;
          currentGroup = {
            id: groupId,
            count: 1,
            isDropset: false,
            isWarmup: isWarmup,
            isFailure: isFailure,
            restPeriodSeconds: restPeriodSeconds,
            restPeriodSecondsBySetId: restPeriodSeconds != null ? { [set.id]: restPeriodSeconds } : {},
          };
          setGroups.push(currentGroup);
        }
      }
    });

    return setGroups;
  }, []);

  // Handle opening SetDragModal
  const handleEditSets = useCallback((exerciseItem: ExerciseItem) => {
    const sets = convertSetGroupsToSets(exerciseItem);

    // Convert Sets to SetDragListItem format
    const items: SetDragListItem[] = [];
    const processedDropSetIds = new Set<string>();

    sets.forEach((set, index) => {
      // Check if this is the start of a new dropset
      const isDropSetStart = set.dropSetId &&
        (index === 0 || sets[index - 1].dropSetId !== set.dropSetId);

      // Check if this is the end of a dropset
      const isDropSetEnd = set.dropSetId &&
        (index === sets.length - 1 || sets[index + 1]?.dropSetId !== set.dropSetId);

      // Add dropset header if this is the start
      if (isDropSetStart && set.dropSetId && !processedDropSetIds.has(set.dropSetId)) {
        const dropSetSets = sets.filter(s => s.dropSetId === set.dropSetId);
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
    setExerciseForSetDrag(exerciseItem);
    setInitialAddTimerMode(false);
    setInitialSelectedSetIds([]);
    setShowSetDragModal(true);
    setShowEditModal(false);
    setExerciseToEdit(null);
    setClickedSetGroupId(null);
    setEditDropdownPosition(null);
  }, [convertSetGroupsToSets]);

  // Handle opening SetDragModal in addTimerMode for a specific setGroup
  const handleOpenTimerForSetGroup = useCallback((exerciseItem: ExerciseItem, setGroupId: string) => {
    const sets = convertSetGroupsToSets(exerciseItem);

    // Find the setGroup to get its count
    const setGroup = exerciseItem.setGroups.find(sg => sg.id === setGroupId);
    if (!setGroup) return;

    // Pre-select sets when opening timer modal: sets that already have a timer, or all sets in the row if none have timers.
    const prefix = setGroup.id + '-';
    const setIdsWithTimers = setGroup.restPeriodSecondsBySetId && Object.keys(setGroup.restPeriodSecondsBySetId).length > 0
      ? Object.keys(setGroup.restPeriodSecondsBySetId).filter(sid => {
          if (!sid.startsWith(prefix)) return false;
          const idx = parseInt(sid.slice(prefix.length), 10);
          return !Number.isNaN(idx) && idx >= 0 && idx < setGroup.count;
        })
      : setGroup.restPeriodSeconds != null
        ? Array.from({ length: setGroup.count }, (_, i) => `${setGroup.id}-${i}`)
        : Array.from({ length: setGroup.count }, (_, i) => `${setGroup.id}-${i}`); // No timers: pre-select all sets in the row

    // Convert Sets to SetDragListItem format (same as handleEditSets)
    const items: SetDragListItem[] = [];
    const processedDropSetIds = new Set<string>();

    sets.forEach((set, index) => {
      // Check if this is the start of a new dropset
      const isDropSetStart = set.dropSetId &&
        (index === 0 || sets[index - 1].dropSetId !== set.dropSetId);

      // Check if this is the end of a dropset
      const isDropSetEnd = set.dropSetId &&
        (index === sets.length - 1 || sets[index + 1]?.dropSetId !== set.dropSetId);

      // Add dropset header if this is the start
      if (isDropSetStart && set.dropSetId && !processedDropSetIds.has(set.dropSetId)) {
        const dropSetSets = sets.filter(s => s.dropSetId === set.dropSetId);
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
    setExerciseForSetDrag(exerciseItem);
    setInitialAddTimerMode(true);
    setInitialSelectedSetIds(setIdsWithTimers);
    setShowSetDragModal(true);
  }, [convertSetGroupsToSets]);

  const handleToggleWarmup = useCallback((exerciseItem: ExerciseItem, setGroupId: string) => {
    setReorderedItems(prevItems => prevItems.map(item => {
      if (item.id === exerciseItem.id && item.type === 'Item') {
        const updatedSetGroups = item.setGroups.map(sg => {
          if (sg.id === setGroupId) {
            // Toggle warmup, and remove failure if warmup is being set
            const newIsWarmup = !sg.isWarmup;
            return {
              ...sg,
              isWarmup: newIsWarmup,
              isFailure: newIsWarmup ? false : sg.isFailure, // Remove failure if setting warmup
            };
          }
          return sg;
        });
        const totalCount = updatedSetGroups.reduce((sum, sg) => sum + sg.count, 0);
        return {
          ...item,
          setGroups: updatedSetGroups,
          count: totalCount,
        };
      }
      return item;
    }));
  }, []);

  const handleToggleFailure = useCallback((exerciseItem: ExerciseItem, setGroupId: string) => {
    setReorderedItems(prevItems => prevItems.map(item => {
      if (item.id === exerciseItem.id && item.type === 'Item') {
        const updatedSetGroups = item.setGroups.map(sg => {
          if (sg.id === setGroupId) {
            // Toggle failure, and remove warmup if failure is being set
            const newIsFailure = !sg.isFailure;
            return {
              ...sg,
              isFailure: newIsFailure,
              isWarmup: newIsFailure ? false : sg.isWarmup, // Remove warmup if setting failure
            };
          }
          return sg;
        });
        const totalCount = updatedSetGroups.reduce((sum, sg) => sum + sg.count, 0);
        return {
          ...item,
          setGroups: updatedSetGroups,
          count: totalCount,
        };
      }
      return item;
    }));
  }, []);

  const handleIncrementSetGroup = useCallback((exerciseItem: ExerciseItem, setGroupId: string) => {
    setReorderedItems(prev => prev.map(item => {
      if (item.id === exerciseItem.id && item.type === 'Item') {
        const updatedSetGroups = item.setGroups.map(sg =>
          sg.id === setGroupId ? { ...sg, count: sg.count + 1 } : sg
        );
        const totalCount = updatedSetGroups.reduce((sum, sg) => sum + sg.count, 0);
        return {
          ...item,
          setGroups: updatedSetGroups,
          count: totalCount,
        };
      }
      return item;
    }));
  }, []);

  const handleDecrementSetGroup = useCallback((exerciseItem: ExerciseItem, setGroupId: string) => {
    const setGroup = exerciseItem.setGroups.find(sg => sg.id === setGroupId);
    if (!setGroup) return;

    if (setGroup.count > 1) {
      // Decrement the set count
      setReorderedItems(prev => prev.map(item => {
        if (item.id === exerciseItem.id && item.type === 'Item') {
          const updatedSetGroups = item.setGroups.map(sg =>
            sg.id === setGroupId && sg.count > 1 ? { ...sg, count: sg.count - 1 } : sg
          );
          const totalCount = updatedSetGroups.reduce((sum, sg) => sum + sg.count, 0);
          return {
            ...item,
            setGroups: updatedSetGroups,
            count: totalCount,
          };
        }
        return item;
      }));
    } else {
      // Only one set left: remove the entire set row
      if (exerciseItem.setGroups.length <= 1) {
        // Last set row - remove entire exercise
        handleDeleteExercise(exerciseItem.id);
      } else {
        // Remove the set group
        setReorderedItems(prev => prev.map(item => {
          if (item.id === exerciseItem.id && item.type === 'Item') {
            const updatedSetGroups = item.setGroups.filter(sg => sg.id !== setGroupId);
            const totalCount = updatedSetGroups.reduce((sum, sg) => sum + sg.count, 0);
            const hasAnyDropset = updatedSetGroups.some(sg => sg.isDropset);
            return {
              ...item,
              setGroups: updatedSetGroups,
              count: totalCount,
              isDropset: hasAnyDropset,
            };
          }
          return item;
        }));
      }
    }
  }, [handleDeleteExercise]);

  const handleDeleteSetGroup = useCallback((exerciseItem: ExerciseItem, setGroupId: string) => {
    setReorderedItems(prev => prev.map(item => {
      if (item.id === exerciseItem.id && item.type === 'Item') {
        if (item.setGroups.length <= 1) {
          // Don't allow deleting the last set group
          return item;
        }
        const updatedSetGroups = item.setGroups.filter(sg => sg.id !== setGroupId);
        const totalCount = updatedSetGroups.reduce((sum, sg) => sum + sg.count, 0);
        const hasAnyDropset = updatedSetGroups.some(sg => sg.isDropset);
        return {
          ...item,
          setGroups: updatedSetGroups,
          count: totalCount,
          isDropset: hasAnyDropset,
        };
      }
      return item;
    }));
  }, []);

  // SetDragModal handlers
  const handleSetDragEnd = useCallback(({ data, from, to }: { data: SetDragListItem[]; from: number; to: number }) => {
    // Extract sets from drag items
    const sets: Set[] = [];
    data.forEach(item => {
      if (item.type === 'set') {
        sets.push(item.set);
      }
    });

    // Convert Sets back to setGroups with merging
    const newSetGroups = convertSetsToSetGroups(sets);

    // Update the exercise item
    if (exerciseForSetDrag) {
      setReorderedItems(prev => prev.map(item => {
        if (item.id === exerciseForSetDrag.id && item.type === 'Item') {
          const totalCount = newSetGroups.reduce((sum, sg) => sum + sg.count, 0);
          const hasAnyDropset = newSetGroups.some(sg => sg.isDropset);
          return {
            ...item,
            setGroups: newSetGroups,
            count: totalCount,
            isDropset: hasAnyDropset,
          };
        }
        return item;
      }));
    }

    // Update local setDragItems
    setSetDragItems(data);
  }, [exerciseForSetDrag, convertSetsToSetGroups]);

  const handleSetDragCancel = useCallback(() => {
    setShowSetDragModal(false);
    setExerciseForSetDrag(null);
    setSetDragItems([]);
    setInitialAddTimerMode(false);
    setInitialSelectedSetIds([]);
  }, []);

  const handleSetDragSave = useCallback(() => {
    // Extract sets from drag items
    const sets: Set[] = [];
    setDragItems.forEach(item => {
      if (item.type === 'set') {
        sets.push(item.set);
      }
    });

    // Convert Sets back to setGroups with merging
    const newSetGroups = convertSetsToSetGroups(sets);

    // Update the exercise item
    if (exerciseForSetDrag) {
      setReorderedItems(prev => prev.map(item => {
        if (item.id === exerciseForSetDrag.id && item.type === 'Item') {
          const totalCount = newSetGroups.reduce((sum, sg) => sum + sg.count, 0);
          const hasAnyDropset = newSetGroups.some(sg => sg.isDropset);
          return {
            ...item,
            setGroups: newSetGroups,
            count: totalCount,
            isDropset: hasAnyDropset,
          };
        }
        return item;
      }));
    }

    setShowSetDragModal(false);
    setExerciseForSetDrag(null);
    setSetDragItems([]);
    setInitialAddTimerMode(false);
    setInitialSelectedSetIds([]);
  }, [exerciseForSetDrag, setDragItems, convertSetsToSetGroups]);

  const handleCreateDropset = useCallback((setId: string) => {
    const newDropSetId = `dropset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const updatedItems = setDragItems.map(item => {
      if (item.type === 'set' && item.id === setId) {
        return {
          ...item,
          set: {
            ...item.set,
            dropSetId: newDropSetId,
          },
        };
      }
      return item;
    });

    // Reconstruct items with headers/footers
    const sets: Set[] = [];
    updatedItems.forEach(item => {
      if (item.type === 'set') {
        sets.push(item.set);
      }
    });

    // Reconstruct with headers/footers
    const reconstructedItems: SetDragListItem[] = [];
    const processedDropSetIds = new Set<string>();

    sets.forEach((set, index) => {
      const isDropSetStart = set.dropSetId &&
        (index === 0 || sets[index - 1].dropSetId !== set.dropSetId);
      const isDropSetEnd = set.dropSetId &&
        (index === sets.length - 1 || sets[index + 1]?.dropSetId !== set.dropSetId);

      if (isDropSetStart && set.dropSetId && !processedDropSetIds.has(set.dropSetId)) {
        const dropSetSets = sets.filter(s => s.dropSetId === set.dropSetId);
        reconstructedItems.push({
          id: `dropset-header-${set.dropSetId}`,
          type: 'dropset_header',
          dropSetId: set.dropSetId,
          setCount: dropSetSets.length,
        });
        processedDropSetIds.add(set.dropSetId);
      }

      reconstructedItems.push({
        id: set.id,
        type: 'set',
        set,
        hasRestTimer: !!set.restPeriodSeconds,
      });

      if (isDropSetEnd && set.dropSetId) {
        reconstructedItems.push({
          id: `dropset-footer-${set.dropSetId}`,
          type: 'dropset_footer',
          dropSetId: set.dropSetId,
        });
      }
    });

    setSetDragItems(reconstructedItems);
  }, [setDragItems]);

  const handleUpdateSet = useCallback((setId: string, updates: Partial<Set>) => {
    const updatedItems = setDragItems.map(item => {
      if (item.type === 'set' && item.id === setId) {
        return {
          ...item,
          set: {
            ...item.set,
            ...updates,
          },
        };
      }
      return item;
    });

    setSetDragItems(updatedItems);
  }, [setDragItems]);

  const handleAddSet = useCallback(() => {
    const currentSets: Set[] = [];
    setDragItems.forEach(item => {
      if (item.type === 'set') {
        currentSets.push(item.set);
      }
    });

    const newSet: Set = {
      id: `s-${Date.now()}-${Math.random()}`,
      type: 'Working',
      weight: '',
      reps: '',
      duration: '',
      distance: '',
      completed: false,
    };

    const updatedSets = [...currentSets, newSet];

    // Reconstruct items with headers/footers
    const reconstructedItems: SetDragListItem[] = [];
    const processedDropSetIds = new Set<string>();

    updatedSets.forEach((set, index) => {
      const isDropSetStart = set.dropSetId &&
        (index === 0 || updatedSets[index - 1].dropSetId !== set.dropSetId);
      const isDropSetEnd = set.dropSetId &&
        (index === updatedSets.length - 1 || updatedSets[index + 1]?.dropSetId !== set.dropSetId);

      if (isDropSetStart && set.dropSetId && !processedDropSetIds.has(set.dropSetId)) {
        const dropSetSets = updatedSets.filter(s => s.dropSetId === set.dropSetId);
        reconstructedItems.push({
          id: `dropset-header-${set.dropSetId}`,
          type: 'dropset_header',
          dropSetId: set.dropSetId,
          setCount: dropSetSets.length,
        });
        processedDropSetIds.add(set.dropSetId);
      }

      reconstructedItems.push({
        id: set.id,
        type: 'set',
        set,
        hasRestTimer: !!set.restPeriodSeconds,
      });

      if (isDropSetEnd && set.dropSetId) {
        reconstructedItems.push({
          id: `dropset-footer-${set.dropSetId}`,
          type: 'dropset_footer',
          dropSetId: set.dropSetId,
        });
      }
    });

    setSetDragItems(reconstructedItems);
  }, [setDragItems]);

  const handleUpdateRestTimer = useCallback((setId: string, restPeriodSeconds: number | undefined) => {
    const updatedItems = setDragItems.map(item => {
      if (item.type === 'set' && item.id === setId) {
        return {
          ...item,
          set: {
            ...item.set,
            restPeriodSeconds,
          },
          hasRestTimer: !!restPeriodSeconds,
        };
      }
      return item;
    });

    setSetDragItems(updatedItems);
  }, [setDragItems]);

  const handleUpdateRestTimerMultiple = useCallback((setIds: string[], restPeriodSeconds: number | undefined) => {
    const setIdsSet = new globalThis.Set(setIds);

    const updatedItems = setDragItems.map(item => {
      if (item.type === 'set' && setIdsSet.has(item.id)) {
        return {
          ...item,
          set: {
            ...item.set,
            restPeriodSeconds,
          },
          hasRestTimer: !!restPeriodSeconds,
        };
      }
      return item;
    });

    setSetDragItems(updatedItems);
  }, [setDragItems]);

  const handleDuplicateExercise = useCallback((exerciseItem: ExerciseItem) => {
    setReorderedItems(prev => {
      const itemIndex = prev.findIndex(item => item.id === exerciseItem.id);
      if (itemIndex === -1) return prev;

      const newItems = [...prev];
      const duplicate: ExerciseItem = {
        ...exerciseItem,
        id: `item-${exerciseItem.exercise.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        setGroups: exerciseItem.setGroups.map(sg => ({
          ...sg,
          id: `setgroup-${exerciseItem.exercise.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          restPeriodSecondsBySetId: undefined, // New group id makes old set-id keys invalid; keep group-level restPeriodSeconds only
        })),
        isDropset: exerciseItem.isDropset, // Preserve dropset state
      };

      // Insert duplicate right after the original item
      newItems.splice(itemIndex + 1, 0, duplicate);

      // If item was in a group, update first/last flags for group items
      if (exerciseItem.groupId) {
        const groupId = exerciseItem.groupId;
        const groupItemIndices: number[] = [];

        for (let i = 0; i < newItems.length; i++) {
          const item = newItems[i];
          if (item.type === 'Item' && item.groupId === groupId) {
            groupItemIndices.push(i);
          }
        }

        // Update first/last flags
        if (groupItemIndices.length > 0) {
          const firstIndex = groupItemIndices[0];
          const lastIndex = groupItemIndices[groupItemIndices.length - 1];

          groupItemIndices.forEach((index) => {
            const currentItem = newItems[index];
            if (currentItem.type === 'Item') {
              newItems[index] = {
                ...currentItem,
                isFirstInGroup: index === firstIndex,
                isLastInGroup: index === lastIndex,
              };
            }
          });
        }
      }

      return newItems;
    });
  }, []);


  const toggleGroupType = useCallback((groupId: string) => {
    setReorderedItems(prev => prev.map(item => {
      if (item.groupId === groupId && item.type === 'GroupHeader' && item.group) {
        const newType: GroupType = item.group.type === 'HIIT' ? 'Superset' : 'HIIT';
        return {
          ...item,
          group: {
            ...item.group,
            type: newType,
          },
        };
      }
      if (item.groupId === groupId && item.type === 'GroupFooter' && item.group) {
        const newType: GroupType = item.group.type === 'HIIT' ? 'Superset' : 'HIIT';
        return {
          ...item,
          group: {
            ...item.group,
            type: newType,
          },
        };
      }
      return item;
    }));
  }, []);

  const initiateGroupDrag = useCallback(
    createInitiateGroupDrag(reorderedItems, setReorderedItems, setCollapsedGroupId, pendingDragRef),
    [reorderedItems]
  );

  const handleDragEnd = useCallback(
    createHandleDragEnd(collapsedGroupId, setCollapsedGroupId, setReorderedItems, pendingDragRef),
    [collapsedGroupId]
  );

  const handleSave = useCallback(() => {
    if (!onReorder) return;

    let finalItems = reorderedItems;
    if (collapsedGroupId) {
      finalItems = expandAllGroups(reorderedItems);
    }

    const newOrder: string[] = [];
    const updatedGroups: ExerciseGroup[] = [];
    // Map to track which item IDs correspond to which positions in newOrder
    // This preserves separate cards even if they have the same exercise ID
    const itemIdToOrderIndices: Record<string, number[]> = {};

    let currentGroup: ExerciseGroup | null = null;
    let currentGroupIndices: number[] = [];

    finalItems.forEach((item) => {
      if (item.type === 'GroupHeader') {
        currentGroup = { ...item.group };
        currentGroupIndices = [];
      } else if (item.type === 'Item') {
        // Track which order indices this item occupies
        const itemOrderIndices: number[] = [];

        // Iterate through setGroups to add exercises in order
        item.setGroups.forEach(setGroup => {
          for (let i = 0; i < setGroup.count; i++) {
            const orderIndex = newOrder.length;
            if (currentGroup) {
              currentGroupIndices.push(orderIndex);
            }
            newOrder.push(item.exercise.id);
            itemOrderIndices.push(orderIndex);
          }
        });

        // Store the mapping for this item
        itemIdToOrderIndices[item.id] = itemOrderIndices;
      } else if (item.type === 'GroupFooter') {
        if (currentGroup && currentGroupIndices.length > 0) {
          updatedGroups.push({
            ...currentGroup,
            exerciseIndices: currentGroupIndices,
          });
        }
        currentGroup = null;
        currentGroupIndices = [];
      }
    });

    if (currentGroup && currentGroupIndices.length > 0) {
      const group = currentGroup as ExerciseGroup;
      updatedGroups.push({
        id: group.id,
        type: group.type,
        number: group.number,
        exerciseIndices: currentGroupIndices,
      });
    }

    // Collect dropset exercise IDs and setGroups from finalItems
    // Store setGroups per item ID (not just exercise ID) to preserve separate cards
    const dropsetExerciseIds: string[] = [];
    const setGroupsMap: Record<string, SetGroup[]> = {};
    const itemSetGroupsMap: Record<string, SetGroup[]> = {}; // Map by item.id, not exercise.id

    finalItems.forEach((item) => {
      if (item.type === 'Item') {
        // Store setGroups by item ID to preserve separate cards
        // Deep copy to preserve all properties including isWarmup and isFailure
        itemSetGroupsMap[item.id] = item.setGroups.map(sg => ({ ...sg }));

        // Also store by exercise ID for backward compatibility (use first occurrence)
        if (!setGroupsMap[item.exercise.id]) {
          setGroupsMap[item.exercise.id] = item.setGroups.map(sg => ({ ...sg }));
        }

        // Check if any setGroup is a dropset
        const hasDropset = item.setGroups.some(sg => sg.isDropset);
        if (hasDropset && !dropsetExerciseIds.includes(item.exercise.id)) {
          dropsetExerciseIds.push(item.exercise.id);
        }
      }
    });

    // Pass item structure information to preserve separate cards
    onReorder(newOrder, updatedGroups, dropsetExerciseIds, setGroupsMap, itemIdToOrderIndices, itemSetGroupsMap);
    onClose();
  }, [reorderedItems, collapsedGroupId, expandAllGroups, onReorder, onClose]);

  const getItemGroupContext = useCallback((itemIndex: number): ItemGroupContext => {
    let currentGroupId: string | null = null;
    let groupType: GroupType | null = null;
    let isFirstInGroup = false;
    let isLastInGroup = false;

    for (let i = 0; i <= itemIndex; i++) {
      const item = reorderedItems[i];
      if (item.type === 'GroupHeader') {
        currentGroupId = item.groupId || null;
        groupType = item.group.type;
      } else if (item.type === 'GroupFooter') {
        currentGroupId = null;
        groupType = null;
      }
    }

    if (currentGroupId) {
      let foundPreviousItem = false;
      for (let i = itemIndex - 1; i >= 0; i--) {
        const item = reorderedItems[i];
        if (item.type === 'GroupHeader' && item.groupId === currentGroupId) {
          isFirstInGroup = true;
          break;
        }
        if (item.type === 'Item') {
          foundPreviousItem = true;
          break;
        }
        if (item.type === 'GroupFooter') break;
      }
      if (!foundPreviousItem) isFirstInGroup = true;

      let foundNextItem = false;
      for (let i = itemIndex + 1; i < reorderedItems.length; i++) {
        const item = reorderedItems[i];
        if (item.type === 'GroupFooter' && item.groupId === currentGroupId) {
          isLastInGroup = true;
          break;
        }
        if (item.type === 'Item') {
          foundNextItem = true;
          break;
        }
        if (item.type === 'GroupHeader') break;
      }
      if (!foundNextItem) isLastInGroup = true;
    }

    return { currentGroupId, groupType, isFirstInGroup, isLastInGroup };
  }, [reorderedItems]);

  const renderSetGroupRow = (
    item: ExerciseItem,
    setGroup: SetGroup,
    setGroupIndex: number,
    groupColorScheme: typeof defaultSupersetColorScheme | typeof defaultHiitColorScheme | null,
    isFirstInGroup: boolean,
    isLastInGroup: boolean,
    isActive: boolean,
    showExerciseName: boolean
  ) => {
    const isFirstRow = setGroupIndex === 0;
    const isLastRow = setGroupIndex === item.setGroups.length - 1;
    const isFirstRowInCard = isFirstRow && isFirstInGroup;
    const isLastRowInCard = isLastRow && isLastInGroup;
    const hasMultipleRows = item.setGroups.length > 1;

    return (
      <View
        key={setGroup.id}
        style={[
          styles.setGroupRow,
          isFirstRowInCard && styles.setGroupRow__first,
          isLastRowInCard && styles.setGroupRow__last,
        ]}
      >
        <View style={[
          styles.exerciseCardContent,
          styles.exerciseCardContent__groupChild,
          hasMultipleRows && styles.exerciseCardContent__groupChild__multiRow,
          hasMultipleRows && isFirstRow && styles.exerciseCardContent__groupChild__multiRow__first,
          hasMultipleRows && isLastRow && styles.exerciseCardContent__groupChild__multiRow__last,
          groupColorScheme && {
            backgroundColor: groupColorScheme[50],
            borderColor: groupColorScheme[150]
          },
          isFirstRowInCard && styles.exerciseCardContent__groupChild__first,
          isLastRowInCard && styles.exerciseCardContent__groupChild__last,
        ]}>
          <View style={styles.exerciseInfo}>
            <View style={styles.exerciseNameRow}>
              <View style={styles.setCountContainer}>
                {setGroup.isDropset && (
                  <View style={styles.dropsetIndicator} />
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[
                    styles.setCountText,
                    setGroup.isWarmup && { color: COLORS.orange[500] },
                    setGroup.isFailure && { color: COLORS.red[500] },
                  ]}>{setGroup.count}</Text>
                  <Text style={styles.setCountPrefix}> x </Text>
                </View>
              </View>
              <Text style={[
                styles.exerciseName,
                !showExerciseName && { color: groupColorScheme ? groupColorScheme[150] : COLORS.slate[150] }
              ]}>{item.exercise.name}</Text>
            </View>
          </View>

          <View style={styles.exerciseRight}>
            <View style={styles.setControls}>
              <TouchableOpacity
                onPress={() => {
                  if (swipedItemId) {
                    closeTrashIcon();
                  }
                  handleOpenTimerForSetGroup(item, setGroup.id);
                }}
                disabled={isActive}
                style={[
                  styles.setControlButton,
                  { backgroundColor: 'transparent' },
                  isActive && styles.setControlButton__disabled,
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {(() => {
                  const disabledColor = groupColorScheme ? groupColorScheme[400] : COLORS.slate[300];
                  const prefix = setGroup.id + '-';
                  const countWithTimers = Object.keys(setGroup.restPeriodSecondsBySetId || {}).filter(sid => {
                    if (!sid.startsWith(prefix)) return false;
                    const idx = parseInt(sid.slice(prefix.length), 10);
                    return !Number.isNaN(idx) && idx >= 0 && idx < setGroup.count;
                  }).length;
                  const hasAnyTimer = setGroup.restPeriodSeconds != null || countWithTimers > 0;
                  const hasPartialTimers = countWithTimers > 0 && countWithTimers < setGroup.count;
                  if (hasPartialTimers) {
                    return (
                      <View style={styles.timerIconSplit}>
                        <Timer size={16} color={disabledColor} />
                        <View style={[styles.timerIconSplitRight, { width: 8, height: 16 }]} pointerEvents="none">
                          <View style={{ position: 'absolute', right: 0 }}>
                            <Timer size={16} color={COLORS.blue[600]} />
                          </View>
                        </View>
                      </View>
                    );
                  }
                  return (
                    <Timer
                      size={16}
                      color={hasAnyTimer ? COLORS.blue[600] : disabledColor}
                    />
                  );
                })()}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDecrementSetGroup(item, setGroup.id)}
                disabled={isActive}
                style={[
                  styles.setControlButton,
                  groupColorScheme && { backgroundColor: groupColorScheme[100] },
                  isActive && styles.setControlButton__disabled,
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Minus
                  size={16}
                  color={
                    isActive
                      ? (groupColorScheme ? groupColorScheme[400] : COLORS.slate[300])
                      : (groupColorScheme ? groupColorScheme[700] : COLORS.slate[700])
                  }
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleIncrementSetGroup(item, setGroup.id)}
                disabled={isActive}
                style={[
                  styles.setControlButton,
                  groupColorScheme && { backgroundColor: groupColorScheme[150] },
                  isActive && styles.setControlButton__disabled,
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Plus
                  size={16}
                  color={
                    isActive
                      ? (groupColorScheme ? groupColorScheme[400] : COLORS.slate[300])
                      : (groupColorScheme ? groupColorScheme[700] : COLORS.slate[700])
                  }
                />
              </TouchableOpacity>
            </View>
            {!isSelectionMode && (
              <View
                ref={(ref) => {
                  if (ref) {
                    const refKey = `${item.id}-${setGroup.id}`;
                    buttonRefsMap.current.set(refKey, ref);
                    // Also store with old key format for first set group (backward compatibility)
                    if (setGroupIndex === 0) {
                      buttonRefsMap.current.set(item.id, ref);
                    }
                  } else {
                    buttonRefsMap.current.delete(`${item.id}-${setGroup.id}`);
                    if (setGroupIndex === 0) {
                      buttonRefsMap.current.delete(item.id);
                    }
                  }
                }}
                collapsable={false}
              >
                <TouchableOpacity
                  onPress={() => {
                    if (swipedItemId) {
                      closeTrashIcon();
                    }
                    setExerciseToEdit(item);
                    setClickedSetGroupId(setGroup.id);
                    setShowEditModal(true);
                  }}
                  disabled={isActive}
                  style={styles.groupIconButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MoreVertical size={18} color={groupColorScheme ? groupColorScheme[700] : COLORS.blue[600]} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderExerciseContent = (
    item: ExerciseItem,
    groupColorScheme: typeof defaultSupersetColorScheme | typeof defaultHiitColorScheme | null,
    isFirstInGroup: boolean,
    isLastInGroup: boolean,
    isActive: boolean,
    drag?: () => void
  ) => {
    const showTrash = swipedItemId === item.id;

    // Safety check: ensure setGroups exists and is not empty
    if (!item.setGroups || item.setGroups.length === 0) {
      item.setGroups = [{
        id: `setgroup-${item.exercise.id}-${item.orderIndex}-0`,
        count: item.count || 1,
        isDropset: item.isDropset || false,
      }];
    }

    return (
      <SwipeToDelete
        onDelete={() => handleDeleteExercise(item.id)}
        disabled={isActive || isSelectionMode}
        itemId={item.id}
        isTrashVisible={showTrash}
        onShowTrash={() => setSwipedItemId(item.id)}
        onCloseTrash={closeTrashIcon}
        trashBackgroundColor={groupColorScheme ? groupColorScheme[200] : COLORS.red[100]}
        trashIconColor={groupColorScheme ? groupColorScheme[700] : COLORS.red[600]}
      >
        <View
          style={[
            styles.exerciseCard,
            styles.exerciseCard__groupChild,
            item.setGroups.length > 1 && styles.exerciseCard__groupChild__multiRow,
            groupColorScheme && {
              borderColor: groupColorScheme[200],
              backgroundColor: groupColorScheme[100],
            },
            isFirstInGroup && styles.exerciseCard__groupChild__first,
            isLastInGroup && styles.exerciseCard__groupChild__last,
            isActive && styles.exerciseCard__active,
            isActive && styles.exerciseCard__groupChild__active,
            isActive && groupColorScheme && {
              backgroundColor: groupColorScheme[100],
              borderColor: groupColorScheme[300],
            },
          ]}
        >
          <TouchableOpacity
            onLongPress={drag}
            onPress={() => {
              if (showTrash) {
                closeTrashIcon();
              }
            }}
            disabled={isActive}
            delayLongPress={150}
            activeOpacity={1}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'stretch' }}
          >
            <View
              style={[
                styles.groupChildWrapperLeft,
                groupColorScheme && { backgroundColor: groupColorScheme[200] },
                isActive && styles.groupChildWrapperLeft__active,
              ]}
            />

            <View style={{ flex: 1 }}>
              {item.setGroups.map((setGroup, index) =>
                renderSetGroupRow(
                  item,
                  setGroup,
                  index,
                  groupColorScheme,
                  isFirstInGroup,
                  isLastInGroup,
                  isActive,
                  index === 0, // Only show exercise name on first row

                )
              )}
            </View>

            <View
              style={[
                styles.groupChildWrapperRight,
                groupColorScheme && { backgroundColor: groupColorScheme[200] },
                isActive && styles.groupChildWrapperRight__active,
              ]}
            />
          </TouchableOpacity>
        </View>
      </SwipeToDelete>
    );
  };

  const renderFooterContent = (groupColorScheme: typeof defaultSupersetColorScheme | typeof defaultHiitColorScheme) => {
    return (
      <View
        style={[
          styles.groupFooter,
          {
            borderColor: groupColorScheme[200],
            backgroundColor: groupColorScheme[100],
          },
        ]}
      >
      </View>
    );
  };

  const renderItem = useCallback(({ item, drag, isActive, getIndex }: { item: DragItem; drag: () => void; isActive: boolean; getIndex?: () => number | undefined }) => {
    const itemIndex = getIndex ? (getIndex() ?? 0) : 0;

    if (item.type === 'GroupHeader') {
      const groupColorScheme = item.group.type === 'HIIT'
        ? defaultHiitColorScheme
        : defaultSupersetColorScheme;

      const isCollapsed = item.isCollapsed || collapsedGroupId === item.groupId;
      const isDraggedGroup = collapsedGroupId === item.groupId;
      const shouldRenderGhosts = isCollapsed && !isDraggedGroup;
      const isActivelyDragging = isActive && isDraggedGroup;

      const itemsInThisGroup = reorderedItems.filter(i =>
        i.groupId === item.groupId && i.type === 'Item'
      );
      const isActuallyEmpty = itemsInThisGroup.length === 0;

      return (
        <TouchableOpacity
          onLongPress={() => initiateGroupDrag(item.groupId!, drag)}
          disabled={isActive}
          delayLongPress={150}
          activeOpacity={1}
          style={[
            styles.groupHeaderContainer,
            isActive && {
              opacity: 0.9,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 20,
              zIndex: 9999,
              transform: [{ scale: 1.02 }],
              position: 'relative',
            },
          ]}
        >
          <View
            style={[
              styles.groupHeader,
              isDraggedGroup && styles.groupHeader__collapsed,
              {
                borderColor: groupColorScheme[200],
                backgroundColor: groupColorScheme[100],
              },
              isDraggedGroup && isActive && {
                borderColor: groupColorScheme[300],
                zIndex: 9999,
                elevation: 20,
              },
              isDraggedGroup && !isActive && {
                borderColor: groupColorScheme[300],
                zIndex: 900,
              },
            ]}
          >
            <View style={styles.groupHeaderContent}>
              <TouchableOpacity
                onPress={() => toggleGroupType(item.groupId!)}
                disabled={isActive}
                activeOpacity={0.7}
              >
                <Text style={[styles.groupHeaderTypeText, { color: groupColorScheme[700] }]}>
                  {item.group.type}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {isActuallyEmpty && !shouldRenderGhosts && !isActivelyDragging && (
            <View style={[
              styles.emptyGroupPlaceholder,
              {
                borderColor: groupColorScheme[200],
                backgroundColor: groupColorScheme[50],
              }
            ]}>
              <Text style={[styles.emptyGroupPlaceholderText, { color: groupColorScheme[500] }]}>
                Drag exercises here
              </Text>
            </View>
          )}

          {shouldRenderGhosts && !isActivelyDragging && (
            <View>
              {reorderedItems
                .filter((i): i is ExerciseItem => i.groupId === item.groupId && i.type === 'Item')
                .map((ghostItem, index, array) => {
                  const isFirst = index === 0;
                  const isLast = index === array.length - 1;
                  return renderExerciseContent(ghostItem, groupColorScheme, isFirst, isLast, false);
                })}
              {renderFooterContent(groupColorScheme)}
            </View>
          )}
        </TouchableOpacity>
      );
    }

    if (item.type === 'GroupFooter') {
      const isCollapsed = item.isCollapsed || collapsedGroupId === item.groupId;
      if (isCollapsed) return <View style={styles.hiddenItem} />;

      const groupColorScheme = item.group.type === 'HIIT'
        ? defaultHiitColorScheme
        : defaultSupersetColorScheme;
      return renderFooterContent(groupColorScheme);
    }

    if (item.isCollapsed || (collapsedGroupId && item.groupId === collapsedGroupId)) {
      return <View style={styles.hiddenItem} />;
    }

    const { currentGroupId, groupType, isFirstInGroup, isLastInGroup } = getItemGroupContext(itemIndex);
    const isGroupChild = !!currentGroupId;

    const groupColorScheme = groupType === 'HIIT'
      ? defaultHiitColorScheme
      : defaultSupersetColorScheme;

    if (isGroupChild) {
      return (
        <View>
          {renderExerciseContent(item, groupColorScheme, isFirstInGroup, isLastInGroup, isActive, drag)}
        </View>
      );
    }

    const isSelected = isSelectionMode && selectedExercisesForGroup.has(item.id);
    const isSelectable = isSelectionMode && item.groupId === null;
    const showTrash = swipedItemId === item.id;

    return (
      <SwipeToDelete
        onDelete={() => handleDeleteExercise(item.id)}
        disabled={isActive || isSelectionMode}
        itemId={item.id}
        isTrashVisible={showTrash}
        onShowTrash={() => setSwipedItemId(item.id)}
        onCloseTrash={closeTrashIcon}
      >
        <View
          style={[
            styles.exerciseCard,
            styles.exerciseCard__standalone,
            (!item.setGroups || item.setGroups.length === 0 ? 1 : item.setGroups.length) > 1 && styles.exerciseCard__standalone__multiRow,
            isActive && styles.exerciseCard__active,
            isSelected && styles.exerciseCard__selected,
            isSelectable && !isSelected && styles.exerciseCard__selectable,
          ]}
        >
          <TouchableOpacity
            onLongPress={isSelectionMode ? undefined : drag}
            onPress={() => {
              // Close trash icon if visible on this or another card
              if (swipedItemId) {
                closeTrashIcon();
              }
              // Then handle selection if applicable
              if (isSelectable) {
                handleExerciseSelection(item.id);
              }
            }}
            disabled={isActive && !isSelectionMode}
            delayLongPress={isSelectionMode ? 0 : 150}
            activeOpacity={1}
            style={{ flex: 1 }}
          >
            <View style={{ flex: 1 }}>
              {((!item.setGroups || item.setGroups.length === 0 ? [{
                id: `setgroup-${item.exercise.id}-${item.orderIndex}-0`,
                count: item.count || 1,
                isDropset: item.isDropset || false,
              }] : item.setGroups) as SetGroup[]).map((setGroup, index) => {
                const setGroupsArray = !item.setGroups || item.setGroups.length === 0 ? [{
                  id: `setgroup-${item.exercise.id}-${item.orderIndex}-0`,
                  count: item.count || 1,
                  isDropset: item.isDropset || false,
                }] : item.setGroups;
                const hasMultipleRows = setGroupsArray.length > 1;
                const isFirstRow = index === 0;
                const isLastRow = index === setGroupsArray.length - 1;

                return (
                  <View
                    key={setGroup.id}
                    style={[
                      styles.setGroupRow,
                      styles.setGroupRow__standalone,
                      index < setGroupsArray.length - 1 && styles.setGroupRow__standalone__notLast,
                    ]}
                  >
                    <View style={[
                      styles.exerciseCardContent,
                      styles.exerciseCardContent__standalone,
                      hasMultipleRows && styles.exerciseCardContent__standalone__multiRow,
                      hasMultipleRows && isFirstRow && styles.exerciseCardContent__standalone__multiRow__first,
                      hasMultipleRows && isLastRow && styles.exerciseCardContent__standalone__multiRow__last,
                    ]}>
                      <View style={styles.exerciseInfo}>
                        <View style={styles.exerciseNameRow}>
                          <View style={styles.setCountContainer}>
                            {setGroup.isDropset && (
                              <View style={styles.dropsetIndicator} />
                            )}
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={[
                                styles.setCountText,
                                setGroup.isWarmup && { color: COLORS.orange[500] },
                                setGroup.isFailure && { color: COLORS.red[500] },
                              ]}>{setGroup.count}</Text>
                              <Text style={styles.setCountPrefix}> x </Text>
                            </View>
                          </View>
                          <Text style={[
                            styles.exerciseName,
                            index !== 0 && { color: COLORS.slate[150] }
                          ]}>{item.exercise.name}</Text>
                        </View>
                      </View>

                      <View style={styles.exerciseRight}>
                        {!isSelectionMode && (
                          <View style={styles.setControls}>
                            <TouchableOpacity
                              onPress={() => {
                                if (swipedItemId) {
                                  closeTrashIcon();
                                }
                                handleOpenTimerForSetGroup(item, setGroup.id);
                              }}
                              disabled={isActive}
                              style={[
                                styles.setControlButton,
                                { backgroundColor: 'transparent' },
                                isActive && styles.setControlButton__disabled,
                              ]}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              {(() => {
                                const disabledColor = COLORS.slate[300];
                                const prefix = setGroup.id + '-';
                                const countWithTimers = Object.keys(setGroup.restPeriodSecondsBySetId || {}).filter(sid => {
                                  if (!sid.startsWith(prefix)) return false;
                                  const idx = parseInt(sid.slice(prefix.length), 10);
                                  return !Number.isNaN(idx) && idx >= 0 && idx < setGroup.count;
                                }).length;
                                const hasAnyTimer = setGroup.restPeriodSeconds != null || countWithTimers > 0;
                                const hasPartialTimers = countWithTimers > 0 && countWithTimers < setGroup.count;
                                if (hasPartialTimers) {
                                  return (
                                    <View style={styles.timerIconSplit}>
                                      <Timer size={16} color={disabledColor} />
                                      <View style={[styles.timerIconSplitRight, { width: 8, height: 16 }]} pointerEvents="none">
                                        <View style={{ position: 'absolute', right: 0 }}>
                                          <Timer size={16} color={COLORS.blue[600]} />
                                        </View>
                                      </View>
                                    </View>
                                  );
                                }
                                return (
                                  <Timer
                                    size={16}
                                    color={hasAnyTimer ? COLORS.blue[600] : disabledColor}
                                  />
                                );
                              })()}
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDecrementSetGroup(item, setGroup.id)}
                              disabled={isActive}
                              style={[
                                styles.setControlButton,
                                isActive && styles.setControlButton__disabled,
                              ]}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Minus size={16} color={isActive ? COLORS.slate[300] : COLORS.slate[700]} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleIncrementSetGroup(item, setGroup.id)}
                              disabled={isActive}
                              style={[
                                styles.setControlButton,
                                isActive && styles.setControlButton__disabled,
                              ]}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Plus size={16} color={isActive ? COLORS.slate[300] : COLORS.slate[700]} />
                            </TouchableOpacity>
                          </View>
                        )}
                        {isSelected && index === 0 && (
                          <View style={styles.selectedIndicator}>
                            <Check size={20} color={COLORS.green[600]} />
                          </View>
                        )}
                        {!isSelectionMode && (
                          <View
                            ref={(ref) => {
                              if (ref) {
                                const refKey = `${item.id}-${setGroup.id}`;
                                buttonRefsMap.current.set(refKey, ref);
                                // Also store with old key format for first set group (backward compatibility)
                                if (index === 0) {
                                  buttonRefsMap.current.set(item.id, ref);
                                }
                              } else {
                                buttonRefsMap.current.delete(`${item.id}-${setGroup.id}`);
                                if (index === 0) {
                                  buttonRefsMap.current.delete(item.id);
                                }
                              }
                            }}
                            collapsable={false}
                          >
                            <TouchableOpacity
                              onPress={() => {
                                if (swipedItemId) {
                                  closeTrashIcon();
                                }
                                setExerciseToEdit(item);
                                setClickedSetGroupId(setGroup.id);
                                setShowEditModal(true);
                              }}
                              disabled={isActive}
                              style={styles.groupIconButton}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <MoreVertical size={18} color={COLORS.blue[600]} />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </TouchableOpacity>
        </View>
      </SwipeToDelete>
    );
  }, [getItemGroupContext, initiateGroupDrag, collapsedGroupId, reorderedItems, toggleGroupType, isSelectionMode, selectedExercisesForGroup, handleExerciseSelection, handleIncrementSet, handleDecrementSet, swipedItemId, handleDeleteExercise, closeTrashIcon, handleToggleDropset, handleDuplicateExercise, handleToggleWarmup, handleToggleFailure]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={styles.container} edges={[]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Reorder Items</Text>
            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>

          {isSelectionMode ? (
            <View style={styles.selectionModeBanner}>
              <View style={styles.selectionModeContent}>
                <Text style={styles.selectionModeText}>
                  Select exercises to add to {pendingGroupType} group ({selectedExercisesForGroup.size} selected)
                </Text>
                <View style={styles.selectionModeButtons}>
                  <TouchableOpacity
                    onPress={handleCancelSelection}
                    style={styles.selectionCancelButton}
                  >
                    <Text style={styles.selectionCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCreateGroupWithSelectedExercises}
                    style={styles.selectionDoneButton}
                  >
                    <Text style={styles.selectionDoneButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsText}>
                Press and hold to drag • Drag headers to move entire groups
              </Text>
            </View>
          )}

          {reorderedItems.length > 0 ? (
            <DraggableFlatList<DragItem>
              data={reorderedItems}
              onDragEnd={isSelectionMode ? () => { } : handleDragEnd}
              keyExtractor={dragKeyExtractor}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              scrollEnabled={true}
              CellRendererComponent={({ children, style, ...props }: any) => (
                <View style={[style, { position: 'relative' }]} {...props}>
                  {children}
                </View>
              )}
            />

          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No items to reorder</Text>
            </View>
          )}

          {showGroupTypeModal && (
            <>
              <TouchableOpacity
                style={styles.dropdownOverlay}
                activeOpacity={1}
                onPress={() => {
                  setShowGroupTypeModal(false);
                  setExerciseToGroup(null);
                  setDropdownPosition(null);
                }}
              />
              {dropdownPosition && (
                <View
                  style={[
                    styles.groupTypeDropdown,
                    {
                      top: dropdownPosition.y,
                      left: dropdownPosition.x,
                    },
                  ]}
                  onStartShouldSetResponder={() => true}
                >
                  <TouchableOpacity
                    style={[
                      styles.groupTypeDropdownItem,
                      styles.groupTypeDropdownItemSuperset,
                    ]}
                    onPress={() => {
                      if (exerciseToGroup) {
                        setIsSelectionMode(true);
                        setPendingGroupType('Superset');
                        setPendingGroupInitialExercise(exerciseToGroup);
                        setSelectedExercisesForGroup(new globalThis.Set([exerciseToGroup.id]));
                      }
                      setShowGroupTypeModal(false);
                      setExerciseToGroup(null);
                      setDropdownPosition(null);
                    }}
                  >
                    <Text style={styles.groupTypeDropdownItemText}>Superset</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.groupTypeDropdownItem,
                      styles.groupTypeDropdownItemHiit,
                    ]}
                    onPress={() => {
                      if (exerciseToGroup) {
                        setIsSelectionMode(true);
                        setPendingGroupType('HIIT');
                        setPendingGroupInitialExercise(exerciseToGroup);
                        setSelectedExercisesForGroup(new globalThis.Set([exerciseToGroup.id]));
                      }
                      setShowGroupTypeModal(false);
                      setExerciseToGroup(null);
                      setDropdownPosition(null);
                    }}
                  >
                    <Text style={styles.groupTypeDropdownItemText}>HIIT</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {showEditModal && exerciseToEdit && (
            <>
              <TouchableOpacity
                style={styles.dropdownOverlay}
                activeOpacity={1}
                onPress={() => {
                  setShowEditModal(false);
                  setExerciseToEdit(null);
                  setClickedSetGroupId(null);
                  setEditDropdownPosition(null);
                }}
              />
              {editDropdownPosition && exerciseToEdit && (() => {
                const hasMultipleRows = clickedSetGroupId && exerciseToEdit.setGroups && exerciseToEdit.setGroups.length > 1;
                const showDeleteRow = hasMultipleRows;

                return (
                  <View
                    style={[
                      styles.editDropdown,
                      {
                        top: editDropdownPosition.y,
                        left: editDropdownPosition.x,
                      },
                    ]}
                    onStartShouldSetResponder={() => true}
                  >
                    {/* Warmup and Failure - moved to top */}
                    {clickedSetGroupId && (() => {
                      const setGroup = exerciseToEdit.setGroups.find(sg => sg.id === clickedSetGroupId);
                      const isWarmup = setGroup?.isWarmup || false;
                      const isFailure = setGroup?.isFailure || false;

                      return (
                        <View style={[
                          styles.editDropdownToggleRow,
                          defaultPopupStyles.borderRadiusFirst,
                        ]}>
                          <View style={styles.editDropdownToggleButtonsWrapper}>
                            <TouchableOpacity
                              activeOpacity={1}
                              style={[
                                styles.editDropdownToggleOption,
                                styles.editDropdownToggleOptionInactive,
                                isWarmup && styles.editDropdownToggleOptionActiveWarmup,
                              ]}
                              onPress={() => {
                                if (exerciseToEdit && clickedSetGroupId) {
                                  handleToggleWarmup(exerciseToEdit, clickedSetGroupId);
                                }
                              }}
                            >
                              <View style={styles.editDropdownToggleOptionContent}>
                                <Flame
                                  size={18}
                                  color={isWarmup ? COLORS.white : COLORS.orange[500]}
                                />
                                <Text style={[
                                  styles.editDropdownToggleOptionText,
                                  styles.editDropdownToggleOptionTextInactive,
                                  isWarmup && styles.editDropdownToggleOptionTextActive,
                                ]}>
                                  Warmup
                                </Text>
                              </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                              activeOpacity={1}
                              style={[
                                styles.editDropdownToggleOption,
                                styles.editDropdownToggleOptionInactive,
                                isFailure && styles.editDropdownToggleOptionActiveFailure,
                              ]}
                              onPress={() => {
                                if (exerciseToEdit && clickedSetGroupId) {
                                  handleToggleFailure(exerciseToEdit, clickedSetGroupId);
                                }
                              }}
                            >
                              <View style={styles.editDropdownToggleOptionContent}>
                                <Zap
                                  size={18}
                                  color={isFailure ? COLORS.white : COLORS.red[500]}
                                />
                                <Text style={[
                                  styles.editDropdownToggleOptionText,
                                  styles.editDropdownToggleOptionTextInactive,
                                  isFailure && styles.editDropdownToggleOptionTextActive,
                                ]}>
                                  Failure
                                </Text>
                              </View>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })()}

                    {/* Dropset */}
                    {clickedSetGroupId && (
                      <TouchableOpacity
                        style={[
                          styles.editDropdownItem,
                          exerciseToEdit.setGroups.find(sg => sg.id === clickedSetGroupId)?.isDropset && styles.editDropdownItemActive
                        ]}
                        onPress={() => {
                          if (exerciseToEdit && clickedSetGroupId) {
                            handleToggleDropset(exerciseToEdit, clickedSetGroupId);
                          }
                          // Don't close popup - allow user to select multiple options
                        }}
                      >
                        <View style={styles.editDropdownItemContent}>
                          <TrendingDown size={18} color={exerciseToEdit.setGroups.find(sg => sg.id === clickedSetGroupId)?.isDropset ? COLORS.white : COLORS.indigo[400]} />
                          <Text style={[
                            styles.editDropdownItemText,
                            exerciseToEdit.setGroups.find(sg => sg.id === clickedSetGroupId)?.isDropset && { color: COLORS.white }
                          ]}>Dropset</Text>
                        </View>
                      </TouchableOpacity>
                    )}

                    {/* Create Group */}
                    {exerciseToEdit.groupId === null && (
                      <TouchableOpacity
                        style={styles.editDropdownItem}
                        onPress={() => {
                          if (exerciseToEdit) {
                            setExerciseToGroup(exerciseToEdit);
                            setShowGroupTypeModal(true);
                          }
                          setShowEditModal(false);
                          setExerciseToEdit(null);
                          setClickedSetGroupId(null);
                          setEditDropdownPosition(null);
                        }}
                      >
                        <View style={styles.editDropdownItemContent}>
                          <Users size={18} color={COLORS.white} />
                          <Text style={styles.editDropdownItemText}>Create Superset / HIIT</Text>
                        </View>
                      </TouchableOpacity>
                    )}

                    {/* Edit Sets */}
                    <TouchableOpacity
                      style={styles.editDropdownItem}
                      onPress={() => {
                        if (exerciseToEdit) {
                          handleEditSets(exerciseToEdit);
                        }
                      }}
                    >
                      <View style={styles.editDropdownItemContent}>
                        <Layers size={18} color={COLORS.white} />
                        <Text style={styles.editDropdownItemText}>Edit Sets</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Duplicate Exercise + Delete Exercise */}
                    <View style={[
                      styles.editDropdownItemRow,
                      !showDeleteRow && styles.editDropdownItemRowLast,
                    ]}>
                      <TouchableOpacity
                        style={[
                          styles.editDropdownItemInRow,
                          styles.editDropdownItemInRowFlex,
                          styles.editDropdownItemInRowWithBorder,
                          !showDeleteRow && { borderBottomLeftRadius: 8 },
                        ]}
                        onPress={() => {
                          if (exerciseToEdit) {
                            handleDuplicateExercise(exerciseToEdit);
                          }
                          setShowEditModal(false);
                          setExerciseToEdit(null);
                          setClickedSetGroupId(null);
                          setEditDropdownPosition(null);
                        }}
                      >
                        <View style={styles.editDropdownItemContent}>
                          <Copy size={18} color={COLORS.white} />
                          <Text style={styles.editDropdownItemText}>Duplicate</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.editDropdownItemDelete,
                          !showDeleteRow && { borderBottomRightRadius: 8 },
                        ]}
                        onPress={() => {
                          if (exerciseToEdit) {
                            handleDeleteExercise(exerciseToEdit.id);
                          }
                          setShowEditModal(false);
                          setExerciseToEdit(null);
                          setClickedSetGroupId(null);
                          setEditDropdownPosition(null);
                        }}
                      >
                        <View style={styles.editDropdownItemContent}>
                          <Trash2 size={18} color={COLORS.white} />
                        </View>
                      </TouchableOpacity>
                    </View>

                    {/* Delete Row - only show if there are multiple rows */}
                    {showDeleteRow && (
                      <TouchableOpacity
                        style={[
                          styles.editDropdownItem,
                          defaultPopupStyles.borderBottomLast,
                          defaultPopupStyles.borderRadiusLast,
                        ]}
                        onPress={() => {
                          if (exerciseToEdit && clickedSetGroupId) {
                            handleDeleteSetGroup(exerciseToEdit, clickedSetGroupId);
                          }
                          setShowEditModal(false);
                          setExerciseToEdit(null);
                          setClickedSetGroupId(null);
                          setEditDropdownPosition(null);
                        }}
                      >
                        <View style={styles.editDropdownItemContent}>
                          <Trash2 size={18} color={COLORS.red[500]} />
                          <Text style={[styles.editDropdownItemText, { color: COLORS.red[500] }]}>Delete Row</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })()}
            </>
          )}

          {/* SetDragModal for editing sets */}
          {showSetDragModal && exerciseForSetDrag && (
            <SetDragModal
              visible={showSetDragModal}
              exercise={{
                instanceId: exerciseForSetDrag.id,
                exerciseId: exerciseForSetDrag.exercise.id,
                name: exerciseForSetDrag.exercise.name,
                category: exerciseForSetDrag.exercise.category,
                type: 'exercise',
                sets: (() => {
                  const sets: Set[] = [];
                  setDragItems.forEach(item => {
                    if (item.type === 'set') {
                      sets.push(item.set);
                    }
                  });
                  return sets;
                })(),
                weightUnit: 'lbs' as const,
              }}
              setDragItems={setDragItems}
              onDragEnd={handleSetDragEnd}
              onCancel={handleSetDragCancel}
              onSave={handleSetDragSave}
              onCreateDropset={handleCreateDropset}
              onUpdateSet={handleUpdateSet}
              onAddSet={handleAddSet}
              onUpdateRestTimer={handleUpdateRestTimer}
              onUpdateRestTimerMultiple={handleUpdateRestTimerMultiple}
              initialAddTimerMode={initialAddTimerMode}
              initialSelectedSetIds={initialSelectedSetIds}
            />
          )}

        </SafeAreaView>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.slate[50],
    paddingBottom: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 64,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[200],
    backgroundColor: COLORS.white,
    marginTop: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.slate[900],
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelButtonText: {
    fontSize: 16,
    color: COLORS.slate[600],
  },
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.green[500],
    borderRadius: 6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  instructionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.blue[50],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.blue[100],
    alignItems: 'center',
  },
  instructionsText: {
    fontSize: 12,
    color: COLORS.blue[700],
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.slate[500],
    textAlign: 'center',
  },
  hiddenItem: {
    height: 0,
    overflow: 'hidden',
  },
  groupHeaderContainer: {
    marginTop: 4,
    marginBottom: 0,
    position: 'relative',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 0,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  groupHeader__collapsed: {
    borderBottomWidth: 2,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderStyle: 'dashed',
    marginBottom: 4,
    zIndex: 999,
    elevation: 10,
  },
  groupHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupHeaderTypeText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupHeaderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  groupHeaderBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  groupFooter: {
    paddingHorizontal: 12,
    paddingVertical: 2,
    marginBottom: 4,
    marginHorizontal: 0,
    borderWidth: 2,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginVertical: 0,
    overflow: 'hidden',
  },
  exerciseCard__standalone: {
    backgroundColor: COLORS.white,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.slate[200],
    marginVertical: 2,
    marginHorizontal: 0,
  },
  exerciseCard__standalone__multiRow: {
    // Container style for standalone exercises with multiple set rows
  },
  exerciseCard__groupChild: {
    marginHorizontal: 0,
    borderWidth: 0,
  },
  exerciseCard__groupChild__multiRow: {
    // Container style for group child exercises with multiple set rows
  },
  exerciseCard__groupChild__first: {},
  exerciseCard__groupChild__last: {},
  exerciseCard__active: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.slate[300],
    borderStyle: 'dashed',
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 10,
    transform: [{ scale: 1.0 }],
    zIndex: 999,
  },
  exerciseCard__groupChild__active: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    transform: [{ scale: 1.0 }],
    borderRadius: 8,
    zIndex: 999,
  },
  groupChildWrapperLeft: {
    width: 2,
    alignSelf: 'stretch',
  },
  groupChildWrapperRight: {
    width: 2,
    alignSelf: 'stretch',
  },
  exerciseCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  exerciseCardContent__standalone: {
  },
  exerciseCardContent__standalone__multiRow: {
    borderBottomWidth: 0,
    borderBottomColor: COLORS.slate[200],
    paddingVertical: 4,
  },
  exerciseCardContent__standalone__multiRow__first: {
    // First row in standalone multi-row exercise
    paddingTop: 8,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  exerciseCardContent__standalone__multiRow__last: {
    // Last row in standalone multi-row exercise
    borderBottomWidth: 0,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    paddingBottom: 8,
  },
  exerciseCardContent__groupChild: {
    marginHorizontal: 4,
    borderRadius: 0,
    marginVertical: 0,
    borderBottomWidth: 1,
    borderTopWidth: 0,
  },
  exerciseCardContent__groupChild__multiRow: {
    // Base style for individual rows in group child exercises with multiple rows
    paddingVertical: 4,
    borderBottomWidth: 0,
  },
  exerciseCardContent__groupChild__multiRow__first: {
    // First row in group child multi-row exercise
    paddingTop: 8,
  },
  exerciseCardContent__groupChild__multiRow__last: {
    // Last row in group child multi-row exercise
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  exerciseCardContent__groupChild__first: {
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderTopWidth: 0,
  },
  exerciseCardContent__groupChild__last: {
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderBottomWidth: 0,
  },
  exerciseCardContent__active: {
    borderRadius: 6,
    backgroundColor: COLORS.white,
  },
  groupChildWrapperLeft__active: {
    width: 0,
  },
  groupChildWrapperRight__active: {
    width: 0,
  },
  exerciseCardContent__groupChild__active: {
    marginHorizontal: 0,
    borderRadius: 6,
    backgroundColor: COLORS.white,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.slate[900],
  },
  setCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  setCountText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.slate[900],
  },
  setCountPrefix: {
    fontSize: 15,
    fontWeight: 'normal',
    color: COLORS.slate[500],
    marginLeft: 0,
  },
  setCountButton: {
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  exerciseMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  exerciseCategory: {
    fontSize: 12,
    color: COLORS.slate[500],
  },
  exerciseMuscle: {
    fontSize: 12,
    color: COLORS.slate[400],
  },
  exerciseRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    backgroundColor: COLORS.blue[100],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.blue[700],
  },
  setControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 4,
  },
  setControlButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: COLORS.slate[100],
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 28,
    minHeight: 28,
  },
  setControlButton__disabled: {
    opacity: 0.5,
  },
  timerIconSplit: {
    width: 16,
    height: 16,
    position: 'relative',
  },
  timerIconSplitRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    overflow: 'hidden',
  },
  groupIconButton: {
    padding: 0,
    marginLeft: 0,
  },
  emptyGroupPlaceholder: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderTopWidth: 0,
    borderBottomWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyGroupPlaceholderText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 998,
  },
  groupTypeDropdown: {
    position: 'absolute',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.slate[200],
  },
  groupTypeDropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[100],
  },
  groupTypeDropdownItemSuperset: {
    backgroundColor: defaultSupersetColorScheme[150],
  },
  groupTypeDropdownItemHiit: {
    backgroundColor: defaultHiitColorScheme[150],
    borderBottomWidth: 0,
  },
  groupTypeDropdownItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.slate[900],
    textTransform: 'uppercase',
  },
  editDropdown: {
    position: defaultPopupStyles.container.position as 'absolute',
    backgroundColor: defaultPopupStyles.container.backgroundColor,
    borderRadius: defaultPopupStyles.container.borderRadius,
    minWidth: defaultPopupStyles.container.minWidth,
    shadowColor: defaultPopupStyles.container.shadowColor,
    shadowOffset: defaultPopupStyles.container.shadowOffset,
    shadowOpacity: defaultPopupStyles.container.shadowOpacity,
    shadowRadius: defaultPopupStyles.container.shadowRadius,
    elevation: defaultPopupStyles.container.elevation,
    zIndex: defaultPopupStyles.container.zIndex,
    borderWidth: defaultPopupStyles.container.borderWidth,
    borderColor: defaultPopupStyles.container.borderColor,
  },
  editDropdownToggleRow: {
    flexDirection: defaultPopupStyles.optionToggleRow.flexDirection as 'row',
    padding: defaultPopupStyles.optionToggleRow.padding,
    margin: defaultPopupStyles.optionToggleRow.margin,
    borderRadius: defaultPopupStyles.optionToggleRow.borderRadius,
    borderBottomWidth: defaultPopupStyles.optionToggleRow.borderBottomWidth,
    borderBottomColor: defaultPopupStyles.optionToggleRow.borderBottomColor,
    flexShrink: defaultPopupStyles.optionToggleRow.flexShrink,
    flexWrap: defaultPopupStyles.optionToggleRow.flexWrap as 'nowrap',
    opacity: defaultPopupStyles.optionToggleRow.opacity,
  },
  editDropdownToggleButtonsWrapper: {
    flexDirection: defaultPopupStyles.optionToggleButtonsWrapper.flexDirection as 'row',
    backgroundColor: defaultPopupStyles.optionToggleButtonsWrapper.backgroundColor,
    padding: defaultPopupStyles.optionToggleButtonsWrapper.padding,
    margin: defaultPopupStyles.optionToggleButtonsWrapper.margin,
    flex: defaultPopupStyles.optionToggleButtonsWrapper.flex,
    width: defaultPopupStyles.optionToggleButtonsWrapper.width as '100%',
    borderRadius: defaultPopupStyles.optionToggleButtonsWrapper.borderRadius,
    opacity: defaultPopupStyles.optionToggleButtonsWrapper.opacity,
  },
  editDropdownToggleOption: {
    flex: defaultPopupStyles.optionToggleButton.flex,
    paddingVertical: defaultPopupStyles.optionToggleButton.paddingVertical,
    alignItems: defaultPopupStyles.optionToggleButton.alignItems as 'center',
    justifyContent: defaultPopupStyles.optionToggleButton.justifyContent as 'center',
    borderRadius: defaultPopupStyles.optionToggleButton.borderRadius,
    minHeight: defaultPopupStyles.optionToggleButton.minHeight,
  },
  editDropdownToggleOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editDropdownToggleOptionInactive: {
    ...defaultPopupStyles.optionToggleButtonUnselected,
  },
  editDropdownToggleOptionActiveWarmup: {
    ...defaultPopupStyles.optionToggleButtonSelected,
    ...defaultPopupStyles.optionToggleButtonSelectedWarmup,
  },
  editDropdownToggleOptionActiveFailure: {
    ...defaultPopupStyles.optionToggleButtonSelected,
    ...defaultPopupStyles.optionToggleButtonSelectedFailure,
  },
  editDropdownToggleOptionText: {
    fontSize: defaultPopupStyles.optionToggleText.fontSize,
    fontWeight: defaultPopupStyles.optionToggleText.fontWeight as 'bold',
    flexShrink: defaultPopupStyles.optionToggleText.flexShrink,
  },
  editDropdownToggleOptionTextInactive: {
    ...defaultPopupStyles.optionToggleTextUnselected,
  },
  editDropdownToggleOptionTextActive: {
    ...defaultPopupStyles.optionToggleTextSelected,
  },
  editDropdownItem: {
    ...defaultPopupStyles.option,
    ...defaultPopupStyles.optionBackground,
  },
  editDropdownItemActive: {
    ...defaultPopupStyles.optionBackgroundActive,
  },
  editDropdownItemContent: {
    flexDirection: defaultPopupStyles.optionContent.flexDirection as 'row',
    alignItems: defaultPopupStyles.optionContent.alignItems as 'center',
    gap: defaultPopupStyles.optionContent.gap,
    flexShrink: defaultPopupStyles.optionContent.flexShrink,
    flexWrap: defaultPopupStyles.optionContent.flexWrap as 'nowrap',
  },
  editDropdownItemText: {
    fontSize: defaultPopupStyles.optionText.fontSize,
    fontWeight: defaultPopupStyles.optionText.fontWeight as '600',
    color: defaultPopupStyles.optionText.color,
    flexShrink: defaultPopupStyles.optionText.flexShrink,
  },
  editDropdownItemRow: {
    flexDirection: defaultPopupStyles.optionRow.flexDirection as 'row',
    alignItems: defaultPopupStyles.optionRow.alignItems as 'stretch',
    padding: defaultPopupStyles.optionRow.padding,
    borderBottomWidth: defaultPopupStyles.optionRow.borderBottomWidth,
    borderBottomColor: defaultPopupStyles.optionRow.borderBottomColor,
    flexShrink: defaultPopupStyles.optionRow.flexShrink,
    flexWrap: defaultPopupStyles.optionRow.flexWrap as 'nowrap',
  },
  editDropdownItemRowLast: {
    ...defaultPopupStyles.borderBottomLast,
    ...defaultPopupStyles.borderRadiusLast,
  },
  editDropdownItemInRow: {
    ...defaultPopupStyles.optionInRow,
    ...defaultPopupStyles.optionBackground,
  },
  editDropdownItemInRowFlex: {
    ...defaultPopupStyles.optionFlex,
  },
  editDropdownItemInRowWithBorder: {
    ...defaultPopupStyles.optionRowWithBorder,
  },
  editDropdownItemDelete: {
    ...defaultPopupStyles.iconOnlyOption,
    ...defaultPopupStyles.optionInRow,
  },
  dropsetIndicator: {
    width: 2,
    position: 'absolute',
    left: -6,
    top: 1,
    bottom: 1,
    backgroundColor: COLORS.indigo[400],
  },
  selectionModeBanner: {
    backgroundColor: COLORS.blue[100],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.blue[200],
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  selectionModeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectionModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.blue[900],
    flex: 1,
  },
  selectionModeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  selectionCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.slate[300],
  },
  selectionCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.slate[700],
  },
  selectionDoneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: COLORS.green[500],
  },
  selectionDoneButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  exerciseCard__selected: {
    borderWidth: 2,
    borderColor: COLORS.green[500],
    backgroundColor: COLORS.green[50],
  },
  exerciseCard__selectable: {
    borderWidth: 1,
    borderColor: COLORS.blue[300],
    backgroundColor: COLORS.blue[50],
  },
  selectedIndicator: {
    marginLeft: 8,
  },
  setGroupRow: {
    borderBottomWidth: 0,
  },
  setGroupRow__first: {
    borderTopWidth: 0,
  },
  setGroupRow__last: {
    borderBottomWidth: 0,
  },
  setGroupRow__standalone: {
    borderBottomWidth: 0,
  },
  setGroupRow__standalone__notLast: {
    borderBottomWidth: 0,
    borderBottomColor: COLORS.slate[200],
  },
});

export default DragAndDropModal;
