import { useState, useEffect } from 'react';
import { updateExercisesDeep } from '../../../utils/workoutHelpers';
import type { Workout, Set, RestTimer } from '../../../types/workout';

interface UseWorkoutRestTimerReturn {
  activeRestTimer: RestTimer | null;
  setActiveRestTimer: React.Dispatch<React.SetStateAction<RestTimer | null>>;
  restTimerPopupOpen: boolean;
  setRestTimerPopupOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleAddRestPeriod: (exerciseId: string, setId: string, seconds: number) => void;
  startRestTimer: (exInstanceId: string, set: Set) => void;
  cancelRestTimer: (setId: string) => void;
}

export const useWorkoutRestTimer = (
  currentWorkout: Workout,
  handleWorkoutUpdate: (workout: Workout) => void
): UseWorkoutRestTimerReturn => {
  const [activeRestTimer, setActiveRestTimer] = useState<RestTimer | null>(null);
  const [restTimerPopupOpen, setRestTimerPopupOpen] = useState(false);

  useEffect(() => {
    if (!activeRestTimer || activeRestTimer.isPaused) return;

    const interval = setInterval(() => {
      setActiveRestTimer(prev => {
        if (!prev || prev.isPaused) return prev;
        const newRemaining = prev.remainingSeconds - 1;
        if (newRemaining <= 0) {
          setRestTimerPopupOpen(false);

          handleWorkoutUpdate({
            ...currentWorkout,
            exercises: updateExercisesDeep(currentWorkout.exercises, prev.exerciseId, (ex) => ({
              ...ex,
              sets: ex.sets.map(s => s.id === prev.setId ? { ...s, restTimerCompleted: true } : s)
            }))
          });

          return null;
        }
        return { ...prev, remainingSeconds: newRemaining };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeRestTimer?.setId, activeRestTimer?.isPaused, currentWorkout, handleWorkoutUpdate]);

  const handleAddRestPeriod = (exerciseId: string, setId: string, seconds: number): void => {
    if (!exerciseId || !setId || seconds <= 0) return;

    handleWorkoutUpdate({
      ...currentWorkout,
      exercises: updateExercisesDeep(currentWorkout.exercises, exerciseId, (ex) => ({
        ...ex,
        sets: ex.sets.map(s => s.id === setId ? { ...s, restPeriodSeconds: seconds } : s)
      }))
    });
  };

  const startRestTimer = (exInstanceId: string, set: Set): void => {
    if (set.restPeriodSeconds) {
      setActiveRestTimer({
        exerciseId: exInstanceId,
        setId: set.id,
        remainingSeconds: set.restPeriodSeconds,
        totalSeconds: set.restPeriodSeconds,
        isPaused: false
      });
    }
  };

  const cancelRestTimer = (setId: string): void => {
    if (activeRestTimer?.setId === setId) {
      setActiveRestTimer(null);
    }
  };

  return {
    activeRestTimer,
    setActiveRestTimer,
    restTimerPopupOpen,
    setRestTimerPopupOpen,
    handleAddRestPeriod,
    startRestTimer,
    cancelRestTimer
  };
};
