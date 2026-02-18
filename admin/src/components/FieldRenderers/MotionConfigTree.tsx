import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { api } from '../../api';

type MotionTableKey = 'primaryMotions' | 'primaryMotionVariations' | 'motionPlanes';

interface MotionConfigTreeProps {
  tableKey: MotionTableKey;
  currentRecordId: string;
  muscleTargets: Record<string, unknown>;
  onFieldsChange: (fields: Record<string, unknown>) => void;
}

interface MotionRecord {
  id: string;
  label: string;
  primary_motion_ids?: string | string[];
  motion_variation_ids?: string[];
  motion_plane_ids?: string[];
  muscle_targets?: Record<string, unknown>;
  grip_type_ids?: string[];
  grip_type_configs?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

interface MuscleOption { id: string; label: string; }
interface GripTypeOption { id: string; label: string; }

// ---------------------------------------------------------------------------
// Recompute derived FK fields
// ---------------------------------------------------------------------------
function recomputeAllDerived(primaries: MotionRecord[], variations: MotionRecord[], planes: MotionRecord[]) {
  for (const p of primaries) {
    const relVars = variations.filter(v => v.primary_motion_ids === p.id);
    p.motion_variation_ids = relVars.map(v => v.id);
    const planeSet = new Set<string>();
    for (const v of relVars) { (v.motion_plane_ids || []).forEach(mp => planeSet.add(mp)); }
    p.motion_plane_ids = [...planeSet];
  }
  for (const mp of planes) {
    const relVars = variations.filter(v => (v.motion_plane_ids || []).includes(mp.id));
    mp.motion_variation_ids = relVars.map(v => v.id);
    const pmIds: string[] = [];
    for (const v of relVars) {
      const pmId = v.primary_motion_ids;
      if (typeof pmId === 'string' && pmId) {
        pmIds.push(pmId);
      } else if (Array.isArray(pmId)) {
        pmIds.push(...pmId.filter((id): id is string => Boolean(id)));
      }
    }
    mp.primary_motion_ids = [...new Set(pmIds)] as string[];
  }
}

// ---------------------------------------------------------------------------
// Inline muscle_targets tree (read-only or editable)
// ---------------------------------------------------------------------------
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
          const sum = tKeys.reduce((sum, tId) => {
            const tNode = sNode[tId] as Record<string, unknown> | undefined;
            const score = typeof tNode?._score === 'number' && !isNaN(tNode._score) ? tNode._score : 0;
            return sum + score;
          }, 0);
          sNode._score = Math.round(sum * 100) / 100;
        }
      }
      if (sKeys.length > 0) {
        const sum = sKeys.reduce((sum, sId) => {
          const sNode = pNode[sId] as Record<string, unknown> | undefined;
          const score = typeof sNode?._score === 'number' && !isNaN(sNode._score) ? sNode._score : 0;
          return sum + score;
        }, 0);
        pNode._score = Math.round(sum * 100) / 100;
      }
    }
  };

  const setScore = (path: string[], score: number) => {
    if (readOnly || !onChange) return;
    if (isNaN(score)) return; // Don't set NaN values
    const nd = JSON.parse(JSON.stringify(data));
    let node = nd;
    // Navigate to the parent node (path doesn't include '_score')
    for (let i = 0; i < path.length; i++) {
      if (!node[path[i]] || typeof node[path[i]] !== 'object') {
        node[path[i]] = { _score: 0 };
      }
      node = node[path[i]];
    }
    // Set _score on the final node
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
      if (!isFocused) {
        setLocalValue(String(score));
      }
    }, [score, isFocused]);

    if (readOnly || computed) {
      return (
        <span className={`text-xs font-mono px-1 py-0.5 rounded ${computed ? 'bg-gray-100 text-gray-500 italic' : 'text-gray-500'}`}
          title={computed ? 'Auto-computed from children' : undefined}>{score}</span>
      );
    }

    return (
      <input 
        type="number" 
        step="0.1" 
        value={localValue}
        onFocus={() => setIsFocused(true)}
        onChange={e => {
          const val = e.target.value;
          setLocalValue(val);
        }}
        onBlur={e => {
          setIsFocused(false);
          const numVal = parseFloat(e.target.value);
          if (isNaN(numVal) || e.target.value === '') {
            setLocalValue(String(score));
          } else {
            setScore(path, numVal);
          }
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
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

// ---------------------------------------------------------------------------
// Helper: Collect all scores from all depth levels for tooltip (tree structure)
// ---------------------------------------------------------------------------
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
    
    if (sKeys.length === 0) {
      lines.push(`${isLastPrimary ? '└' : '├'}─ ${pLabel}: ${pScore}`);
    } else {
      lines.push(`${isLastPrimary ? '└' : '├'}─ ${pLabel}: ${pScore}`);
      for (let sIdx = 0; sIdx < sKeys.length; sIdx++) {
        const sId = sKeys[sIdx];
        const sNode = pNode[sId] as Record<string, unknown> | undefined;
        if (!sNode || typeof sNode !== 'object') continue;
        const sLabel = secondaryMuscles.find(s => s.id === sId)?.label as string || sId;
        const sScore = typeof sNode._score === 'number' ? sNode._score : 0;
        
        const tKeys = Object.keys(sNode).filter(k => k !== '_score');
        const isLastSecondary = sIdx === sKeys.length - 1;
        
        // Build secondary prefix: when last primary, replace pipe with spaces
        let secondaryPrefix: string;
        if (isLastPrimary) {
          // Last primary: use 3 spaces instead of '│  ' to properly indent
          secondaryPrefix = isLastSecondary ? '   └' : '   ├';
        } else {
          // Not last primary: use standard '│  ' prefix
          secondaryPrefix = isLastSecondary ? '│  └' : '│  ├';
        }
        
        if (tKeys.length === 0) {
          lines.push(`${secondaryPrefix}─ ${sLabel}: ${sScore}`);
        } else {
          lines.push(`${secondaryPrefix}─ ${sLabel}: ${sScore}`);
          for (let tIdx = 0; tIdx < tKeys.length; tIdx++) {
            const tId = tKeys[tIdx];
            const tNode = sNode[tId] as Record<string, unknown> | undefined;
            const tLabel = tertiaryMuscles.find(t => t.id === tId)?.label as string || tId;
            const tScore = typeof tNode?._score === 'number' ? tNode._score : 0;
            const isLastTertiary = tIdx === tKeys.length - 1;
            
            // Build tertiary prefix: account for both primary and secondary being last
            let tertiaryPrefix: string;
            if (isLastPrimary) {
              // Last primary: replace pipes with spaces at this level
              if (isLastSecondary) {
                // Last secondary too: use 6 spaces (3 for primary level + 3 for secondary level)
                tertiaryPrefix = isLastTertiary ? '      └' : '      ├';
              } else {
                // Not last secondary: use 3 spaces + pipe + 2 spaces
                tertiaryPrefix = isLastTertiary ? '   │  └' : '   │  ├';
              }
            } else {
              // Not last primary: use standard pipe structure
              if (isLastSecondary) {
                // Last secondary: use pipe + 5 spaces
                tertiaryPrefix = isLastTertiary ? '│     └' : '│     ├';
              } else {
                // Not last secondary: use pipe + 2 spaces + pipe + 2 spaces
                tertiaryPrefix = isLastTertiary ? '│  │  └' : '│  │  ├';
              }
            }
            lines.push(`${tertiaryPrefix}─ ${tLabel}: ${tScore}`);
          }
        }
      }
    }
  }
  
  return lines.length > 0 ? lines.join('\n') : 'none';
}

// ---------------------------------------------------------------------------
// Inline muscle targets toggle (sits in the parent header row)
// ---------------------------------------------------------------------------
function MuscleTargetsToggle({
  mtKey,
  targets,
  primaryMuscles,
  secondaryMuscles,
  tertiaryMuscles,
  expanded,
  toggle,
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
      setTooltipPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <>
      <div
        ref={wrapperRef}
        className="flex items-center gap-1 cursor-pointer bg-red-50/60 hover:bg-red-100/80 rounded px-1.5 py-0.5 flex-shrink-0"
        onClick={e => { e.stopPropagation(); toggle(mtKey); }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span className="text-[10px] text-red-800 font-bold flex-shrink-0">Muscles</span>
        <button type="button" className="text-[10px] text-red-600/70 w-3 flex-shrink-0">
          {isExp ? '▼' : '▶'}
        </button>
      </div>
      {showTooltip && tooltipText !== 'none' && createPortal(
        <div
          className="fixed z-[100] bg-gray-900 text-white text-xs rounded px-3 py-2 whitespace-pre-line shadow-xl border border-gray-700 pointer-events-none"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            width: '320px',
          }}
        >
          <div className="font-semibold mb-1 text-red-300">Muscle Scores:</div>
          <div className="font-mono text-[11px]">{tooltipText}</div>
        </div>,
        document.body
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Inline grip types toggle (sits in the parent header row, similar to MuscleTargetsToggle)
// ---------------------------------------------------------------------------
function GripTypesToggle({
  gtKey,
  gripTypeIds,
  gripTypes,
  expanded,
  toggle,
}: {
  gtKey: string;
  gripTypeIds: string[];
  gripTypes: GripTypeOption[];
  expanded: Set<string>;
  toggle: (key: string) => void;
}) {
  const isExp = expanded.has(gtKey);
  const count = gripTypeIds.length;
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (count === 0) return;
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const linkedNames = gripTypeIds
    .map(id => gripTypes.find(g => g.id === id))
    .filter(Boolean)
    .map(g => g!.label);

  return (
    <>
      <div
        ref={wrapperRef}
        className="flex items-center gap-1 cursor-pointer bg-emerald-50/60 hover:bg-emerald-100/80 rounded px-1.5 py-0.5 flex-shrink-0"
        onClick={e => { e.stopPropagation(); toggle(gtKey); }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span className="text-[10px] text-emerald-800 font-bold flex-shrink-0">
          Grip Types{count > 0 ? ` (${count})` : ''}
        </span>
        <button type="button" className="text-[10px] text-emerald-600/70 w-3 flex-shrink-0">
          {isExp ? '▼' : '▶'}
        </button>
      </div>
      {showTooltip && count > 0 && createPortal(
        <div
          className="fixed z-[100] bg-gray-900 text-white text-xs rounded px-3 py-2 whitespace-pre-line shadow-xl border border-gray-700 pointer-events-none"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            width: '240px',
          }}
        >
          <div className="font-semibold mb-1 text-emerald-300">Grip Types:</div>
          <div className="font-mono text-[11px]">
            {linkedNames.map((name, i) => (
              <div key={i}>{i < linkedNames.length - 1 ? '├─' : '└─'} {name}</div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main MotionConfigTree
// ---------------------------------------------------------------------------
export default function MotionConfigTree({ tableKey, currentRecordId, muscleTargets, onFieldsChange }: MotionConfigTreeProps) {
  const [primaryMotions, setPrimaryMotions] = useState<MotionRecord[]>([]);
  const [variations, setVariations] = useState<MotionRecord[]>([]);
  const [motionPlanes, setMotionPlanes] = useState<MotionRecord[]>([]);
  const [primaryMuscles, setPrimaryMuscles] = useState<MuscleOption[]>([]);
  const [secondaryMuscles, setSecondaryMuscles] = useState<Record<string, unknown>[]>([]);
  const [tertiaryMuscles, setTertiaryMuscles] = useState<Record<string, unknown>[]>([]);
  const [gripTypes, setGripTypes] = useState<GripTypeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const loadAll = useCallback(async () => {
    try {
      const [pm, v, mp, pmMuscles, smMuscles, tmMuscles, gt] = await Promise.all([
        api.getTable('primaryMotions'),
        api.getTable('primaryMotionVariations'),
        api.getTable('motionPlanes'),
        api.getTable('primaryMuscles'),
        api.getTable('secondaryMuscles'),
        api.getTable('tertiaryMuscles'),
        api.getTable('gripTypes'),
      ]);
      setPrimaryMotions((pm as MotionRecord[]) || []);
      setVariations((v as MotionRecord[]) || []);
      setMotionPlanes((mp as MotionRecord[]) || []);
      setGripTypes((gt as GripTypeOption[]) || []);
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

  // ── Sync after hierarchy change ──
  const syncAfterChange = useCallback(async (uP: MotionRecord[], uV: MotionRecord[], uM: MotionRecord[]) => {
    recomputeAllDerived(uP, uV, uM);
    try {
      const saves: Promise<unknown>[] = [];
      if (tableKey !== 'primaryMotions') saves.push(api.putTable('primaryMotions', uP));
      if (tableKey !== 'primaryMotionVariations') saves.push(api.putTable('primaryMotionVariations', uV));
      if (tableKey !== 'motionPlanes') saves.push(api.putTable('motionPlanes', uM));
      await Promise.all(saves);
    } catch (err) { console.error('Sync error:', err); }

    const ct = tableKey === 'primaryMotions' ? uP : tableKey === 'primaryMotionVariations' ? uV : uM;
    for (const rec of ct) { if (rec.id !== currentRecordId) { try { await api.updateRow(tableKey, rec.id, rec); } catch { /* skip */ } } }

    setPrimaryMotions([...uP]); setVariations([...uV]); setMotionPlanes([...uM]);

    const cur = ct.find(r => r.id === currentRecordId);
    if (cur) {
      const fields: Record<string, unknown> = {};
      if (tableKey === 'primaryMotions') {
        fields.motion_variation_ids = cur.motion_variation_ids || [];
        fields.motion_plane_ids = cur.motion_plane_ids || [];
        fields.grip_type_ids = cur.grip_type_ids || [];
        fields.grip_type_configs = cur.grip_type_configs || {};
      } else if (tableKey === 'primaryMotionVariations') {
        fields.primary_motion_ids = cur.primary_motion_ids || '';
        fields.motion_plane_ids = cur.motion_plane_ids || [];
      } else {
        fields.motion_variation_ids = cur.motion_variation_ids || [];
        fields.primary_motion_ids = cur.primary_motion_ids || [];
      }
      onFieldsChange(fields);
    }
  }, [tableKey, currentRecordId, onFieldsChange]);

  // ── Hierarchy link/unlink operations ──
  const addVariationToPrimary = useCallback(async (primaryId: string, variationId: string) => {
    const vs = variations.map(v => v.id === variationId ? { ...v, primary_motion_ids: primaryId } : { ...v });
    await syncAfterChange(primaryMotions.map(p => ({ ...p })), vs, motionPlanes.map(m => ({ ...m })));
  }, [primaryMotions, variations, motionPlanes, syncAfterChange]);

  const removeVariationFromPrimary = useCallback(async (variationId: string) => {
    const vs = variations.map(v => v.id === variationId ? { ...v, primary_motion_ids: '' } : { ...v });
    await syncAfterChange(primaryMotions.map(p => ({ ...p })), vs, motionPlanes.map(m => ({ ...m })));
  }, [primaryMotions, variations, motionPlanes, syncAfterChange]);

  const addPlaneToVariation = useCallback(async (variationId: string, planeId: string) => {
    const vs = variations.map(v => v.id === variationId ? { ...v, motion_plane_ids: [...(v.motion_plane_ids || []), planeId] } : { ...v });
    await syncAfterChange(primaryMotions.map(p => ({ ...p })), vs, motionPlanes.map(m => ({ ...m })));
  }, [primaryMotions, variations, motionPlanes, syncAfterChange]);

  const removePlaneFromVariation = useCallback(async (variationId: string, planeId: string) => {
    const vs = variations.map(v => v.id === variationId ? { ...v, motion_plane_ids: (v.motion_plane_ids || []).filter(id => id !== planeId) } : { ...v });
    await syncAfterChange(primaryMotions.map(p => ({ ...p })), vs, motionPlanes.map(m => ({ ...m })));
  }, [primaryMotions, variations, motionPlanes, syncAfterChange]);

  const setPrimaryForVariation = useCallback(async (variationId: string, primaryId: string) => {
    const vs = variations.map(v => v.id === variationId ? { ...v, primary_motion_ids: primaryId } : { ...v });
    await syncAfterChange(primaryMotions.map(p => ({ ...p })), vs, motionPlanes.map(m => ({ ...m })));
    // If this is the current record being edited, update the form state
    if (tableKey === 'primaryMotionVariations' && variationId === currentRecordId) {
      onFieldsChange({ primary_motion_ids: primaryId });
    }
  }, [primaryMotions, variations, motionPlanes, syncAfterChange, tableKey, currentRecordId, onFieldsChange]);

  const removePrimaryFromVariation = useCallback(async (variationId: string) => {
    const vs = variations.map(v => v.id === variationId ? { ...v, primary_motion_ids: '' } : { ...v });
    await syncAfterChange(primaryMotions.map(p => ({ ...p })), vs, motionPlanes.map(m => ({ ...m })));
  }, [primaryMotions, variations, motionPlanes, syncAfterChange]);

  const addVariationToPlane = useCallback(async (planeId: string, variationId: string) => {
    const vs = variations.map(v => v.id === variationId ? { ...v, motion_plane_ids: [...(v.motion_plane_ids || []), planeId] } : { ...v });
    await syncAfterChange(primaryMotions.map(p => ({ ...p })), vs, motionPlanes.map(m => ({ ...m })));
  }, [primaryMotions, variations, motionPlanes, syncAfterChange]);

  const removeVariationFromPlane = useCallback(async (planeId: string, variationId: string) => {
    const vs = variations.map(v => v.id === variationId ? { ...v, motion_plane_ids: (v.motion_plane_ids || []).filter(id => id !== planeId) } : { ...v });
    await syncAfterChange(primaryMotions.map(p => ({ ...p })), vs, motionPlanes.map(m => ({ ...m })));
  }, [primaryMotions, variations, motionPlanes, syncAfterChange]);

  // ── Save muscle_targets for child records ──
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
      } else if (tableKeyChild === 'motionPlanes') {
        const mp = motionPlanes.find(r => r.id === recordId);
        if (mp) {
          mp.muscle_targets = newTargets;
          await api.updateRow('motionPlanes', recordId, { ...mp, muscle_targets: newTargets });
          setMotionPlanes(prev => prev.map(r => r.id === recordId ? { ...r, muscle_targets: newTargets } : r));
        }
      }
    } catch (err) {
      console.error('Failed to save muscle_targets:', err);
    }
  }, [variations, primaryMotions, motionPlanes]);

  // ── Grip type operations for primary motions ──
  const addGripTypeToPrimary = useCallback(async (primaryId: string, gripTypeId: string) => {
    const ps = primaryMotions.map(p => {
      if (p.id !== primaryId) return { ...p };
      const existing = p.grip_type_ids || [];
      if (existing.includes(gripTypeId)) return { ...p };
      const configs = p.grip_type_configs || {};
      return {
        ...p,
        grip_type_ids: [...existing, gripTypeId],
        grip_type_configs: { ...configs, [gripTypeId]: configs[gripTypeId] || {} },
      };
    });
    await syncAfterChange(ps, variations.map(v => ({ ...v })), motionPlanes.map(m => ({ ...m })));
  }, [primaryMotions, variations, motionPlanes, syncAfterChange]);

  const removeGripTypeFromPrimary = useCallback(async (primaryId: string, gripTypeId: string) => {
    const ps = primaryMotions.map(p => {
      if (p.id !== primaryId) return { ...p };
      const configs = { ...(p.grip_type_configs || {}) };
      delete configs[gripTypeId];
      return {
        ...p,
        grip_type_ids: (p.grip_type_ids || []).filter(id => id !== gripTypeId),
        grip_type_configs: configs,
      };
    });
    await syncAfterChange(ps, variations.map(v => ({ ...v })), motionPlanes.map(m => ({ ...m })));
  }, [primaryMotions, variations, motionPlanes, syncAfterChange]);

  const saveGripTypeMuscleTargets = useCallback(async (primaryId: string, gripTypeId: string, newTargets: Record<string, unknown>) => {
    const ps = primaryMotions.map(p => {
      if (p.id !== primaryId) return { ...p };
      const configs = { ...(p.grip_type_configs || {}) };
      configs[gripTypeId] = newTargets;
      return { ...p, grip_type_configs: configs };
    });
    const pm = ps.find(p => p.id === primaryId);
    if (pm) {
      try { await api.updateRow('primaryMotions', primaryId, pm); } catch (err) { console.error('Failed to save grip type config:', err); }
    }
    setPrimaryMotions([...ps]);
    if (tableKey === 'primaryMotions' && primaryId === currentRecordId) {
      onFieldsChange({ grip_type_configs: pm?.grip_type_configs || {} });
    }
  }, [primaryMotions, tableKey, currentRecordId, onFieldsChange]);

  // ── Create new variation ──
  const createVariation = useCallback(async (primaryId: string, newData: Record<string, unknown>) => {
    try {
      await api.addRow('primaryMotionVariations', { ...newData, primary_motion_ids: primaryId, motion_plane_ids: [], muscle_targets: {} });
      const [p, v, m] = await Promise.all([
        api.getTable('primaryMotions') as Promise<MotionRecord[]>,
        api.getTable('primaryMotionVariations') as Promise<MotionRecord[]>,
        api.getTable('motionPlanes') as Promise<MotionRecord[]>,
      ]);
      await syncAfterChange(p, v, m);
    } catch (err) { console.error('Failed to create variation:', err); alert('Failed to create variation.'); }
  }, [syncAfterChange]);

  // ── Create new motion plane ──
  const createPlaneForVariation = useCallback(async (variationId: string, newData: Record<string, unknown>) => {
    try {
      await api.addRow('motionPlanes', newData);
      const allPlanes = await api.getTable('motionPlanes') as MotionRecord[];
      const vs = variations.map(v =>
        v.id === variationId ? { ...v, motion_plane_ids: [...(v.motion_plane_ids || []), String(newData.id)] } : { ...v }
      );
      await syncAfterChange(primaryMotions.map(p => ({ ...p })), vs, allPlanes);
    } catch (err) { console.error('Failed to create motion plane:', err); alert('Failed to create motion plane.'); }
  }, [primaryMotions, variations, syncAfterChange]);

  // ── Muscle targets sub-tree props ──
  const mtProps = useMemo(() => ({
    expanded, toggleExpanded: toggle, primaryMuscles, secondaryMuscles, tertiaryMuscles,
  }), [expanded, toggle, primaryMuscles, secondaryMuscles, tertiaryMuscles]);

  if (loading) return <div className="text-xs text-gray-400 py-2">Loading...</div>;

  // =========================================================================
  // Unified tree: always render from Primary Motion root
  // For variations/planes we resolve the parent primary and filter to relevant branches
  // =========================================================================

  // Determine which primary motion(s) to root the tree from, and which
  // variation / plane is "current" so we can highlight it and filter siblings.
  let rootPrimaries: MotionRecord[] = [];
  let focusVariationId: string | null = null;
  let focusPlaneId: string | null = null;
  let orphanVariation: MotionRecord | null = null; // variation with no primary
  let orphanPlane: MotionRecord | null = null;     // plane with no linked variations

  if (tableKey === 'primaryMotions') {
    const pm = primaryMotions.find(p => p.id === currentRecordId);
    if (!pm) return <div className="text-xs text-gray-400 italic">Record not found.</div>;
    rootPrimaries = [pm];
  } else if (tableKey === 'primaryMotionVariations') {
    const cur = variations.find(v => v.id === currentRecordId);
    if (!cur) return <div className="text-xs text-gray-400 italic">Record not found.</div>;
    focusVariationId = currentRecordId;
    if (cur.primary_motion_ids) {
      const pm = primaryMotions.find(p => p.id === cur.primary_motion_ids);
      if (pm) rootPrimaries = [pm];
      else orphanVariation = cur;
    } else {
      orphanVariation = cur;
    }
  } else {
    // motionPlanes
    const curPlane = motionPlanes.find(mp => mp.id === currentRecordId);
    if (!curPlane) return <div className="text-xs text-gray-400 italic">Record not found.</div>;
    focusPlaneId = currentRecordId;
    const parentVars = variations.filter(v => (v.motion_plane_ids || []).includes(currentRecordId));
    if (parentVars.length > 0) {
      const pmIds = [...new Set(parentVars.map(v => v.primary_motion_ids).filter(Boolean))] as string[];
      rootPrimaries = primaryMotions.filter(p => pmIds.includes(p.id));
      // If some parent vars have no primary, set the first as orphan so it still shows
      const orphanVars = parentVars.filter(v => !v.primary_motion_ids);
      if (orphanVars.length > 0 && rootPrimaries.length === 0) {
        focusVariationId = orphanVars[0].id;
        orphanVariation = orphanVars[0];
      }
      if (rootPrimaries.length === 0 && !orphanVariation) {
        orphanPlane = curPlane;
      }
    } else {
      orphanPlane = curPlane;
    }
  }

  // Helper: is this the currently-edited record?
  const isCurrent = (type: MotionTableKey, id: string) => type === tableKey && id === currentRecordId;

  // Helper: get muscle_targets and onChange for a record, using onFieldsChange for the current record
  const mtFor = (type: MotionTableKey, id: string, record: MotionRecord) => {
    if (isCurrent(type, id)) {
      return { targets: muscleTargets, onChange: (v: Record<string, unknown>) => onFieldsChange({ muscle_targets: v }) };
    }
    return { targets: (record.muscle_targets || {}) as Record<string, unknown>, onChange: (v: Record<string, unknown>) => saveChildMuscleTargets(type, id, v) };
  };

  // Render a single plane node
  const renderPlane = (mp: MotionRecord, vId: string, _keyPrefix: string) => {
    const current = isCurrent('motionPlanes', mp.id);
    const mt = mtFor('motionPlanes', mp.id, mp);
    const planeMtKey = `mt-plane-${mp.id}`;
    return (
      <div key={mp.id} className={`rounded border overflow-hidden ${current ? 'ring-2 ring-blue-400' : 'bg-white'}`}>
        <div className={`flex items-center gap-2 px-2 py-1 ${current ? 'bg-blue-100' : 'bg-blue-50/60'}`}>
          <div className="flex items-center gap-2 flex-shrink-0">
            {current ? (
              <span className="text-xs font-bold text-blue-800">{mp.label}</span>
            ) : (
              <Link to="/table/motionPlanes" className="text-xs font-medium text-blue-700 hover:underline">{mp.label}</Link>
            )}
            <span className="text-[10px] text-gray-400">{mp.id}</span>
          </div>
          <MuscleTargetsToggle mtKey={planeMtKey} targets={mt.targets} primaryMuscles={primaryMuscles} secondaryMuscles={secondaryMuscles} tertiaryMuscles={tertiaryMuscles} expanded={expanded} toggle={toggle} />
          <button type="button" onClick={() => removePlaneFromVariation(vId, mp.id)}
            className="ml-auto text-[10px] text-red-400 hover:text-red-600 flex-shrink-0">×</button>
        </div>
        {expanded.has(planeMtKey) && (
          <div className="px-2 py-1 border-t bg-red-100">
            <MuscleTargetsSubtree targets={mt.targets} depth={2} onChange={mt.onChange} {...mtProps} />
          </div>
        )}
      </div>
    );
  };

  // Render a single variation node with its planes
  const renderVariation = (v: MotionRecord, pmId: string, keyPrefix: string) => {
    const vKey = `${keyPrefix}-var-${v.id}`;
    const isVExp = expanded.has(vKey);
    const current = isCurrent('primaryMotionVariations', v.id);
    const mt = mtFor('primaryMotionVariations', v.id, v);
    const vPlanes = motionPlanes.filter(mp => (v.motion_plane_ids || []).includes(mp.id));
    const availPlanes = motionPlanes.filter(mp => !(v.motion_plane_ids || []).includes(mp.id));
    // When viewing from motionPlanes table, filter to only show the focused plane
    const displayPlanes = focusPlaneId ? vPlanes.filter(mp => mp.id === focusPlaneId) : vPlanes;
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
          <MuscleTargetsToggle mtKey={varMtKey} targets={mt.targets} primaryMuscles={primaryMuscles} secondaryMuscles={secondaryMuscles} tertiaryMuscles={tertiaryMuscles} expanded={expanded} toggle={toggle} />
          <button type="button" onClick={() => removeVariationFromPrimary(v.id)}
            className="ml-auto text-[10px] text-red-500 hover:text-red-700 px-1 flex-shrink-0">Remove</button>
        </div>
        {expanded.has(varMtKey) && (
          <div className="px-2 py-1 border-b bg-red-100">
            <MuscleTargetsSubtree targets={mt.targets} depth={1} onChange={mt.onChange} {...mtProps} />
          </div>
        )}
        {isVExp && (
          <div className="pl-4 pr-2 py-1.5 space-y-1.5">
            {displayPlanes.map(mp => renderPlane(mp, v.id, `${keyPrefix}-var-${v.id}`))}

            {/* Add plane (only when not filtering to a specific plane) */}
            {!focusPlaneId && (
              <PlaneAdder availablePlanes={availPlanes} allMotionPlanes={motionPlanes}
                onAdd={planeId => addPlaneToVariation(v.id, planeId)}
                onCreate={data => createPlaneForVariation(v.id, data)} />
            )}
          </div>
        )}
      </div>
    );
  };

  // Render a full primary motion tree
  const renderPrimaryMotionTree = (pm: MotionRecord) => {
    const rootKey = `pm-${pm.id}`;
    const isRootExp = expanded.has(rootKey);
    const current = isCurrent('primaryMotions', pm.id);
    const mt = mtFor('primaryMotions', pm.id, pm);
    const relVars = variations.filter(v => v.primary_motion_ids === pm.id);
    // When viewing from variations/planes table, filter to show only relevant branches
    const displayVars = focusVariationId
      ? relVars.filter(v => v.id === focusVariationId)
      : focusPlaneId
        ? relVars.filter(v => (v.motion_plane_ids || []).includes(focusPlaneId!))
        : relVars;
    const unlinkedVars = variations.filter(v => !v.primary_motion_ids);

    const pmMtKey = `mt-pm-${pm.id}`;
    const pmGtKey = `gt-pm-${pm.id}`;
    const pmGripIds = pm.grip_type_ids || [];
    const pmGripConfigs = pm.grip_type_configs || {};
    const availableGripTypes = gripTypes.filter(g => !pmGripIds.includes(g.id));
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
          <MuscleTargetsToggle mtKey={pmMtKey} targets={mt.targets} primaryMuscles={primaryMuscles} secondaryMuscles={secondaryMuscles} tertiaryMuscles={tertiaryMuscles} expanded={expanded} toggle={toggle} />
          <GripTypesToggle gtKey={pmGtKey} gripTypeIds={pmGripIds} gripTypes={gripTypes} expanded={expanded} toggle={toggle} />
        </div>
        {expanded.has(pmMtKey) && (
          <div className="px-3 py-1 border-b bg-red-100">
            <MuscleTargetsSubtree targets={mt.targets} depth={0} onChange={mt.onChange} {...mtProps} />
          </div>
        )}
        {expanded.has(pmGtKey) && (
          <div className="px-3 py-2 border-b bg-emerald-50">
            {pmGripIds.length === 0 && (
              <div className="text-[10px] text-gray-400 italic mb-1">No grip types linked yet.</div>
            )}
            {pmGripIds.map(gId => {
              const gt = gripTypes.find(g => g.id === gId);
              const gtLabel = gt?.label || gId;
              const gtMtKey = `mt-grip-${pm.id}-${gId}`;
              const gtTargets = (pmGripConfigs[gId] || {}) as Record<string, unknown>;
              const isGtMtExp = expanded.has(gtMtKey);
              return (
                <div key={gId} className="rounded border bg-white overflow-hidden mb-1.5 last:mb-0">
                  <div className="flex items-center gap-2 px-2 py-1 bg-emerald-50/80">
                    <span className="text-xs font-medium text-emerald-800">{gtLabel}</span>
                    <span className="text-[10px] text-gray-400">{gId}</span>
                    <MuscleTargetsToggle
                      mtKey={gtMtKey}
                      targets={gtTargets}
                      primaryMuscles={primaryMuscles}
                      secondaryMuscles={secondaryMuscles}
                      tertiaryMuscles={tertiaryMuscles}
                      expanded={expanded}
                      toggle={toggle}
                    />
                    <button type="button" onClick={() => removeGripTypeFromPrimary(pm.id, gId)}
                      className="ml-auto text-[10px] text-red-400 hover:text-red-600 flex-shrink-0">×</button>
                  </div>
                  {isGtMtExp && (
                    <div className="px-2 py-1 border-t bg-red-100">
                      <MuscleTargetsSubtree
                        targets={gtTargets}
                        depth={0}
                        onChange={(v: Record<string, unknown>) => saveGripTypeMuscleTargets(pm.id, gId, v)}
                        {...mtProps}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            {availableGripTypes.length > 0 && (
              <select
                value=""
                onChange={async e => { if (e.target.value) await addGripTypeToPrimary(pm.id, e.target.value); }}
                className="mt-1 px-1 py-0.5 border border-emerald-300 rounded text-[10px] text-emerald-600 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">Add Grip Type...</option>
                {availableGripTypes.map(g => <option key={g.id} value={g.id}>{g.label} ({g.id})</option>)}
              </select>
            )}
          </div>
        )}

        {isRootExp && (
          <div className="pl-4 pr-2 py-2 space-y-2">
            {displayVars.map(v => renderVariation(v, pm.id, `pm-${pm.id}`))}

            {/* Add variation controls (only when viewing from primaryMotions) */}
            {!focusVariationId && !focusPlaneId && (
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

            {/* For planes: add this plane to another variation under this primary */}
            {focusPlaneId && (() => {
              const availVarsForPm = relVars.filter(v => !(v.motion_plane_ids || []).includes(focusPlaneId!));
              return availVarsForPm.length > 0 ? (
                <select value="" onChange={async e => {
                  if (e.target.value) await addPlaneToVariation(e.target.value, focusPlaneId!);
                }}
                  className="px-1 py-0.5 border border-blue-300 rounded text-[10px] text-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none">
                  <option value="">Add to another variation...</option>
                  {availVarsForPm.map(v => <option key={v.id} value={v.id}>{v.label} ({v.id})</option>)}
                </select>
              ) : null;
            })()}
          </div>
        )}
      </div>
    );
  };

  // Render an orphan variation (no parent primary motion)
  const renderOrphanVariation = (v: MotionRecord) => {
    const rootKey = `orphan-var-${v.id}`;
    const isRootExp = expanded.has(rootKey);
    const mt = mtFor('primaryMotionVariations', v.id, v);
    const vPlanes = motionPlanes.filter(mp => (v.motion_plane_ids || []).includes(mp.id));
    const availPlanes = motionPlanes.filter(mp => !(v.motion_plane_ids || []).includes(mp.id));
    const displayPlanes = focusPlaneId ? vPlanes.filter(mp => mp.id === focusPlaneId) : vPlanes;
    const hiddenPlaneCount = vPlanes.length - displayPlanes.length;
    const availPrimaries = primaryMotions;

    const orphanVarMtKey = `mt-orphan-var-${v.id}`;
    return (
      <div className="border rounded-lg bg-gray-50 overflow-hidden">
        <div className="px-3 py-2 bg-amber-50 border-b flex items-center gap-2">
          <button type="button" onClick={() => toggle(rootKey)} className="text-xs text-gray-500 w-4 flex-shrink-0">{isRootExp ? '▼' : '▶'}</button>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-amber-600 italic">No Primary Motion</span>
            <span className="text-xs text-gray-400">→</span>
            <span className="text-sm font-bold text-gray-900">{v.label}</span>
            <span className="text-xs text-gray-400">{v.id}</span>
          </div>
          <MuscleTargetsToggle mtKey={orphanVarMtKey} targets={mt.targets} primaryMuscles={primaryMuscles} secondaryMuscles={secondaryMuscles} tertiaryMuscles={tertiaryMuscles} expanded={expanded} toggle={toggle} />
        </div>
        {expanded.has(orphanVarMtKey) && (
          <div className="px-3 py-1 border-b bg-red-100">
            <MuscleTargetsSubtree targets={mt.targets} depth={0} onChange={mt.onChange} {...mtProps} />
          </div>
        )}

        {isRootExp && (
          <div className="pl-4 pr-2 py-2 space-y-2">
            {displayPlanes.map(mp => renderPlane(mp, v.id, `orphan-var-${v.id}`))}
            {hiddenPlaneCount > 0 && (
              <div className="text-[10px] text-gray-400 italic pl-1">+ {hiddenPlaneCount} other plane{hiddenPlaneCount > 1 ? 's' : ''}</div>
            )}

            {!focusPlaneId && (
              <PlaneAdder availablePlanes={availPlanes} allMotionPlanes={motionPlanes}
                onAdd={planeId => addPlaneToVariation(v.id, planeId)}
                onCreate={data => createPlaneForVariation(v.id, data)} />
            )}

            <select value="" onChange={async e => { if (e.target.value) await setPrimaryForVariation(v.id, e.target.value); }}
              className="px-1 py-0.5 border border-blue-300 rounded text-[10px] text-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none">
              <option value="">Set Primary Motion...</option>
              {availPrimaries.map(p => <option key={p.id} value={p.id}>{p.label} ({p.id})</option>)}
            </select>
          </div>
        )}
      </div>
    );
  };

  // Render orphan plane (no linked variations)
  const renderOrphanPlane = (mp: MotionRecord) => {
    const rootKey = `orphan-plane-${mp.id}`;
    const isRootExp = expanded.has(rootKey);
    const mt = mtFor('motionPlanes', mp.id, mp);
    const unlinkedVars = variations.filter(v => !(v.motion_plane_ids || []).includes(mp.id));

    const orphanPlaneMtKey = `mt-orphan-plane-${mp.id}`;
    return (
      <div className="border rounded-lg bg-gray-50 overflow-hidden">
        <div className="px-3 py-2 bg-amber-50 border-b flex items-center gap-2">
          <button type="button" onClick={() => toggle(rootKey)} className="text-xs text-gray-500 w-4 flex-shrink-0">{isRootExp ? '▼' : '▶'}</button>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-amber-600 italic">No linked variations</span>
            <span className="text-xs text-gray-400">→</span>
            <span className="text-sm font-bold text-blue-800">{mp.label}</span>
            <span className="text-xs text-gray-400">{mp.id}</span>
          </div>
          <MuscleTargetsToggle mtKey={orphanPlaneMtKey} targets={mt.targets} primaryMuscles={primaryMuscles} secondaryMuscles={secondaryMuscles} tertiaryMuscles={tertiaryMuscles} expanded={expanded} toggle={toggle} />
        </div>
        {expanded.has(orphanPlaneMtKey) && (
          <div className="px-3 py-1 border-b bg-red-100">
            <MuscleTargetsSubtree targets={mt.targets} depth={0} onChange={mt.onChange} {...mtProps} />
          </div>
        )}

        {isRootExp && (
          <div className="pl-4 pr-2 py-2 space-y-2">
            <select value="" onChange={async e => { if (e.target.value) await addVariationToPlane(mp.id, e.target.value); }}
              className="px-1 py-0.5 border border-blue-300 rounded text-[10px] text-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none">
              <option value="">Add Variation...</option>
              {unlinkedVars.map(v => <option key={v.id} value={v.id}>{v.label} ({v.id})</option>)}
            </select>
          </div>
        )}
      </div>
    );
  };

  // For variations: primary motions that don't already have this variation
  const addToPrimaryOptions = focusVariationId
    ? primaryMotions.filter(pm => {
        const cur = variations.find(v => v.id === focusVariationId);
        return cur && pm.id !== cur.primary_motion_ids;
      })
    : [];

  // Main render
  return (
    <div className="space-y-2">
      {rootPrimaries.map(pm => renderPrimaryMotionTree(pm))}
      {orphanVariation && renderOrphanVariation(orphanVariation)}
      {orphanPlane && renderOrphanPlane(orphanPlane)}

      {/* For variations: option to link to a different primary motion */}
      {focusVariationId && addToPrimaryOptions.length > 0 && (
        <select value="" onChange={async e => {
          if (e.target.value) await setPrimaryForVariation(focusVariationId!, e.target.value);
        }}
          className="px-1 py-0.5 border border-blue-300 rounded text-[10px] text-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none">
          <option value="">{rootPrimaries.length > 0 ? 'Move to another Primary Motion...' : 'Set Primary Motion...'}</option>
          {addToPrimaryOptions.map(p => <option key={p.id} value={p.id}>{p.label} ({p.id})</option>)}
        </select>
      )}

      {/* For planes: two-step picker to add to a variation under a different primary motion */}
      {focusPlaneId && (
        <TwoStepVariationPicker
          primaryMotions={primaryMotions}
          variations={variations}
          focusPlaneId={focusPlaneId}
          rootPrimaryIds={rootPrimaries.map(p => p.id)}
          onAdd={async (variationId) => { await addPlaneToVariation(variationId, focusPlaneId!); }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TwoStepVariationPicker: pick a primary motion then a variation
// ---------------------------------------------------------------------------
function TwoStepVariationPicker({ primaryMotions, variations, focusPlaneId, rootPrimaryIds, onAdd }: {
  primaryMotions: MotionRecord[];
  variations: MotionRecord[];
  focusPlaneId: string;
  rootPrimaryIds: string[];
  onAdd: (variationId: string) => Promise<void>;
}) {
  const [selectedPmId, setSelectedPmId] = useState<string>('');

  // Only show primary motions that have at least one variation not already linked to this plane
  const availPrimaries = primaryMotions.filter(pm => {
    // Exclude primaries already shown as root containers
    if (rootPrimaryIds.includes(pm.id)) return false;
    const pmVars = variations.filter(v => v.primary_motion_ids === pm.id);
    return pmVars.some(v => !(v.motion_plane_ids || []).includes(focusPlaneId));
  });

  const selectedPmVars = selectedPmId
    ? variations.filter(v => v.primary_motion_ids === selectedPmId && !(v.motion_plane_ids || []).includes(focusPlaneId))
    : [];

  if (availPrimaries.length === 0) return null;

  return (
    <div className="flex gap-1.5 items-center">
      <select value={selectedPmId} onChange={e => setSelectedPmId(e.target.value)}
        className="px-1 py-0.5 border border-blue-300 rounded text-[10px] text-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none">
        <option value="">Select Primary Motion...</option>
        {availPrimaries.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>
      {selectedPmId && (
        <select value="" onChange={async e => {
          if (e.target.value) {
            await onAdd(e.target.value);
            setSelectedPmId('');
          }
        }}
          className="px-1 py-0.5 border border-blue-300 rounded text-[10px] text-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none">
          <option value="">Select Variation...</option>
          {selectedPmVars.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
        </select>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlaneAdder sub-component
// ---------------------------------------------------------------------------
function PlaneAdder({ availablePlanes, allMotionPlanes, onAdd, onCreate }: {
  availablePlanes: MotionRecord[];
  allMotionPlanes: MotionRecord[];
  onAdd: (id: string) => Promise<void>;
  onCreate: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [newPlane, setNewPlane] = useState({ id: '', label: '', sub_label: '', short_description: '' });
  const [creating, setCreating] = useState(false);

  if (showCreate) {
    return (
      <div className="border rounded p-2 space-y-1.5 bg-blue-50/50">
        <div className="flex gap-1.5">
          <input type="text" placeholder="ID" value={newPlane.id} onChange={e => setNewPlane({ ...newPlane, id: e.target.value })}
            className="flex-1 px-1.5 py-0.5 border rounded text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <input type="text" placeholder="Label" value={newPlane.label} onChange={e => setNewPlane({ ...newPlane, label: e.target.value })}
            className="flex-1 px-1.5 py-0.5 border rounded text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div className="flex gap-1.5">
          <button type="button" disabled={!newPlane.id || !newPlane.label || creating}
            onClick={async () => { setCreating(true); await onCreate({ ...newPlane, common_names: [], sort_order: 0, is_active: true }); setNewPlane({ id: '', label: '', sub_label: '', short_description: '' }); setShowCreate(false); setCreating(false); }}
            className="px-2 py-0.5 text-[10px] bg-blue-600 text-white rounded disabled:opacity-50">{creating ? '...' : 'Create'}</button>
          <button type="button" onClick={() => setShowCreate(false)} className="px-2 py-0.5 text-[10px] bg-gray-200 rounded">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-1.5 items-stretch">
      <select value="" onChange={async e => { if (e.target.value) await onAdd(e.target.value); }}
        className="px-1 py-0.5 border border-blue-300 rounded text-[10px] text-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
        <option value="">Add Motion Plane...</option>
        {availablePlanes.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>
      <button type="button" onClick={() => setShowCreate(true)}
        className="flex-shrink-0 whitespace-nowrap px-2 py-1 text-[10px] bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100">
        + New
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// InlineVariationCreator sub-component
// ---------------------------------------------------------------------------
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
            await onCreate({ id: newVar.id, label: newVar.label, common_names: [], short_description: newVar.short_description, muscle_targets: {}, sort_order: 0, is_active: true });
            setNewVar({ id: '', label: '', short_description: '' }); setShowForm(false); setCreating(false);
          }}
          className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded disabled:opacity-50">{creating ? '...' : 'Create'}</button>
        <button type="button" onClick={() => setShowForm(false)} className="px-2 py-0.5 text-xs bg-gray-200 rounded">Cancel</button>
      </div>
    </div>
  );
}
