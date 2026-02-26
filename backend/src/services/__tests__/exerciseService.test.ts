import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../config/db';
import {
  listExercises,
  createExercise,
  updateExercise,
  deleteExercise,
} from '../exerciseService';

const mockPrisma = vi.mocked(prisma, true);

describe('exerciseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listExercises', () => {
    it('should return exercises ordered by name', async () => {
      const exercises = [
        { id: 'e1', name: 'Bench Press', category: 'Chest' },
        { id: 'e2', name: 'Squat', category: 'Legs' },
      ];
      mockPrisma.exerciseLibrary.findMany.mockResolvedValue(exercises as any);

      const result = await listExercises('u1');

      expect(result).toEqual(exercises);
      expect(mockPrisma.exerciseLibrary.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        orderBy: { name: 'asc' },
      });
    });

    it('should return empty array when user has no exercises', async () => {
      mockPrisma.exerciseLibrary.findMany.mockResolvedValue([]);

      const result = await listExercises('u1');
      expect(result).toEqual([]);
    });
  });

  describe('createExercise', () => {
    it('should create a new exercise', async () => {
      const newExercise = { id: 'e1', name: 'Deadlift', category: 'Back', assistedNegative: false };
      mockPrisma.exerciseLibrary.create.mockResolvedValue(newExercise as any);

      const result = await createExercise('u1', {
        name: 'Deadlift',
        category: 'Back',
        assistedNegative: false,
      });

      expect(result).toEqual(newExercise);
      expect(mockPrisma.exerciseLibrary.create).toHaveBeenCalledWith({
        data: { userId: 'u1', name: 'Deadlift', category: 'Back', assistedNegative: false },
      });
    });

    it('should pass config when provided', async () => {
      mockPrisma.exerciseLibrary.create.mockResolvedValue({ id: 'e2' } as any);

      await createExercise('u1', {
        name: 'Cable Fly',
        category: 'Chest',
        assistedNegative: false,
        config: { track: 'weight' },
      });

      expect(mockPrisma.exerciseLibrary.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ config: { track: 'weight' } }),
      });
    });
  });

  describe('updateExercise', () => {
    it('should update an existing exercise', async () => {
      mockPrisma.exerciseLibrary.findFirst.mockResolvedValue({ id: 'e1', userId: 'u1' } as any);
      mockPrisma.exerciseLibrary.update.mockResolvedValue({
        id: 'e1', name: 'Incline Bench', category: 'Chest',
      } as any);

      const result = await updateExercise('u1', 'e1', { name: 'Incline Bench' });
      expect(result.name).toBe('Incline Bench');
    });

    it('should throw 404 when exercise not found', async () => {
      mockPrisma.exerciseLibrary.findFirst.mockResolvedValue(null);

      await expect(
        updateExercise('u1', 'missing', { name: 'X' }),
      ).rejects.toThrow('Exercise not found');
    });

    it('should attach status 404 on the thrown error', async () => {
      mockPrisma.exerciseLibrary.findFirst.mockResolvedValue(null);

      try {
        await updateExercise('u1', 'missing', { name: 'X' });
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err.status).toBe(404);
      }
    });
  });

  describe('deleteExercise', () => {
    it('should delete an existing exercise', async () => {
      mockPrisma.exerciseLibrary.findFirst.mockResolvedValue({ id: 'e1', userId: 'u1' } as any);
      mockPrisma.exerciseLibrary.delete.mockResolvedValue({} as any);

      await deleteExercise('u1', 'e1');

      expect(mockPrisma.exerciseLibrary.delete).toHaveBeenCalledWith({ where: { id: 'e1' } });
    });

    it('should throw 404 when exercise not found', async () => {
      mockPrisma.exerciseLibrary.findFirst.mockResolvedValue(null);

      await expect(deleteExercise('u1', 'missing')).rejects.toThrow('Exercise not found');
    });

    it('should not call delete if exercise not found', async () => {
      mockPrisma.exerciseLibrary.findFirst.mockResolvedValue(null);

      try {
        await deleteExercise('u1', 'missing');
      } catch {
        // expected
      }
      expect(mockPrisma.exerciseLibrary.delete).not.toHaveBeenCalled();
    });
  });
});
