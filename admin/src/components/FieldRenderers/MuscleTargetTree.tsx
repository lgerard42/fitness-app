import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api';
import { filterScorableOnly, isMuscleScorable } from '../../utils/muscleScorable';
import { buildPrimaryMuscleDropdownGroups, buildSecondaryMuscleDropdownGroups } from '../../utils/muscleDropdownGroups';
import MuscleSecondarySelect from './MuscleSecondarySelect';

interface MuscleTargetTreeProps {
  value: Record<string, unknown>;
  onChange: (v: Record<string, number>) => void;
  /** When true, use smaller typography and spacing (e.g. for Baseline card in Matrix V2) */
  compact?: boolean;
  /** When true, no collapse/expand toggles and no bullet; tree is always fully expanded (e.g. Baseline card) */
  alwaysExpanded?: boolean;
}

interface MuscleDef {
  id: string;
  label: string;
  parent_ids: string[];
  is_scorable?: boolean;
}

interface DisplayNode {
  id: string;
  label: string;
  /** Explicit score from flat map (editable for parent and leaf). */
  explicitScore: number;
  /** Sum of children's totals (only when node has children). Total = explicitScore + sumChildren. */
  sumChildren?: number;
  children: DisplayNode[];
  depth: number;
}

function parsePids(m: Record<string, unknown>): string[] {
  const raw = m.parent_ids;
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
}

/** Normalize value to flat Record<id, number> (handles nested or mixed API data). */
function asFlat(v: Record<string, unknown> | null | undefined): Record<string, number> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const result: Record<string, number> = {};
  for (const [k, val] of Object.entries(v)) {
    if (typeof val === 'number') result[k] = val;
  }
  return result;
}

/** Standalone score input so hook order is stable (avoids Rules of Hooks when tree node count changes). */
function MuscleTargetScoreInput({
  muscleId,
  explicitScore,
  sumChildren,
  allMuscles,
  compact,
  onSetScore,
}: {
  muscleId: string;
  explicitScore: number;
  sumChildren?: number;
  allMuscles: MuscleDef[];
  compact: boolean;
  onSetScore: (muscleId: string, score: number) => void;
}) {
  const [localValue, setLocalValue] = useState(String(explicitScore));
  const [isFocused, setIsFocused] = useState(false);
  const scorable = isMuscleScorable(allMuscles, muscleId);
  const total = sumChildren !== undefined ? Math.round((explicitScore + sumChildren) * 100) / 100 : undefined;

  useEffect(() => {
    if (!isFocused) setLocalValue(String(explicitScore));
  }, [explicitScore, isFocused]);

  const inputSize = compact ? 'w-12 px-0.5 py-0 text-[10px]' : 'w-16 px-1 py-0.5 text-xs';

  if (!scorable) {
    return (
      <span className={`${inputSize} bg-gray-100 rounded text-center text-gray-500 inline-block`}
        title="Not scorable">
        {total !== undefined ? total : explicitScore}
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
          const n = parseFloat(e.target.value);
          if (isNaN(n) || e.target.value === '') setLocalValue(String(explicitScore));
          else onSetScore(muscleId, n);
        }}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        className={`${inputSize} border rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
      />
      {total !== undefined && (
        <span className={`${inputSize} bg-gray-100 rounded text-center text-gray-500 italic inline-block`} title="Parent + children total">
          {total}
        </span>
      )}
    </span>
  );
}

export default function MuscleTargetTree({ value, onChange, compact = false, alwaysExpanded = false }: MuscleTargetTreeProps) {
  const [allMuscles, setAllMuscles] = useState<MuscleDef[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.getTable('muscles').then((data) => {
      const muscles = ((data as Record<string, unknown>[]) || []).map(m => ({
        id: m.id as string,
        label: m.label as string,
        parent_ids: parsePids(m),
        is_scorable: m.is_scorable as boolean | undefined,
      }));
      setAllMuscles(muscles);
    }).catch(console.error);
  }, []);

  const { muscleMap, childrenOf, rootIds } = useMemo(() => {
    const mMap = new Map<string, MuscleDef>();
    const cOf = new Map<string, string[]>();
    const rIds: string[] = [];

    for (const m of allMuscles) {
      mMap.set(m.id, m);
      if (m.parent_ids.length === 0) rIds.push(m.id);
      for (const pid of m.parent_ids) {
        if (!cOf.has(pid)) cOf.set(pid, []);
        cOf.get(pid)!.push(m.id);
      }
    }
    return { muscleMap: mMap, childrenOf: cOf, rootIds: rIds };
  }, [allMuscles]);

  const flat: Record<string, number> = asFlat(value as Record<string, unknown>);

  const displayTree = useMemo(() => {
    const flatIds = new Set(Object.keys(flat));
    if (flatIds.size === 0 || muscleMap.size === 0) return [];

    const neededIds = new Set<string>();
    function ensureAncestors(id: string) {
      if (neededIds.has(id)) return;
      neededIds.add(id);
      const m = muscleMap.get(id);
      if (!m) return;
      for (const pid of m.parent_ids) ensureAncestors(pid);
    }
    for (const id of flatIds) ensureAncestors(id);

    function buildNode(id: string, depth: number): DisplayNode | null {
      if (!neededIds.has(id)) return null;
      const m = muscleMap.get(id);
      const label = m?.label ?? id;
      const childIds = childrenOf.get(id) || [];
      const childNodes = childIds
        .map(cid => buildNode(cid, depth + 1))
        .filter((n): n is DisplayNode => n !== null);

      const explicitScore = flat[id] ?? 0;
      const hasChildren = childNodes.length > 0;
      const sumChildren = hasChildren
        ? Math.round(childNodes.reduce((s, c) => s + c.explicitScore + (c.sumChildren ?? 0), 0) * 100) / 100
        : undefined;

      return { id, label, explicitScore, sumChildren, children: childNodes, depth };
    }

    const tree: DisplayNode[] = [];
    for (const rid of rootIds) {
      const node = buildNode(rid, 0);
      if (node) tree.push(node);
    }

    const reachable = new Set<string>();
    function collectIds(nodes: DisplayNode[]) {
      for (const n of nodes) { reachable.add(n.id); collectIds(n.children); }
    }
    collectIds(tree);
    for (const id of flatIds) {
      if (!reachable.has(id)) {
        const m = muscleMap.get(id);
        tree.push({ id, label: m?.label ?? id, explicitScore: flat[id] ?? 0, children: [], depth: 0 });
      }
    }
    return tree;
  }, [flat, muscleMap, childrenOf, rootIds]);

  const toggleExpanded = (key: string) =>
    setExpanded(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const setScore = (muscleId: string, score: number) => {
    if (isNaN(score) || !isMuscleScorable(allMuscles, muscleId)) return;
    onChange(filterScorableOnly({ ...flat, [muscleId]: score }, allMuscles));
  };

  const addMuscle = (id: string) => {
    if (id in flat || !isMuscleScorable(allMuscles, id)) return;
    onChange(filterScorableOnly({ ...flat, [id]: 0 }, allMuscles));
  };

  const removeMuscle = (id: string) => {
    const newFlat = { ...flat };
    function removeRec(mid: string) {
      delete newFlat[mid];
      for (const kid of childrenOf.get(mid) || []) {
        if (kid in newFlat) removeRec(kid);
      }
    }
    removeRec(id);
    onChange(filterScorableOnly(newFlat, allMuscles));
  };

  const usedIds = useMemo(() => new Set(Object.keys(flat)), [flat]);

  const getAvailableChildren = (parentId: string): MuscleDef[] =>
    (childrenOf.get(parentId) || [])
      .map(cid => muscleMap.get(cid))
      .filter((m): m is MuscleDef => !!m && !(m.id in flat) && m.is_scorable !== false);

  const primaryDropdownGroups = useMemo(
    () => buildPrimaryMuscleDropdownGroups(allMuscles, usedIds),
    [allMuscles, usedIds]
  );
  const hasPrimaryOptions = primaryDropdownGroups.some(g => g.options.length > 0);

  const renderNode = (node: DisplayNode, pathKey: string) => {
    const isExpanded = alwaysExpanded || expanded.has(pathKey);
    const hasChildren = node.children.length > 0;
    const available = getAvailableChildren(node.id);
    const secondaryGroups = node.depth === 0 ? buildSecondaryMuscleDropdownGroups(allMuscles, node.id, usedIds) : [];
    const hasSecondaryOptions = secondaryGroups.some(g => g.options.length > 0);
    const showAddDropdown = node.depth === 0 ? hasSecondaryOptions : available.length > 0;
    const isRoot = node.depth === 0;
    const isLeaf = !hasChildren && !showAddDropdown;

    const addLabel = node.depth === 0 ? '+ Add child...' : node.depth === 1 ? '+ Add child...' : '+ Add child...';

    return (
      <div key={pathKey} className={`border rounded ${isRoot ? 'bg-white' : `bg-gray-50 ${compact ? 'rounded-sm' : ''}`}`}>
        {/* header */}
        <div className={`flex items-center bg-red-50 ${compact
          ? `${isRoot ? 'px-2 py-1' : 'px-1.5 py-0.5'} gap-1.5`
          : `${isRoot ? 'px-3 py-2' : 'px-2 py-1.5'} gap-2`
        }`}>
          {!alwaysExpanded && (hasChildren || showAddDropdown) ? (
            <button type="button" onClick={() => toggleExpanded(pathKey)}
              className={`text-gray-500 flex-shrink-0 ${compact ? 'text-[10px] w-3' : 'text-xs w-4'}`}>
              {isExpanded ? '▼' : '▶'}
            </button>
          ) : (
            !alwaysExpanded && (
              <span className={`text-gray-400 flex items-center justify-center flex-shrink-0 ${compact ? 'text-[8px] w-3' : 'text-[10px] w-4'}`}>●</span>
            )
          )}

          <span className={`${isRoot ? 'font-medium' : ''} text-red-800 truncate ${compact ? 'text-[11px]' : isLeaf ? 'text-xs' : 'text-sm'}`}>
            {node.label}
          </span>

          <MuscleTargetScoreInput
            muscleId={node.id}
            explicitScore={node.explicitScore}
            sumChildren={node.sumChildren}
            allMuscles={allMuscles}
            compact={compact}
            onSetScore={setScore}
          />

          <button type="button" onClick={() => removeMuscle(node.id)}
            className={`ml-auto text-red-400 hover:text-red-600 flex-shrink-0 ${compact ? 'text-[10px]' : 'text-xs'}`}>
            {compact || !isRoot ? 'x' : 'Remove'}
          </button>
        </div>

        {/* children */}
        {isExpanded && (
          <div className={compact
            ? `${isRoot ? 'pl-4 pr-1.5 py-1' : 'pl-4 pr-1 py-0.5'} space-y-0.5`
            : `${isRoot ? 'pl-6 pr-3 py-2' : 'pl-6 pr-2 py-1.5'} space-y-1${isRoot ? '.5' : ''}`
          }>
            {node.children.map(child => renderNode(child, `${pathKey}.${child.id}`))}

            {showAddDropdown && (
              node.depth === 0 ? (
                <MuscleSecondarySelect
                  options={secondaryGroups[0].options}
                  onChange={v => addMuscle(v)}
                  className={`border border-red-300 rounded text-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 ${compact ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'}`}
                  placeholder={addLabel}
                />
              ) : (
                <select
                  onChange={e => { if (e.target.value) addMuscle(e.target.value); e.target.value = ''; }}
                  className={`border border-red-300 rounded text-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 ${compact ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'}`}
                  defaultValue="">
                  <option value="">{addLabel}</option>
                  {available.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              )
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`border rounded bg-gray-50 ${compact ? 'p-1.5 space-y-1' : 'p-3 space-y-2'}`}>
      {displayTree.map(node => renderNode(node, node.id))}

      {hasPrimaryOptions && (
        <select
          onChange={e => { if (e.target.value) addMuscle(e.target.value); e.target.value = ''; }}
          className={`border border-red-300 rounded text-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 ${compact ? 'text-[10px] px-1.5 py-0.5' : 'text-sm px-2 py-1.5'}`}
          defaultValue="">
          <option value="">+ Add primary muscle...</option>
          {primaryDropdownGroups.map(grp => (
            <optgroup key={grp.groupLabel} label={grp.groupLabel}>
              {grp.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </optgroup>
          ))}
        </select>
      )}
    </div>
  );
}
