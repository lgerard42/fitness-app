import { request } from './client';

export const scoringApi = {
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

  syncDefaults: (motionId: string) =>
    request<{ motionId: string; synced: Record<string, string> }>('/scoring/sync-defaults', {
      method: 'POST',
      body: JSON.stringify({ motionId }),
    }),
};
