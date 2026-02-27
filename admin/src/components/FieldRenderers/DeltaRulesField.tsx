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
  findRootMuscleId,
  type TreeNode as SharedTreeNode,
  type MuscleRecord as SharedMuscleRecord,
} from '../../../../shared/utils/muscleTree';

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

  if (displayTree.length === 0) {
    return <div className={sp.deltaRules.emptyStateTree}>No muscle targets</div>;
  }

  const rowStyleByDepth = [sp.deltaRules.treeRowPrimaryReadOnly, sp.deltaRules.treeRowSecondaryReadOnly, sp.deltaRules.treeRowTertiaryReadOnly];
  const labelStyleByDepth = [sp.treeRow.primaryLabel, sp.treeRow.secondaryLabel, sp.treeRow.tertiaryLabel];
  const renderNode = (node: ROTreeNode, depth: number) => {
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
      {displayTree.map(node => renderNode(node, 0))}
    </div>
  );
}

/** Score input for delta tree; must be top-level so hooks run in consistent order (ADMIN_UI_NOTES). */
function DeltaRulesScoreInput({
  path,
  score,
  sumChildren,
  allMuscles,
  setScore,
}: {
  path: string[];
  score: number;
  sumChildren?: number;
  allMuscles: MuscleRecord[];
  setScore: (path: string[], score: number) => void;
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
          else setScore(path, numVal);
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
  motionId,
}: {
  delta: Record<string, number>;
  onSave: (motionId: string, flat: Record<string, number>) => void;
  allMuscles: MuscleRecord[];
  motionId: string;
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
    getScorableMuscles(allMuscles.filter(m => !m.parent_ids || m.parent_ids.length === 0)).map(m => ({ id: m.id, label: m.label })),
    [allMuscles]
  );
  const muscleMapForPath = useMemo(() => new Map(allMuscles.map(m => [m.id, m as SharedMuscleRecord])), [allMuscles]);

  const save = (newTree: TreeNode) => {
    onSave(motionId, filterScorableOnly(flattenMuscleTree(newTree), allMuscles));
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
          <DeltaRulesScoreInput path={path} score={node._score ?? 0} sumChildren={sumChildren} allMuscles={allMuscles} setScore={setScore} />
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
