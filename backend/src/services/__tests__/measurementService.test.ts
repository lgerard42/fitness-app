import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../config/db';
import {
  listMeasurements,
  createMeasurement,
  deleteMeasurement,
} from '../measurementService';

const mockPrisma = vi.mocked(prisma, true);

describe('measurementService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listMeasurements', () => {
    it('should return measurements ordered by date desc', async () => {
      const measurements = [
        { id: 'm1', weight: 180, date: new Date('2024-02-01') },
        { id: 'm2', weight: 178, date: new Date('2024-01-01') },
      ];
      mockPrisma.bodyMeasurement.findMany.mockResolvedValue(measurements as any);

      const result = await listMeasurements('u1');

      expect(result).toEqual(measurements);
      expect(mockPrisma.bodyMeasurement.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        orderBy: { date: 'desc' },
      });
    });

    it('should return empty array when no measurements exist', async () => {
      mockPrisma.bodyMeasurement.findMany.mockResolvedValue([]);

      const result = await listMeasurements('u1');
      expect(result).toEqual([]);
    });
  });

  describe('createMeasurement', () => {
    it('should create a measurement with all fields', async () => {
      const created = { id: 'm1', weight: 180, unit: 'lbs' };
      mockPrisma.bodyMeasurement.create.mockResolvedValue(created as any);

      const result = await createMeasurement('u1', {
        date: '2024-01-15',
        weight: 180,
        unit: 'lbs',
        circumferenceUnit: 'in',
      });

      expect(result).toEqual(created);
      expect(mockPrisma.bodyMeasurement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'u1',
          weight: 180,
          unit: 'lbs',
          circumferenceUnit: 'in',
        }),
      });
    });

    it('should convert date string to Date object', async () => {
      mockPrisma.bodyMeasurement.create.mockResolvedValue({ id: 'm2' } as any);

      await createMeasurement('u1', {
        date: '2024-06-01',
        unit: 'kg',
        circumferenceUnit: 'cm',
      });

      const callData = mockPrisma.bodyMeasurement.create.mock.calls[0][0].data;
      expect(callData.date).toBeInstanceOf(Date);
    });

    it('should include optional body measurements when provided', async () => {
      mockPrisma.bodyMeasurement.create.mockResolvedValue({ id: 'm3' } as any);

      await createMeasurement('u1', {
        date: '2024-01-01',
        weight: 200,
        bodyFatPercent: 15,
        chest: 42,
        waist: 34,
        unit: 'lbs',
        circumferenceUnit: 'in',
      });

      const callData = mockPrisma.bodyMeasurement.create.mock.calls[0][0].data;
      expect(callData.bodyFatPercent).toBe(15);
      expect(callData.chest).toBe(42);
      expect(callData.waist).toBe(34);
    });
  });

  describe('deleteMeasurement', () => {
    it('should delete an existing measurement', async () => {
      mockPrisma.bodyMeasurement.findFirst.mockResolvedValue({ id: 'm1', userId: 'u1' } as any);
      mockPrisma.bodyMeasurement.delete.mockResolvedValue({} as any);

      await deleteMeasurement('u1', 'm1');

      expect(mockPrisma.bodyMeasurement.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
    });

    it('should throw 404 when measurement not found', async () => {
      mockPrisma.bodyMeasurement.findFirst.mockResolvedValue(null);

      await expect(deleteMeasurement('u1', 'missing')).rejects.toThrow('Measurement not found');
    });

    it('should attach status 404 on the thrown error', async () => {
      mockPrisma.bodyMeasurement.findFirst.mockResolvedValue(null);

      try {
        await deleteMeasurement('u1', 'missing');
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err.status).toBe(404);
      }
    });

    it('should not call delete if measurement not found', async () => {
      mockPrisma.bodyMeasurement.findFirst.mockResolvedValue(null);

      try {
        await deleteMeasurement('u1', 'missing');
      } catch {
        // expected
      }
      expect(mockPrisma.bodyMeasurement.delete).not.toHaveBeenCalled();
    });
  });
});
