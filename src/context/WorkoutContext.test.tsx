import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { WorkoutProvider, useWorkout } from './WorkoutContext';

// Mock API so context loads with empty state and completes loading
jest.mock('@/api/client', () => ({
  autoLogin: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/api/workouts', () => ({
  fetchWorkouts: jest.fn(() => Promise.resolve([])),
  createWorkout: jest.fn(() => Promise.resolve({})),
}));
jest.mock('@/api/exercises', () => ({
  fetchExercises: jest.fn(() => Promise.resolve([])),
  createExercise: jest.fn(() => Promise.resolve({})),
  updateExercise: jest.fn(() => Promise.resolve({})),
}));

const TestConsumer = () => {
  const ctx = useWorkout();
  return (
    <View>
      <Text testID="loading">{String(ctx.isLoading)}</Text>
      <Text testID="active">{ctx.activeWorkout ? ctx.activeWorkout.id : 'null'}</Text>
      <Text testID="history-count">{ctx.workoutHistory.length}</Text>
      <TouchableOpacity testID="start" onPress={ctx.startEmptyWorkout}>
        <Text>Start</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="cancel" onPress={ctx.cancelWorkout}>
        <Text>Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="finish" onPress={() => ctx.finishWorkout()}>
        <Text>Finish</Text>
      </TouchableOpacity>
    </View>
  );
};

describe('WorkoutContext', () => {
  it('throws when useWorkout is used outside provider', () => {
    const BadConsumer = () => {
      useWorkout();
      return null;
    };
    expect(() => render(<BadConsumer />)).toThrow('useWorkout must be used within a WorkoutProvider');
  });

  it('loads with initial empty state after loading', async () => {
    render(
      <WorkoutProvider>
        <TestConsumer />
      </WorkoutProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').props.children).toBe('false');
    }, { timeout: 10000 });

    expect(screen.getByTestId('active').props.children).toBe('null');
    expect(screen.getByTestId('history-count').props.children).toBe(0);
  });

  it('startEmptyWorkout creates active workout', async () => {
    render(
      <WorkoutProvider>
        <TestConsumer />
      </WorkoutProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').props.children).toBe('false');
    }, { timeout: 10000 });

    fireEvent.press(screen.getByTestId('start'));

    expect(screen.getByTestId('active').props.children).toMatch(/^w-\d+$/);
  });

  it('cancelWorkout clears active workout', async () => {
    render(
      <WorkoutProvider>
        <TestConsumer />
      </WorkoutProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').props.children).toBe('false');
    }, { timeout: 10000 });

    fireEvent.press(screen.getByTestId('start'));
    expect(screen.getByTestId('active').props.children).not.toBe('null');

    fireEvent.press(screen.getByTestId('cancel'));
    expect(screen.getByTestId('active').props.children).toBe('null');
  });

  it('finishWorkout adds to history and clears active', async () => {
    render(
      <WorkoutProvider>
        <TestConsumer />
      </WorkoutProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').props.children).toBe('false');
    }, { timeout: 10000 });

    fireEvent.press(screen.getByTestId('start'));

    fireEvent.press(screen.getByTestId('finish'));

    expect(screen.getByTestId('active').props.children).toBe('null');
    expect(screen.getByTestId('history-count').props.children).toBe(1);
  });

  it('addExerciseToLibrary adds exercise and returns id', async () => {
    const ConsumerWithAdd = () => {
      const ctx = useWorkout();
      const [addedId, setAddedId] = React.useState<string | null>(null);
      return (
        <View>
          <Text testID="loading">{String(ctx.isLoading)}</Text>
          <Text testID="lib-count">{ctx.exercisesLibrary.length}</Text>
          <TouchableOpacity
            testID="add"
            onPress={() => setAddedId(ctx.addExerciseToLibrary({ id: 'custom-1', name: 'Custom Ex', category: 'Lifts' }))}
          >
            <Text>Add</Text>
          </TouchableOpacity>
          <Text testID="added-id">{addedId ?? 'none'}</Text>
        </View>
      );
    };

    render(
      <WorkoutProvider>
        <ConsumerWithAdd />
      </WorkoutProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').props.children).toBe('false');
    }, { timeout: 10000 });

    const initialCount = Number(screen.getByTestId('lib-count').props.children);

    fireEvent.press(screen.getByTestId('add'));

    expect(screen.getByTestId('added-id').props.children).toBe('custom-1');
    expect(Number(screen.getByTestId('lib-count').props.children)).toBe(initialCount + 1);
  });
});
