import { request } from './client';

export const matrixConfigsApi = {
  listMatrixConfigs: (params?: { scope_type?: string; scope_id?: string; status?: string }) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString() : '';
    return request<any[]>(`/matrix-configs${qs}`);
  },
  createMatrixConfig: (data: { scope_type: string; scope_id: string; config_json: unknown; notes?: string }) =>
    request<{ config: any; validation: any }>('/matrix-configs', { method: 'POST', body: JSON.stringify(data) }),
  getMatrixConfig: (id: string) => request<any>(`/matrix-configs/${id}`),
  updateMatrixConfig: (id: string, data: { config_json?: unknown; notes?: string; force?: boolean }) =>
    request<any>(`/matrix-configs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMatrixConfig: (id: string, force = false) =>
    request<{ ok: boolean; was_active?: boolean }>(`/matrix-configs/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' }),
  validateMatrixConfig: (id: string) =>
    request<any>(`/matrix-configs/${id}/validate`, { method: 'POST' }),
  activateMatrixConfig: (id: string) =>
    request<any>(`/matrix-configs/${id}/activate`, { method: 'POST' }),
  cloneMatrixConfig: (id: string) =>
    request<any>(`/matrix-configs/${id}/clone`, { method: 'POST' }),
  resolveMatrixConfig: (motionId: string, mode: string = 'active_only') =>
    request<any>(`/matrix-configs/resolve/${motionId}?mode=${mode}`),
  exportMatrixConfig: (id: string) =>
    request<any>(`/matrix-configs/export/${id}`),
  importMatrixConfig: (data: unknown, mode: string = 'create') =>
    request<any>('/matrix-configs/import', { method: 'POST', body: JSON.stringify({ data, mode }) }),
  syncDeltasForMotion: (motionId: string) =>
    request<{ action: string; config_id?: string }>(`/matrix-configs/sync-deltas/${motionId}`, { method: 'POST' }),
  syncAllDeltaMotions: () =>
    request<{ created: string[]; updated: string[]; skipped: string[] }>('/matrix-configs/sync-deltas', { method: 'POST' }),
  deduplicateConfigs: () =>
    request<{ demoted_active: number; renumbered_versions: number }>('/matrix-configs/deduplicate', { method: 'POST' }),
  ensureDraftsForAllMotions: () =>
    request<{ created: string[]; skipped: string[] }>('/matrix-configs/ensure-drafts', { method: 'POST' }),
};
