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
  variationTargets,
}: {
  targets: Record<string, unknown>;
  onChange?: (v: Record<string, unknown>) => void;
  readOnly?: boolean;
  depth: number;
  expanded: Set<string>;
  toggleExpanded: (key: string) => void;
  allMuscles: Record<string, unknown>[];
  variationTargets?: Record<string, unknown>;
}) {
  const data = targets && typeof targets === 'object' && !Array.isArray(targets) ? targets : {};

  // Helper to get score from tree (for comparing parent vs variation)
  const getScoreFromTree = (id: string, tree: Record<string, unknown>): number | null => {
    if (!tree || typeof tree !== 'object') return null;
    for (const [pId, pVal] of Object.entries(tree)) {
      if (pId === '_score') continue;
      const pNode = pVal as Record<string, unknown>;
      if (!pNode || typeof pNode !== 'object') continue;
      if (pId === id) return typeof pNode._score === 'number' ? pNode._score : 0;
      for (const [sId, sVal] of Object.entries(pNode)) {
        if (sId === '_score') continue;
        const sNode = sVal as Record<string, unknown>;
        if (!sNode || typeof sNode !== 'object') continue;
        if (sId === id) return typeof sNode._score === 'number' ? sNode._score : 0;
        for (const [tId, tVal] of Object.entries(sNode)) {
          if (tId === '_score') continue;
          const tNode = tVal as Record<string, unknown>;
          if (tId === id && tNode && typeof tNode === 'object') {
            return typeof (tNode as Record<string, unknown>)._score === 'number'
              ? (tNode as Record<string, unknown>)._score as number : 0;
          }
        }
      }
    }
    return null;
  };

  // Build merged tree for read-only parent scores (to show muscles from variation that aren't in parent)
  const mergedTree = useMemo(() => {
    if (!readOnly || !variationTargets || typeof variationTargets !== 'object') return data;
    const base = JSON.parse(JSON.stringify(data));
    const variation = variationTargets && typeof variationTargets === 'object' ? variationTargets : {};
    
    // Merge variation tree into base, adding missing muscles
    const mergeTree = (varNode: Record<string, unknown>, baseNode: Record<string, unknown>) => {
      for (const [key, val] of Object.entries(varNode)) {
        if (key === '_score') continue;
        if (!baseNode[key]) {
          baseNode[key] = { _score: 0 };
        }
        const childNode = val as Record<string, unknown>;
        if (childNode && typeof childNode === 'object') {
          mergeTree(childNode, baseNode[key] as Record<string, unknown>);
        }
      }
    };

    mergeTree(variation, base);
    return base;
  }, [data, readOnly, variationTargets]);

  const displayData = readOnly && variationTargets ? mergedTree : data;

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
  const activePrimariesDisplay = Object.keys(displayData).filter(k => k !== '_score');
  const unusedPrimariesDisplay = primaryMuscles.filter(pm => !activePrimariesDisplay.includes(pm.id));
  const availSec = (pId: string) => getSecondariesFor(pId).filter(s => {
    const pNode = displayData[pId] as Record<string, unknown> | undefined;
    return pNode && typeof pNode === 'object' && !Object.keys(pNode).filter(k => k !== '_score').includes(s.id);
  });

  const ScoreInput = ({ path, score, computed, muscleId }: { path: string[]; score: number; computed?: boolean; muscleId: string }) => {
    const [localValue, setLocalValue] = useState<string>(String(score));
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
      if (!isFocused) setLocalValue(String(score));
    }, [score, isFocused]);

    if (readOnly || computed) {
      // For read-only parent scores with variation comparison
      if (readOnly && variationTargets && !computed) {
        const baseScore = getScoreFromTree(muscleId, targets && typeof targets === 'object' ? targets : {});
        const variationScore = getScoreFromTree(muscleId, variationTargets && typeof variationTargets === 'object' ? variationTargets : {});
        const isNew = baseScore === null && variationScore !== null;
        const isChanged = baseScore !== null && variationScore !== null && baseScore !== variationScore;

        if (isNew) {
          return (
            <>
              <span className={sp.deltaRules.addBadge}>Add</span>
              <span className={sp.scoreInput.readOnly}>{variationScore}</span>
            </>
          );
        } else if (isChanged) {
          return (
            <>
              <span className={sp.scoreInput.readOnly}>{baseScore}</span>
              <span className={sp.deltaRules.arrowSeparator}>→</span>
              <span className={sp.scoreInput.changed}>{variationScore}</span>
            </>
          );
        } else {
          return <span className={sp.scoreInput.readOnly}>{baseScore ?? score}</span>;
        }
      }

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

  const treeStyles = readOnly ? {
    item: sp.deltaRules.treeItemReadOnly,
    itemFlat: sp.deltaRules.treeItemFlatReadOnly,
    rowPrimary: sp.deltaRules.treeRowPrimaryReadOnly,
    rowSecondary: sp.deltaRules.treeRowSecondaryReadOnly,
    rowTertiary: sp.deltaRules.treeRowTertiaryReadOnly,
    nestSecondaries: sp.deltaRules.treeNestSecondariesReadOnly,
    nestTertiaries: sp.deltaRules.treeNestTertiariesReadOnly,
  } : {
    item: sp.deltaRules.treeItem,
    itemFlat: sp.deltaRules.treeItemFlat,
    rowPrimary: sp.deltaRules.treeRowPrimary,
    rowSecondary: sp.deltaRules.treeRowSecondary,
    rowTertiary: sp.deltaRules.treeRowTertiary,
    nestSecondaries: sp.deltaRules.treeNestSecondaries,
    nestTertiaries: sp.deltaRules.treeNestTertiaries,
  };

  return (
    <div className={sp.deltaRules.treeContainer}>
      {activePrimariesDisplay.map(pId => {
        const pNode = displayData[pId] as Record<string, unknown> | undefined;
        if (!pNode || typeof pNode !== 'object') return null;
        const pLabel = getMuscleLabelById(allMuscles, pId);
        const pScore = (pNode._score as number) ?? 0;
        const sKeys = Object.keys(pNode).filter(k => k !== '_score');
        const availSec = getSecondariesFor(pId).filter(s => !sKeys.includes(s.id));
        const pIsComputed = sKeys.length > 0;

        return (
          <div key={pId} className={treeStyles.item}>
            <div className={treeStyles.rowPrimary}>
              <span className={sp.treeRow.primaryLabel}>{pLabel}</span>
              <ScoreInput path={[pId]} score={pScore} computed={pIsComputed} muscleId={pId} />
              {!readOnly && (
                <button type="button" onClick={() => removeKey([pId])} className={sp.removeBtn.small}>×</button>
              )}
            </div>
            <div className={treeStyles.nestSecondaries}>
              {sKeys.map(sId => {
                const sNode = pNode[sId] as Record<string, unknown> | undefined;
                if (!sNode || typeof sNode !== 'object') return null;
                const sLabel = getMuscleLabelById(allMuscles, sId);
                const sScore = (sNode._score as number) ?? 0;
                const tKeys = Object.keys(sNode).filter(k => k !== '_score');
                const availTer = getTertiariesFor(sId).filter(t => !tKeys.includes(t.id));
                const sIsComputed = tKeys.length > 0;

                return (
                  <div key={sId} className={treeStyles.itemFlat}>
                    <div className={treeStyles.rowSecondary}>
                      <span className={sp.treeRow.secondaryLabel}>{sLabel}</span>
                      <ScoreInput path={[pId, sId]} score={sScore} computed={sIsComputed} muscleId={sId} />
                      {!readOnly && (
                        <button type="button" onClick={() => removeKey([pId, sId])} className={sp.removeBtn.small}>×</button>
                      )}
                    </div>
                    {(tKeys.length > 0 || availTer.length > 0) && (
                      <div className={treeStyles.nestTertiaries}>
                        {tKeys.map(tId => {
                          const tNode = sNode[tId] as Record<string, unknown> | undefined;
                          const tScore = (tNode?._score as number) ?? 0;
                          const tLabel = getMuscleLabelById(allMuscles, tId);
                          return (
                            <div key={tId} className={treeStyles.rowTertiary}>
                              <span className={sp.treeRow.tertiaryLabel}>{tLabel}</span>
                              <ScoreInput path={[pId, sId, tId]} score={tScore} muscleId={tId} />
                              {!readOnly && (
                                <button type="button" onClick={() => removeKey([pId, sId, tId])} className={sp.removeBtn.small}>×</button>
                              )}
                            </div>
                          );
                        })}
                        {!readOnly && availTer.length > 0 && (
                          <select onChange={e => { if (e.target.value) addTertiary(pId, sId, e.target.value); e.target.value = ''; }}
                            className={sp.deltaRules.treeAddDropdown} defaultValue="">
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
                  className={sp.deltaRules.treeAddDropdown} defaultValue="">
                  <option value="">+ secondary...</option>
                  {availSec.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              )}
            </div>
          </div>
        );
      })}
      {!readOnly && unusedPrimariesDisplay.length > 0 && (
        <select onChange={e => { if (e.target.value) addPrimary(e.target.value); e.target.value = ''; }}
          className={sp.deltaRules.treeAddDropdown} defaultValue="">
          <option value="">+ muscle group...</option>
          {unusedPrimariesDisplay.map(pm => <option key={pm.id} value={pm.id}>{pm.label}</option>)}
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
        className={sp.motionConfig.muscleToggleBadge}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span className={sp.motionConfig.muscleToggleLabel}>Muscles</span>
      </div>
      {showTooltip && tooltipText !== 'none' && createPortal(
        <div className={`${sp.tooltip.container} ${sp.motionConfig.tooltipContainerPreLine}`}
          style={{ top: `${tooltipPosition.top}px`, left: `${tooltipPosition.left}px`, width: '320px' }}>
          <div className={`${sp.tooltip.header} ${sp.motionConfig.tooltipHeaderRed}`}>Muscle Scores:</div>
          <div className={sp.motionConfig.tooltipText}>{tooltipText}</div>
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
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [motions, muscles] = await Promise.all([
        api.getTable('motions'),
        api.getTable('muscles'),
      ]);
      setAllMotions((motions as MotionRecord[]) || []);
      setAllMuscles((muscles as Record<string, unknown>[]) || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
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

  // Helper to get primary muscles from a motion
  const getPrimaryMusclesFromMotion = useCallback((motion: MotionRecord): string[] => {
    const targets = motion.muscle_targets as Record<string, unknown> | undefined;
    if (!targets || typeof targets !== 'object') return [];
    return Object.keys(targets).filter(k => k !== '_score');
  }, []);

  // Compute currentMotion and related values early, but after hooks
  const currentMotion = allMotions.find(m => m.id === currentRecordId);
  const isCurrentParent = currentMotion ? !currentMotion.parent_id : false;
  const computedFocusVariationId = currentMotion && !isCurrentParent ? currentRecordId : null;
  
  // Group motions by primary muscle, then by primary motion with variations indented
  const groupedMotions = useMemo(() => {
    if (!currentMotion || !allMuscles || allMuscles.length === 0 || !allMotions || allMotions.length === 0) return [];
    
    const addToPrimaryOptions = computedFocusVariationId
      ? parentMotions.filter(pm => pm.id !== currentMotion.parent_id)
      : [];
    
    if (addToPrimaryOptions.length === 0) return [];

    const groups: Record<string, Array<{ motion: MotionRecord; isPrimary: boolean }>> = {};
    const primaryMuscles = allMuscles.filter((m: Record<string, unknown>) => {
      const pids = m.parent_ids;
      return !pids || (Array.isArray(pids) && pids.length === 0);
    });
    const primaryMuscleMap = new Map(primaryMuscles.map((m: Record<string, unknown>) => [m.id as string, m]));

    // Separate primary motions from variations
    const primaryMotionsList = addToPrimaryOptions.filter(m => !m.parent_id);
    const variationsList = addToPrimaryOptions.filter(m => !!m.parent_id);

    // Group primary motions by their primary muscles
    primaryMotionsList.forEach(motion => {
      const primaryMuscleIds = getPrimaryMusclesFromMotion(motion);
      if (primaryMuscleIds.length === 0) {
        // If no primary muscles, put in "Other" group
        if (!groups['OTHER']) groups['OTHER'] = [];
        groups['OTHER'].push({ motion, isPrimary: true });
      } else {
        // Group by first primary muscle
        const primaryId = primaryMuscleIds[0];
        if (!groups[primaryId]) groups[primaryId] = [];
        groups[primaryId].push({ motion, isPrimary: true });
      }
    });

    // Add variations under their parent's primary muscle group
    variationsList.forEach(variation => {
      const parentMotion = allMotions.find(m => m.id === variation.parent_id);
      if (parentMotion) {
        const primaryMuscleIds = getPrimaryMusclesFromMotion(parentMotion);
        const groupKey = primaryMuscleIds.length > 0 ? primaryMuscleIds[0] : 'OTHER';
        if (!groups[groupKey]) groups[groupKey] = [];
        groups[groupKey].push({ motion: variation, isPrimary: false });
      }
    });

    // Sort motions within each group: primaries first (alphabetically), then variations under their parent
    Object.keys(groups).forEach(key => {
      const items = groups[key];
      const primaries = items.filter(item => item.isPrimary).sort((a, b) => a.motion.label.localeCompare(b.motion.label));
      const variations = items.filter(item => !item.isPrimary);
      
      // Sort variations and group them under their parents
      variations.sort((a, b) => {
        const aParentId = a.motion.parent_id;
        const bParentId = b.motion.parent_id;
        if (aParentId !== bParentId) {
          // Group by parent, then sort by label
          const aParent = primaries.find(p => p.motion.id === aParentId);
          const bParent = primaries.find(p => p.motion.id === bParentId);
          if (aParent && bParent) {
            const parentCompare = aParent.motion.label.localeCompare(bParent.motion.label);
            if (parentCompare !== 0) return parentCompare;
          }
        }
        return a.motion.label.localeCompare(b.motion.label);
      });

      // Rebuild array: primaries first, then variations under their parent
      const sorted: Array<{ motion: MotionRecord; isPrimary: boolean }> = [];
      primaries.forEach(primary => {
        sorted.push(primary);
        // Add variations for this primary
        variations.filter(v => v.motion.parent_id === primary.motion.id).forEach(v => sorted.push(v));
      });
      // Add any variations whose parent isn't in this group (shouldn't happen, but just in case)
      variations.filter(v => !primaries.some(p => p.motion.id === v.motion.parent_id)).forEach(v => sorted.push(v));
      
      groups[key] = sorted;
    });

    // Sort groups by primary muscle label
    const sortedGroups: Array<{ primaryId: string; primaryLabel: string; motions: Array<{ motion: MotionRecord; isPrimary: boolean }> }> = [];
    Object.keys(groups).forEach(primaryId => {
      const primary = primaryMuscleMap.get(primaryId);
      const primaryLabel = primary && typeof primary === 'object' && 'label' in primary ? String(primary.label) : primaryId;
      sortedGroups.push({
        primaryId,
        primaryLabel,
        motions: groups[primaryId],
      });
    });
    sortedGroups.sort((a, b) => {
      if (a.primaryId === 'OTHER') return 1;
      if (b.primaryId === 'OTHER') return -1;
      return a.primaryLabel.localeCompare(b.primaryLabel);
    });

    return sortedGroups;
  }, [computedFocusVariationId, currentMotion, parentMotions, allMuscles, allMotions, getPrimaryMusclesFromMotion]);

  if (loading) return <div className={sp.motionConfig.loading}>Loading...</div>;
  if (error) return <div className={sp.motionConfig.emptyState}>Error: {error}</div>;
  if (!currentMotion) return <div className={sp.motionConfig.emptyState}>Record not found.</div>;

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

  const renderVariation = (v: MotionRecord, _keyPrefix: string, parentTargets?: Record<string, unknown>) => {
    const current = isCurrent(v.id);
    const { targets, onChange } = getTargetsAndOnChange(v.id, v);
    const varMtKey = `mt-var-${v.id}`;

    return (
      <div key={v.id} className={`${sp.motionConfig.variationCard} ${current ? sp.motionConfig.variationCardCurrent : ''}`}>
        <div className={`${sp.motionConfig.variationHeader} ${current ? sp.motionConfig.variationHeaderCurrent : ''}`}>
          <button type="button" onClick={() => toggle(varMtKey)} className={sp.toggle.base}>{expanded.has(varMtKey) ? '▼' : '▶'}</button>
          <div className={sp.motionConfig.variationLabelContainer}>
            {current ? (
              <span className={sp.motionConfig.variationLabelCurrent}>{v.label}</span>
            ) : (
              <Link to="/table/motions" className={sp.motionConfig.variationLabel}>{v.label}</Link>
            )}
            <span className={sp.meta.id}>{v.id}</span>
          </div>
          <MuscleTargetsToggle mtKey={varMtKey} targets={targets} allMuscles={allMuscles} expanded={expanded} toggle={toggle} />
          <button type="button" onClick={() => removeVariationFromPrimary(v.id)}
            className={sp.motionConfig.removeVariationBtn}>Remove</button>
        </div>
        {expanded.has(varMtKey) && (
          <div className={sp.deltaRules.expandedContent}>
            <div className={sp.deltaRules.scoresRow}>
              <div className={sp.deltaRules.scoresColumnEditable}>
                <div className={sp.deltaRules.sectionLabel}>Variation Scores</div>
                <MuscleTargetsSubtree targets={targets} depth={0} onChange={onChange} {...mtProps} />
              </div>
              {parentTargets && Object.keys(parentTargets).filter(k => k !== '_score').length > 0 && (
                <div className={sp.deltaRules.scoresColumnReadOnly}>
                  <div className={sp.deltaRules.sectionLabel}>Parent Scores</div>
                  <MuscleTargetsSubtree targets={parentTargets} depth={0} readOnly variationTargets={targets} {...mtProps} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  let rootPrimaries: MotionRecord[] = [];
  let orphanVariation: MotionRecord | null = null;

  if (isCurrentParent) {
    rootPrimaries = [currentMotion];
  } else {
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
    const displayVars = computedFocusVariationId ? relVars.filter(v => v.id === computedFocusVariationId) : relVars;
    const unlinkedVars = allMotions.filter(v =>
      !v.parent_id &&
      v.id !== pm.id &&
      !allMotions.some(c => c.parent_id === v.id)
    );
    const pmMtKey = `mt-pm-${pm.id}`;

    // If viewing a variation, show parent → variation on same row
    if (computedFocusVariationId && displayVars.length === 1) {
      const variation = displayVars[0];
      const varMtKey = `mt-var-${variation.id}`;
      return (
        <div key={pm.id} className={sp.motionConfig.primaryCard}>
          <div className={`${sp.motionConfig.primaryHeader} ${isCurrent(variation.id) ? sp.motionConfig.primaryHeaderCurrent : ''}`}>
            <button type="button" onClick={() => toggle(varMtKey)} className={sp.toggle.base}>{expanded.has(varMtKey) ? '▼' : '▶'}</button>
            <div className={sp.motionConfig.parentVariationRow}>
              {current ? (
                <span className={sp.motionConfig.primaryLabelCurrent}>{pm.label}</span>
              ) : (
                <Link to="/table/motions" className={sp.link.primary}>{pm.label}</Link>
              )}
              <span className={sp.meta.id}>{pm.id}</span>
              <span className={sp.meta.arrow}>→</span>
              {isCurrent(variation.id) ? (
                <span className={sp.motionConfig.primaryLabelCurrent}>{variation.label}</span>
              ) : (
                <Link to="/table/motions" className={sp.link.primary}>{variation.label}</Link>
              )}
              <span className={sp.meta.id}>{variation.id}</span>
            </div>
            <MuscleTargetsToggle mtKey={varMtKey} targets={getTargetsAndOnChange(variation.id, variation).targets} allMuscles={allMuscles} expanded={expanded} toggle={toggle} />
            <button type="button" onClick={() => removeVariationFromPrimary(variation.id)}
              className={sp.motionConfig.removeVariationBtn}>Remove</button>
          </div>
          {expanded.has(`mt-var-${variation.id}`) && (
            <div className={sp.deltaRules.expandedContent}>
              <div className={sp.deltaRules.scoresRow}>
                <div className={sp.deltaRules.scoresColumnEditable}>
                  <div className={sp.deltaRules.sectionLabel}>Variation Scores</div>
                  <MuscleTargetsSubtree targets={getTargetsAndOnChange(variation.id, variation).targets} depth={0} onChange={getTargetsAndOnChange(variation.id, variation).onChange} {...mtProps} />
                </div>
                {Object.keys(targets).filter(k => k !== '_score').length > 0 && (
                  <div className={sp.deltaRules.scoresColumnReadOnly}>
                    <div className={sp.deltaRules.sectionLabel}>Parent Scores</div>
                    <MuscleTargetsSubtree targets={targets} depth={0} readOnly variationTargets={getTargetsAndOnChange(variation.id, variation).targets} {...mtProps} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Normal parent view (when not viewing a variation)
    // If viewing the primary motion itself, don't show the variations toggle (no parent to show)
    const shouldShowVariationsToggle = !current;
    
    return (
      <div key={pm.id} className={sp.motionConfig.primaryCard}>
        <div className={`${sp.motionConfig.primaryHeader} ${current ? sp.motionConfig.primaryHeaderCurrent : ''}`}>
          <button type="button" onClick={() => toggle(pmMtKey)} className={sp.toggle.base}>{expanded.has(pmMtKey) ? '▼' : '▶'}</button>
          {shouldShowVariationsToggle && (
            <button type="button" onClick={() => toggle(rootKey)} className={sp.toggle.base}>{isRootExp ? '▼' : '▶'}</button>
          )}
          <div className={sp.motionConfig.primaryLabelContainer}>
            {current ? (
              <span className={sp.motionConfig.primaryLabelCurrent}>{pm.label}</span>
            ) : (
              <Link to="/table/motions" className={sp.link.primary}>{pm.label}</Link>
            )}
            <span className={sp.meta.id}>{pm.id}</span>
          </div>
          <MuscleTargetsToggle mtKey={pmMtKey} targets={targets} allMuscles={allMuscles} expanded={expanded} toggle={toggle} />
        </div>
        {expanded.has(pmMtKey) && (
          <div className={sp.deltaRules.expandedContent}>
            <MuscleTargetsSubtree targets={targets} depth={0} onChange={onChange} {...mtProps} />
          </div>
        )}
        {(current ? true : isRootExp) && (
          <div className={sp.motionConfig.variationsNest}>
            {displayVars.map(v => renderVariation(v, `pm-${pm.id}`, targets))}
            {!computedFocusVariationId && (
              <div className={sp.motionConfig.addVariationSection}>
                <select value="" onChange={async e => { if (e.target.value) await addVariationToPrimary(pm.id, e.target.value); }}
                  className={sp.motionConfig.addVariationDropdown}>
                  <option value="">Add Motion Variation...</option>
                  {unlinkedVars.map(v => <option key={v.id} value={v.id}>{v.label} ({v.id})</option>)}
                </select>
                <div className={sp.motionConfig.inlineCreatorButtonWrapper}>
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
      <div className={sp.motionConfig.orphanCard}>
        <div className={sp.motionConfig.orphanHeader}>
          <button type="button" onClick={() => toggle(orphanVarMtKey)} className={sp.toggle.base}>{expanded.has(orphanVarMtKey) ? '▼' : '▶'}</button>
          <button type="button" onClick={() => toggle(rootKey)} className={sp.toggle.base}>{isRootExp ? '▼' : '▶'}</button>
          <div className={sp.motionConfig.orphanLabelContainer}>
            <span className={sp.motionConfig.orphanLabel}>No Parent Motion</span>
            <span className={sp.meta.arrow}>→</span>
            <span className={sp.motionConfig.orphanLabelCurrent}>{v.label}</span>
            <span className={sp.meta.id}>{v.id}</span>
          </div>
          <MuscleTargetsToggle mtKey={orphanVarMtKey} targets={targets} allMuscles={allMuscles} expanded={expanded} toggle={toggle} />
        </div>
        {expanded.has(orphanVarMtKey) && (
          <div className={sp.deltaRules.expandedContent}>
            <MuscleTargetsSubtree targets={targets} depth={0} onChange={onChange} {...mtProps} />
          </div>
        )}
        {isRootExp && (
          <div className={sp.motionConfig.variationsNest}>
            <select value="" onChange={async e => { if (e.target.value) await setPrimaryForVariation(v.id, e.target.value); }}
              className={sp.motionConfig.setParentDropdown}>
              <option value="">Set Parent Motion...</option>
              {parentMotions.map(p => <option key={p.id} value={p.id}>{p.label} ({p.id})</option>)}
            </select>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={sp.motionConfig.container}>
      {rootPrimaries.map(pm => renderPrimaryMotionTree(pm))}
      {orphanVariation && renderOrphanVariation(orphanVariation)}

      {computedFocusVariationId && groupedMotions.length > 0 && (
        <select value="" onChange={async e => {
          if (e.target.value) await setPrimaryForVariation(computedFocusVariationId!, e.target.value);
        }}
          className={sp.motionConfig.setParentDropdown}>
          <option value="">{rootPrimaries.length > 0 ? 'Move to another Motion...' : 'Set Parent Motion...'}</option>
          {groupedMotions.map(group => (
            <optgroup key={group.primaryId} label={group.primaryLabel} className={sp.deltaRules.addMotionOptgroup}>
              {group.motions.map(({ motion, isPrimary }) => (
                <option key={motion.id} value={motion.id} className={isPrimary ? sp.deltaRules.addMotionOption : sp.deltaRules.addMotionOptionIndented}>
                  {motion.label} ({motion.id})
                </option>
              ))}
            </optgroup>
          ))}
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
        className={sp.motionConfig.inlineCreatorButton}>
        + Create New Variation
      </button>
    );
  }

  return (
    <div className={sp.motionConfig.inlineCreatorForm}>
      <div className={sp.motionConfig.inlineCreatorRow}>
        <input type="text" placeholder="ID" value={newVar.id} onChange={e => setNewVar({ ...newVar, id: e.target.value })}
          className={`${sp.motionConfig.inlineCreatorInput} ${sp.motionConfig.inlineCreatorInputFlex1}`} />
        <input type="text" placeholder="Label" value={newVar.label} onChange={e => setNewVar({ ...newVar, label: e.target.value })}
          className={`${sp.motionConfig.inlineCreatorInput} ${sp.motionConfig.inlineCreatorInputFlex1}`} />
      </div>
      <input type="text" placeholder="Short Description" value={newVar.short_description}
        onChange={e => setNewVar({ ...newVar, short_description: e.target.value })}
        className={`${sp.motionConfig.inlineCreatorInput} ${sp.motionConfig.inlineCreatorInputFull}`} />
      <div className={sp.motionConfig.inlineCreatorRow}>
        <button type="button" disabled={!newVar.id || !newVar.label || creating}
          onClick={async () => {
            setCreating(true);
            await onCreate({ id: newVar.id, label: newVar.label, common_names: [], short_description: newVar.short_description, muscle_targets: {}, sort_order: 0, is_active: true });
            setNewVar({ id: '', label: '', short_description: '' }); setShowForm(false); setCreating(false);
          }}
          className={sp.motionConfig.inlineCreatorCreateBtn}>{creating ? '...' : 'Create'}</button>
        <button type="button" onClick={() => setShowForm(false)} className={sp.motionConfig.inlineCreatorCancelBtn}>Cancel</button>
      </div>
    </div>
  );
}
