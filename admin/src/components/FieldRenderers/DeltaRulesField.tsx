import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api';

interface DeltaRulesFieldProps {
  value: Record<string, Record<string, number>> | null | undefined;
  onChange: (v: Record<string, Record<string, number>>) => void;
}

interface MotionRecord {
  id: string;
  label: string;
  [key: string]: unknown;
}

interface MuscleRecord {
  id: string;
  label: string;
  [key: string]: unknown;
}

function DeltaScoreInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [local, setLocal] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setLocal(String(value));
  }, [value, focused]);

  return (
    <input
      type="number" step="0.1" value={local}
      onFocus={() => setFocused(true)}
      onChange={e => setLocal(e.target.value)}
      onBlur={e => {
        setFocused(false);
        const num = parseFloat(e.target.value);
        if (isNaN(num) || e.target.value === '') setLocal(String(value));
        else onChange(num);
      }}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      className="w-14 px-1 py-0.5 border rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  );
}


export default function DeltaRulesField({ value, onChange }: DeltaRulesFieldProps) {
  const [allMotions, setAllMotions] = useState<MotionRecord[]>([]);
  const [allMuscles, setAllMuscles] = useState<MuscleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      api.getTable('motions'),
      api.getTable('muscles'),
    ])
      .then(([motions, muscles]) => {
        setAllMotions((motions as MotionRecord[]) || []);
        setAllMuscles((muscles as MuscleRecord[]) || []);
      })
      .catch(err => {
        console.error('Failed to load data:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const deltaRules = value || {};
  const motionEntries = Object.entries(deltaRules);

  const toggleExpand = (motionId: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(motionId)) next.delete(motionId);
      else next.add(motionId);
      return next;
    });
  };

  const updateMotionDelta = (motionId: string, newDelta: Record<string, number>) => {
    const next = { ...deltaRules };
    if (Object.keys(newDelta).length === 0) {
      delete next[motionId];
    } else {
      next[motionId] = newDelta;
    }
    onChange(next);
  };

  const removeMotion = (motionId: string) => {
    const next = { ...deltaRules };
    delete next[motionId];
    onChange(next);
  };

  const addMotion = (motionId: string) => {
    onChange({ ...deltaRules, [motionId]: {} });
  };

  const usedMotionIds = new Set(Object.keys(deltaRules));
  const availableMotions = allMotions.filter(m => !usedMotionIds.has(m.id));

  if (loading) {
    return <div className="text-xs text-gray-400 py-2">Loading motion and muscle data...</div>;
  }

  return (
    <div className="space-y-3">
      {motionEntries.length === 0 ? (
        <div className="px-3 py-4 text-xs text-gray-400 italic text-center border rounded-lg bg-gray-50">
          No motion delta rules configured
        </div>
      ) : (
        motionEntries.map(([motionId, delta]) => {
          const motion = allMotions.find(m => m.id === motionId);
          const motionLabel = motion?.label || motionId;
          const isExp = expanded.has(motionId);
          const deltaCount = Object.keys(delta).length;

          return (
            <div key={motionId} className="bg-white border rounded-lg">
              <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <button
                    type="button"
                    onClick={() => toggleExpand(motionId)}
                    className="text-xs text-gray-500 w-4 flex-shrink-0 hover:text-gray-700"
                  >
                    {isExp ? '▼' : '▶'}
                  </button>
                  <span className="text-sm font-medium text-gray-700">{motionLabel}</span>
                  <span className="text-xs text-gray-400">{motionId}</span>
                  {deltaCount > 0 && (
                    <span className="text-xs text-gray-400 ml-auto">
                      {deltaCount} {deltaCount === 1 ? 'modification' : 'modifications'}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeMotion(motionId)}
                  className="text-xs text-red-600 hover:text-red-800 px-2 py-1 hover:bg-red-50 rounded"
                >
                  Remove Motion
                </button>
              </div>
              {isExp && (
                <div className="px-3 py-1 border-b bg-red-50">
                  {Object.keys(delta).length === 0 ? (
                    <div className="px-2 py-2 text-xs text-gray-400 italic text-center">
                      No muscle modifications for this motion
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {Object.entries(delta).map(([muscleId, score]) => {
                        const muscleLabel = (allMuscles.find(m => m.id === muscleId)?.label as string) || muscleId;
                        return (
                          <div key={muscleId} className="flex items-center gap-1.5 px-2 py-0.5 bg-red-50/60 rounded">
                            <span className="text-xs text-red-800 flex-1">{muscleLabel}</span>
                            <DeltaScoreInput value={score} onChange={(v) => {
                              const newDelta = { ...delta, [muscleId]: v };
                              updateMotionDelta(motionId, newDelta);
                            }} />
                            <button
                              type="button"
                              onClick={() => {
                                const newDelta = { ...delta };
                                delete newDelta[muscleId];
                                updateMotionDelta(motionId, newDelta);
                              }}
                              className="ml-auto text-[10px] text-red-400 hover:text-red-600"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {(() => {
                    const allMuscleOptions = allMuscles.map(m => ({ id: m.id as string, label: m.label as string }));
                    const unusedMuscles = allMuscleOptions.filter(m => !delta[m.id]);
                    return unusedMuscles.length > 0 ? (
                      <select
                        onChange={e => {
                          if (e.target.value) {
                            const newDelta = { ...delta, [e.target.value]: 0 };
                            updateMotionDelta(motionId, newDelta);
                          }
                          e.target.value = '';
                        }}
                        className="text-[10px] px-1 py-0.5 border border-red-300 rounded text-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 mt-1 w-full"
                        defaultValue=""
                      >
                        <option value="">+ muscle modifier...</option>
                        {unusedMuscles.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                      </select>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          );
        })
      )}
      {availableMotions.length > 0 && (
        <div className="border rounded-lg bg-gray-50 p-3">
          <select
            onChange={e => { if (e.target.value) addMotion(e.target.value); e.target.value = ''; }}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            defaultValue=""
          >
            <option value="">+ Add motion...</option>
            {availableMotions.map(m => <option key={m.id} value={m.id}>{m.label} ({m.id})</option>)}
          </select>
        </div>
      )}
    </div>
  );
}
