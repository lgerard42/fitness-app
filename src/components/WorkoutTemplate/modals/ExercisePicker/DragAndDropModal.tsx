import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Edit, Check, Plus, Minus, Trash2 } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { defaultSupersetColorScheme, defaultHiitColorScheme } from '@/constants/defaultStyles';
import type { ExerciseLibraryItem, GroupType } from '@/types/workout';

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

interface DragItemBase {
  id: string;
  isCollapsed?: boolean;
  groupId?: string | null;
}

interface GroupHeaderItem extends DragItemBase {
  type: 'GroupHeader';
  group: ExerciseGroup;
  groupExercises: GroupExerciseData[];
}

interface GroupFooterItem extends DragItemBase {
  type: 'GroupFooter';
  group: ExerciseGroup;
}

interface ExerciseItem extends DragItemBase {
  type: 'Item';
  exercise: ExerciseLibraryItem;
  orderIndex: number;
  count: number;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  isDropset?: boolean;
}

type DragItem = GroupHeaderItem | GroupFooterItem | ExerciseItem;

interface DragAndDropModalProps {
  visible: boolean;
  onClose: () => void;
  selectedOrder: string[];
  exerciseGroups: ExerciseGroup[];
  groupedExercises: GroupedExercise[];
  filtered: ExerciseLibraryItem[];
  getExerciseGroup: ((index: number) => ExerciseGroup | null) | null;
  onReorder: (newOrder: string[], updatedGroups: ExerciseGroup[], dropsetExerciseIds?: string[]) => void;
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
}) => {
  const [dropsetExercises, setDropsetExercises] = useState<Set<string>>(new Set());

  const dragItems = useMemo((): DragItem[] => {
    const items: DragItem[] = [];
    const processedIndices = new Set<number>();

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

        items.push({
          id: `item-${exerciseId}-${orderIndex}`,
          type: 'Item',
          exercise: exercise,
          orderIndex: orderIndex,
          count: count,
          groupId: exerciseGroup.id,
          isFirstInGroup: isFirstInGroup,
          isLastInGroup: isLastInGroup,
          isDropset: dropsetExercises.has(exerciseId),
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

        items.push({
          id: `item-${exerciseId}-${orderIndex}`,
          type: 'Item',
          exercise: exercise,
          orderIndex: orderIndex,
          count: groupedExercise ? groupedExercise.count : 1,
          groupId: null,
          isFirstInGroup: false,
          isLastInGroup: false,
          isDropset: dropsetExercises.has(exerciseId),
        });
      }
    });

    return items;
  }, [selectedOrder, exerciseGroups, groupedExercises, filtered, getExerciseGroup, dropsetExercises]);

  const [reorderedItems, setReorderedItems] = useState<DragItem[]>(dragItems);
  const [collapsedGroupId, setCollapsedGroupId] = useState<string | null>(null);
  const [showGroupTypeModal, setShowGroupTypeModal] = useState(false);
  const [exerciseToGroup, setExerciseToGroup] = useState<ExerciseItem | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ x: number; y: number } | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedExercisesForGroup, setSelectedExercisesForGroup] = useState<Set<string>>(new Set());
  const [pendingGroupType, setPendingGroupType] = useState<GroupType | null>(null);
  const [pendingGroupInitialExercise, setPendingGroupInitialExercise] = useState<ExerciseItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState<ExerciseItem | null>(null);
  const [editDropdownPosition, setEditDropdownPosition] = useState<{ x: number; y: number } | null>(null);
  const buttonRefsMap = useRef<Map<string, any>>(new Map());
  const prevVisibleRef = useRef(visible);
  const pendingDragRef = useRef<(() => void) | null>(null);
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null);
  const swipeTranslations = useRef<Map<string, Animated.Value>>(new Map());
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
      setSelectedExercisesForGroup(new Set());
      setPendingGroupType(null);
      setPendingGroupInitialExercise(null);
      setShowEditModal(false);
      setExerciseToEdit(null);
      setEditDropdownPosition(null);
      setDropsetExercises(new Set());
      pendingDragRef.current = null;
      setSwipedItemId(null);
      // Reset all swipe translations
      swipeTranslations.current.forEach((value) => {
        value.setValue(0);
      });
      swipeTranslations.current.clear();
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
        const buttonRef = buttonRefsMap.current.get(exerciseToEdit.id);
        if (buttonRef) {
          buttonRef.measureInWindow((pageX: number, pageY: number, pageWidth: number, pageHeight: number) => {
            const dropdownWidth = 140;
            const padding = 16;
            let x = pageX + pageWidth - dropdownWidth;

            // Ensure dropdown doesn't go off the left edge
            if (x < padding) {
              x = padding;
            }

            // Ensure dropdown doesn't go off the right edge
            if (x + dropdownWidth > screenWidth - padding) {
              x = screenWidth - dropdownWidth - padding;
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
  }, [showEditModal, exerciseToEdit, screenWidth]);

  const collapseGroup = useCallback((items: DragItem[], groupId: string): DragItem[] => {
    return items.map(item => {
      if (item.type === 'Item' && item.groupId === groupId) {
        return { ...item, isCollapsed: true };
      }
      if (item.type === 'GroupHeader' && item.groupId === groupId) {
        return { ...item, isCollapsed: true, id: `${item.id}-col` };
      }
      if (item.type === 'GroupFooter' && item.groupId === groupId) {
        return { ...item, isCollapsed: true };
      }
      return item;
    });
  }, []);

  const collapseAllOtherGroups = useCallback((items: DragItem[], draggedGroupId: string): DragItem[] => {
    const otherGroupIds = new Set<string>();
    items.forEach(item => {
      if (item.groupId && item.groupId !== draggedGroupId) {
        otherGroupIds.add(item.groupId);
      }
    });

    return items.map(item => {
      if (item.groupId && otherGroupIds.has(item.groupId)) {
        if (item.type === 'GroupHeader' || item.type === 'Item' || item.type === 'GroupFooter') {
          return { ...item, isCollapsed: true };
        }
      }
      return item;
    });
  }, []);

  const expandAllGroups = useCallback((items: DragItem[]): DragItem[] => {
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
          return rest as DragItem;
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
            return rest as DragItem;
          }
          return item;
        });
        return;
      }

      const groupItems: DragItem[] = [];
      result.forEach(item => {
        if (item.groupId === groupId && (item.type === 'Item' || item.type === 'GroupFooter')) {
          if (item.isCollapsed) {
            const { isCollapsed, ...rest } = item;
            groupItems.push(rest as DragItem);
          } else {
            groupItems.push(item);
          }
        }
      });

      groupItems.sort((a, b) => {
        if (a.type === 'GroupFooter') return 1;
        if (b.type === 'GroupFooter') return -1;
        const aOrder = a.type === 'Item' ? (a.orderIndex || 0) : 0;
        const bOrder = b.type === 'Item' ? (b.orderIndex || 0) : 0;
        return aOrder - bOrder;
      });

      const newResult: DragItem[] = [];

      for (let i = 0; i < headerIndex; i++) {
        if (result[i].groupId !== groupId || result[i].type === 'GroupHeader') {
          newResult.push(result[i]);
        }
      }

      const header = result[headerIndex];
      if (header.type === 'GroupHeader') {
        const { isCollapsed, id, ...headerRest } = header;
        const originalId = id.endsWith('-col') ? id.slice(0, -4) : id;
        newResult.push({ ...headerRest, id: originalId });
      }

      newResult.push(...groupItems);

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
        return rest as DragItem;
      }
      return item;
    });
  }, []);

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
  const closeTrashIcon = useCallback((itemId?: string) => {
    const idToClose = itemId || swipedItemId;
    if (!idToClose) return;

    const translateX = swipeTranslations.current.get(idToClose);
    if (translateX) {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
    setSwipedItemId(null);
  }, [swipedItemId]);

  const handleExerciseSelection = useCallback((exerciseId: string) => {
    if (!isSelectionMode) return;

    // Close trash icon if visible
    if (swipedItemId) {
      closeTrashIcon();
    }

    // Prevent deselection of the initial exercise
    if (pendingGroupInitialExercise && exerciseId === pendingGroupInitialExercise.id) {
      return;
    }

    setSelectedExercisesForGroup(prev => {
      const newSet = new Set(prev);
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
    setSelectedExercisesForGroup(new Set());
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
    setReorderedItems(prev => {
      return prev.map(item => {
        if (item.id === exerciseItem.id && item.type === 'Item') {
          return {
            ...item,
            count: item.count + 1,
          };
        }
        return item;
      });
    });
  }, []);

  const handleDecrementSet = useCallback((exerciseItem: ExerciseItem) => {
    if (exerciseItem.count <= 1) return;

    setReorderedItems(prev => {
      return prev.map(item => {
        if (item.id === exerciseItem.id && item.type === 'Item' && item.count > 1) {
          return {
            ...item,
            count: item.count - 1,
          };
        }
        return item;
      });
    });
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
      setSwipedItemId(null);
      const translation = swipeTranslations.current.get(itemId);
      if (translation) {
        translation.setValue(0);
        swipeTranslations.current.delete(itemId);
      }

      return newItems;
    });
  }, []);

  const handleToggleDropset = useCallback((exerciseItem: ExerciseItem) => {
    setDropsetExercises(prev => {
      const newSet = new Set(prev);
      const wasDropset = newSet.has(exerciseItem.exercise.id);
      if (wasDropset) {
        newSet.delete(exerciseItem.exercise.id);
      } else {
        newSet.add(exerciseItem.exercise.id);
      }

      // Update reorderedItems to reflect dropset state
      setReorderedItems(prevItems => prevItems.map(item => {
        if (item.id === exerciseItem.id && item.type === 'Item') {
          return {
            ...item,
            isDropset: !wasDropset
          };
        }
        return item;
      }));

      return newSet;
    });
  }, []);

  const handleDuplicateExercise = useCallback((exerciseItem: ExerciseItem) => {
    setReorderedItems(prev => {
      const itemIndex = prev.findIndex(item => item.id === exerciseItem.id);
      if (itemIndex === -1) return prev;

      const newItems = [...prev];
      const duplicate: ExerciseItem = {
        ...exerciseItem,
        id: `item-${exerciseItem.exercise.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

  // Helper functions for gesture callbacks (called via runOnJS)
  const updateSwipeTranslation = useCallback((itemId: string, value: number) => {
    const translateX = swipeTranslations.current.get(itemId);
    if (translateX) {
      // Only allow left swipes (negative) or right swipes when trash is visible
      if (value < 0 || (value >= 0 && swipedItemId === itemId)) {
        translateX.setValue(value);
      }
    }
  }, [swipedItemId]);

  const handleSwipeEnd = useCallback((itemId: string, translationX: number, velocityX: number) => {
    const swipeDistance = Math.abs(translationX);
    const swipeVelocity = Math.abs(velocityX);
    const cardWidth = screenWidth * 0.9;
    const swipeThreshold = cardWidth * 0.7;
    const velocityThreshold = 500;

    const translateXValue = swipeTranslations.current.get(itemId);
    if (!translateXValue) return;

    if (swipeDistance > swipeThreshold || swipeVelocity > velocityThreshold) {
      // Clear intention: immediate deletion
      handleDeleteExercise(itemId);
      translateXValue.setValue(0);
      swipeTranslations.current.delete(itemId);
    } else if (swipeDistance > 50) {
      // Ambiguous swipe: show trash icon
      if (swipedItemId && swipedItemId !== itemId) {
        const prevTranslation = swipeTranslations.current.get(swipedItemId);
        if (prevTranslation) {
          Animated.spring(prevTranslation, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }).start();
        }
      }
      setSwipedItemId(itemId);
      Animated.spring(translateXValue, {
        toValue: -60,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else if (swipedItemId === itemId) {
      // If trash is visible, any swipe (including right) should close it
      if (translationX > -50) {
        // Swiping right to close
        Animated.spring(translateXValue, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
        setSwipedItemId(null);
      } else {
        // Small left swipe when trash visible: keep trash visible
        Animated.spring(translateXValue, {
          toValue: -60,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      }
    } else {
      // Small swipe: reset
      Animated.spring(translateXValue, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
      if (swipedItemId === itemId) {
        setSwipedItemId(null);
      }
    }
  }, [screenWidth, handleDeleteExercise, swipedItemId]);

  const createSwipeGesture = useCallback((itemId: string, isActive: boolean) => {
    return Gesture.Pan()
      .enabled(!isActive && !isSelectionMode)
      .activeOffsetX([-10, 10])
      .failOffsetY([-20, 20])
      .onUpdate((e) => {
        'worklet';
        // Allow both left and right swipes
        runOnJS(updateSwipeTranslation)(itemId, e.translationX);
      })
      .onEnd((e) => {
        'worklet';
        runOnJS(handleSwipeEnd)(itemId, e.translationX, e.velocityX);
      });
  }, [isSelectionMode, updateSwipeTranslation, handleSwipeEnd]);

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

  const initiateGroupDrag = useCallback((groupId: string, drag: () => void) => {
    let collapsed = collapseGroup(reorderedItems, groupId);
    collapsed = collapseAllOtherGroups(collapsed, groupId);

    setReorderedItems(collapsed);
    setCollapsedGroupId(groupId);
    pendingDragRef.current = drag;
  }, [reorderedItems, collapseGroup, collapseAllOtherGroups]);

  const handleDragEnd = useCallback(({ data, from, to }: { data: DragItem[]; from: number; to: number }) => {
    let updatedData = data;
    if (collapsedGroupId) {
      updatedData = expandAllGroups(data);
      setCollapsedGroupId(null);
    }

    updatedData = updatedData.map((item, index) => {
      if (item.type !== 'Item') return item;

      let foundGroupId: string | null = null;

      for (let i = index - 1; i >= 0; i--) {
        const prevItem = updatedData[i];
        if (prevItem.type === 'GroupHeader') {
          const groupId = prevItem.groupId;
          if (!groupId) continue;
          for (let j = index + 1; j < updatedData.length; j++) {
            const nextItem = updatedData[j];
            if (nextItem.type === 'GroupFooter' && nextItem.groupId === groupId) {
              foundGroupId = groupId;
              break;
            }
            if (nextItem.type === 'GroupHeader') break;
          }
          break;
        }
      }

      if (foundGroupId) {
        return {
          ...item,
          groupId: foundGroupId,
          isFirstInGroup: false,
          isLastInGroup: false,
        };
      } else {
        if (item.groupId) {
          const { groupId, ...rest } = item;
          return rest as ExerciseItem;
        }
        return item;
      }
    });

    setReorderedItems(updatedData);
    pendingDragRef.current = null;
  }, [collapsedGroupId, expandAllGroups]);

  const keyExtractor = useCallback((item: DragItem) => item.id, []);

  const handleSave = useCallback(() => {
    if (!onReorder) return;

    let finalItems = reorderedItems;
    if (collapsedGroupId) {
      finalItems = expandAllGroups(reorderedItems);
    }

    const newOrder: string[] = [];
    const updatedGroups: ExerciseGroup[] = [];

    let currentGroup: ExerciseGroup | null = null;
    let currentGroupIndices: number[] = [];

    finalItems.forEach((item) => {
      if (item.type === 'GroupHeader') {
        currentGroup = { ...item.group };
        currentGroupIndices = [];
      } else if (item.type === 'Item') {
        const count = item.count || 1;
        for (let i = 0; i < count; i++) {
          if (currentGroup) {
            currentGroupIndices.push(newOrder.length);
          }
          newOrder.push(item.exercise.id);
        }
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

    // Collect dropset exercise IDs from finalItems
    const dropsetExerciseIds: string[] = [];
    finalItems.forEach((item) => {
      if (item.type === 'Item' && item.isDropset) {
        if (!dropsetExerciseIds.includes(item.exercise.id)) {
          dropsetExerciseIds.push(item.exercise.id);
        }
      }
    });

    onReorder(newOrder, updatedGroups, dropsetExerciseIds);
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

  const renderExerciseContent = (
    item: ExerciseItem,
    groupColorScheme: typeof defaultSupersetColorScheme | typeof defaultHiitColorScheme | null,
    isFirstInGroup: boolean,
    isLastInGroup: boolean,
    isActive: boolean
  ) => {
    // Ensure animated value exists before creating gesture
    if (!swipeTranslations.current.has(item.id)) {
      swipeTranslations.current.set(item.id, new Animated.Value(0));
    }
    const translateX = swipeTranslations.current.get(item.id)!;
    const swipeGesture = createSwipeGesture(item.id, isActive);
    const showTrash = swipedItemId === item.id;

    // Calculate red bar width based on swipe distance
    const redBarWidth = translateX.interpolate({
      inputRange: [-screenWidth * 0.9, 0],
      outputRange: [screenWidth * 0.9, 0],
      extrapolate: 'clamp',
    });
    // Only show red bar when swiping left (negative translation)
    const redBarOpacity = translateX.interpolate({
      inputRange: [-screenWidth * 0.9, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.swipeContainer}>
        {/* Red deletion indicator bar */}
        <Animated.View
          style={[
            styles.swipeIndicatorBar,
            {
              width: redBarWidth,
              opacity: redBarOpacity,
            },
          ]}
        />

        {/* Trash icon background */}
        {showTrash && (
          <View style={[styles.swipeDeleteBackground, groupColorScheme && { backgroundColor: groupColorScheme[200] }]}>
            <TouchableOpacity
              onPress={() => handleDeleteExercise(item.id)}
              style={styles.swipeDeleteButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Trash2 size={20} color={groupColorScheme ? groupColorScheme[700] : COLORS.red[600]} />
            </TouchableOpacity>
          </View>
        )}

        <GestureDetector gesture={swipeGesture}>
          <Animated.View
            style={[
              styles.exerciseCard,
              styles.exerciseCard__groupChild,
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
              {
                transform: [{ translateX }],
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                if (showTrash) {
                  closeTrashIcon(item.id);
                }
              }}
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

              <View style={[
                styles.exerciseCardContent,
                styles.exerciseCardContent__groupChild,
                groupColorScheme && { backgroundColor: groupColorScheme[50], borderBottomColor: groupColorScheme[200], borderColor: groupColorScheme[150] },
                isActive && groupColorScheme && { backgroundColor: groupColorScheme[100] },
                isFirstInGroup && styles.exerciseCardContent__groupChild__first,
                isFirstInGroup && groupColorScheme && { borderTopColor: groupColorScheme[200] },
                isLastInGroup && styles.exerciseCardContent__groupChild__last,
                isActive && styles.exerciseCardContent__active,
                isActive && styles.exerciseCardContent__groupChild__active,
              ]}>
                <View style={styles.exerciseInfo}>
                  <View style={styles.exerciseNameRow}>
                    <View style={styles.setCountContainer}>
                      {item.isDropset && (
                        <View
                          style={[
                            styles.dropsetIndicator,
                            groupColorScheme && { backgroundColor: COLORS.orange[500] }
                          ]}
                        />
                      )}
                      <Text style={styles.setCountText}>{item.count} x</Text>
                    </View>
                    <Text style={styles.exerciseName}>{item.exercise.name}</Text>
                  </View>
                </View>

                <View style={styles.exerciseRight}>
                  <View style={styles.setControls}>
                    <TouchableOpacity
                      onPress={() => handleDecrementSet(item)}
                      disabled={isActive || item.count <= 1}
                      style={[
                        styles.setControlButton,
                        groupColorScheme && { backgroundColor: groupColorScheme[100] },
                        (isActive || item.count <= 1) && styles.setControlButton__disabled,
                      ]}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Minus
                        size={16}
                        color={
                          item.count <= 1
                            ? (groupColorScheme ? groupColorScheme[700] : COLORS.slate[300])
                            : (groupColorScheme ? groupColorScheme[700] : COLORS.slate[700])
                        }
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleIncrementSet(item)}
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
                          buttonRefsMap.current.set(item.id, ref);
                        } else {
                          buttonRefsMap.current.delete(item.id);
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
                          setShowEditModal(true);
                        }}
                        disabled={isActive}
                        style={styles.groupIconButton}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Edit size={18} color={groupColorScheme ? groupColorScheme[700] : COLORS.blue[600]} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              <View
                style={[
                  styles.groupChildWrapperRight,
                  groupColorScheme && { backgroundColor: groupColorScheme[200] },
                  isActive && styles.groupChildWrapperRight__active,
                ]}
              />
            </TouchableOpacity>
          </Animated.View>
        </GestureDetector>
      </View>
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
        <TouchableOpacity
          onLongPress={drag}
          onPress={() => {
            // Close trash icon if visible on any card
            if (swipedItemId) {
              closeTrashIcon();
            }
          }}
          disabled={isActive}
          delayLongPress={150}
          activeOpacity={1}
        >
          {renderExerciseContent(item, groupColorScheme, isFirstInGroup, isLastInGroup, isActive)}
        </TouchableOpacity>
      );
    }

    const isSelected = isSelectionMode && selectedExercisesForGroup.has(item.id);
    const isSelectable = isSelectionMode && item.groupId === null;
    // Ensure animated value exists before creating gesture
    if (!swipeTranslations.current.has(item.id)) {
      swipeTranslations.current.set(item.id, new Animated.Value(0));
    }
    const translateX = swipeTranslations.current.get(item.id)!;
    const swipeGesture = createSwipeGesture(item.id, isActive);
    const showTrash = swipedItemId === item.id;

    // Calculate red bar width based on swipe distance
    const redBarWidth = translateX.interpolate({
      inputRange: [-screenWidth * 0.9, 0],
      outputRange: [screenWidth * 0.9, 0],
      extrapolate: 'clamp',
    });
    // Only show red bar when swiping left (negative translation)
    const redBarOpacity = translateX.interpolate({
      inputRange: [-screenWidth * 0.9, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.swipeContainer}>
        {/* Red deletion indicator bar */}
        <Animated.View
          style={[
            styles.swipeIndicatorBar,
            {
              width: redBarWidth,
              opacity: redBarOpacity,
            },
          ]}
        />

        {/* Trash icon background */}
        {showTrash && (
          <View style={styles.swipeDeleteBackground}>
            <TouchableOpacity
              onPress={() => handleDeleteExercise(item.id)}
              style={styles.swipeDeleteButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Trash2 size={20} color={COLORS.red[600]} />
            </TouchableOpacity>
          </View>
        )}

        <GestureDetector gesture={swipeGesture}>
          <Animated.View
            style={[
              styles.exerciseCard,
              styles.exerciseCard__standalone,
              isActive && styles.exerciseCard__active,
              isSelected && styles.exerciseCard__selected,
              isSelectable && !isSelected && styles.exerciseCard__selectable,
              {
                transform: [{ translateX }],
              },
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
              <View style={[styles.exerciseCardContent, styles.exerciseCardContent__standalone]}>
                <View style={styles.exerciseInfo}>
                  <View style={styles.exerciseNameRow}>
                    <View style={styles.setCountContainer}>
                      {item.isDropset && (
                        <View style={[styles.dropsetIndicator, { backgroundColor: COLORS.orange[500] }]} />
                      )}
                      <Text style={styles.setCountText}>{item.count} x </Text>
                    </View>
                    <Text style={styles.exerciseName}>{item.exercise.name}</Text>
                  </View>
                </View>

                <View style={styles.exerciseRight}>
                  {!isSelectionMode && (
                    <View style={styles.setControls}>
                      <TouchableOpacity
                        onPress={() => handleDecrementSet(item)}
                        disabled={isActive || item.count <= 1}
                        style={[
                          styles.setControlButton,
                          (isActive || item.count <= 1) && styles.setControlButton__disabled,
                        ]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Minus size={16} color={item.count <= 1 ? COLORS.slate[300] : COLORS.slate[700]} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleIncrementSet(item)}
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
                  {isSelected && (
                    <View style={styles.selectedIndicator}>
                      <Check size={20} color={COLORS.green[600]} />
                    </View>
                  )}
                  {!isSelectionMode && (
                    <View
                      ref={(ref) => {
                        if (ref) {
                          buttonRefsMap.current.set(item.id, ref);
                        } else {
                          buttonRefsMap.current.delete(item.id);
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
                          setShowEditModal(true);
                        }}
                        disabled={isActive}
                        style={styles.groupIconButton}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Edit size={18} color={COLORS.blue[600]} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </GestureDetector>
      </View>
    );
  }, [getItemGroupContext, initiateGroupDrag, collapsedGroupId, reorderedItems, toggleGroupType, isSelectionMode, selectedExercisesForGroup, handleExerciseSelection, handleIncrementSet, handleDecrementSet, createSwipeGesture, swipedItemId, handleDeleteExercise, closeTrashIcon, screenWidth, handleToggleDropset, handleDuplicateExercise]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
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
            keyExtractor={keyExtractor}
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
                      setSelectedExercisesForGroup(new Set([exerciseToGroup.id]));
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
                      setSelectedExercisesForGroup(new Set([exerciseToGroup.id]));
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
                setEditDropdownPosition(null);
              }}
            />
            {editDropdownPosition && (
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
                {exerciseToEdit && exerciseToEdit.groupId === null && (
                  <TouchableOpacity
                    style={styles.editDropdownItem}
                    onPress={() => {
                      if (exerciseToEdit) {
                        setExerciseToGroup(exerciseToEdit);
                        setShowGroupTypeModal(true);
                      }
                      setShowEditModal(false);
                      setExerciseToEdit(null);
                      setEditDropdownPosition(null);
                    }}
                  >
                    <Text style={styles.editDropdownItemText}>Create Group</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.editDropdownItem}
                  onPress={() => {
                    if (exerciseToEdit) {
                      handleDuplicateExercise(exerciseToEdit);
                    }
                    setShowEditModal(false);
                    setExerciseToEdit(null);
                    setEditDropdownPosition(null);
                  }}
                >
                  <Text style={styles.editDropdownItemText}>Duplicate</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.editDropdownItem,
                    exerciseToEdit && exerciseToEdit.isDropset && styles.editDropdownItemActive
                  ]}
                  onPress={() => {
                    if (exerciseToEdit) {
                      handleToggleDropset(exerciseToEdit);
                    }
                    setShowEditModal(false);
                    setExerciseToEdit(null);
                    setEditDropdownPosition(null);
                  }}
                >
                  <Text style={styles.editDropdownItemText}>Dropset</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </SafeAreaView>
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
  exerciseCard__groupChild: {
    marginHorizontal: 0,
    borderWidth: 0,
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
    transform: [{ scale: 1.02 }],
    zIndex: 999,
  },
  exerciseCard__groupChild__active: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    transform: [{ scale: 1.02 }],
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
    paddingVertical: 8,
  },
  exerciseCardContent__groupChild: {
    marginHorizontal: 4,
    borderRadius: 0,
    marginVertical: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.red[500],
  },
  exerciseCardContent__groupChild__first: {
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  exerciseCardContent__groupChild__last: {
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderBottomColor: 'transparent',
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
    gap: 8,
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
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.slate[600],
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
  groupIconButton: {
    padding: 4,
    marginLeft: 4,
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
  swipeContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  swipeIndicatorBar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.red[500],
    zIndex: 0,
  },
  swipeDeleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: COLORS.red[100],
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  swipeDeleteButton: {
    padding: 12,
    borderRadius: 6,
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
  editDropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[100],
  },
  editDropdownItemActive: {
    backgroundColor: COLORS.orange[50],
  },
  editDropdownItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.slate[900],
    textTransform: 'none',
  },
  dropsetIndicator: {
    width: 2,
    position: 'absolute',
    left: -4,
    top: 0,
    bottom: 0,
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
});

export default DragAndDropModal;
