import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tableApi } from '../tables';
import { request } from '../client';

vi.mock('../client', () => ({
  request: vi.fn().mockResolvedValue({}),
}));

const mockRequest = vi.mocked(request);

describe('tableApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listTables calls GET /tables', async () => {
    await tableApi.listTables();
    expect(mockRequest).toHaveBeenCalledWith('/tables');
  });

  it('getTable calls GET /tables/:key', async () => {
    await tableApi.getTable('motions');
    expect(mockRequest).toHaveBeenCalledWith('/tables/motions');
  });

  it('putTable sends PUT with JSON body', async () => {
    const data = [{ id: '1', label: 'Bench' }];
    await tableApi.putTable('motions', data);
    expect(mockRequest).toHaveBeenCalledWith('/tables/motions', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  });

  it('addRow sends POST with JSON body', async () => {
    const row = { id: 'new', label: 'Squat' };
    await tableApi.addRow('motions', row);
    expect(mockRequest).toHaveBeenCalledWith('/tables/motions/rows', {
      method: 'POST',
      body: JSON.stringify(row),
    });
  });

  it('addRow with skipSync appends ?skipSync=true', async () => {
    await tableApi.addRow('motions', { id: 'x' }, { skipSync: true });
    expect(mockRequest).toHaveBeenCalledWith('/tables/motions/rows?skipSync=true', {
      method: 'POST',
      body: JSON.stringify({ id: 'x' }),
    });
  });

  it('updateRow sends PUT to /tables/:key/rows/:id', async () => {
    const row = { label: 'Updated' };
    await tableApi.updateRow('motions', 'row1', row);
    expect(mockRequest).toHaveBeenCalledWith('/tables/motions/rows/row1', {
      method: 'PUT',
      body: JSON.stringify(row),
    });
  });

  it('updateRow with skipSync appends query string', async () => {
    await tableApi.updateRow('motions', 'row1', {}, { skipSync: true });
    expect(mockRequest).toHaveBeenCalledWith('/tables/motions/rows/row1?skipSync=true', {
      method: 'PUT',
      body: JSON.stringify({}),
    });
  });

  it('deleteRow sends DELETE to /tables/:key/rows/:id', async () => {
    await tableApi.deleteRow('motions', 'row1');
    expect(mockRequest).toHaveBeenCalledWith('/tables/motions/rows/row1', {
      method: 'DELETE',
    });
  });

  it('deleteRow with breakLinks includes query param', async () => {
    await tableApi.deleteRow('motions', 'row1', { breakLinks: true });
    expect(mockRequest).toHaveBeenCalledWith('/tables/motions/rows/row1?breakLinks=true', {
      method: 'DELETE',
    });
  });

  it('deleteRow with reassignTo includes query param', async () => {
    await tableApi.deleteRow('motions', 'row1', { reassignTo: 'row2' });
    expect(mockRequest).toHaveBeenCalledWith('/tables/motions/rows/row1?reassignTo=row2', {
      method: 'DELETE',
    });
  });

  it('deleteRow with skipSync includes query param', async () => {
    await tableApi.deleteRow('motions', 'row1', { skipSync: true });
    expect(mockRequest).toHaveBeenCalledWith('/tables/motions/rows/row1?skipSync=true', {
      method: 'DELETE',
    });
  });

  it('syncTable sends POST to /tables/:key/sync', async () => {
    await tableApi.syncTable('motions');
    expect(mockRequest).toHaveBeenCalledWith('/tables/motions/sync', { method: 'POST' });
  });

  it('reorder sends POST with ids body', async () => {
    const ids = ['a', 'b', 'c'];
    await tableApi.reorder('motions', ids);
    expect(mockRequest).toHaveBeenCalledWith('/tables/motions/reorder', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  });

  it('bulkUpdateMatrix sends POST with sourceTable and updates', async () => {
    const updates = { row1: { field: 'val' } };
    await tableApi.bulkUpdateMatrix('motions', updates);
    expect(mockRequest).toHaveBeenCalledWith('/tables/bulk-matrix', {
      method: 'POST',
      body: JSON.stringify({ sourceTable: 'motions', updates }),
    });
  });
});
