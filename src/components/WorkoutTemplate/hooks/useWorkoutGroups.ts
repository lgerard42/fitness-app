import { useState } from 'react';
import { findExerciseDeep, updateExercisesDeep } from '../../../utils/workoutHelpers';
import type { Workout, GroupSelectionMode, GroupSetType } from '../../../types/workout';

interface UseWorkoutGroupsReturn {
  selectionMode: GroupSelectionMode | null;
  setSelectionMode: React.Dispatch<React.SetStateAction<GroupSelectionMode | null>>;
  selectedSetIds: Set<string>;
  groupSetType: GroupSetType;
  setGroupSetType: React.Dispatch<React.SetStateAction<GroupSetType>>;
  handleToggleSetSelection: (setId: string, isAddToGroupAction?: boolean) => void;
  handleSubmitDropSet: () => void;
  handleCancelDropSet: () => void;
}

export const useWorkoutGroups = (
  currentWorkout: Workout,
  handleWorkoutUpdate: (workout: Workout) => void
): UseWorkoutGroupsReturn => {
  const [selectionMode, setSelectionMode] = useState<GroupSelectionMode | null>(null);
  const [selectedSetIds, setSelectedSetIds] = useState<Set<string>>(new Set());
  const [groupSetType, setGroupSetType] = useState<GroupSetType>(null);

  const handleToggleSetSelection = (setId: string, isAddToGroupAction = false): void => {
    if (!selectionMode) return;
    const { exerciseId, editingGroupId } = selectionMode;
    const exercise = findExerciseDeep(currentWorkout.exercises, exerciseId);
    const set = exercise?.sets?.find(s => s.id === setId);

    if (isAddToGroupAction && set?.dropSetId) {
      const targetGroupId = set.dropSetId;

      if (!editingGroupId) {
        handleWorkoutUpdate({
          ...currentWorkout,
          exercises: updateExercisesDeep(currentWorkout.exercises, exerciseId, (ex) => {
            const updatedSets = ex.sets.map(s => {
              if (selectedSetIds.has(s.id)) {
                return { ...s, dropSetId: targetGroupId };
              }
              return s;
            });

            const setsToMove: typeof ex.sets = [];
            const setsWithoutMoved = updatedSets.filter(s => {
              if (selectedSetIds.has(s.id)) {
                setsToMove.push(s);
                return false;
              }
              return true;
            });

            let lastGroupIndex = -1;
            for (let i = setsWithoutMoved.length - 1; i >= 0; i--) {
              if (setsWithoutMoved[i].dropSetId === targetGroupId) {
                lastGroupIndex = i;
                break;
              }
            }

            if (lastGroupIndex !== -1) {
              setsWithoutMoved.splice(lastGroupIndex + 1, 0, ...setsToMove);
            }

            return { ...ex, sets: setsWithoutMoved };
          })
        });

        setSelectionMode(null);
        setSelectedSetIds(new Set());
        return;
      } else {
        handleWorkoutUpdate({
          ...currentWorkout,
          exercises: updateExercisesDeep(currentWorkout.exercises, exerciseId, (ex) => {
            const updatedSets = ex.sets.map(s => {
              if (selectedSetIds.has(s.id)) {
                return { ...s, dropSetId: targetGroupId };
              }
              return s;
            });

            const setsToMove: typeof ex.sets = [];
            const setsWithoutMoved = updatedSets.filter(s => {
              if (selectedSetIds.has(s.id)) {
                setsToMove.push(s);
                return false;
              }
              return true;
            });

            let lastGroupIndex = -1;
            for (let i = setsWithoutMoved.length - 1; i >= 0; i--) {
              if (setsWithoutMoved[i].dropSetId === targetGroupId) {
                lastGroupIndex = i;
                break;
              }
            }

            if (lastGroupIndex !== -1) {
              setsWithoutMoved.splice(lastGroupIndex + 1, 0, ...setsToMove);
            }

            return { ...ex, sets: setsWithoutMoved };
          })
        });

        setSelectionMode(null);
        setSelectedSetIds(new Set());
        return;
      }
    }

    const newSelectedIds = new Set(selectedSetIds);

    if (editingGroupId) {
      if (set?.dropSetId === editingGroupId || !set?.dropSetId) {
        if (newSelectedIds.has(setId)) {
          newSelectedIds.delete(setId);
        } else {
          newSelectedIds.add(setId);
        }
      }
    } else {
      if (!set?.dropSetId) {
        if (newSelectedIds.has(setId)) {
          newSelectedIds.delete(setId);
        } else {
          newSelectedIds.add(setId);
        }
      }
    }

    setSelectedSetIds(newSelectedIds);
  };

  const handleSubmitDropSet = (): void => {
    if (!selectionMode) return;
    const { exerciseId, editingGroupId } = selectionMode;
    const exercise = findExerciseDeep(currentWorkout.exercises, exerciseId);
    if (!exercise) return;

    if (editingGroupId) {
      const originalGroupSetIds = exercise.sets
        .filter(s => s.dropSetId === editingGroupId)
        .map(s => s.id);

      const deselectedSetIds = originalGroupSetIds.filter(id => !selectedSetIds.has(id));

      const selectedUngroupedSetIds = Array.from(selectedSetIds).filter(id => {
        const set = exercise.sets.find(s => s.id === id);
        return set && !set.dropSetId;
      });

      handleWorkoutUpdate({
        ...currentWorkout,
        exercises: updateExercisesDeep(currentWorkout.exercises, exerciseId, (ex) => {
          let updatedSets = ex.sets.map(s => {
            let updatedSet = { ...s };
            let willBeInGroup = false;

            if (s.dropSetId === editingGroupId && !selectedSetIds.has(s.id)) {
              const { dropSetId, ...rest } = updatedSet;
              updatedSet = rest;
              willBeInGroup = false;
            } else if (s.dropSetId === editingGroupId && selectedSetIds.has(s.id)) {
              willBeInGroup = true;
            } else if (!s.dropSetId && selectedSetIds.has(s.id)) {
              updatedSet.dropSetId = editingGroupId;
              willBeInGroup = true;
            }

            if (willBeInGroup) {
              if (groupSetType) {
                const { isWarmup, isDropset, isFailure, ...rest } = updatedSet;
                updatedSet = rest;
                const typeKey = groupSetType === 'warmup' ? 'isWarmup' : groupSetType === 'dropset' ? 'isDropset' : 'isFailure';
                updatedSet[typeKey] = true;
              } else {
                const { isWarmup, isDropset, isFailure, ...rest } = updatedSet;
                updatedSet = rest;
              }
            }

            return updatedSet;
          });

          if (selectedUngroupedSetIds.length > 0) {
            const setsToMove: typeof ex.sets = [];
            const setsWithoutMoved = updatedSets.filter(s => {
              if (selectedUngroupedSetIds.includes(s.id)) {
                setsToMove.push(s);
                return false;
              }
              return true;
            });

            let lastGroupIndex = -1;
            for (let i = setsWithoutMoved.length - 1; i >= 0; i--) {
              if (setsWithoutMoved[i].dropSetId === editingGroupId) {
                lastGroupIndex = i;
                break;
              }
            }

            if (lastGroupIndex !== -1) {
              setsWithoutMoved.splice(lastGroupIndex + 1, 0, ...setsToMove);
            }

            updatedSets = setsWithoutMoved;
          }

          if (deselectedSetIds.length > 0) {
            let lastGroupIndex = -1;
            for (let i = updatedSets.length - 1; i >= 0; i--) {
              if (updatedSets[i].dropSetId === editingGroupId) {
                lastGroupIndex = i;
                break;
              }
            }

            if (lastGroupIndex !== -1) {
              const deselectedSets: typeof ex.sets = [];
              const setsWithoutDeselected = updatedSets.filter(s => {
                if (deselectedSetIds.includes(s.id)) {
                  deselectedSets.push(s);
                  return false;
                }
                return true;
              });

              let insertIndex = -1;
              for (let i = setsWithoutDeselected.length - 1; i >= 0; i--) {
                if (setsWithoutDeselected[i].dropSetId === editingGroupId) {
                  insertIndex = i + 1;
                  break;
                }
              }

              if (insertIndex !== -1) {
                setsWithoutDeselected.splice(insertIndex, 0, ...deselectedSets);
              }

              return { ...ex, sets: setsWithoutDeselected };
            }
          }

          return { ...ex, sets: updatedSets };
        })
      });
    } else {
      if (selectedSetIds.size < 2) {
        setSelectionMode(null);
        setSelectedSetIds(new Set());
        setGroupSetType(null);
        return;
      }

      const dropSetId = Date.now().toString();

      handleWorkoutUpdate({
        ...currentWorkout,
        exercises: updateExercisesDeep(currentWorkout.exercises, exerciseId, (ex) => {
          const selectedSets: typeof ex.sets = [];
          const nonSelectedSets: typeof ex.sets = [];

          ex.sets.forEach(s => {
            if (selectedSetIds.has(s.id)) {
              let newSet = { ...s, dropSetId };

              if (groupSetType) {
                const { isWarmup, isDropset, isFailure, ...rest } = newSet;
                newSet = rest;
                const typeKey = groupSetType === 'warmup' ? 'isWarmup' : groupSetType === 'dropset' ? 'isDropset' : 'isFailure';
                newSet[typeKey] = true;
              }

              selectedSets.push(newSet);
            } else {
              nonSelectedSets.push(s);
            }
          });

          const firstSelectedIndex = ex.sets.findIndex(s => selectedSetIds.has(s.id));

          const newSets = [...nonSelectedSets];
          newSets.splice(firstSelectedIndex, 0, ...selectedSets);

          return { ...ex, sets: newSets };
        })
      });
    }

    setSelectionMode(null);
    setSelectedSetIds(new Set());
    setGroupSetType(null);
  };

  const handleCancelDropSet = (): void => {
    setSelectionMode(null);
    setSelectedSetIds(new Set());
    setGroupSetType(null);
  };

  return {
    selectionMode,
    setSelectionMode,
    selectedSetIds,
    groupSetType,
    setGroupSetType,
    handleToggleSetSelection,
    handleSubmitDropSet,
    handleCancelDropSet
  };
};
