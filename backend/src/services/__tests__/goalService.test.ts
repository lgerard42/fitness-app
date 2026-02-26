import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../config/db';
import {
  listGoals,
  createGoal,
  updateGoal,
  deleteGoal,
} from '../goalService';

const mockPrisma = vi.mocked(prisma, true);

describe('goalService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listGoals', () => {
    it('should return goals with exercise relation', async () => {
      const goals = [
        { id: 'g1', type: 'strength', exercise: { id: 'e1', name: 'Bench Press' } },
      ];
      mockPrisma.userGoal.findMany.mockResolvedValue(goals as any);

      const result = await listGoals('u1');

      expect(result).toEqual(goals);
      expect(mockPrisma.userGoal.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        orderBy: { createdAt: 'desc' },
        include: { exercise: { select: { id: true, name: true } } },
      });
    });

    it('should return empty array when no goals exist', async () => {
      mockPrisma.userGoal.findMany.mockResolvedValue([]);

      const result = await listGoals('u1');
      expect(result).toEqual([]);
    });
  });

  describe('createGoal', () => {
    it('should create a strength goal', async () => {
      const goal = { id: 'g1', type: 'strength', targetWeight: 225 };
      mockPrisma.userGoal.create.mockResolvedValue(goal as any);

      const result = await createGoal('u1', {
        type: 'strength',
        exerciseId: 'e1',
        targetWeight: 225,
        targetWeightUnit: 'lbs',
      });

      expect(result).toEqual(goal);
      expect(mockPrisma.userGoal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'u1',
          type: 'strength',
          targetWeight: 225,
        }),
      });
    });

    it('should create a consistency goal', async () => {
      mockPrisma.userGoal.create.mockResolvedValue({ id: 'g2', type: 'consistency' } as any);

      const result = await createGoal('u1', {
        type: 'consistency',
        targetWorkoutsPerWeek: 4,
      });

      expect(result.type).toBe('consistency');
    });

    it('should pass all fields to prisma create', async () => {
      mockPrisma.userGoal.create.mockResolvedValue({ id: 'g3' } as any);

      await createGoal('u1', {
        type: 'strength',
        exerciseId: 'e1',
        targetWeight: 315,
        targetWeightUnit: 'lbs',
      });

      expect(mockPrisma.userGoal.create).toHaveBeenCalledWith({
        data: {
          userId: 'u1',
          type: 'strength',
          exerciseId: 'e1',
          targetWeight: 315,
          targetWeightUnit: 'lbs',
        },
      });
    });
  });

  describe('updateGoal', () => {
    it('should update an existing goal', async () => {
      mockPrisma.userGoal.findFirst.mockResolvedValue({ id: 'g1', userId: 'u1' } as any);
      mockPrisma.userGoal.update.mockResolvedValue({ id: 'g1', completed: true } as any);

      const result = await updateGoal('u1', 'g1', { completed: true });

      expect(result.completed).toBe(true);
      expect(mockPrisma.userGoal.update).toHaveBeenCalledWith({
        where: { id: 'g1' },
        data: { completed: true },
      });
    });

    it('should throw 404 when goal not found', async () => {
      mockPrisma.userGoal.findFirst.mockResolvedValue(null);

      await expect(updateGoal('u1', 'missing', { completed: true })).rejects.toThrow(
        'Goal not found',
      );
    });

    it('should attach status 404 on the thrown error', async () => {
      mockPrisma.userGoal.findFirst.mockResolvedValue(null);

      try {
        await updateGoal('u1', 'missing', {});
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err.status).toBe(404);
      }
    });
  });

  describe('deleteGoal', () => {
    it('should delete an existing goal', async () => {
      mockPrisma.userGoal.findFirst.mockResolvedValue({ id: 'g1', userId: 'u1' } as any);
      mockPrisma.userGoal.delete.mockResolvedValue({} as any);

      await deleteGoal('u1', 'g1');

      expect(mockPrisma.userGoal.delete).toHaveBeenCalledWith({ where: { id: 'g1' } });
    });

    it('should throw 404 when goal not found', async () => {
      mockPrisma.userGoal.findFirst.mockResolvedValue(null);

      await expect(deleteGoal('u1', 'missing')).rejects.toThrow('Goal not found');
    });

    it('should not call delete if goal not found', async () => {
      mockPrisma.userGoal.findFirst.mockResolvedValue(null);

      try {
        await deleteGoal('u1', 'missing');
      } catch {
        // expected
      }
      expect(mockPrisma.userGoal.delete).not.toHaveBeenCalled();
    });
  });
});
