import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { wrap } from '../asyncHandler';

function mockReqResNext() {
  const req = {} as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe('wrap (asyncHandler)', () => {
  it('should call the handler and not call next on success', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const wrapped = wrap(handler);
    const { req, res, next } = mockReqResNext();

    await wrapped(req, res, next);

    expect(handler).toHaveBeenCalledWith(req, res);
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next with error when handler rejects', async () => {
    const error = new Error('handler failed');
    const handler = vi.fn().mockRejectedValue(error);
    const wrapped = wrap(handler);
    const { req, res, next } = mockReqResNext();

    await wrapped(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('should propagate the error object to next', async () => {
    const customError = Object.assign(new Error('Not found'), { status: 404 });
    const handler = vi.fn().mockRejectedValue(customError);
    const wrapped = wrap(handler);
    const { req, res, next } = mockReqResNext();

    await wrapped(req, res, next);

    expect(next).toHaveBeenCalledWith(customError);
    const passedError = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(passedError.status).toBe(404);
  });

  it('should work with handlers that return a resolved promise', async () => {
    const handler = vi.fn().mockImplementation(async (_req: Request, res: Response) => {
      res.json({ ok: true });
    });
    const wrapped = wrap(handler);
    const { req, res, next } = mockReqResNext();

    await wrapped(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(next).not.toHaveBeenCalled();
  });
});
