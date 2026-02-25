import React, { useState, useMemo, useEffect } from 'react';
import { api } from '../../api';
import type { DeltaRules, ModifierRow, Motion } from '../../../../shared/types';
import { resolveSingleDelta } from '../../../../shared/scoring/resolveDeltas';

interface MuscleRecord {
  id: string;
  label: string;
  parent_ids?: string[];
}

interface DeltaBranchCardProps {
  tableKey: string;
  tableLabel: string;
  rowId: string;
  rowLabel: string;
  motionId: string;
  motionLabel: string;
  parentMotionId: string | null;
  modifierRow: ModifierRow;
  motionsMap: Record<string, Motion>;
  modifierTableData: Record<string, ModifierRow>;
  dirty: boolean;
  localOverride: Record<string, number> | 'inherit' | undefined;
  onDeltaChange: (tableKey: string, rowId: string, value: Record<string, number> | 'inherit') => void;
  onSave: (tableKey: string, rowId: string) => Promise<boolean>;
}

function getMuscleLabel(allMuscles: MuscleRecord[], id: string): string {
  return allMuscles.find(m => m.id === id)?.label || id;
}

function getMuscleLevel(id: string, allMuscles: MuscleRecord[]): 'primary' | 'secondary' | 'tertiary' {
  const m = allMuscles.find(mu => mu.id === id);
  if (!m || !m.parent_ids || m.parent_ids.length === 0) return 'primary';
  const parent = allMuscles.find(mu => mu.id === m.parent_ids![0]);
  if (!parent || !parent.parent_ids || parent.parent_ids.length === 0) return 'secondary';
  return 'tertiary';
}

export default function DeltaBranchCard({
  tableKey,
  tableLabel,
  rowId,
  rowLabel,
  motionId,
  motionLabel,
  parentMotionId,
  modifierRow,
  motionsMap,
  modifierTableData,
  dirty,
  localOverride,
  onDeltaChange,
  onSave,
}: DeltaBranchCardProps) {
  const [allMuscles, setAllMuscles] = useState<MuscleRecord[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    api.getTable('muscles').then((data) => {
      setAllMuscles((data as MuscleRecord[]) || []);
    }).catch(console.error);
  }, []);

  const deltaRules: DeltaRules = modifierRow.delta_rules || {};
  const currentEntry = localOverride !== undefined ? localOverride : deltaRules[motionId];
  const isInheritMode = currentEntry === 'inherit' || currentEntry === undefined;
  const isChildMotion = !!parentMotionId;

  // Resolve what the parent's delta looks like (for inherit display)
  const parentDelta = useMemo(() => {
    if (!parentMotionId) return null;
    const resolved = resolveSingleDelta(
      parentMotionId,
      modifierRow,
      motionsMap,
      modifierTableData,
      tableKey,
    );
    return resolved?.deltas || null;
  }, [parentMotionId, modifierRow, motionsMap, modifierTableData, tableKey]);

  const effectiveDeltas: Record<string, number> = useMemo(() => {
    if (isInheritMode) {
      return parentDelta || {};
    }
    if (typeof currentEntry === 'object' && currentEntry !== null) {
      return currentEntry as Record<string, number>;
    }
    return {};
  }, [isInheritMode, currentEntry, parentDelta]);

  const resolvedSource = useMemo(() => {
    const resolved = resolveSingleDelta(
      motionId,
      modifierRow,
      motionsMap,
      modifierTableData,
      tableKey,
    );
    if (!resolved) return null;
    if (resolved.inherited && resolved.inheritChain && resolved.inheritChain.length > 0) {
      const parentLabel = motionsMap[resolved.inheritChain[resolved.inheritChain.length - 1]]?.label
        || resolved.inheritChain[resolved.inheritChain.length - 1];
      return { type: 'inherited' as const, fromLabel: parentLabel };
    }
    return { type: 'custom' as const, fromLabel: motionLabel };
  }, [motionId, modifierRow, motionsMap, modifierTableData, tableKey, motionLabel]);

  const handleToggleInherit = () => {
    if (isInheritMode) {
      // Switch to custom: clone parent delta as starting point
      const clonedDelta = parentDelta ? { ...parentDelta } : {};
      onDeltaChange(tableKey, rowId, clonedDelta);
    } else {
      if (!confirm('Switch to inherit? Your custom override will be preserved in local state until you navigate away.')) return;
      onDeltaChange(tableKey, rowId, 'inherit');
    }
  };

  const handleScoreChange = (muscleId: string, value: number) => {
    const current = typeof currentEntry === 'object' && currentEntry !== null ? { ...currentEntry as Record<string, number> } : {};
    current[muscleId] = value;
    onDeltaChange(tableKey, rowId, current);
  };

  const handleRemoveMuscle = (muscleId: string) => {
    const current = typeof currentEntry === 'object' && currentEntry !== null ? { ...currentEntry as Record<string, number> } : {};
    delete current[muscleId];
    onDeltaChange(tableKey, rowId, current);
  };

  const handleAddMuscle = (muscleId: string) => {
    const current = typeof currentEntry === 'object' && currentEntry !== null ? { ...currentEntry as Record<string, number> } : {};
    current[muscleId] = 0;
    onDeltaChange(tableKey, rowId, current);
  };

  const hasDeltas = Object.keys(effectiveDeltas).length > 0;

  return (
    <div className="border border-gray-200 rounded bg-white text-[10px]">
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-gray-400">{expanded ? '▼' : '▶'}</span>
        <span className="font-medium text-gray-800">{rowLabel}</span>

        {/* Source chip */}
        {resolvedSource && (
          <span className={`px-1.5 py-0.5 rounded border text-[9px] ${
            resolvedSource.type === 'inherited'
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
            {resolvedSource.type === 'inherited'
              ? `Inherited from ${resolvedSource.fromLabel}`
              : `Custom for ${resolvedSource.fromLabel}`
            }
          </span>
        )}

        {dirty && (
          <span className="px-1 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-medium text-[9px]">
            unsaved
          </span>
        )}

        {hasDeltas && (
          <span className="text-gray-400 ml-auto">
            {Object.keys(effectiveDeltas).length} muscles
          </span>
        )}
      </div>

      {expanded && (
        <div className="border-t border-gray-200 px-2 py-2 space-y-1.5">
          {/* Inherit toggle for child motions */}
          {isChildMotion && (
            <div className="flex items-center gap-2 pb-1.5 border-b border-gray-100">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInheritMode}
                  onChange={handleToggleInherit}
                  className="rounded border-gray-300 w-3 h-3"
                />
                <span className="text-gray-600">Inherit from parent</span>
              </label>
            </div>
          )}

          {/* Delta scores */}
          {isInheritMode ? (
            // Read-only view of inherited deltas
            <div className="space-y-0.5">
              {Object.keys(effectiveDeltas).length === 0 ? (
                <div className="text-gray-400 italic py-1">No deltas (home base)</div>
              ) : (
                Object.entries(effectiveDeltas)
                  .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
                  .map(([muscleId, delta]) => (
                    <div key={muscleId} className="flex items-center gap-1.5 py-0.5 text-gray-500">
                      <span className="flex-1 truncate">{getMuscleLabel(allMuscles, muscleId)}</span>
                      <span className={`font-mono ${delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : ''}`}>
                        {delta > 0 ? '+' : ''}{delta}
                      </span>
                    </div>
                  ))
              )}
              {isInheritMode && <div className="text-[9px] text-amber-600 italic mt-1">Read-only (inherited)</div>}
            </div>
          ) : (
            // Editable delta scores
            <div className="space-y-0.5">
              {Object.entries(effectiveDeltas)
                .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
                .map(([muscleId, delta]) => (
                  <div key={muscleId} className="flex items-center gap-1.5 py-0.5">
                    <span className="flex-1 truncate text-gray-700">{getMuscleLabel(allMuscles, muscleId)}</span>
                    <input
                      type="number"
                      value={delta}
                      onChange={(e) => handleScoreChange(muscleId, parseFloat(e.target.value) || 0)}
                      step="0.05"
                      className="w-16 px-1 py-0.5 border border-gray-300 rounded text-right font-mono text-[10px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      onClick={() => handleRemoveMuscle(muscleId)}
                      className="text-red-400 hover:text-red-600"
                    >
                      x
                    </button>
                  </div>
                ))}
              {Object.keys(effectiveDeltas).length === 0 && (
                <div className="text-gray-400 italic py-1">No deltas (home base)</div>
              )}
              <select
                onChange={(e) => { if (e.target.value) handleAddMuscle(e.target.value); e.target.value = ''; }}
                className="w-full border border-gray-300 rounded px-1 py-0.5 text-gray-600 bg-white mt-1"
                defaultValue=""
              >
                <option value="">+ Add muscle...</option>
                {allMuscles
                  .filter(m => !(m.id in effectiveDeltas))
                  .map(m => (
                    <option key={m.id} value={m.id}>
                      {m.label} ({getMuscleLevel(m.id, allMuscles)})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Save button */}
          {!isInheritMode && (
            <div className="pt-1.5 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => onSave(tableKey, rowId)}
                disabled={!dirty}
                className="text-[10px] bg-blue-600 text-white rounded px-2 py-0.5 hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                Save Delta Branch
              </button>
            </div>
          )}
          {isInheritMode && dirty && (
            <div className="pt-1.5 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => onSave(tableKey, rowId)}
                className="text-[10px] bg-blue-600 text-white rounded px-2 py-0.5 hover:bg-blue-700 font-medium"
              >
                Save (set inherit)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
