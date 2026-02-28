import { request } from './client';
import type { TableInfo } from './client';

export const tableApi = {
  listTables: () => request<TableInfo[]>('/tables'),
  getTable: (key: string) => request<unknown[]>(`/tables/${key}`),
  getTableIds: (key: string) =>
    request<{ ids: string[] }>(`/tables/${key}?ids=true`).then(res => res.ids),
  putTable: (key: string, data: unknown[]) =>
    request<{ ok: boolean }>(`/tables/${key}`, { method: 'PUT', body: JSON.stringify(data) }),
  addRow: (key: string, row: Record<string, unknown>, opts?: { skipSync?: boolean }) => {
    const qs = opts?.skipSync ? '?skipSync=true' : '';
    return request<{ ok: boolean; row: Record<string, unknown> }>(`/tables/${key}/rows${qs}`, { method: 'POST', body: JSON.stringify(row) });
  },
  updateRow: (key: string, id: string, row: Record<string, unknown>, opts?: { skipSync?: boolean }) => {
    const qs = opts?.skipSync ? '?skipSync=true' : '';
    return request<{ ok: boolean; row: Record<string, unknown> }>(`/tables/${key}/rows/${encodeURIComponent(id)}${qs}`, { method: 'PUT', body: JSON.stringify(row) });
  },
  deleteRow: (key: string, id: string, opts?: { breakLinks?: boolean; reassignTo?: string; skipSync?: boolean; hard?: boolean }) => {
    const params = new URLSearchParams();
    if (opts?.breakLinks) params.set('breakLinks', 'true');
    if (opts?.reassignTo) params.set('reassignTo', opts.reassignTo);
    if (opts?.skipSync) params.set('skipSync', 'true');
    if (opts?.hard) params.set('hard', 'true');
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<{ ok: boolean }>(`/tables/${key}/rows/${encodeURIComponent(id)}${qs}`, { method: 'DELETE' });
  },
  syncTable: (key: string) => request<{ ok: boolean }>(`/tables/${key}/sync`, { method: 'POST' }),
  reorder: (key: string, ids: string[]) =>
    request<{ ok: boolean }>(`/tables/${key}/reorder`, { method: 'POST', body: JSON.stringify({ ids }) }),
  bulkUpdateMatrix: (sourceTable: string, updates: Record<string, Record<string, unknown>>) =>
    request<{ ok: boolean }>('/tables/bulk-matrix', {
      method: 'POST',
      body: JSON.stringify({ sourceTable, updates }),
    }),
};
