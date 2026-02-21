import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../api';
import { sp } from '../../styles/sidePanelStyles';


interface MotionPlane {
  id: string;
  label: string;
  short_description?: string;
  sort_order?: number;
  is_active?: boolean;
  delta_rules?: Record<string, Record<string, number>>;
}

interface MotionRecord {
  id: string;
  label: string;
  parent_id?: string | null;
  motion_planes?: { default: string; options: string[] };
  [key: string]: unknown;
}

interface MuscleRecord {
  id: string;
  label: string;
  parent_ids: string[];
}

interface MotionPlanesValue {
  default: string;
  options: string[];
}

interface MotionPlanesFieldProps {
  value: MotionPlanesValue | Record<string, unknown> | null | undefined;
  onChange: (v: MotionPlanesValue) => void;
  motionId?: string;
  onOpenRow?: (row: Record<string, unknown>) => void;
}

function normalize(raw: unknown): MotionPlanesValue {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    const def = typeof obj.default === 'string' ? obj.default : '';
    const opts = Array.isArray(obj.options) ? (obj.options as string[]) : [];
    return { default: def, options: opts };
  }
  return { default: '', options: [] };
}

/* ──────────────────── DeltaMuscleTree ──────────────────── */

type TreeNode = { _score: number; [childId: string]: TreeNode | number };

function getMuscleLabel(allMuscles: MuscleRecord[], id: string): string {
  return allMuscles.find(m => m.id === id)?.label || id;
}

function getMuscleLevel(id: string, allMuscles: MuscleRecord[]): 'primary' | 'secondary' | 'tertiary' {
  const m = allMuscles.find(mu => mu.id === id);
  if (!m || m.parent_ids.length === 0) return 'primary';
  const parent = allMuscles.find(mu => mu.id === m.parent_ids[0]);
  if (!parent || parent.parent_ids.length === 0) return 'secondary';
  return 'tertiary';
}

function findPrimaryFor(id: string, allMuscles: MuscleRecord[]): string {
  const m = allMuscles.find(mu => mu.id === id);
  if (!m || m.parent_ids.length === 0) return id;
  return findPrimaryFor(m.parent_ids[0], allMuscles);
}

function findSecondaryFor(id: string, allMuscles: MuscleRecord[]): string | null {
  const m = allMuscles.find(mu => mu.id === id);
  if (!m || m.parent_ids.length === 0) return null;
  const parent = allMuscles.find(mu => mu.id === m.parent_ids[0]);
  if (!parent || parent.parent_ids.length === 0) return null;
  return m.parent_ids[0];
}

function buildTreeFromFlat(flat: Record<string, number>, allMuscles: MuscleRecord[]): TreeNode {
  const tree: TreeNode = { _score: 0 };
  for (const [muscleId, score] of Object.entries(flat)) {
    const level = getMuscleLevel(muscleId, allMuscles);
    if (level === 'primary') {
      if (!tree[muscleId]) tree[muscleId] = { _score: 0 };
      (tree[muscleId] as TreeNode)._score = score;
    } else if (level === 'secondary') {
      const pId = findPrimaryFor(muscleId, allMuscles);
      if (!tree[pId]) tree[pId] = { _score: 0 };
      const pNode = tree[pId] as TreeNode;
      if (!pNode[muscleId]) pNode[muscleId] = { _score: 0 };
      (pNode[muscleId] as TreeNode)._score = score;
    } else {
      const sId = findSecondaryFor(muscleId, allMuscles);
      const pId = findPrimaryFor(muscleId, allMuscles);
      if (!tree[pId]) tree[pId] = { _score: 0 };
      const pNode = tree[pId] as TreeNode;
      if (sId) {
        if (!pNode[sId]) pNode[sId] = { _score: 0 };
        const sNode = pNode[sId] as TreeNode;
        if (!sNode[muscleId]) sNode[muscleId] = { _score: 0 };
        (sNode[muscleId] as TreeNode)._score = score;
      }
    }
  }
  recomputeScores(tree);
  return tree;
}

function recomputeScores(tree: TreeNode) {
  const pKeys = Object.keys(tree).filter(k => k !== '_score');
  for (const pId of pKeys) {
    const pNode = tree[pId] as TreeNode;
    const sKeys = Object.keys(pNode).filter(k => k !== '_score');
    for (const sId of sKeys) {
      const sNode = pNode[sId] as TreeNode;
      const tKeys = Object.keys(sNode).filter(k => k !== '_score');
      if (tKeys.length > 0) {
        sNode._score = Math.round(tKeys.reduce((s, tId) => s + ((sNode[tId] as TreeNode)._score || 0), 0) * 100) / 100;
      }
    }
    if (sKeys.length > 0) {
      pNode._score = Math.round(sKeys.reduce((s, sId) => s + ((pNode[sId] as TreeNode)._score || 0), 0) * 100) / 100;
    }
  }
}

function flattenTree(tree: TreeNode): Record<string, number> {
  const flat: Record<string, number> = {};
  const pKeys = Object.keys(tree).filter(k => k !== '_score');
  for (const pId of pKeys) {
    const pNode = tree[pId] as TreeNode;
    const sKeys = Object.keys(pNode).filter(k => k !== '_score');
    if (sKeys.length === 0) {
      flat[pId] = pNode._score;
    } else {
      for (const sId of sKeys) {
        const sNode = pNode[sId] as TreeNode;
        const tKeys = Object.keys(sNode).filter(k => k !== '_score');
        if (tKeys.length === 0) {
          flat[sId] = sNode._score;
        } else {
          for (const tId of tKeys) {
            flat[tId] = (sNode[tId] as TreeNode)._score;
          }
        }
      }
    }
  }
  return flat;
}

function DeltaMuscleTree({
  delta,
  onSave,
  allMuscles,
  planeId,
}: {
  delta: Record<string, number>;
  onSave: (planeId: string, flat: Record<string, number>) => void;
  allMuscles: MuscleRecord[];
  planeId: string;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExp = useCallback((key: string) => {
    setExpanded(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  }, []);

  const tree = useMemo(() => buildTreeFromFlat(delta, allMuscles), [delta, allMuscles]);

  const primaryMuscles = useMemo(() =>
    allMuscles.filter(m => m.parent_ids.length === 0).map(m => ({ id: m.id, label: m.label })),
    [allMuscles]
  );
  const getSecondariesFor = (pId: string) =>
    allMuscles.filter(m => m.parent_ids.includes(pId)).map(m => ({ id: m.id, label: m.label }));
  const getTertiariesFor = (sId: string) =>
    allMuscles.filter(m => m.parent_ids.includes(sId)).map(m => ({ id: m.id, label: m.label }));

  const save = (newTree: TreeNode) => {
    recomputeScores(newTree);
    onSave(planeId, flattenTree(newTree));
  };

  const setScore = (path: string[], score: number) => {
    if (isNaN(score)) return;
    const nd: TreeNode = JSON.parse(JSON.stringify(tree));
    let node: TreeNode = nd;
    for (const key of path) {
      if (!node[key] || typeof node[key] !== 'object') node[key] = { _score: 0 };
      node = node[key] as TreeNode;
    }
    node._score = score;
    save(nd);
  };

  const removeKey = (path: string[]) => {
    const nd: TreeNode = JSON.parse(JSON.stringify(tree));
    let node: TreeNode = nd;
    for (let i = 0; i < path.length - 1; i++) {
      if (!node[path[i]]) return;
      node = node[path[i]] as TreeNode;
    }
    delete node[path[path.length - 1]];
    save(nd);
  };

  const addPrimary = (id: string) => {
    if (tree[id]) return;
    const nd: TreeNode = { ...JSON.parse(JSON.stringify(tree)), [id]: { _score: 0 } };
    save(nd);
  };

  const addSecondary = (pId: string, sId: string) => {
    const nd: TreeNode = JSON.parse(JSON.stringify(tree));
    if (!nd[pId]) nd[pId] = { _score: 0 };
    const pNode = nd[pId] as TreeNode;
    if (!pNode[sId]) pNode[sId] = { _score: 0 };
    save(nd);
  };

  const addTertiary = (pId: string, sId: string, tId: string) => {
    const nd: TreeNode = JSON.parse(JSON.stringify(tree));
    if (!nd[pId]) nd[pId] = { _score: 0 };
    const pNode = nd[pId] as TreeNode;
    if (!pNode[sId]) pNode[sId] = { _score: 0 };
    const sNode = pNode[sId] as TreeNode;
    if (!sNode[tId]) sNode[tId] = { _score: 0 };
    save(nd);
  };

  const prefix = `delta-tree-${planeId}`;
  const activePrimaries = Object.keys(tree).filter(k => k !== '_score');
  const unusedPrimaries = primaryMuscles.filter(pm => !activePrimaries.includes(pm.id));

  const ScoreInput = ({ path, score, computed }: { path: string[]; score: number; computed?: boolean }) => {
    const [localValue, setLocalValue] = useState<string>(String(score));
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
      if (!isFocused) setLocalValue(String(score));
    }, [score, isFocused]);

    if (computed) {
      return (
        <span className={sp.scoreInput.computed}
          title="Auto-computed from children">{score}</span>
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
        className={sp.scoreInput.editable}
      />
    );
  };

  return (
    <div className="space-y-1">
      {activePrimaries.map(pId => {
        const pNode = tree[pId] as TreeNode;
        if (!pNode || typeof pNode !== 'object') return null;
        const pLabel = getMuscleLabel(allMuscles, pId);
        const pScore = pNode._score ?? 0;
        const sKeys = Object.keys(pNode).filter(k => k !== '_score');
        const pKey = `${prefix}-${pId}`;
        const isExp = expanded.has(pKey);
        const availSec = getSecondariesFor(pId).filter(s => !sKeys.includes(s.id));
        const pIsComputed = sKeys.length > 0;

        return (
          <div key={pId} className={sp.card.treeItem}>
            <div className={sp.treeRow.primary}>
              <button type="button" onClick={() => toggleExp(pKey)} className={sp.toggle.small}>
                {isExp ? '▼' : '▶'}
              </button>
              <span className={sp.treeRow.primaryLabel}>{pLabel}</span>
              <ScoreInput path={[pId]} score={pScore} computed={pIsComputed} />
              <button type="button" onClick={() => removeKey([pId])} className={sp.removeBtn.small}>×</button>
            </div>
            {isExp && (
              <div className={sp.treeNest.secondaries}>
                {sKeys.map(sId => {
                  const sNode = pNode[sId] as TreeNode;
                  if (!sNode || typeof sNode !== 'object') return null;
                  const sLabel = getMuscleLabel(allMuscles, sId);
                  const sScore = sNode._score ?? 0;
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
                          <button type="button" onClick={() => toggleExp(sKey)} className={sp.toggle.small}>
                            {isSExp ? '▼' : '▶'}
                          </button>
                        ) : (
                          <span className={sp.treeRow.leafBullet}>●</span>
                        )}
                        <span className={sp.treeRow.secondaryLabel}>{sLabel}</span>
                        <ScoreInput path={[pId, sId]} score={sScore} computed={sIsComputed} />
                        <button type="button" onClick={() => removeKey([pId, sId])} className={sp.removeBtn.small}>×</button>
                      </div>
                      {hasTertiaries && isSExp && (
                        <div className={sp.treeNest.tertiaries}>
                          {tKeys.map(tId => {
                            const tNode = sNode[tId] as TreeNode;
                            const tScore = (tNode as TreeNode)?._score ?? 0;
                            const tLabel = getMuscleLabel(allMuscles, tId);
                            return (
                              <div key={tId} className={sp.treeRow.tertiary}>
                                <span className={sp.treeRow.tertiaryLabel}>{tLabel}</span>
                                <ScoreInput path={[pId, sId, tId]} score={tScore} />
                                <button type="button" onClick={() => removeKey([pId, sId, tId])} className={sp.removeBtn.small}>×</button>
                              </div>
                            );
                          })}
                          {availTer.length > 0 && (
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
                {availSec.length > 0 && (
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
      {unusedPrimaries.length > 0 && (
        <select onChange={e => { if (e.target.value) addPrimary(e.target.value); e.target.value = ''; }}
          className={sp.addDropdown.tree} defaultValue="">
          <option value="">+ muscle group...</option>
          {unusedPrimaries.map(pm => <option key={pm.id} value={pm.id}>{pm.label}</option>)}
        </select>
      )}
    </div>
  );
}

/* ──────────────────── DeltaBadge ──────────────────── */

function DeltaBadge({ motionDelta, allMuscles, hasNoDelta }: {
  motionDelta: Record<string, number>;
  allMuscles: MuscleRecord[];
  hasNoDelta: boolean;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setTooltipPos({ top: rect.bottom + 4, left: rect.left });
    }
    setShowTooltip(true);
  };

  const entries = Object.entries(motionDelta);

  return (
    <>
      <div
        ref={ref}
        className={`${sp.motionPlane.deltaBadge} ${
          hasNoDelta ? sp.motionPlane.deltaBadgeAlert : sp.motionPlane.deltaBadgeNormal
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span className={sp.motionPlane.deltaBadgeLabel}>Muscle Modifiers (Deltas)</span>
        <span className={sp.motionPlane.deltaBadgeArrow}>{hasNoDelta ? '▶' : '▼'}</span>
      </div>
      {showTooltip && createPortal(
        <div
          className={sp.tooltip.container}
          style={{ top: `${tooltipPos.top}px`, left: `${tooltipPos.left}px`, maxWidth: '320px' }}
        >
          {entries.length === 0 ? (
            <div className="text-red-300 italic">No muscle modifiers configured</div>
          ) : (
            <>
              <div className={`${sp.tooltip.header} text-red-300`}>Muscle Modifiers:</div>
              <div className="space-y-0.5">
                {entries.map(([muscleId, score]) => {
                  const label = allMuscles.find(m => m.id === muscleId)?.label || muscleId;
                  return (
                    <div key={muscleId} className="flex justify-between gap-4">
                      <span>{label}</span>
                      <span className="font-mono">{score}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

/* ──────────────────── Main Component ──────────────────── */

export default function MotionPlanesField({ value, onChange, motionId, onOpenRow }: MotionPlanesFieldProps) {
  const [planes, setPlanes] = useState<MotionPlane[]>([]);
  const [allMotions, setAllMotions] = useState<MotionRecord[]>([]);
  const [allMuscles, setAllMuscles] = useState<MuscleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [familyExpanded, setFamilyExpanded] = useState(false);
  const [familyTooltip, setFamilyTooltip] = useState(false);
  const [familyTooltipPos, setFamilyTooltipPos] = useState({ top: 0, left: 0 });
  const familyRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    try {
      const [planesData, motionsData, musclesData] = await Promise.all([
        api.getTable('motionPlanes'),
        api.getTable('motions'),
        api.getTable('muscles'),
      ]);
      setPlanes((planesData as MotionPlane[]).filter(p => p.is_active !== false).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
      setAllMotions(motionsData as MotionRecord[]);
      setAllMuscles((musclesData as { id: string; label: string; parent_ids?: string[] }[]).map(m => ({
        id: m.id,
        label: m.label,
        parent_ids: Array.isArray(m.parent_ids) ? m.parent_ids : [],
      })));
    } catch {
      setPlanes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const current = useMemo(() => normalize(value), [value]);
  const selectedSet = useMemo(() => new Set(current.options), [current.options]);

  const currentMotion = useMemo(() => allMotions.find(m => m.id === motionId), [allMotions, motionId]);

  const familyMotions = useMemo(() => {
    if (!currentMotion || !motionId) return [];
    const primaryId = currentMotion.parent_id || currentMotion.id;
    return allMotions.filter(m => m.id === primaryId || m.parent_id === primaryId);
  }, [currentMotion, motionId, allMotions]);

  const familyPlaneUsage = useMemo(() => {
    const usage: Record<string, { motionId: string; motionLabel: string }> = {};
    for (const fm of familyMotions) {
      if (fm.id === motionId) continue;
      const mp = normalize(fm.motion_planes);
      for (const planeId of mp.options) {
        usage[planeId] = { motionId: fm.id, motionLabel: fm.label };
      }
    }
    return usage;
  }, [familyMotions, motionId]);

  const availablePlanes = useMemo(() => {
    return planes.filter(p => !selectedSet.has(p.id) && !familyPlaneUsage[p.id]);
  }, [planes, selectedSet, familyPlaneUsage]);

  const familyAssignedPlanes = useMemo(() => {
    return Object.entries(familyPlaneUsage)
      .map(([planeId, info]) => {
        const plane = planes.find(p => p.id === planeId);
        return { planeId, planeLabel: plane?.label || planeId, ...info };
      })
      .sort((a, b) => a.planeLabel.localeCompare(b.planeLabel));
  }, [familyPlaneUsage, planes]);

  const allFamilyPlaneInfo = useMemo(() => {
    const result: Array<{
      planeId: string;
      planeLabel: string;
      assignedToMotionId: string | null;
      assignedToMotionLabel: string | null;
    }> = [];

    for (const a of familyAssignedPlanes) {
      result.push({
        planeId: a.planeId,
        planeLabel: a.planeLabel,
        assignedToMotionId: a.motionId,
        assignedToMotionLabel: a.motionLabel,
      });
    }

    for (const p of availablePlanes) {
      result.push({
        planeId: p.id,
        planeLabel: p.label,
        assignedToMotionId: null,
        assignedToMotionLabel: null,
      });
    }

    return result.sort((a, b) => a.planeLabel.localeCompare(b.planeLabel));
  }, [familyAssignedPlanes, availablePlanes]);

  const toggle = useCallback((key: string) => {
    setExpanded(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  }, []);

  const addPlane = useCallback((planeId: string) => {
    const nextOptions = [...current.options, planeId];
    const nextDefault = current.default || planeId;
    onChange({ default: nextDefault, options: nextOptions });
  }, [current, onChange]);

  const removePlane = useCallback((planeId: string) => {
    const nextOptions = current.options.filter(id => id !== planeId);
    const nextDefault = current.default === planeId ? (nextOptions[0] || '') : current.default;
    onChange({ default: nextDefault, options: nextOptions });
  }, [current, onChange]);

  const setDefault = useCallback((planeId: string) => {
    onChange({ ...current, default: planeId });
  }, [current, onChange]);

  const saveDelta = useCallback(async (planeId: string, flat: Record<string, number>) => {
    const plane = planes.find(p => p.id === planeId);
    if (!plane || !motionId) return;
    const newDeltaRules = { ...(plane.delta_rules || {}) };
    if (Object.keys(flat).length > 0) {
      newDeltaRules[motionId] = flat;
    } else {
      delete newDeltaRules[motionId];
    }
    try {
      await api.updateRow('motionPlanes', planeId, { delta_rules: newDeltaRules });
      setPlanes(prev => prev.map(p => p.id === planeId ? { ...p, delta_rules: newDeltaRules } : p));
    } catch (err) {
      console.error('Failed to save delta_rules:', err);
    }
  }, [planes, motionId]);

  const handleOpenMotion = useCallback((mId: string) => {
    if (!onOpenRow) return;
    const motion = allMotions.find(m => m.id === mId);
    if (motion) onOpenRow(motion as Record<string, unknown>);
  }, [onOpenRow, allMotions]);

  const reassignPlane = useCallback(async (planeId: string, fromMotionId: string | null, toMotionId: string) => {
    try {
      if (fromMotionId && fromMotionId !== motionId) {
        const fromMotion = allMotions.find(m => m.id === fromMotionId);
        if (fromMotion) {
          const fromMp = normalize(fromMotion.motion_planes);
          const newOptions = fromMp.options.filter(id => id !== planeId);
          const newDefault = fromMp.default === planeId ? (newOptions[0] || '') : fromMp.default;
          await api.updateRow('motions', fromMotionId, { motion_planes: { default: newDefault, options: newOptions } });
        }
      }

      if (toMotionId === motionId) {
        addPlane(planeId);
      } else {
        const toMotion = allMotions.find(m => m.id === toMotionId);
        if (toMotion) {
          const toMp = normalize(toMotion.motion_planes);
          if (!toMp.options.includes(planeId)) {
            const newOptions = [...toMp.options, planeId];
            const newDefault = toMp.default || planeId;
            await api.updateRow('motions', toMotionId, { motion_planes: { default: newDefault, options: newOptions } });
          }
        }
      }

      await loadData();
    } catch (err) {
      console.error('Failed to reassign plane:', err);
    }
  }, [motionId, allMotions, addPlane, loadData]);

  const handleFamilyMouseEnter = () => {
    if (familyExpanded) return;
    if (familyRef.current) {
      const rect = familyRef.current.getBoundingClientRect();
      setFamilyTooltipPos({ top: rect.bottom + 4, left: rect.left });
    }
    setFamilyTooltip(true);
  };

  if (loading) {
    return <div className={sp.loading}>Loading motion planes...</div>;
  }

  const selectedPlanes = current.options
    .map(id => planes.find(p => p.id === id))
    .filter((p): p is MotionPlane => p != null);

  return (
    <div className="space-y-1">
      {selectedPlanes.length === 0 ? (
        <div className={sp.emptyState.box}>
          No motion planes assigned
        </div>
      ) : (
        selectedPlanes.map(plane => {
          const cardKey = `mp-card-${plane.id}`;
          const isExp = expanded.has(cardKey);
          const motionDelta = (motionId && plane.delta_rules?.[motionId]) || {};
          const deltaCount = Object.keys(motionDelta).length;
          const isDefault = current.default === plane.id;
          const hasNoDelta = deltaCount === 0;

          return (
            <div key={plane.id} className={`${sp.motionPlane.card} ${
              hasNoDelta ? sp.motionPlane.cardAlert : sp.motionPlane.cardNormal
            }`}>
              <div className={`${sp.motionPlane.header} ${
                isExp ? sp.motionPlane.headerExpanded : ''
              } ${hasNoDelta
                ? sp.motionPlane.headerAlert
                : sp.motionPlane.headerNormal
              }`}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button type="button" onClick={() => toggle(cardKey)}
                    className={sp.motionPlane.toggle}>
                    {isExp ? '▼' : '▶'}
                  </button>
                  <span className={`${sp.motionPlane.label} ${hasNoDelta ? sp.motionPlane.labelAlert : sp.motionPlane.labelNormal}`}>{plane.label}</span>
                  <span className={`${sp.meta.id} flex-shrink-0`}>{plane.id}</span>
                  {isDefault ? (
                    <span className={sp.badge.info}>Default</span>
                  ) : (
                    <button type="button" onClick={() => setDefault(plane.id)}
                      className={sp.badge.outline}>
                      Set Default
                    </button>
                  )}
                  <DeltaBadge motionDelta={motionDelta} allMuscles={allMuscles} hasNoDelta={hasNoDelta} />
                </div>
                <button type="button" onClick={() => removePlane(plane.id)}
                  className={sp.motionPlane.removeBtn}>×</button>
              </div>

              {isExp && motionId && (
                <div className={sp.motionPlane.expandedContent}>
                  <DeltaMuscleTree
                    delta={motionDelta}
                    onSave={saveDelta}
                    allMuscles={allMuscles}
                    planeId={plane.id}
                  />
                </div>
              )}
            </div>
          );
        })
      )}

      {allFamilyPlaneInfo.length > 0 && (
        <div
          ref={familyRef}
          className={sp.motionPlane.familyContainer}
          onMouseEnter={handleFamilyMouseEnter}
          onMouseLeave={() => setFamilyTooltip(false)}
        >
          <div
            className={`${sp.motionPlane.familyHeader} ${familyExpanded ? 'border-b border-amber-200' : ''}`}
            onClick={() => { setFamilyExpanded(e => !e); setFamilyTooltip(false); }}
          >
            <span className={sp.motionPlane.familyToggle}>{familyExpanded ? '▼' : '▶'}</span>
            <span className={sp.motionPlane.familyTitle}>
              Motion planes in this family
            </span>
            <span className={sp.motionPlane.familyCount}>{allFamilyPlaneInfo.length}</span>
          </div>
          {familyExpanded && (
            <div className={sp.motionPlane.familyBody}>
              {allFamilyPlaneInfo.map(info => {
                const isAssigned = info.assignedToMotionId !== null;
                const assignableMotions = familyMotions.filter(
                  m => m.id !== info.assignedToMotionId
                );

                return (
                  <div key={info.planeId} className={sp.motionPlane.familyRow}>
                    <span className={isAssigned ? sp.motionPlane.familyPlaneLabel : sp.motionPlane.familyPlaneDisabled}>
                      {info.planeLabel}
                    </span>
                    {isAssigned ? (
                      <>
                        <span className="text-gray-400">→</span>
                        {onOpenRow ? (
                          <button type="button" onClick={() => handleOpenMotion(info.assignedToMotionId!)}
                            className={sp.motionPlane.familyLink}>
                            {info.assignedToMotionLabel}
                          </button>
                        ) : (
                          <span className="text-gray-600">{info.assignedToMotionLabel}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400 italic">Unassigned</span>
                    )}
                    {assignableMotions.length > 0 && (
                      <select
                        onChange={e => {
                          if (e.target.value) {
                            reassignPlane(info.planeId, info.assignedToMotionId, e.target.value);
                          }
                          e.target.value = '';
                        }}
                        className={sp.motionPlane.familyReassign}
                        defaultValue=""
                      >
                        <option value="">{isAssigned ? 'Move to...' : 'Assign to...'}</option>
                        {assignableMotions.map(m => (
                          <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {familyTooltip && !familyExpanded && createPortal(
            <div
              className={sp.tooltip.container}
              style={{ top: `${familyTooltipPos.top}px`, left: `${familyTooltipPos.left}px`, maxWidth: '340px' }}
            >
              <div className={`${sp.tooltip.header} text-amber-300`}>Family Plane Overview:</div>
              <div className="space-y-0.5">
                {allFamilyPlaneInfo.map(info => (
                  <div key={info.planeId} className="flex gap-2">
                    <span className={info.assignedToMotionId ? 'text-amber-200' : 'text-gray-500'}>
                      {info.planeLabel}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className={info.assignedToMotionId ? '' : 'text-gray-500 italic'}>
                      {info.assignedToMotionLabel || 'Unassigned'}
                    </span>
                  </div>
                ))}
              </div>
            </div>,
            document.body
          )}
        </div>
      )}
    </div>
  );
}
