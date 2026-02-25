import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EXERCISE_LIBRARY, migrateExercise, migrateAssistedMachine, formatDuration } from '@/constants/data';
import { getEffectiveWeight } from '@/utils/workoutHelpers';
import { autoLogin } from '@/api/client';
import { fetchWorkouts, createWorkout as apiCreateWorkout } from '@/api/workouts';
import { fetchExercises, createExercise as apiCreateExercise, updateExercise as apiUpdateExercise } from '@/api/exercises';
import type { Workout, Exercise, ExerciseLibraryItem, ExerciseStatsMap, ExerciseStats } from '@/types/workout';

interface WorkoutContextValue {
  activeWorkout: Workout | null;
  workoutHistory: Workout[];
  exercisesLibrary: ExerciseLibraryItem[];
  exerciseStats: ExerciseStatsMap;
  startEmptyWorkout: () => void;
  updateWorkout: (updatedWorkout: Workout) => void;
  updateHistory: (updatedWorkout: Workout) => void;
  finishWorkout: (bodyWeight?: number) => void;
  cancelWorkout: () => void;
  addExerciseToLibrary: (newExercise: ExerciseLibraryItem) => string;
  updateExerciseInLibrary: (exerciseId: string, updates: Partial<ExerciseLibraryItem>) => void;
  isLoading: boolean;
}

const WorkoutContext = createContext<WorkoutContextValue | undefined>(undefined);

const STORAGE_KEYS = {
  HISTORY: 'workout_history',
  LIBRARY: 'exercise_library',
  ACTIVE_WORKOUT: 'active_workout',
  STATS: 'exercise_stats'
};

const sanitizeWorkout = (workout: Workout): Workout => {
  if (!workout.exercises || !Array.isArray(workout.exercises)) {
    console.warn('Sanitizing workout with invalid exercises:', {
      id: workout.id,
      exercisesType: typeof workout.exercises,
      exercisesIsArray: Array.isArray(workout.exercises)
    });
    return { ...workout, exercises: [] };
  }
  return workout;
};

interface WorkoutProviderProps {
  children: ReactNode;
}

export const WorkoutProvider = ({ children }: WorkoutProviderProps) => {
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [workoutHistory, setWorkoutHistory] = useState<Workout[]>([]);
  const [exercisesLibrary, setExercisesLibrary] = useState<ExerciseLibraryItem[]>(EXERCISE_LIBRARY.map(migrateExercise));
  const [exerciseStats, setExerciseStats] = useState<ExerciseStatsMap>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [history, library, active, stats] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.HISTORY),
          AsyncStorage.getItem(STORAGE_KEYS.LIBRARY),
          AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_WORKOUT),
          AsyncStorage.getItem(STORAGE_KEYS.STATS)
        ]);

        if (history) setWorkoutHistory(JSON.parse(history) as Workout[]);
        if (library) {
          const parsed = JSON.parse(library) as ExerciseLibraryItem[];
          setExercisesLibrary(parsed.map(migrateAssistedMachine));
        }
        if (active) {
          const parsedActive = JSON.parse(active) as Workout;
          setActiveWorkout(sanitizeWorkout(parsedActive));
        }
        if (stats) setExerciseStats(JSON.parse(stats) as ExerciseStatsMap);

        try {
          await autoLogin();
          const [remoteWorkouts, remoteExercises] = await Promise.all([
            fetchWorkouts(),
            fetchExercises(),
          ]);
          if (remoteWorkouts.length > 0) {
            setWorkoutHistory(remoteWorkouts);
          }
          if (remoteExercises.length > 0) {
            setExercisesLibrary(remoteExercises);
          }
          console.log("[sync] loaded workouts:", remoteWorkouts.length, "exercises:", remoteExercises.length);
        } catch (err) {
          console.warn("[sync] backend fetch failed, using cached data:", (err as Error).message);
        }
      } catch (e) {
        console.error("Failed to load data", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

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

  const updateWorkout = (updatedWorkout: Workout) => {
    const sanitized = sanitizeWorkout(updatedWorkout);
    setActiveWorkout(sanitized);
  };

  const updateHistory = (updatedWorkout: Workout) => {
    setWorkoutHistory(workoutHistory.map(w => w.id === updatedWorkout.id ? updatedWorkout : w));
  };

  const updateStatsForExercise = (stats: ExerciseStatsMap, exercise: Exercise, date: string, bodyWeight?: number | null): void => {
    const { exerciseId, category, sets } = exercise;
    if (!stats[exerciseId]) {
      stats[exerciseId] = {
        pr: 0,
        lastPerformed: null,
        history: []
      };
    }

    const currentStats = stats[exerciseId];

    sets.forEach(set => {
      if (!set.completed) return;

      if (category === 'Lifts') {
        const weight = getEffectiveWeight(exercise, set, bodyWeight);
        if (weight > (currentStats.pr || 0)) {
          currentStats.pr = weight;
        }
      }
    });

    currentStats.history.unshift({
      date: date,
      sets: sets.filter(s => s.completed).map(s => ({
        weight: String(getEffectiveWeight(exercise, s, bodyWeight)),
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

  const finishWorkout = (bodyWeight?: number) => {
    if (!activeWorkout) return;
    const finishedWorkout: Workout = {
      ...activeWorkout,
      endedAt: Date.now(),
      duration: formatDuration(Math.floor((Date.now() - activeWorkout.startedAt) / 1000)),
      date: new Date().toLocaleDateString()
    };

    const newStats = { ...exerciseStats };
    finishedWorkout.exercises.forEach(ex => {
      if (ex.type === 'group') {
        ex.children.forEach(child => updateStatsForExercise(newStats, child, finishedWorkout.date!, bodyWeight));
      } else {
        updateStatsForExercise(newStats, ex, finishedWorkout.date!, bodyWeight);
      }
    });
    setExerciseStats(newStats);

    setWorkoutHistory([finishedWorkout, ...workoutHistory]);
    setActiveWorkout(null);

    apiCreateWorkout(finishedWorkout).catch(err =>
      console.warn("[sync] failed to push workout:", (err as Error).message)
    );
  };

  const cancelWorkout = () => {
    setActiveWorkout(null);
  };

  const addExerciseToLibrary = (newExercise: ExerciseLibraryItem): string => {
    const newId = newExercise.id || `e${Date.now()}`;
    const exerciseToAdd = migrateAssistedMachine({ ...newExercise, id: newId });
    setExercisesLibrary([exerciseToAdd, ...exercisesLibrary]);

    apiCreateExercise(exerciseToAdd).catch(err =>
      console.warn("[sync] failed to push exercise:", (err as Error).message)
    );

    return newId;
  };

  const updateExerciseInLibrary = (exerciseId: string, updates: Partial<ExerciseLibraryItem>) => {
    setExercisesLibrary(exercisesLibrary.map(ex =>
      ex.id === exerciseId ? migrateAssistedMachine({ ...ex, ...updates }) : ex
    ));

    apiUpdateExercise(exerciseId, updates).catch(err =>
      console.warn("[sync] failed to update exercise:", (err as Error).message)
    );
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

export const useWorkout = (): WorkoutContextValue => {
  const context = useContext(WorkoutContext);
  if (context === undefined) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
};
