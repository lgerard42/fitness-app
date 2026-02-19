import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ExerciseTags from './ExerciseTags';

describe('ExerciseTags', () => {
  it('renders category and primary muscle tags when not collapsed', () => {
    const item = {
      id: '1',
      name: 'Bench Press',
      category: 'Lifts',
      primaryMuscles: ['Chest', 'Triceps'],
    } as any;
    render(<ExerciseTags item={item} isCollapsedGroup={false} groupExercises={null} />);
    expect(screen.getByText('Lifts')).toBeTruthy();
    expect(screen.getByText('Chest')).toBeTruthy();
    expect(screen.getByText('Triceps')).toBeTruthy();
  });

  it('renders only first 2 primary muscles', () => {
    const item = {
      id: '1',
      name: 'Squat',
      category: 'Lifts',
      primaryMuscles: ['Quadriceps', 'Glutes', 'Hamstrings'],
    } as any;
    render(<ExerciseTags item={item} isCollapsedGroup={false} groupExercises={null} />);
    expect(screen.getByText('Quadriceps')).toBeTruthy();
    expect(screen.getByText('Glutes')).toBeTruthy();
    expect(screen.queryByText('Hamstrings')).toBeNull();
  });

  it('renders collapsed group exercises when isCollapsedGroup is true', () => {
    const item = {} as any;
    const groupExercises = [
      { name: 'Bench Press', count: 3 },
      { name: 'Squat', count: 2 },
    ];
    render(<ExerciseTags item={item} isCollapsedGroup={true} groupExercises={groupExercises} />);
    expect(screen.getByText('Bench Press (3)')).toBeTruthy();
    expect(screen.getByText('Squat (2)')).toBeTruthy();
  });

  it('handles missing primaryMuscles', () => {
    const item = { id: '1', name: 'Unknown', category: 'Lifts' } as any;
    render(<ExerciseTags item={item} isCollapsedGroup={false} groupExercises={null} />);
    expect(screen.getByText('Lifts')).toBeTruthy();
  });
});
