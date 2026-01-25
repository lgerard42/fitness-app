import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { X, Plus } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import DragAndDropModal from './DragAndDropModal';
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

interface HeaderTopRowProps {
  onClose: () => void;
  onCreate: () => void;
  selectedIds: string[];
  onAdd: () => void;
  selectedOrder: string[];
  exerciseGroups: ExerciseGroup[];
  groupedExercises: GroupedExercise[];
  filtered: ExerciseLibraryItem[];
  getExerciseGroup: ((index: number) => ExerciseGroup | null) | null;
  setExerciseGroups: ((groups: ExerciseGroup[]) => void) | null;
  setSelectedOrder: ((order: string[]) => void) | null;
  setSelectedIds: ((ids: string[] | ((prev: string[]) => string[])) => void) | null;
  setDropsetExerciseIds: ((ids: string[]) => void) | null;
}

const HeaderTopRow: React.FC<HeaderTopRowProps> = ({
  onClose,
  onCreate,
  selectedIds,
  onAdd,
  selectedOrder,
  exerciseGroups,
  groupedExercises,
  filtered,
  getExerciseGroup,
  setExerciseGroups,
  setSelectedOrder,
  setSelectedIds,
  setDropsetExerciseIds,
}) => {
  const [isDragDropModalVisible, setIsDragDropModalVisible] = useState(false);

  const handleReviewPress = useCallback(() => {
    if (selectedIds.length > 0 && selectedOrder.length > 0) {
      setIsDragDropModalVisible(true);
    }
  }, [selectedIds.length, selectedOrder.length]);

  const handleDragDropReorder = useCallback((newOrder: string[], updatedGroups?: ExerciseGroup[], dropsetExerciseIds?: string[]) => {
    if (setSelectedOrder && setExerciseGroups) {
      setSelectedOrder(newOrder);

      if (updatedGroups) {
        setExerciseGroups(updatedGroups);
      }

      // Update selectedIds to remove exercises that are no longer in the order
      if (setSelectedIds) {
        setSelectedIds(prev => {
          // Get unique exercise IDs from newOrder
          const uniqueIdsInOrder = Array.from(new Set(newOrder));
          // Keep only IDs that are still in the order
          return prev.filter(id => uniqueIdsInOrder.includes(id));
        });
      }

      // Store dropset exercise IDs (always set, even if empty array)
      if (setDropsetExerciseIds) {
        setDropsetExerciseIds(dropsetExerciseIds || []);
      }
    }
  }, [setSelectedOrder, setExerciseGroups, setSelectedIds, setDropsetExerciseIds]);

  return (
    <>
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={COLORS.slate[500]} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onCreate} style={styles.createButton}>
            <Plus size={14} color={COLORS.slate[700]} />
            <Text style={styles.createButtonText}>Create</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={handleReviewPress}
            disabled={selectedIds.length === 0 || selectedOrder.length === 0}
            style={[styles.reviewButton, (selectedIds.length === 0 || selectedOrder.length === 0) && styles.reviewButtonDisabled]}
          >
            <Text style={[styles.reviewButtonText, (selectedIds.length === 0 || selectedOrder.length === 0) && styles.reviewButtonTextDisabled]}>Review</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onAdd}
            disabled={selectedIds.length === 0}
            style={[styles.addButton, selectedIds.length === 0 && styles.addButtonDisabled]}
          >
            <Text style={styles.addButtonText}>
              Add {selectedIds.length > 0 && `(${selectedIds.length})`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

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
    </>
  );
};

const styles = StyleSheet.create({
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    zIndex: 101,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  closeButton: {
    padding: 4,
    marginLeft: -8,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.slate[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  createButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.slate[700],
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 102,
  },
  reviewButton: {
    backgroundColor: COLORS.blue[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.blue[400],
    borderStyle: 'dashed',
  },
  reviewButtonDisabled: {
    opacity: 0.5,
    borderColor: COLORS.slate[400],
  },
  reviewButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.blue[700],
  },
  reviewButtonTextDisabled: {
    color: COLORS.slate[600],
  },
  addButton: {
    backgroundColor: COLORS.blue[600],
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.blue[600],
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});

export default HeaderTopRow;
