/**
 * Shared API client: base URL, generic request helper, and shared types.
 */
export const BASE = '/api';

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
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
