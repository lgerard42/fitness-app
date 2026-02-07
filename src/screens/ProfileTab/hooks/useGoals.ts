import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  }, []);

  const toggleGoalCompleted = useCallback((id: string) => {
    setGoals(prev =>
      prev.map(g => (g.id === id ? { ...g, completed: !g.completed } : g))
    );
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
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
