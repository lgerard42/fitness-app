import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Modal, TouchableOpacity, StyleSheet, InteractionManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { COLORS } from '@/constants/colors';
import { Z_INDEX, PADDING, BORDER_RADIUS } from '@/constants/layout';
import { filterExercises, getAvailableSecondaryMusclesForPrimaries } from '@/utils/exerciseFilters';
import { usePrimaryToSecondaryMap } from '@/database/useExerciseConfig';
import HeaderTopRow from './HeaderTopRow';
import SearchBar from './SearchBar';
import Filters from './Filters';
import SelectedInGlossary from './SelectedInGlossary';
import SetDragModal from '../SetRowDragAndDropModal/indexSetRowDragAndDrop';
import type { ExerciseLibraryItem, GroupType, Set } from '@/types/workout';
import type { SetGroup } from '@/utils/workoutInstanceHelpers';
import type { SetDragListItem } from '../../hooks/useSetDragAndDrop';

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

  // exerciseSetGroups: maps exerciseId -> SetGroup[] (for simple cases)
  // exerciseInstanceSetGroups: maps `${exerciseId}-${orderIndex}` -> SetGroup[] (for multiple instances)
  const [exerciseSetGroups, setExerciseSetGroups] = useState<Record<string, SetGroup[]>>({});
  const [exerciseInstanceSetGroups, setExerciseInstanceSetGroups] = useState<Record<string, SetGroup[]>>({});
  const [itemIdToOrderIndices, setItemIdToOrderIndices] = useState<Record<string, number[]>>({});
  const [itemSetGroupsMap, setItemSetGroupsMap] = useState<Record<string, SetGroup[]>>({});
  
  // SetRowDragAndDropModal state
  const [showSetDragModal, setShowSetDragModal] = useState(false);
  const [setDragItems, setSetDragItems] = useState<SetDragListItem[]>([]);
  const [editingInstanceKey, setEditingInstanceKey] = useState<string | null>(null);
  const [editingExercise, setEditingExercise] = useState<ExerciseLibraryItem | null>(null);

  // Sync data from drag and drop modal to instance-based structure
  // This runs when itemSetGroupsMap is updated from drag and drop modal
  // We track the previous itemSetGroupsMap to detect when it changes from drag-and-drop
  const prevItemSetGroupsMapRef = useRef<Record<string, SetGroup[]>>({});
  useEffect(() => {
    // Only sync if itemSetGroupsMap actually changed (not just initialized)
    const hasChanged = JSON.stringify(itemSetGroupsMap) !== JSON.stringify(prevItemSetGroupsMapRef.current);

    if (hasChanged && Object.keys(itemSetGroupsMap).length > 0 && Object.keys(itemIdToOrderIndices).length > 0) {
      // Map itemSetGroupsMap to exerciseInstanceSetGroups using order indices
      // Each itemId represents one exercise card instance, so we use the FIRST orderIndex only
      const newInstanceSetGroups: Record<string, SetGroup[]> = {};

      Object.entries(itemIdToOrderIndices).forEach(([itemId, orderIndices]) => {
        const setGroups = itemSetGroupsMap[itemId];
        if (setGroups && orderIndices.length > 0) {
          // Use only the first order index to create ONE instance per itemId (card)
          const firstOrderIndex = orderIndices[0];
          const exerciseId = selectedOrder[firstOrderIndex];
          if (exerciseId) {
            const instanceKey = `${exerciseId}::${firstOrderIndex}`;
            // Deep copy setGroups to preserve all properties including isWarmup and isFailure
            newInstanceSetGroups[instanceKey] = setGroups.map(sg => ({ ...sg }));
          }
        }
      });

      setExerciseInstanceSetGroups(newInstanceSetGroups);
      // Deep copy for ref comparison
      prevItemSetGroupsMapRef.current = Object.fromEntries(
        Object.entries(itemSetGroupsMap).map(([key, value]) => [
          key,
          value.map(sg => ({ ...sg }))
        ])
      );
    }
  }, [itemSetGroupsMap, itemIdToOrderIndices, selectedOrder]);

  // Create instance keys for exercises added from list view
  // This runs for exercises that don't have instances yet, regardless of whether itemSetGroupsMap is empty
  // IMPORTANT: Also cleans up stale instance keys when selectedOrder changes (e.g., when exercises are removed)
  useEffect(() => {
    setExerciseInstanceSetGroups(prev => {
      const rebuilt: Record<string, SetGroup[]> = {};
      let hasChanges = false;

      // Track which order indices are from drag-and-drop (should not be recreated)
      const dragDropIndices = new Set<number>();
      Object.values(itemIdToOrderIndices).forEach(indices => {
        indices.forEach(idx => dragDropIndices.add(idx));
      });

      // Rebuild the map based on current selectedOrder
      selectedOrder.forEach((exerciseId, orderIndex) => {
        const instanceKey = `${exerciseId}::${orderIndex}`;
        const isInDragDrop = dragDropIndices.has(orderIndex);

        // Try to find existing setGroups for this instance
        // First check if it already exists at this exact key
        if (prev[instanceKey]) {
          rebuilt[instanceKey] = prev[instanceKey];
        } else if (!isInDragDrop) {
          // Not from drag-and-drop, so we need to create or find setGroups
          // Check if there's a previous instance of this exercise that we can copy from
          let foundSetGroups = false;

          // First, look for a previous instance of this exercise in the current selectedOrder (already processed)
          for (let i = orderIndex - 1; i >= 0; i--) {
            if (selectedOrder[i] === exerciseId) {
              const prevInstanceKey = `${exerciseId}::${i}`;
              const prevSetGroups = rebuilt[prevInstanceKey];
              if (prevSetGroups && prevSetGroups.length > 0) {
                rebuilt[instanceKey] = prevSetGroups.map(sg => ({ ...sg }));
                foundSetGroups = true;
                hasChanges = true;
                break;
              }
            }
          }

          // If not found in current order, check previous state for any instance of this exercise
          // This handles cases where an exercise moved indices (e.g., from index 1 to index 0)
          if (!foundSetGroups) {
            const existingInstanceKey = Object.keys(prev).find(key => {
              const [id] = key.split('::');
              return id === exerciseId;
            });
            if (existingInstanceKey && prev[existingInstanceKey]) {
              rebuilt[instanceKey] = prev[existingInstanceKey].map(sg => ({ ...sg }));
              foundSetGroups = true;
              hasChanges = true;
            }
          }

          // If still not found, use exerciseSetGroups or create default
          if (!foundSetGroups) {
            const defaultSetGroups = exerciseSetGroups[exerciseId];
            if (defaultSetGroups && defaultSetGroups.length > 0) {
              rebuilt[instanceKey] = defaultSetGroups.map(sg => ({ ...sg }));
            } else {
              rebuilt[instanceKey] = [{
                id: `sg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                count: 1,
                isDropset: false,
              }];
            }
            hasChanges = true;
          }
        } else {
          // From drag-and-drop, keep existing entry if it exists, otherwise it will be created by the drag-and-drop sync effect
          if (prev[instanceKey]) {
            rebuilt[instanceKey] = prev[instanceKey];
          }
        }
      });

      // Only update if there are changes or if the map structure changed (stale keys removed)
      if (hasChanges || JSON.stringify(Object.keys(rebuilt).sort()) !== JSON.stringify(Object.keys(prev).sort())) {
        return rebuilt;
      }
      return prev;
    });
  }, [selectedOrder, itemSetGroupsMap, exerciseSetGroups, itemIdToOrderIndices]);

  // Helper to get setGroups for an exercise instance
  const getSetGroupsForInstance = useCallback((exerciseId: string, orderIndex: number): SetGroup[] | undefined => {
    const instanceKey = `${exerciseId}::${orderIndex}`;
    return exerciseInstanceSetGroups[instanceKey] || exerciseSetGroups[exerciseId];
  }, [exerciseInstanceSetGroups, exerciseSetGroups]);

  // Handlers for list view setGroup management
  // These now accept instanceKey (format: `${exerciseId}-${orderIndex}`) or exerciseId
  const handleIncrementSetGroup = useCallback((instanceKey: string, setGroupId: string) => {
    if (exerciseInstanceSetGroups[instanceKey]) {
      setExerciseInstanceSetGroups(prev => {
        const groups = prev[instanceKey] || [];
        return {
          ...prev,
          [instanceKey]: groups.map(sg =>
            sg.id === setGroupId ? { ...sg, count: sg.count + 1 } : sg
          )
        };
      });
    } else {
      // Fallback to exerciseSetGroups for backward compatibility
      const exerciseId = instanceKey.split('::')[0]; // Get exerciseId before ::
      setExerciseSetGroups(prev => {
        const groups = prev[exerciseId] || [];
        return {
          ...prev,
          [exerciseId]: groups.map(sg =>
            sg.id === setGroupId ? { ...sg, count: sg.count + 1 } : sg
          )
        };
      });
    }
  }, [exerciseInstanceSetGroups]);

  const handleDecrementSetGroup = useCallback((instanceKey: string, setGroupId: string) => {
    const [exerciseId, orderIndexStr] = instanceKey.split('::');
    const orderIndex = parseInt(orderIndexStr, 10);

    if (exerciseInstanceSetGroups[instanceKey]) {
      setExerciseInstanceSetGroups(prev => {
        const groups = prev[instanceKey] || [];
        const targetGroup = groups.find(sg => sg.id === setGroupId);

        if (!targetGroup) return prev;

        // Decrement the count
        const newCount = targetGroup.count - 1;

        // If count reaches 0 or below, remove the exercise entirely
        if (newCount <= 0) {
          // Remove from selectedOrder and selectedIds
          // Use the specific orderIndex from instanceKey, not lastIndexOf
          setSelectedOrder(prevOrder => {
            const newOrder = [...prevOrder];
            // Use the orderIndex from the instanceKey to remove the correct occurrence
            if (orderIndex >= 0 && orderIndex < newOrder.length && newOrder[orderIndex] === exerciseId) {
              newOrder.splice(orderIndex, 1);

              // Update exercise groups
              setExerciseGroups(prevGroups => {
                let updatedGroups = prevGroups.map(group => ({
                  ...group,
                  exerciseIndices: group.exerciseIndices
                    .filter(idx => idx !== orderIndex)
                    .map(idx => idx > orderIndex ? idx - 1 : idx)
                    .sort((a, b) => a - b)
                })).filter(group => group.exerciseIndices.length >= 2);

                return updatedGroups;
              });

              // Check if exercise should be removed from selectedIds
              const remainingCount = newOrder.filter(i => i === exerciseId).length;
              if (remainingCount === 0) {
                setSelectedIds(prevIds => prevIds.filter(i => i !== exerciseId));
              }
            }
            return newOrder;
          });

          // Remove the instance from exerciseInstanceSetGroups
          const updated = { ...prev };
          delete updated[instanceKey];
          return updated;
        } else {
          // Decrement count normally
          return {
            ...prev,
            [instanceKey]: groups.map(sg =>
              sg.id === setGroupId ? { ...sg, count: newCount } : sg
            )
          };
        }
      });
    } else {
      const exerciseId = instanceKey.split('::')[0];
      setExerciseSetGroups(prev => {
        const groups = prev[exerciseId] || [];
        const targetGroup = groups.find(sg => sg.id === setGroupId);

        if (!targetGroup) return prev;

        // Decrement the count
        const newCount = targetGroup.count - 1;

        // If count reaches 0 or below, remove the exercise entirely
        if (newCount <= 0) {
          // Remove from selectedOrder and selectedIds
          // Use the specific orderIndex from instanceKey, not lastIndexOf
          setSelectedOrder(prevOrder => {
            const newOrder = [...prevOrder];
            // Use the orderIndex from the instanceKey to remove the correct occurrence
            if (orderIndex >= 0 && orderIndex < newOrder.length && newOrder[orderIndex] === exerciseId) {
              newOrder.splice(orderIndex, 1);

              // Update exercise groups
              setExerciseGroups(prevGroups => {
                let updatedGroups = prevGroups.map(group => ({
                  ...group,
                  exerciseIndices: group.exerciseIndices
                    .filter(idx => idx !== orderIndex)
                    .map(idx => idx > orderIndex ? idx - 1 : idx)
                    .sort((a, b) => a - b)
                })).filter(group => group.exerciseIndices.length >= 2);

                return updatedGroups;
              });

              // Check if exercise should be removed from selectedIds
              const remainingCount = newOrder.filter(i => i === exerciseId).length;
              if (remainingCount === 0) {
                setSelectedIds(prevIds => prevIds.filter(i => i !== exerciseId));
                // Clean up setGroups
                setExerciseSetGroups(prev => {
                  const updated = { ...prev };
                  delete updated[exerciseId];
                  return updated;
                });
              }
            }
            return newOrder;
          });

          // Clean up setGroups
          const updated = { ...prev };
          delete updated[exerciseId];
          return updated;
        } else {
          // Decrement count normally
          return {
            ...prev,
            [exerciseId]: groups.map(sg =>
              sg.id === setGroupId ? { ...sg, count: newCount } : sg
            )
          };
        }
      });
    }
  }, [exerciseInstanceSetGroups, selectedOrder]);

  const handleToggleDropsetList = useCallback((instanceKey: string, setGroupId: string) => {
    if (exerciseInstanceSetGroups[instanceKey]) {
      setExerciseInstanceSetGroups(prev => {
        const groups = prev[instanceKey] || [];
        return {
          ...prev,
          [instanceKey]: groups.map(sg =>
            sg.id === setGroupId ? { ...sg, isDropset: !sg.isDropset } : sg
          )
        };
      });
    } else {
      const exerciseId = instanceKey.split('::')[0];
      setExerciseSetGroups(prev => {
        const groups = prev[exerciseId] || [];
        return {
          ...prev,
          [exerciseId]: groups.map(sg =>
            sg.id === setGroupId ? { ...sg, isDropset: !sg.isDropset } : sg
          )
        };
      });
    }
  }, [exerciseInstanceSetGroups]);

  const handleToggleWarmupList = useCallback((instanceKey: string, setGroupId: string) => {
    if (exerciseInstanceSetGroups[instanceKey]) {
      setExerciseInstanceSetGroups(prev => {
        const groups = prev[instanceKey] || [];
        return {
          ...prev,
          [instanceKey]: groups.map(sg =>
            sg.id === setGroupId ? { ...sg, isWarmup: !sg.isWarmup, isFailure: false } : sg
          )
        };
      });
    } else {
      const exerciseId = instanceKey.split('::')[0];
      setExerciseSetGroups(prev => {
        const groups = prev[exerciseId] || [];
        return {
          ...prev,
          [exerciseId]: groups.map(sg =>
            sg.id === setGroupId ? { ...sg, isWarmup: !sg.isWarmup, isFailure: false } : sg
          )
        };
      });
    }
  }, [exerciseInstanceSetGroups]);

  const handleToggleFailureList = useCallback((instanceKey: string, setGroupId: string) => {
    if (exerciseInstanceSetGroups[instanceKey]) {
      setExerciseInstanceSetGroups(prev => {
        const groups = prev[instanceKey] || [];
        return {
          ...prev,
          [instanceKey]: groups.map(sg =>
            sg.id === setGroupId ? { ...sg, isFailure: !sg.isFailure, isWarmup: false } : sg
          )
        };
      });
    } else {
      const exerciseId = instanceKey.split('::')[0];
      setExerciseSetGroups(prev => {
        const groups = prev[exerciseId] || [];
        return {
          ...prev,
          [exerciseId]: groups.map(sg =>
            sg.id === setGroupId ? { ...sg, isFailure: !sg.isFailure, isWarmup: false } : sg
          )
        };
      });
    }
  }, [exerciseInstanceSetGroups]);

  const handleInsertRowList = useCallback((instanceKey: string, setGroupId: string) => {
    if (exerciseInstanceSetGroups[instanceKey]) {
      setExerciseInstanceSetGroups(prev => {
        const groups = prev[instanceKey] || [];
        const targetIndex = groups.findIndex(sg => sg.id === setGroupId);
        if (targetIndex === -1) return prev;

        const targetGroup = groups[targetIndex];
        const newGroup: SetGroup = {
          id: `sg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          count: targetGroup.count,
          isDropset: targetGroup.isDropset,
          isWarmup: targetGroup.isWarmup,
          isFailure: targetGroup.isFailure,
        };

        const newGroups = [...groups];
        newGroups.splice(targetIndex + 1, 0, newGroup);

        return {
          ...prev,
          [instanceKey]: newGroups
        };
      });
    } else {
      const exerciseId = instanceKey.split('::')[0];
      setExerciseSetGroups(prev => {
        const groups = prev[exerciseId] || [];
        const targetIndex = groups.findIndex(sg => sg.id === setGroupId);
        if (targetIndex === -1) return prev;

        const targetGroup = groups[targetIndex];
        const newGroup: SetGroup = {
          id: `sg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          count: targetGroup.count,
          isDropset: targetGroup.isDropset,
          isWarmup: targetGroup.isWarmup,
          isFailure: targetGroup.isFailure,
        };

        const newGroups = [...groups];
        newGroups.splice(targetIndex + 1, 0, newGroup);

        return {
          ...prev,
          [exerciseId]: newGroups
        };
      });
    }
  }, [exerciseInstanceSetGroups]);

  const handleDeleteRowList = useCallback((instanceKey: string, setGroupId: string) => {
    if (exerciseInstanceSetGroups[instanceKey]) {
      setExerciseInstanceSetGroups(prev => {
        const groups = prev[instanceKey] || [];
        if (groups.length <= 1) return prev;

        return {
          ...prev,
          [instanceKey]: groups.filter(sg => sg.id !== setGroupId)
        };
      });
    } else {
      const exerciseId = instanceKey.split('::')[0];
      setExerciseSetGroups(prev => {
        const groups = prev[exerciseId] || [];
        if (groups.length <= 1) return prev;

        return {
          ...prev,
          [exerciseId]: groups.filter(sg => sg.id !== setGroupId)
        };
      });
    }
  }, [exerciseInstanceSetGroups]);

  const handleDeleteInstance = useCallback((instanceKey: string) => {
    // Parse instanceKey to get exerciseId and orderIndex
    const [exerciseId, orderIndexStr] = instanceKey.split('::');
    const orderIndex = parseInt(orderIndexStr, 10);

    // Remove the instance from exerciseInstanceSetGroups
    setExerciseInstanceSetGroups(prev => {
      const updated = { ...prev };
      delete updated[instanceKey];
      return updated;
    });

    // Remove from selectedOrder by index
    setSelectedOrder(prevOrder => {
      if (orderIndex < 0 || orderIndex >= prevOrder.length) {
        return prevOrder;
      }
      const newOrder = [...prevOrder];
      newOrder.splice(orderIndex, 1);
      
      // Check if exercise should be removed from selectedIds
      const remainingCount = newOrder.filter(id => id === exerciseId).length;
      if (remainingCount === 0) {
        setSelectedIds(prevIds => prevIds.filter(i => i !== exerciseId));
      }
      
      return newOrder;
    });

    // Update itemIdToOrderIndices and itemSetGroupsMap together
    setItemIdToOrderIndices(prevItemIdToOrderIndices => {
      const updatedItemIdToOrderIndices: Record<string, number[]> = {};
      const itemIdsToRemove = new Set<string>();

      Object.entries(prevItemIdToOrderIndices).forEach(([itemId, orderIndices]) => {
        // Check if this itemId contains the deleted orderIndex
        const indexToRemove = orderIndices.indexOf(orderIndex);
        if (indexToRemove !== -1) {
          // Remove the orderIndex
          const newIndices = orderIndices.filter(idx => idx !== orderIndex);
          // Re-index: decrement all indices after the deleted one
          const reindexed = newIndices.map(idx => idx > orderIndex ? idx - 1 : idx);
          
          // Only keep the itemId if it still has order indices
          if (reindexed.length > 0) {
            updatedItemIdToOrderIndices[itemId] = reindexed;
          } else {
            // Mark for removal from itemSetGroupsMap
            itemIdsToRemove.add(itemId);
          }
        } else {
          // Re-index indices that come after the deleted one
          const reindexed = orderIndices.map(idx => idx > orderIndex ? idx - 1 : idx);
          updatedItemIdToOrderIndices[itemId] = reindexed;
        }
      });

      // Update itemSetGroupsMap to remove itemId entries that no longer have order indices
      setItemSetGroupsMap(prevItemSetGroupsMap => {
        const updatedItemSetGroupsMap: Record<string, SetGroup[]> = {};
        let hasChanges = false;

        Object.entries(prevItemSetGroupsMap).forEach(([itemId, setGroups]) => {
          if (itemIdsToRemove.has(itemId)) {
            // Remove this itemId if it no longer has any order indices
            hasChanges = true;
          } else {
            updatedItemSetGroupsMap[itemId] = setGroups;
          }
        });

        return hasChanges ? updatedItemSetGroupsMap : prevItemSetGroupsMap;
      });

      return Object.keys(updatedItemIdToOrderIndices).length > 0 
        ? updatedItemIdToOrderIndices 
        : {};
    });
  }, []);

  // Convert setGroups to Sets format for SetDragModal
  const convertSetGroupsToSets = useCallback((setGroups: SetGroup[]): Set[] => {
    const sets: Set[] = [];
    const usedSetIds = new Set<string>(); // Track used set IDs to prevent duplicates

    setGroups.forEach((setGroup) => {
      for (let i = 0; i < setGroup.count; i++) {
        let setId = `${setGroup.id}-${i}`;
        
        // Ensure set ID is unique
        let uniqueId = setId;
        let counter = 0;
        while (usedSetIds.has(uniqueId)) {
          uniqueId = `${setId}-${counter}`;
          counter++;
        }
        usedSetIds.add(uniqueId);
        setId = uniqueId;

        // For dropsets with setTypes array, use individual set types
        let isWarmup = setGroup.isWarmup || false;
        let isFailure = setGroup.isFailure || false;

        if (setGroup.isDropset && setGroup.setTypes && setGroup.setTypes[i]) {
          isWarmup = setGroup.setTypes[i].isWarmup;
          isFailure = setGroup.setTypes[i].isFailure;
        }

        // Look up timer using the expected format before potentially modifying setId
        const expectedSetIdForTimer = `${setGroup.id}-${i}`;
        const restPeriodSeconds = setGroup.restPeriodSecondsBySetId?.[expectedSetIdForTimer] ?? setGroup.restPeriodSeconds;
        
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
          restPeriodSeconds: restPeriodSeconds,
        };
        sets.push(set);
      }
    });

    return sets;
  }, []);

  // Convert Sets to SetDragListItem format
  const convertSetsToSetDragItems = useCallback((sets: Set[]): SetDragListItem[] => {
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

    return items;
  }, []);

  // Convert Sets back to setGroups
  const convertSetsToSetGroups = useCallback((sets: Set[]): SetGroup[] => {
    if (sets.length === 0) return [];

    // Deduplicate sets by ID to prevent processing the same set twice
    const seenSetIds = new Set<string>();
    const uniqueSets = sets.filter(set => {
      if (seenSetIds.has(set.id)) {
        return false; // Skip duplicate
      }
      seenSetIds.add(set.id);
      return true;
    });

    const setGroups: SetGroup[] = [];
    let currentGroup: SetGroup | null = null;
    const dropsetGroupsMap = new Map<string, SetGroup>();
    const usedGroupIds = new Set<string>(); // Track used group IDs to prevent duplicates

    uniqueSets.forEach((set) => {
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
          // Dropset IDs should already be unique (generated with timestamps), but track them anyway
          usedGroupIds.add(dropSetId);
          dropsetGroup = {
            id: dropSetId,
            count: 0,
            isDropset: true,
            setTypes: [],
            restPeriodSeconds: restPeriodSeconds,
            restPeriodSecondsBySetId: {},
          };
          dropsetGroupsMap.set(dropSetId, dropsetGroup);
          setGroups.push(dropsetGroup);
          currentGroup = null;
        }

        // Add this set to the dropset group
        const setIndexInDropset = dropsetGroup.count; // Index within this dropset group
        dropsetGroup.count++;
        
        // Store timer using expected format: ${setGroup.id}-${index}
        if (restPeriodSeconds != null) {
          dropsetGroup.restPeriodSecondsBySetId = dropsetGroup.restPeriodSecondsBySetId ?? {};
          const expectedSetId = `${dropSetId}-${setIndexInDropset}`;
          dropsetGroup.restPeriodSecondsBySetId[expectedSetId] = restPeriodSeconds;
        }
        
        if (dropsetGroup.setTypes) {
          dropsetGroup.setTypes.push({ isWarmup, isFailure });
        }
      } else {
        // For non-dropset sets, merge sequential sets of the same type (regardless of rest timer)
        if (currentGroup &&
          !currentGroup.isDropset &&
          currentGroup.isWarmup === isWarmup &&
          currentGroup.isFailure === isFailure) {
          // Same type as current group, merge
          const setIndexInGroup = currentGroup.count; // Index within this group
          currentGroup.count++;
          
        // Store timer using expected format: ${setGroup.id}-${index}
        if (restPeriodSeconds != null) {
          if (!currentGroup.restPeriodSecondsBySetId) {
            currentGroup.restPeriodSecondsBySetId = {};
          }
          const expectedSetId = `${currentGroup.id}-${setIndexInGroup}`;
          currentGroup.restPeriodSecondsBySetId[expectedSetId] = restPeriodSeconds;
        }

          // If rest timers differ, clear group-level rest timer
          if (currentGroup.restPeriodSeconds !== restPeriodSeconds) {
            currentGroup.restPeriodSeconds = undefined;
          }
        } else {
          // Different type or first set, start new group.
          // Check if set.id matches the expected format: ${groupId}-${index}
          // If so, extract the groupId to preserve original structure
          let groupId: string;
          const setIdMatch = set.id.match(/^(.+)-(\d+)$/);
          if (setIdMatch) {
            const [, potentialGroupId, indexStr] = setIdMatch;
            const index = parseInt(indexStr, 10);
            // Only use this if index is 0 (first set in group) to avoid conflicts
            if (index === 0 && !usedGroupIds.has(potentialGroupId) && currentGroup?.id !== potentialGroupId) {
              groupId = potentialGroupId;
            } else {
              // Use stripped set id as group id
              const strippedId = /-\d+$/.test(set.id) ? set.id.replace(/-\d+$/, '') : set.id;
              const idAlreadyUsed = usedGroupIds.has(strippedId) || (currentGroup?.id === strippedId);
              groupId = idAlreadyUsed ? set.id : strippedId;
            }
          } else {
            // Set ID doesn't match expected format, use stripped ID
            const strippedId = /-\d+$/.test(set.id) ? set.id.replace(/-\d+$/, '') : set.id;
            const idAlreadyUsed = usedGroupIds.has(strippedId) || (currentGroup?.id === strippedId);
            groupId = idAlreadyUsed ? set.id : strippedId;
          }
          
          // Ensure groupId is unique
          let uniqueGroupId = groupId;
          let counter = 0;
          while (usedGroupIds.has(uniqueGroupId)) {
            uniqueGroupId = `${groupId}-${counter}`;
            counter++;
          }
          usedGroupIds.add(uniqueGroupId);
          groupId = uniqueGroupId;
          
          currentGroup = {
            id: groupId,
            count: 1,
            isDropset: false,
            isWarmup: isWarmup,
            isFailure: isFailure,
            restPeriodSeconds: restPeriodSeconds,
            restPeriodSecondsBySetId: restPeriodSeconds != null ? { [`${groupId}-0`]: restPeriodSeconds } : {},
          };
          
          setGroups.push(currentGroup);
        }
      }
    });

    return setGroups;
  }, []);

  const handleEditInstanceSets = useCallback((instanceKey: string, exerciseId: string) => {
    console.log('handleEditInstanceSets called:', { instanceKey, exerciseId });
    
    // Get the setGroups for this instance
    const setGroups = exerciseInstanceSetGroups[instanceKey];
    console.log('setGroups found:', setGroups);
    if (!setGroups || setGroups.length === 0) {
      console.log('No setGroups found for instanceKey:', instanceKey);
      return;
    }

    // Find the exercise
    const exercise = exercises.find(ex => ex.id === exerciseId);
    console.log('exercise found:', exercise);
    if (!exercise) {
      console.log('No exercise found for exerciseId:', exerciseId);
      return;
    }

    // Convert setGroups to Sets
    const sets = convertSetGroupsToSets(setGroups);

    // Convert Sets to SetDragListItem format
    const items = convertSetsToSetDragItems(sets);

    // Set state and open modal
    setSetDragItems(items);
    setEditingInstanceKey(instanceKey);
    setEditingExercise(exercise);
    setShowSetDragModal(true);
  }, [exerciseInstanceSetGroups, exercises, convertSetGroupsToSets, convertSetsToSetDragItems]);

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

  const PRIMARY_TO_SECONDARY_MAP = usePrimaryToSecondaryMap();
  
  const availableSecondaryMuscles = useMemo((): string[] => {
    return getAvailableSecondaryMusclesForPrimaries(filterMuscle, PRIMARY_TO_SECONDARY_MAP);
  }, [filterMuscle, PRIMARY_TO_SECONDARY_MAP]);

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
        const isFirstAdd = !prev.includes(id);

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
        // Increment the first setGroup count (for grouped exercise add)
        setExerciseSetGroups(prev => {
          const groups = prev[id] || [];
          if (groups.length > 0) {
            return {
              ...prev,
              [id]: groups.map((sg, idx) => idx === 0 ? { ...sg, count: sg.count + 1 } : sg)
            };
          }
          return prev;
        });
      }
    } else {
      const isFirstAdd = !selectedIds.includes(id);

      setSelectedOrder(prevOrder => {
        const newIndex = prevOrder.length;
        const newOrder = [...prevOrder, id];
        const instanceKey = `${id}::${newIndex}`;

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

        // Note: Instance setGroups will be set after this callback completes
        // We'll handle it in a useEffect that watches selectedOrder

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
              // Clean up setGroups when exercise is fully removed
              setExerciseSetGroups(prev => {
                const updated = { ...prev };
                delete updated[id];
                return updated;
              });
            }
            return newOrder;
          });

          // Decrement setGroup count
          setExerciseSetGroups(prev => {
            const groups = prev[id] || [];
            if (groups.length > 0) {
              const firstGroup = groups[0];
              if (firstGroup.count > 1) {
                return {
                  ...prev,
                  [id]: groups.map((sg, idx) => idx === 0 ? { ...sg, count: sg.count - 1 } : sg)
                };
              }
            }
            return prev;
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
            // Clean up setGroups when exercise is fully removed
            setExerciseSetGroups(prev => {
              const updated = { ...prev };
              delete updated[id];
              return updated;
            });
          } else {
            // Decrement setGroup count
            setExerciseSetGroups(prev => {
              const groups = prev[id] || [];
              if (groups.length > 0) {
                const firstGroup = groups[0];
                if (firstGroup.count > 1) {
                  return {
                    ...prev,
                    [id]: groups.map((sg, idx) => idx === 0 ? { ...sg, count: sg.count - 1 } : sg)
                  };
                }
              }
              return prev;
            });
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
    // Use Review tab (DragAndDropModal) as source of truth
    // itemSetGroupsMap: Maps itemId -> SetGroup[] (setGroups for each exercise card)
    // itemIdToOrderIndices: Maps itemId -> number[] (order indices for each card)
    // selectedOrder: Array of exercise IDs in order
    // exerciseGroups: Group metadata

    const exercisesToAdd: (ExerciseLibraryItem & { _setCount?: number; _isDropset?: boolean; _setGroups?: SetGroup[] })[] = [];

    // If we have Review tab data, use it as source of truth
    if (Object.keys(itemSetGroupsMap).length > 0 && Object.keys(itemIdToOrderIndices).length > 0) {
      // Sort itemIds by their first order index to preserve order
      const sortedItemIds = Object.keys(itemIdToOrderIndices).sort((a, b) => {
        const indicesA = itemIdToOrderIndices[a];
        const indicesB = itemIdToOrderIndices[b];
        return (indicesA[0] || 0) - (indicesB[0] || 0);
      });

      // Process each itemId (exercise card) from Review tab
      sortedItemIds.forEach((itemId) => {
        const orderIndices = itemIdToOrderIndices[itemId];
        const setGroups = itemSetGroupsMap[itemId];

        if (setGroups && setGroups.length > 0 && orderIndices.length > 0) {
          // Get the exercise ID from the first order index
          const firstOrderIndex = orderIndices[0];
          const exerciseId = selectedOrder[firstOrderIndex];
          const exercise = filtered.find(ex => ex.id === exerciseId);

          if (exercise) {
            // Deep copy setGroups to preserve all properties including rest timers
            exercisesToAdd.push({
              ...exercise,
              _setGroups: setGroups.map(sg => ({
                ...sg,
                restPeriodSeconds: sg.restPeriodSeconds,
                restPeriodSecondsBySetId: sg.restPeriodSecondsBySetId ? { ...sg.restPeriodSecondsBySetId } : undefined,
              })),
              _setCount: setGroups.reduce((sum, sg) => sum + sg.count, 0),
              _isDropset: setGroups.some(sg => sg.isDropset),
            });
          }
        }
      });
    } else {
      // Fallback to old behavior if Review tab data not available
      // Use ref for immediate access to latest dropset IDs (avoids state sync issues)
      const currentDropsetIds = dropsetExerciseIdsRef.current;
      const dropsetSet = new Set(currentDropsetIds);

      // Track which orderIndices have been processed (to avoid duplicates)
      const processedOrderIndices = new Set<number>();

      // Process all instances from exerciseInstanceSetGroups
      const instanceEntries = Object.entries(exerciseInstanceSetGroups);
      instanceEntries.sort(([keyA], [keyB]) => {
        const orderIndexA = parseInt(keyA.split('::')[1], 10);
        const orderIndexB = parseInt(keyB.split('::')[1], 10);
        return orderIndexA - orderIndexB;
      });

      instanceEntries.forEach(([instanceKey, setGroups]) => {
        const [exerciseId, orderIndexStr] = instanceKey.split('::');
        const orderIndex = parseInt(orderIndexStr, 10);
        const exercise = filtered.find(ex => ex.id === exerciseId);

        if (exercise && setGroups && setGroups.length > 0) {
          processedOrderIndices.add(orderIndex);
          exercisesToAdd.push({
            ...exercise,
            _setGroups: setGroups.map(sg => ({ ...sg })),
            _setCount: setGroups.reduce((sum, sg) => sum + sg.count, 0),
            _isDropset: setGroups.some(sg => sg.isDropset),
          });
        }
      });

      // Process remaining exercises using getGroupedExercises
      getGroupedExercises.forEach((group) => {
        const hasProcessedInstance = group.orderIndices.some(idx => processedOrderIndices.has(idx));

        if (!hasProcessedInstance) {
          const setGroups = exerciseSetGroups[group.exercise.id];

          if (setGroups && setGroups.length > 0) {
            exercisesToAdd.push({
              ...group.exercise,
              _setGroups: setGroups.map(sg => ({ ...sg })),
              _setCount: setGroups.reduce((sum, sg) => sum + sg.count, 0),
              _isDropset: setGroups.some(sg => sg.isDropset),
            });
          } else {
            exercisesToAdd.push({
              ...group.exercise,
              _setCount: group.count,
              _isDropset: dropsetSet.has(group.exercise.id),
            });
          }
        }
      });
    }

    // Build groupsMetadata with exerciseIndices relative to the exercises array
    // Create a map from selectedOrder index to exercisesToAdd index
    const selectedOrderToExercisesIndex = new Map<number, number>();

    if (Object.keys(itemSetGroupsMap).length > 0 && Object.keys(itemIdToOrderIndices).length > 0) {
      // Use Review tab data: map each order index to the exercise index
      let exercisesIndex = 0;
      const sortedItemIds = Object.keys(itemIdToOrderIndices).sort((a, b) => {
        const indicesA = itemIdToOrderIndices[a];
        const indicesB = itemIdToOrderIndices[b];
        return (indicesA[0] || 0) - (indicesB[0] || 0);
      });

      sortedItemIds.forEach((itemId) => {
        const orderIndices = itemIdToOrderIndices[itemId];
        orderIndices.forEach(orderIndex => {
          selectedOrderToExercisesIndex.set(orderIndex, exercisesIndex);
        });
        exercisesIndex++;
      });
    } else {
      // Fallback: map from exerciseInstanceSetGroups and getGroupedExercises
      const processedOrderIndices = new Set<number>();
      let exercisesIndex = 0;

      const instanceEntries = Object.entries(exerciseInstanceSetGroups);
      instanceEntries.sort(([keyA], [keyB]) => {
        const orderIndexA = parseInt(keyA.split('::')[1], 10);
        const orderIndexB = parseInt(keyB.split('::')[1], 10);
        return orderIndexA - orderIndexB;
      });

      instanceEntries.forEach(([instanceKey]) => {
        const [exerciseId, orderIndexStr] = instanceKey.split('::');
        const orderIndex = parseInt(orderIndexStr, 10);
        selectedOrderToExercisesIndex.set(orderIndex, exercisesIndex);
        processedOrderIndices.add(orderIndex);
        exercisesIndex++;
      });

      getGroupedExercises.forEach((group) => {
        const hasProcessedInstance = group.orderIndices.some(idx => processedOrderIndices.has(idx));
        if (!hasProcessedInstance) {
          const firstOrderIndex = group.orderIndices[0];
          selectedOrderToExercisesIndex.set(firstOrderIndex, exercisesIndex);
          exercisesIndex++;
        }
      });
    }

    const groupsMetadata: Array<{
      id: string;
      type: GroupType;
      number: number;
      exerciseIndices: number[];
    }> = [];

    if (exerciseGroups.length > 0) {
      exerciseGroups.forEach((group) => {
        const groupIndices: number[] = [];
        group.exerciseIndices.forEach((selectedOrderIdx) => {
          const exercisesIdx = selectedOrderToExercisesIndex.get(selectedOrderIdx);
          if (exercisesIdx !== undefined && !groupIndices.includes(exercisesIdx)) {
            groupIndices.push(exercisesIdx);
          }
        });

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
  }, [selectedOrder, exerciseGroups, getGroupedExercises, filtered, exerciseSetGroups, exerciseInstanceSetGroups, itemSetGroupsMap, itemIdToOrderIndices]);

  const handleAddAction = () => {
    // Convert to workout format first to capture current state values
    // This must happen before clearing state since convertToWorkoutFormat depends on state
    const { exercisesToAdd, groupsMetadata } = convertToWorkoutFormat();
    
    // Clear state immediately to allow modal to start closing smoothly
    // This gives the UI a chance to respond before the expensive parent update
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
    setExerciseInstanceSetGroups({});
    setItemIdToOrderIndices({});
    setItemSetGroupsMap({});
    prevItemSetGroupsMapRef.current = {};

    // Defer the expensive parent update to after interactions (modal close, state updates)
    // This prevents UI freezing when adding many exercises
    // Use requestAnimationFrame first to allow modal animation to start
    requestAnimationFrame(() => {
      InteractionManager.runAfterInteractions(() => {
        onAdd(exercisesToAdd, null, groupsMetadata);
      });
    });
  };

  // Sync data from list view back to itemSetGroupsMap before opening drag and drop modal
  // Returns both updated maps so they can be used immediately
  const syncListViewToDragDrop = useCallback(() => {
    const updatedItemSetGroupsMap: Record<string, SetGroup[]> = {};
    const updatedItemIdToOrderIndices: Record<string, number[]> = {};

    // First, sync existing items that have itemIds
    if (Object.keys(itemIdToOrderIndices).length > 0 && Object.keys(exerciseInstanceSetGroups).length > 0) {
      Object.entries(itemIdToOrderIndices).forEach(([itemId, orderIndices]) => {
        if (orderIndices.length > 0) {
          // Use the first order index to find the instance key
          const firstOrderIndex = orderIndices[0];
          const exerciseId = selectedOrder[firstOrderIndex];
          if (exerciseId) {
            const instanceKey = `${exerciseId}::${firstOrderIndex}`;
            const setGroups = exerciseInstanceSetGroups[instanceKey];
            if (setGroups && setGroups.length > 0) {
              // Update the itemSetGroupsMap with the latest setGroups from list view
              // Deep copy to preserve all properties including isWarmup and isFailure
              updatedItemSetGroupsMap[itemId] = setGroups.map(sg => ({ ...sg }));
              updatedItemIdToOrderIndices[itemId] = orderIndices;
            }
          }
        }
      });
    }

    // Second, handle exercises that exist in exerciseInstanceSetGroups but don't have itemIds yet
    // (new exercises added from list view)
    if (Object.keys(exerciseInstanceSetGroups).length > 0) {
      // Track which order indices are already covered by existing itemIds
      const coveredIndices = new Set<number>();
      Object.values(itemIdToOrderIndices).forEach(indices => {
        indices.forEach(idx => coveredIndices.add(idx));
      });

      // Group consecutive exercises of the same type into instances
      const instanceGroups: Array<{ exerciseId: string; orderIndices: number[]; setGroups: SetGroup[] }> = [];
      let currentGroup: { exerciseId: string; orderIndices: number[]; setGroups: SetGroup[] } | null = null;

      selectedOrder.forEach((exerciseId, orderIndex) => {
        if (!coveredIndices.has(orderIndex)) {
          const instanceKey = `${exerciseId}::${orderIndex}`;
          const setGroups = exerciseInstanceSetGroups[instanceKey];

          if (setGroups && setGroups.length > 0) {
            // Check if this exercise continues the current group
            if (currentGroup && currentGroup.exerciseId === exerciseId) {
              currentGroup.orderIndices.push(orderIndex);
            } else {
              // Start a new group
              if (currentGroup) {
                instanceGroups.push(currentGroup);
              }
              currentGroup = {
                exerciseId,
                orderIndices: [orderIndex],
                setGroups: setGroups.map(sg => ({ ...sg })) // Deep copy to preserve all properties
              };
            }
          }
        } else {
          // If we hit a covered index, finalize current group
          if (currentGroup) {
            instanceGroups.push(currentGroup);
            currentGroup = null;
          }
        }
      });

      // Don't forget the last group
      if (currentGroup) {
        instanceGroups.push(currentGroup);
      }

      // Create itemIds for new instance groups
      instanceGroups.forEach(group => {
        const itemId = `item-${group.exerciseId}-${group.orderIndices[0]}-${Date.now()}`;
        // Deep copy to preserve all properties including isWarmup and isFailure
        updatedItemSetGroupsMap[itemId] = group.setGroups.map(sg => ({ ...sg }));
        updatedItemIdToOrderIndices[itemId] = group.orderIndices;
      });
    }

    // Update both maps
    const mergedItemSetGroupsMap = Object.keys(updatedItemSetGroupsMap).length > 0
      ? { ...itemSetGroupsMap, ...updatedItemSetGroupsMap }
      : itemSetGroupsMap;

    const mergedItemIdToOrderIndices = Object.keys(updatedItemIdToOrderIndices).length > 0
      ? { ...itemIdToOrderIndices, ...updatedItemIdToOrderIndices }
      : itemIdToOrderIndices;

    if (Object.keys(updatedItemSetGroupsMap).length > 0) {
      setItemSetGroupsMap(mergedItemSetGroupsMap);
      // Deep copy for ref comparison
      prevItemSetGroupsMapRef.current = Object.fromEntries(
        Object.entries(mergedItemSetGroupsMap).map(([key, value]) => [
          key,
          value.map(sg => ({ ...sg }))
        ])
      );
    }

    if (Object.keys(updatedItemIdToOrderIndices).length > 0) {
      setItemIdToOrderIndices(mergedItemIdToOrderIndices);
    }

    return {
      itemSetGroupsMap: mergedItemSetGroupsMap,
      itemIdToOrderIndices: mergedItemIdToOrderIndices
    };
  }, [exerciseInstanceSetGroups, itemIdToOrderIndices, selectedOrder, itemSetGroupsMap]);

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
    setExerciseInstanceSetGroups({});
    setItemIdToOrderIndices({});
    setItemSetGroupsMap({});
    prevItemSetGroupsMapRef.current = {};
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

  // SetRowDragAndDropModal handlers
  const handleSetDragEnd = useCallback(({ data }: { data: SetDragListItem[]; from: number; to: number }) => {
    setSetDragItems(data);
  }, []);

  const handleSetDragCancel = useCallback(() => {
    setShowSetDragModal(false);
    setEditingInstanceKey(null);
    setEditingExercise(null);
    setSetDragItems([]);
  }, []);

  const handleSetDragSave = useCallback(() => {
    if (!editingInstanceKey) return;

    // Extract sets from drag items, deduplicating by set ID
    const seenSetIds = new Set<string>();
    const sets: Set[] = [];
    setDragItems.forEach(item => {
      if (item.type === 'set' && !seenSetIds.has(item.set.id)) {
        seenSetIds.add(item.set.id);
        sets.push(item.set);
      }
    });

    // Convert Sets back to setGroups
    const newSetGroups = convertSetsToSetGroups(sets);

    // Update the instance setGroups
    setExerciseInstanceSetGroups(prev => ({
      ...prev,
      [editingInstanceKey]: newSetGroups,
    }));

    setShowSetDragModal(false);
    setEditingInstanceKey(null);
    setEditingExercise(null);
    setSetDragItems([]);
  }, [editingInstanceKey, setDragItems, convertSetsToSetGroups]);

  const handleCreateDropset = useCallback((setId: string) => {
    // Find the set and create a dropset
    const updatedItems = setDragItems.map(item => {
      if (item.type === 'set' && item.set.id === setId) {
        const dropSetId = `dropset-${Date.now()}`;
        const updatedSet = { ...item.set, dropSetId };
        return { ...item, set: updatedSet };
      }
      return item;
    });
    setSetDragItems(updatedItems);
  }, [setDragItems]);

  const handleUpdateSet = useCallback((setId: string, updates: Partial<Set>) => {
    const updatedItems = setDragItems.map(item => {
      if (item.type === 'set' && item.set.id === setId) {
        return { ...item, set: { ...item.set, ...updates } };
      }
      return item;
    });
    setSetDragItems(updatedItems);
  }, [setDragItems]);

  const handleAddSetToDragItems = useCallback(() => {
    if (!editingExercise) return;
    const newSetId = `set-${Date.now()}`;
    const newSet: Set = {
      id: newSetId,
      type: 'Working',
      weight: '',
      reps: '',
      duration: '',
      distance: '',
      completed: false,
      isWarmup: false,
      isFailure: false,
    };
    const newItem: SetDragListItem = {
      id: newSetId,
      type: 'set',
      set: newSet,
      hasRestTimer: false,
    };
    setSetDragItems(prev => [...prev, newItem]);
  }, [editingExercise]);

  const handleUpdateRestTimer = useCallback((setId: string, restPeriodSeconds: number | undefined) => {
    const updatedItems = setDragItems.map(item => {
      if (item.type === 'set' && item.set.id === setId) {
        return {
          ...item,
          set: { ...item.set, restPeriodSeconds },
          hasRestTimer: !!restPeriodSeconds,
        };
      }
      return item;
    });
    setSetDragItems(updatedItems);
  }, [setDragItems]);

  const handleUpdateRestTimerMultiple = useCallback((setIds: string[], restPeriodSeconds: number | undefined) => {
    const updatedItems = setDragItems.map(item => {
      if (item.type === 'set' && setIds.includes(item.set.id)) {
        return {
          ...item,
          set: { ...item.set, restPeriodSeconds },
          hasRestTimer: !!restPeriodSeconds,
        };
      }
      return item;
    });
    setSetDragItems(updatedItems);
  }, [setDragItems]);

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
                onBeforeOpenDragDrop={syncListViewToDragDrop}
                itemSetGroupsMap={itemSetGroupsMap}
                itemIdToOrderIndices={itemIdToOrderIndices}
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
                    exerciseSetGroups={exerciseSetGroups}
                    exerciseInstanceSetGroups={exerciseInstanceSetGroups}
                    onIncrementSetGroup={handleIncrementSetGroup}
                    onDecrementSetGroup={handleDecrementSetGroup}
                    onToggleDropset={handleToggleDropsetList}
                    onToggleWarmup={handleToggleWarmupList}
                    onToggleFailure={handleToggleFailureList}
                    onInsertRow={handleInsertRowList}
                    onDeleteRow={handleDeleteRowList}
                    onEditInstanceSets={handleEditInstanceSets}
                    onDeleteInstance={handleDeleteInstance}
                  />
                )}
              </View>
            </GestureDetector>

            {/* SetRowDragAndDropModal for editing instance sets */}
            {showSetDragModal && editingExercise && editingInstanceKey && (
              <SetDragModal
                visible={showSetDragModal}
                exercise={{
                  instanceId: editingInstanceKey,
                  exerciseId: editingExercise.id,
                  name: editingExercise.name,
                  category: editingExercise.category,
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
                onAddSet={handleAddSetToDragItems}
                onUpdateRestTimer={handleUpdateRestTimer}
                onUpdateRestTimerMultiple={handleUpdateRestTimerMultiple}
              />
            )}
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
