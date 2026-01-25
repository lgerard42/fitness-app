import { useState } from 'react';
import { findExerciseDeep, findExerciseSuperset, updateExercisesDeep } from '@/utils/workoutHelpers';
import type { Workout, SupersetSelection, ExerciseGroup } from '@/types/workout';

interface UseWorkoutSupersetsReturn {
  supersetSelectionMode: SupersetSelection | null;
  selectedExerciseIds: Set<string>;
  handleEditSuperset: (exerciseId: string) => void;
  handleAddToSpecificSuperset: (exerciseId: string, supersetId: string) => void;
  handleToggleSupersetSelection: (exerciseId: string) => void;
  handleConfirmSupersetSelection: () => void;
  handleCancelSupersetSelection: () => void;
}

export const useWorkoutSupersets = (
  currentWorkout: Workout,
  handleWorkoutUpdate: (workout: Workout) => void
): UseWorkoutSupersetsReturn => {
  const [supersetSelectionMode, setSupersetSelectionMode] = useState<SupersetSelection | null>(null);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<Set<string>>(new Set());

  const handleEditSuperset = (exerciseId: string): void => {
    const superset = findExerciseSuperset(currentWorkout.exercises, exerciseId);

    if (superset) {
      const selectedIds = new Set(superset.children.map(child => child.instanceId));
      setSupersetSelectionMode({ exerciseId, mode: 'edit', supersetId: superset.instanceId });
      setSelectedExerciseIds(selectedIds);
    } else {
      setSupersetSelectionMode({ exerciseId, mode: 'create' });
      setSelectedExerciseIds(new Set([exerciseId]));
    }
  };

  const handleAddToSpecificSuperset = (exerciseId: string, supersetId: string): void => {
    const exercise = findExerciseDeep(currentWorkout.exercises, exerciseId);
    if (exercise) {
      handleWorkoutUpdate({
        ...currentWorkout,
        exercises: updateExercisesDeep(currentWorkout.exercises, supersetId, (group) => ({
          ...group,
          children: [...(group.type === 'group' ? group.children : []), exercise]
        })).filter(ex => ex.instanceId !== exerciseId)
      });
    }
    setSupersetSelectionMode(null);
    setSelectedExerciseIds(new Set());
  };

  const handleToggleSupersetSelection = (exerciseId: string): void => {
    if (!supersetSelectionMode) return;

    const newSelectedIds = new Set(selectedExerciseIds);

    if (newSelectedIds.has(exerciseId)) {
      newSelectedIds.delete(exerciseId);
    } else {
      newSelectedIds.add(exerciseId);
    }

    setSelectedExerciseIds(newSelectedIds);
  };

  const handleConfirmSupersetSelection = (): void => {
    if (!supersetSelectionMode) return;

    const { mode, exerciseId, supersetId } = supersetSelectionMode;

    if (mode === 'edit' && supersetId) {
      const superset = currentWorkout.exercises.find(ex => ex.instanceId === supersetId);
      if (!superset || superset.type !== 'group') return;

      const originalExercises = superset.children || [];
      const selectedExercises = Array.from(selectedExerciseIds)
        .map(id => findExerciseDeep(currentWorkout.exercises, id))
        .filter((ex): ex is typeof ex => ex !== null);

      const unselectedExercises = originalExercises.filter(
        ex => !selectedExerciseIds.has(ex.instanceId)
      );

      if (selectedExercises.length <= 1) {
        const newExercises = currentWorkout.exercises.reduce((acc, item) => {
          if (item.instanceId === supersetId) {
            return [...acc, ...selectedExercises, ...unselectedExercises];
          }
          return [...acc, item];
        }, [] as typeof currentWorkout.exercises);
        handleWorkoutUpdate({ ...currentWorkout, exercises: newExercises });
      } else {
        const newExercises = currentWorkout.exercises
          .reduce((acc, item) => {
            if (item.instanceId === supersetId) {
              return [...acc, { ...item, children: selectedExercises }, ...unselectedExercises];
            }
            return [...acc, item];
          }, [] as typeof currentWorkout.exercises)
          .filter(ex => {
            if (ex.type === 'exercise' && selectedExerciseIds.has(ex.instanceId)) {
              return false;
            }
            return true;
          });

        handleWorkoutUpdate({ ...currentWorkout, exercises: newExercises });
      }
    } else if (mode === 'create') {
      if (selectedExerciseIds.size < 2) {
        setSupersetSelectionMode(null);
        setSelectedExerciseIds(new Set());
        return;
      }

      const selectedExercises = Array.from(selectedExerciseIds)
        .map(id => findExerciseDeep(currentWorkout.exercises, id))
        .filter((ex): ex is typeof ex => ex !== null);

      const newSuperset: ExerciseGroup = {
        instanceId: `group-${Date.now()}`,
        type: 'group',
        groupType: 'Superset',
        children: selectedExercises
      };

      const newExercises = currentWorkout.exercises.filter(
        ex => !selectedExerciseIds.has(ex.instanceId)
      );

      const firstSelectedId = Array.from(selectedExerciseIds)[0];
      const insertIndex = currentWorkout.exercises.findIndex(ex => ex.instanceId === firstSelectedId);
      newExercises.splice(insertIndex >= 0 ? insertIndex : 0, 0, newSuperset);

      handleWorkoutUpdate({ ...currentWorkout, exercises: newExercises });
    }

    setSupersetSelectionMode(null);
    setSelectedExerciseIds(new Set());
  };

  const handleCancelSupersetSelection = (): void => {
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
