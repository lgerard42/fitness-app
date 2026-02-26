import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../config/db';
import { getDashboard } from '../dashboardService';

const mockPrisma = vi.mocked(prisma, true);

const mockUser = {
  id: 'u1',
  name: 'Test User',
  email: 'test@test.com',
  avatarUrl: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
};

describe('dashboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDashboard', () => {
    it('should return the complete dashboard structure', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.workout.findMany.mockResolvedValue([]);
      mockPrisma.bodyMeasurement.findMany.mockResolvedValue([]);
      mockPrisma.userGoal.findMany.mockResolvedValue([]);
      mockPrisma.personalRecord.findMany.mockResolvedValue([]);

      const result = await getDashboard('u1');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('workoutHistory');
      expect(result).toHaveProperty('exerciseStats');
      expect(result).toHaveProperty('bodyMeasurements');
      expect(result).toHaveProperty('goals');
      expect(result).toHaveProperty('personalRecords');
    });

    it('should format user data correctly', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.workout.findMany.mockResolvedValue([]);
      mockPrisma.bodyMeasurement.findMany.mockResolvedValue([]);
      mockPrisma.userGoal.findMany.mockResolvedValue([]);
      mockPrisma.personalRecord.findMany.mockResolvedValue([]);

      const result = await getDashboard('u1');

      expect(result.user).toEqual({
        id: 'u1',
        name: 'Test User',
        email: 'test@test.com',
        avatarUrl: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-15T00:00:00.000Z',
      });
    });

    it('should throw 404 when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.workout.findMany.mockResolvedValue([]);
      mockPrisma.bodyMeasurement.findMany.mockResolvedValue([]);
      mockPrisma.userGoal.findMany.mockResolvedValue([]);
      mockPrisma.personalRecord.findMany.mockResolvedValue([]);

      await expect(getDashboard('missing')).rejects.toThrow('User not found');
    });

    it('should map workout history with exercises', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.workout.findMany.mockResolvedValue([
        {
          id: 'w1',
          name: 'Push Day',
          startedAt: new Date('2024-01-10T10:00:00Z'),
          finishedAt: new Date('2024-01-10T11:00:00Z'),
          duration: '60min',
          sessionNotes: [],
          exercises: [
            {
              id: 'we1',
              exerciseId: 'e1',
              exerciseName: 'Bench Press',
              category: 'Chest',
              groupType: null,
              notes: [],
              children: [],
              sets: [
                {
                  id: 's1',
                  type: 'Working',
                  weight: '135',
                  weight2: null,
                  reps: '10',
                  reps2: null,
                  duration: '',
                  distance: '',
                  completed: true,
                  isWarmup: false,
                  isDropset: false,
                  isFailure: false,
                  restPeriodSeconds: null,
                  dropSetId: null,
                },
              ],
            },
          ],
        },
      ] as any);
      mockPrisma.bodyMeasurement.findMany.mockResolvedValue([]);
      mockPrisma.userGoal.findMany.mockResolvedValue([]);
      mockPrisma.personalRecord.findMany.mockResolvedValue([]);

      const result = await getDashboard('u1');

      expect(result.workoutHistory).toHaveLength(1);
      expect(result.workoutHistory[0].name).toBe('Push Day');
      expect(result.workoutHistory[0].exercises).toHaveLength(1);
    });

    it('should compute exerciseStats with PR tracking', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.workout.findMany.mockResolvedValue([
        {
          id: 'w1',
          name: 'Day 1',
          startedAt: new Date('2024-01-10'),
          finishedAt: null,
          duration: null,
          sessionNotes: null,
          exercises: [
            {
              id: 'we1',
              exerciseId: 'e1',
              exerciseName: 'Squat',
              category: 'Legs',
              groupType: null,
              notes: null,
              children: [],
              sets: [
                {
                  weight: '225',
                  reps: '5',
                  isWarmup: false,
                  completed: true,
                  type: 'Working',
                  weight2: null,
                  reps2: null,
                  duration: '',
                  distance: '',
                  isDropset: false,
                  isFailure: false,
                  restPeriodSeconds: null,
                  dropSetId: null,
                },
                {
                  weight: '275',
                  reps: '3',
                  isWarmup: false,
                  completed: true,
                  type: 'Working',
                  weight2: null,
                  reps2: null,
                  duration: '',
                  distance: '',
                  isDropset: false,
                  isFailure: false,
                  restPeriodSeconds: null,
                  dropSetId: null,
                },
              ],
            },
          ],
        },
      ] as any);
      mockPrisma.bodyMeasurement.findMany.mockResolvedValue([]);
      mockPrisma.userGoal.findMany.mockResolvedValue([]);
      mockPrisma.personalRecord.findMany.mockResolvedValue([]);

      const result = await getDashboard('u1');

      expect(result.exerciseStats['e1'].pr).toBe(275);
    });

    it('should map body measurements correctly', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.workout.findMany.mockResolvedValue([]);
      mockPrisma.bodyMeasurement.findMany.mockResolvedValue([
        {
          id: 'm1',
          date: new Date('2024-01-15'),
          weight: 180,
          bodyFatPercent: 15,
          neck: null,
          chest: 42,
          waist: 34,
          leftArm: null,
          rightArm: null,
          leftThigh: null,
          rightThigh: null,
          unit: 'lbs',
          circumferenceUnit: 'in',
        },
      ] as any);
      mockPrisma.userGoal.findMany.mockResolvedValue([]);
      mockPrisma.personalRecord.findMany.mockResolvedValue([]);

      const result = await getDashboard('u1');

      expect(result.bodyMeasurements).toHaveLength(1);
      expect(result.bodyMeasurements[0].weight).toBe(180);
      expect(result.bodyMeasurements[0].unit).toBe('lbs');
    });

    it('should map goals with currentProgress for strength goals', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.workout.findMany.mockResolvedValue([
        {
          id: 'w1',
          name: 'Day 1',
          startedAt: new Date('2024-01-10'),
          finishedAt: null,
          duration: null,
          sessionNotes: null,
          exercises: [
            {
              id: 'we1',
              exerciseId: 'e1',
              exerciseName: 'Bench',
              category: 'Chest',
              groupType: null,
              notes: null,
              children: [],
              sets: [
                {
                  weight: '200',
                  reps: '5',
                  isWarmup: false,
                  completed: true,
                  type: 'Working',
                  weight2: null,
                  reps2: null,
                  duration: '',
                  distance: '',
                  isDropset: false,
                  isFailure: false,
                  restPeriodSeconds: null,
                  dropSetId: null,
                },
              ],
            },
          ],
        },
      ] as any);
      mockPrisma.bodyMeasurement.findMany.mockResolvedValue([]);
      mockPrisma.userGoal.findMany.mockResolvedValue([
        {
          id: 'g1',
          type: 'strength',
          exerciseId: 'e1',
          exercise: { id: 'e1', name: 'Bench' },
          targetWeight: 225,
          targetWeightUnit: 'lbs',
          targetWorkoutsPerWeek: null,
          createdAt: new Date('2024-01-01'),
          completed: false,
        },
      ] as any);
      mockPrisma.personalRecord.findMany.mockResolvedValue([]);

      const result = await getDashboard('u1');

      expect(result.goals).toHaveLength(1);
      expect(result.goals[0].currentProgress).toBe(200);
    });
  });
});
