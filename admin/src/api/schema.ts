import { request } from './client';
import type { SchemaResponse, TableSchema, RelationshipGraphData, FKRef } from './client';

export const schemaApi = {
  getSchemas: () => request<SchemaResponse>('/schema'),
  getSchema: (key: string) => request<TableSchema>(`/schema/${key}`),
  getRelationships: () => request<RelationshipGraphData>('/schema/meta/relationships'),
  getFKRefs: (key: string, id: string) =>
    request<{ refs: FKRef[] }>(`/schema/meta/fk-refs/${key}/${id}`),
  validate: (key: string, row: Record<string, unknown>) =>
    request<{ valid: boolean; errors?: string[] }>(`/schema/${key}/validate`, { method: 'POST', body: JSON.stringify(row) }),
};
