import React, { useRef, useEffect, useState } from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import { View, Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutProvider, useWorkout } from '../WorkoutContext';

jest.mock('@/api/client', () => ({ autoLogin: jest.fn(() => Promise.reject(new Error('offline'))) }));
jest.mock('@/api/workouts', () => ({
  fetchWorkouts: jest.fn(() => Promise.resolve([])),
  createWorkout: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/api/exercises', () => ({
  fetchExercises: jest.fn(() => Promise.resolve([])),
  createExercise: jest.fn(() => Promise.resolve()),
  updateExercise: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/constants/data', () => ({
  EXERCISE_LIBRARY: [],
  migrateExercise: (e: any) => e,
  migrateAssistedMachine: (e: any) => e,
}));
jest.mock('@/utils/workoutHelpers', () => ({
  getEffectiveWeight: () => 0,
}));

beforeEach(() => {
  jest.useFakeTimers();
  (AsyncStorage.multiGet as jest.Mock).mockResolvedValue([
    ['workout_history', null],
    ['exercise_library', null],
    ['active_workout', null],
    ['exercise_stats', null],
  ]);
  (AsyncStorage.setItem as jest.Mock).mockClear();
  (AsyncStorage.removeItem as jest.Mock).mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

function ContextRefTracker({ onValue }: { onValue: (v: any) => void }) {
  const ctx = useWorkout();
  useEffect(() => { onValue(ctx); });
  return <View />;
}

describe('WorkoutContext memoization', () => {
  it('returns the same context value reference across re-renders when state has not changed', async () => {
    const values: any[] = [];

    function TestComponent() {
      const [, forceRender] = useState(0);
      return (
        <WorkoutProvider>
          <ContextRefTracker onValue={v => values.push(v)} />
          <TouchableOpacity testID="re-render" onPress={() => forceRender(c => c + 1)}>
            <Text>re-render</Text>
          </TouchableOpacity>
        </WorkoutProvider>
      );
    }

    const { getByTestId } = render(<TestComponent />);

    await act(async () => { jest.runAllTimers(); });

    const countBefore = values.length;

    await act(async () => {
      fireEvent.press(getByTestId('re-render'));
    });
    await act(async () => { jest.runAllTimers(); });

    expect(values.length).toBeGreaterThan(countBefore);
    const lastBeforeRerender = values[countBefore - 1];
    const afterRerender = values[countBefore];
    expect(afterRerender).toBe(lastBeforeRerender);
  });
});

describe('WorkoutContext debounced writes', () => {
  it('debounces AsyncStorage.setItem calls (does not write immediately)', async () => {
    function Trigger({ onReady }: { onReady: (ctx: ReturnType<typeof useWorkout>) => void }) {
      const ctx = useWorkout();
      useEffect(() => { onReady(ctx); }, [ctx.isLoading]);
      return null;
    }

    let ctxRef: ReturnType<typeof useWorkout>;

    render(
      <WorkoutProvider>
        <Trigger onReady={ctx => { ctxRef = ctx; }} />
      </WorkoutProvider>
    );

    await act(async () => { jest.runAllTimers(); });

    (AsyncStorage.setItem as jest.Mock).mockClear();

    await act(async () => { ctxRef!.startEmptyWorkout(); });

    expect((AsyncStorage.setItem as jest.Mock).mock.calls.length).toBe(0);

    await act(async () => { jest.advanceTimersByTime(500); });

    expect(
      (AsyncStorage.setItem as jest.Mock).mock.calls.some(
        ([key]: [string]) => key === 'active_workout'
      )
    ).toBe(true);
  });

  it('coalesces rapid state changes into a single write', async () => {
    function Trigger({ onReady }: { onReady: (ctx: ReturnType<typeof useWorkout>) => void }) {
      const ctx = useWorkout();
      useEffect(() => { onReady(ctx); }, [ctx.isLoading]);
      return null;
    }

    let ctxRef: ReturnType<typeof useWorkout>;

    render(
      <WorkoutProvider>
        <Trigger onReady={ctx => { ctxRef = ctx; }} />
      </WorkoutProvider>
    );

    await act(async () => { jest.runAllTimers(); });
    (AsyncStorage.setItem as jest.Mock).mockClear();
    (AsyncStorage.removeItem as jest.Mock).mockClear();

    await act(async () => { ctxRef!.startEmptyWorkout(); });
    await act(async () => { jest.advanceTimersByTime(100); });
    await act(async () => { ctxRef!.cancelWorkout(); });
    await act(async () => { jest.advanceTimersByTime(100); });

    const activeWrites = (AsyncStorage.setItem as jest.Mock).mock.calls.filter(
      ([key]: [string]) => key === 'active_workout'
    );
    expect(activeWrites.length).toBe(0);

    await act(async () => { jest.advanceTimersByTime(500); });

    const removeActive = (AsyncStorage.removeItem as jest.Mock).mock.calls.filter(
      ([key]: [string]) => key === 'active_workout'
    );
    expect(removeActive.length).toBe(1);
  });
});

describe('WorkoutContext multiGet', () => {
  it('loads data using AsyncStorage.multiGet', async () => {
    render(
      <WorkoutProvider>
        <View />
      </WorkoutProvider>
    );

    await act(async () => { jest.runAllTimers(); });

    expect(AsyncStorage.multiGet).toHaveBeenCalledWith([
      'workout_history',
      'exercise_library',
      'active_workout',
      'exercise_stats',
    ]);
  });
});
