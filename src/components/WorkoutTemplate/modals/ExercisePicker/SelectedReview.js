import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ChevronDown, ChevronUp, ChevronLeft } from 'lucide-react-native';
import { COLORS } from '../../../../constants/colors';
import { defaultSupersetColorScheme, defaultHiitColorScheme } from '../../../../constants/defaultStyles';
import ExerciseListItem from './ExerciseListItem';

const LONG_PRESS_DURATION = 500; // ms to activate drag mode (increased for better detection)

// Wrapper component for draggable items
const DraggableWrapper = ({
  children,
  itemKey,
  itemType,
  itemData,
  isDragMode,
  draggedItem,
  dropTargetKey,
  dropPosition,
  onDragStart,
  onDragUpdate,
  onDragEnd,
  onLayoutChange,
  disabled,
  containerRef,
}) => {
  const viewRef = useRef(null);
  const isActiveDragRef = useRef(false);
  const startYRef = useRef(0);
  const layoutRef = useRef(null);
  
  const isDragging = isDragMode && draggedItem?.key === itemKey;
  const isDropTarget = dropTargetKey === itemKey && draggedItem?.key !== itemKey;

  const handleLayout = useCallback((event) => {
    const { y, height, width } = event.nativeEvent.layout;
    layoutRef.current = { y, height, width };
    if (onLayoutChange) {
      onLayoutChange(itemKey, { y, height, width });
    }
  }, [itemKey, onLayoutChange]);

  // Long press gesture - configured to work with TouchableOpacity
  // Using shouldCancelWhenOutside and proper configuration
  const gestureEnabled = !disabled && !isDragMode;
  
  // #region agent log
  React.useEffect(() => {
    fetch('http://127.0.0.1:7243/ingest/751917f3-6b76-4143-ba7e-6983111b1561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SelectedReview.js:47',message:'LongPress gesture created',data:{itemKey,itemType,gestureEnabled,disabled,isDragMode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  }, [itemKey, itemType, gestureEnabled, disabled, isDragMode]);
  // #endregion
  
  const longPressGesture = Gesture.LongPress()
    .minDuration(LONG_PRESS_DURATION)
    .maxDistance(20) // Allow more movement during long press
    .enabled(gestureEnabled)
    .shouldCancelWhenOutside(true)
    .onStart((event) => {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/751917f3-6b76-4143-ba7e-6983111b1561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SelectedReview.js:52',message:'LongPress onStart triggered',data:{itemKey,itemType,absoluteY:event.absoluteY},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.log('✅ Long press STARTED for:', itemKey, 'type:', itemType, 'disabled:', disabled); // Debug
      isActiveDragRef.current = true;
      startYRef.current = event.absoluteY;
      if (onDragStart) {
        onDragStart({
          key: itemKey,
          type: itemType,
          data: itemData,
          startY: event.absoluteY,
          layout: layoutRef.current,
        });
      }
    })
    .onEnd(() => {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/751917f3-6b76-4143-ba7e-6983111b1561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SelectedReview.js:65',message:'LongPress onEnd triggered',data:{itemKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.log('Long press ENDED'); // Debug
    });

  // Pan gesture for dragging - only activates after long press
  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .minDistance(0)
    .activeOffsetY([-5, 5]) // Activate on small vertical movement
    .manualActivation(true)
    .onTouchesDown((event) => {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/751917f3-6b76-4143-ba7e-6983111b1561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SelectedReview.js:75',message:'Pan onTouchesDown - touch detected',data:{itemKey,disabled,isDragMode,touchCount:event.allTouches.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
    })
    .onTouchesMove((event, stateManager) => {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/751917f3-6b76-4143-ba7e-6983111b1561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SelectedReview.js:83',message:'Pan onTouchesMove',data:{itemKey,isActiveDrag:isActiveDragRef.current,isDragMode,draggedItemKey:draggedItem?.key},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      // Activate if long press triggered or already dragging
      if (isActiveDragRef.current || (isDragMode && draggedItem?.key === itemKey)) {
        console.log('Pan gesture activated'); // Debug
        stateManager.activate();
      } else {
        stateManager.fail();
      }
    })
    .onUpdate((event) => {
      if ((isActiveDragRef.current || isDragMode) && draggedItem?.key === itemKey && onDragUpdate) {
        onDragUpdate(event.absoluteY, event.translationY);
      }
    })
    .onEnd(() => {
      if (isActiveDragRef.current || (isDragMode && draggedItem?.key === itemKey)) {
        console.log('Pan gesture ended, calling onDragEnd'); // Debug
        isActiveDragRef.current = false;
        if (onDragEnd) {
          onDragEnd();
        }
      }
    })
    .onFinalize(() => {
      isActiveDragRef.current = false;
    });

  // Use Simultaneous so long press can trigger, then pan takes over
  const composedGesture = Gesture.Simultaneous(longPressGesture, panGesture);

  // Debug: log when component renders and gesture state
  React.useEffect(() => {
    if (!disabled) {
      console.log(`DraggableWrapper rendered for ${itemKey}, canDrag: ${!disabled}, isDragMode: ${isDragMode}`);
    }
  }, [itemKey, disabled, isDragMode]);

  // Create a ref for the gesture handler to allow simultaneous gestures
  const gestureRef = useRef(null);

  // #region agent log
  React.useEffect(() => {
    fetch('http://127.0.0.1:7243/ingest/751917f3-6b76-4143-ba7e-6983111b1561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SelectedReview.js:115',message:'GestureDetector rendering',data:{itemKey,gestureEnabled,hasChildren:!!children},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  }, [itemKey, gestureEnabled, children]);
  // #endregion

  return (
    <GestureDetector 
      ref={gestureRef}
      gesture={composedGesture}
    >
      <View
        ref={viewRef}
        onLayout={handleLayout}
        onStartShouldSetResponder={() => {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/751917f3-6b76-4143-ba7e-6983111b1561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SelectedReview.js:125',message:'View onStartShouldSetResponder called',data:{itemKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
          return false; // Let gesture handler manage it
        }}
        style={[
          styles.draggableWrapper,
          isDragging && styles.draggingItem,
          isDropTarget && styles.dropTargetItem,
        ]}
        collapsable={false}
        // Important: allow touches to pass through to children for normal interactions
        // but the gesture handler will still detect long press
      >
        {children}
        {isDropTarget && (
          <View 
            style={[
              styles.dropIndicator,
              dropPosition === 'before' ? styles.dropIndicatorTop : styles.dropIndicatorBottom,
            ]} 
          />
        )}
      </View>
    </GestureDetector>
  );
};

const SelectedReview = ({
  selectedExercises,
  selectedOrder,
  groupedExercises = [],
  exerciseGroups = [],
  isCollapsed,
  setIsCollapsed,
  onToggleSelect,
  onReorder,
  onAddSet = null,
  onRemoveSet = null,
  isGroupMode = false,
  groupSelectionMode = null,
  selectedGroupType = null,
  groupSelectionIndices = [],
  setGroupSelectionIndices = null,
  setSelectedGroupType = null,
  setIsGroupMode = null,
  setGroupSelectionMode = null,
  handleStartGroupingMode = null,
  handleToggleGroupType = null,
  handleEditGroup = null,
  handleSaveGroup = null,
  handleCancelGroup = null,
  getExerciseGroup = null,
  isExerciseInGroup = null,
  editingGroupId = null,
  filtered = [],
}) => {
  const [isReordering, setIsReordering] = useState(false);
  const [reorderAssignments, setReorderAssignments] = useState({});
  const [groupReorderAssignments, setGroupReorderAssignments] = useState({});
  const [groupItemReorderAssignments, setGroupItemReorderAssignments] = useState({});
  const [editingGroupIdInReorder, setEditingGroupIdInReorder] = useState(null);

  // Drag and drop state
  const [isDragMode, setIsDragMode] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null); // { key, type: 'exercise'|'group', index, data }
  const [dropTargetKey, setDropTargetKey] = useState(null);
  const [dropPosition, setDropPosition] = useState(null); // 'before' | 'after' | 'into-group'
  
  const itemLayoutsRef = useRef({});
  const dragYRef = useRef(new Animated.Value(0)).current;
  const dragStartYRef = useRef(0);
  const scrollViewRef = useRef(null);
  const scrollOffsetRef = useRef(0);
  const containerLayoutRef = useRef({ y: 0, height: 0 });

  const assignedCount = Object.keys(reorderAssignments).length + Object.keys(groupReorderAssignments).length;

  // Register item layout for drop target detection
  const registerItemLayout = useCallback((key, layout) => {
    itemLayoutsRef.current[key] = layout;
  }, []);

  // Find the closest drop target based on drag Y position
  const findDropTarget = useCallback((dragY) => {
    const layouts = itemLayoutsRef.current;
    const entries = Object.entries(layouts);
    
    if (entries.length === 0) return { targetKey: null, position: null };
    
    let closestTarget = null;
    let closestDistance = Infinity;
    let position = 'after';
    
    entries.forEach(([key, layout]) => {
      if (!layout) return;
      
      const itemTop = layout.y - scrollOffsetRef.current;
      const itemBottom = itemTop + layout.height;
      const itemMidY = itemTop + layout.height / 2;
      
      // Check if dragging over this item
      if (dragY >= itemTop && dragY <= itemBottom) {
        const distance = Math.abs(dragY - itemMidY);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestTarget = key;
          position = dragY < itemMidY ? 'before' : 'after';
        }
      }
    });
    
    // If not directly over any item, find the closest one
    if (!closestTarget) {
      entries.forEach(([key, layout]) => {
        if (!layout) return;
        const itemTop = layout.y - scrollOffsetRef.current;
        const itemMidY = itemTop + layout.height / 2;
        const distance = Math.abs(dragY - itemMidY);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestTarget = key;
          position = dragY < itemMidY ? 'before' : 'after';
        }
      });
    }
    
    return { targetKey: closestTarget, position };
  }, []);

  // Handle drag end - compute new order
  const handleDragEnd = useCallback(() => {
    if (!draggedItem || !dropTargetKey || !onReorder) {
      setIsDragMode(false);
      setDraggedItem(null);
      setDropTargetKey(null);
      setDropPosition(null);
      return;
    }
    
    // Parse keys to get indices and types
    const draggedParts = draggedItem.key.split('-');
    const draggedType = draggedParts[0]; // 'exercise' or 'group'
    
    const targetParts = dropTargetKey.split('-');
    const targetType = targetParts[0];
    
    // Build the new order based on drag operation
    const newOrder = [];
    const processedIndices = new Set();
    
    // Get all items in their current order with their macro position info
    const macroItems = [];
    let lastGroupId = null;
    
    selectedExercises.forEach((item, index) => {
      const group = groupedExercises[index];
      const exerciseGroup = getExerciseGroup ? getExerciseGroup(group.startIndex) : null;
      
      if (exerciseGroup) {
        if (exerciseGroup.id !== lastGroupId) {
          // Get all exercises in this group
          const groupExercises = [];
          let tempIndex = index;
          while (tempIndex < selectedExercises.length) {
            const tempGroup = groupedExercises[tempIndex];
            const tempExGroup = getExerciseGroup ? getExerciseGroup(tempGroup?.startIndex) : null;
            if (tempExGroup?.id === exerciseGroup.id) {
              groupExercises.push({
                exerciseId: selectedExercises[tempIndex].id,
                index: tempIndex
              });
              tempIndex++;
            } else {
              break;
            }
          }
          macroItems.push({
            type: 'group',
            groupId: exerciseGroup.id,
            groupData: exerciseGroup,
            exercises: groupExercises,
            key: `group-${exerciseGroup.id}`,
          });
          lastGroupId = exerciseGroup.id;
        }
      } else {
        macroItems.push({
          type: 'exercise',
          exerciseId: item.id,
          index,
          key: `exercise-${item.id}-${index}`,
        });
      }
    });
    
    // Find the dragged item and target in macro items
    const draggedMacroIndex = macroItems.findIndex(m => m.key === draggedItem.key);
    const targetMacroIndex = macroItems.findIndex(m => m.key === dropTargetKey);
    
    if (draggedMacroIndex === -1 || targetMacroIndex === -1) {
      setIsDragMode(false);
      setDraggedItem(null);
      setDropTargetKey(null);
      setDropPosition(null);
      return;
    }
    
    // Remove dragged item and insert at new position
    const draggedMacro = macroItems[draggedMacroIndex];
    const reorderedMacros = [...macroItems];
    reorderedMacros.splice(draggedMacroIndex, 1);
    
    let insertIndex = targetMacroIndex;
    if (draggedMacroIndex < targetMacroIndex) {
      insertIndex--;
    }
    if (dropPosition === 'after') {
      insertIndex++;
    }
    
    reorderedMacros.splice(insertIndex, 0, draggedMacro);
    
    // Build new selectedOrder from reordered macro items
    reorderedMacros.forEach(macro => {
      if (macro.type === 'group') {
        macro.exercises.forEach(ex => {
          newOrder.push(ex.exerciseId);
        });
      } else {
        newOrder.push(macro.exerciseId);
      }
    });
    
    onReorder(newOrder);
    
    setIsDragMode(false);
    setDraggedItem(null);
    setDropTargetKey(null);
    setDropPosition(null);
  }, [draggedItem, dropTargetKey, dropPosition, onReorder, selectedExercises, groupedExercises, getExerciseGroup]);

  // Cancel drag operation
  const handleDragCancel = useCallback(() => {
    setIsDragMode(false);
    setDraggedItem(null);
    setDropTargetKey(null);
    setDropPosition(null);
  }, []);

  // Handle drag start from DraggableWrapper
  const onItemDragStart = useCallback((dragInfo) => {
    setIsDragMode(true);
    setDraggedItem({
      key: dragInfo.key,
      type: dragInfo.type,
      data: dragInfo.data,
      startY: dragInfo.startY,
      layout: dragInfo.layout,
    });
    dragStartYRef.current = dragInfo.startY;
    dragYRef.setValue(0);
  }, [dragYRef]);

  // Handle drag update - find drop target
  const onItemDragUpdate = useCallback((absoluteY, translationY) => {
    const relativeY = containerLayoutRef.current.y + translationY + (draggedItem?.layout?.y || 0);
    dragYRef.setValue(translationY);
    
    const { targetKey, position } = findDropTarget(relativeY);
    if (targetKey !== dropTargetKey || position !== dropPosition) {
      setDropTargetKey(targetKey);
      setDropPosition(position);
    }
  }, [dragYRef, findDropTarget, dropTargetKey, dropPosition, draggedItem]);

  // Handle scroll for layout offset tracking
  const onScrollViewScroll = useCallback((event) => {
    scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
  }, []);

  // Handle container layout measurement
  const onContainerLayout = useCallback((event) => {
    const { y, height } = event.nativeEvent.layout;
    containerLayoutRef.current = { y, height };
  }, []);

  const getLowestAvailableNumber = useCallback(() => {
    const assignedGroupNumbers = Object.values(groupReorderAssignments);
    const assignedItemNumbers = Object.values(reorderAssignments);
    const allAssignedNumbers = [...assignedGroupNumbers, ...assignedItemNumbers];
    const totalMacroItems = getTotalMacroItems();
    for (let i = 1; i <= totalMacroItems; i++) {
      if (!allAssignedNumbers.includes(i)) {
        return i;
      }
    }
    return totalMacroItems + 1;
  }, [reorderAssignments, groupReorderAssignments, getTotalMacroItems]);

  const getTotalMacroItems = useCallback(() => {
    let count = 0;
    let lastGroupId = null;
    selectedExercises.forEach((item, index) => {
      const group = groupedExercises[index];
      const exerciseGroup = getExerciseGroup ? getExerciseGroup(group.startIndex) : null;
      if (exerciseGroup) {
        if (exerciseGroup.id !== lastGroupId) {
          count++;
          lastGroupId = exerciseGroup.id;
        }
      } else {
        count++;
      }
    });
    return count;
  }, [selectedExercises, groupedExercises, getExerciseGroup]);

  const getLowestAvailableGroupItemNumber = useCallback((groupExercises) => {
    const assignedNumbers = Object.values(groupItemReorderAssignments);
    for (let i = 1; i <= groupExercises.length; i++) {
      if (!assignedNumbers.includes(i)) {
        return i;
      }
    }
    return groupExercises.length + 1;
  }, [groupItemReorderAssignments]);

  const handleReorderPress = useCallback(() => {
    if (isReordering) {
      setIsReordering(false);
      setReorderAssignments({});
      setGroupReorderAssignments({});
      setGroupItemReorderAssignments({});
      setEditingGroupIdInReorder(null);
    } else {
      if (isCollapsed) {
        setIsCollapsed(false);
      }
      setIsReordering(true);
      setReorderAssignments({});
      setGroupReorderAssignments({});
      setGroupItemReorderAssignments({});
      setEditingGroupIdInReorder(null);
    }
  }, [isReordering, isCollapsed, setIsCollapsed]);

  const handleGroupItemToggle = useCallback((exerciseIndex) => {
    if (!setGroupSelectionIndices) return;
    
    setGroupSelectionIndices(prev => {
      if (prev.includes(exerciseIndex)) {
        return prev.filter(idx => idx !== exerciseIndex);
      } else {
        const newSelection = [...prev, exerciseIndex].sort((a, b) => a - b);
        return newSelection;
      }
    });
  }, [setGroupSelectionIndices]);

  const handleGroupReorderPress = useCallback((groupId) => {
    if (!isReordering) return;
    
    const groupKey = `group-${groupId}`;
    if (groupReorderAssignments[groupKey] !== undefined) {
      const newAssignments = { ...groupReorderAssignments };
      delete newAssignments[groupKey];
      setGroupReorderAssignments(newAssignments);
      return;
    }

    const nextNumber = getLowestAvailableNumber();
    const newAssignments = { ...groupReorderAssignments, [groupKey]: nextNumber };
    setGroupReorderAssignments(newAssignments);
  }, [isReordering, groupReorderAssignments, getLowestAvailableNumber]);

  const handleGroupItemReorderPress = useCallback((uniqueKey, groupId, groupExercisesCount) => {
    if (!isReordering) return;
    
    if (editingGroupIdInReorder === null) {
      setEditingGroupIdInReorder(groupId);
      setGroupItemReorderAssignments({});
      return;
    }

    if (editingGroupIdInReorder !== groupId) return;

    if (groupItemReorderAssignments[uniqueKey] !== undefined) {
      const newAssignments = { ...groupItemReorderAssignments };
      delete newAssignments[uniqueKey];
      setGroupItemReorderAssignments(newAssignments);
      return;
    }

    const nextNumber = getLowestAvailableGroupItemNumber([]);
    const newAssignments = { ...groupItemReorderAssignments, [uniqueKey]: nextNumber };
    setGroupItemReorderAssignments(newAssignments);
  }, [isReordering, editingGroupIdInReorder, groupItemReorderAssignments, getLowestAvailableGroupItemNumber]);

  const handleSaveGroupItemReorder = useCallback(() => {
    setEditingGroupIdInReorder(null);
    setGroupItemReorderAssignments({});
  }, []);

  const handleCancelGroupItemReorder = useCallback(() => {
    setEditingGroupIdInReorder(null);
    setGroupItemReorderAssignments({});
  }, []);

  const handleReorderItemPress = useCallback((uniqueKey) => {
    if (isGroupMode && setGroupSelectionIndices && isExerciseInGroup && handleEditGroup) {
      const index = parseInt(uniqueKey.split('-').pop());
      if (isNaN(index)) return;
      
      const exerciseGroup = getExerciseGroup ? getExerciseGroup(index) : null;
      
      if (exerciseGroup && exerciseGroup.id !== editingGroupId) {
        handleEditGroup(exerciseGroup.id);
        return;
      }
      
      handleGroupItemToggle(index);
      return;
    }

    if (!isReordering) {
      const originalId = uniqueKey.split('-').slice(0, -1).join('-');
      onToggleSelect(originalId);
      return;
    }

    const parts = uniqueKey.split('-');
    const indexStr = parts[parts.length - 1];
    const index = parseInt(indexStr);
    
    if (!isNaN(index)) {
      const exerciseGroup = getExerciseGroup ? getExerciseGroup(index) : null;
      if (exerciseGroup) {
        return;
      }
    }
    
    if (reorderAssignments[uniqueKey] !== undefined) {
      const newAssignments = { ...reorderAssignments };
      delete newAssignments[uniqueKey];
      setReorderAssignments(newAssignments);
      return;
    }

    const nextNumber = getLowestAvailableNumber();
    const newAssignments = { ...reorderAssignments, [uniqueKey]: nextNumber };
    setReorderAssignments(newAssignments);
  }, [isReordering, reorderAssignments, onToggleSelect, getLowestAvailableNumber, isGroupMode, setGroupSelectionIndices, handleGroupItemToggle, isExerciseInGroup, handleEditGroup, getExerciseGroup, editingGroupId, editingGroupIdInReorder]);

  const handleSaveReorder = useCallback(() => {
    const totalMacroItemsCount = getTotalMacroItems();
    if (onReorder && assignedCount === totalMacroItemsCount) {
      const allAssignments = [];
      
      Object.entries(reorderAssignments).forEach(([uniqueKey, position]) => {
        const exerciseId = uniqueKey.split('-').slice(0, -1).join('-');
        allAssignments.push({
          type: 'ungrouped',
          position,
          exerciseId,
          uniqueKey
        });
      });
      
      Object.entries(groupReorderAssignments).forEach(([groupKey, position]) => {
        const groupId = groupKey.replace('group-', '');
        allAssignments.push({
          type: 'group',
          position,
          groupId
        });
      });
      
      allAssignments.sort((a, b) => a.position - b.position);
      
      const orderedIds = [];
      allAssignments.forEach(assignment => {
        if (assignment.type === 'ungrouped') {
          orderedIds.push(assignment.exerciseId);
        } else {
          const group = exerciseGroups.find(g => g.id === assignment.groupId);
          if (group) {
            const sortedIndices = [...group.exerciseIndices].sort((a, b) => a - b);
            sortedIndices.forEach(index => {
              if (selectedOrder[index]) {
                orderedIds.push(selectedOrder[index]);
              }
            });
          }
        }
      });
      
      onReorder(orderedIds);
    }
    setIsReordering(false);
    setReorderAssignments({});
    setGroupReorderAssignments({});
  }, [reorderAssignments, groupReorderAssignments, assignedCount, getTotalMacroItems, onReorder, exerciseGroups, selectedOrder]);

  const totalMacroItemsCount = getTotalMacroItems();
  const allAssigned = assignedCount === totalMacroItemsCount;

  const hasExercises = selectedExercises.length > 0;
  const canToggle = hasExercises && !isReordering && !isGroupMode && !isDragMode;
  const canDrag = hasExercises && !isCollapsed && !isReordering && !isGroupMode;
  
  // Debug: log drag state
  React.useEffect(() => {
    if (hasExercises) {
      console.log('SelectedReview drag state:', {
        hasExercises,
        isCollapsed,
        isReordering,
        isGroupMode,
        canDrag,
      });
    }
  }, [hasExercises, isCollapsed, isReordering, isGroupMode, canDrag]);

  const rootContainer_collapsed = isCollapsed && hasExercises;
  const rootContainer_expanded = !isCollapsed && hasExercises;

  const getGroupContainerStyle = (colorScheme, isEdited = false) => ({
    ...styles.groupContainer,
    borderColor: colorScheme[isEdited ? 300 : 200],
    backgroundColor: colorScheme[isEdited ? 100 : 50],
    borderStyle: isEdited ? 'dashed' : 'solid',
  });

  const getGroupHeaderStyle = (colorScheme) => ({
    ...styles.groupHeader,
    borderBottomColor: colorScheme[200],
  });

  const getGroupHeaderTypeTextStyle = (colorScheme) => ({
    ...styles.groupHeaderTypeText,
    color: colorScheme[700],
  });

  const getGroupHeaderBadgeStyle = (colorScheme) => ({
    ...styles.groupHeaderBadge,
    backgroundColor: colorScheme[100],
  });

  const getGroupHeaderBadgeTextStyle = (colorScheme) => ({
    ...styles.groupHeaderBadgeText,
    color: colorScheme[600],
  });

  return (
    <View style={[
      styles.rootContainer,
      rootContainer_collapsed && styles.rootContainerCollapsed,
      rootContainer_expanded && styles.rootContainerExpanded,
    ]}>
      <TouchableOpacity 
        activeOpacity={canToggle ? 0.7 : 1}
        onPress={canToggle ? () => setIsCollapsed(!isCollapsed) : undefined}
        disabled={!canToggle}
        style={[
          hasExercises ? styles.headerEnabled : styles.headerDisabled,
        ]}
      >
        <View style={styles.headerLeft}>
          <Text style={hasExercises ? styles.headerTextEnabled : styles.headerTextDisabled}>
            Selected ({selectedExercises.length})
          </Text>
          {hasExercises && (
            <View style={styles.chevronContainer}>
              {isCollapsed ? (
                <ChevronDown size={16} color={COLORS.white} />
              ) : (
                <ChevronUp size={16} color={COLORS.white} />
              )}
            </View>
          )}
        </View>
        {selectedExercises.length >= 2 && (
          <View style={styles.headerRight}>
            {isGroupMode ? (
              <>
                <TouchableOpacity 
                  onPress={handleCancelGroup}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                {handleSaveGroup && (
                  <TouchableOpacity
                    onPress={handleSaveGroup}
                    disabled={groupSelectionMode === 'create' && groupSelectionIndices.length < 2}
                    style={[
                      styles.saveButton,
                      (groupSelectionMode === 'create' && groupSelectionIndices.length < 2) && styles.saveButtonDisabled,
                    ]}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : isReordering ? (
              <>
                <TouchableOpacity 
                  onPress={handleReorderPress}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleSaveReorder}
                  style={[
                    styles.saveButton,
                    !allAssigned && styles.saveButtonDisabled,
                  ]}
                  disabled={!allAssigned}
                >
                  <Text style={[
                    styles.saveButtonText,
                    !allAssigned && styles.saveButtonTextDisabled,
                  ]}>Save</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity 
                  onPress={handleReorderPress}
                  style={styles.actionButton}
                >
                  <Text style={styles.actionButtonText}>Reorder</Text>
                </TouchableOpacity>
                {handleStartGroupingMode && (
                  <TouchableOpacity 
                    onPress={() => {
                      if (isCollapsed) {
                        setIsCollapsed(false);
                      }
                      if (handleStartGroupingMode) {
                        handleStartGroupingMode();
                      }
                    }}
                    style={styles.actionButton}
                  >
                    <Text style={styles.actionButtonText}>Group</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}
      </TouchableOpacity>

      {hasExercises && isReordering && (
        <View style={styles.reorderBanner}>
          <Text style={styles.reorderBannerText}>
            Assigning {assignedCount}/{totalMacroItemsCount} — tap to reassign
          </Text>
        </View>
      )}

      {hasExercises && isGroupMode && (
        <View style={styles.groupBanner}>
          <Text style={styles.groupBannerText}>
            {groupSelectionMode === 'create' ? `Creating ${selectedGroupType}` : `Editing ${selectedGroupType} group`} — ({groupSelectionIndices.length} selected)
          </Text>
          {handleToggleGroupType && selectedGroupType && (
            <View style={styles.groupTypeToggleContainer}>
              <TouchableOpacity 
                onPress={() => {
                  if (selectedGroupType !== 'Superset' && handleToggleGroupType) {
                    handleToggleGroupType();
                  }
                }}
                style={[
                  styles.groupTypeButton,
                  styles.groupTypeButtonLeft,
                  selectedGroupType === 'Superset' ? styles.groupTypeButtonSupersetActive : styles.groupTypeButtonSupersetInactive,
                ]}
              >
                <Text style={[
                  styles.groupTypeButtonText,
                  selectedGroupType === 'Superset' ? styles.groupTypeButtonTextActive : styles.groupTypeButtonTextSupersetInactive,
                ]}>Superset</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  if (selectedGroupType !== 'HIIT' && handleToggleGroupType) {
                    handleToggleGroupType();
                  }
                }}
                style={[
                  styles.groupTypeButton,
                  styles.groupTypeButtonRight,
                  selectedGroupType === 'HIIT' ? styles.groupTypeButtonHiitActive : styles.groupTypeButtonHiitInactive,
                ]}
              >
                <Text style={[
                  styles.groupTypeButtonText,
                  selectedGroupType === 'HIIT' ? styles.groupTypeButtonTextActive : styles.groupTypeButtonTextHiitInactive,
                ]}>HIIT</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {hasExercises && isDragMode && (
        <View style={styles.dragBanner}>
          <Text style={styles.dragBannerText}>
            Dragging — release to drop
          </Text>
          <TouchableOpacity 
            onPress={handleDragCancel}
            style={styles.dragCancelButton}
          >
            <Text style={styles.dragCancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {hasExercises && !isCollapsed && (
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollViewContent}
          onScroll={onScrollViewScroll}
          scrollEventThrottle={16}
          onLayout={onContainerLayout}
          scrollEnabled={!isDragMode}
        >
          {isGroupMode && filtered ? (() => {
            const renderItems = [];
            let macroPosition = 0;
            
            const indexToGroupMap = new Map();
            exerciseGroups.forEach(group => {
              if (group.id !== editingGroupId) {
                group.exerciseIndices.forEach(idx => {
                  indexToGroupMap.set(idx, group);
                });
              }
            });
            
            const indexToGroupedExerciseMap = new Map();
            groupedExercises.forEach(group => {
              group.orderIndices.forEach(idx => {
                indexToGroupedExerciseMap.set(idx, group);
              });
            });
            
            let tempGroupInfo = null;
            if (groupSelectionIndices.length > 0) {
              const sortedIndices = [...groupSelectionIndices].sort((a, b) => a - b);
              if (editingGroupId) {
                const editingGroup = exerciseGroups.find(g => g.id === editingGroupId);
                if (editingGroup) {
                  tempGroupInfo = {
                    id: editingGroupId,
                    type: selectedGroupType,
                    number: editingGroup.number,
                    indices: sortedIndices
                  };
                }
              } else {
                const groupsOfType = exerciseGroups.filter(g => g.type === selectedGroupType);
                const nextNumber = groupsOfType.length === 0 
                  ? 1 
                  : Math.max(...groupsOfType.map(g => g.number), 0) + 1;
                tempGroupInfo = {
                  id: 'temp-new-group',
                  type: selectedGroupType,
                  number: nextNumber,
                  indices: sortedIndices
                };
              }
            }
            
            const processedIndices = new Set();
            selectedOrder.forEach((exerciseId, orderIndex) => {
              if (processedIndices.has(orderIndex)) return;
              
              const exercise = filtered.find(ex => ex.id === exerciseId);
              if (!exercise) return;
              
              const isInTempGroup = tempGroupInfo && tempGroupInfo.indices.includes(orderIndex);
              const existingGroup = indexToGroupMap.get(orderIndex);
              
              if (isInTempGroup) {
                const firstIndex = tempGroupInfo.indices[0];
                if (orderIndex === firstIndex) {
                  macroPosition++;
                  const groupExercises = [];
                  tempGroupInfo.indices.forEach(idx => {
                    processedIndices.add(idx);
                    const exId = selectedOrder[idx];
                    const ex = filtered.find(e => e.id === exId);
                    if (ex) {
                      groupExercises.push({
                        item: ex,
                        index: idx,
                        isSelectedInGroup: true
                      });
                    }
                  });
                  
                  const tempGroupColorScheme = tempGroupInfo.type === 'HIIT' ? defaultHiitColorScheme : defaultSupersetColorScheme;
                  const tempGroupObject = {
                    id: tempGroupInfo.id,
                    type: tempGroupInfo.type,
                    number: tempGroupInfo.number,
                  };
                  renderItems.push(
                    <View 
                      key={`temp-group-${tempGroupInfo.id}-${macroPosition}`}
                      style={getGroupContainerStyle(tempGroupColorScheme, true)}
                    >
                      {groupExercises.map(({ item: exerciseItem, index: exerciseIndex, isSelectedInGroup }, groupItemIndex) => {
                        const uniqueKey = `${exerciseItem.id}-${exerciseIndex}`;
                        const groupedExercise = indexToGroupedExerciseMap.get(exerciseIndex);
                        const selectedCount = groupedExercise ? groupedExercise.count : 1;
                        const isFirstInGroup = groupItemIndex === 0;
                        const isLastInGroup = groupItemIndex === groupExercises.length - 1;
                        return (
                          <ExerciseListItem
                            key={uniqueKey}
                            item={{ ...exerciseItem, id: uniqueKey }}
                            isSelected={true}
                            isLastSelected={false}
                            selectionOrder={null}
                            onToggle={handleReorderItemPress}
                            hideNumber={true}
                            isReordering={false}
                            isReordered={isSelectedInGroup}
                            showAddMore={false}
                            selectedCount={selectedCount}
                            renderingSection="reviewContainer"
                            isGroupMode={true}
                            isSelectedInGroup={isSelectedInGroup}
                            exerciseGroup={tempGroupObject}
                            isFirstInGroup={isFirstInGroup}
                            isLastInGroup={isLastInGroup}
                          />
                        );
                      })}
                    </View>
                  );
                }
              } else if (existingGroup) {
                const firstIndexInGroup = existingGroup.exerciseIndices[0];
                if (orderIndex === firstIndexInGroup) {
                  macroPosition++;
                  const groupExercises = [];
                  existingGroup.exerciseIndices.forEach(idx => {
                    processedIndices.add(idx);
                    const exId = selectedOrder[idx];
                    const ex = filtered.find(e => e.id === exId);
                    if (ex) {
                      groupExercises.push({
                        item: ex,
                        index: idx
                      });
                    }
                  });
                  
                  const isBeingEdited = editingGroupId === existingGroup.id;
                  const groupColorScheme = existingGroup.type === 'HIIT' ? defaultHiitColorScheme : defaultSupersetColorScheme;
                  renderItems.push(
                    <View 
                      key={`group-${existingGroup.id}-${macroPosition}`}
                      style={getGroupContainerStyle(groupColorScheme, isBeingEdited)}
                    >
                      {groupExercises.map(({ item: exerciseItem, index: exerciseIndex }, groupItemIndex) => {
                        const uniqueKey = `${exerciseItem.id}-${exerciseIndex}`;
                        const isSelectedInGroup = editingGroupId === existingGroup.id && groupSelectionIndices.includes(exerciseIndex);
                        const groupedExercise = indexToGroupedExerciseMap.get(exerciseIndex);
                        const selectedCount = groupedExercise ? groupedExercise.count : 1;
                        const isFirstInGroup = groupItemIndex === 0;
                        const isLastInGroup = groupItemIndex === groupExercises.length - 1;
                        return (
                          <ExerciseListItem
                            key={uniqueKey}
                            item={{ ...exerciseItem, id: uniqueKey }}
                            isSelected={true}
                            isLastSelected={false}
                            selectionOrder={null}
                            onToggle={handleReorderItemPress}
                            hideNumber={true}
                            isReordering={false}
                            isReordered={isSelectedInGroup}
                            showAddMore={false}
                            selectedCount={selectedCount}
                            renderingSection="reviewContainer"
                            isGroupMode={true}
                            isSelectedInGroup={isSelectedInGroup}
                            exerciseGroup={existingGroup}
                            isFirstInGroup={isFirstInGroup}
                            isLastInGroup={isLastInGroup}
                          />
                        );
                      })}
                    </View>
                  );
                }
              } else {
                processedIndices.add(orderIndex);
                macroPosition++;
                const uniqueKey = `${exerciseId}-${orderIndex}`;
                const isSelectedInGroup = groupSelectionIndices.includes(orderIndex);
                
                renderItems.push(
                  <ExerciseListItem
                    key={uniqueKey}
                    item={{ ...exercise, id: uniqueKey }}
                    isSelected={true}
                    isLastSelected={orderIndex === selectedOrder.length - 1}
                    selectionOrder={macroPosition}
                    onToggle={handleReorderItemPress}
                    hideNumber={false}
                    isReordering={false}
                    isReordered={isSelectedInGroup}
                    showAddMore={false}
                    selectedCount={1}
                    renderingSection="reviewContainer"
                    isGroupMode={true}
                    isSelectedInGroup={isSelectedInGroup}
                    exerciseGroup={null}
                  />
                );
              }
            });
            
            return renderItems;
          })() : (() => {
            const renderItems = [];
            let groupPosition = 0;
            
            selectedExercises.forEach((item, index) => {
              const group = groupedExercises[index];
              const exerciseGroup = getExerciseGroup ? getExerciseGroup(group.startIndex) : null;
              
              if (exerciseGroup) {
                const isFirstInGroup = index === 0 || 
                  !getExerciseGroup || 
                  getExerciseGroup(groupedExercises[index - 1]?.startIndex)?.id !== exerciseGroup.id;
                
                if (isFirstInGroup) {
                  groupPosition++;
                  const groupExercises = [];
                  let currentIndex = index;
                  while (currentIndex < selectedExercises.length) {
                    const currentGroup = groupedExercises[currentIndex];
                    if (!currentGroup) break;
                    const currentExerciseGroup = getExerciseGroup ? getExerciseGroup(currentGroup.startIndex) : null;
                    if (currentExerciseGroup?.id === exerciseGroup.id) {
                      groupExercises.push({
                        item: selectedExercises[currentIndex],
                        index: currentIndex,
                        group: currentGroup,
                        exerciseGroup: currentExerciseGroup
                      });
                      currentIndex++;
                    } else {
                      break;
                    }
                  }
                  
                  const groupKey = `group-${exerciseGroup.id}`;
                  const groupIsReordered = groupReorderAssignments[groupKey] !== undefined;
                  const groupReorderPosition = groupReorderAssignments[groupKey] || 0;
                  const groupColorScheme = exerciseGroup.type === 'HIIT' ? defaultHiitColorScheme : defaultSupersetColorScheme;
                  
                  const groupContent = (
                    <View 
                      style={getGroupContainerStyle(groupColorScheme, false)}
                    >
                      <View style={getGroupHeaderStyle(groupColorScheme)}>
                        <View style={styles.groupHeaderLeft}>
                          <Text style={getGroupHeaderTypeTextStyle(groupColorScheme)}>{exerciseGroup.type}</Text>
                          <View style={getGroupHeaderBadgeStyle(groupColorScheme)}>
                            <Text style={getGroupHeaderBadgeTextStyle(groupColorScheme)}>{exerciseGroup.type === 'HIIT' ? 'H' : 'S'}{exerciseGroup.number}</Text>
                          </View>
                        </View>
                        {isReordering && (
                          <TouchableOpacity
                            onPress={() => handleGroupReorderPress(exerciseGroup.id)}
                            style={[
                              styles.groupReorderCheckbox,
                              groupIsReordered ? styles.groupReorderCheckboxAssigned : styles.groupReorderCheckboxUnassigned,
                            ]}
                          >
                            {groupIsReordered && (
                              <Text style={styles.groupReorderCheckboxText}>{groupReorderPosition}</Text>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                      
                      {groupExercises.map(({ item: exerciseItem, index: exerciseIndex, group: exerciseGroupData }, groupItemIndex) => {
                        const uniqueKey = `${exerciseItem.id}-${exerciseIndex}`;
                        const selectedCount = exerciseGroupData ? exerciseGroupData.count : 0;
                        const originalId = exerciseItem.id;
                        const isFirstInGroup = groupItemIndex === 0;
                        const isLastInGroup = groupItemIndex === groupExercises.length - 1;
                        
                        return (
                          <ExerciseListItem
                            key={uniqueKey}
                            item={{ ...exerciseItem, id: uniqueKey }}
                            isSelected={true}
                            isLastSelected={false}
                            selectionOrder={exerciseIndex + 1}
                            onToggle={handleReorderItemPress}
                            hideNumber={true}
                            isReordering={false}
                            isReordered={false}
                            showAddMore={!isReordering && !isDragMode}
                            onAddMore={onAddSet && !isReordering && !isDragMode ? () => onAddSet(originalId, exerciseIndex) : null}
                            onRemoveSet={onRemoveSet && !isReordering && !isDragMode ? () => onRemoveSet(originalId, exerciseIndex) : null}
                            selectedCount={selectedCount}
                            renderingSection="reviewContainer"
                            exerciseGroup={exerciseGroup}
                            isFirstInGroup={isFirstInGroup}
                            isLastInGroup={isLastInGroup}
                          />
                        );
                      })}
                    </View>
                  );
                  
                  // Wrap group in DraggableWrapper for drag-and-drop support
                  renderItems.push(
                    <DraggableWrapper
                      key={`group-${exerciseGroup.id}-${groupPosition}`}
                      itemKey={groupKey}
                      itemType="group"
                      itemData={{
                        id: exerciseGroup.id,
                        type: exerciseGroup.type,
                        number: exerciseGroup.number,
                        exerciseCount: groupExercises.length,
                      }}
                      isDragMode={isDragMode}
                      draggedItem={draggedItem}
                      dropTargetKey={dropTargetKey}
                      dropPosition={dropPosition}
                      onDragStart={onItemDragStart}
                      onDragUpdate={onItemDragUpdate}
                      onDragEnd={handleDragEnd}
                      onLayoutChange={registerItemLayout}
                      disabled={!canDrag}
                    >
                      {groupContent}
                    </DraggableWrapper>
                  );
                }
              } else {
                groupPosition++;
                const uniqueKey = `${item.id}-${index}`;
                const exerciseKey = `exercise-${item.id}-${index}`;
                const isReordered = reorderAssignments[uniqueKey] !== undefined;
                const reorderPosition = reorderAssignments[uniqueKey] || 0;
                const isLastSelected = index === selectedExercises.length - 1;
                const selectedCount = group ? group.count : 0;
                const originalId = item.id;
                
                const exerciseContent = (
                  <ExerciseListItem
                    item={{ ...item, id: uniqueKey }}
                    isSelected={true}
                    isLastSelected={isLastSelected}
                    selectionOrder={isReordering ? reorderPosition : groupPosition}
                    onToggle={handleReorderItemPress}
                    hideNumber={isReordering && !isReordered}
                    isReordering={isReordering}
                    isReordered={isReordered}
                    showAddMore={!isReordering && !isDragMode}
                    onAddMore={onAddSet && !isDragMode ? () => onAddSet(originalId, index) : null}
                    onRemoveSet={onRemoveSet && !isDragMode ? () => onRemoveSet(originalId, index) : null}
                    selectedCount={selectedCount}
                    renderingSection="reviewContainer"
                    exerciseGroup={null}
                  />
                );
                
                // Wrap exercise in DraggableWrapper for drag-and-drop support
                renderItems.push(
                  <DraggableWrapper
                    key={uniqueKey}
                    itemKey={exerciseKey}
                    itemType="exercise"
                    itemData={{
                      id: item.id,
                      name: item.name,
                      index,
                      count: selectedCount,
                    }}
                    isDragMode={isDragMode}
                    draggedItem={draggedItem}
                    dropTargetKey={dropTargetKey}
                    dropPosition={dropPosition}
                    onDragStart={onItemDragStart}
                    onDragUpdate={onItemDragUpdate}
                    onDragEnd={handleDragEnd}
                    onLayoutChange={registerItemLayout}
                    disabled={!canDrag}
                  >
                    {exerciseContent}
                  </DraggableWrapper>
                );
              }
            });
            
            return renderItems;
          })()}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    borderBottomColor: COLORS.slate[200],
  },
  rootContainerCollapsed: {
    borderBottomWidth: 0,
    flex: 0,
  },
  rootContainerExpanded: {
    borderBottomWidth: 2,
    flex: 1,
  },
  
  headerEnabled: {
    backgroundColor: COLORS.blue[400],
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 40,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[200],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerDisabled: {
    backgroundColor: COLORS.slate[300],
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 40,
    borderBottomWidth: 0,
    borderBottomColor: COLORS.slate[200],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    opacity: 0.6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTextEnabled: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  headerTextDisabled: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.slate[600],
    textTransform: 'uppercase',
  },
  chevronContainer: {},
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  cancelButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: COLORS.slate[100],
  },
  cancelButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.slate[400],
    textTransform: 'uppercase',
  },
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: COLORS.green[500],
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  saveButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  saveButtonTextDisabled: {
    opacity: 0.5,
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  
  reorderBanner: {
    marginBottom: 4,
    backgroundColor: COLORS.amber[100],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.amber[200],
  },
  reorderBannerText: {
    fontSize: 12,
    color: COLORS.amber[800],
    textAlign: 'center',
    fontWeight: '500',
  },
  
  groupBanner: {
    backgroundColor: COLORS.blue[100],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.blue[200],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  groupBannerText: {
    fontSize: 12,
    color: COLORS.blue[800],
    fontWeight: '500',
  },
  groupTypeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    padding: 2,
  },
  groupTypeButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  groupTypeButtonLeft: {
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  groupTypeButtonRight: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  groupTypeButtonSupersetActive: {
    borderColor: defaultSupersetColorScheme[500],
    backgroundColor: defaultSupersetColorScheme[500],
  },
  groupTypeButtonSupersetInactive: {
    borderColor: defaultSupersetColorScheme[200],
    backgroundColor: 'transparent',
  },
  groupTypeButtonHiitActive: {
    borderColor: defaultHiitColorScheme[500],
    backgroundColor: defaultHiitColorScheme[500],
  },
  groupTypeButtonHiitInactive: {
    borderColor: defaultHiitColorScheme[200],
    backgroundColor: 'transparent',
  },
  groupTypeButtonText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  groupTypeButtonTextActive: {
    color: COLORS.white,
  },
  groupTypeButtonTextSupersetInactive: {
    color: defaultSupersetColorScheme[300],
  },
  groupTypeButtonTextHiitInactive: {
    color: defaultHiitColorScheme[300],
  },
  
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    gap: 4,
    paddingHorizontal: 2,
  },
  
  groupContainer: {
    marginVertical: 8,
    borderWidth: 2,
    borderRadius: 8,
    padding: 4,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    borderBottomWidth: 0,
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 8,
    paddingRight: 16,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupHeaderTypeText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  groupHeaderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  groupHeaderBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  groupReorderCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupReorderCheckboxAssigned: {
    backgroundColor: COLORS.green[100],
    borderColor: COLORS.green[200],
  },
  groupReorderCheckboxUnassigned: {
    backgroundColor: 'transparent',
    borderColor: COLORS.amber[400],
    borderStyle: 'dashed',
  },
  groupReorderCheckboxText: {
    color: COLORS.green[500],
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Drag and drop styles
  dragBanner: {
    backgroundColor: COLORS.blue[500],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.blue[600],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dragBannerText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
  },
  dragCancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  dragCancelButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  draggingItem: {
    opacity: 0.5,
    backgroundColor: COLORS.blue[50],
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.blue[300],
    borderStyle: 'dashed',
  },
  dropTargetItem: {
    position: 'relative',
  },
  dropIndicator: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 4,
    backgroundColor: COLORS.blue[500],
    borderRadius: 2,
    zIndex: 100,
  },
  dropIndicatorTop: {
    top: -2,
  },
  dropIndicatorBottom: {
    bottom: -2,
  },
  draggableWrapper: {
    // Ensure the wrapper can receive touch events
  },
});

export default SelectedReview;
