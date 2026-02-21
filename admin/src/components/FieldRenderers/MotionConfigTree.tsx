import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { sp } from '../../styles/sidePanelStyles';

type MotionTableKey = 'motions';

interface MotionConfigTreeProps {
  tableKey: MotionTableKey;
  currentRecordId: string;
  muscleTargets: Record<string, unknown>;
  onFieldsChange: (fields: Record<string, unknown>) => void;
}

interface MotionRecord {
  id: string;
  label: string;
  parent_id?: string | null;
  muscle_targets?: Record<string, unknown>;
  [key: string]: unknown;
}

interface MuscleOption { id: string; label: string; }

function parsePids(m: Record<string, unknown>): string[] {
  const raw = m.parent_ids;
  if (Array.isArray(raw)) return raw as string[];
  return [];
}

function getMuscleLabelById(allMuscles: Record<string, unknown>[], id: string): string {
  return (allMuscles.find(m => m.id === id)?.label as string) || id;
}

function collectAllScores(
  data: Record<string, unknown>,
  allMuscles: Record<string, unknown>[]
): string {
  const lines: string[] = [];
  const pKeys = Object.keys(data).filter(k => k !== '_score');

  for (let pIdx = 0; pIdx < pKeys.length; pIdx++) {
    const pId = pKeys[pIdx];
    const pNode = data[pId] as Record<string, unknown> | undefined;
    if (!pNode || typeof pNode !== 'object') continue;
    const pLabel = getMuscleLabelById(allMuscles, pId);
    const pScore = typeof pNode._score === 'number' ? pNode._score : 0;
    const sKeys = Object.keys(pNode).filter(k => k !== '_score');
    const isLastPrimary = pIdx === pKeys.length - 1;

    lines.push(`${isLastPrimary ? '└' : '├'}─ ${pLabel}: ${pScore}`);
    for (let sIdx = 0; sIdx < sKeys.length; sIdx++) {
      const sId = sKeys[sIdx];
      const sNode = pNode[sId] as Record<string, unknown> | undefined;
      if (!sNode || typeof sNode !== 'object') continue;
      const sLabel = getMuscleLabelById(allMuscles, sId);
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
        const tLabel = getMuscleLabelById(allMuscles, tId);
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
  allMuscles,
}: {
  targets: Record<string, unknown>;
  onChange?: (v: Record<string, unknown>) => void;
  readOnly?: boolean;
  depth: number;
  expanded: Set<string>;
  toggleExpanded: (key: string) => void;
  allMuscles: Record<string, unknown>[];
}) {
  const data = targets && typeof targets === 'object' && !Array.isArray(targets) ? targets : {};

  const primaryMuscles = useMemo<MuscleOption[]>(() =>
    allMuscles
      .filter(m => parsePids(m).length === 0)
      .map(m => ({ id: m.id as string, label: m.label as string })),
    [allMuscles]
  );

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

  const getSecondariesFor = (pId: string): MuscleOption[] =>
    allMuscles
      .filter(m => parsePids(m).includes(pId))
      .map(m => ({ id: m.id as string, label: m.label as string }));

  const getTertiariesFor = (sId: string): MuscleOption[] =>
    allMuscles
      .filter(m => parsePids(m).includes(sId))
      .map(m => ({ id: m.id as string, label: m.label as string }));

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
        <span className={computed ? sp.scoreInput.computed : sp.scoreInput.readOnly}
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
        className={sp.scoreInput.editable} />
    );
  };

  return (
    <div className="space-y-1">
      {activePrimaries.map(pId => {
        const pNode = data[pId] as Record<string, unknown> | undefined;
        if (!pNode || typeof pNode !== 'object') return null;
        const pLabel = getMuscleLabelById(allMuscles, pId);
        const pScore = (pNode._score as number) ?? 0;
        const sKeys = Object.keys(pNode).filter(k => k !== '_score');
        const pKey = `${prefix}-${pId}`;
        const isExp = expanded.has(pKey);
        const availSec = getSecondariesFor(pId).filter(s => !sKeys.includes(s.id));
        const pIsComputed = sKeys.length > 0;

        return (
          <div key={pId} className={sp.card.treeItem}>
            <div className={sp.treeRow.primary}>
              <button type="button" onClick={() => toggleExpanded(pKey)} className={sp.toggle.small}>
                {isExp ? '▼' : '▶'}
              </button>
              <span className={sp.treeRow.primaryLabel}>{pLabel}</span>
              <ScoreInput path={[pId]} score={pScore} computed={pIsComputed} />
              {!readOnly && (
                <button type="button" onClick={() => removeKey([pId])} className={sp.removeBtn.small}>×</button>
              )}
            </div>
            {isExp && (
              <div className={sp.treeNest.secondaries}>
                {sKeys.map(sId => {
                  const sNode = pNode[sId] as Record<string, unknown> | undefined;
                  if (!sNode || typeof sNode !== 'object') return null;
                  const sLabel = getMuscleLabelById(allMuscles, sId);
                  const sScore = (sNode._score as number) ?? 0;
                  const tKeys = Object.keys(sNode).filter(k => k !== '_score');
                  const sKey = `${prefix}-${pId}.${sId}`;
                  const isSExp = expanded.has(sKey);
                  const availTer = getTertiariesFor(sId).filter(t => !tKeys.includes(t.id));
                  const sIsComputed = tKeys.length > 0;
                  const hasTertiaries = tKeys.length > 0;

                  return (
                    <div key={sId} className={sp.card.treeItemFlat}>
                      <div className={sp.treeRow.secondary}>
                        {hasTertiaries ? (
                          <button type="button" onClick={() => toggleExpanded(sKey)} className={sp.toggle.small}>
                            {isSExp ? '▼' : '▶'}
                          </button>
                        ) : (
                          <span className={sp.treeRow.leafBullet}>●</span>
                        )}
                        <span className={sp.treeRow.secondaryLabel}>{sLabel}</span>
                        <ScoreInput path={[pId, sId]} score={sScore} computed={sIsComputed} />
                        {!readOnly && (
                          <button type="button" onClick={() => removeKey([pId, sId])} className={sp.removeBtn.small}>×</button>
                        )}
                      </div>
                      {hasTertiaries && isSExp && (
                        <div className={sp.treeNest.tertiaries}>
                          {tKeys.map(tId => {
                            const tNode = sNode[tId] as Record<string, unknown> | undefined;
                            const tScore = (tNode?._score as number) ?? 0;
                            const tLabel = getMuscleLabelById(allMuscles, tId);
                            return (
                              <div key={tId} className={sp.treeRow.tertiary}>
                                <span className={sp.treeRow.tertiaryLabel}>{tLabel}</span>
                                <ScoreInput path={[pId, sId, tId]} score={tScore} />
                                {!readOnly && (
                                  <button type="button" onClick={() => removeKey([pId, sId, tId])} className={sp.removeBtn.small}>×</button>
                                )}
                              </div>
                            );
                          })}
                          {!readOnly && availTer.length > 0 && (
                            <select onChange={e => { if (e.target.value) addTertiary(pId, sId, e.target.value); e.target.value = ''; }}
                              className={sp.addDropdown.tree} defaultValue="">
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
                    className={sp.addDropdown.tree} defaultValue="">
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
          className={sp.addDropdown.tree} defaultValue="">
          <option value="">+ muscle group...</option>
          {unusedPrimaries.map(pm => <option key={pm.id} value={pm.id}>{pm.label}</option>)}
        </select>
      )}
    </div>
  );
}

function MuscleTargetsToggle({
  mtKey, targets, allMuscles, expanded, toggle,
}: {
  mtKey: string;
  targets: Record<string, unknown>;
  allMuscles: Record<string, unknown>[];
  expanded: Set<string>;
  toggle: (key: string) => void;
}) {
  const isExp = expanded.has(mtKey);
  const data = targets && typeof targets === 'object' && !Array.isArray(targets) ? targets : {};
  const tooltipText = collectAllScores(data, allMuscles);
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
        className={sp.badge.toggle}
        onClick={e => { e.stopPropagation(); toggle(mtKey); }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span className={sp.badge.toggleLabel}>Muscles</span>
        <button type="button" className={sp.badge.toggleArrow}>
          {isExp ? '▼' : '▶'}
        </button>
      </div>
      {showTooltip && tooltipText !== 'none' && createPortal(
        <div className={`${sp.tooltip.container} whitespace-pre-line`}
          style={{ top: `${tooltipPosition.top}px`, left: `${tooltipPosition.left}px`, width: '320px' }}>
          <div className={`${sp.tooltip.header} text-red-300`}>Muscle Scores:</div>
          <div className="font-mono text-[11px]">{tooltipText}</div>
        </div>,
        document.body
      )}
    </>
  );
}


export default function MotionConfigTree({ tableKey: _tableKey, currentRecordId, muscleTargets, onFieldsChange }: MotionConfigTreeProps) {
  const [allMotions, setAllMotions] = useState<MotionRecord[]>([]);
  const [allMuscles, setAllMuscles] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const loadAll = useCallback(async () => {
    try {
      const [motions, muscles] = await Promise.all([
        api.getTable('motions'),
        api.getTable('muscles'),
      ]);
      setAllMotions((motions as MotionRecord[]) || []);
      setAllMuscles((muscles as Record<string, unknown>[]) || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const parentMotions = useMemo(() => allMotions.filter(m => !m.parent_id), [allMotions]);
  const childMotions = useMemo(() => allMotions.filter(m => !!m.parent_id), [allMotions]);

  const toggle = useCallback((key: string) => {
    setExpanded(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  }, []);

  const addVariationToPrimary = useCallback(async (primaryId: string, variationId: string) => {
    try {
      await api.updateRow('motions', variationId, { parent_id: primaryId });
      await loadAll();
    } catch (err) { console.error('Failed to link variation:', err); }
  }, [loadAll]);

  const removeVariationFromPrimary = useCallback(async (variationId: string) => {
    try {
      await api.updateRow('motions', variationId, { parent_id: null });
      if (variationId === currentRecordId) {
        onFieldsChange({ parent_id: null });
      }
      await loadAll();
    } catch (err) { console.error('Failed to unlink variation:', err); }
  }, [loadAll, currentRecordId, onFieldsChange]);

  const setPrimaryForVariation = useCallback(async (variationId: string, primaryId: string) => {
    try {
      await api.updateRow('motions', variationId, { parent_id: primaryId });
      if (variationId === currentRecordId) {
        onFieldsChange({ parent_id: primaryId });
      }
      await loadAll();
    } catch (err) { console.error('Failed to set parent:', err); }
  }, [loadAll, currentRecordId, onFieldsChange]);

  const saveChildMuscleTargets = useCallback(async (recordId: string, newTargets: Record<string, unknown>) => {
    try {
      await api.updateRow('motions', recordId, { muscle_targets: newTargets });
      setAllMotions(prev => prev.map(r => r.id === recordId ? { ...r, muscle_targets: newTargets } : r));
    } catch (err) {
      console.error('Failed to save muscle_targets:', err);
    }
  }, []);

  const createVariation = useCallback(async (primaryId: string, newData: Record<string, unknown>) => {
    try {
      await api.addRow('motions', { ...newData, parent_id: primaryId, muscle_targets: {} });
      await loadAll();
    } catch (err) { console.error('Failed to create variation:', err); alert('Failed to create variation.'); }
  }, [loadAll]);

  const mtProps = useMemo(() => ({
    expanded, toggleExpanded: toggle, allMuscles,
  }), [expanded, toggle, allMuscles]);

  if (loading) return <div className={sp.loading}>Loading...</div>;

  const isCurrent = (id: string) => id === currentRecordId;

  const getTargetsAndOnChange = (id: string, record: MotionRecord) => {
    const targets = isCurrent(id) ? muscleTargets : (record.muscle_targets || {}) as Record<string, unknown>;
    return {
      targets,
      onChange: (newTargets: Record<string, unknown>) => {
        if (isCurrent(id)) {
          onFieldsChange({ muscle_targets: newTargets });
        } else {
          saveChildMuscleTargets(id, newTargets);
        }
      },
    };
  };

  const renderVariation = (v: MotionRecord, _keyPrefix: string) => {
    const current = isCurrent(v.id);
    const { targets, onChange } = getTargetsAndOnChange(v.id, v);
    const varMtKey = `mt-var-${v.id}`;

    return (
      <div key={v.id} className={`${sp.card.treeItemFlat} overflow-hidden ${current ? 'ring-2 ring-blue-400' : 'bg-white'}`}>
        <div className={`px-2 py-1.5 ${sp.header.expanded} flex items-center gap-2 flex-wrap ${current ? sp.header.variationCurrent : sp.header.variation}`}>
          <div className="flex items-center gap-2 flex-shrink-0">
            {current ? (
              <span className="text-xs font-bold text-gray-900">{v.label}</span>
            ) : (
              <Link to="/table/motions" className="text-xs font-medium text-blue-600 hover:underline">{v.label}</Link>
            )}
            <span className={sp.meta.id}>{v.id}</span>
          </div>
          <MuscleTargetsToggle mtKey={varMtKey} targets={targets} allMuscles={allMuscles} expanded={expanded} toggle={toggle} />
          <button type="button" onClick={() => removeVariationFromPrimary(v.id)}
            className="ml-auto text-[10px] text-red-500 hover:text-red-700 px-1 flex-shrink-0">Remove</button>
        </div>
        {expanded.has(varMtKey) && (
          <div className={sp.muscleTreeBg.bordered}>
            <MuscleTargetsSubtree targets={targets} depth={0} onChange={onChange} {...mtProps} />
          </div>
        )}
      </div>
    );
  };

  const currentMotion = allMotions.find(m => m.id === currentRecordId);
  if (!currentMotion) return <div className={sp.emptyState.text}>Record not found.</div>;

  const isCurrentParent = !currentMotion.parent_id;

  let rootPrimaries: MotionRecord[] = [];
  let focusVariationId: string | null = null;
  let orphanVariation: MotionRecord | null = null;

  if (isCurrentParent) {
    rootPrimaries = [currentMotion];
  } else {
    focusVariationId = currentRecordId;
    const pm = parentMotions.find(p => p.id === currentMotion.parent_id);
    if (pm) {
      rootPrimaries = [pm];
    } else {
      orphanVariation = currentMotion;
    }
  }

  const renderPrimaryMotionTree = (pm: MotionRecord) => {
    const rootKey = `pm-${pm.id}`;
    const isRootExp = expanded.has(rootKey);
    const current = isCurrent(pm.id);
    const { targets, onChange } = getTargetsAndOnChange(pm.id, pm);
    const relVars = childMotions.filter(v => v.parent_id === pm.id);
    const displayVars = focusVariationId ? relVars.filter(v => v.id === focusVariationId) : relVars;
    const unlinkedVars = allMotions.filter(v =>
      !v.parent_id &&
      v.id !== pm.id &&
      !allMotions.some(c => c.parent_id === v.id)
    );
    const pmMtKey = `mt-pm-${pm.id}`;

    return (
      <div key={pm.id} className={`${sp.card.container} bg-gray-50`}>
        <div className={`${sp.header.flex} ${current ? sp.header.primaryCurrent : sp.header.primary}`}>
          <button type="button" onClick={() => toggle(rootKey)} className={sp.toggle.base}>{isRootExp ? '▼' : '▶'}</button>
          <div className="flex items-center gap-2 flex-shrink-0">
            {current ? (
              <span className="text-sm font-bold text-gray-900">{pm.label}</span>
            ) : (
              <Link to="/table/motions" className={sp.link.primary}>{pm.label}</Link>
            )}
            <span className={sp.meta.id}>{pm.id}</span>
          </div>
          <MuscleTargetsToggle mtKey={pmMtKey} targets={targets} allMuscles={allMuscles} expanded={expanded} toggle={toggle} />
        </div>
        {expanded.has(pmMtKey) && (
          <div className={sp.muscleTreeBg.bordered}>
            <MuscleTargetsSubtree targets={targets} depth={0} onChange={onChange} {...mtProps} />
          </div>
        )}
        {isRootExp && (
          <div className={sp.treeNest.variations}>
            {displayVars.map(v => renderVariation(v, `pm-${pm.id}`))}
            {!focusVariationId && (
              <div className="flex flex-row gap-2 items-stretch">
                <select value="" onChange={async e => { if (e.target.value) await addVariationToPrimary(pm.id, e.target.value); }}
                  className={sp.addDropdown.treeBlue}>
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
    const { targets, onChange } = getTargetsAndOnChange(v.id, v);
    const orphanVarMtKey = `mt-orphan-var-${v.id}`;

    return (
      <div className={`${sp.card.container} bg-gray-50`}>
        <div className={`${sp.header.flex} ${sp.header.amber}`}>
          <button type="button" onClick={() => toggle(rootKey)} className={sp.toggle.base}>{isRootExp ? '▼' : '▶'}</button>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-amber-600 italic">No Parent Motion</span>
            <span className={sp.meta.arrow}>→</span>
            <span className="text-sm font-bold text-gray-900">{v.label}</span>
            <span className={sp.meta.id}>{v.id}</span>
          </div>
          <MuscleTargetsToggle mtKey={orphanVarMtKey} targets={targets} allMuscles={allMuscles} expanded={expanded} toggle={toggle} />
        </div>
        {expanded.has(orphanVarMtKey) && (
          <div className={sp.muscleTreeBg.bordered}>
            <MuscleTargetsSubtree targets={targets} depth={0} onChange={onChange} {...mtProps} />
          </div>
        )}
        {isRootExp && (
          <div className={sp.treeNest.variations}>
            <select value="" onChange={async e => { if (e.target.value) await setPrimaryForVariation(v.id, e.target.value); }}
              className={sp.addDropdown.treeBlue}>
              <option value="">Set Parent Motion...</option>
              {parentMotions.map(p => <option key={p.id} value={p.id}>{p.label} ({p.id})</option>)}
            </select>
          </div>
        )}
      </div>
    );
  };

  const addToPrimaryOptions = focusVariationId
    ? parentMotions.filter(pm => pm.id !== currentMotion.parent_id)
    : [];

  return (
    <div className="space-y-2">
      {rootPrimaries.map(pm => renderPrimaryMotionTree(pm))}
      {orphanVariation && renderOrphanVariation(orphanVariation)}

      {focusVariationId && addToPrimaryOptions.length > 0 && (
        <select value="" onChange={async e => {
          if (e.target.value) await setPrimaryForVariation(focusVariationId!, e.target.value);
        }}
          className={sp.addDropdown.treeBlue}>
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
            await onCreate({ id: newVar.id, label: newVar.label, common_names: [], short_description: newVar.short_description, muscle_targets: {}, sort_order: 0, is_active: true });
            setNewVar({ id: '', label: '', short_description: '' }); setShowForm(false); setCreating(false);
          }}
          className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded disabled:opacity-50">{creating ? '...' : 'Create'}</button>
        <button type="button" onClick={() => setShowForm(false)} className="px-2 py-0.5 text-xs bg-gray-200 rounded">Cancel</button>
      </div>
    </div>
  );
}
