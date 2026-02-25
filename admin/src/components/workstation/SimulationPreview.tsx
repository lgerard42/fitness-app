import React, { useState, useMemo } from 'react';
import type { SimulationResult } from '../../hooks/useScoringSimulation';
import type { FlatMuscleScores, ResolvedDelta } from '../../../../shared/types';
import type { MatrixConfigJson } from '../../../../shared/types/matrixV2';
import { evaluateRealism } from '../../../../shared/policy/realismAdvisory';
import { MODIFIER_SEMANTICS, COACHING_CUE_EXAMPLES, ROM_QUALITY_LABELS } from '../../../../shared/semantics/dictionary';
import type { RomQuality } from '../../../../shared/semantics/dictionary';

interface SimulationPreviewProps {
  simulation: SimulationResult;
  editingConfig: MatrixConfigJson | null;
  modifierRowLabels: Record<string, Record<string, string>>;
  muscleLabels: Record<string, string>;
  simMode: 'defaults' | 'custom';
  onSimModeChange: (mode: 'defaults' | 'custom') => void;
  customCombo: Array<{ tableKey: string; rowId: string }>;
  onCustomComboChange: (combo: Array<{ tableKey: string; rowId: string }>) => void;
  allowedRowsByTable: Record<string, Array<{ id: string; label: string }>>;
}

const TABLE_LABELS: Record<string, string> = {
  motionPaths: 'Motion Paths',
  torsoAngles: 'Torso Angles',
  torsoOrientations: 'Torso Orientations',
  resistanceOrigin: 'Resistance Origin',
  grips: 'Grips',
  gripWidths: 'Grip Widths',
  elbowRelationship: 'Elbow Relationship',
  executionStyles: 'Execution Styles',
  footPositions: 'Foot Positions',
  stanceWidths: 'Stance Widths',
  stanceTypes: 'Stance Types',
  loadPlacement: 'Load Placement',
  supportStructures: 'Support Structures',
  loadingAids: 'Loading Aids',
  rangeOfMotion: 'Range of Motion',
};

function DeltaBar({ value, maxAbs }: { value: number; maxAbs: number }) {
  const pct = maxAbs > 0 ? Math.min(Math.abs(value) / maxAbs, 1) * 100 : 0;
  const color = value > 0 ? 'bg-green-500' : value < 0 ? 'bg-red-500' : 'bg-gray-300';
  return (
    <div className="w-16 h-2 bg-gray-100 rounded overflow-hidden relative">
      <div
        className={`absolute top-0 h-full rounded ${color}`}
        style={{
          width: `${pct}%`,
          left: value >= 0 ? '50%' : `${50 - pct}%`,
        }}
      />
      <div className="absolute top-0 left-1/2 w-px h-full bg-gray-300" />
    </div>
  );
}

export default function SimulationPreview({
  simulation,
  editingConfig,
  modifierRowLabels,
  muscleLabels,
  simMode,
  onSimModeChange,
  customCombo,
  onCustomComboChange,
  allowedRowsByTable,
}: SimulationPreviewProps) {
  const { activation, resolvedDeltas, deltaSum, top3Impact, provenanceChips } = simulation;
  const [showAllMuscles, setShowAllMuscles] = useState(false);

  const maxAbsDelta = useMemo(() => {
    if (!deltaSum) return 1;
    const values = Object.values(deltaSum).map(Math.abs);
    return values.length > 0 ? Math.max(...values) : 1;
  }, [deltaSum]);

  const sortedMuscles = useMemo(() => {
    if (!activation) return [];
    const allKeys = new Set([
      ...Object.keys(activation.baseScores),
      ...Object.keys(activation.finalScores),
    ]);
    return Array.from(allKeys)
      .map(muscleId => ({
        muscleId,
        base: activation.baseScores[muscleId] ?? 0,
        final: activation.finalScores[muscleId] ?? 0,
        delta: (deltaSum[muscleId] ?? 0),
      }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }, [activation, deltaSum]);

  const displayedMuscles = showAllMuscles ? sortedMuscles : sortedMuscles.filter(m => m.delta !== 0);

  const applicableTables = useMemo(() => {
    if (!editingConfig?.tables) return [];
    return Object.entries(editingConfig.tables)
      .filter(([_, tc]) => tc && tc.applicability)
      .map(([key]) => key);
  }, [editingConfig]);

  const handleComboChange = (tableKey: string, rowId: string) => {
    const existing = customCombo.filter(c => c.tableKey !== tableKey);
    if (rowId) {
      existing.push({ tableKey, rowId });
    }
    onCustomComboChange(existing);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-200 bg-white">
        <h4 className="text-xs font-bold text-gray-900 mb-1.5">Scoring Simulation</h4>
        <div className="flex gap-1">
          <button
            onClick={() => onSimModeChange('defaults')}
            className={`text-[10px] px-2 py-0.5 rounded border font-medium ${
              simMode === 'defaults'
                ? 'bg-purple-100 border-purple-300 text-purple-800'
                : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}
          >
            Simulate Defaults
          </button>
          <button
            onClick={() => onSimModeChange('custom')}
            className={`text-[10px] px-2 py-0.5 rounded border font-medium ${
              simMode === 'custom'
                ? 'bg-purple-100 border-purple-300 text-purple-800'
                : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}
          >
            Custom Test Combo
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Custom combo selector */}
        {simMode === 'custom' && (
          <div className="space-y-1.5 p-2 border border-purple-200 rounded bg-purple-50">
            <div className="text-[10px] font-medium text-purple-800 mb-1">Select Modifiers</div>
            {applicableTables.map(tableKey => {
              const rows = allowedRowsByTable[tableKey] || [];
              const selected = customCombo.find(c => c.tableKey === tableKey)?.rowId || '';
              return (
                <div key={tableKey} className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-600 w-24 truncate" title={TABLE_LABELS[tableKey] || tableKey}>
                    {TABLE_LABELS[tableKey] || tableKey}
                  </span>
                  <select
                    value={selected}
                    onChange={(e) => handleComboChange(tableKey, e.target.value)}
                    className="text-[10px] border border-gray-300 rounded px-1 py-0.5 flex-1"
                  >
                    <option value="">-- none --</option>
                    {rows.map(r => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        )}

        {/* Top-3 Impact */}
        {top3Impact.length > 0 && (
          <div className="p-2 border border-gray-200 rounded bg-white">
            <div className="text-[10px] font-bold text-gray-700 mb-1.5">Top 3 Impact</div>
            <div className="space-y-1">
              {top3Impact.map(({ muscleId, delta }) => (
                <div key={muscleId} className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-medium ${delta > 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {delta > 0 ? '▲' : '▼'}
                  </span>
                  <span className="text-[10px] text-gray-800 flex-1 truncate">
                    {muscleLabels[muscleId] || muscleId}
                  </span>
                  <span className={`text-[10px] font-mono font-medium ${delta > 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {delta > 0 ? '+' : ''}{delta.toFixed(2)}
                  </span>
                  <DeltaBar value={delta} maxAbs={maxAbsDelta} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Baseline vs Effective */}
        {activation && (
          <div className="border border-gray-200 rounded bg-white">
            <div className="flex items-center gap-2 px-2 py-1.5 border-b border-gray-200 bg-gray-50">
              <span className="text-[10px] font-bold text-gray-700 flex-1">Baseline vs Effective</span>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAllMuscles}
                  onChange={(e) => setShowAllMuscles(e.target.checked)}
                  className="rounded border-gray-300 w-3 h-3"
                />
                <span className="text-[10px] text-gray-500">Show all</span>
              </label>
            </div>
            <div className="max-h-[240px] overflow-y-auto">
              <table className="w-full text-[10px]">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-2 py-1 text-gray-600 font-medium">Muscle</th>
                    <th className="text-right px-1 py-1 text-gray-600 font-medium w-12">Base</th>
                    <th className="text-right px-1 py-1 text-gray-600 font-medium w-12">Delta</th>
                    <th className="text-right px-1 py-1 text-gray-600 font-medium w-12">Final</th>
                    <th className="px-1 py-1 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {displayedMuscles.map(({ muscleId, base, final, delta }) => (
                    <tr key={muscleId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-2 py-0.5 text-gray-800 truncate max-w-[100px]" title={muscleLabels[muscleId] || muscleId}>
                        {muscleLabels[muscleId] || muscleId}
                      </td>
                      <td className="text-right px-1 py-0.5 text-gray-500 font-mono">{base.toFixed(2)}</td>
                      <td className={`text-right px-1 py-0.5 font-mono font-medium ${
                        delta > 0 ? 'text-green-700' : delta < 0 ? 'text-red-700' : 'text-gray-400'
                      }`}>
                        {delta !== 0 ? (delta > 0 ? '+' : '') + delta.toFixed(2) : '--'}
                      </td>
                      <td className="text-right px-1 py-0.5 text-gray-900 font-mono font-medium">{final.toFixed(2)}</td>
                      <td className="px-1 py-0.5"><DeltaBar value={delta} maxAbs={maxAbsDelta} /></td>
                    </tr>
                  ))}
                  {displayedMuscles.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-2 text-gray-400 italic">
                        {sortedMuscles.length > 0 ? 'No deltas applied' : 'No muscle data'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Delta Provenance */}
        {resolvedDeltas.length > 0 && (
          <div className="p-2 border border-gray-200 rounded bg-white">
            <div className="text-[10px] font-bold text-gray-700 mb-1.5">Delta Sources</div>
            <div className="space-y-1">
              {resolvedDeltas.map((rd, i) => (
                <div key={i} className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700">
                    {TABLE_LABELS[rd.modifierTable] || rd.modifierTable}
                  </span>
                  <span className="text-[10px] text-gray-500">.</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-700">
                    {modifierRowLabels[rd.modifierTable]?.[rd.modifierId] || rd.modifierId}
                  </span>
                  {rd.inherited && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 italic">
                      inherited{rd.inheritChain ? ` via ${rd.inheritChain.join(' → ')}` : ''}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Realism Advisory */}
        {activation && (() => {
          const advisory = evaluateRealism(activation);
          const colorMap = {
            green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', dot: 'bg-green-500' },
            yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', dot: 'bg-yellow-500' },
            red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', dot: 'bg-red-500' },
          };
          const colors = colorMap[advisory.level];
          return (
            <div className={`p-2 border ${colors.border} rounded ${colors.bg}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                <span className={`text-[10px] font-bold ${colors.text}`}>Realism Advisory</span>
              </div>
              <div className="space-y-0.5">
                {advisory.reasons.map((reason, i) => (
                  <div key={i} className={`text-[9px] ${colors.text}`}>{reason}</div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Coaching Cues (stub) */}
        {resolvedDeltas.length > 0 && (() => {
          const cues: string[] = [];
          for (const rd of resolvedDeltas) {
            const tableCues = COACHING_CUE_EXAMPLES[rd.modifierTable];
            if (tableCues?.[rd.modifierId]) {
              cues.push(...tableCues[rd.modifierId]);
            }
          }
          return (
            <details className="border border-gray-200 rounded bg-white group">
              <summary className="px-2 py-1.5 text-[10px] font-bold text-gray-700 cursor-pointer hover:bg-gray-50">
                Coaching Cues
              </summary>
              <div className="px-2 pb-2 space-y-0.5">
                {cues.length > 0 ? (
                  cues.map((cue, i) => (
                    <div key={i} className="text-[10px] text-gray-600 pl-2 border-l-2 border-blue-200">{cue}</div>
                  ))
                ) : (
                  <div className="text-[10px] text-gray-400 italic">No coaching cues available for current modifiers</div>
                )}
              </div>
            </details>
          );
        })()}

        {/* ROM Summary */}
        {resolvedDeltas.length > 0 && (() => {
          const romQualities: Array<{ table: string; quality: RomQuality }> = [];
          for (const rd of resolvedDeltas) {
            const sem = MODIFIER_SEMANTICS[rd.modifierTable];
            if (sem?.romDescriptor) {
              romQualities.push({ table: TABLE_LABELS[rd.modifierTable] || rd.modifierTable, quality: sem.romDescriptor });
            }
          }
          if (romQualities.length === 0) return null;
          return (
            <details className="border border-gray-200 rounded bg-white group">
              <summary className="px-2 py-1.5 text-[10px] font-bold text-gray-700 cursor-pointer hover:bg-gray-50">
                Joint-Action &amp; ROM Summary
              </summary>
              <div className="px-2 pb-2 space-y-0.5">
                {romQualities.map((rq, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-gray-600">{rq.table}:</span>
                    <span className={`px-1 py-0.5 rounded text-[9px] font-medium ${
                      rq.quality === 'full' ? 'bg-green-100 text-green-700' :
                      rq.quality === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {ROM_QUALITY_LABELS[rq.quality]}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          );
        })()}

        {/* Provenance chips */}
        {provenanceChips.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {provenanceChips.map((chip, i) => (
              <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                {chip}
              </span>
            ))}
          </div>
        )}

        {!activation && (
          <div className="text-center text-xs text-gray-400 py-4">
            Select a motion and configure modifier defaults to see simulation
          </div>
        )}
      </div>
    </div>
  );
}
