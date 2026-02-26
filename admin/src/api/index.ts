export type {
  TableField,
  TableSchema,
  SchemaResponse,
  TableInfo,
  FKRef,
  RelationshipEdge,
  RelationshipNode,
  RelationshipGraphData,
} from './client';

export { request, BASE } from './client';
export { schemaApi } from './schema';
export { tableApi } from './tables';
export { scoringApi } from './scoring';
export { matrixConfigsApi } from './matrixConfigs';

import { schemaApi } from './schema';
import { tableApi } from './tables';
import { scoringApi } from './scoring';
import { matrixConfigsApi } from './matrixConfigs';

/** Unified API object preserving the original `api.*` call surface. */
export const api = {
  ...schemaApi,
  ...tableApi,
  ...scoringApi,
  ...matrixConfigsApi,
} as const;
