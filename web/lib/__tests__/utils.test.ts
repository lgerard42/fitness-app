import { describe, it, expect } from 'vitest';
import { cn } from '../utils';
import { formatDate, formatDurationMs, formatWeight, formatNumber } from '@shared/utils/formatting';
import { getExercisesFromItems, calculateTotalVolume, calculateStreak } from '@shared/utils/calculations';
import type { Exercise, ExerciseGroup, ExerciseItem, Workout } from '@shared/types/workout';

function makeSet(overrides: Partial<Exercise['sets'][0]> = {}): Exercise['sets'][0] {
  return {
    id: 's1',
    type: 'Working',
    weight: '100',
    reps: '10',
    duration: '0',
    distance: '0',
    completed: true,
    isWarmup: false,
    ...overrides,
  };
}

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    instanceId: 'e1',
    exerciseId: 'bench-press',
    name: 'Bench Press',
    category: 'Lifts',
    type: 'exercise',
    sets: [makeSet()],
    ...overrides,
  };
}

function makeWorkout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: 'w1',
    name: 'Push Day',
    startedAt: Date.now(),
    exercises: [makeExercise()],
    ...overrides,
  };
}

// ── cn ──────────────────────────────────────────────────────────────────

describe('cn', () => {
  it('joins multiple class names', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('filters out falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b');
  });

  it('returns empty string when all values are falsy', () => {
    expect(cn(false, undefined, null)).toBe('');
  });
});

// ── formatDate ──────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('formats a timestamp into a human-readable date', () => {
    const ts = new Date('2026-01-05T12:00:00Z').getTime();
    expect(formatDate(ts)).toContain('Jan');
    expect(formatDate(ts)).toContain('2026');
  });

  it('formats a date string', () => {
    expect(formatDate('2025-12-25')).toContain('Dec');
  });
});

// ── formatDuration (formatDurationMs) ───────────────────────────────────

describe('formatDuration (ms)', () => {
  it('formats minutes only', () => {
    expect(formatDurationMs(300_000)).toBe('5m');
  });

  it('formats hours and minutes', () => {
    expect(formatDurationMs(5_400_000)).toBe('1h 30m');
  });
});

// ── formatWeight ────────────────────────────────────────────────────────

describe('formatWeight', () => {
  it('formats weight with default unit', () => {
    expect(formatWeight(135)).toBe('135 lbs');
  });

  it('formats weight with custom unit', () => {
    expect(formatWeight(60, 'kg')).toBe('60 kg');
  });
});

// ── formatNumber ────────────────────────────────────────────────────────

describe('formatNumber', () => {
  it('returns raw number when below 1000', () => {
    expect(formatNumber(500)).toBe('500');
  });

  it('formats thousands with K suffix', () => {
    expect(formatNumber(1_500)).toBe('1.5K');
  });

  it('formats millions with M suffix', () => {
    expect(formatNumber(2_500_000)).toBe('2.5M');
  });
});

// ── getExercisesFromItems ───────────────────────────────────────────────

describe('getExercisesFromItems', () => {
  it('returns exercises from flat list', () => {
    const items: ExerciseItem[] = [makeExercise()];
    expect(getExercisesFromItems(items)).toHaveLength(1);
  });

  it('flattens exercise groups', () => {
    const group: ExerciseGroup = {
      instanceId: 'g1',
      type: 'group',
      groupType: 'Superset',
      children: [
        makeExercise({ instanceId: 'e1' }),
        makeExercise({ instanceId: 'e2' }),
      ],
    };
    const result = getExercisesFromItems([group]);
    expect(result).toHaveLength(2);
  });
});

// ── calculateTotalVolume ────────────────────────────────────────────────

describe('calculateTotalVolume', () => {
  it('sums weight * reps for completed non-warmup sets', () => {
    const workout = makeWorkout({
      exercises: [
        makeExercise({
          sets: [
            makeSet({ weight: '100', reps: '10', completed: true, isWarmup: false }),
            makeSet({ weight: '50', reps: '5', completed: true, isWarmup: false }),
          ],
        }),
      ],
    });
    expect(calculateTotalVolume([workout])).toBe(100 * 10 + 50 * 5);
  });

  it('excludes warmup and incomplete sets', () => {
    const workout = makeWorkout({
      exercises: [
        makeExercise({
          sets: [
            makeSet({ weight: '100', reps: '10', completed: true, isWarmup: true }),
            makeSet({ weight: '200', reps: '5', completed: false }),
          ],
        }),
      ],
    });
    expect(calculateTotalVolume([workout])).toBe(0);
  });

  it('returns 0 for empty workout list', () => {
    expect(calculateTotalVolume([])).toBe(0);
  });
});

// ── calculateStreak ─────────────────────────────────────────────────────

describe('calculateStreak', () => {
  it('returns 0 for empty workout list', () => {
    expect(calculateStreak([])).toBe(0);
  });

  it('counts consecutive days as streak', () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const workouts: Workout[] = [
      makeWorkout({ id: 'w1', finishedAt: today.getTime() }),
      makeWorkout({ id: 'w2', finishedAt: yesterday.getTime() }),
    ];
    expect(calculateStreak(workouts)).toBeGreaterThanOrEqual(1);
  });
});
