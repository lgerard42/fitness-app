import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { COLORS } from '../../../../constants/colors';
import { defaultSupersetColorScheme, defaultHiitColorScheme } from '../../../../constants/defaultStyles';

const DragAndDropModal = ({
  visible,
  onClose,
  selectedOrder,
  exerciseGroups,
  groupedExercises,
  filtered,
  getExerciseGroup,
  onReorder,
}) => {
  // Build a flat list of items (GroupHeaders, Items, and GroupFooters)
  const dragItems = useMemo(() => {
    const items = [];
    const processedIndices = new Set();
    
    selectedOrder.forEach((exerciseId, orderIndex) => {
      if (processedIndices.has(orderIndex)) return;
      
      const exercise = filtered.find(ex => ex.id === exerciseId);
      if (!exercise) return;
      
      const exerciseGroup = getExerciseGroup ? getExerciseGroup(orderIndex) : null;
      
      if (exerciseGroup) {
        // This is part of a group
        const firstIndexInGroup = exerciseGroup.exerciseIndices[0];
        const lastIndexInGroup = exerciseGroup.exerciseIndices[exerciseGroup.exerciseIndices.length - 1];
        
        // If this is the first exercise in the group, push a GroupHeader
        if (orderIndex === firstIndexInGroup) {
          // Collect all exercises in this group for the header
          const groupExercisesData = [];
          exerciseGroup.exerciseIndices.forEach(idx => {
            const exId = selectedOrder[idx];
            const ex = filtered.find(e => e.id === exId);
            const groupedEx = groupedExercises.find(g => g.orderIndices.includes(idx));
            if (ex) {
              groupExercisesData.push({
                exercise: ex,
                orderIndex: idx,
                count: groupedEx ? groupedEx.count : 1,
              });
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
        
        // Push the Item
        processedIndices.add(orderIndex);
        const groupedExercise = groupedExercises.find(g => g.orderIndices.includes(orderIndex));
        const count = groupedExercise ? groupedExercise.count : 1;
        
        items.push({
          id: `item-${exerciseId}-${orderIndex}`,
          type: 'Item',
          exercise: exercise,
          orderIndex: orderIndex,
          count: count,
          groupId: exerciseGroup.id,
          isFirstInGroup: orderIndex === firstIndexInGroup,
          isLastInGroup: orderIndex === lastIndexInGroup,
        });
        
        // If this is the last exercise in the group, push a GroupFooter
        if (orderIndex === lastIndexInGroup) {
          items.push({
            id: `footer-${exerciseGroup.id}`,
            type: 'GroupFooter',
            group: exerciseGroup,
            groupId: exerciseGroup.id,
          });
        }
      } else {
        // Standalone exercise
        processedIndices.add(orderIndex);
        const groupedExercise = groupedExercises.find(g => g.orderIndices.includes(orderIndex));
        items.push({
          id: `item-${exerciseId}-${orderIndex}`,
          type: 'Item',
          exercise: exercise,
          orderIndex: orderIndex,
          count: groupedExercise ? groupedExercise.count : 1,
          groupId: null,
          isFirstInGroup: false,
          isLastInGroup: false,
        });
      }
    });
    
    return items;
  }, [selectedOrder, exerciseGroups, groupedExercises, filtered, getExerciseGroup]);

  const [reorderedItems, setReorderedItems] = useState(dragItems);
  const [collapsedGroupId, setCollapsedGroupId] = useState(null);
  const prevVisibleRef = useRef(visible);
  const pendingDragRef = useRef(null); // Store drag function to call after collapse

  // Only reset state when modal opens (visible changes from false to true)
  useEffect(() => {
    const wasVisible = prevVisibleRef.current;
    const isVisible = visible;
    
    if (!wasVisible && isVisible) {
      setReorderedItems(dragItems);
      setCollapsedGroupId(null);
      pendingDragRef.current = null;
    }
    
    prevVisibleRef.current = isVisible;
  }, [visible, dragItems]);

  // Helper: Collapse a group into a single CollapsedGroup item
  const collapseGroup = useCallback((items, groupId) => {
    const result = [];
    let groupHeader = null;
    const groupItems = [];
    let skipUntilFooter = false;
    
    for (const item of items) {
      if (item.type === 'GroupHeader' && item.groupId === groupId) {
        groupHeader = item;
        skipUntilFooter = true;
        continue;
      }
      
      if (skipUntilFooter) {
        if (item.type === 'Item' && item.groupId === groupId) {
          groupItems.push({
            exercise: item.exercise,
            count: item.count,
            orderIndex: item.orderIndex,
          });
          continue;
        }
        
        if (item.type === 'GroupFooter' && item.groupId === groupId) {
          // Create the collapsed group item
          result.push({
            id: `collapsed-${groupId}`,
            type: 'CollapsedGroup',
            group: groupHeader.group,
            groupId: groupId,
            groupExercises: groupItems,
            originalHeader: groupHeader,
          });
          skipUntilFooter = false;
          continue;
        }
      }
      
      result.push(item);
    }
    
    return result;
  }, []);

  // Helper: Expand a CollapsedGroup back to Header + Items + Footer
  const expandGroup = useCallback((items, groupId) => {
    const result = [];
    
    for (const item of items) {
      if (item.type === 'CollapsedGroup' && item.groupId === groupId) {
        // Push Header
        result.push({
          id: `header-${groupId}`,
          type: 'GroupHeader',
          group: item.group,
          groupId: groupId,
          groupExercises: item.groupExercises,
        });
        
        // Push Items
        item.groupExercises.forEach((ex, idx) => {
          result.push({
            id: `item-${ex.exercise.id}-${ex.orderIndex}`,
            type: 'Item',
            exercise: ex.exercise,
            orderIndex: ex.orderIndex,
            count: ex.count,
            groupId: groupId,
            isFirstInGroup: idx === 0,
            isLastInGroup: idx === item.groupExercises.length - 1,
          });
        });
        
        // Push Footer
        result.push({
          id: `footer-${groupId}`,
          type: 'GroupFooter',
          group: item.group,
          groupId: groupId,
        });
      } else {
        result.push(item);
      }
    }
    
    return result;
  }, []);

  // Effect to trigger pending drag after collapse is complete
  useEffect(() => {
    if (collapsedGroupId && pendingDragRef.current) {
      // Small delay to ensure the collapsed item has been measured
      const timeoutId = setTimeout(() => {
        if (pendingDragRef.current) {
          pendingDragRef.current();
          pendingDragRef.current = null;
        }
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [collapsedGroupId, reorderedItems]);

  // Handle initiating a group header drag - collapse first, then drag
  const initiateGroupDrag = useCallback((groupId, drag) => {
    // Collapse the group in data
    const collapsed = collapseGroup(reorderedItems, groupId);
    setReorderedItems(collapsed);
    setCollapsedGroupId(groupId);
    // Store the drag function to call after state updates
    pendingDragRef.current = drag;
  }, [reorderedItems, collapseGroup]);

  const handleDragEnd = useCallback(({ data, from, to }) => {
    // If we have a collapsed group, expand it at the new position
    if (collapsedGroupId) {
      const expanded = expandGroup(data, collapsedGroupId);
      setReorderedItems(expanded);
      setCollapsedGroupId(null);
    } else {
      setReorderedItems(data);
    }
    pendingDragRef.current = null;
  }, [collapsedGroupId, expandGroup]);

  const keyExtractor = useCallback((item) => item.id, []);

  const handleSave = useCallback(() => {
    if (!onReorder) return;
    
    // Make sure any collapsed groups are expanded first
    let finalItems = reorderedItems;
    if (collapsedGroupId) {
      finalItems = expandGroup(reorderedItems, collapsedGroupId);
    }
    
    // Parse the flat list to reconstruct newOrder and updatedGroups
    const newOrder = [];
    const updatedGroups = [];
    
    let currentGroup = null;
    let currentGroupIndices = [];
    
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
      } else if (item.type === 'CollapsedGroup') {
        // Handle collapsed groups in save
        const groupIndices = [];
        item.groupExercises.forEach((ex) => {
          const count = ex.count || 1;
          for (let i = 0; i < count; i++) {
            groupIndices.push(newOrder.length);
            newOrder.push(ex.exercise.id);
          }
        });
        updatedGroups.push({
          ...item.group,
          exerciseIndices: groupIndices,
        });
      }
    });
    
    if (currentGroup && currentGroupIndices.length > 0) {
      updatedGroups.push({
        ...currentGroup,
        exerciseIndices: currentGroupIndices,
      });
    }
    
    onReorder(newOrder, updatedGroups);
    onClose();
  }, [reorderedItems, collapsedGroupId, expandGroup, onReorder, onClose]);

  // Helper to determine if an Item is visually inside a group based on current ordering
  const getItemGroupContext = useCallback((itemIndex) => {
    let currentGroupId = null;
    let groupType = null;
    let isFirstInGroup = false;
    let isLastInGroup = false;
    
    for (let i = 0; i <= itemIndex; i++) {
      const item = reorderedItems[i];
      if (item.type === 'GroupHeader') {
        currentGroupId = item.groupId;
        groupType = item.group.type;
      } else if (item.type === 'GroupFooter' || item.type === 'CollapsedGroup') {
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

  const renderItem = useCallback(({ item, drag, isActive, getIndex }) => {
    const itemIndex = getIndex ? getIndex() : 0;
    
    // Render CollapsedGroup (single draggable unit containing entire group)
    if (item.type === 'CollapsedGroup') {
      const groupColorScheme = item.group.type === 'HIIT' 
        ? defaultHiitColorScheme 
        : defaultSupersetColorScheme;
      
      return (
        <TouchableOpacity
          onLongPress={drag}
          disabled={isActive}
          delayLongPress={150}
          activeOpacity={1}
          style={[
            styles.collapsedGroupContainer,
            {
              borderColor: groupColorScheme[300],
              backgroundColor: groupColorScheme[150],
            },
            isActive && styles.collapsedGroupContainer__active,
          ]}
        >
          <View style={styles.collapsedGroupHeader}>
            <View style={styles.groupHeaderContent}>
              <Text style={[styles.groupHeaderTypeText, { color: groupColorScheme[700] }]}>
                {item.group.type}
              </Text>
              <View style={[styles.groupHeaderBadge, { backgroundColor: groupColorScheme[200] }]}>
                <Text style={[styles.groupHeaderBadgeText, { color: groupColorScheme[700] }]}>
                  {item.group.type === 'HIIT' ? 'H' : 'S'}{item.group.number}
                </Text>
              </View>
            </View>
            <View style={styles.dragHandle}>
              <Text style={[styles.dragHandleText, { color: groupColorScheme[400] }]}>≡</Text>
            </View>
          </View>
          
          <View style={styles.collapsedExerciseList}>
            {item.groupExercises.map((ex, idx) => (
              <View 
                key={`collapsed-${ex.exercise.id}-${idx}`} 
                style={[
                  styles.collapsedExerciseItem,
                  { backgroundColor: groupColorScheme[100] },
                ]}
              >
                <Text style={[styles.collapsedExerciseName, { color: groupColorScheme[800] }]}>
                  {ex.exercise.name}
                </Text>
                {ex.count > 1 && (
                  <Text style={[styles.collapsedExerciseCount, { color: groupColorScheme[600] }]}>
                    ×{ex.count}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </TouchableOpacity>
      );
    }
    
    // Render GroupHeader
    if (item.type === 'GroupHeader') {
      const groupColorScheme = item.group.type === 'HIIT' 
        ? defaultHiitColorScheme 
        : defaultSupersetColorScheme;
      
      return (
        <TouchableOpacity
          onLongPress={() => initiateGroupDrag(item.groupId, drag)}
          disabled={isActive}
          delayLongPress={150}
          activeOpacity={1}
          style={[
            styles.groupHeader,
            {
              borderColor: groupColorScheme[200],
              backgroundColor: groupColorScheme[100],
            },
            isActive && {
              opacity: 0.9,
              backgroundColor: groupColorScheme[150],
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 4,
            },
          ]}
        >
          <View style={styles.groupHeaderContent}>
            <Text style={[styles.groupHeaderTypeText, { color: groupColorScheme[700] }]}>
              {item.group.type}
            </Text>
            <View style={[styles.groupHeaderBadge, { backgroundColor: groupColorScheme[200] }]}>
              <Text style={[styles.groupHeaderBadgeText, { color: groupColorScheme[700] }]}>
                {item.group.type === 'HIIT' ? 'H' : 'S'}{item.group.number}
              </Text>
            </View>
          </View>
          <View style={styles.dragHandle}>
            <Text style={[styles.dragHandleText, { color: groupColorScheme[400] }]}>≡</Text>
          </View>
        </TouchableOpacity>
      );
    }
    
    // Render GroupFooter
    if (item.type === 'GroupFooter') {
      const groupColorScheme = item.group.type === 'HIIT' 
        ? defaultHiitColorScheme 
        : defaultSupersetColorScheme;
      
      return (
        <TouchableOpacity
          onLongPress={drag}
          disabled={isActive}
          delayLongPress={150}
          activeOpacity={1}
          style={[
            styles.groupFooter,
            {
              borderColor: groupColorScheme[200],
              backgroundColor: groupColorScheme[100],
            },
            isActive && {
              opacity: 0.9,
              backgroundColor: groupColorScheme[150],
            },
          ]}
        >
          <View style={styles.groupFooterContent}>
            <View style={[styles.groupFooterLine, { backgroundColor: groupColorScheme[200] }]} />
          </View>
        </TouchableOpacity>
      );
    }
    
    // Render Item (exercise)
    const { currentGroupId, groupType, isFirstInGroup, isLastInGroup } = getItemGroupContext(itemIndex);
    const isGroupChild = !!currentGroupId;
    
    const groupColorScheme = groupType === 'HIIT' 
      ? defaultHiitColorScheme 
      : defaultSupersetColorScheme;

    return (
      <TouchableOpacity
        onLongPress={drag}
        disabled={isActive}
        delayLongPress={150}
        activeOpacity={1}
        style={[
          styles.exerciseCard,
          isGroupChild && styles.exerciseCard__groupChild,
          isGroupChild && groupColorScheme && {
            borderColor: groupColorScheme[200],
            backgroundColor: groupColorScheme[50],
          },
          isGroupChild && isFirstInGroup && styles.exerciseCard__groupChild__first,
          isGroupChild && isLastInGroup && styles.exerciseCard__groupChild__last,
          !isGroupChild && styles.exerciseCard__standalone,
          isActive && styles.exerciseCard__active,
          isActive && isGroupChild && groupColorScheme && {
            backgroundColor: groupColorScheme[100],
            borderColor: groupColorScheme[300],
          },
        ]}
      >
        {isGroupChild && (
          <View 
            style={[
              styles.groupChildWrapperLeft,
              { backgroundColor: groupColorScheme[100] },
            ]} 
          />
        )}
        
        <View style={[
          styles.exerciseCardContent,
          isGroupChild && styles.exerciseCardContent__groupChild,
          isGroupChild && groupColorScheme && { backgroundColor: groupColorScheme[50] },
          isActive && isGroupChild && groupColorScheme && { backgroundColor: groupColorScheme[100] },
        ]}>
          <View style={styles.exerciseInfo}>
            <Text style={styles.exerciseName}>{item.exercise.name}</Text>
            <View style={styles.exerciseMeta}>
              {item.exercise.category && (
                <Text style={styles.exerciseCategory}>{item.exercise.category}</Text>
              )}
              {item.exercise.primaryMuscle && (
                <Text style={styles.exerciseMuscle}>{item.exercise.primaryMuscle}</Text>
              )}
            </View>
          </View>
          
          <View style={styles.exerciseRight}>
            {item.count > 1 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>×{item.count}</Text>
              </View>
            )}
            <View style={styles.dragHandle}>
              <Text style={[
                styles.dragHandleText,
                isGroupChild && groupColorScheme && { color: groupColorScheme[400] },
              ]}>≡</Text>
            </View>
          </View>
        </View>
        
        {isGroupChild && (
          <View 
            style={[
              styles.groupChildWrapperRight,
              { backgroundColor: groupColorScheme[100] },
            ]} 
          />
        )}
      </TouchableOpacity>
    );
  }, [getItemGroupContext, initiateGroupDrag]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reorder Items</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>
            Press and hold to drag • Drag headers to move entire groups
          </Text>
        </View>

        {reorderedItems.length > 0 ? (
          <DraggableFlatList
            data={reorderedItems}
            onDragEnd={handleDragEnd}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No items to reorder</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.slate[50],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[200],
    backgroundColor: COLORS.white,
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
  },
  instructionsText: {
    fontSize: 12,
    color: COLORS.blue[700],
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
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
  
  // Group Header Styles
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    marginHorizontal: 0,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
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
  
  // Collapsed Group Styles (when dragging entire group)
  collapsedGroupContainer: {
    marginTop: 12,
    marginHorizontal: 0,
    borderWidth: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  collapsedGroupContainer__active: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  collapsedGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  collapsedExerciseList: {
    paddingHorizontal: 8,
    paddingBottom: 8,
    gap: 4,
  },
  collapsedExerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  collapsedExerciseName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  collapsedExerciseCount: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  
  // Group Footer Styles
  groupFooter: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    marginHorizontal: 0,
    borderWidth: 2,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  groupFooterContent: {
    alignItems: 'center',
  },
  groupFooterLine: {
    width: '40%',
    height: 3,
    borderRadius: 2,
    opacity: 0.5,
  },
  
  // Exercise Card Styles
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginVertical: 0,
    overflow: 'hidden',
  },
  exerciseCard__standalone: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.slate[200],
    marginVertical: 4,
    marginHorizontal: 0,
  },
  exerciseCard__groupChild: {
    marginHorizontal: 0,
    borderWidth: 0,
  },
  exerciseCard__groupChild__first: {},
  exerciseCard__groupChild__last: {},
  exerciseCard__active: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    transform: [{ scale: 1.02 }],
  },
  
  groupChildWrapperLeft: {
    width: 2,
  },
  groupChildWrapperRight: {
    width: 2,
  },
  
  exerciseCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
  },
  exerciseCardContent__groupChild: {
    marginHorizontal: 0,
    borderRadius: 6,
    marginVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.slate[100],
  },
  
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.slate[900],
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
  
  dragHandle: {
    paddingHorizontal: 4,
  },
  dragHandleText: {
    fontSize: 20,
    color: COLORS.slate[400],
    fontWeight: 'bold',
  },
});

export default DragAndDropModal;
