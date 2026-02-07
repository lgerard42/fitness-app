import { useMemo } from 'react';
import { useWorkout } from '@/context/WorkoutContext';
import type { PersonalRecord } from '@/types/workout';

export const usePersonalRecords = () => {
  const { exerciseStats, exercisesLibrary } = useWorkout();

  const records: PersonalRecord[] = useMemo(() => {
    const prs: PersonalRecord[] = [];

    Object.entries(exerciseStats).forEach(([exerciseId, stats]) => {
      if (stats.pr > 0) {
        const exercise = exercisesLibrary.find(e => e.id === exerciseId);
        const name = exercise?.name ?? exerciseId;

        prs.push({
          exerciseId,
          exerciseName: name,
          weight: stats.pr,
          weightUnit: 'lbs', // PRs stored as raw weight value
          date: stats.lastPerformed ?? '',
        });
      }
    });

    // Sort by weight descending
    prs.sort((a, b) => b.weight - a.weight);
    return prs;
  }, [exerciseStats, exercisesLibrary]);

  return { records };
};
