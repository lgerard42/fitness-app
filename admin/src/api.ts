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
}

export interface FKRef {
  table: string;
  field: string;
  rowId: string;
  rowLabel: string;
}

export const api = {
  // Schema
  getSchemas: () => request<SchemaResponse>('/schema'),
  getSchema: (key: string) => request<TableSchema>(`/schema/${key}`),
  getRelationships: () => request<{ edges: Array<{ from: string; to: string; field: string; type: string }> }>('/schema/meta/relationships'),
  getFKRefs: (key: string, id: string) => request<{ refs: FKRef[] }>(`/schema/meta/fk-refs/${key}/${id}`),

  // Tables
  listTables: () => request<TableInfo[]>('/tables'),
  getTable: (key: string) => request<unknown[]>(`/tables/${key}`),
  putTable: (key: string, data: unknown[]) => request<{ ok: boolean }>(`/tables/${key}`, { method: 'PUT', body: JSON.stringify(data) }),
  addRow: (key: string, row: Record<string, unknown>) => request<{ ok: boolean; row: Record<string, unknown> }>(`/tables/${key}/rows`, { method: 'POST', body: JSON.stringify(row) }),
  updateRow: (key: string, id: string, row: Record<string, unknown>) => request<{ ok: boolean; row: Record<string, unknown> }>(`/tables/${key}/rows/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(row) }),
  deleteRow: (key: string, id: string) => request<{ ok: boolean }>(`/tables/${key}/rows/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  reorder: (key: string, ids: string[]) => request<{ ok: boolean }>(`/tables/${key}/reorder`, { method: 'POST', body: JSON.stringify({ ids }) }),

  // Validate
  validate: (key: string, row: Record<string, unknown>) => request<{ valid: boolean; errors?: string[] }>(`/schema/${key}/validate`, { method: 'POST', body: JSON.stringify(row) }),
};
