import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';
import DragAndDropModal from './DragAndDropModal';

const SelectedReview = ({
  selectedExercises,
  selectedOrder,
  groupedExercises = [],
  exerciseGroups = [],
  getExerciseGroup = null,
  filtered = [],
  setExerciseGroups = null,
  setSelectedOrder = null,
}) => {
  const [isDragDropModalVisible, setIsDragDropModalVisible] = useState(false);

  const handleLongPress = useCallback(() => {
    if (selectedExercises.length > 0 && selectedOrder.length > 0) {
      setIsDragDropModalVisible(true);
    }
  }, [selectedExercises.length, selectedOrder.length]);

  const handleDragDropReorder = useCallback((newOrder, updatedGroups) => {
    if (setSelectedOrder && setExerciseGroups) {
      // Update selectedOrder
      setSelectedOrder(newOrder);

      // Update exerciseGroups
      if (updatedGroups) {
        setExerciseGroups(updatedGroups);
      }
    }
  }, [setSelectedOrder, setExerciseGroups]);

  const hasExercises = selectedExercises.length > 0;

  return (
    <View style={styles.rootContainer}>
      {hasExercises && (
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.headerEnabled}
          onPress={handleLongPress}
        >
          <Text style={styles.reviewSelectionsText}>
            Review selections
          </Text>
        </TouchableOpacity>
      )}

      <DragAndDropModal
        visible={isDragDropModalVisible}
        onClose={() => setIsDragDropModalVisible(false)}
        selectedOrder={selectedOrder}
        exerciseGroups={exerciseGroups}
        groupedExercises={groupedExercises}
        filtered={filtered}
        getExerciseGroup={getExerciseGroup}
        onReorder={handleDragDropReorder}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    borderBottomColor: COLORS.slate[200],
    borderBottomWidth: 2,
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
  reviewSelectionsText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.white,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});

export default SelectedReview;
