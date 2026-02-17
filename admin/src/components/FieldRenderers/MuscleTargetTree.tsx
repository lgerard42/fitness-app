import React, { useState, useEffect } from 'react';
import { api } from '../../api';

interface MuscleTargetTreeProps {
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}

interface MuscleOption {
  id: string;
  label: string;
}

/**
 * Specialized editor for muscle_targets JSON.
 * Renders a collapsible tree:
 *   Level 1: Primary Muscles (e.g. ARMS)
 *   Level 2: Secondary Muscles (e.g. BICEPS) filtered by parent primary
 *   Level 3: Tertiary Muscles (e.g. INNER_BICEP) filtered by parent secondary
 *   Each node has a _score number input.
 */
export default function MuscleTargetTree({ value, onChange }: MuscleTargetTreeProps) {
  const [primaryMuscles, setPrimaryMuscles] = useState<MuscleOption[]>([]);
  const [secondaryMuscles, setSecondaryMuscles] = useState<Record<string, unknown>[]>([]);
  const [tertiaryMuscles, setTertiaryMuscles] = useState<Record<string, unknown>[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      api.getTable('primaryMuscles'),
      api.getTable('secondaryMuscles'),
      api.getTable('tertiaryMuscles'),
    ]).then(([pm, sm, tm]) => {
      setPrimaryMuscles((pm as MuscleOption[]) || []);
      setSecondaryMuscles((sm as Record<string, unknown>[]) || []);
      setTertiaryMuscles((tm as Record<string, unknown>[]) || []);
    }).catch(console.error);
  }, []);

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const data = (value && typeof value === 'object' && !Array.isArray(value)) ? value : {};

  const setScore = (path: string[], score: number) => {
    const newData = JSON.parse(JSON.stringify(data));
    let node = newData;
    for (let i = 0; i < path.length - 1; i++) {
      if (!node[path[i]] || typeof node[path[i]] !== 'object') {
        node[path[i]] = { _score: 0 };
      }
      node = node[path[i]];
    }
    const last = path[path.length - 1];
    if (!node[last] || typeof node[last] !== 'object') {
      node[last] = { _score: score };
    } else {
      node[last]._score = score;
    }
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
    onChange(newData);
  };

  const addTertiary = (primaryId: string, secondaryId: string, tertiaryId: string) => {
    const newData = JSON.parse(JSON.stringify(data));
    if (!newData[primaryId]) newData[primaryId] = { _score: 0 };
    if (!newData[primaryId][secondaryId]) newData[primaryId][secondaryId] = { _score: 0 };
    if (!newData[primaryId][secondaryId][tertiaryId]) {
      newData[primaryId][secondaryId][tertiaryId] = { _score: 0 };
    }
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
    onChange(newData);
  };

  const getSecondariesForPrimary = (primaryId: string): MuscleOption[] => {
    return secondaryMuscles
      .filter((sm) => {
        const ids = sm.primary_muscle_ids;
        return Array.isArray(ids) ? ids.includes(primaryId) : false;
      })
      .map((sm) => ({ id: sm.id as string, label: sm.label as string }));
  };

  const getTertiariesForSecondary = (secondaryId: string): MuscleOption[] => {
    return tertiaryMuscles
      .filter((tm) => {
        const ids = tm.secondary_muscle_ids;
        return Array.isArray(ids) ? ids.includes(secondaryId) : false;
      })
      .map((tm) => ({ id: tm.id as string, label: tm.label as string }));
  };

  const ScoreInput = ({ path, currentScore }: { path: string[]; currentScore: number }) => (
    <input
      type="number"
      step="0.1"
      value={currentScore}
      onChange={(e) => setScore(path, parseFloat(e.target.value) || 0)}
      className="w-16 px-1 py-0.5 border rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
    />
  );

  // List of active primary keys in the data
  const activePrimaries = Object.keys(data).filter((k) => k !== '_score');
  const unusedPrimaries = primaryMuscles.filter((pm) => !activePrimaries.includes(pm.id));

  return (
    <div className="border rounded p-3 space-y-2 bg-gray-50">
      {activePrimaries.map((primaryId) => {
        const primaryNode = data[primaryId] as Record<string, unknown> | undefined;
        if (!primaryNode || typeof primaryNode !== 'object') return null;
        const primaryLabel = primaryMuscles.find((pm) => pm.id === primaryId)?.label || primaryId;
        const primaryScore = (primaryNode._score as number) ?? 0;
        const secondaryKeys = Object.keys(primaryNode).filter((k) => k !== '_score');
        const isExpanded = expanded.has(primaryId);
        const availableSecondaries = getSecondariesForPrimary(primaryId).filter(
          (s) => !secondaryKeys.includes(s.id)
        );

        return (
          <div key={primaryId} className="border rounded bg-white">
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50">
              <button
                type="button"
                onClick={() => toggleExpanded(primaryId)}
                className="text-xs text-gray-500 w-4"
              >
                {isExpanded ? '▼' : '▶'}
              </button>
              <span className="font-medium text-sm text-red-800">{primaryLabel}</span>
              <span className="text-xs text-gray-400">_score:</span>
              <ScoreInput path={[primaryId, '_score']} currentScore={primaryScore} />
              <button
                type="button"
                onClick={() => removeKey([primaryId])}
                className="ml-auto text-xs text-red-400 hover:text-red-600"
              >
                Remove
              </button>
            </div>

            {isExpanded && (
              <div className="pl-6 pr-3 py-2 space-y-1.5">
                {secondaryKeys.map((secondaryId) => {
                  const secondaryNode = primaryNode[secondaryId] as Record<string, unknown> | undefined;
                  if (!secondaryNode || typeof secondaryNode !== 'object') return null;
                  const secondaryLabel =
                    secondaryMuscles.find((sm) => sm.id === secondaryId)?.label as string || secondaryId;
                  const secondaryScore = (secondaryNode._score as number) ?? 0;
                  const tertiaryKeys = Object.keys(secondaryNode).filter((k) => k !== '_score');
                  const subKey = `${primaryId}.${secondaryId}`;
                  const isSubExpanded = expanded.has(subKey);
                  const availableTertiaries = getTertiariesForSecondary(secondaryId).filter(
                    (t) => !tertiaryKeys.includes(t.id)
                  );

                  return (
                    <div key={secondaryId} className="border rounded bg-gray-50">
                      <div className="flex items-center gap-2 px-2 py-1.5 bg-blue-50">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(subKey)}
                          className="text-xs text-gray-500 w-4"
                        >
                          {isSubExpanded ? '▼' : '▶'}
                        </button>
                        <span className="text-sm text-blue-800">{secondaryLabel}</span>
                        <span className="text-xs text-gray-400">_score:</span>
                        <ScoreInput path={[primaryId, secondaryId, '_score']} currentScore={secondaryScore} />
                        <button
                          type="button"
                          onClick={() => removeKey([primaryId, secondaryId])}
                          className="ml-auto text-xs text-red-400 hover:text-red-600"
                        >
                          x
                        </button>
                      </div>

                      {isSubExpanded && (
                        <div className="pl-6 pr-2 py-1.5 space-y-1">
                          {tertiaryKeys.map((tertiaryId) => {
                            const tertiaryNode = secondaryNode[tertiaryId] as Record<string, unknown> | undefined;
                            const tertiaryScore = (tertiaryNode?._score as number) ?? 0;
                            const tertiaryLabel =
                              tertiaryMuscles.find((tm) => tm.id === tertiaryId)?.label as string || tertiaryId;

                            return (
                              <div key={tertiaryId} className="flex items-center gap-2 px-2 py-1 bg-green-50 rounded">
                                <span className="text-xs text-green-800">{tertiaryLabel}</span>
                                <span className="text-xs text-gray-400">_score:</span>
                                <ScoreInput
                                  path={[primaryId, secondaryId, tertiaryId, '_score']}
                                  currentScore={tertiaryScore}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeKey([primaryId, secondaryId, tertiaryId])}
                                  className="ml-auto text-xs text-red-400 hover:text-red-600"
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
                              className="text-xs px-2 py-1 border rounded text-gray-500"
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
                    className="text-xs px-2 py-1 border rounded text-gray-500"
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
          className="text-sm px-2 py-1.5 border rounded text-gray-500"
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
