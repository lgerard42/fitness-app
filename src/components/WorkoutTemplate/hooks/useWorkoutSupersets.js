import { useState } from 'react';
import { findExerciseDeep, findExerciseSuperset, updateExercisesDeep } from '../../../utils/workoutHelpers';

/**
 * Custom hook for managing superset functionality in workouts
 * @param {Object} currentWorkout - The current workout object
 * @param {Function} handleWorkoutUpdate - Function to update the workout
 * @returns {Object} Superset state and handlers
 */
export const useWorkoutSupersets = (currentWorkout, handleWorkoutUpdate) => {
  const [supersetSelectionMode, setSupersetSelectionMode] = useState(null); // { exerciseId, mode: 'create' | 'add' | 'edit', supersetId? }
  const [selectedExerciseIds, setSelectedExerciseIds] = useState(new Set());

  /**
   * Start editing a superset for a given exercise
   * @param {string} exerciseId - The exercise instance ID
   */
  const handleEditSuperset = (exerciseId) => {
    const superset = findExerciseSuperset(currentWorkout.exercises, exerciseId);

    if (superset) {
      // Exercise is already in a superset - pre-select all exercises in that superset
      const selectedIds = new Set(superset.children.map(child => child.instanceId));
      setSupersetSelectionMode({ exerciseId, mode: 'edit', supersetId: superset.instanceId });
      setSelectedExerciseIds(selectedIds);
    } else {
      // Exercise is NOT in a superset - start fresh selection with just this exercise
      setSupersetSelectionMode({ exerciseId, mode: 'create' });
      setSelectedExerciseIds(new Set([exerciseId]));
    }
  };

  /**
   * Add an exercise to a specific superset
   * @param {string} exerciseId - The exercise instance ID to add
   * @param {string} supersetId - The superset group instance ID
   */
  const handleAddToSpecificSuperset = (exerciseId, supersetId) => {
    const exercise = findExerciseDeep(currentWorkout.exercises, exerciseId);
    if (exercise) {
      handleWorkoutUpdate({
        ...currentWorkout,
        exercises: updateExercisesDeep(currentWorkout.exercises, supersetId, (group) => ({
          ...group,
          children: [...(group.children || []), exercise]
        })).filter(ex => ex.instanceId !== exerciseId) // Remove from original position
      });
    }
    setSupersetSelectionMode(null);
    setSelectedExerciseIds(new Set());
  };

  /**
   * Toggle selection of an exercise in superset selection mode
   * @param {string} exerciseId - The exercise instance ID to toggle
   */
  const handleToggleSupersetSelection = (exerciseId) => {
    if (!supersetSelectionMode) return;

    const newSelectedIds = new Set(selectedExerciseIds);

    if (newSelectedIds.has(exerciseId)) {
      newSelectedIds.delete(exerciseId);
    } else {
      newSelectedIds.add(exerciseId);
    }

    setSelectedExerciseIds(newSelectedIds);
  };

  /**
   * Confirm the superset selection and create/update the superset
   */
  const handleConfirmSupersetSelection = () => {
    if (!supersetSelectionMode) return;

    const { mode, exerciseId, supersetId } = supersetSelectionMode;

    if (mode === 'edit' && supersetId) {
      // Editing existing superset
      const superset = currentWorkout.exercises.find(ex => ex.instanceId === supersetId);
      if (!superset) return;

      const originalExercises = superset.children || [];
      const selectedExercises = Array.from(selectedExerciseIds)
        .map(id => findExerciseDeep(currentWorkout.exercises, id))
        .filter(ex => ex);

      // Find exercises that were unselected (removed from superset)
      const unselectedExercises = originalExercises.filter(
        ex => !selectedExerciseIds.has(ex.instanceId)
      );

      if (selectedExercises.length <= 1) {
        // Dissolve the superset if only 1 or 0 exercises remain selected
        // Place all exercises (selected + unselected) as standalone after the superset position
        const newExercises = currentWorkout.exercises.reduce((acc, item) => {
          if (item.instanceId === supersetId) {
            return [...acc, ...selectedExercises, ...unselectedExercises];
          }
          return [...acc, item];
        }, []);
        handleWorkoutUpdate({ ...currentWorkout, exercises: newExercises });
      } else {
        // Update the superset with new selection
        // Place unselected exercises immediately after the superset
        const newExercises = currentWorkout.exercises
          .reduce((acc, item) => {
            if (item.instanceId === supersetId) {
              // Update superset with only selected exercises
              return [...acc, { ...item, children: selectedExercises }, ...unselectedExercises];
            }
            return [...acc, item];
          }, [])
          .filter(ex => {
            // Remove standalone exercises that are now in the superset
            if (ex.type === 'exercise' && selectedExerciseIds.has(ex.instanceId)) {
              return false;
            }
            return true;
          });

        handleWorkoutUpdate({ ...currentWorkout, exercises: newExercises });
      }
    } else if (mode === 'create') {
      // Creating new superset
      if (selectedExerciseIds.size < 2) {
        // Need at least 2 exercises for a superset
        setSupersetSelectionMode(null);
        setSelectedExerciseIds(new Set());
        return;
      }

      const selectedExercises = Array.from(selectedExerciseIds)
        .map(id => findExerciseDeep(currentWorkout.exercises, id))
        .filter(ex => ex);

      const newSuperset = {
        instanceId: `group-${Date.now()}`,
        type: 'group',
        groupType: 'Superset',
        children: selectedExercises
      };

      const newExercises = currentWorkout.exercises.filter(
        ex => !selectedExerciseIds.has(ex.instanceId)
      );

      // Insert superset at the position of the first selected exercise
      const firstSelectedId = Array.from(selectedExerciseIds)[0];
      const insertIndex = currentWorkout.exercises.findIndex(ex => ex.instanceId === firstSelectedId);
      newExercises.splice(insertIndex >= 0 ? insertIndex : 0, 0, newSuperset);

      handleWorkoutUpdate({ ...currentWorkout, exercises: newExercises });
    }

    setSupersetSelectionMode(null);
    setSelectedExerciseIds(new Set());
  };

  /**
   * Cancel superset selection mode
   */
  const handleCancelSupersetSelection = () => {
    setSupersetSelectionMode(null);
    setSelectedExerciseIds(new Set());
  };

  return {
    supersetSelectionMode,
    selectedExerciseIds,
    handleEditSuperset,
    handleAddToSpecificSuperset,
    handleToggleSupersetSelection,
    handleConfirmSupersetSelection,
    handleCancelSupersetSelection
  };
};
