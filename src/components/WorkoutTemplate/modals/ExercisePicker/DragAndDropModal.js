import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
// #region agent log
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
fetch('http://127.0.0.1:7243/ingest/751917f3-6b76-4143-ba7e-6983111b1561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DragAndDropModal.js:4',message:'DraggableFlatList import attempt',data:{module:'react-native-draggable-flatlist'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
// #endregion
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
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/751917f3-6b76-4143-ba7e-6983111b1561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DragAndDropModal.js:18',message:'DragAndDropModal component initialized',data:{visible},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  // Build a flat list of items (groups and individual exercises)
  const dragItems = useMemo(() => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/751917f3-6b76-4143-ba7e-6983111b1561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DragAndDropModal.js:19',message:'dragItems useMemo executing',data:{selectedOrderLength:selectedOrder?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
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

  const [items, setItems] = useState(dragItems);

  // Update items when props change
  React.useEffect(() => {
    setItems(dragItems);
  }, [dragItems]);

  const handleDragEnd = useCallback(({ data }) => {
    setItems(data);
  }, []);

  const handleSave = useCallback(() => {
    if (!onReorder) return;
    
    // Rebuild selectedOrder based on new item order
    const newOrder = [];
    
    items.forEach(item => {
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
      const itemIndex = items.findIndex(item => 
        item.type === 'group' && item.group.id === group.id
      );
      
      if (itemIndex === -1) {
        // Group not found, return as is
        return group;
      }
      
      // Calculate new indices for this group
      let currentIndex = 0;
      for (let i = 0; i < itemIndex; i++) {
        if (items[i].type === 'group') {
          // Count all exercises in the group (with their counts)
          items[i].exercises.forEach(({ count }) => {
            currentIndex += count || 1;
          });
        } else {
          currentIndex += items[i].count || 1;
        }
      }
      
      const newIndices = [];
      let exerciseOffset = 0;
      items[itemIndex].exercises.forEach(({ count }) => {
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
      // Only keep groups that still exist in items
      return items.some(item => item.type === 'group' && item.group.id === group.id);
    });
    
    onReorder(newOrder, updatedGroups);
    onClose();
  }, [items, onReorder, onClose, exerciseGroups, groupedExercises]);

  const renderItem = useCallback(({ item, drag, isActive }) => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/751917f3-6b76-4143-ba7e-6983111b1561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DragAndDropModal.js:168',message:'renderItem callback executing',data:{itemType:item?.type,isActive,hasDrag:!!drag},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    const groupColorScheme = item.type === 'group' 
      ? (item.group.type === 'HIIT' ? defaultHiitColorScheme : defaultSupersetColorScheme)
      : null;

    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={() => {
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/751917f3-6b76-4143-ba7e-6983111b1561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DragAndDropModal.js:179',message:'onLongPress triggered, calling drag',data:{itemType:item?.type},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            if (drag) drag();
          }}
          disabled={isActive}
          delayLongPress={200}
          style={[
            styles.itemWrapper,
            isActive && styles.itemWrapperActive,
            item.type === 'group' && styles.groupWrapper,
            item.type === 'group' && {
              borderColor: groupColorScheme[200],
              backgroundColor: groupColorScheme[50],
            },
          ]}
        >
          {item.type === 'group' ? (
            <View style={styles.groupContainer}>
              <View style={[
                styles.groupHeader,
                { borderBottomColor: groupColorScheme[200] },
              ]}>
                <View style={styles.groupHeaderLeft}>
                  <Text style={[
                    styles.groupHeaderTypeText,
                    { color: groupColorScheme[700] },
                  ]}>
                    {item.group.type}
                  </Text>
                  <View style={[
                    styles.groupHeaderBadge,
                    { backgroundColor: groupColorScheme[100] },
                  ]}>
                    <Text style={[
                      styles.groupHeaderBadgeText,
                      { color: groupColorScheme[600] },
                    ]}>
                      {item.group.type === 'HIIT' ? 'H' : 'S'}{item.group.number}
                    </Text>
                  </View>
                </View>
              </View>
              {item.exercises.map(({ exercise, index, count }, groupItemIndex) => {
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
                    selectionOrder={null}
                    onToggle={() => {}}
                    hideNumber={true}
                    isReordering={false}
                    isReordered={false}
                    showAddMore={false}
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
            <ExerciseListItem
              item={item.exercise}
              isSelected={true}
              isLastSelected={false}
              selectionOrder={null}
              onToggle={() => {}}
              hideNumber={false}
              isReordering={false}
              isReordered={false}
              showAddMore={false}
              selectedCount={item.count || 1}
              renderingSection="reviewContainer"
              exerciseGroup={null}
              disableTouch={true}
            />
          )}
        </TouchableOpacity>
      </ScaleDecorator>
    );
  }, [groupedExercises]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
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

        {items.length > 0 ? (
          // #region agent log
          (() => { fetch('http://127.0.0.1:7243/ingest/751917f3-6b76-4143-ba7e-6983111b1561',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DragAndDropModal.js:289',message:'About to render DraggableFlatList',data:{itemsCount:items.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{}); return null; })() ||
          // #endregion
          <DraggableFlatList
            data={items}
            onDragEnd={handleDragEnd}
            keyExtractor={(item) => item.id}
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
    padding: 8,
  },
  itemWrapper: {
    marginVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  itemWrapperActive: {
    opacity: 0.8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  groupWrapper: {
    borderWidth: 2,
  },
  groupContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupHeaderTypeText: {
    fontSize: 14,
    fontWeight: '600',
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
