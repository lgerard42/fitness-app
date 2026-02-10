import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { X, Plus } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { Z_INDEX, PADDING, BORDER_RADIUS, SPACING } from '@/constants/layout';
import DragAndDropModal from './ExercisePickerDragAndDropModal/indexExercisePickerDragAndDrop';
import type { SetGroup } from '@/utils/workoutInstanceHelpers';
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
  setExerciseSetGroups: ((map: Record<string, SetGroup[]>) => void) | null;
  setItemIdToOrderIndices?: ((map: Record<string, number[]>) => void) | null;
  setItemSetGroupsMap?: ((map: Record<string, SetGroup[]>) => void) | null;
  onBeforeOpenDragDrop?: (() => { itemSetGroupsMap: Record<string, SetGroup[]>; itemIdToOrderIndices: Record<string, number[]> } | undefined) | null;
  itemSetGroupsMap?: Record<string, SetGroup[]>;
  itemIdToOrderIndices?: Record<string, number[]>;
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
  setExerciseSetGroups,
  setItemIdToOrderIndices,
  setItemSetGroupsMap,
  onBeforeOpenDragDrop = null,
  itemSetGroupsMap: itemSetGroupsMapProp,
  itemIdToOrderIndices: itemIdToOrderIndicesProp,
}) => {
  const [isDragDropModalVisible, setIsDragDropModalVisible] = useState(false);
  const [exerciseSetGroups, setExerciseSetGroupsLocal] = useState<Record<string, SetGroup[]>>({});
  const [itemIdToOrderIndicesLocal, setItemIdToOrderIndicesLocal] = useState<Record<string, number[]>>({});
  const [itemSetGroupsMapLocal, setItemSetGroupsMapLocal] = useState<Record<string, SetGroup[]>>({});
  
  // Use local state (which gets updated on sync) or prop values as fallback
  const itemIdToOrderIndices = itemIdToOrderIndicesLocal || itemIdToOrderIndicesProp;
  const itemSetGroupsMap = itemSetGroupsMapLocal || itemSetGroupsMapProp;

  const handleReviewPress = useCallback(() => {
    if (selectedIds.length > 0 && selectedOrder.length > 0) {
      // Sync list view changes to drag and drop before opening
      let syncedItemSetGroupsMap = itemSetGroupsMapProp;
      let syncedItemIdToOrderIndices = itemIdToOrderIndicesProp;
      
      if (onBeforeOpenDragDrop) {
        const updatedData = onBeforeOpenDragDrop();
        if (updatedData) {
          syncedItemSetGroupsMap = updatedData.itemSetGroupsMap;
          syncedItemIdToOrderIndices = updatedData.itemIdToOrderIndices;
          // Update local state with synced data immediately
          setItemSetGroupsMapLocal(updatedData.itemSetGroupsMap);
          setItemIdToOrderIndicesLocal(updatedData.itemIdToOrderIndices);
        }
      } else {
        if (itemSetGroupsMapProp) {
          setItemSetGroupsMapLocal(itemSetGroupsMapProp);
        }
        if (itemIdToOrderIndicesProp) {
          setItemIdToOrderIndicesLocal(itemIdToOrderIndicesProp);
        }
      }
      
      setIsDragDropModalVisible(true);
    }
  }, [selectedIds.length, selectedOrder.length, onBeforeOpenDragDrop, itemSetGroupsMapProp, itemIdToOrderIndicesProp]);

  const handleDragDropReorder = useCallback((newOrder: string[], updatedGroups?: ExerciseGroup[], dropsetExerciseIds?: string[], setGroupsMap?: Record<string, SetGroup[]>, itemIdToOrderIndices?: Record<string, number[]>, itemSetGroupsMap?: Record<string, SetGroup[]>) => {
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
      
      // Store the setGroups map for preserving multi-setGroup structure
      if (setGroupsMap) {
        setExerciseSetGroupsLocal(setGroupsMap);
        if (setExerciseSetGroups) {
          setExerciseSetGroups(setGroupsMap);
        }
      }
      
      // Store item structure maps for preserving separate cards
      if (itemIdToOrderIndices && itemSetGroupsMap) {
        setItemIdToOrderIndicesLocal(itemIdToOrderIndices);
        setItemSetGroupsMapLocal(itemSetGroupsMap);
        if (setItemIdToOrderIndices) {
          setItemIdToOrderIndices(itemIdToOrderIndices);
        }
        if (setItemSetGroupsMap) {
          setItemSetGroupsMap(itemSetGroupsMap);
        }
      }
    }
  }, [setSelectedOrder, setExerciseGroups, setSelectedIds, setDropsetExerciseIds, setExerciseSetGroups]);

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
        exerciseSetGroups={exerciseSetGroups}
        itemIdToOrderIndices={itemIdToOrderIndices}
        itemSetGroupsMap={itemSetGroupsMap}
      />
    </>
  );
};

const styles = StyleSheet.create({
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: PADDING.base,
    zIndex: Z_INDEX.headerTop,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PADDING.base,
  },
  closeButton: {
    padding: PADDING.xs,
    marginLeft: -PADDING.md,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PADDING.xs,
    backgroundColor: COLORS.slate[100],
    paddingHorizontal: PADDING.base,
    paddingVertical: PADDING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  createButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.slate[700],
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PADDING.base,
    zIndex: Z_INDEX.headerRight,
  },
  reviewButton: {
    backgroundColor: COLORS.blue[50],
    paddingHorizontal: PADDING.base,
    paddingVertical: PADDING.sm,
    borderRadius: BORDER_RADIUS.lg,
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
    paddingHorizontal: PADDING.lg,
    paddingVertical: PADDING.sm,
    borderRadius: BORDER_RADIUS.lg,
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
