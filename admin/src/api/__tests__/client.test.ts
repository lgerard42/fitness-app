import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { request, BASE } from '../client';

describe('client', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockFetch(response: Partial<Response>) {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({}),
      ...response,
    });
  }

  describe('BASE', () => {
    it('equals /api', () => {
      expect(BASE).toBe('/api');
    });
  });

  describe('request', () => {
    it('returns parsed JSON on success', async () => {
      const data = { tables: ['motions'] };
      mockFetch({ ok: true, json: vi.fn().mockResolvedValue(data) });

      const result = await request('/tables');
      expect(result).toEqual(data);
    });

    it('calls fetch with BASE + path and Content-Type header', async () => {
      mockFetch({ ok: true, json: vi.fn().mockResolvedValue({}) });

      await request('/tables');

      expect(globalThis.fetch).toHaveBeenCalledWith('/api/tables', {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('forwards method and body from init', async () => {
      mockFetch({ ok: true, json: vi.fn().mockResolvedValue({ ok: true }) });

      await request('/tables/motions', {
        method: 'PUT',
        body: JSON.stringify([{ id: '1' }]),
      });

      expect(globalThis.fetch).toHaveBeenCalledWith('/api/tables/motions', {
        headers: { 'Content-Type': 'application/json' },
        method: 'PUT',
        body: JSON.stringify([{ id: '1' }]),
      });
    });

    it('throws with error field from JSON body on non-OK response', async () => {
      mockFetch({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({ error: 'Bad input' }),
      });

      await expect(request('/tables')).rejects.toThrow('Bad input');
    });

    it('falls back to HTTP status code when JSON error field is absent', async () => {
      mockFetch({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockResolvedValue({}),
      });

      await expect(request('/tables')).rejects.toThrow('HTTP 500');
    });

    it('falls back to statusText when JSON parsing fails on error response', async () => {
      mockFetch({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        json: vi.fn().mockRejectedValue(new Error('not json')),
      });

      await expect(request('/scoring/compute')).rejects.toThrow('Bad Gateway');
    });
  });
});
