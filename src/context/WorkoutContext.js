import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EXERCISE_LIBRARY, migrateExercise, formatDuration } from '../constants/data';

const WorkoutContext = createContext();

const STORAGE_KEYS = {
  HISTORY: 'workout_history',
  LIBRARY: 'exercise_library',
  ACTIVE_WORKOUT: 'active_workout',
  STATS: 'exercise_stats'
};

export const WorkoutProvider = ({ children }) => {
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [exercisesLibrary, setExercisesLibrary] = useState(EXERCISE_LIBRARY.map(migrateExercise));
  const [exerciseStats, setExerciseStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [history, library, active, stats] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.HISTORY),
          AsyncStorage.getItem(STORAGE_KEYS.LIBRARY),
          AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_WORKOUT),
          AsyncStorage.getItem(STORAGE_KEYS.STATS)
        ]);

        if (history) setWorkoutHistory(JSON.parse(history));
        if (library) setExercisesLibrary(JSON.parse(library));
        if (active) setActiveWorkout(JSON.parse(active));
        if (stats) setExerciseStats(JSON.parse(stats));
      } catch (e) {
        console.error("Failed to load data", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Save data on changes
  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(workoutHistory));
    }
  }, [workoutHistory, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem(STORAGE_KEYS.LIBRARY, JSON.stringify(exercisesLibrary));
    }
  }, [exercisesLibrary, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(exerciseStats));
    }
  }, [exerciseStats, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      if (activeWorkout) {
        AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_WORKOUT, JSON.stringify(activeWorkout));
      } else {
        AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_WORKOUT);
      }
    }
  }, [activeWorkout, isLoading]);

  const startEmptyWorkout = () => {
    if (!activeWorkout) {
      setActiveWorkout({
        id: `w-${Date.now()}`,
        name: "Empty Workout",
        startedAt: Date.now(),
        exercises: [],
        sessionNotes: []
      });
    }
  };

  const updateWorkout = (updatedWorkout) => {
    setActiveWorkout(updatedWorkout);
  };

  const updateHistory = (updatedWorkout) => {
    setWorkoutHistory(workoutHistory.map(w => w.id === updatedWorkout.id ? updatedWorkout : w));
  };

  const updateStatsForExercise = (stats, exercise, date) => {
    const { exerciseId, category, sets } = exercise;
    if (!stats[exerciseId]) {
      stats[exerciseId] = {
        pr: 0,
        lastPerformed: null,
        history: []
      };
    }
    
    const currentStats = stats[exerciseId];
    
    // Update PRs
    sets.forEach(set => {
      if (!set.completed) return;
      
      if (category === 'Lifts') {
        const weight = parseFloat(set.weight) || 0;
        if (weight > (currentStats.pr || 0)) {
          currentStats.pr = weight;
        }
      }
      // Add other categories logic if needed
    });

    // Update History
    currentStats.history.unshift({
      date: date,
      sets: sets.filter(s => s.completed).map(s => ({ 
        weight: s.weight, 
        reps: s.reps, 
        duration: s.duration, 
        distance: s.distance,
        isWarmup: s.isWarmup || false,
        isFailure: s.isFailure || false,
        dropSetId: s.dropSetId || null
      }))
    });
    
    currentStats.lastPerformed = date;
  };

  const finishWorkout = () => {
    if (!activeWorkout) return;
    const finishedWorkout = {
      ...activeWorkout,
      endedAt: Date.now(),
      duration: formatDuration(Math.floor((Date.now() - activeWorkout.startedAt) / 1000)),
      date: new Date().toLocaleDateString()
    };

    // Update Stats
    const newStats = { ...exerciseStats };
    finishedWorkout.exercises.forEach(ex => {
      if (ex.type === 'group') {
        ex.children.forEach(child => updateStatsForExercise(newStats, child, finishedWorkout.date));
      } else {
        updateStatsForExercise(newStats, ex, finishedWorkout.date);
      }
    });
    setExerciseStats(newStats);

    setWorkoutHistory([finishedWorkout, ...workoutHistory]);
    setActiveWorkout(null);
  };

  const cancelWorkout = () => {
    setActiveWorkout(null);
  };

  const addExerciseToLibrary = (newExercise) => {
    // Use existing ID if provided, otherwise create new one
    const newId = newExercise.id || `e${Date.now()}`;
    const exerciseToAdd = { ...newExercise, id: newId };
    setExercisesLibrary([exerciseToAdd, ...exercisesLibrary]);
    return newId; // Return the ID for use in components
  };

  const updateExerciseInLibrary = (exerciseId, updates) => {
    setExercisesLibrary(exercisesLibrary.map(ex => 
      ex.id === exerciseId ? { ...ex, ...updates } : ex
    ));
  };

  return (
    <WorkoutContext.Provider value={{
      activeWorkout,
      workoutHistory,
      exercisesLibrary,
      exerciseStats,
      startEmptyWorkout,
      updateWorkout,
      updateHistory,
      finishWorkout,
      cancelWorkout,
      addExerciseToLibrary,
      updateExerciseInLibrary,
      isLoading
    }}>
      {children}
    </WorkoutContext.Provider>
  );
};

export const useWorkout = () => useContext(WorkoutContext);
