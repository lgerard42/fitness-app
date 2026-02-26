import { describe, it, expect, vi, beforeEach } from 'vitest';
import { matrixConfigsApi } from '../matrixConfigs';
import { request } from '../client';

vi.mock('../client', () => ({
  request: vi.fn().mockResolvedValue({}),
}));

const mockRequest = vi.mocked(request);

describe('matrixConfigsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listMatrixConfigs calls GET /matrix-configs with no params', async () => {
    await matrixConfigsApi.listMatrixConfigs();
    expect(mockRequest).toHaveBeenCalledWith('/matrix-configs');
  });

  it('listMatrixConfigs appends query string from params', async () => {
    await matrixConfigsApi.listMatrixConfigs({ scope_type: 'motion', status: 'draft' });
    const call = mockRequest.mock.calls[0][0];
    expect(call).toContain('/matrix-configs?');
    expect(call).toContain('scope_type=motion');
    expect(call).toContain('status=draft');
  });

  it('createMatrixConfig sends POST with body', async () => {
    const data = { scope_type: 'motion', scope_id: 'bench', config_json: {}, notes: 'test' };
    await matrixConfigsApi.createMatrixConfig(data);
    expect(mockRequest).toHaveBeenCalledWith('/matrix-configs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  });

  it('getMatrixConfig calls GET /matrix-configs/:id', async () => {
    await matrixConfigsApi.getMatrixConfig('cfg-1');
    expect(mockRequest).toHaveBeenCalledWith('/matrix-configs/cfg-1');
  });

  it('updateMatrixConfig sends PUT to /matrix-configs/:id', async () => {
    const data = { config_json: { tables: {} }, notes: 'updated' };
    await matrixConfigsApi.updateMatrixConfig('cfg-1', data);
    expect(mockRequest).toHaveBeenCalledWith('/matrix-configs/cfg-1', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  });

  it('deleteMatrixConfig sends DELETE without force', async () => {
    await matrixConfigsApi.deleteMatrixConfig('cfg-1');
    expect(mockRequest).toHaveBeenCalledWith('/matrix-configs/cfg-1', { method: 'DELETE' });
  });

  it('deleteMatrixConfig with force=true appends ?force=true', async () => {
    await matrixConfigsApi.deleteMatrixConfig('cfg-1', true);
    expect(mockRequest).toHaveBeenCalledWith('/matrix-configs/cfg-1?force=true', { method: 'DELETE' });
  });

  it('validateMatrixConfig sends POST to /matrix-configs/:id/validate', async () => {
    await matrixConfigsApi.validateMatrixConfig('cfg-1');
    expect(mockRequest).toHaveBeenCalledWith('/matrix-configs/cfg-1/validate', { method: 'POST' });
  });

  it('activateMatrixConfig sends POST to /matrix-configs/:id/activate', async () => {
    await matrixConfigsApi.activateMatrixConfig('cfg-1');
    expect(mockRequest).toHaveBeenCalledWith('/matrix-configs/cfg-1/activate', { method: 'POST' });
  });

  it('cloneMatrixConfig sends POST to /matrix-configs/:id/clone', async () => {
    await matrixConfigsApi.cloneMatrixConfig('cfg-1');
    expect(mockRequest).toHaveBeenCalledWith('/matrix-configs/cfg-1/clone', { method: 'POST' });
  });

  it('resolveMatrixConfig calls GET with motionId and default mode', async () => {
    await matrixConfigsApi.resolveMatrixConfig('bench-press');
    expect(mockRequest).toHaveBeenCalledWith('/matrix-configs/resolve/bench-press?mode=active_only');
  });

  it('resolveMatrixConfig uses custom mode', async () => {
    await matrixConfigsApi.resolveMatrixConfig('bench-press', 'draft_or_active');
    expect(mockRequest).toHaveBeenCalledWith('/matrix-configs/resolve/bench-press?mode=draft_or_active');
  });

  it('exportMatrixConfig calls GET /matrix-configs/export/:id', async () => {
    await matrixConfigsApi.exportMatrixConfig('cfg-1');
    expect(mockRequest).toHaveBeenCalledWith('/matrix-configs/export/cfg-1');
  });

  it('importMatrixConfig sends POST with data and mode', async () => {
    const data = { tables: {} };
    await matrixConfigsApi.importMatrixConfig(data, 'upsert');
    expect(mockRequest).toHaveBeenCalledWith('/matrix-configs/import', {
      method: 'POST',
      body: JSON.stringify({ data, mode: 'upsert' }),
    });
  });

  it('syncDeltasForMotion sends POST to /matrix-configs/sync-deltas/:motionId', async () => {
    await matrixConfigsApi.syncDeltasForMotion('bench-press');
    expect(mockRequest).toHaveBeenCalledWith('/matrix-configs/sync-deltas/bench-press', { method: 'POST' });
  });

  it('syncAllDeltaMotions sends POST to /matrix-configs/sync-deltas', async () => {
    await matrixConfigsApi.syncAllDeltaMotions();
    expect(mockRequest).toHaveBeenCalledWith('/matrix-configs/sync-deltas', { method: 'POST' });
  });

  it('deduplicateConfigs sends POST to /matrix-configs/deduplicate', async () => {
    await matrixConfigsApi.deduplicateConfigs();
    expect(mockRequest).toHaveBeenCalledWith('/matrix-configs/deduplicate', { method: 'POST' });
  });

  it('ensureDraftsForAllMotions sends POST to /matrix-configs/ensure-drafts', async () => {
    await matrixConfigsApi.ensureDraftsForAllMotions();
    expect(mockRequest).toHaveBeenCalledWith('/matrix-configs/ensure-drafts', { method: 'POST' });
  });
});
