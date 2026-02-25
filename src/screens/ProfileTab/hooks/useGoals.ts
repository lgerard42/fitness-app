import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FEATURE_FLAGS } from '@/config/featureFlags';
import {
  fetchGoals as apiFetchGoals,
  createGoal as apiCreateGoal,
  updateGoal as apiUpdateGoal,
  deleteGoal as apiDeleteGoal,
} from '@/api/goals';
import type { UserGoal } from '@/types/workout';

const STORAGE_KEY = 'user_goals';

export const useGoals = () => {
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setGoals(JSON.parse(raw) as UserGoal[]);
        }

        if (FEATURE_FLAGS.USE_BACKEND_USERDATA) {
          try {
            const remote = await apiFetchGoals();
            if (remote.length > 0) {
              setGoals(remote);
              console.log("[sync] loaded goals:", remote.length);
            }
          } catch (err) {
            console.warn("[sync] goals fetch failed:", (err as Error).message);
          }
        }
      } catch (e) {
        console.error('Failed to load goals', e);
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
    }
  }, [goals, isLoaded]);

  const addGoal = useCallback((goal: Omit<UserGoal, 'id' | 'createdAt' | 'completed'>) => {
    const newGoal: UserGoal = {
      ...goal,
      id: `goal-${Date.now()}`,
      createdAt: new Date().toISOString(),
      completed: false,
    };
    setGoals(prev => [newGoal, ...prev]);

    if (FEATURE_FLAGS.USE_BACKEND_USERDATA) {
      apiCreateGoal(goal).catch(err =>
        console.warn("[sync] failed to push goal:", (err as Error).message)
      );
    }
  }, []);

  const toggleGoalCompleted = useCallback((id: string) => {
    let newCompleted = false;
    setGoals(prev =>
      prev.map(g => {
        if (g.id === id) {
          newCompleted = !g.completed;
          return { ...g, completed: newCompleted };
        }
        return g;
      })
    );

    if (FEATURE_FLAGS.USE_BACKEND_USERDATA) {
      apiUpdateGoal(id, { completed: newCompleted }).catch(err =>
        console.warn("[sync] failed to update goal:", (err as Error).message)
      );
    }
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));

    if (FEATURE_FLAGS.USE_BACKEND_USERDATA) {
      apiDeleteGoal(id).catch(err =>
        console.warn("[sync] failed to delete goal:", (err as Error).message)
      );
    }
  }, []);

  const strengthGoals = goals.filter(g => g.type === 'strength');
  const consistencyGoals = goals.filter(g => g.type === 'consistency');

  return {
    goals,
    strengthGoals,
    consistencyGoals,
    addGoal,
    toggleGoalCompleted,
    deleteGoal,
    isLoaded,
  };
};
