import { useState } from 'react';
import { findExerciseDeep, updateExercisesDeep } from '../../../utils/workoutHelpers';

/**
 * Custom hook for managing drop set/group functionality in workouts
 * @param {Object} currentWorkout - The current workout object
 * @param {Function} handleWorkoutUpdate - Function to update the workout
 * @returns {Object} Group state and handlers
 */
export const useWorkoutGroups = (currentWorkout, handleWorkoutUpdate) => {
  const [selectionMode, setSelectionMode] = useState(null); // { exerciseId, type: 'drop_set', editingGroupId? }
  const [selectedSetIds, setSelectedSetIds] = useState(new Set());
  const [groupSetType, setGroupSetType] = useState(null); // 'warmup', 'dropset', 'failure', or null

  /**
   * Toggle selection of a set in group selection mode
   * @param {string} setId - The set ID to toggle
   * @param {boolean} isAddToGroupAction - Whether this is an "add to group" action (clicking + icon)
   */
  const handleToggleSetSelection = (setId, isAddToGroupAction = false) => {
    if (!selectionMode) return;
    const { exerciseId, editingGroupId } = selectionMode;
    const exercise = findExerciseDeep(currentWorkout.exercises, exerciseId);
    const set = exercise?.sets?.find(s => s.id === setId);

    // If this is an "add to group" action (clicking + icon)
    if (isAddToGroupAction && set?.dropSetId) {
      const targetGroupId = set.dropSetId;

      if (!editingGroupId) {
        // Ungrouped set: Add the originally selected set to this group and move it to the end of the group
        handleWorkoutUpdate({
          ...currentWorkout,
          exercises: updateExercisesDeep(currentWorkout.exercises, exerciseId, (ex) => {
            // First, mark the sets with the new group ID
            const updatedSets = ex.sets.map(s => {
              if (selectedSetIds.has(s.id)) {
                return { ...s, dropSetId: targetGroupId };
              }
              return s;
            });

            // Then reorder: remove the newly added sets and insert them at the end of the target group
            const setsToMove = [];
            const setsWithoutMoved = updatedSets.filter(s => {
              if (selectedSetIds.has(s.id)) {
                setsToMove.push(s);
                return false;
              }
              return true;
            });

            // Find the last index of the target group
            let lastGroupIndex = -1;
            for (let i = setsWithoutMoved.length - 1; i >= 0; i--) {
              if (setsWithoutMoved[i].dropSetId === targetGroupId) {
                lastGroupIndex = i;
                break;
              }
            }

            // Insert the moved sets after the last set in the target group
            if (lastGroupIndex !== -1) {
              setsWithoutMoved.splice(lastGroupIndex + 1, 0, ...setsToMove);
            }

            return { ...ex, sets: setsWithoutMoved };
          })
        });

        // Close selection mode
        setSelectionMode(null);
        setSelectedSetIds(new Set());
        return;
      } else {
        // Grouped set: Move SELECTED (checked) sets from current group to target group
        // Unselected sets remain in the original group
        handleWorkoutUpdate({
          ...currentWorkout,
          exercises: updateExercisesDeep(currentWorkout.exercises, exerciseId, (ex) => {
            // First, mark the sets with the new group ID
            const updatedSets = ex.sets.map(s => {
              if (selectedSetIds.has(s.id)) {
                // Move selected sets to target group
                return { ...s, dropSetId: targetGroupId };
              }
              return s;
            });

            // Then reorder: remove the moved sets and insert them at the end of the target group
            const setsToMove = [];
            const setsWithoutMoved = updatedSets.filter(s => {
              if (selectedSetIds.has(s.id)) {
                setsToMove.push(s);
                return false;
              }
              return true;
            });

            // Find the last index of the target group
            let lastGroupIndex = -1;
            for (let i = setsWithoutMoved.length - 1; i >= 0; i--) {
              if (setsWithoutMoved[i].dropSetId === targetGroupId) {
                lastGroupIndex = i;
                break;
              }
            }

            // Insert the moved sets after the last set in the target group
            if (lastGroupIndex !== -1) {
              setsWithoutMoved.splice(lastGroupIndex + 1, 0, ...setsToMove);
            }

            return { ...ex, sets: setsWithoutMoved };
          })
        });

        // Close selection mode
        setSelectionMode(null);
        setSelectedSetIds(new Set());
        return;
      }
    }

    // Regular checkbox toggle behavior
    const newSelectedIds = new Set(selectedSetIds);

    if (editingGroupId) {
      // Editing a grouped set - can toggle sets in that group AND ungrouped sets
      if (set?.dropSetId === editingGroupId || !set?.dropSetId) {
        if (newSelectedIds.has(setId)) {
          newSelectedIds.delete(setId);
        } else {
          newSelectedIds.add(setId);
        }
      }
    } else {
      // Creating a new group from ungrouped sets - only toggle ungrouped sets
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

  /**
   * Submit the drop set/group selection
   */
  const handleSubmitDropSet = () => {
    if (!selectionMode) return;
    const { exerciseId, editingGroupId } = selectionMode;
    const exercise = findExerciseDeep(currentWorkout.exercises, exerciseId);

    if (editingGroupId) {
      // Editing existing group
      const originalGroupSetIds = exercise.sets
        .filter(s => s.dropSetId === editingGroupId)
        .map(s => s.id);

      // Find sets that were deselected from the group (need to be ungrouped)
      const deselectedSetIds = originalGroupSetIds.filter(id => !selectedSetIds.has(id));

      // Find ungrouped sets that were selected (need to be added to the group)
      const selectedUngroupedSetIds = Array.from(selectedSetIds).filter(id => {
        const set = exercise.sets.find(s => s.id === id);
        return set && !set.dropSetId;
      });

      handleWorkoutUpdate({
        ...currentWorkout,
        exercises: updateExercisesDeep(currentWorkout.exercises, exerciseId, (ex) => {
          // Update the group membership and apply group set type
          let updatedSets = ex.sets.map(s => {
            let updatedSet = { ...s };
            let willBeInGroup = false;

            if (s.dropSetId === editingGroupId && !selectedSetIds.has(s.id)) {
              // Remove from group (was deselected)
              delete updatedSet.dropSetId;
              willBeInGroup = false;
            } else if (s.dropSetId === editingGroupId && selectedSetIds.has(s.id)) {
              // Stay in group (still selected)
              willBeInGroup = true;
            } else if (!s.dropSetId && selectedSetIds.has(s.id)) {
              // Add to group (ungrouped set that was selected)
              updatedSet.dropSetId = editingGroupId;
              willBeInGroup = true;
            }

            // Apply or remove group set type for all sets that will be in the group
            if (willBeInGroup) {
              if (groupSetType) {
                // Clear previous type flags and set the new one
                delete updatedSet.isWarmup;
                delete updatedSet.isDropset;
                delete updatedSet.isFailure;
                const typeKey = groupSetType === 'warmup' ? 'isWarmup' : groupSetType === 'dropset' ? 'isDropset' : 'isFailure';
                updatedSet[typeKey] = true;
              } else {
                // groupSetType is null, remove all type flags from sets in the group
                delete updatedSet.isWarmup;
                delete updatedSet.isDropset;
                delete updatedSet.isFailure;
              }
            }

            return updatedSet;
          });

          // Move newly added ungrouped sets to the end of the group
          if (selectedUngroupedSetIds.length > 0) {
            const setsToMove = [];
            const setsWithoutMoved = updatedSets.filter(s => {
              if (selectedUngroupedSetIds.includes(s.id)) {
                setsToMove.push(s);
                return false;
              }
              return true;
            });

            // Find the last index of the edited group
            let lastGroupIndex = -1;
            for (let i = setsWithoutMoved.length - 1; i >= 0; i--) {
              if (setsWithoutMoved[i].dropSetId === editingGroupId) {
                lastGroupIndex = i;
                break;
              }
            }

            // Insert the newly added sets at the end of the group
            if (lastGroupIndex !== -1) {
              setsWithoutMoved.splice(lastGroupIndex + 1, 0, ...setsToMove);
            }

            updatedSets = setsWithoutMoved;
          }

          // If there are deselected sets, reorder them to appear right after the group
          if (deselectedSetIds.length > 0) {
            // Find the last index of any set in the edited group
            let lastGroupIndex = -1;
            for (let i = updatedSets.length - 1; i >= 0; i--) {
              if (updatedSets[i].dropSetId === editingGroupId) {
                lastGroupIndex = i;
                break;
              }
            }

            if (lastGroupIndex !== -1) {
              // Remove deselected sets from their current positions
              const deselectedSets = [];
              const setsWithoutDeselected = updatedSets.filter(s => {
                if (deselectedSetIds.includes(s.id)) {
                  deselectedSets.push(s);
                  return false;
                }
                return true;
              });

              // Find the new position to insert (after the group)
              let insertIndex = -1;
              for (let i = setsWithoutDeselected.length - 1; i >= 0; i--) {
                if (setsWithoutDeselected[i].dropSetId === editingGroupId) {
                  insertIndex = i + 1;
                  break;
                }
              }

              // Insert deselected sets after the group
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
      // Creating new group from ungrouped sets
      if (selectedSetIds.size < 2) {
        // Need at least 2 sets to create a group
        setSelectionMode(null);
        setSelectedSetIds(new Set());
        setGroupSetType(null);
        return;
      }

      const dropSetId = Date.now().toString();

      handleWorkoutUpdate({
        ...currentWorkout,
        exercises: updateExercisesDeep(currentWorkout.exercises, exerciseId, (ex) => {
          // First, separate selected and non-selected sets
          const selectedSets = [];
          const nonSelectedSets = [];

          ex.sets.forEach(s => {
            if (selectedSetIds.has(s.id)) {
              let newSet = { ...s, dropSetId };

              // Apply group set type if selected
              if (groupSetType) {
                delete newSet.isWarmup;
                delete newSet.isDropset;
                delete newSet.isFailure;
                const typeKey = groupSetType === 'warmup' ? 'isWarmup' : groupSetType === 'dropset' ? 'isDropset' : 'isFailure';
                newSet[typeKey] = true;
              }

              selectedSets.push(newSet);
            } else {
              nonSelectedSets.push(s);
            }
          });

          // Find the position of the first selected set in the original array
          const firstSelectedIndex = ex.sets.findIndex(s => selectedSetIds.has(s.id));

          // Insert all selected sets at the position of the first selected set
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

  /**
   * Cancel drop set/group selection
   */
  const handleCancelDropSet = () => {
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
