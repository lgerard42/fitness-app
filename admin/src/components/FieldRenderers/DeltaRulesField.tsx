import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api';
import { sp } from '../../styles/sidePanelStyles';

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
      className={sp.scoreInput.editable}
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
    return <div className={sp.loading}>Loading motion and muscle data...</div>;
  }

  return (
    <div className="space-y-3">
      {motionEntries.length === 0 ? (
        <div className={sp.emptyState.box}>
          No motion delta rules configured
        </div>
      ) : (
        motionEntries.map(([motionId, delta]) => {
          const motion = allMotions.find(m => m.id === motionId);
          const motionLabel = motion?.label || motionId;
          const isExp = expanded.has(motionId);
          const deltaCount = Object.keys(delta).length;

          return (
            <div key={motionId} className={sp.card.list}>
              <div className={sp.header.base}>
                <div className="flex items-center gap-2 flex-1">
                  <button
                    type="button"
                    onClick={() => toggleExpand(motionId)}
                    className={sp.toggle.base}
                  >
                    {isExp ? '▼' : '▶'}
                  </button>
                  <span className="text-sm font-medium text-gray-700">{motionLabel}</span>
                  <span className={sp.meta.id}>{motionId}</span>
                  {deltaCount > 0 && (
                    <span className="text-xs text-gray-400 ml-auto">
                      {deltaCount} {deltaCount === 1 ? 'modification' : 'modifications'}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeMotion(motionId)}
                  className={sp.removeBtn.text}
                >
                  Remove Motion
                </button>
              </div>
              {isExp && (
                <div className={sp.muscleTreeBg.bordered}>
                  {Object.keys(delta).length === 0 ? (
                    <div className={sp.emptyState.inline}>
                      No muscle modifications for this motion
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {Object.entries(delta).map(([muscleId, score]) => {
                        const muscleLabel = (allMuscles.find(m => m.id === muscleId)?.label as string) || muscleId;
                        return (
                          <div key={muscleId} className={sp.treeRow.tertiary}>
                            <span className={`${sp.treeRow.secondaryLabel} flex-1`}>{muscleLabel}</span>
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
                              className={sp.removeBtn.small}
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
                        className={`${sp.addDropdown.tree} mt-1 w-full`}
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
        <div className={sp.card.section}>
          <select
            onChange={e => { if (e.target.value) addMotion(e.target.value); e.target.value = ''; }}
            className={sp.addDropdown.blockNeutral}
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
