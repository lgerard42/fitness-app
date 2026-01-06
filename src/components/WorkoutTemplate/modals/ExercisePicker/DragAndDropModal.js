import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { COLORS } from '../../../../constants/colors';
import { defaultSupersetColorScheme, defaultHiitColorScheme } from '../../../../constants/defaultStyles';
import ExerciseListItem from './ExerciseListItem';

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
  // Build a flat list of items (groups and individual exercises)
  const dragItems = useMemo(() => {
    const items = [];
    const processedIndices = new Set();
    
    selectedOrder.forEach((exerciseId, orderIndex) => {
      if (processedIndices.has(orderIndex)) return;
      
      const exercise = filtered.find(ex => ex.id === exerciseId);
      if (!exercise) return;
      
      const exerciseGroup = getExerciseGroup ? getExerciseGroup(orderIndex) : null;
      
      if (exerciseGroup) {
        // This is part of a group - add the group as a single item
        const firstIndexInGroup = exerciseGroup.exerciseIndices[0];
        if (orderIndex === firstIndexInGroup) {
          // Get all exercises in this group with their counts
          const groupExercises = [];
          exerciseGroup.exerciseIndices.forEach(idx => {
            processedIndices.add(idx);
            const exId = selectedOrder[idx];
            const ex = filtered.find(e => e.id === exId);
            const groupedExercise = groupedExercises.find(g => g.orderIndices.includes(idx));
            const count = groupedExercise ? groupedExercise.count : 1;
            if (ex) {
              groupExercises.push({
                exercise: ex,
                index: idx,
                count: count,
              });
            }
          });
          
          items.push({
            id: `group-${exerciseGroup.id}`,
            type: 'group',
            group: exerciseGroup,
            exercises: groupExercises,
            orderIndex: firstIndexInGroup,
          });
        }
      } else {
        // Individual exercise
        processedIndices.add(orderIndex);
        const groupedExercise = groupedExercises.find(g => g.orderIndices.includes(orderIndex));
        items.push({
          id: `exercise-${exerciseId}-${orderIndex}`,
          type: 'exercise',
          exercise: exercise,
          orderIndex: orderIndex,
          count: groupedExercise ? groupedExercise.count : 1,
        });
      }
    });
    
    return items;
  }, [selectedOrder, exerciseGroups, groupedExercises, filtered, getExerciseGroup]);

  const [reorderedItems, setReorderedItems] = useState(dragItems);
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const prevVisibleRef = useRef(visible);

  // Only reset state when modal opens (visible changes from false to true)
  useEffect(() => {
    const wasVisible = prevVisibleRef.current;
    const isVisible = visible;
    
    // Only initialize/reset when modal transitions from closed to open
    if (!wasVisible && isVisible) {
      setReorderedItems(dragItems);
      setCollapsedGroups(new Set());
    }
    
    prevVisibleRef.current = isVisible;
  }, [visible, dragItems]);

  const handleDragEnd = useCallback(({ data }) => {
    // Update state with the new order from the library
    setReorderedItems(data);
    // Expand all groups when drag ends
    setCollapsedGroups(new Set());
  }, []);

  const keyExtractor = useCallback((item) => item.id, []);

  const handleSave = useCallback(() => {
    if (!onReorder) return;
    
    // Rebuild selectedOrder based on new item order
    const newOrder = [];
    
    reorderedItems.forEach(item => {
      if (item.type === 'group') {
        // Add all exercises in the group with their counts
        item.exercises.forEach(({ exercise, count }) => {
          const exerciseCount = count || 1;
          for (let i = 0; i < exerciseCount; i++) {
            newOrder.push(exercise.id);
          }
        });
      } else {
        // Add individual exercise
        const count = item.count || 1;
        for (let i = 0; i < count; i++) {
          newOrder.push(item.exercise.id);
        }
      }
    });
    
    // Update group indices based on new positions
    const updatedGroups = exerciseGroups.map(group => {
      const itemIndex = reorderedItems.findIndex(item => 
        item.type === 'group' && item.group.id === group.id
      );
      
      if (itemIndex === -1) {
        // Group not found, return as is
        return group;
      }
      
      // Calculate new indices for this group
      let currentIndex = 0;
      for (let i = 0; i < itemIndex; i++) {
        if (reorderedItems[i].type === 'group') {
          // Count all exercises in the group (with their counts)
          reorderedItems[i].exercises.forEach(({ count }) => {
            currentIndex += count || 1;
          });
        } else {
          currentIndex += reorderedItems[i].count || 1;
        }
      }
      
      const newIndices = [];
      let exerciseOffset = 0;
      reorderedItems[itemIndex].exercises.forEach(({ count }) => {
        const exerciseCount = count || 1;
        for (let i = 0; i < exerciseCount; i++) {
          newIndices.push(currentIndex + exerciseOffset);
          exerciseOffset++;
        }
      });
      
      return {
        ...group,
        exerciseIndices: newIndices,
      };
    }).filter(group => {
      // Only keep groups that still exist in reorderedItems
      return reorderedItems.some(item => item.type === 'group' && item.group.id === group.id);
    });
    
    onReorder(newOrder, updatedGroups);
    onClose();
  }, [reorderedItems, onReorder, onClose, exerciseGroups, groupedExercises]);

  const renderItem = useCallback(({ item, drag, isActive }) => {
    const groupColorScheme = item.type === 'group' 
      ? (item.group.type === 'HIIT' ? defaultHiitColorScheme : defaultSupersetColorScheme)
      : null;

    // Collapse group when dragging (isActive is true)
    const isGroupCollapsed = item.type === 'group' && isActive;

    // Match getGroupContainerStyle from SelectedReview
    const getGroupContainerStyle = (colorScheme, isEdited = false) => ({
      marginVertical: 4,
      borderWidth: 2,
      borderRadius: 8,
      padding: 4,
      borderColor: colorScheme[isEdited ? 300 : 200],
      backgroundColor: colorScheme[isEdited ? 100 : 50],
      borderStyle: isEdited ? 'dashed' : 'solid',
    });

    // Styling for collapsed group container
    const getCollapsedGroupContainerStyle = (colorScheme) => ({
      marginTop: 4,
      borderWidth: 2,
      borderRadius: 8,
      padding: 0,
      borderColor: colorScheme[300],
      backgroundColor: colorScheme[150],
      borderStyle: 'solid',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    });

    // Match getGroupHeaderStyle from SelectedReview
    const getGroupHeaderStyle = (colorScheme) => ({
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
      borderBottomWidth: 0,
      paddingTop: 4,
      paddingBottom: 4,
      paddingLeft: 8,
      paddingRight: 16,
      borderBottomColor: colorScheme[200],
    });

    // Styling for collapsed group header
    const getCollapsedGroupHeaderStyle = (colorScheme) => ({
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 0,
      borderBottomWidth: 0,
      paddingTop: 12,
      paddingBottom: 12,
      paddingLeft: 12,
      paddingRight: 16,
      borderBottomColor: 'transparent',
    });

    // Match getGroupHeaderTypeTextStyle from SelectedReview
    const getGroupHeaderTypeTextStyle = (colorScheme) => ({
      fontSize: 14,
      fontWeight: '600',
      marginRight: 8,
      color: colorScheme[700],
    });

    // Match getGroupHeaderBadgeStyle from SelectedReview
    const getGroupHeaderBadgeStyle = (colorScheme) => ({
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
      backgroundColor: colorScheme[100],
    });

    // Match getGroupHeaderBadgeTextStyle from SelectedReview
    const getGroupHeaderBadgeTextStyle = (colorScheme) => ({
      fontSize: 12,
      fontWeight: 'bold',
      color: colorScheme[600],
    });

    return (
      <TouchableOpacity
        onLongPress={drag}
        disabled={isActive}
        delayLongPress={150}
        activeOpacity={1}
        style={[
          { marginVertical: 4 },
          isActive && {
            opacity: 0.8,
          },
        ]}
      >
          {item.type === 'group' ? (
            <View style={isGroupCollapsed 
              ? getCollapsedGroupContainerStyle(groupColorScheme)
              : [
                  getGroupContainerStyle(groupColorScheme, false),
                  isActive && {
                    backgroundColor: groupColorScheme[100],
                    borderColor: groupColorScheme[200],
                  }
                ]
            }>
              <View style={isGroupCollapsed 
                ? getCollapsedGroupHeaderStyle(groupColorScheme)
                : getGroupHeaderStyle(groupColorScheme)
              }>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Text style={getGroupHeaderTypeTextStyle(groupColorScheme)}>
                    {item.group.type}
                  </Text>
                  <View style={getGroupHeaderBadgeStyle(groupColorScheme)}>
                    <Text style={getGroupHeaderBadgeTextStyle(groupColorScheme)}>
                      {item.group.type === 'HIIT' ? 'H' : 'S'}{item.group.number}
                    </Text>
                  </View>
                </View>
              </View>
              {!isGroupCollapsed && item.exercises.map(({ exercise, index, count }, groupItemIndex) => {
                const uniqueKey = `${exercise.id}-${index}`;
                const selectedCount = count || 1;
                const isFirstInGroup = groupItemIndex === 0;
                const isLastInGroup = groupItemIndex === item.exercises.length - 1;
                
                return (
                  <ExerciseListItem
                    key={uniqueKey}
                    item={{ ...exercise, id: uniqueKey }}
                    isSelected={true}
                    isLastSelected={false}
                    selectionOrder={index + 1}
                    onToggle={() => {}}
                    hideNumber={true}
                    isReordering={false}
                    isReordered={false}
                    showAddMore={true}
                    onAddMore={null}
                    onRemoveSet={null}
                    selectedCount={selectedCount}
                    renderingSection="reviewContainer"
                    exerciseGroup={item.group}
                    isFirstInGroup={isFirstInGroup}
                    isLastInGroup={isLastInGroup}
                    disableTouch={true}
                  />
                );
              })}
            </View>
          ) : (
            <View>
              <ExerciseListItem
                item={item.exercise}
                isSelected={true}
                isLastSelected={false}
                selectionOrder={null}
                onToggle={() => {}}
                hideNumber={false}
                isReordering={false}
                isReordered={false}
                showAddMore={true}
                onAddMore={null}
                onRemoveSet={null}
                selectedCount={item.count || 1}
                renderingSection="reviewContainer"
                exerciseGroup={null}
                disableTouch={true}
              />
            </View>
          )}
      </TouchableOpacity>
    );
  }, []);

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
            Press and hold an item to drag and reorder
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
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[200],
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
    paddingVertical: 8,
    backgroundColor: COLORS.blue[50],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.blue[100],
  },
  instructionsText: {
    fontSize: 12,
    color: COLORS.blue[800],
    textAlign: 'center',
  },
  listContent: {
    gap: 0,
    paddingHorizontal: 2,
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
});

export default DragAndDropModal;
