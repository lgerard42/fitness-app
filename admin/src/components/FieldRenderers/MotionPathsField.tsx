import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../api';
import { sp } from '../../styles/sidePanelStyles';
import { filterScorableOnly, isMuscleScorable, getScorableMuscles } from '../../utils/muscleScorable';


interface MotionPath {
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
  default_delta_configs?: { motionPaths?: string };
  [key: string]: unknown;
}

interface MuscleRecord {
  id: string;
  label: string;
  parent_ids: string[];
  is_scorable?: boolean;
}

/** Stored shape: { motionPaths?: string } (table key → default id). Options derived from motionPaths.delta_rules. */
export type DefaultDeltaConfigs = { motionPaths?: string; [key: string]: unknown };

interface MotionPathsFieldProps {
  value: DefaultDeltaConfigs | Record<string, unknown> | null | undefined;
  onChange: (v: DefaultDeltaConfigs) => void;
  motionId?: string;
  onOpenRow?: (row: Record<string, unknown>) => void;
}

function getDefaultFromValue(raw: unknown): string {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    const v = obj.motionPaths;
    return typeof v === 'string' ? v : '';
  }
  return '';
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
    const m = allMuscles.find(mu => mu.id === muscleId);
    if (!m || m.parent_ids.length === 0) {
      if (!tree[muscleId]) tree[muscleId] = { _score: 0 };
      (tree[muscleId] as TreeNode)._score = score;
      continue;
    }
    for (const pid of m.parent_ids) {
      const parent = allMuscles.find(mu => mu.id === pid);
      if (!parent) continue;
      if (parent.parent_ids.length === 0) {
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
    return <div className="text-xs text-gray-400 italic py-2">No muscle targets</div>;
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
  planeId,
}: {
  delta: Record<string, number>;
  onSave: (planeId: string, flat: Record<string, number>) => void;
  allMuscles: MuscleRecord[];
  planeId: string;
}) {
  const tree = useMemo(() => buildTreeFromFlat(delta, allMuscles), [delta, allMuscles]);

  const primaryMuscles = useMemo(() =>
    getScorableMuscles(allMuscles.filter(m => m.parent_ids.length === 0)).map(m => ({ id: m.id, label: m.label })),
    [allMuscles]
  );
  const getSecondariesFor = (pId: string) =>
    getScorableMuscles(allMuscles.filter(m => m.parent_ids.includes(pId))).map(m => ({ id: m.id, label: m.label }));
  const getTertiariesFor = (sId: string) =>
    getScorableMuscles(allMuscles.filter(m => m.parent_ids.includes(sId))).map(m => ({ id: m.id, label: m.label }));

  const save = (newTree: TreeNode) => {
    recomputeScores(newTree);
    onSave(planeId, filterScorableOnly(flattenTree(newTree), allMuscles));
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
        className={`${sp.motionPath.deltaBadge} ${
          hasNoDelta ? sp.motionPath.deltaBadgeAlert : sp.motionPath.deltaBadgeNormal
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span className={sp.motionPath.deltaBadgeLabel}>Muscle Modifiers (Deltas)</span>
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

export default function MotionPathsField({ value, onChange, motionId, onOpenRow }: MotionPathsFieldProps) {
  const [planes, setPlanes] = useState<MotionPath[]>([]);
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
        api.getTable('motionPaths'),
        api.getTable('motions'),
        api.getTable('muscles'),
      ]);
      setPlanes((planesData as MotionPath[]).filter(p => p.is_active !== false).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
      setAllMotions(motionsData as MotionRecord[]);
      setAllMuscles((musclesData as { id: string; label: string; parent_ids?: string[]; is_scorable?: boolean }[]).map(m => ({
        id: m.id,
        label: m.label,
        parent_ids: Array.isArray(m.parent_ids) ? m.parent_ids : [],
        is_scorable: m.is_scorable,
      })));
    } catch {
      setPlanes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const defaultPlaneId = useMemo(() => getDefaultFromValue(value), [value]);
  /** Options = path IDs that have this motion in their delta_rules (source of truth on motionPaths table) */
  const options = useMemo(() => {
    if (!motionId) return [];
    return planes
      .filter(p => p.delta_rules && typeof p.delta_rules === 'object' && motionId in p.delta_rules)
      .map(p => p.id);
  }, [planes, motionId]);
  const current = useMemo(() => ({ default: defaultPlaneId, options }), [defaultPlaneId, options]);
  const selectedSet = useMemo(() => new Set(options), [options]);

  const currentMotion = useMemo(() => allMotions.find(m => m.id === motionId), [allMotions, motionId]);

  const familyMotions = useMemo(() => {
    if (!currentMotion || !motionId) return [];
    const primaryId = currentMotion.parent_id || currentMotion.id;
    return allMotions.filter(m => m.id === primaryId || m.parent_id === primaryId);
  }, [currentMotion, motionId, allMotions]);

  const familyPlaneUsage = useMemo(() => {
    const usage: Record<string, { motionId: string; motionLabel: string }> = {};
    const familyIds = new Set(familyMotions.map(m => m.id));
    familyIds.delete(motionId ?? '');
    for (const plane of planes) {
      const rules = plane.delta_rules;
      if (!rules || typeof rules !== 'object') continue;
      for (const mid of Object.keys(rules)) {
        if (familyIds.has(mid)) {
          const motion = allMotions.find(m => m.id === mid);
          usage[plane.id] = { motionId: mid, motionLabel: motion?.label ?? mid };
          break;
        }
      }
    }
    return usage;
  }, [planes, familyMotions, motionId, allMotions]);

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

  const addPlane = useCallback(async (planeId: string) => {
    const plane = planes.find(p => p.id === planeId);
    if (!plane || !motionId) return;
    const newRules = { ...(plane.delta_rules || {}), [motionId]: plane.delta_rules?.[motionId] ?? {} };
    try {
      await api.updateRow('motionPaths', planeId, { delta_rules: newRules });
      setPlanes(prev => prev.map(p => p.id === planeId ? { ...p, delta_rules: newRules } : p));
      const nextDefault = defaultPlaneId || planeId;
      onChange({ ...(value as DefaultDeltaConfigs) || {}, motionPaths: nextDefault });
      await loadData();
    } catch (err) {
      console.error('Failed to add path to motion:', err);
    }
  }, [planes, motionId, defaultPlaneId, value, onChange, loadData]);

  const removePlane = useCallback(async (planeId: string) => {
    const plane = planes.find(p => p.id === planeId);
    if (!plane || !motionId) return;
    const newRules = { ...(plane.delta_rules || {}) };
    delete newRules[motionId];
    try {
      await api.updateRow('motionPaths', planeId, { delta_rules: newRules });
      setPlanes(prev => prev.map(p => p.id === planeId ? { ...p, delta_rules: newRules } : p));
      const nextDefault = defaultPlaneId === planeId ? (options.filter(id => id !== planeId)[0] ?? '') : defaultPlaneId;
      onChange({ ...(value as DefaultDeltaConfigs) || {}, motionPaths: nextDefault });
      await loadData();
    } catch (err) {
      console.error('Failed to remove path from motion:', err);
    }
  }, [planes, motionId, defaultPlaneId, options, value, onChange, loadData]);

  const setDefault = useCallback((planeId: string) => {
    onChange({ ...((value as DefaultDeltaConfigs) || {}), motionPaths: planeId });
  }, [value, onChange]);

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
      await api.updateRow('motionPaths', planeId, { delta_rules: newDeltaRules });
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
    const plane = planes.find(p => p.id === planeId);
    if (!plane) return;
    try {
      const newRules = { ...(plane.delta_rules || {}) };
      if (fromMotionId) delete newRules[fromMotionId];
      newRules[toMotionId] = newRules[toMotionId] ?? {};
      await api.updateRow('motionPaths', planeId, { delta_rules: newRules });
      setPlanes(prev => prev.map(p => p.id === planeId ? { ...p, delta_rules: newRules } : p));
      if (toMotionId === motionId) {
        const nextDefault = defaultPlaneId || planeId;
        onChange({ ...((value as DefaultDeltaConfigs) || {}), motionPaths: nextDefault });
      } else if (fromMotionId === motionId) {
        const nextDefault = defaultPlaneId === planeId ? (options.filter(id => id !== planeId)[0] ?? '') : defaultPlaneId;
        onChange({ ...((value as DefaultDeltaConfigs) || {}), motionPaths: nextDefault });
      }
      await loadData();
    } catch (err) {
      console.error('Failed to reassign path:', err);
    }
  }, [planes, motionId, defaultPlaneId, options, value, onChange, loadData]);

  const handleFamilyMouseEnter = () => {
    if (familyExpanded) return;
    if (familyRef.current) {
      const rect = familyRef.current.getBoundingClientRect();
      setFamilyTooltipPos({ top: rect.bottom + 4, left: rect.left });
    }
    setFamilyTooltip(true);
  };

  if (loading) {
    return <div className={sp.loading}>Loading motion paths...</div>;
  }

  const selectedPlanes = current.options
    .map(id => planes.find(p => p.id === id))
    .filter((p): p is MotionPath => p != null);

  return (
    <div className="space-y-1">
      {selectedPlanes.length === 0 ? (
        <div className={sp.emptyState.box}>
          No motion paths assigned
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
            <div key={plane.id} className={`${sp.motionPath.card} ${
              hasNoDelta ? sp.motionPath.cardAlert : sp.motionPath.cardNormal
            }`}>
              <div className={`${sp.motionPath.header} ${
                isExp ? sp.motionPath.headerExpanded : ''
              } ${hasNoDelta
                ? sp.motionPath.headerAlert
                : sp.motionPath.headerNormal
              }`}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button type="button" onClick={() => toggle(cardKey)}
                    className={sp.motionPath.toggle}>
                    {isExp ? '▼' : '▶'}
                  </button>
                  <span className={`${sp.motionPath.label} ${hasNoDelta ? sp.motionPath.labelAlert : sp.motionPath.labelNormal}`}>{plane.label}</span>
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
                  className={sp.motionPath.removeBtn}>×</button>
              </div>

              {isExp && motionId && (
                <div className={sp.motionPath.expandedContent}>
                  <div className={sp.deltaRules.scoresRow}>
                    <div className={sp.deltaRules.scoresColumnEditable}>
                      <div className={sp.deltaRules.sectionLabel}>Delta Modifiers</div>
                      <DeltaMuscleTree
                        delta={motionDelta}
                        onSave={saveDelta}
                        allMuscles={allMuscles}
                        planeId={plane.id}
                      />
                    </div>
                    <div className={sp.deltaRules.scoresColumnReadOnly}>
                      <div className={sp.deltaRules.sectionLabel}>Base Muscle Scores</div>
                      <ReadOnlyMuscleTree
                        targets={(currentMotion?.muscle_targets as Record<string, unknown>) || {}}
                        allMuscles={allMuscles}
                        deltaScores={motionDelta}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {allFamilyPlaneInfo.length > 0 && (
        <div
          ref={familyRef}
          className={sp.motionPath.familyContainer}
          onMouseEnter={handleFamilyMouseEnter}
          onMouseLeave={() => setFamilyTooltip(false)}
        >
          <div
            className={`${sp.motionPath.familyHeader} ${familyExpanded ? 'border-b border-amber-200' : ''}`}
            onClick={() => { setFamilyExpanded(e => !e); setFamilyTooltip(false); }}
          >
            <span className={sp.motionPath.familyToggle}>{familyExpanded ? '▼' : '▶'}</span>
            <span className={sp.motionPath.familyTitle}>
              Motion paths in this family
            </span>
            <span className={sp.motionPath.familyCount}>{allFamilyPlaneInfo.length}</span>
          </div>
          {familyExpanded && (
            <div className={sp.motionPath.familyBody}>
              {allFamilyPlaneInfo.map(info => {
                const isAssigned = info.assignedToMotionId !== null;
                const assignableMotions = familyMotions.filter(
                  m => m.id !== info.assignedToMotionId
                );

                return (
                  <div key={info.planeId} className={sp.motionPath.familyRow}>
                    <span className={isAssigned ? sp.motionPath.familyPlaneLabel : sp.motionPath.familyPlaneDisabled}>
                      {info.planeLabel}
                    </span>
                    {isAssigned ? (
                      <>
                        <span className="text-gray-400">→</span>
                        {onOpenRow ? (
                          <button type="button" onClick={() => handleOpenMotion(info.assignedToMotionId!)}
                            className={sp.motionPath.familyLink}>
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
                        className={sp.motionPath.familyReassign}
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
              <div className={`${sp.tooltip.header} text-amber-300`}>Family Path Overview:</div>
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
