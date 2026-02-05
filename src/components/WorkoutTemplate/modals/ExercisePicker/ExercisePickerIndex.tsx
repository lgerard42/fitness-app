import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { COLORS } from '@/constants/colors';
import { Z_INDEX, PADDING, BORDER_RADIUS } from '@/constants/layout';
import { filterExercises, getAvailableSecondaryMusclesForPrimaries } from '@/utils/exerciseFilters';
import HeaderTopRow from './HeaderTopRow';
import SearchBar from './SearchBar';
import Filters from './Filters';
import SelectedInGlossary from './SelectedInGlossary';
import type { ExerciseLibraryItem, GroupType } from '@/types/workout';
import type { SetGroup } from './DragAndDropModal';

interface ExercisePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (exercises: (ExerciseLibraryItem & { _setCount?: number; _isDropset?: boolean; _setGroups?: SetGroup[] })[], groupType: GroupType | null, groupsMetadata: any) => void;
  onCreate: () => void;
  exercises: ExerciseLibraryItem[];
  newlyCreatedId?: string | null;
}

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

const ExercisePicker: React.FC<ExercisePickerProps> = ({ isOpen, onClose, onAdd, onCreate, exercises, newlyCreatedId = null }) => {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  const [filterMuscle, setFilterMuscle] = useState<string[]>([]);
  const [filterEquip, setFilterEquip] = useState<string[]>([]);
  const [filterSecondaryMuscle, setFilterSecondaryMuscle] = useState<string[]>([]);

  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<string[]>([]);
  const [isSelectedSectionCollapsed, setIsSelectedSectionCollapsed] = useState(false);
  const [highlightedLetter, setHighlightedLetter] = useState<string | null>(null);

  const [exerciseGroups, setExerciseGroups] = useState<ExerciseGroup[]>([]);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [groupSelectionMode, setGroupSelectionMode] = useState<'create' | 'edit' | null>(null);
  const [selectedGroupType, setSelectedGroupType] = useState<GroupType>('Superset');
  const [groupSelectionIndices, setGroupSelectionIndices] = useState<number[]>([]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [dropsetExerciseIds, setDropsetExerciseIdsRaw] = useState<string[]>([]);
  const dropsetExerciseIdsRef = useRef<string[]>([]);
  
  // Custom setter that updates both ref and state atomically
  // This ensures the ref is ALWAYS up-to-date immediately, not after a render cycle
  const setDropsetExerciseIds = useCallback((ids: string[]) => {
    dropsetExerciseIdsRef.current = ids; // Update ref IMMEDIATELY (sync)
    setDropsetExerciseIdsRaw(ids);       // Queue state update (async)
  }, []);

  const [exerciseSetGroups, setExerciseSetGroups] = useState<Record<string, SetGroup[]>>({});
  const [itemIdToOrderIndices, setItemIdToOrderIndices] = useState<Record<string, number[]>>({});
  const [itemSetGroupsMap, setItemSetGroupsMap] = useState<Record<string, SetGroup[]>>({});

  useEffect(() => {
    if (newlyCreatedId && !selectedIds.includes(newlyCreatedId)) {
      const exerciseExists = exercises.some(ex => ex.id === newlyCreatedId);
      if (exerciseExists) {
        setSelectedIds(prev => [...prev, newlyCreatedId]);
        setSearch("");
        setFilterCategory([]);
        setFilterMuscle([]);
        setFilterEquip([]);
        setFilterSecondaryMuscle([]);
      }
    }
  }, [newlyCreatedId, selectedIds, exercises]);

  useEffect(() => {
    if (isOpen) {
      setIsSelectedSectionCollapsed(true);
    }
  }, [isOpen]);

  const availableSecondaryMuscles = useMemo((): string[] => {
    return getAvailableSecondaryMusclesForPrimaries(filterMuscle);
  }, [filterMuscle]);

  const getAvailableSecondaryMuscles = useCallback((): string[] => {
    return availableSecondaryMuscles;
  }, [availableSecondaryMuscles]);

  const filtered = useMemo(() => {
    return filterExercises(exercises, {
      search,
      category: filterCategory,
      primaryMuscle: filterMuscle,
      secondaryMuscle: filterSecondaryMuscle,
      equipment: filterEquip,
    });
  }, [exercises, search, filterCategory, filterMuscle, filterSecondaryMuscle, filterEquip]);

  const getGroupedExercises = useMemo((): GroupedExercise[] => {
    const groups: GroupedExercise[] = [];
    let currentGroup: GroupedExercise | null = null;

    selectedOrder.forEach((id, index) => {
      if (currentGroup === null || currentGroup.id !== id) {
        const exercise = filtered.find(ex => ex.id === id);
        if (exercise) {
          currentGroup = {
            id,
            exercise,
            count: 1,
            startIndex: index,
            orderIndices: [index]
          };
          groups.push(currentGroup);
        }
      } else {
        currentGroup.count++;
        currentGroup.orderIndices.push(index);
      }
    });

    return groups;
  }, [selectedOrder, filtered]);

  const selectedExercises = getGroupedExercises.map(group => group.exercise);
  const allFilteredExercises = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        setSelectedOrder(prevOrder => {
          const lastIndex = prevOrder.lastIndexOf(id);
          if (lastIndex !== -1) {
            const newOrder = [...prevOrder];
            newOrder.splice(lastIndex, 1);
            const remainingCount = newOrder.filter(i => i === id).length;

            setExerciseGroups(prevGroups => {
              let updatedGroups = prevGroups.map(group => ({
                ...group,
                exerciseIndices: group.exerciseIndices
                  .filter(idx => idx !== lastIndex)
                  .map(idx => idx > lastIndex ? idx - 1 : idx)
                  .sort((a, b) => a - b)
              })).filter(group => group.exerciseIndices.length >= 2);

              const types: GroupType[] = ['Superset', 'HIIT'];
              types.forEach(type => {
                const groupsOfType = updatedGroups.filter(g => g.type === type).sort((a, b) => a.number - b.number);
                updatedGroups = updatedGroups.map(group => {
                  const typeIndex = groupsOfType.findIndex(g => g.id === group.id);
                  if (typeIndex !== -1) {
                    return { ...group, number: typeIndex + 1 };
                  }
                  return group;
                });
              });

              return updatedGroups;
            });

            if (remainingCount === 0) {
              setSelectedIds(prevIds => prevIds.filter(i => i !== id));
            }
            return newOrder;
          }
          return prevOrder;
        });
        return prev;
      } else {
        setSelectedOrder(prevOrder => {
          const newIndex = prevOrder.length;
          const newOrder = [...prevOrder, id];

          if (prevOrder.length > 0 && prevOrder[prevOrder.length - 1] === id) {
            const lastIndex = prevOrder.length - 1;

            setExerciseGroups(prevGroups => {
              const lastExerciseGroup = prevGroups.find(group =>
                group.exerciseIndices.includes(lastIndex)
              );

              if (lastExerciseGroup) {
                return prevGroups.map(group =>
                  group.id === lastExerciseGroup.id
                    ? { ...group, exerciseIndices: [...group.exerciseIndices, newIndex].sort((a, b) => a - b) }
                    : group
                );
              }

              return prevGroups;
            });
          }

          return newOrder;
        });
        return [...prev, id];
      }
    });
  };

  const getGroupedByType = useCallback((type: GroupType): ExerciseGroup[] => {
    return exerciseGroups
      .filter(group => group.type === type)
      .sort((a, b) => a.number - b.number);
  }, [exerciseGroups]);

  const getNextGroupNumber = useCallback((type: GroupType): number => {
    const groupsOfType = getGroupedByType(type);
    if (groupsOfType.length === 0) return 1;
    const maxNumber = Math.max(...groupsOfType.map(g => g.number));
    return maxNumber + 1;
  }, [getGroupedByType]);

  const renumberGroups = useCallback((type: GroupType) => {
    setExerciseGroups(prev => {
      const groupsOfType = prev.filter(g => g.type === type).sort((a, b) => a.number - b.number);
      const otherGroups = prev.filter(g => g.type !== type);
      const renumbered = groupsOfType.map((group, index) => ({
        ...group,
        number: index + 1
      }));
      return [...otherGroups, ...renumbered];
    });
  }, []);

  const getExerciseGroup = useCallback((exerciseIndex: number): ExerciseGroup | null => {
    return exerciseGroups.find(group => group.exerciseIndices.includes(exerciseIndex)) || null;
  }, [exerciseGroups]);

  const handleReorder = (newOrder: string[]) => {
    setSelectedOrder(newOrder);
    setExerciseGroups(prev => {
      return prev.map(group => {
        const newIndices = group.exerciseIndices
          .map(oldIndex => {
            const exerciseId = selectedOrder[oldIndex];
            const newIndex = newOrder.indexOf(exerciseId);
            return newIndex;
          })
          .filter(idx => idx !== -1)
          .sort((a, b) => a - b);
        return {
          ...group,
          exerciseIndices: newIndices
        };
      });
    });
  };

  const handleAddSet = (id: string, groupIndex: number | null = null) => {
    if (groupIndex !== null) {
      if (groupIndex >= 0 && groupIndex < getGroupedExercises.length) {
        const targetGroup = getGroupedExercises[groupIndex];
        const lastGroupIndex = targetGroup.orderIndices[targetGroup.orderIndices.length - 1];
        setSelectedOrder(prevOrder => {
          const newOrder = [...prevOrder];
          newOrder.splice(lastGroupIndex + 1, 0, id);
          return newOrder;
        });
        setSelectedIds(prevIds => prevIds.includes(id) ? prevIds : [...prevIds, id]);
      }
    } else {
      setSelectedOrder(prevOrder => {
        const newIndex = prevOrder.length;
        const newOrder = [...prevOrder, id];

        if (prevOrder.length > 0 && prevOrder[prevOrder.length - 1] === id) {
          const lastIndex = prevOrder.length - 1;

          setExerciseGroups(prevGroups => {
            const lastExerciseGroup = prevGroups.find(group =>
              group.exerciseIndices.includes(lastIndex)
            );

            if (lastExerciseGroup) {
              return prevGroups.map(group =>
                group.id === lastExerciseGroup.id
                  ? { ...group, exerciseIndices: [...group.exerciseIndices, newIndex].sort((a, b) => a - b) }
                  : group
              );
            }

            return prevGroups;
          });
        }

        return newOrder;
      });
      setSelectedIds(prevIds => prevIds.includes(id) ? prevIds : [...prevIds, id]);
    }
  };

  const handleRemoveSet = (id: string, groupIndex: number | null = null) => {
    if (groupIndex !== null) {
      if (groupIndex >= 0 && groupIndex < getGroupedExercises.length) {
        const targetGroup = getGroupedExercises[groupIndex];
        if (targetGroup.id === id && targetGroup.orderIndices.length > 0) {
          const indexToRemove = targetGroup.orderIndices[targetGroup.orderIndices.length - 1];
          setSelectedOrder(prevOrder => {
            const newOrder = [...prevOrder];
            newOrder.splice(indexToRemove, 1);

            setExerciseGroups(prevGroups => {
              let updatedGroups = prevGroups.map(group => {
                if (group.id === targetGroup.id) {
                  const newIndices = group.exerciseIndices
                    .filter(idx => idx !== indexToRemove)
                    .map(idx => idx > indexToRemove ? idx - 1 : idx)
                    .sort((a, b) => a - b);
                  return { ...group, exerciseIndices: newIndices };
                } else {
                  return {
                    ...group,
                    exerciseIndices: group.exerciseIndices
                      .map(idx => idx > indexToRemove ? idx - 1 : idx)
                      .sort((a, b) => a - b)
                  };
                }
              }).filter(group => group.exerciseIndices.length >= 2);

              const types: GroupType[] = ['Superset', 'HIIT'];
              types.forEach(type => {
                const groupsOfType = updatedGroups.filter(g => g.type === type).sort((a, b) => a.number - b.number);
                updatedGroups = updatedGroups.map(group => {
                  const typeIndex = groupsOfType.findIndex(g => g.id === group.id);
                  if (typeIndex !== -1) {
                    return { ...group, number: typeIndex + 1 };
                  }
                  return group;
                });
              });

              return updatedGroups;
            });

            const remainingCount = newOrder.filter(i => i === id).length;
            if (remainingCount === 0) {
              setSelectedIds(prevIds => prevIds.filter(i => i !== id));
            }
            return newOrder;
          });
        }
      }
    } else {
      setSelectedOrder(prevOrder => {
        const lastIndex = prevOrder.lastIndexOf(id);
        if (lastIndex !== -1) {
          const newOrder = [...prevOrder];
          newOrder.splice(lastIndex, 1);

          setExerciseGroups(prevGroups => {
            let updatedGroups = prevGroups.map(group => ({
              ...group,
              exerciseIndices: group.exerciseIndices
                .filter(idx => idx !== lastIndex)
                .map(idx => idx > lastIndex ? idx - 1 : idx)
                .sort((a, b) => a - b)
            })).filter(group => group.exerciseIndices.length >= 2);

            const types: GroupType[] = ['Superset', 'HIIT'];
            types.forEach(type => {
              const groupsOfType = updatedGroups.filter(g => g.type === type).sort((a, b) => a.number - b.number);
              updatedGroups = updatedGroups.map(group => {
                const typeIndex = groupsOfType.findIndex(g => g.id === group.id);
                if (typeIndex !== -1) {
                  return { ...group, number: typeIndex + 1 };
                }
                return group;
              });
            });

            return updatedGroups;
          });

          const remainingCount = newOrder.filter(i => i === id).length;
          if (remainingCount === 0) {
            setSelectedIds(prevIds => prevIds.filter(i => i !== id));
          }
          return newOrder;
        }
        return prevOrder;
      });
    }
  };

  const handleCreateGroup = useCallback((type: GroupType, selectedIndices: number[]) => {
    const sortedIndices = [...selectedIndices].sort((a, b) => a - b);
    const firstIndex = sortedIndices[0];
    const nextNumber = getNextGroupNumber(type);

    setSelectedOrder(prevOrder => {
      const newOrder = [...prevOrder];
      const groupExerciseIds = sortedIndices.map(idx => newOrder[idx]);

      const indicesToRemove = [...sortedIndices].sort((a, b) => b - a);
      indicesToRemove.forEach(idx => {
        newOrder.splice(idx, 1);
      });

      const insertPosition = firstIndex;
      newOrder.splice(insertPosition, 0, ...groupExerciseIds);

      const newGroupIndices = groupExerciseIds.map((_, idx) => insertPosition + idx);

      setExerciseGroups(prevGroups => {
        const updatedGroups = prevGroups.map(group => ({
          ...group,
          exerciseIndices: group.exerciseIndices.map(oldIdx => {
            const removedBefore = sortedIndices.filter(idx => idx < oldIdx).length;

            if (sortedIndices.includes(oldIdx)) {
              const offset = sortedIndices.indexOf(oldIdx);
              return insertPosition + offset;
            } else if (oldIdx < firstIndex) {
              return oldIdx;
            } else {
              return oldIdx - removedBefore + sortedIndices.length;
            }
          }).sort((a, b) => a - b)
        }));

        const newGroup: ExerciseGroup = {
          id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type,
          number: nextNumber,
          exerciseIndices: newGroupIndices
        };

        return [...updatedGroups, newGroup];
      });

      return newOrder;
    });
  }, [getNextGroupNumber]);

  const convertToWorkoutFormat = useCallback(() => {
    // Use ref for immediate access to latest dropset IDs (avoids state sync issues)
    const currentDropsetIds = dropsetExerciseIdsRef.current;
    const dropsetSet = new Set(currentDropsetIds);
    
    // Build exercises array - one entry per unique exercise, with setGroups info if available
    // This preserves the multi-setGroup structure (e.g., dropset x 2, dropset x 2, x 1)
    const exercisesToAdd: (ExerciseLibraryItem & { _setCount?: number; _isDropset?: boolean; _setGroups?: SetGroup[] })[] = [];

    getGroupedExercises.forEach((group) => {
      const setGroups = exerciseSetGroups[group.exercise.id];

      if (setGroups && setGroups.length > 0) {
        // Pass setGroups information to preserve structure
        exercisesToAdd.push({
          ...group.exercise,
          _setGroups: setGroups,
          // Keep _setCount and _isDropset for backward compatibility
          _setCount: setGroups.reduce((sum, sg) => sum + sg.count, 0),
          _isDropset: setGroups.some(sg => sg.isDropset),
        });
      } else {
        // Fallback: use total count (backward compatibility)
        exercisesToAdd.push({
          ...group.exercise,
          _setCount: group.count,
          _isDropset: dropsetSet.has(group.exercise.id),
        });
      }
    });

    // Build groupsMetadata with exerciseIndices relative to the exercises array
    const groupsMetadata: Array<{
      id: string;
      type: GroupType;
      number: number;
      exerciseIndices: number[];
    }> = [];

    if (exerciseGroups.length > 0) {
      // Create a map from exercise ID to its index in exercisesToAdd
      const exerciseIdToIndex = new Map<string, number>();
      exercisesToAdd.forEach((ex, index) => {
        exerciseIdToIndex.set(ex.id, index);
      });

      // Process each group
      exerciseGroups.forEach((group) => {
        // Get unique exercise IDs in this group (based on selectedOrder indices)
        const groupExerciseIds = new Set<string>();
        group.exerciseIndices.forEach((idx) => {
          if (idx < selectedOrder.length) {
            groupExerciseIds.add(selectedOrder[idx]);
          }
        });

        // Map to indices in exercisesToAdd array
        const groupIndices: number[] = [];
        groupExerciseIds.forEach((exerciseId) => {
          const exerciseIndex = exerciseIdToIndex.get(exerciseId);
          if (exerciseIndex !== undefined && !groupIndices.includes(exerciseIndex)) {
            groupIndices.push(exerciseIndex);
          }
        });

        // Sort to maintain order
        groupIndices.sort((a, b) => a - b);

        if (groupIndices.length > 0) {
          groupsMetadata.push({
            id: group.id,
            type: group.type,
            number: group.number,
            exerciseIndices: groupIndices
          });
        }
      });
    }

    return {
      exercisesToAdd,
      groupsMetadata: groupsMetadata.length > 0 ? groupsMetadata : null
    };
  }, [selectedOrder, exerciseGroups, getGroupedExercises, filtered, exerciseSetGroups]);

  const handleAddAction = () => {
    const { exercisesToAdd, groupsMetadata } = convertToWorkoutFormat();
    onAdd(exercisesToAdd, null, groupsMetadata);
    setSelectedIds([]);
    setSelectedOrder([]);
    setExerciseGroups([]);
    setIsGroupMode(false);
    setEditingGroupId(null);
    setGroupSelectionMode(null);
    setSelectedGroupType('Superset');
    setGroupSelectionIndices([]);
    setDropsetExerciseIds([]);
    setExerciseSetGroups({});
    setItemIdToOrderIndices({});
    setItemSetGroupsMap({});
  };

  const handleClose = () => {
    setSelectedIds([]);
    setSelectedOrder([]);
    setExerciseGroups([]);
    setIsGroupMode(false);
    setEditingGroupId(null);
    setGroupSelectionMode(null);
    setSelectedGroupType('Superset');
    setGroupSelectionIndices([]);
    setDropsetExerciseIds([]);
    setExerciseSetGroups({});
    setItemIdToOrderIndices({});
    setItemSetGroupsMap({});
    onClose();
  };

  const blockDismissGestureRef = useRef<any>(null);

  const blockDismissGesture = useMemo(() =>
    Gesture.Pan()
      .withRef(blockDismissGestureRef)
      .activeOffsetY([-10, 10])
      .onStart(() => { })
      .onUpdate(() => { })
      .onEnd(() => { }),
    []
  );

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="overFullScreen" transparent={true} onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.sheetContainer}>
          <SafeAreaView style={styles.container}>
            {openFilter && (
              <TouchableOpacity
                style={styles.dropdownBackdrop}
                activeOpacity={1}
                onPress={() => setOpenFilter(null)}
              />
            )}
            <View style={styles.header}>
              <HeaderTopRow
                onClose={handleClose}
                onCreate={onCreate}
                selectedIds={selectedIds}
                onAdd={handleAddAction}
                selectedOrder={selectedOrder}
                exerciseGroups={exerciseGroups}
                groupedExercises={getGroupedExercises}
                filtered={filtered}
                getExerciseGroup={getExerciseGroup}
                setExerciseGroups={setExerciseGroups}
                setSelectedOrder={setSelectedOrder}
                setSelectedIds={setSelectedIds}
                setDropsetExerciseIds={setDropsetExerciseIds}
                setExerciseSetGroups={setExerciseSetGroups}
                setItemIdToOrderIndices={setItemIdToOrderIndices}
                setItemSetGroupsMap={setItemSetGroupsMap}
              />
              <SearchBar search={search} setSearch={setSearch} />
              <Filters
                filterCategory={filterCategory}
                filterMuscle={filterMuscle}
                filterEquip={filterEquip}
                filterSecondaryMuscle={filterSecondaryMuscle}
                setFilterCategory={setFilterCategory}
                setFilterMuscle={setFilterMuscle}
                setFilterEquip={setFilterEquip}
                setFilterSecondaryMuscle={setFilterSecondaryMuscle}
                openFilter={openFilter}
                setOpenFilter={setOpenFilter}
                getAvailableSecondaryMuscles={getAvailableSecondaryMuscles}
              />
            </View>

            <GestureDetector gesture={blockDismissGesture}>
              <View style={styles.listContainer}>
                {isSelectedSectionCollapsed && (
                  <SelectedInGlossary
                    exercises={allFilteredExercises}
                    onToggleSelect={handleToggleSelect}
                    highlightedLetter={highlightedLetter}
                    setHighlightedLetter={setHighlightedLetter}
                    selectedIds={selectedIds}
                    selectedOrder={selectedOrder}
                    onAddSet={handleAddSet}
                    onRemoveSet={handleRemoveSet}
                    blockDismissGestureRef={blockDismissGestureRef}
                  />
                )}
              </View>
            </GestureDetector>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetContainer: {
    flex: 0.95,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    marginTop: 10,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    paddingHorizontal: PADDING.container.horizontal,
    paddingTop: PADDING.container.top,
    paddingBottom: PADDING.container.bottom,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[200],
    zIndex: Z_INDEX.header,
  },
  dropdownBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: Z_INDEX.backdrop,
    backgroundColor: 'transparent',
  },
  listContainer: {
    flex: 1,
  },
});

export default ExercisePicker;
