import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { api } from '../../api';

type MotionTableKey = 'primaryMotions' | 'primaryMotionVariations';

interface MotionConfigTreeProps {
  tableKey: MotionTableKey;
  currentRecordId: string;
  muscleTargets: Record<string, unknown>;
  onFieldsChange: (fields: Record<string, unknown>) => void;
}

interface MotionRecord {
  id: string;
  label: string;
  primary_motion_key?: string;
  muscle_targets?: Record<string, unknown>;
  motion_planes?: { default?: string; options?: string[] };
  [key: string]: unknown;
}

interface MuscleOption { id: string; label: string; }

function collectAllScores(
  data: Record<string, unknown>,
  primaryMuscles: MuscleOption[],
  secondaryMuscles: Record<string, unknown>[],
  tertiaryMuscles: Record<string, unknown>[]
): string {
  const lines: string[] = [];
  const pKeys = Object.keys(data).filter(k => k !== '_score');

  for (let pIdx = 0; pIdx < pKeys.length; pIdx++) {
    const pId = pKeys[pIdx];
    const pNode = data[pId] as Record<string, unknown> | undefined;
    if (!pNode || typeof pNode !== 'object') continue;
    const pLabel = primaryMuscles.find(pm => pm.id === pId)?.label || pId;
    const pScore = typeof pNode._score === 'number' ? pNode._score : 0;
    const sKeys = Object.keys(pNode).filter(k => k !== '_score');
    const isLastPrimary = pIdx === pKeys.length - 1;

    lines.push(`${isLastPrimary ? '└' : '├'}─ ${pLabel}: ${pScore}`);
    for (let sIdx = 0; sIdx < sKeys.length; sIdx++) {
      const sId = sKeys[sIdx];
      const sNode = pNode[sId] as Record<string, unknown> | undefined;
      if (!sNode || typeof sNode !== 'object') continue;
      const sLabel = secondaryMuscles.find(s => s.id === sId)?.label as string || sId;
      const sScore = typeof sNode._score === 'number' ? sNode._score : 0;
      const tKeys = Object.keys(sNode).filter(k => k !== '_score');
      const isLastSecondary = sIdx === sKeys.length - 1;

      let secondaryPrefix: string;
      if (isLastPrimary) {
        secondaryPrefix = isLastSecondary ? '   └' : '   ├';
      } else {
        secondaryPrefix = isLastSecondary ? '│  └' : '│  ├';
      }
      lines.push(`${secondaryPrefix}─ ${sLabel}: ${sScore}`);

      for (let tIdx = 0; tIdx < tKeys.length; tIdx++) {
        const tId = tKeys[tIdx];
        const tNode = sNode[tId] as Record<string, unknown> | undefined;
        const tLabel = tertiaryMuscles.find(t => t.id === tId)?.label as string || tId;
        const tScore = typeof tNode?._score === 'number' ? tNode._score : 0;
        const isLastTertiary = tIdx === tKeys.length - 1;

        let tertiaryPrefix: string;
        if (isLastPrimary) {
          tertiaryPrefix = isLastSecondary
            ? (isLastTertiary ? '      └' : '      ├')
            : (isLastTertiary ? '   │  └' : '   │  ├');
        } else {
          tertiaryPrefix = isLastSecondary
            ? (isLastTertiary ? '│     └' : '│     ├')
            : (isLastTertiary ? '│  │  └' : '│  │  ├');
        }
        lines.push(`${tertiaryPrefix}─ ${tLabel}: ${tScore}`);
      }
    }
  }
  return lines.length > 0 ? lines.join('\n') : 'none';
}

function MuscleTargetsSubtree({
  targets,
  onChange,
  readOnly,
  depth,
  expanded,
  toggleExpanded,
  primaryMuscles,
  secondaryMuscles,
  tertiaryMuscles,
}: {
  targets: Record<string, unknown>;
  onChange?: (v: Record<string, unknown>) => void;
  readOnly?: boolean;
  depth: number;
  expanded: Set<string>;
  toggleExpanded: (key: string) => void;
  primaryMuscles: MuscleOption[];
  secondaryMuscles: Record<string, unknown>[];
  tertiaryMuscles: Record<string, unknown>[];
}) {
  const data = targets && typeof targets === 'object' && !Array.isArray(targets) ? targets : {};

  const recomputeParentScores = (nd: Record<string, unknown>) => {
    for (const pId of Object.keys(nd).filter(k => k !== '_score')) {
      const pNode = nd[pId] as Record<string, unknown> | undefined;
      if (!pNode || typeof pNode !== 'object') continue;
      const sKeys = Object.keys(pNode).filter(k => k !== '_score');
      for (const sId of sKeys) {
        const sNode = pNode[sId] as Record<string, unknown> | undefined;
        if (!sNode || typeof sNode !== 'object') continue;
        const tKeys = Object.keys(sNode).filter(k => k !== '_score');
        if (tKeys.length > 0) {
          const sum = tKeys.reduce((s, tId) => {
            const tNode = sNode[tId] as Record<string, unknown> | undefined;
            const score = typeof tNode?._score === 'number' && !isNaN(tNode._score) ? tNode._score : 0;
            return s + score;
          }, 0);
          sNode._score = Math.round(sum * 100) / 100;
        }
      }
      if (sKeys.length > 0) {
        const sum = sKeys.reduce((s, sId) => {
          const sNode = pNode[sId] as Record<string, unknown> | undefined;
          const score = typeof sNode?._score === 'number' && !isNaN(sNode._score) ? sNode._score : 0;
          return s + score;
        }, 0);
        pNode._score = Math.round(sum * 100) / 100;
      }
    }
  };

  const setScore = (path: string[], score: number) => {
    if (readOnly || !onChange) return;
    if (isNaN(score)) return;
    const nd = JSON.parse(JSON.stringify(data));
    let node = nd;
    for (let i = 0; i < path.length; i++) {
      if (!node[path[i]] || typeof node[path[i]] !== 'object') {
        node[path[i]] = { _score: 0 };
      }
      node = node[path[i]];
    }
    if (typeof node === 'object' && node !== null) {
      node._score = score;
    }
    recomputeParentScores(nd);
    onChange(nd);
  };

  const removeKey = (path: string[]) => {
    if (readOnly || !onChange) return;
    const nd = JSON.parse(JSON.stringify(data));
    let node = nd;
    for (let i = 0; i < path.length - 1; i++) { if (!node[path[i]]) return; node = node[path[i]]; }
    delete node[path[path.length - 1]];
    recomputeParentScores(nd);
    onChange(nd);
  };

  const addPrimary = (id: string) => {
    if (readOnly || !onChange || data[id]) return;
    const nd = { ...JSON.parse(JSON.stringify(data)), [id]: { _score: 0 } };
    onChange(nd);
  };

  const addSecondary = (pId: string, sId: string) => {
    if (readOnly || !onChange) return;
    const nd = JSON.parse(JSON.stringify(data));
    if (!nd[pId]) nd[pId] = { _score: 0 };
    if (!nd[pId][sId]) nd[pId][sId] = { _score: 0 };
    recomputeParentScores(nd);
    onChange(nd);
  };

  const addTertiary = (pId: string, sId: string, tId: string) => {
    if (readOnly || !onChange) return;
    const nd = JSON.parse(JSON.stringify(data));
    if (!nd[pId]) nd[pId] = { _score: 0 };
    if (!nd[pId][sId]) nd[pId][sId] = { _score: 0 };
    if (!nd[pId][sId][tId]) nd[pId][sId][tId] = { _score: 0 };
    recomputeParentScores(nd);
    onChange(nd);
  };

  const getSecondariesFor = (pId: string) =>
    secondaryMuscles.filter(s => { const ids = s.primary_muscle_ids; return Array.isArray(ids) ? ids.includes(pId) : false; })
      .map(s => ({ id: s.id as string, label: s.label as string }));

  const getTertiariesFor = (sId: string) =>
    tertiaryMuscles.filter(t => { const ids = t.secondary_muscle_ids; return Array.isArray(ids) ? ids.includes(sId) : false; })
      .map(t => ({ id: t.id as string, label: t.label as string }));

  const prefix = `mt-d${depth}`;
  const activePrimaries = Object.keys(data).filter(k => k !== '_score');
  const unusedPrimaries = primaryMuscles.filter(pm => !activePrimaries.includes(pm.id));

  const ScoreInput = ({ path, score, computed }: { path: string[]; score: number; computed?: boolean }) => {
    const [localValue, setLocalValue] = useState<string>(String(score));
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
      if (!isFocused) setLocalValue(String(score));
    }, [score, isFocused]);

    if (readOnly || computed) {
      return (
        <span className={`text-xs font-mono px-1 py-0.5 rounded ${computed ? 'bg-gray-100 text-gray-500 italic' : 'text-gray-500'}`}
          title={computed ? 'Auto-computed from children' : undefined}>{score}</span>
      );
    }

    return (
      <input
        type="number" step="0.1" value={localValue}
        onFocus={() => setIsFocused(true)}
        onChange={e => setLocalValue(e.target.value)}
        onBlur={e => {
          setIsFocused(false);
          const numVal = parseFloat(e.target.value);
          if (isNaN(numVal) || e.target.value === '') setLocalValue(String(score));
          else setScore(path, numVal);
        }}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        className="w-14 px-1 py-0.5 border rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
    );
  };

  return (
    <div className="space-y-1">
      {activePrimaries.map(pId => {
        const pNode = data[pId] as Record<string, unknown> | undefined;
        if (!pNode || typeof pNode !== 'object') return null;
        const pLabel = primaryMuscles.find(pm => pm.id === pId)?.label || pId;
        const pScore = (pNode._score as number) ?? 0;
        const sKeys = Object.keys(pNode).filter(k => k !== '_score');
        const pKey = `${prefix}-${pId}`;
        const isExp = expanded.has(pKey);
        const availSec = getSecondariesFor(pId).filter(s => !sKeys.includes(s.id));
        const pIsComputed = sKeys.length > 0;

        return (
          <div key={pId} className="rounded border bg-white">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50/60">
              <button type="button" onClick={() => toggleExpanded(pKey)} className="text-[10px] text-gray-500 w-3">
                {isExp ? '▼' : '▶'}
              </button>
              <span className="text-xs font-medium text-red-800">{pLabel}</span>
              <ScoreInput path={[pId]} score={pScore} computed={pIsComputed} />
              {!readOnly && (
                <button type="button" onClick={() => removeKey([pId])} className="ml-auto text-[10px] text-red-400 hover:text-red-600">×</button>
              )}
            </div>
            {isExp && (
              <div className="pl-4 pr-2 py-1 space-y-1">
                {sKeys.map(sId => {
                  const sNode = pNode[sId] as Record<string, unknown> | undefined;
                  if (!sNode || typeof sNode !== 'object') return null;
                  const sLabel = secondaryMuscles.find(s => s.id === sId)?.label as string || sId;
                  const sScore = (sNode._score as number) ?? 0;
                  const tKeys = Object.keys(sNode).filter(k => k !== '_score');
                  const sKey = `${prefix}-${pId}.${sId}`;
                  const isSExp = expanded.has(sKey);
                  const availTer = getTertiariesFor(sId).filter(t => !tKeys.includes(t.id));
                  const sIsComputed = tKeys.length > 0;
                  const hasTertiaries = tKeys.length > 0;

                  return (
                    <div key={sId} className="rounded border">
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-50/60">
                        {hasTertiaries ? (
                          <button type="button" onClick={() => toggleExpanded(sKey)} className="text-[10px] text-gray-500 w-3">
                            {isSExp ? '▼' : '▶'}
                          </button>
                        ) : (
                          <span className="text-[8px] text-gray-400 w-3 flex items-center justify-center">●</span>
                        )}
                        <span className="text-xs text-red-800">{sLabel}</span>
                        <ScoreInput path={[pId, sId]} score={sScore} computed={sIsComputed} />
                        {!readOnly && (
                          <button type="button" onClick={() => removeKey([pId, sId])} className="ml-auto text-[10px] text-red-400 hover:text-red-600">×</button>
                        )}
                      </div>
                      {hasTertiaries && isSExp && (
                        <div className="pl-4 pr-2 py-0.5 space-y-0.5">
                          {tKeys.map(tId => {
                            const tNode = sNode[tId] as Record<string, unknown> | undefined;
                            const tScore = (tNode?._score as number) ?? 0;
                            const tLabel = tertiaryMuscles.find(t => t.id === tId)?.label as string || tId;
                            return (
                              <div key={tId} className="flex items-center gap-1.5 px-2 py-0.5 bg-red-50/60 rounded">
                                <span className="text-[11px] text-red-800">{tLabel}</span>
                                <ScoreInput path={[pId, sId, tId]} score={tScore} />
                                {!readOnly && (
                                  <button type="button" onClick={() => removeKey([pId, sId, tId])} className="ml-auto text-[10px] text-red-400 hover:text-red-600">×</button>
                                )}
                              </div>
                            );
                          })}
                          {!readOnly && availTer.length > 0 && (
                            <select onChange={e => { if (e.target.value) addTertiary(pId, sId, e.target.value); e.target.value = ''; }}
                              className="text-[10px] px-1 py-0.5 border border-red-300 rounded text-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" defaultValue="">
                              <option value="">+ tertiary...</option>
                              {availTer.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {!readOnly && availSec.length > 0 && (
                  <select onChange={e => { if (e.target.value) addSecondary(pId, e.target.value); e.target.value = ''; }}
                    className="text-[10px] px-1 py-0.5 border border-red-300 rounded text-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" defaultValue="">
                    <option value="">+ secondary...</option>
                    {availSec.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                )}
              </div>
            )}
          </div>
        );
      })}
      {!readOnly && unusedPrimaries.length > 0 && (
        <select onChange={e => { if (e.target.value) addPrimary(e.target.value); e.target.value = ''; }}
          className="text-[10px] px-1 py-0.5 border border-red-300 rounded text-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" defaultValue="">
          <option value="">+ muscle group...</option>
          {unusedPrimaries.map(pm => <option key={pm.id} value={pm.id}>{pm.label}</option>)}
        </select>
      )}
    </div>
  );
}

function MuscleTargetsToggle({
  mtKey, targets, primaryMuscles, secondaryMuscles, tertiaryMuscles, expanded, toggle,
}: {
  mtKey: string;
  targets: Record<string, unknown>;
  primaryMuscles: MuscleOption[];
  secondaryMuscles: Record<string, unknown>[];
  tertiaryMuscles: Record<string, unknown>[];
  expanded: Set<string>;
  toggle: (key: string) => void;
}) {
  const isExp = expanded.has(mtKey);
  const data = targets && typeof targets === 'object' && !Array.isArray(targets) ? targets : {};
  const tooltipText = collectAllScores(data, primaryMuscles, secondaryMuscles, tertiaryMuscles);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (tooltipText === 'none') return;
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setTooltipPosition({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
    }
    setShowTooltip(true);
  };

  return (
    <>
      <div ref={wrapperRef}
        className="flex items-center gap-1 cursor-pointer bg-red-50/60 hover:bg-red-100/80 rounded px-1.5 py-0.5 flex-shrink-0"
        onClick={e => { e.stopPropagation(); toggle(mtKey); }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span className="text-[10px] text-red-800 font-bold flex-shrink-0">Muscles</span>
        <button type="button" className="text-[10px] text-red-600/70 w-3 flex-shrink-0">
          {isExp ? '▼' : '▶'}
        </button>
      </div>
      {showTooltip && tooltipText !== 'none' && createPortal(
        <div className="fixed z-[100] bg-gray-900 text-white text-xs rounded px-3 py-2 whitespace-pre-line shadow-xl border border-gray-700 pointer-events-none"
          style={{ top: `${tooltipPosition.top}px`, left: `${tooltipPosition.left}px`, width: '320px' }}>
          <div className="font-semibold mb-1 text-red-300">Muscle Scores:</div>
          <div className="font-mono text-[11px]">{tooltipText}</div>
        </div>,
        document.body
      )}
    </>
  );
}

// Extract the muscle data for a specific plane variant from the keyed muscle_targets
function getPlaneTargets(allTargets: Record<string, unknown>, planeKey: string): Record<string, unknown> {
  const variant = allTargets[planeKey];
  if (variant && typeof variant === 'object' && !Array.isArray(variant)) {
    return variant as Record<string, unknown>;
  }
  return {};
}

function getPlaneVariantKeys(allTargets: Record<string, unknown>): string[] {
  if (!allTargets || typeof allTargets !== 'object') return [];
  return Object.keys(allTargets);
}

export default function MotionConfigTree({ tableKey, currentRecordId, muscleTargets, onFieldsChange }: MotionConfigTreeProps) {
  const [primaryMotions, setPrimaryMotions] = useState<MotionRecord[]>([]);
  const [variations, setVariations] = useState<MotionRecord[]>([]);
  const [primaryMuscles, setPrimaryMuscles] = useState<MuscleOption[]>([]);
  const [secondaryMuscles, setSecondaryMuscles] = useState<Record<string, unknown>[]>([]);
  const [tertiaryMuscles, setTertiaryMuscles] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const loadAll = useCallback(async () => {
    try {
      const [pm, v, pmMuscles, smMuscles, tmMuscles] = await Promise.all([
        api.getTable('primaryMotions'),
        api.getTable('primaryMotionVariations'),
        api.getTable('primaryMuscles'),
        api.getTable('secondaryMuscles'),
        api.getTable('tertiaryMuscles'),
      ]);
      setPrimaryMotions((pm as MotionRecord[]) || []);
      setVariations((v as MotionRecord[]) || []);
      setPrimaryMuscles((pmMuscles as MuscleOption[]) || []);
      setSecondaryMuscles((smMuscles as Record<string, unknown>[]) || []);
      setTertiaryMuscles((tmMuscles as Record<string, unknown>[]) || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const toggle = useCallback((key: string) => {
    setExpanded(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  }, []);

  const syncAfterChange = useCallback(async (updatedVariations: MotionRecord[]) => {
    try {
      await api.putTable('primaryMotionVariations', updatedVariations);
    } catch (err) { console.error('Sync error:', err); }
    setVariations([...updatedVariations]);
    if (tableKey === 'primaryMotionVariations') {
      const cur = updatedVariations.find(r => r.id === currentRecordId);
      if (cur) onFieldsChange({ primary_motion_key: cur.primary_motion_key || '' });
    }
  }, [tableKey, currentRecordId, onFieldsChange]);

  const addVariationToPrimary = useCallback(async (primaryId: string, variationId: string) => {
    const vs = variations.map(v => v.id === variationId ? { ...v, primary_motion_key: primaryId } : { ...v });
    await syncAfterChange(vs);
  }, [variations, syncAfterChange]);

  const removeVariationFromPrimary = useCallback(async (variationId: string) => {
    const vs = variations.map(v => v.id === variationId ? { ...v, primary_motion_key: '' } : { ...v });
    await syncAfterChange(vs);
  }, [variations, syncAfterChange]);

  const setPrimaryForVariation = useCallback(async (variationId: string, primaryId: string) => {
    const vs = variations.map(v => v.id === variationId ? { ...v, primary_motion_key: primaryId } : { ...v });
    await syncAfterChange(vs);
    if (tableKey === 'primaryMotionVariations' && variationId === currentRecordId) {
      onFieldsChange({ primary_motion_key: primaryId });
    }
  }, [variations, syncAfterChange, tableKey, currentRecordId, onFieldsChange]);

  const saveChildMuscleTargets = useCallback(async (tableKeyChild: string, recordId: string, newTargets: Record<string, unknown>) => {
    try {
      if (tableKeyChild === 'primaryMotionVariations') {
        const v = variations.find(r => r.id === recordId);
        if (v) {
          v.muscle_targets = newTargets;
          await api.updateRow('primaryMotionVariations', recordId, { ...v, muscle_targets: newTargets });
          setVariations(prev => prev.map(r => r.id === recordId ? { ...r, muscle_targets: newTargets } : r));
        }
      } else if (tableKeyChild === 'primaryMotions') {
        const p = primaryMotions.find(r => r.id === recordId);
        if (p) {
          p.muscle_targets = newTargets;
          await api.updateRow('primaryMotions', recordId, { ...p, muscle_targets: newTargets });
          setPrimaryMotions(prev => prev.map(r => r.id === recordId ? { ...r, muscle_targets: newTargets } : r));
        }
      }
    } catch (err) {
      console.error('Failed to save muscle_targets:', err);
    }
  }, [variations, primaryMotions]);

  const createVariation = useCallback(async (primaryId: string, newData: Record<string, unknown>) => {
    try {
      await api.addRow('primaryMotionVariations', { ...newData, primary_motion_key: primaryId, muscle_targets: {}, motion_planes: {} });
      const v = await api.getTable('primaryMotionVariations') as MotionRecord[];
      setVariations(v);
    } catch (err) { console.error('Failed to create variation:', err); alert('Failed to create variation.'); }
  }, []);

  const mtProps = useMemo(() => ({
    expanded, toggleExpanded: toggle, primaryMuscles, secondaryMuscles, tertiaryMuscles,
  }), [expanded, toggle, primaryMuscles, secondaryMuscles, tertiaryMuscles]);

  if (loading) return <div className="text-xs text-gray-400 py-2">Loading...</div>;

  const isCurrent = (type: MotionTableKey, id: string) => type === tableKey && id === currentRecordId;

  const getTargetsAndOnChange = (type: MotionTableKey, id: string, record: MotionRecord) => {
    const allTargets = isCurrent(type, id) ? muscleTargets : (record.muscle_targets || {}) as Record<string, unknown>;
    return {
      allTargets,
      onChange: (planeKey: string) => (newPlaneData: Record<string, unknown>) => {
        const updated = { ...JSON.parse(JSON.stringify(allTargets)), [planeKey]: newPlaneData };
        if (isCurrent(type, id)) {
          onFieldsChange({ muscle_targets: updated });
        } else {
          saveChildMuscleTargets(type, id, updated);
        }
      },
    };
  };

  const renderPlaneVariants = (type: MotionTableKey, id: string, record: MotionRecord, keyPrefix: string) => {
    const { allTargets, onChange } = getTargetsAndOnChange(type, id, record);
    const variantKeys = getPlaneVariantKeys(allTargets);

    if (variantKeys.length === 0) {
      return (
        <div className="text-[10px] text-gray-400 italic px-2 py-1">No muscle targets configured.</div>
      );
    }

    return (
      <div className="space-y-1">
        {variantKeys.map(vk => {
          const vkKey = `${keyPrefix}-plane-${vk}`;
          const isExp = expanded.has(vkKey);
          const planeData = getPlaneTargets(allTargets, vk);
          const tooltipText = collectAllScores(planeData, primaryMuscles, secondaryMuscles, tertiaryMuscles);
          return (
            <div key={vk} className="rounded border bg-white overflow-hidden">
              <div className="flex items-center gap-2 px-2 py-1 bg-indigo-50/60 cursor-pointer" onClick={() => toggle(vkKey)}>
                <button type="button" className="text-[10px] text-gray-500 w-3 flex-shrink-0">{isExp ? '▼' : '▶'}</button>
                <span className={`text-[10px] font-bold ${vk === 'STANDARD' ? 'text-indigo-800' : 'text-purple-700'}`}>{vk}</span>
                {tooltipText !== 'none' && (
                  <span className="text-[9px] text-gray-400 ml-auto">{Object.keys(planeData).filter(k => k !== '_score').length} groups</span>
                )}
              </div>
              {isExp && (
                <div className="px-2 py-1 border-t bg-red-100">
                  <MuscleTargetsSubtree targets={planeData} depth={0} onChange={onChange(vk)} {...mtProps} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderVariation = (v: MotionRecord, pmId: string, keyPrefix: string) => {
    const vKey = `${keyPrefix}-var-${v.id}`;
    const isVExp = expanded.has(vKey);
    const current = isCurrent('primaryMotionVariations', v.id);
    const { allTargets } = getTargetsAndOnChange('primaryMotionVariations', v.id, v);
    const standardTargets = getPlaneTargets(allTargets, 'STANDARD');
    const varMtKey = `mt-var-${v.id}`;

    return (
      <div key={v.id} className={`rounded border overflow-hidden ${current ? 'ring-2 ring-blue-400' : 'bg-white'}`}>
        <div className={`px-2 py-1.5 border-b flex items-center gap-2 ${current ? 'bg-blue-100' : 'bg-gray-50'}`}>
          <button type="button" onClick={() => toggle(vKey)} className="text-[10px] text-gray-500 w-3 flex-shrink-0">{isVExp ? '▼' : '▶'}</button>
          <div className="flex items-center gap-2 flex-shrink-0">
            {current ? (
              <span className="text-xs font-bold text-gray-900">{v.label}</span>
            ) : (
              <Link to="/table/primaryMotionVariations" className="text-xs font-medium text-blue-600 hover:underline">{v.label}</Link>
            )}
            <span className="text-[10px] text-gray-400">{v.id}</span>
          </div>
          <MuscleTargetsToggle mtKey={varMtKey} targets={standardTargets} primaryMuscles={primaryMuscles} secondaryMuscles={secondaryMuscles} tertiaryMuscles={tertiaryMuscles} expanded={expanded} toggle={toggle} />
          <button type="button" onClick={() => removeVariationFromPrimary(v.id)}
            className="ml-auto text-[10px] text-red-500 hover:text-red-700 px-1 flex-shrink-0">Remove</button>
        </div>
        {expanded.has(varMtKey) && (
          <div className="px-2 py-1 border-b bg-red-50">
            {renderPlaneVariants('primaryMotionVariations', v.id, v, `var-${v.id}`)}
          </div>
        )}
        {isVExp && (
          <div className="pl-4 pr-2 py-1.5 space-y-1.5">
            <div className="text-[10px] text-gray-400">
              {v.motion_planes && typeof v.motion_planes === 'object' && (v.motion_planes as { options?: string[] }).options?.length
                ? `Planes: ${((v.motion_planes as { default?: string; options?: string[] }).options || []).join(', ')} (default: ${(v.motion_planes as { default?: string }).default || 'STANDARD'})`
                : 'No motion planes configured'}
            </div>
          </div>
        )}
      </div>
    );
  };

  let rootPrimaries: MotionRecord[] = [];
  let focusVariationId: string | null = null;
  let orphanVariation: MotionRecord | null = null;

  if (tableKey === 'primaryMotions') {
    const pm = primaryMotions.find(p => p.id === currentRecordId);
    if (!pm) return <div className="text-xs text-gray-400 italic">Record not found.</div>;
    rootPrimaries = [pm];
  } else {
    const cur = variations.find(v => v.id === currentRecordId);
    if (!cur) return <div className="text-xs text-gray-400 italic">Record not found.</div>;
    focusVariationId = currentRecordId;
    if (cur.primary_motion_key) {
      const pm = primaryMotions.find(p => p.id === cur.primary_motion_key);
      if (pm) rootPrimaries = [pm];
      else orphanVariation = cur;
    } else {
      orphanVariation = cur;
    }
  }

  const renderPrimaryMotionTree = (pm: MotionRecord) => {
    const rootKey = `pm-${pm.id}`;
    const isRootExp = expanded.has(rootKey);
    const current = isCurrent('primaryMotions', pm.id);
    const { allTargets } = getTargetsAndOnChange('primaryMotions', pm.id, pm);
    const standardTargets = getPlaneTargets(allTargets, 'STANDARD');
    const relVars = variations.filter(v => v.primary_motion_key === pm.id);
    const displayVars = focusVariationId ? relVars.filter(v => v.id === focusVariationId) : relVars;
    const unlinkedVars = variations.filter(v => !v.primary_motion_key);
    const pmMtKey = `mt-pm-${pm.id}`;

    return (
      <div key={pm.id} className="border rounded-lg bg-gray-50 overflow-hidden">
        <div className={`px-3 py-2 border-b flex items-center gap-2 ${current ? 'bg-indigo-100' : 'bg-indigo-50'}`}>
          <button type="button" onClick={() => toggle(rootKey)} className="text-xs text-gray-500 w-4 flex-shrink-0">{isRootExp ? '▼' : '▶'}</button>
          <div className="flex items-center gap-2 flex-shrink-0">
            {current ? (
              <span className="text-sm font-bold text-gray-900">{pm.label}</span>
            ) : (
              <Link to="/table/primaryMotions" className="text-sm font-medium text-blue-600 hover:underline">{pm.label}</Link>
            )}
            <span className="text-xs text-gray-400">{pm.id}</span>
          </div>
          <MuscleTargetsToggle mtKey={pmMtKey} targets={standardTargets} primaryMuscles={primaryMuscles} secondaryMuscles={secondaryMuscles} tertiaryMuscles={tertiaryMuscles} expanded={expanded} toggle={toggle} />
        </div>
        {expanded.has(pmMtKey) && (
          <div className="px-3 py-1 border-b bg-red-50">
            {renderPlaneVariants('primaryMotions', pm.id, pm, `pm-${pm.id}`)}
          </div>
        )}
        {isRootExp && (
          <div className="pl-4 pr-2 py-2 space-y-2">
            {displayVars.map(v => renderVariation(v, pm.id, `pm-${pm.id}`))}
            {!focusVariationId && (
              <div className="flex flex-row gap-2 items-stretch">
                <select value="" onChange={async e => { if (e.target.value) await addVariationToPrimary(pm.id, e.target.value); }}
                  className="px-1 py-0.5 border border-blue-300 rounded text-[10px] text-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none">
                  <option value="">Add Motion Variation...</option>
                  {unlinkedVars.map(v => <option key={v.id} value={v.id}>{v.label} ({v.id})</option>)}
                </select>
                <div className="flex-shrink-0 min-w-fit">
                  <InlineVariationCreator onCreate={data => createVariation(pm.id, data)} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderOrphanVariation = (v: MotionRecord) => {
    const rootKey = `orphan-var-${v.id}`;
    const isRootExp = expanded.has(rootKey);
    const { allTargets } = getTargetsAndOnChange('primaryMotionVariations', v.id, v);
    const standardTargets = getPlaneTargets(allTargets, 'STANDARD');
    const orphanVarMtKey = `mt-orphan-var-${v.id}`;

    return (
      <div className="border rounded-lg bg-gray-50 overflow-hidden">
        <div className="px-3 py-2 bg-amber-50 border-b flex items-center gap-2">
          <button type="button" onClick={() => toggle(rootKey)} className="text-xs text-gray-500 w-4 flex-shrink-0">{isRootExp ? '▼' : '▶'}</button>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-amber-600 italic">No Parent Motion</span>
            <span className="text-xs text-gray-400">→</span>
            <span className="text-sm font-bold text-gray-900">{v.label}</span>
            <span className="text-xs text-gray-400">{v.id}</span>
          </div>
          <MuscleTargetsToggle mtKey={orphanVarMtKey} targets={standardTargets} primaryMuscles={primaryMuscles} secondaryMuscles={secondaryMuscles} tertiaryMuscles={tertiaryMuscles} expanded={expanded} toggle={toggle} />
        </div>
        {expanded.has(orphanVarMtKey) && (
          <div className="px-3 py-1 border-b bg-red-50">
            {renderPlaneVariants('primaryMotionVariations', v.id, v, `orphan-var-${v.id}`)}
          </div>
        )}
        {isRootExp && (
          <div className="pl-4 pr-2 py-2 space-y-2">
            <select value="" onChange={async e => { if (e.target.value) await setPrimaryForVariation(v.id, e.target.value); }}
              className="px-1 py-0.5 border border-blue-300 rounded text-[10px] text-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none">
              <option value="">Set Parent Motion...</option>
              {primaryMotions.map(p => <option key={p.id} value={p.id}>{p.label} ({p.id})</option>)}
            </select>
          </div>
        )}
      </div>
    );
  };

  const addToPrimaryOptions = focusVariationId
    ? primaryMotions.filter(pm => {
        const cur = variations.find(v => v.id === focusVariationId);
        return cur && pm.id !== cur.primary_motion_key;
      })
    : [];

  return (
    <div className="space-y-2">
      {rootPrimaries.map(pm => renderPrimaryMotionTree(pm))}
      {orphanVariation && renderOrphanVariation(orphanVariation)}

      {focusVariationId && addToPrimaryOptions.length > 0 && (
        <select value="" onChange={async e => {
          if (e.target.value) await setPrimaryForVariation(focusVariationId!, e.target.value);
        }}
          className="px-1 py-0.5 border border-blue-300 rounded text-[10px] text-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none">
          <option value="">{rootPrimaries.length > 0 ? 'Move to another Motion...' : 'Set Parent Motion...'}</option>
          {addToPrimaryOptions.map(p => <option key={p.id} value={p.id}>{p.label} ({p.id})</option>)}
        </select>
      )}
    </div>
  );
}

function InlineVariationCreator({ onCreate }: { onCreate: (data: Record<string, unknown>) => Promise<void> }) {
  const [showForm, setShowForm] = useState(false);
  const [newVar, setNewVar] = useState({ id: '', label: '', short_description: '' });
  const [creating, setCreating] = useState(false);

  if (!showForm) {
    return (
      <button type="button" onClick={() => setShowForm(true)}
        className="whitespace-nowrap h-full px-3 py-1.5 text-[10px] bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100">
        + Create New Variation
      </button>
    );
  }

  return (
    <div className="border rounded p-2 space-y-1.5 bg-blue-50">
      <div className="flex gap-1.5">
        <input type="text" placeholder="ID" value={newVar.id} onChange={e => setNewVar({ ...newVar, id: e.target.value })}
          className="flex-1 px-1.5 py-0.5 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <input type="text" placeholder="Label" value={newVar.label} onChange={e => setNewVar({ ...newVar, label: e.target.value })}
          className="flex-1 px-1.5 py-0.5 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
      </div>
      <input type="text" placeholder="Short Description" value={newVar.short_description}
        onChange={e => setNewVar({ ...newVar, short_description: e.target.value })}
        className="w-full px-1.5 py-0.5 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
      <div className="flex gap-1.5">
        <button type="button" disabled={!newVar.id || !newVar.label || creating}
          onClick={async () => {
            setCreating(true);
            await onCreate({ id: newVar.id, label: newVar.label, common_names: [], short_description: newVar.short_description, muscle_targets: {}, motion_planes: {}, sort_order: 0, is_active: true });
            setNewVar({ id: '', label: '', short_description: '' }); setShowForm(false); setCreating(false);
          }}
          className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded disabled:opacity-50">{creating ? '...' : 'Create'}</button>
        <button type="button" onClick={() => setShowForm(false)} className="px-2 py-0.5 text-xs bg-gray-200 rounded">Cancel</button>
      </div>
    </div>
  );
}
