import { useState, useEffect } from 'react';
import { updateExercisesDeep } from '../../../utils/workoutHelpers';

/**
 * Custom hook for managing rest timer functionality in workouts
 * @param {Object} currentWorkout - The current workout object
 * @param {Function} handleWorkoutUpdate - Function to update the workout
 * @returns {Object} Rest timer state and handlers
 */
export const useWorkoutRestTimer = (currentWorkout, handleWorkoutUpdate) => {
  const [activeRestTimer, setActiveRestTimer] = useState(null); // { exerciseId, setId, remainingSeconds, totalSeconds, isPaused }
  const [restTimerPopupOpen, setRestTimerPopupOpen] = useState(false); // Shows expanded timer popup

  // Rest Timer Countdown Effect
  useEffect(() => {
    if (!activeRestTimer || activeRestTimer.isPaused) return;

    const interval = setInterval(() => {
      setActiveRestTimer(prev => {
        if (!prev || prev.isPaused) return prev;
        const newRemaining = prev.remainingSeconds - 1;
        if (newRemaining <= 0) {
          // Timer finished - close popup if open and mark timer as completed
          setRestTimerPopupOpen(false);

          // Mark this set's rest timer as completed
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

  /**
   * Handle adding rest period to a set
   * @param {string} exerciseId - The exercise instance ID
   * @param {string} setId - The set ID
   * @param {number} seconds - Rest period in seconds
   */
  const handleAddRestPeriod = (exerciseId, setId, seconds) => {
    if (!exerciseId || !setId || seconds <= 0) return;

    handleWorkoutUpdate({
      ...currentWorkout,
      exercises: updateExercisesDeep(currentWorkout.exercises, exerciseId, (ex) => ({
        ...ex,
        sets: ex.sets.map(s => s.id === setId ? { ...s, restPeriodSeconds: seconds } : s)
      }))
    });
  };

  /**
   * Start rest timer for a completed set
   * @param {string} exInstanceId - The exercise instance ID
   * @param {Object} set - The set object
   */
  const startRestTimer = (exInstanceId, set) => {
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

  /**
   * Cancel rest timer for a set
   * @param {string} setId - The set ID
   */
  const cancelRestTimer = (setId) => {
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
