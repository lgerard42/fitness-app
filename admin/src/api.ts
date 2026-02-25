/**
 * API client for the admin backend.
 */
const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Schema ──────────────────────────────────────────────────────

export interface TableField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'string[]' | 'json' | 'fk' | 'fk[]';
  required?: boolean;
  refTable?: string;
  refLabelField?: string;
  jsonShape?: string;
  defaultValue?: unknown;
  /** Optional display label (defaults to field name) */
  label?: string;
}

export interface TableSchema {
  key: string;
  file: string;
  label: string;
  group: string;
  idField: string;
  labelField: string;
  fields: TableField[];
  sortField?: string;
  isKeyValueMap?: boolean;
  /** Human-readable description (purpose, dependencies, dependents) for the table view. */
  description?: string;
}

export interface SchemaResponse {
  groups: string[];
  tables: TableSchema[];
}

export interface TableInfo {
  key: string;
  label: string;
  group: string;
  file: string;
  rowCount: number;
  lastModified: string | null;
  /** If set, show this table indented under the parent in the sidebar */
  parentTableKey?: string;
}

export interface FKRef {
  table: string;
  field: string;
  rowId: string;
  rowLabel: string;
}

export interface RelationshipEdge {
  from: string;
  to: string;
  field: string;
  type: 'fk' | 'fk[]';
}

export interface RelationshipNode {
  key: string;
  label: string;
  group: string;
  rowCount: number;
}

export interface RelationshipGraphData {
  nodes: RelationshipNode[];
  edges: RelationshipEdge[];
}

export const api = {
  // Schema
  getSchemas: () => request<SchemaResponse>('/schema'),
  getSchema: (key: string) => request<TableSchema>(`/schema/${key}`),
  getRelationships: () => request<RelationshipGraphData>('/schema/meta/relationships'),
  getFKRefs: (key: string, id: string) => request<{ refs: FKRef[] }>(`/schema/meta/fk-refs/${key}/${id}`),

  // Tables
  listTables: () => request<TableInfo[]>('/tables'),
  getTable: (key: string) => request<unknown[]>(`/tables/${key}`),
  putTable: (key: string, data: unknown[]) => request<{ ok: boolean }>(`/tables/${key}`, { method: 'PUT', body: JSON.stringify(data) }),
  addRow: (key: string, row: Record<string, unknown>, opts?: { skipSync?: boolean }) => {
    const qs = opts?.skipSync ? '?skipSync=true' : '';
    return request<{ ok: boolean; row: Record<string, unknown> }>(`/tables/${key}/rows${qs}`, { method: 'POST', body: JSON.stringify(row) });
  },
  updateRow: (key: string, id: string, row: Record<string, unknown>, opts?: { skipSync?: boolean }) => {
    const qs = opts?.skipSync ? '?skipSync=true' : '';
    return request<{ ok: boolean; row: Record<string, unknown> }>(`/tables/${key}/rows/${encodeURIComponent(id)}${qs}`, { method: 'PUT', body: JSON.stringify(row) });
  },
  deleteRow: (key: string, id: string, opts?: { breakLinks?: boolean; reassignTo?: string; skipSync?: boolean }) => {
    const params = new URLSearchParams();
    if (opts?.breakLinks) params.set('breakLinks', 'true');
    if (opts?.reassignTo) params.set('reassignTo', opts.reassignTo);
    if (opts?.skipSync) params.set('skipSync', 'true');
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<{ ok: boolean }>(`/tables/${key}/rows/${encodeURIComponent(id)}${qs}`, { method: 'DELETE' });
  },
  syncTable: (key: string) => request<{ ok: boolean }>(`/tables/${key}/sync`, { method: 'POST' }),
  reorder: (key: string, ids: string[]) => request<{ ok: boolean }>(`/tables/${key}/reorder`, { method: 'POST', body: JSON.stringify({ ids }) }),

  // Validate
  validate: (key: string, row: Record<string, unknown>) => request<{ valid: boolean; errors?: string[] }>(`/schema/${key}/validate`, { method: 'POST', body: JSON.stringify(row) }),

  // Filter matrix
  bulkUpdateMatrix: (sourceTable: string, updates: Record<string, Record<string, unknown>>) =>
    request<{ ok: boolean }>('/tables/bulk-matrix', {
      method: 'POST',
      body: JSON.stringify({ sourceTable, updates }),
    }),

  // Scoring engine
  computeScoring: (body: {
    motionId: string;
    selectedModifiers: { tableKey: string; rowId: string }[];
    policy?: Record<string, unknown>;
  }) =>
    request<Record<string, unknown>>('/scoring/compute', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  traceScoring: (body: {
    motionId: string;
    selectedModifiers?: { tableKey: string; rowId: string }[];
  }) =>
    request<Record<string, unknown>>('/scoring/trace', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  evaluateConstraints: (body: { motionId: string; equipmentId?: string }) =>
    request<Record<string, unknown>>('/scoring/constraints', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  runLinter: () =>
    request<{
      issues: Array<{
        severity: string;
        table: string;
        rowId: string;
        field: string;
        message: string;
      }>;
      summary: { errors: number; warnings: number; info: number };
      formatted: string;
    }>('/scoring/lint'),

  getManifest: () => request<Record<string, unknown>>('/scoring/manifest'),

  // Matrix V2 Configs
  listMatrixConfigs: (params?: { scope_type?: string; scope_id?: string; status?: string }) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString() : '';
    return request<any[]>(`/matrix-configs${qs}`);
  },
  createMatrixConfig: (data: { scope_type: string; scope_id: string; config_json: unknown; notes?: string }) =>
    request<{ config: any; validation: any }>('/matrix-configs', { method: 'POST', body: JSON.stringify(data) }),
  getMatrixConfig: (id: string) => request<any>(`/matrix-configs/${id}`),
  updateMatrixConfig: (id: string, data: { config_json?: unknown; notes?: string }) =>
    request<any>(`/matrix-configs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMatrixConfig: (id: string) =>
    request<{ ok: boolean }>(`/matrix-configs/${id}`, { method: 'DELETE' }),
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
};
