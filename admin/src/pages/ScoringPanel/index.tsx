import React, { useState, useEffect } from 'react';
import { api } from '../../api';

interface ModifierSelection {
  tableKey: string;
  rowId: string;
}

interface TraceComparison {
  base: number;
  final: number;
  delta: number;
}

interface LintIssue {
  severity: string;
  table: string;
  rowId: string;
  field: string;
  message: string;
}

export default function ScoringPanel() {
  const [motions, setMotions] = useState<Array<{ id: string; label: string }>>([]);
  const [modifierTables, setModifierTables] = useState<Record<string, Array<{ id: string; label: string }>>>({});
  const [selectedMotion, setSelectedMotion] = useState('');
  const [selectedModifiers, setSelectedModifiers] = useState<ModifierSelection[]>([]);
  const [traceResult, setTraceResult] = useState<Record<string, TraceComparison> | null>(null);
  const [resolvedDeltas, setResolvedDeltas] = useState<unknown[] | null>(null);
  const [lintResult, setLintResult] = useState<{ issues: LintIssue[]; summary: { errors: number; warnings: number; info: number } } | null>(null);
  const [activeTab, setActiveTab] = useState<'trace' | 'lint' | 'manifest'>('trace');
  const [manifest, setManifest] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const MODIFIER_TABLE_KEYS = [
    'grips', 'gripWidths', 'motionPaths', 'torsoAngles', 'torsoOrientations',
    'resistanceOrigin', 'elbowRelationship', 'executionStyles',
    'footPositions', 'stanceWidths', 'stanceTypes', 'loadPlacement',
    'supportStructures', 'loadingAids', 'rangeOfMotion',
  ];

  useEffect(() => {
    (async () => {
      const motionData = await api.getTable('motions') as Array<{ id: string; label: string }>;
      setMotions(motionData.filter((m: any) => m.is_active !== false));

      const tables: Record<string, Array<{ id: string; label: string }>> = {};
      for (const key of MODIFIER_TABLE_KEYS) {
        try {
          const data = await api.getTable(key) as Array<{ id: string; label: string }>;
          tables[key] = data.filter((r: any) => r.is_active !== false);
        } catch { /* skip missing */ }
      }
      setModifierTables(tables);
    })();
  }, []);

  const handleTrace = async () => {
    if (!selectedMotion) return;
    setLoading(true);
    try {
      const result = await api.traceScoring({
        motionId: selectedMotion,
        selectedModifiers,
      }) as any;
      setTraceResult(result.comparison);
      setResolvedDeltas(result.resolvedDeltas);
    } catch (err: any) {
      alert(err.message);
    }
    setLoading(false);
  };

  const handleLint = async () => {
    setLoading(true);
    try {
      const result = await api.runLinter();
      setLintResult(result);
    } catch (err: any) {
      alert(err.message);
    }
    setLoading(false);
  };

  const handleManifest = async () => {
    setLoading(true);
    try {
      const result = await api.getManifest();
      setManifest(result);
    } catch (err: any) {
      alert(err.message);
    }
    setLoading(false);
  };

  const toggleModifier = (tableKey: string, rowId: string) => {
    setSelectedModifiers(prev => {
      const existing = prev.findIndex(m => m.tableKey === tableKey);
      if (existing >= 0) {
        if (prev[existing].rowId === rowId) {
          return prev.filter((_, i) => i !== existing);
        }
        return prev.map((m, i) => i === existing ? { tableKey, rowId } : m);
      }
      return [...prev, { tableKey, rowId }];
    });
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>
        Scoring Engine Panel
      </h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['trace', 'lint', 'manifest'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              if (tab === 'lint') handleLint();
              if (tab === 'manifest') handleManifest();
            }}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              background: activeTab === tab ? '#FF6B35' : '#e5e5e5',
              color: activeTab === tab ? 'white' : '#333',
            }}
          >
            {tab === 'trace' ? 'Dry-Run / Trace' : tab === 'lint' ? 'QA Linter' : 'Version Manifest'}
          </button>
        ))}
      </div>

      {/* Trace Tab */}
      {activeTab === 'trace' && (
        <div>
          {/* Motion selector */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Motion:</label>
            <select
              value={selectedMotion}
              onChange={e => setSelectedMotion(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc', width: 300 }}
            >
              <option value="">Select a motion...</option>
              {motions.map(m => (
                <option key={m.id} value={m.id}>{m.label} ({m.id})</option>
              ))}
            </select>
          </div>

          {/* Modifier selectors */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Modifiers:</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
              {MODIFIER_TABLE_KEYS.map(tableKey => {
                const rows = modifierTables[tableKey] || [];
                const selected = selectedModifiers.find(m => m.tableKey === tableKey);
                return (
                  <div key={tableKey} style={{ background: '#f5f5f5', padding: 8, borderRadius: 8, fontSize: 13 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 11, textTransform: 'uppercase', color: '#666' }}>
                      {tableKey}
                    </div>
                    <select
                      value={selected?.rowId ?? ''}
                      onChange={e => {
                        if (e.target.value) {
                          toggleModifier(tableKey, e.target.value);
                        } else {
                          setSelectedModifiers(prev => prev.filter(m => m.tableKey !== tableKey));
                        }
                      }}
                      style={{ width: '100%', padding: 4, borderRadius: 4, border: '1px solid #ddd', fontSize: 12 }}
                    >
                      <option value="">— none —</option>
                      {rows.map(r => (
                        <option key={r.id} value={r.id}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleTrace}
            disabled={!selectedMotion || loading}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: 'none',
              background: '#10B981',
              color: 'white',
              fontWeight: 600,
              cursor: selectedMotion ? 'pointer' : 'not-allowed',
              opacity: !selectedMotion || loading ? 0.5 : 1,
            }}
          >
            {loading ? 'Computing...' : 'Run Trace'}
          </button>

          {/* Trace results */}
          {traceResult && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Score Comparison</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ddd' }}>
                    <th style={{ textAlign: 'left', padding: 8 }}>Muscle</th>
                    <th style={{ textAlign: 'right', padding: 8 }}>Base</th>
                    <th style={{ textAlign: 'right', padding: 8 }}>Final</th>
                    <th style={{ textAlign: 'right', padding: 8 }}>Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(traceResult)
                    .sort(([, a], [, b]) => b.final - a.final)
                    .map(([muscleId, scores]) => (
                      <tr key={muscleId} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: 8, fontFamily: 'monospace' }}>{muscleId}</td>
                        <td style={{ padding: 8, textAlign: 'right' }}>{scores.base.toFixed(3)}</td>
                        <td style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>{scores.final.toFixed(3)}</td>
                        <td style={{
                          padding: 8,
                          textAlign: 'right',
                          color: scores.delta > 0 ? '#10B981' : scores.delta < 0 ? '#EF4444' : '#999',
                          fontWeight: scores.delta !== 0 ? 600 : 400,
                        }}>
                          {scores.delta > 0 ? '+' : ''}{scores.delta.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>

              {resolvedDeltas && (resolvedDeltas as any[]).length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Resolved Deltas</h4>
                  <pre style={{
                    background: '#f5f5f5',
                    padding: 12,
                    borderRadius: 8,
                    fontSize: 11,
                    overflow: 'auto',
                    maxHeight: 300,
                  }}>
                    {JSON.stringify(resolvedDeltas, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lint Tab */}
      {activeTab === 'lint' && lintResult && (
        <div>
          <div style={{
            display: 'flex',
            gap: 16,
            marginBottom: 16,
            padding: 16,
            background: lintResult.summary.errors > 0 ? '#FEF2F2' : '#F0FDF4',
            borderRadius: 8,
          }}>
            <span style={{ fontWeight: 600, color: '#EF4444' }}>
              {lintResult.summary.errors} errors
            </span>
            <span style={{ fontWeight: 600, color: '#F59E0B' }}>
              {lintResult.summary.warnings} warnings
            </span>
            <span style={{ fontWeight: 600, color: '#6B7280' }}>
              {lintResult.summary.info} info
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ textAlign: 'left', padding: 8 }}>Severity</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Table</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Row</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Field</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Message</th>
              </tr>
            </thead>
            <tbody>
              {lintResult.issues.map((issue, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{
                    padding: 8,
                    fontWeight: 600,
                    color: issue.severity === 'error' ? '#EF4444' : issue.severity === 'warning' ? '#F59E0B' : '#6B7280',
                  }}>
                    {issue.severity.toUpperCase()}
                  </td>
                  <td style={{ padding: 8, fontFamily: 'monospace' }}>{issue.table}</td>
                  <td style={{ padding: 8, fontFamily: 'monospace' }}>{issue.rowId}</td>
                  <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 11 }}>{issue.field}</td>
                  <td style={{ padding: 8 }}>{issue.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Manifest Tab */}
      {activeTab === 'manifest' && manifest && (
        <div>
          <pre style={{
            background: '#f5f5f5',
            padding: 16,
            borderRadius: 8,
            fontSize: 12,
            overflow: 'auto',
            maxHeight: 600,
          }}>
            {JSON.stringify(manifest, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
