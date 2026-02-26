import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../config/db';
import {
  getProfile,
  updateProfile,
  getSettings,
  updateSettings,
} from '../profileService';

const mockPrisma = vi.mocked(prisma, true);

describe('profileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile without passwordHash', async () => {
      const dbUser = {
        id: 'u1',
        name: 'John',
        email: 'john@test.com',
        passwordHash: 'hashed',
        settings: { weightUnit: 'lbs' },
      };
      mockPrisma.user.findUnique.mockResolvedValue(dbUser as any);

      const result = await getProfile('u1');

      expect(result).not.toHaveProperty('passwordHash');
      expect(result.name).toBe('John');
      expect(result.email).toBe('john@test.com');
    });

    it('should include settings in the profile', async () => {
      const dbUser = {
        id: 'u1',
        name: 'Jane',
        email: 'jane@test.com',
        passwordHash: 'hashed',
        settings: { weightUnit: 'kg', distanceUnit: 'Metric' },
      };
      mockPrisma.user.findUnique.mockResolvedValue(dbUser as any);

      const result = await getProfile('u1');

      expect(result.settings).toEqual({ weightUnit: 'kg', distanceUnit: 'Metric' });
    });

    it('should throw 404 when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(getProfile('missing')).rejects.toThrow('User not found');
    });

    it('should attach status 404 on the thrown error', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      try {
        await getProfile('missing');
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err.status).toBe(404);
      }
    });
  });

  describe('updateProfile', () => {
    it('should update and return profile without passwordHash', async () => {
      const updated = {
        id: 'u1',
        name: 'John Updated',
        email: 'john@test.com',
        passwordHash: 'hashed',
      };
      mockPrisma.user.update.mockResolvedValue(updated as any);

      const result = await updateProfile('u1', { name: 'John Updated' });

      expect(result.name).toBe('John Updated');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should pass the update data to prisma', async () => {
      mockPrisma.user.update.mockResolvedValue({ id: 'u1', passwordHash: 'h' } as any);

      await updateProfile('u1', { bio: 'Fitness enthusiast', bodyWeight: 180 });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { bio: 'Fitness enthusiast', bodyWeight: 180 },
      });
    });

    it('should handle partial updates', async () => {
      mockPrisma.user.update.mockResolvedValue({
        id: 'u1',
        phone: '555-1234',
        passwordHash: 'h',
      } as any);

      const result = await updateProfile('u1', { phone: '555-1234' });
      expect(result.phone).toBe('555-1234');
    });
  });

  describe('getSettings', () => {
    it('should return user settings', async () => {
      const settings = { userId: 'u1', weightUnit: 'lbs', distanceUnit: 'US' };
      mockPrisma.userSettings.findUnique.mockResolvedValue(settings as any);

      const result = await getSettings('u1');

      expect(result).toEqual(settings);
      expect(mockPrisma.userSettings.findUnique).toHaveBeenCalledWith({
        where: { userId: 'u1' },
      });
    });

    it('should return null when no settings exist', async () => {
      mockPrisma.userSettings.findUnique.mockResolvedValue(null);

      const result = await getSettings('u1');
      expect(result).toBeNull();
    });
  });

  describe('updateSettings', () => {
    it('should upsert settings', async () => {
      const settings = { userId: 'u1', weightUnit: 'kg' };
      mockPrisma.userSettings.upsert.mockResolvedValue(settings as any);

      const result = await updateSettings('u1', { weightUnit: 'kg' });

      expect(result).toEqual(settings);
      expect(mockPrisma.userSettings.upsert).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        update: { weightUnit: 'kg' },
        create: { userId: 'u1', weightUnit: 'kg' },
      });
    });

    it('should pass all settings fields', async () => {
      mockPrisma.userSettings.upsert.mockResolvedValue({ userId: 'u1' } as any);

      await updateSettings('u1', {
        weightUnit: 'lbs',
        distanceUnit: 'US',
        defaultRestTimerSeconds: 90,
        keepScreenAwake: true,
      });

      expect(mockPrisma.userSettings.upsert).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        update: {
          weightUnit: 'lbs',
          distanceUnit: 'US',
          defaultRestTimerSeconds: 90,
          keepScreenAwake: true,
        },
        create: {
          userId: 'u1',
          weightUnit: 'lbs',
          distanceUnit: 'US',
          defaultRestTimerSeconds: 90,
          keepScreenAwake: true,
        },
      });
    });
  });
});
