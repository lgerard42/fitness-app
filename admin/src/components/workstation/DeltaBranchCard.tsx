import React, { useState, useMemo, useEffect } from 'react';
import { api } from '../../api';
import type { DeltaRules, ModifierRow, Motion } from '../../../../shared/types';
import { resolveSingleDelta } from '../../../../shared/scoring/resolveDeltas';
import { filterScorableOnly, isMuscleScorable, getScorableMuscles } from '../../utils/muscleScorable';
import { buildPrimaryMuscleDropdownGroups, buildSecondaryMuscleDropdownGroups } from '../../utils/muscleDropdownGroups';
import MuscleSecondarySelect from '../FieldRenderers/MuscleSecondarySelect';

interface MuscleRecord {
  id: string;
  label: string;
  parent_ids?: string[];
  is_scorable?: boolean;
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
  inlineAssignment?: React.ReactNode;
}

function getMuscleLabel(allMuscles: MuscleRecord[], id: string): string {
  return allMuscles.find(m => m.id === id)?.label || id;
}

function findPrimaryFor(id: string, allMuscles: MuscleRecord[]): string {
  const m = allMuscles.find(mu => mu.id === id);
  if (!m || !m.parent_ids || m.parent_ids.length === 0) return id;
  return findPrimaryFor(m.parent_ids[0], allMuscles);
}

function findSecondaryFor(id: string, allMuscles: MuscleRecord[]): string | null {
  const m = allMuscles.find(mu => mu.id === id);
  if (!m || !m.parent_ids || m.parent_ids.length === 0) return null;
  const parent = allMuscles.find(mu => mu.id === m.parent_ids![0]);
  if (!parent || !parent.parent_ids || parent.parent_ids.length === 0) return null;
  return m.parent_ids[0];
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
  inlineAssignment,
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
  const isChildMotion = !!parentMotionId;
  const isInheritMode = isChildMotion
    ? (currentEntry === 'inherit' || currentEntry === undefined)
    : false;

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

  const resolvedSourceChip = useMemo(() => {
    if (!isChildMotion && (currentEntry === undefined || currentEntry === 'inherit')) {
      return { type: 'custom' as const, fromLabel: motionLabel };
    }
    return null;
  }, [isChildMotion, currentEntry, motionLabel]);

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
    if (!isMuscleScorable(allMuscles, muscleId)) return;
    const current = typeof currentEntry === 'object' && currentEntry !== null ? { ...currentEntry as Record<string, number> } : {};
    current[muscleId] = value;
    onDeltaChange(tableKey, rowId, filterScorableOnly(current, allMuscles));
  };

  const handleRemoveMuscle = (muscleId: string) => {
    const current = typeof currentEntry === 'object' && currentEntry !== null ? { ...currentEntry as Record<string, number> } : {};
    delete current[muscleId];
    const children = allMuscles.filter(m => m.parent_ids && m.parent_ids.includes(muscleId));
    for (const c of children) {
      delete current[c.id];
      const grandchildren = allMuscles.filter(m => m.parent_ids && m.parent_ids.includes(c.id));
      for (const gc of grandchildren) delete current[gc.id];
    }
    onDeltaChange(tableKey, rowId, filterScorableOnly(current, allMuscles));
  };

  const handleAddMuscle = (muscleId: string) => {
    if (!isMuscleScorable(allMuscles, muscleId)) return;
    const current = typeof currentEntry === 'object' && currentEntry !== null ? { ...currentEntry as Record<string, number> } : {};
    current[muscleId] = 0;
    onDeltaChange(tableKey, rowId, filterScorableOnly(current, allMuscles));
  };

  /** Add a muscle and its full path (ancestors) with score 0 when selecting from grouped dropdowns. */
  const handleAddMuscleByPath = (muscleId: string) => {
    const primary = findPrimaryFor(muscleId, allMuscles);
    const secondary = findSecondaryFor(muscleId, allMuscles);
    const current = typeof currentEntry === 'object' && currentEntry !== null ? { ...currentEntry as Record<string, number> } : {};
    const toAdd: string[] = [primary];
    if (secondary != null) toAdd.push(secondary);
    if (muscleId !== primary && muscleId !== secondary) toAdd.push(muscleId);
    for (const id of toAdd) {
      if (isMuscleScorable(allMuscles, id)) current[id] = current[id] ?? 0;
    }
    onDeltaChange(tableKey, rowId, filterScorableOnly(current, allMuscles));
  };

  const usedIds = useMemo(() => new Set(Object.keys(effectiveDeltas)), [effectiveDeltas]);
  const musclesForDropdown = useMemo(() =>
    allMuscles.map(m => ({ id: m.id, label: m.label, parent_ids: m.parent_ids ?? [], is_scorable: m.is_scorable })),
    [allMuscles]
  );
  const primaryDropdownGroups = useMemo(
    () => buildPrimaryMuscleDropdownGroups(musclesForDropdown, usedIds),
    [musclesForDropdown, usedIds]
  );
  const hasPrimaryOptions = primaryDropdownGroups.some(grp => grp.options.length > 0);

  const primaryMuscles = useMemo(() => getScorableMuscles(allMuscles.filter(m => !m.parent_ids || m.parent_ids.length === 0)), [allMuscles]);
  const getSecondariesFor = (pId: string) => getScorableMuscles(allMuscles.filter(m => m.parent_ids && m.parent_ids.includes(pId)));
  const getTertiariesFor = (sId: string) => getScorableMuscles(allMuscles.filter(m => m.parent_ids && m.parent_ids.includes(sId)));

  const deltaTree = useMemo(() => {
    const tree: Record<string, { score: number; children: Record<string, { score: number; children: Record<string, number> }> }> = {};
    const findPrimaryFor = (mid: string): string => {
      const mu = allMuscles.find(x => x.id === mid);
      if (!mu?.parent_ids?.length) return mid;
      return findPrimaryFor(mu.parent_ids[0]);
    };
    for (const [id, score] of Object.entries(effectiveDeltas)) {
      const m = allMuscles.find(mu => mu.id === id);
      if (!m) continue;
      if (!m.parent_ids || m.parent_ids.length === 0) {
        if (!tree[id]) tree[id] = { score, children: {} };
        else tree[id].score = score;
        continue;
      }
      for (const pid of m.parent_ids) {
        const parent = allMuscles.find(mu => mu.id === pid);
        if (!parent) continue;
        if (!parent.parent_ids || parent.parent_ids.length === 0) {
          if (!tree[pid]) tree[pid] = { score: effectiveDeltas[pid] ?? 0, children: {} };
          tree[pid].children[id] = { score, children: {} };
        } else {
          const pId = findPrimaryFor(pid);
          const sId = pid;
          if (!tree[pId]) tree[pId] = { score: effectiveDeltas[pId] ?? 0, children: {} };
          if (!tree[pId].children[sId]) tree[pId].children[sId] = { score: effectiveDeltas[sId] ?? 0, children: {} };
          tree[pId].children[sId].children[id] = score;
        }
      }
    }
    for (const pId of Object.keys(tree)) {
      if (pId in effectiveDeltas) tree[pId].score = effectiveDeltas[pId];
      for (const sId of Object.keys(tree[pId].children)) {
        if (sId in effectiveDeltas) tree[pId].children[sId].score = effectiveDeltas[sId];
      }
    }
    return tree;
  }, [effectiveDeltas, allMuscles]);

  const hasDeltas = Object.keys(effectiveDeltas).length > 0;

  return (
    <div className="border border-red-200 rounded bg-white text-[10px]">
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-red-50"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-red-400">{expanded ? '▼' : '▶'}</span>
        <span className="font-medium text-gray-800">{rowLabel}</span>

        {inlineAssignment && (
          <span onClick={e => e.stopPropagation()}>{inlineAssignment}</span>
        )}

        {isChildMotion && (
          <label className="flex items-center gap-1 cursor-pointer text-[9px] text-gray-500" onClick={e => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isInheritMode}
              onChange={handleToggleInherit}
              className="rounded border-gray-300 w-3 h-3"
            />
            Inherit
          </label>
        )}

        {/* Source chip */}
        {(() => {
          const src = resolvedSourceChip || resolvedSource;
          if (!src) return null;
          return (
            <span className={`px-1.5 py-0.5 rounded border text-[9px] ${
              src.type === 'inherited'
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}>
              {src.type === 'inherited'
                ? `Inherited from ${src.fromLabel}`
                : `Custom for ${src.fromLabel}`
              }
            </span>
          );
        })()}

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
        <div className="border-t border-red-200 px-2 py-2 space-y-1.5">

          {/* Delta scores */}
          {isInheritMode ? (
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
              <div className="text-[9px] text-amber-600 italic mt-1">Read-only (inherited)</div>
            </div>
          ) : (
            <div className="space-y-1">
              {Object.keys(deltaTree).length === 0 && (
                <div className="text-gray-400 italic py-1">No deltas (home base)</div>
              )}
              {Object.entries(deltaTree).map(([pId, pNode]) => {
                const pLabel = getMuscleLabel(allMuscles, pId);
                const sKeys = Object.keys(pNode.children);
                const pSumChildren = sKeys.reduce((acc, sId) => {
                  const sNode = pNode.children[sId];
                  const childTotal = sNode.score + Object.values(sNode.children).reduce((a, v) => a + v, 0);
                  return acc + childTotal;
                }, 0);
                const pTotal = Math.round((pNode.score + pSumChildren) * 100) / 100;
                const availSec = getSecondariesFor(pId).filter(s => !sKeys.includes(s.id));
                const secondaryGroups = buildSecondaryMuscleDropdownGroups(musclesForDropdown, pId, usedIds);
                const hasSecondaryOptions = secondaryGroups.some(grp => grp.options.length > 0);

                return (
                  <div key={pId} className="border border-gray-200 rounded p-1 bg-gray-50">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-gray-700">{pLabel}</span>
                      {!isMuscleScorable(allMuscles, pId) ? (
                        <span className="text-gray-500 ml-auto" title="Not scorable">
                          {sKeys.length > 0 ? `${pNode.score} ${pTotal}` : pNode.score}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 ml-auto">
                          <input
                            type="number"
                            value={pNode.score}
                            onChange={e => handleScoreChange(pId, parseFloat(e.target.value) || 0)}
                            step="0.05"
                            className="w-16 px-1 py-0.5 border border-gray-300 rounded text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          {sKeys.length > 0 && (
                            <span className="text-gray-400 italic text-[10px]" title="Parent + children total">{pTotal}</span>
                          )}
                        </span>
                      )}
                      <button onClick={() => handleRemoveMuscle(pId)} className="text-red-400 hover:text-red-600 ml-auto">×</button>
                    </div>
                    {(sKeys.length > 0 || availSec.length > 0) && (
                      <div className="pl-2 mt-0.5 space-y-0.5 border-l border-gray-200 ml-0.5">
                        {sKeys.map(sId => {
                          const sNode = pNode.children[sId];
                          const sLabel = getMuscleLabel(allMuscles, sId);
                          const tKeys = Object.keys(sNode.children);
                          const sSumChildren = Object.values(sNode.children).reduce((a, v) => a + v, 0);
                          const sTotal = Math.round((sNode.score + sSumChildren) * 100) / 100;
                          const availTer = getTertiariesFor(sId).filter(t => !tKeys.includes(t.id));

                          return (
                            <div key={sId}>
                              <div className="flex items-center gap-1.5">
                                <span className="text-gray-600">{sLabel}</span>
                                {!isMuscleScorable(allMuscles, sId) ? (
                                  <span className="text-gray-500" title="Not scorable">
                                    {tKeys.length > 0 ? `${sNode.score} ${sTotal}` : sNode.score}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      value={sNode.score}
                                      onChange={e => handleScoreChange(sId, parseFloat(e.target.value) || 0)}
                                      step="0.05"
                                      className="w-16 px-1 py-0.5 border border-gray-300 rounded text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    {tKeys.length > 0 && (
                                      <span className="text-gray-400 italic text-[10px]" title="Parent + children total">{sTotal}</span>
                                    )}
                                  </span>
                                )}
                                <button onClick={() => handleRemoveMuscle(sId)} className="text-red-400 hover:text-red-600 ml-auto">×</button>
                              </div>
                              {(tKeys.length > 0 || availTer.length > 0) && (
                                <div className="pl-2 mt-0.5 space-y-0 border-l border-gray-200 ml-0.5">
                                  {tKeys.map(tId => (
                                    <div key={tId} className="flex items-center gap-1.5">
                                      <span className="text-gray-500">{getMuscleLabel(allMuscles, tId)}</span>
                                      {!isMuscleScorable(allMuscles, tId) ? (
                                        <span className="text-gray-500" title="Not scorable">{sNode.children[tId]}</span>
                                      ) : (
                                        <input type="number" value={sNode.children[tId]}
                                          onChange={e => handleScoreChange(tId, parseFloat(e.target.value) || 0)}
                                          step="0.05" className="w-16 px-1 py-0.5 border border-gray-300 rounded text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                      )}
                                      <button onClick={() => handleRemoveMuscle(tId)} className="text-red-400 hover:text-red-600 ml-auto">×</button>
                                    </div>
                                  ))}
                                  {availTer.length > 0 && (
                                    <select onChange={e => { if (e.target.value) handleAddMuscle(e.target.value); e.target.value = ''; }}
                                      className="w-40 border border-gray-300 rounded px-1 py-0.5 text-gray-600 bg-white mt-0.5" defaultValue="">
                                      <option value="">+ tertiary...</option>
                                      {availTer.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                    </select>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {(hasSecondaryOptions || availSec.length > 0) && (
                          hasSecondaryOptions ? (
                            <MuscleSecondarySelect
                              options={secondaryGroups[0].options}
                              onChange={handleAddMuscleByPath}
                              className="w-40 border border-gray-300 rounded px-1 py-0.5 text-gray-600 bg-white mt-0.5"
                              placeholder="+ secondary..."
                            />
                          ) : (
                            <select onChange={e => { if (e.target.value) handleAddMuscle(e.target.value); e.target.value = ''; }}
                              className="w-40 border border-gray-300 rounded px-1 py-0.5 text-gray-600 bg-white mt-0.5" defaultValue="">
                              <option value="">+ secondary...</option>
                              {availSec.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                            </select>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {hasPrimaryOptions && (
                <select onChange={e => { if (e.target.value) handleAddMuscleByPath(e.target.value); e.target.value = ''; }}
                  className="w-40 border border-gray-300 rounded px-1 py-0.5 text-gray-600 bg-white mt-1" defaultValue="">
                  <option value="">+ muscle group...</option>
                  {primaryDropdownGroups.map(grp => (
                    <optgroup key={grp.groupLabel} label={grp.groupLabel}>
                      {grp.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </optgroup>
                  ))}
                </select>
              )}
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
