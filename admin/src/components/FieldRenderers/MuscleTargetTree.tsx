import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api';

interface MuscleTargetTreeProps {
  value: Record<string, number>;
  onChange: (v: Record<string, number>) => void;
  /** When true, use smaller typography and spacing (e.g. for Baseline card in Matrix V2) */
  compact?: boolean;
}

interface MuscleDef {
  id: string;
  label: string;
  parent_ids: string[];
}

interface DisplayNode {
  id: string;
  label: string;
  score: number;
  computed: boolean;
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

export default function MuscleTargetTree({ value, onChange, compact = false }: MuscleTargetTreeProps) {
  const [allMuscles, setAllMuscles] = useState<MuscleDef[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.getTable('muscles').then((data) => {
      const muscles = ((data as Record<string, unknown>[]) || []).map(m => ({
        id: m.id as string,
        label: m.label as string,
        parent_ids: parsePids(m),
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

  const flat: Record<string, number> =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, number>)
      : {};

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

      const hasChildren = childNodes.length > 0;
      const score = hasChildren
        ? Math.round(childNodes.reduce((s, c) => s + c.score, 0) * 100) / 100
        : (flat[id] ?? 0);

      return { id, label, score, computed: hasChildren, children: childNodes, depth };
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
        tree.push({ id, label: m?.label ?? id, score: flat[id] ?? 0, computed: false, children: [], depth: 0 });
      }
    }
    return tree;
  }, [flat, muscleMap, childrenOf, rootIds]);

  const toggleExpanded = (key: string) =>
    setExpanded(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const setScore = (muscleId: string, score: number) => {
    if (isNaN(score)) return;
    onChange({ ...flat, [muscleId]: score });
  };

  const addMuscle = (id: string) => {
    if (id in flat) return;
    onChange({ ...flat, [id]: 0 });
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
    onChange(newFlat);
  };

  const getAvailableChildren = (parentId: string): MuscleDef[] =>
    (childrenOf.get(parentId) || [])
      .map(cid => muscleMap.get(cid))
      .filter((m): m is MuscleDef => !!m && !(m.id in flat));

  const unusedRoots = useMemo(() => {
    const usedRoots = new Set(displayTree.map(n => n.id));
    return rootIds
      .map(id => muscleMap.get(id))
      .filter((m): m is MuscleDef => !!m && !usedRoots.has(m.id));
  }, [displayTree, rootIds, muscleMap]);

  const ScoreInput = ({ muscleId, currentScore, isComputed }: { muscleId: string; currentScore: number; isComputed?: boolean }) => {
    const [localValue, setLocalValue] = useState(String(currentScore));
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
      if (!isFocused) setLocalValue(String(currentScore));
    }, [currentScore, isFocused]);

    const inputSize = compact ? 'w-12 px-0.5 py-0 text-[10px]' : 'w-16 px-1 py-0.5 text-xs';

    if (isComputed) {
      return (
        <span className={`${inputSize} bg-gray-100 rounded text-center text-gray-500 italic inline-block`}
          title="Auto-computed from children">{currentScore}</span>
      );
    }
    return (
      <input
        type="number" step="0.1" value={localValue}
        onFocus={() => setIsFocused(true)}
        onChange={e => setLocalValue(e.target.value)}
        onBlur={e => {
          setIsFocused(false);
          const n = parseFloat(e.target.value);
          if (isNaN(n) || e.target.value === '') setLocalValue(String(currentScore));
          else setScore(muscleId, n);
        }}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        className={`${inputSize} border rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
      />
    );
  };

  const renderNode = (node: DisplayNode, pathKey: string) => {
    const isExpanded = expanded.has(pathKey);
    const hasChildren = node.children.length > 0;
    const available = getAvailableChildren(node.id);
    const isRoot = node.depth === 0;
    const isLeaf = !hasChildren && available.length === 0;

    const addLabel = node.depth === 0 ? '+ Add child...' : node.depth === 1 ? '+ Add child...' : '+ Add child...';

    return (
      <div key={pathKey} className={`border rounded ${isRoot ? 'bg-white' : `bg-gray-50 ${compact ? 'rounded-sm' : ''}`}`}>
        {/* header */}
        <div className={`flex items-center bg-red-50 ${compact
          ? `${isRoot ? 'px-2 py-1' : 'px-1.5 py-0.5'} gap-1.5`
          : `${isRoot ? 'px-3 py-2' : 'px-2 py-1.5'} gap-2`
        }`}>
          {(hasChildren || available.length > 0) ? (
            <button type="button" onClick={() => toggleExpanded(pathKey)}
              className={`text-gray-500 flex-shrink-0 ${compact ? 'text-[10px] w-3' : 'text-xs w-4'}`}>
              {isExpanded ? '▼' : '▶'}
            </button>
          ) : (
            <span className={`text-gray-400 flex items-center justify-center flex-shrink-0 ${compact ? 'text-[8px] w-3' : 'text-[10px] w-4'}`}>●</span>
          )}

          <span className={`${isRoot ? 'font-medium' : ''} text-red-800 truncate ${compact ? 'text-[11px]' : isLeaf ? 'text-xs' : 'text-sm'}`}>
            {node.label}
          </span>

          <ScoreInput muscleId={node.id} currentScore={node.score} isComputed={node.computed} />

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

            {available.length > 0 && (
              <select
                onChange={e => { if (e.target.value) addMuscle(e.target.value); e.target.value = ''; }}
                className={`border border-red-300 rounded text-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 ${compact ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'}`}
                defaultValue="">
                <option value="">{addLabel}</option>
                {available.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`border rounded bg-gray-50 ${compact ? 'p-1.5 space-y-1' : 'p-3 space-y-2'}`}>
      {displayTree.map(node => renderNode(node, node.id))}

      {unusedRoots.length > 0 && (
        <select
          onChange={e => { if (e.target.value) addMuscle(e.target.value); e.target.value = ''; }}
          className={`border border-red-300 rounded text-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 ${compact ? 'text-[10px] px-1.5 py-0.5' : 'text-sm px-2 py-1.5'}`}
          defaultValue="">
          <option value="">+ Add primary muscle...</option>
          {unusedRoots.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      )}
    </div>
  );
}
