import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api';

interface MuscleTargetTreeProps {
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
  /** When true, use smaller typography and spacing (e.g. for Baseline card in Matrix V2) */
  compact?: boolean;
}

interface MuscleOption {
  id: string;
  label: string;
}

function parsePids(m: Record<string, unknown>): string[] {
  const raw = m.parent_ids;
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
}

/**
 * Specialized editor for muscle_targets JSON.
 * Renders a collapsible tree:
 *   Level 1: Primary Muscles (e.g. ARMS)
 *   Level 2: Secondary Muscles (e.g. BICEPS) filtered by parent primary
 *   Level 3: Tertiary Muscles (e.g. INNER_BICEP) filtered by parent secondary
 *   Each node has a _score number input.
 */
export default function MuscleTargetTree({ value, onChange, compact = false }: MuscleTargetTreeProps) {
  const [allMuscles, setAllMuscles] = useState<Record<string, unknown>[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.getTable('muscles').then((data) => {
      setAllMuscles((data as Record<string, unknown>[]) || []);
    }).catch(console.error);
  }, []);

  const muscleMap = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    for (const m of allMuscles) map.set(m.id as string, m);
    return map;
  }, [allMuscles]);

  const primaryMuscles = useMemo<MuscleOption[]>(() =>
    allMuscles
      .filter(m => parsePids(m).length === 0)
      .map(m => ({ id: m.id as string, label: m.label as string })),
    [allMuscles]
  );

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const data = (value && typeof value === 'object' && !Array.isArray(value)) ? value : {};

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
    if (isNaN(score)) return;
    const newData = JSON.parse(JSON.stringify(data));
    let node = newData;
    for (let i = 0; i < path.length; i++) {
      if (!node[path[i]] || typeof node[path[i]] !== 'object') {
        node[path[i]] = { _score: 0 };
      }
      node = node[path[i]];
    }
    if (typeof node === 'object' && node !== null) {
      node._score = score;
    }
    recomputeParentScores(newData);
    onChange(newData);
  };

  const addPrimary = (id: string) => {
    if (data[id]) return;
    const newData = { ...data, [id]: { _score: 0 } };
    onChange(newData);
  };

  const addSecondary = (primaryId: string, secondaryId: string) => {
    const newData = JSON.parse(JSON.stringify(data));
    if (!newData[primaryId]) newData[primaryId] = { _score: 0 };
    if (!newData[primaryId][secondaryId]) {
      newData[primaryId][secondaryId] = { _score: 0 };
    }
    recomputeParentScores(newData);
    onChange(newData);
  };

  const addTertiary = (primaryId: string, secondaryId: string, tertiaryId: string) => {
    const newData = JSON.parse(JSON.stringify(data));
    if (!newData[primaryId]) newData[primaryId] = { _score: 0 };
    if (!newData[primaryId][secondaryId]) newData[primaryId][secondaryId] = { _score: 0 };
    if (!newData[primaryId][secondaryId][tertiaryId]) {
      newData[primaryId][secondaryId][tertiaryId] = { _score: 0 };
    }
    recomputeParentScores(newData);
    onChange(newData);
  };

  const removeKey = (path: string[]) => {
    const newData = JSON.parse(JSON.stringify(data));
    let node = newData;
    for (let i = 0; i < path.length - 1; i++) {
      if (!node[path[i]]) return;
      node = node[path[i]];
    }
    delete node[path[path.length - 1]];
    recomputeParentScores(newData);
    onChange(newData);
  };

  const getSecondariesForPrimary = (primaryId: string): MuscleOption[] => {
    return allMuscles
      .filter((m) => parsePids(m).includes(primaryId))
      .map((m) => ({ id: m.id as string, label: m.label as string }));
  };

  const getTertiariesForSecondary = (secondaryId: string): MuscleOption[] => {
    return allMuscles
      .filter((m) => parsePids(m).includes(secondaryId))
      .map((m) => ({ id: m.id as string, label: m.label as string }));
  };

  const getLabel = (id: string): string => (muscleMap.get(id)?.label as string) || id;

  const ScoreInput = ({ path, currentScore, computed }: { path: string[]; currentScore: number; computed?: boolean }) => {
    const [localValue, setLocalValue] = useState<string>(String(currentScore));
    const [isFocused, setIsFocused] = useState(false);
    
    useEffect(() => {
      if (!isFocused) {
        setLocalValue(String(currentScore));
      }
    }, [currentScore, isFocused]);

    const inputSize = compact ? 'w-12 px-0.5 py-0 text-[10px]' : 'w-16 px-1 py-0.5 text-xs';

    if (computed) {
      return (
        <span className={`${compact ? 'w-12 px-0.5 py-0 text-[10px]' : 'w-16 px-1 py-0.5 text-xs'} bg-gray-100 rounded text-center text-gray-500 italic inline-block`}
          title="Auto-computed from children">{currentScore}</span>
      );
    }

    return (
      <input
        type="number"
        step="0.1"
        value={localValue}
        onFocus={() => setIsFocused(true)}
        onChange={(e) => {
          const val = e.target.value;
          setLocalValue(val);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          const numVal = parseFloat(e.target.value);
          if (isNaN(numVal) || e.target.value === '') {
            setLocalValue(String(currentScore));
          } else {
            setScore(path, numVal);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
        className={`${inputSize} border rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
      />
    );
  };

  const activePrimaries = Object.keys(data).filter((k) => k !== '_score');
  const unusedPrimaries = primaryMuscles.filter((pm) => !activePrimaries.includes(pm.id));

  return (
    <div className={`border rounded bg-gray-50 ${compact ? 'p-1.5 space-y-1' : 'p-3 space-y-2'}`}>
      {activePrimaries.map((primaryId) => {
        const primaryNode = data[primaryId] as Record<string, unknown> | undefined;
        if (!primaryNode || typeof primaryNode !== 'object') return null;
        const primaryLabel = getLabel(primaryId);
        const primaryScore = (primaryNode._score as number) ?? 0;
        const secondaryKeys = Object.keys(primaryNode).filter((k) => k !== '_score');
        const isExpanded = expanded.has(primaryId);
        const availableSecondaries = getSecondariesForPrimary(primaryId).filter(
          (s) => !secondaryKeys.includes(s.id)
        );

        return (
          <div key={primaryId} className="border rounded bg-white">
            <div className={`flex items-center bg-red-50 ${compact ? 'px-2 py-1 gap-1.5' : 'px-3 py-2 gap-2'}`}>
              <button
                type="button"
                onClick={() => toggleExpanded(primaryId)}
                className={`text-gray-500 flex-shrink-0 ${compact ? 'text-[10px] w-3' : 'text-xs w-4'}`}
              >
                {isExpanded ? '▼' : '▶'}
              </button>
              <span className={`font-medium text-red-800 truncate ${compact ? 'text-[11px]' : 'text-sm'}`}>{primaryLabel}</span>
              <span className={compact ? 'text-[10px] text-gray-400' : 'text-xs text-gray-400'}>_score:</span>
              <ScoreInput path={[primaryId]} currentScore={primaryScore} computed={secondaryKeys.length > 0} />
              <button
                type="button"
                onClick={() => removeKey([primaryId])}
                className={`ml-auto text-red-400 hover:text-red-600 flex-shrink-0 ${compact ? 'text-[10px]' : 'text-xs'}`}
              >
                {compact ? '✕' : 'Remove'}
              </button>
            </div>

            {isExpanded && (
              <div className={compact ? 'pl-4 pr-1.5 py-1 space-y-0.5' : 'pl-6 pr-3 py-2 space-y-1.5'}>
                {secondaryKeys.map((secondaryId) => {
                  const secondaryNode = primaryNode[secondaryId] as Record<string, unknown> | undefined;
                  if (!secondaryNode || typeof secondaryNode !== 'object') return null;
                  const secondaryLabel = getLabel(secondaryId);
                  const secondaryScore = (secondaryNode._score as number) ?? 0;
                  const tertiaryKeys = Object.keys(secondaryNode).filter((k) => k !== '_score');
                  const subKey = `${primaryId}.${secondaryId}`;
                  const isSubExpanded = expanded.has(subKey);
                  const availableTertiaries = getTertiariesForSecondary(secondaryId).filter(
                    (t) => !tertiaryKeys.includes(t.id)
                  );

                  const hasTertiaries = tertiaryKeys.length > 0;

                  return (
                    <div key={secondaryId} className={`border rounded bg-gray-50 ${compact ? 'rounded-sm' : ''}`}>
                      <div className={`flex items-center gap-1.5 bg-red-50 ${compact ? 'px-1.5 py-0.5' : 'px-2 py-1.5'}`}>
                        {hasTertiaries ? (
                          <button
                            type="button"
                            onClick={() => toggleExpanded(subKey)}
                            className={`text-gray-500 flex-shrink-0 ${compact ? 'text-[10px] w-3' : 'text-xs w-4'}`}
                          >
                            {isSubExpanded ? '▼' : '▶'}
                          </button>
                        ) : (
                          <span className={`text-gray-400 flex items-center justify-center flex-shrink-0 ${compact ? 'text-[8px] w-3' : 'text-[10px] w-4'}`}>●</span>
                        )}
                        <span className={`text-red-800 truncate ${compact ? 'text-[11px]' : 'text-sm'}`}>{secondaryLabel}</span>
                        <span className={compact ? 'text-[10px] text-gray-400' : 'text-xs text-gray-400'}>_score:</span>
                        <ScoreInput path={[primaryId, secondaryId]} currentScore={secondaryScore} computed={tertiaryKeys.length > 0} />
                        <button
                          type="button"
                          onClick={() => removeKey([primaryId, secondaryId])}
                          className={`ml-auto text-red-400 hover:text-red-600 flex-shrink-0 ${compact ? 'text-[10px]' : 'text-xs'}`}
                        >
                          x
                        </button>
                      </div>

                      {hasTertiaries && isSubExpanded && (
                        <div className={compact ? 'pl-4 pr-1 py-0.5 space-y-0.5' : 'pl-6 pr-2 py-1.5 space-y-1'}>
                          {tertiaryKeys.map((tertiaryId) => {
                            const tertiaryNode = secondaryNode[tertiaryId] as Record<string, unknown> | undefined;
                            const tertiaryScore = (tertiaryNode?._score as number) ?? 0;
                            const tertiaryLabel = getLabel(tertiaryId);

                            return (
                              <div key={tertiaryId} className={`flex items-center gap-1.5 bg-red-50 rounded ${compact ? 'px-1.5 py-0.5' : 'px-2 py-1'}`}>
                                <span className={`text-red-800 truncate ${compact ? 'text-[10px]' : 'text-xs'}`}>{tertiaryLabel}</span>
                                <span className={compact ? 'text-[10px] text-gray-400' : 'text-xs text-gray-400'}>_score:</span>
                                <ScoreInput
                                  path={[primaryId, secondaryId, tertiaryId]}
                                  currentScore={tertiaryScore}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeKey([primaryId, secondaryId, tertiaryId])}
                                  className={`ml-auto text-red-400 hover:text-red-600 flex-shrink-0 ${compact ? 'text-[10px]' : 'text-xs'}`}
                                >
                                  x
                                </button>
                              </div>
                            );
                          })}

                          {availableTertiaries.length > 0 && (
                            <select
                              onChange={(e) => {
                                if (e.target.value) addTertiary(primaryId, secondaryId, e.target.value);
                                e.target.value = '';
                              }}
                              className={`border border-red-300 rounded text-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 ${compact ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'}`}
                              defaultValue=""
                            >
                              <option value="">+ Add tertiary...</option>
                              {availableTertiaries.map((t) => (
                                <option key={t.id} value={t.id}>{t.label}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {availableSecondaries.length > 0 && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) addSecondary(primaryId, e.target.value);
                      e.target.value = '';
                    }}
                    className={`border border-red-300 rounded text-gray-500 focus:outline-none focus:ring-1 focus:ring-red-500 ${compact ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'}`}
                    defaultValue=""
                  >
                    <option value="">+ Add secondary...</option>
                    {availableSecondaries.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        );
      })}

      {unusedPrimaries.length > 0 && (
        <select
          onChange={(e) => {
            if (e.target.value) addPrimary(e.target.value);
            e.target.value = '';
          }}
          className={`border border-red-300 rounded text-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 ${compact ? 'text-[10px] px-1.5 py-0.5' : 'text-sm px-2 py-1.5'}`}
          defaultValue=""
        >
          <option value="">+ Add primary muscle...</option>
          {unusedPrimaries.map((pm) => (
            <option key={pm.id} value={pm.id}>{pm.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}
