import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../api';
import { sp } from '../../styles/sidePanelStyles';
import { filterScorableOnly, isMuscleScorable, getScorableMuscles } from '../../utils/muscleScorable';
import { buildPrimaryMuscleDropdownGroups, buildAddMuscleDropdownGroups, flattenAddMuscleGroupsToOptions } from '../../utils/muscleDropdownGroups';
import MuscleSecondarySelect from './MuscleSecondarySelect';
import {
  buildMuscleTreeFromFlat,
  flattenMuscleTree,
  getChildrenOf,
  getPathFromRootToMuscle,
  type TreeNode as SharedTreeNode,
  type MuscleRecord as SharedMuscleRecord,
} from '../../../../shared/utils/muscleTree';


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

type TreeNode = SharedTreeNode;

function getMuscleLabel(allMuscles: MuscleRecord[], id: string): string {
  return allMuscles.find(m => m.id === id)?.label || id;
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
        const calculatedBaseTotal = (id in baseFlat ? baseFlat[id] : 0) + kids.reduce((s, c) => s + (c.baseScore ?? 0), 0);
        const afterSum = kids.reduce((s, c) => s + c.afterScore, 0);
        const hasAnyBase = id in baseFlat || kids.some(c => c.baseScore !== null);
        return {
          id, label,
          baseScore: hasAnyBase ? Math.round(calculatedBaseTotal * 100) / 100 : null,
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

  const renderNode = (node: ROTreeNode, depth: number) => {
    const rowStyleByDepth = [sp.deltaRules.treeRowPrimaryReadOnly, sp.deltaRules.treeRowSecondaryReadOnly, sp.deltaRules.treeRowTertiaryReadOnly];
    const labelStyleByDepth = [sp.treeRow.primaryLabel, sp.treeRow.secondaryLabel, sp.treeRow.tertiaryLabel];
    const rowStyle = rowStyleByDepth[depth] ?? sp.deltaRules.treeRowTertiaryReadOnly;
    const labelStyle = labelStyleByDepth[depth] ?? sp.treeRow.tertiaryLabel;
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
      {displayTree.length === 0 ? (
        <div className="text-xs text-gray-400 italic py-2">No muscle targets</div>
      ) : (
        displayTree.map(node => renderNode(node, 0))
      )}
    </div>
  );
}

/** Standalone score input for DeltaMuscleTree so hook order is stable when expanding/collapsing. */
function MotionPathsScoreInput({
  path,
  score,
  sumChildren,
  allMuscles,
  onSetScore,
}: {
  path: string[];
  score: number;
  sumChildren?: number;
  allMuscles: MuscleRecord[];
  onSetScore: (path: string[], score: number) => void;
}) {
  const [localValue, setLocalValue] = useState<string>(String(score));
  const [isFocused, setIsFocused] = useState(false);
  const muscleId = path[path.length - 1];
  const scorable = isMuscleScorable(allMuscles, muscleId);
  const total = sumChildren !== undefined ? Math.round((score + sumChildren) * 100) / 100 : undefined;

  useEffect(() => {
    if (!isFocused) setLocalValue(String(score));
  }, [score, isFocused]);

  if (!scorable) {
    return (
      <span className={sp.scoreInput.readOnly} title="Not scorable">
        {total !== undefined ? total : score}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <input
        type="number"
        step="0.1"
        value={localValue}
        onFocus={() => setIsFocused(true)}
        onChange={e => setLocalValue(e.target.value)}
        onBlur={e => {
          setIsFocused(false);
          const numVal = parseFloat(e.target.value);
          if (isNaN(numVal) || e.target.value === '') setLocalValue(String(score));
          else onSetScore(path, numVal);
        }}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        className={sp.scoreInput.editable}
      />
      {total !== undefined && (
        <span className={sp.scoreInput.computed} title="Parent + children total">{total}</span>
      )}
    </span>
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
  const tree = useMemo(() => buildMuscleTreeFromFlat(delta, allMuscles as SharedMuscleRecord[]), [delta, allMuscles]);
  const usedIds = useMemo(() => new Set(Object.keys(delta)), [delta]);
  const musclesForDropdown = useMemo(() =>
    allMuscles.map(m => ({ id: m.id, label: m.label, parent_ids: m.parent_ids ?? [], is_scorable: m.is_scorable })),
    [allMuscles]
  );
  const primaryDropdownGroups = useMemo(
    () => buildPrimaryMuscleDropdownGroups(musclesForDropdown, usedIds),
    [musclesForDropdown, usedIds]
  );
  const hasPrimaryOptions = primaryDropdownGroups.some(grp => grp.options.length > 0);
  const primaryOptionsFlattened = useMemo(() => flattenAddMuscleGroupsToOptions(primaryDropdownGroups), [primaryDropdownGroups]);

  const primaryMuscles = useMemo(() =>
    getScorableMuscles(allMuscles.filter(m => (m.parent_ids ?? []).length === 0)).map(m => ({ id: m.id, label: m.label })),
    [allMuscles]
  );
  const muscleMapForPath = useMemo(() => new Map(allMuscles.map(m => [m.id, m as SharedMuscleRecord])), [allMuscles]);

  const save = (newTree: TreeNode) => {
    onSave(planeId, filterScorableOnly(flattenMuscleTree(newTree), allMuscles));
  };

  const setScore = (path: string[], score: number) => {
    if (isNaN(score)) return;
    const muscleId = path[path.length - 1];
    if (!isMuscleScorable(allMuscles, muscleId)) return;
    const nd: TreeNode = JSON.parse(JSON.stringify(tree));
    let node: TreeNode = nd;
    for (const key of path) {
      if (!node[key] || typeof node[key] !== 'object') (node as Record<string, TreeNode>)[key] = { _score: 0 };
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
    delete (node as Record<string, unknown>)[path[path.length - 1]];
    save(nd);
  };

  function ensurePathAndSetScore(nd: TreeNode, path: string[], score: number) {
    let node: TreeNode = nd;
    for (let i = 0; i < path.length; i++) {
      const id = path[i];
      if (!node[id] || typeof node[id] === 'number') (node as Record<string, TreeNode>)[id] = { _score: 0 };
      node = node[id] as TreeNode;
    }
    node._score = score;
  }

  const addFullPath = (path: string[]) => {
    if (path.length === 0) return;
    const nd: TreeNode = JSON.parse(JSON.stringify(tree));
    ensurePathAndSetScore(nd, path, 0);
    save(nd);
  };

  const addChild = (parentPath: string[], childId: string) => {
    const nd: TreeNode = JSON.parse(JSON.stringify(tree));
    let node: TreeNode = nd;
    for (const key of parentPath) {
      if (!node[key] || typeof node[key] !== 'object') (node as Record<string, TreeNode>)[key] = { _score: 0 };
      node = node[key] as TreeNode;
    }
    if (!node[childId] || typeof node[childId] === 'number') (node as Record<string, TreeNode>)[childId] = { _score: 0 };
    save(nd);
  };

  const addMuscleUnderPrimary = (pId: string, muscleId: string) => {
    const path = getPathFromRootToMuscle(muscleId, muscleMapForPath);
    if (path.length === 0 || path[0] !== pId) return;
    addFullPath(path);
  };

  const addMuscleByPath = (muscleId: string) => {
    const path = getPathFromRootToMuscle(muscleId, muscleMapForPath);
    if (path.length === 0) return;
    addFullPath(path);
  };

  const activePrimaries = Object.keys(tree).filter(k => k !== '_score');

  const rowStyleByDepth = [sp.deltaRules.treeRowPrimary, sp.deltaRules.treeRowSecondary, sp.deltaRules.treeRowTertiary];
  const labelStyleByDepth = [sp.treeRow.primaryLabel, sp.treeRow.secondaryLabel, sp.treeRow.tertiaryLabel];

  function totalOf(node: TreeNode): number {
    const keys = Object.keys(node).filter(k => k !== '_score');
    let sum = node._score ?? 0;
    for (const k of keys) {
      const child = node[k];
      if (typeof child === 'object') sum += totalOf(child);
    }
    return sum;
  }
  function sumChildrenOf(node: TreeNode): number | undefined {
    const keys = Object.keys(node).filter(k => k !== '_score');
    if (keys.length === 0) return undefined;
    const sum = keys.reduce((s, k) => {
      const child = node[k];
      return s + (typeof child === 'object' ? totalOf(child) : 0);
    }, 0);
    return Math.round(sum * 100) / 100;
  }

  function renderTreeNode(nodeId: string, node: TreeNode, path: string[], depth: number): React.ReactNode {
    if (!node || typeof node !== 'object') return null;
    const rowStyle = rowStyleByDepth[depth] ?? sp.deltaRules.treeRowTertiary;
    const labelStyle = labelStyleByDepth[depth] ?? sp.treeRow.tertiaryLabel;
    const childKeys = Object.keys(node).filter(k => k !== '_score');
    const sumChildren = sumChildrenOf(node);
    const parentId = path[path.length - 1];
    const addGroups = buildAddMuscleDropdownGroups(parentId, musclesForDropdown, usedIds);
    const addOptions = flattenAddMuscleGroupsToOptions(addGroups);
    const hasAddOptions = addOptions.length > 0;
    const nestStyle = depth === 0 ? sp.deltaRules.treeNestSecondaries : sp.deltaRules.treeNestTertiaries;

    return (
      <div key={nodeId} className={depth === 0 ? sp.deltaRules.treeItem : sp.deltaRules.treeItemFlat}>
        <div className={rowStyle}>
          <span className={labelStyle}>{getMuscleLabel(allMuscles, nodeId)}</span>
          <MotionPathsScoreInput path={path} score={node._score ?? 0} sumChildren={sumChildren} allMuscles={allMuscles} onSetScore={setScore} />
          <button type="button" onClick={() => removeKey(path)} className={sp.removeBtn.small}>×</button>
        </div>
        {(childKeys.length > 0 || hasAddOptions) && (
          <div className={nestStyle}>
            {childKeys.map(cId => renderTreeNode(cId, node[cId] as TreeNode, [...path, cId], depth + 1))}
            {hasAddOptions && (
              <MuscleSecondarySelect
                options={addOptions}
                onChange={v => addChild(path, v)}
                className={sp.deltaRules.treeAddDropdown}
                placeholder="+ Add child..."
              />
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={sp.deltaRules.treeContainer}>
      {activePrimaries.map(pId => renderTreeNode(pId, tree[pId] as TreeNode, [pId], 0))}
      {hasPrimaryOptions && (
        <MuscleSecondarySelect
          options={primaryOptionsFlattened}
          onChange={addMuscleByPath}
          className={sp.deltaRules.treeAddDropdown}
          placeholder="+ muscle group..."
        />
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

  // Must run after all hooks to satisfy Rules of Hooks (no early return before this).
  const selectedPlanes = useMemo(
    () =>
      loading
        ? []
        : current.options
            .map(id => planes.find(p => p.id === id))
            .filter((p): p is MotionPath => p != null),
    [loading, current.options, planes]
  );

  // No early return: render loading vs content so hook order is identical every render (ADMIN_UI_NOTES).
  return loading ? (
    <div className={sp.loading}>Loading motion paths...</div>
  ) : (
    <div className="space-y-1">
      {selectedPlanes.length === 0 ? (
        <div className={sp.emptyState.box}>
          No motion paths assigned
        </div>
      ) : (
        selectedPlanes.map(plane => {
          const cardKey = `mp-card-${plane.id}`;
          const isExp = expanded.has(cardKey);
          const rawMotionDelta = motionId ? plane.delta_rules?.[motionId] : undefined;
          const isInherit = rawMotionDelta === 'inherit';
          const motionDelta =
            isInherit || !rawMotionDelta || typeof rawMotionDelta !== 'object'
              ? ({} as Record<string, number>)
              : rawMotionDelta;
          const deltaCount = Object.keys(motionDelta).length;
          const isDefault = current.default === plane.id;
          const hasNoDelta = !isInherit && deltaCount === 0;
          const parentMotion = currentMotion?.parent_id
            ? allMotions.find(m => m.id === currentMotion.parent_id)
            : null;
          const baseTargetsForDisplay = isInherit && parentMotion
            ? (parentMotion.muscle_targets as Record<string, unknown>) || {}
            : (currentMotion?.muscle_targets as Record<string, unknown>) || {};

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
                  {isInherit ? (
                    <>
                      <div className="px-4 pt-3 pb-1 text-sm text-green-700 italic font-medium">
                        Inherited — delta rules come from parent motion
                      </div>
                      <div className={sp.deltaRules.scoresRow}>
                        <div className={sp.deltaRules.scoresColumnReadOnly}>
                          <div className={sp.deltaRules.sectionLabel}>Base Muscle Scores (from parent)</div>
                          <ReadOnlyMuscleTree
                            targets={baseTargetsForDisplay}
                            allMuscles={allMuscles}
                            deltaScores={{}}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className={sp.deltaRules.scoresRow}>
                      <div className={sp.deltaRules.scoresColumnEditable}>
                        <div className={sp.deltaRules.sectionLabel}>Delta Modifiers</div>
                        <DeltaMuscleTree
                          key={`dmt-${plane.id}`}
                          delta={motionDelta}
                          onSave={saveDelta}
                          allMuscles={allMuscles}
                          planeId={plane.id}
                        />
                      </div>
                      <div className={sp.deltaRules.scoresColumnReadOnly}>
                        <div className={sp.deltaRules.sectionLabel}>Base Muscle Scores</div>
                        <ReadOnlyMuscleTree
                          targets={baseTargetsForDisplay}
                          allMuscles={allMuscles}
                          deltaScores={motionDelta}
                        />
                      </div>
                    </div>
                  )}
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
