import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../config/db';
import {
  listWorkouts,
  getWorkout,
  createWorkout,
  deleteWorkout,
} from '../workoutService';

const mockPrisma = vi.mocked(prisma, true);

describe('workoutService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listWorkouts', () => {
    it('should return paginated workouts with total count', async () => {
      const mockWorkouts = [
        { id: 'w1', name: 'Push Day', userId: 'u1', exercises: [] },
      ];
      mockPrisma.workout.findMany.mockResolvedValue(mockWorkouts as any);
      mockPrisma.workout.count.mockResolvedValue(1);

      const result = await listWorkouts('u1', 1, 20);

      expect(result).toEqual({ workouts: mockWorkouts, total: 1, page: 1, limit: 20 });
      expect(mockPrisma.workout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1' }, skip: 0, take: 20 }),
      );
    });

    it('should apply correct offset for page 2', async () => {
      mockPrisma.workout.findMany.mockResolvedValue([]);
      mockPrisma.workout.count.mockResolvedValue(0);

      await listWorkouts('u1', 2, 10);

      expect(mockPrisma.workout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should use default page=1 and limit=20', async () => {
      mockPrisma.workout.findMany.mockResolvedValue([]);
      mockPrisma.workout.count.mockResolvedValue(0);

      await listWorkouts('u1');

      expect(mockPrisma.workout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });
  });

  describe('getWorkout', () => {
    it('should return the workout when found', async () => {
      const workout = { id: 'w1', userId: 'u1', name: 'Pull Day', exercises: [] };
      mockPrisma.workout.findFirst.mockResolvedValue(workout as any);

      const result = await getWorkout('u1', 'w1');
      expect(result).toEqual(workout);
    });

    it('should throw 404 when workout not found', async () => {
      mockPrisma.workout.findFirst.mockResolvedValue(null);

      await expect(getWorkout('u1', 'missing')).rejects.toThrow('Workout not found');
    });

    it('should attach status 404 on the thrown error', async () => {
      mockPrisma.workout.findFirst.mockResolvedValue(null);

      try {
        await getWorkout('u1', 'missing');
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err.status).toBe(404);
      }
    });
  });

  describe('createWorkout', () => {
    it('should create a workout with exercises and sets', async () => {
      const created = { id: 'w1', name: 'Leg Day', exercises: [] };
      mockPrisma.workout.create.mockResolvedValue(created as any);

      const result = await createWorkout('u1', {
        name: 'Leg Day',
        startedAt: '2024-01-01T10:00:00Z',
        exercises: [
          {
            exerciseName: 'Squat',
            position: 0,
            sets: [{ position: 0, weight: '100', reps: '5' }],
          },
        ],
      });

      expect(result).toEqual(created);
      expect(mockPrisma.workout.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'u1', name: 'Leg Day' }),
        }),
      );
    });

    it('should handle workout with no exercises', async () => {
      mockPrisma.workout.create.mockResolvedValue({ id: 'w2' } as any);

      const result = await createWorkout('u1', {
        name: 'Rest Day',
        startedAt: Date.now(),
      });

      expect(result.id).toBe('w2');
    });
  });

  describe('deleteWorkout', () => {
    it('should delete an existing workout', async () => {
      mockPrisma.workout.findFirst.mockResolvedValue({ id: 'w1', userId: 'u1' } as any);
      mockPrisma.workout.delete.mockResolvedValue({} as any);

      await deleteWorkout('u1', 'w1');

      expect(mockPrisma.workout.delete).toHaveBeenCalledWith({ where: { id: 'w1' } });
    });

    it('should throw 404 when trying to delete non-existent workout', async () => {
      mockPrisma.workout.findFirst.mockResolvedValue(null);

      await expect(deleteWorkout('u1', 'missing')).rejects.toThrow('Workout not found');
    });

    it('should not call delete if workout is not found', async () => {
      mockPrisma.workout.findFirst.mockResolvedValue(null);

      try {
        await deleteWorkout('u1', 'missing');
      } catch {
        // expected
      }
      expect(mockPrisma.workout.delete).not.toHaveBeenCalled();
    });
  });
});
