import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../api';
import { sp } from '../../styles/sidePanelStyles';
import { filterScorableOnly, isMuscleScorable, getScorableMuscles } from '../../utils/muscleScorable';

interface DeltaRulesFieldProps {
  value: Record<string, Record<string, number> | "inherit"> | null | undefined;
  onChange: (v: Record<string, Record<string, number> | "inherit">) => void;
}

interface MotionRecord {
  id: string;
  label: string;
  [key: string]: unknown;
}

interface MuscleRecord {
  id: string;
  label: string;
  parent_ids?: string[];
  is_scorable?: boolean;
  [key: string]: unknown;
}

/* ──────────────────── DeltaMuscleTree ──────────────────── */

type TreeNode = { _score: number; [childId: string]: TreeNode | number };

function getMuscleLabel(allMuscles: MuscleRecord[], id: string): string {
  return allMuscles.find(m => m.id === id)?.label || id;
}

function getMuscleLevel(id: string, allMuscles: MuscleRecord[]): 'primary' | 'secondary' | 'tertiary' {
  const m = allMuscles.find(mu => mu.id === id);
  if (!m || !m.parent_ids || m.parent_ids.length === 0) return 'primary';
  const parent = allMuscles.find(mu => mu.id === m.parent_ids![0]);
  if (!parent || !parent.parent_ids || parent.parent_ids.length === 0) return 'secondary';
  return 'tertiary';
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

function buildTreeFromFlat(flat: Record<string, number>, allMuscles: MuscleRecord[]): TreeNode {
  const tree: TreeNode = { _score: 0 };
  for (const [muscleId, score] of Object.entries(flat)) {
    const m = allMuscles.find(mu => mu.id === muscleId);
    if (!m?.parent_ids || m.parent_ids.length === 0) {
      if (!tree[muscleId]) tree[muscleId] = { _score: 0 };
      (tree[muscleId] as TreeNode)._score = score;
      continue;
    }
    for (const pid of m.parent_ids) {
      const parent = allMuscles.find(mu => mu.id === pid);
      if (!parent) continue;
      if (!parent.parent_ids || parent.parent_ids.length === 0) {
        if (!tree[pid]) tree[pid] = { _score: 0 };
        const pNode = tree[pid] as TreeNode;
        if (!pNode[muscleId]) pNode[muscleId] = { _score: 0 };
        (pNode[muscleId] as TreeNode)._score = score;
      } else {
        const pId = findPrimaryFor(pid, allMuscles);
        if (!tree[pId]) tree[pId] = { _score: 0 };
        const pNode = tree[pId] as TreeNode;
        if (!pNode[pid]) pNode[pid] = { _score: 0 };
        const sNode = pNode[pid] as TreeNode;
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

function asFlat(targets: Record<string, unknown>): Record<string, number> {
  const flat: Record<string, number> = {};
  if (!targets || typeof targets !== 'object') return flat;
  for (const [k, v] of Object.entries(targets)) {
    if (typeof v === 'number') flat[k] = v;
  }
  return flat;
}

interface ROTreeNode {
  id: string;
  label: string;
  baseScore: number | null;
  afterScore: number;
  computed: boolean;
  children: ROTreeNode[];
}

function ReadOnlyMuscleTree({ targets, allMuscles, deltaScores }: {
  targets: Record<string, unknown>;
  allMuscles: MuscleRecord[];
  deltaScores?: Record<string, number>;
}) {
  const baseFlat = asFlat(targets);

  const displayTree = useMemo(() => {
    const allIds = new Set([...Object.keys(baseFlat), ...Object.keys(deltaScores ?? {})]);
    if (allIds.size === 0 || allMuscles.length === 0) return [];

    const muscleMap = new Map<string, MuscleRecord>();
    const childrenOf = new Map<string, string[]>();
    const rootIds: string[] = [];

    for (const m of allMuscles) {
      muscleMap.set(m.id, m);
      const pids = m.parent_ids ?? [];
      if (pids.length === 0) rootIds.push(m.id);
      for (const pid of pids) {
        if (!childrenOf.has(pid)) childrenOf.set(pid, []);
        childrenOf.get(pid)!.push(m.id);
      }
    }

    const neededIds = new Set<string>();
    function ensureAncestors(id: string) {
      if (neededIds.has(id)) return;
      neededIds.add(id);
      const m = muscleMap.get(id);
      if (!m) return;
      for (const pid of m.parent_ids ?? []) ensureAncestors(pid);
    }
    for (const id of allIds) ensureAncestors(id);

    function buildNode(id: string, depth: number): ROTreeNode | null {
      if (!neededIds.has(id)) return null;
      const m = muscleMap.get(id);
      const label = m?.label ?? id;
      const kids = (childrenOf.get(id) || [])
        .map(cid => buildNode(cid, depth + 1))
        .filter((n): n is ROTreeNode => n !== null);

      const hasKids = kids.length > 0;
      const base = id in baseFlat ? baseFlat[id] : null;
      const delta = deltaScores?.[id] ?? 0;

      if (hasKids) {
        const baseSum = kids.reduce((s, c) => s + (c.baseScore ?? 0), 0);
        const afterSum = kids.reduce((s, c) => s + c.afterScore, 0);
        return {
          id, label,
          baseScore: kids.some(c => c.baseScore !== null) ? Math.round(baseSum * 100) / 100 : null,
          afterScore: Math.round(afterSum * 100) / 100,
          computed: true, children: kids,
        };
      }

      return {
        id, label,
        baseScore: base,
        afterScore: base !== null ? Math.round((base + delta) * 100) / 100 : delta,
        computed: false, children: [],
      };
    }

    const tree: ROTreeNode[] = [];
    for (const rid of rootIds) { const n = buildNode(rid, 0); if (n) tree.push(n); }
    const reachable = new Set<string>();
    (function collect(nodes: ROTreeNode[]) { for (const n of nodes) { reachable.add(n.id); collect(n.children); } })(tree);
    for (const id of allIds) {
      if (!reachable.has(id)) {
        const m = muscleMap.get(id);
        const base = id in baseFlat ? baseFlat[id] : null;
        const delta = deltaScores?.[id] ?? 0;
        tree.push({ id, label: m?.label ?? id, baseScore: base, afterScore: base !== null ? Math.round((base + delta) * 100) / 100 : delta, computed: false, children: [] });
      }
    }
    return tree;
  }, [baseFlat, deltaScores, allMuscles]);

  if (displayTree.length === 0) {
    return <div className={sp.deltaRules.emptyStateTree}>No muscle targets</div>;
  }

  const renderNode = (node: ROTreeNode, depth: number) => {
    const rowStyle = depth === 0 ? sp.deltaRules.treeRowPrimaryReadOnly : depth === 1 ? sp.deltaRules.treeRowSecondaryReadOnly : sp.deltaRules.treeRowTertiaryReadOnly;
    const labelStyle = depth === 0 ? sp.treeRow.primaryLabel : depth === 1 ? sp.treeRow.secondaryLabel : sp.treeRow.tertiaryLabel;
    const wrapperStyle = depth === 0 ? sp.deltaRules.treeItemReadOnly : sp.deltaRules.treeItemFlatReadOnly;
    const nestStyle = depth === 0 ? sp.deltaRules.treeNestSecondariesReadOnly : sp.deltaRules.treeNestTertiariesReadOnly;

    const isNew = node.baseScore === null;
    const isChanged = !isNew && node.baseScore !== node.afterScore;

    return (
      <div key={node.id} className={wrapperStyle}>
        <div className={rowStyle}>
          <span className={labelStyle}>{node.label}</span>
          {isNew ? (
            <>
              <span className={sp.deltaRules.addBadge}>Add</span>
              <span className={sp.scoreInput.readOnly}>{node.afterScore}</span>
            </>
          ) : isChanged ? (
            <>
              <span className={sp.scoreInput.readOnly}>{node.baseScore}</span>
              <span className={sp.deltaRules.arrowSeparator}>→</span>
              <span className={sp.scoreInput.changed}>{node.afterScore}</span>
            </>
          ) : (
            <span className={sp.scoreInput.readOnly}>{node.baseScore}</span>
          )}
        </div>
        {node.children.length > 0 && (
          <div className={nestStyle}>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={sp.deltaRules.treeContainer}>
      {displayTree.map(node => renderNode(node, 0))}
    </div>
  );
}

function DeltaMuscleTree({
  delta,
  onSave,
  allMuscles,
  motionId,
}: {
  delta: Record<string, number>;
  onSave: (motionId: string, flat: Record<string, number>) => void;
  allMuscles: MuscleRecord[];
  motionId: string;
}) {
  const tree = useMemo(() => buildTreeFromFlat(delta, allMuscles), [delta, allMuscles]);

  const primaryMuscles = useMemo(() =>
    getScorableMuscles(allMuscles.filter(m => !m.parent_ids || m.parent_ids.length === 0)).map(m => ({ id: m.id, label: m.label })),
    [allMuscles]
  );
  const getSecondariesFor = (pId: string) =>
    getScorableMuscles(allMuscles.filter(m => m.parent_ids && m.parent_ids.includes(pId))).map(m => ({ id: m.id, label: m.label }));
  const getTertiariesFor = (sId: string) =>
    getScorableMuscles(allMuscles.filter(m => m.parent_ids && m.parent_ids.includes(sId))).map(m => ({ id: m.id, label: m.label }));

  const save = (newTree: TreeNode) => {
    recomputeScores(newTree);
    onSave(motionId, filterScorableOnly(flattenTree(newTree), allMuscles));
  };

  const setScore = (path: string[], score: number) => {
    if (isNaN(score)) return;
    const muscleId = path[path.length - 1];
    if (!isMuscleScorable(allMuscles, muscleId)) return;
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

  const activePrimaries = Object.keys(tree).filter(k => k !== '_score');
  const unusedPrimaries = primaryMuscles.filter(pm => !activePrimaries.includes(pm.id));

  const ScoreInput = ({ path, score, computed }: { path: string[]; score: number; computed?: boolean }) => {
    const [localValue, setLocalValue] = useState<string>(String(score));
    const [isFocused, setIsFocused] = useState(false);
    const muscleId = path[path.length - 1];
    const scorable = isMuscleScorable(allMuscles, muscleId);

    useEffect(() => {
      if (!isFocused) setLocalValue(String(score));
    }, [score, isFocused]);

    if (computed) {
      return (
        <span className={sp.scoreInput.computed}
          title="Auto-computed from children">{score}</span>
      );
    }

    if (!scorable) {
      return (
        <span className={sp.scoreInput.readOnly} title="Not scorable">{score}</span>
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
    <div className={sp.deltaRules.treeContainer}>
      {activePrimaries.map(pId => {
        const pNode = tree[pId] as TreeNode;
        if (!pNode || typeof pNode !== 'object') return null;
        const pLabel = getMuscleLabel(allMuscles, pId);
        const pScore = pNode._score ?? 0;
        const sKeys = Object.keys(pNode).filter(k => k !== '_score');
        const availSec = getSecondariesFor(pId).filter(s => !sKeys.includes(s.id));
        const pIsComputed = sKeys.length > 0;

        return (
          <div key={pId} className={sp.deltaRules.treeItem}>
            <div className={sp.deltaRules.treeRowPrimary}>
              <span className={sp.treeRow.primaryLabel}>{pLabel}</span>
              <ScoreInput path={[pId]} score={pScore} computed={pIsComputed} />
              <button type="button" onClick={() => removeKey([pId])} className={sp.removeBtn.small}>×</button>
            </div>
            <div className={sp.deltaRules.treeNestSecondaries}>
              {sKeys.map(sId => {
                const sNode = pNode[sId] as TreeNode;
                if (!sNode || typeof sNode !== 'object') return null;
                const sLabel = getMuscleLabel(allMuscles, sId);
                const sScore = sNode._score ?? 0;
                const tKeys = Object.keys(sNode).filter(k => k !== '_score');
                const availTer = getTertiariesFor(sId).filter(t => !tKeys.includes(t.id));
                const sIsComputed = tKeys.length > 0;

                return (
                  <div key={sId} className={sp.deltaRules.treeItemFlat}>
                    <div className={sp.deltaRules.treeRowSecondary}>
                      <span className={sp.treeRow.secondaryLabel}>{sLabel}</span>
                      <ScoreInput path={[pId, sId]} score={sScore} computed={sIsComputed} />
                      <button type="button" onClick={() => removeKey([pId, sId])} className={sp.removeBtn.small}>×</button>
                    </div>
                    {(tKeys.length > 0 || availTer.length > 0) && (
                      <div className={sp.deltaRules.treeNestTertiaries}>
                        {tKeys.map(tId => {
                          const tNode = sNode[tId] as TreeNode;
                          const tScore = (tNode as TreeNode)?._score ?? 0;
                          const tLabel = getMuscleLabel(allMuscles, tId);
                          return (
                            <div key={tId} className={sp.deltaRules.treeRowTertiary}>
                              <span className={sp.treeRow.tertiaryLabel}>{tLabel}</span>
                              <ScoreInput path={[pId, sId, tId]} score={tScore} />
                              <button type="button" onClick={() => removeKey([pId, sId, tId])} className={sp.removeBtn.small}>×</button>
                            </div>
                          );
                        })}
                        {availTer.length > 0 && (
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
              {availSec.length > 0 && (
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
      {unusedPrimaries.length > 0 && (
        <select onChange={e => { if (e.target.value) addPrimary(e.target.value); e.target.value = ''; }}
          className={sp.deltaRules.treeAddDropdown} defaultValue="">
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
        className={`${sp.deltaRules.deltaBadge} ${
          hasNoDelta ? sp.deltaRules.deltaBadgeAlert : sp.deltaRules.deltaBadgeNormal
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span className={sp.deltaRules.deltaBadgeLabel}>Muscle Modifiers (Deltas)</span>
      </div>
      {showTooltip && createPortal(
        <div
          className={sp.tooltip.container}
          style={{ top: `${tooltipPos.top}px`, left: `${tooltipPos.left}px`, maxWidth: '320px' }}
        >
          {entries.length === 0 ? (
            <div className={sp.deltaRules.tooltipEmpty}>No muscle modifiers configured</div>
          ) : (
            <>
              <div className={`${sp.tooltip.header} text-red-300`}>Muscle Modifiers:</div>
              <div className={sp.deltaRules.tooltipEntries}>
                {entries.map(([muscleId, score]) => {
                  const label = allMuscles.find(m => m.id === muscleId)?.label || muscleId;
                  return (
                    <div key={muscleId} className={sp.deltaRules.tooltipEntryRow}>
                      <span>{label}</span>
                      <span className={sp.deltaRules.tooltipScore}>{score}</span>
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
        setAllMotions(Array.isArray(motions) ? (motions as MotionRecord[]) : []);
        setAllMuscles(Array.isArray(muscles) ? (muscles as MuscleRecord[]) : []);
      })
      .catch(err => {
        console.error('Failed to load data:', err);
        setAllMotions([]);
        setAllMuscles([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Normalize value to handle both object deltas and "inherit" strings
  // Preserves "inherit" strings and normalizes object values
  const deltaRules = useMemo(() => {
    if (value == null) return {};
    if (typeof value !== 'object' || Array.isArray(value)) return {};
    const obj = value as Record<string, unknown>;
    const out: Record<string, Record<string, number> | "inherit"> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === "inherit") {
        out[k] = "inherit";
      } else if (v != null && typeof v === 'object' && !Array.isArray(v)) {
        const flat: Record<string, number> = {};
        for (const [mid, score] of Object.entries(v)) {
          if (mid === '_score') continue;
          const n = typeof score === 'number' ? score : Number(score);
          if (!Number.isNaN(n)) flat[mid] = n;
        }
        out[k] = flat;
      }
    }
    return out;
  }, [value]);

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
    const filtered = filterScorableOnly(newDelta, allMuscles);
    if (Object.keys(filtered).length === 0) {
      delete next[motionId];
    } else {
      next[motionId] = filtered;
    }
    onChange(next);
  };

  const toggleInherit = (motionId: string) => {
    const next = { ...deltaRules };
    const currentValue = next[motionId];
    if (currentValue === "inherit") {
      // Switch from inherit to empty object (will show red until user adds deltas)
      next[motionId] = {};
    } else {
      // Switch to inherit
      next[motionId] = "inherit";
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

  // Get primary muscles from a motion's muscle_targets
  const getPrimaryMusclesFromMotion = (motion: MotionRecord): string[] => {
    const targets = motion.muscle_targets as Record<string, unknown> | undefined;
    if (!targets || typeof targets !== 'object') return [];
    return Object.keys(targets).filter(k => k !== '_score');
  };

  // Group motions by primary muscle and sort
  const groupedMotions = useMemo(() => {
    const groups: Record<string, MotionRecord[]> = {};
    const muscles = Array.isArray(allMuscles) ? allMuscles : [];
    const motions = Array.isArray(availableMotions) ? availableMotions : [];
    const primaryMuscles = muscles.filter(m => !m.parent_ids || m.parent_ids.length === 0);
    const primaryMuscleMap = new Map(primaryMuscles.map(m => [m.id, m]));

    // Group motions by their primary muscles
    motions.forEach(motion => {
      const primaryMuscleIds = getPrimaryMusclesFromMotion(motion);
      if (primaryMuscleIds.length === 0) {
        // If no primary muscles, put in "Other" group
        if (!groups['OTHER']) groups['OTHER'] = [];
        groups['OTHER'].push(motion);
      } else {
        // Group by first primary muscle (most motions have one primary)
        const primaryId = primaryMuscleIds[0];
        if (!groups[primaryId]) groups[primaryId] = [];
        groups[primaryId].push(motion);
      }
    });

    // Sort motions within each group by label
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => a.label.localeCompare(b.label));
    });

    // Sort groups by primary muscle label
    const sortedGroups: Array<{ primaryId: string; primaryLabel: string; motions: MotionRecord[] }> = [];
    Object.keys(groups).forEach(primaryId => {
      const primary = primaryMuscleMap.get(primaryId);
      sortedGroups.push({
        primaryId,
        primaryLabel: primary?.label || primaryId,
        motions: groups[primaryId],
      });
    });
    sortedGroups.sort((a, b) => {
      if (a.primaryId === 'OTHER') return 1;
      if (b.primaryId === 'OTHER') return -1;
      return a.primaryLabel.localeCompare(b.primaryLabel);
    });

    return sortedGroups;
  }, [availableMotions, allMuscles]);

  if (loading) {
    return <div className={sp.deltaRules.loading}>Loading motion and muscle data...</div>;
  }

  return (
    <div className={sp.deltaRules.container}>
      {motionEntries.length === 0 ? (
        <div className={sp.deltaRules.emptyState}>
          No motion delta rules configured
        </div>
      ) : (
        motionEntries.map(([motionId, deltaOrInherit]) => {
          const motion = allMotions.find(m => m.id === motionId);
          const motionLabel = motion?.label || motionId;
          const isExp = expanded.has(motionId);
          const isInherit = deltaOrInherit === "inherit";
          const delta = isInherit ? {} : deltaOrInherit;
          const deltaCount = Object.keys(delta).length;
          // Only highlight red if it's an empty object (not "inherit")
          const hasNoDelta = !isInherit && deltaCount === 0;

          return (
            <div key={motionId} className={`${sp.deltaRules.card} ${
              hasNoDelta ? sp.deltaRules.cardAlert : sp.deltaRules.cardNormal
            }`}>
              <div className={`${sp.deltaRules.header} ${
                isExp ? sp.deltaRules.headerExpanded : ''
              } ${hasNoDelta
                ? sp.deltaRules.headerAlert
                : sp.deltaRules.headerNormal
              }`}>
                <div className={sp.deltaRules.headerFlex}>
                  <button
                    type="button"
                    onClick={() => toggleExpand(motionId)}
                    className={sp.deltaRules.toggle}
                  >
                    {isExp ? '▼' : '▶'}
                  </button>
                  <span className={`${sp.deltaRules.label} ${hasNoDelta ? sp.deltaRules.labelAlert : sp.deltaRules.labelNormal}`}>{motionLabel}</span>
                  <span className={sp.deltaRules.motionId}>{motionId}</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInherit}
                      onChange={() => toggleInherit(motionId)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-600">Inherit</span>
                  </label>
                  <DeltaBadge motionDelta={delta} allMuscles={allMuscles} hasNoDelta={hasNoDelta} />
                </div>
                <button
                  type="button"
                  onClick={() => removeMotion(motionId)}
                  className={sp.deltaRules.removeBtn}
                >
                  ×
                </button>
              </div>
              {isExp && !isInherit && (
                <div className={sp.deltaRules.expandedContent}>
                  <div className={sp.deltaRules.scoresRow}>
                    <div className={sp.deltaRules.scoresColumnEditable}>
                      <div className={sp.deltaRules.sectionLabel}>Delta Modifiers</div>
                      <DeltaMuscleTree
                        delta={delta}
                        onSave={updateMotionDelta}
                        allMuscles={allMuscles}
                        motionId={motionId}
                      />
                    </div>
                    <div className={sp.deltaRules.scoresColumnReadOnly}>
                      <div className={sp.deltaRules.sectionLabel}>Base Muscle Scores</div>
                      <ReadOnlyMuscleTree
                        targets={(motion?.muscle_targets as Record<string, unknown>) || {}}
                        allMuscles={allMuscles}
                        deltaScores={delta}
                      />
                    </div>
                  </div>
                </div>
              )}
              {isExp && isInherit && (
                <div className={sp.deltaRules.expandedContent}>
                  <div className="px-4 pt-3 pb-1 text-sm text-green-700 italic font-medium">
                    Inherited — delta rules come from parent motion
                  </div>
                  <div className={sp.deltaRules.scoresRow}>
                    <div className={sp.deltaRules.scoresColumnReadOnly}>
                      <div className={sp.deltaRules.sectionLabel}>Base Muscle Scores</div>
                      <ReadOnlyMuscleTree
                        targets={(motion?.muscle_targets as Record<string, unknown>) || {}}
                        allMuscles={allMuscles}
                        deltaScores={{}}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
      {availableMotions.length > 0 && (
        <div className={sp.deltaRules.addMotionSection}>
          <select
            onChange={e => { if (e.target.value) addMotion(e.target.value); e.target.value = ''; }}
            className={sp.deltaRules.addMotionDropdown}
            defaultValue=""
          >
            <option value="">+ Add motion...</option>
            {groupedMotions.map(group => (
              <optgroup key={group.primaryId} label={group.primaryLabel} className={sp.deltaRules.addMotionOptgroup}>
                {group.motions.map(m => (
                  <option key={m.id} value={m.id} className={sp.deltaRules.addMotionOption}>
                    {m.label} ({m.id})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
