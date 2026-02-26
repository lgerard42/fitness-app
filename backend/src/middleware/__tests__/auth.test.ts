import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../auth';
import { authService, AuthError } from '../../auth/authService';

vi.mock('../../auth/authService', () => {
  const AuthError = class AuthError extends Error {
    constructor(message: string, public statusCode: number) {
      super(message);
      this.name = 'AuthError';
    }
  };
  return {
    AuthError,
    authService: {
      verifyToken: vi.fn(),
    },
  };
});

function mockReqResNext(authHeader?: string) {
  const req = { headers: { authorization: authHeader } } as unknown as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe('requireAuth middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call next and set userId/userEmail for a valid token', () => {
    const payload = { userId: 'u1', email: 'a@b.com' };
    vi.mocked(authService.verifyToken).mockReturnValue(payload);

    const { req, res, next } = mockReqResNext('Bearer valid-token');
    requireAuth(req, res, next);

    expect(authService.verifyToken).toHaveBeenCalledWith('valid-token');
    expect(req.userId).toBe('u1');
    expect(req.userEmail).toBe('a@b.com');
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 when authorization header is missing', () => {
    const { req, res, next } = mockReqResNext(undefined);
    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization header' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when authorization header does not start with Bearer', () => {
    const { req, res, next } = mockReqResNext('Basic abc123');
    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization header' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return AuthError statusCode when verifyToken throws AuthError', () => {
    vi.mocked(authService.verifyToken).mockImplementation(() => {
      throw new AuthError('Invalid or expired token', 401);
    });

    const { req, res, next } = mockReqResNext('Bearer expired-token');
    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when verifyToken throws a generic error', () => {
    vi.mocked(authService.verifyToken).mockImplementation(() => {
      throw new Error('something went wrong');
    });

    const { req, res, next } = mockReqResNext('Bearer bad-token');
    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication failed' });
    expect(next).not.toHaveBeenCalled();
  });
});
