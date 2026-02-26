import { describe, it, expect, vi, beforeEach } from 'vitest';
import { schemaApi } from '../schema';
import { request } from '../client';

vi.mock('../client', () => ({
  request: vi.fn().mockResolvedValue({}),
}));

const mockRequest = vi.mocked(request);

describe('schemaApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getSchemas calls GET /schema', async () => {
    await schemaApi.getSchemas();
    expect(mockRequest).toHaveBeenCalledWith('/schema');
  });

  it('getSchema calls GET /schema/:key', async () => {
    await schemaApi.getSchema('motions');
    expect(mockRequest).toHaveBeenCalledWith('/schema/motions');
  });

  it('getRelationships calls GET /schema/meta/relationships', async () => {
    await schemaApi.getRelationships();
    expect(mockRequest).toHaveBeenCalledWith('/schema/meta/relationships');
  });

  it('getFKRefs calls GET /schema/meta/fk-refs/:key/:id', async () => {
    await schemaApi.getFKRefs('motions', 'bench-press');
    expect(mockRequest).toHaveBeenCalledWith('/schema/meta/fk-refs/motions/bench-press');
  });

  it('validate sends POST to /schema/:key/validate with row body', async () => {
    const row = { id: 'test', label: 'Test' };
    await schemaApi.validate('motions', row);
    expect(mockRequest).toHaveBeenCalledWith('/schema/motions/validate', {
      method: 'POST',
      body: JSON.stringify(row),
    });
  });
});
