import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, type TableSchema, type TableField, type FKRef } from '../../api';
import { findRootMuscleId, asFlatMuscleTargets } from '../../../../shared/utils/muscleGrouping';
import RowEditor from '../../components/RowEditor';
import ColumnSettings from '../../components/ColumnSettings';
import FilterBar, { type FilterRule } from '../../components/FilterBar';
import ImportRowsModal from '../../components/ImportRowsModal';

interface TableEditorProps {
  schemas: TableSchema[];
  onDataChange: () => void;
}

interface GroupedFKRef {
  table: string;
  tableLabel: string;
  field: string;
  refs: FKRef[];
}

// ─── Muscle Target Visualization ─────────────────────────────────────
const MUSCLE_GROUP_COLORS: Record<string, string> = {
  CHEST:     '#ef4444',
  BACK:      '#3b82f6',
  SHOULDERS: '#f97316',
  ARMS:      '#a855f7',
  LEGS:      '#22c55e',
  CORE:      '#eab308',
  NECK:      '#ec4899',
};

const MUSCLE_GROUP_LABEL: Record<string, string> = {
  CHEST: 'Chest', BACK: 'Back', SHOULDERS: 'Shoulders',
  ARMS: 'Arms', LEGS: 'Legs', CORE: 'Core', NECK: 'Neck',
};

const DEFAULT_GROUP_COLOR = '#6b7280';

/** Bar shows only primary (root) muscles; scores are computed by summing leaf scores per root. No child muscles in the bar. */
function MuscleTargetBar({ targets, refData }: { targets: Record<string, unknown>; refData?: Record<string, Record<string, unknown>[]> }) {
  const [hovered, setHovered] = React.useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = React.useState<{ top: number; left: number } | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => {
    const rawMuscles = (refData?.['muscles'] ?? []) as Array<Record<string, unknown>>;
    const muscles = rawMuscles.map((m) => {
      let pids = m.parent_ids ?? m.parentIds;
      if (typeof pids === 'string') {
        try { pids = JSON.parse(pids); } catch { pids = []; }
      }
      return { id: String(m.id ?? ''), label: String(m.label ?? m.id ?? ''), parent_ids: Array.isArray(pids) ? pids.map(String) : [] };
    });
    const flat: Record<string, number> = {};
    if (targets && typeof targets === 'object') {
      for (const [k, v] of Object.entries(targets)) {
        if (typeof v === 'number') flat[k] = v;
      }
    }

    const findRoot = (id: string): string => {
      const m = muscles.find(mu => mu.id === id);
      if (!m || !m.parent_ids.length) return id;
      return findRoot(m.parent_ids[0]);
    };

    const groupScores: Record<string, number> = {};
    for (const [muscleId, score] of Object.entries(flat)) {
      if (typeof score !== 'number') continue;
      const rootId = muscles.length > 0 ? findRoot(muscleId) : muscleId;
      groupScores[rootId] = (groupScores[rootId] ?? 0) + score;
    }

    const muscleMap = new Map(muscles.map(m => [m.id, m]));
    return Object.entries(groupScores)
      .map(([key, score]) => ({
        key,
        score: Math.round(score * 100) / 100,
        label: MUSCLE_GROUP_LABEL[key] ?? muscleMap.get(key)?.label ?? key,
        color: MUSCLE_GROUP_COLORS[key] ?? DEFAULT_GROUP_COLOR,
      }))
      .filter(g => g.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [targets, refData]);

  const handleMouseEnter = useCallback(() => {
    const el = barRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setTooltipPos({
      left: rect.left,
      top: rect.top - 4,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltipPos(null);
    setHovered(null);
  }, []);

  if (groups.length === 0) return <span className="text-gray-300 text-xs">--</span>;

  const totalScore = groups.reduce((sum, g) => sum + g.score, 0);

  const tooltipEl =
    tooltipPos && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed z-[9999] pointer-events-none -translate-y-full"
            style={{ left: tooltipPos.left, top: tooltipPos.top }}
          >
            <div className="bg-gray-900 text-white rounded-md px-2.5 py-1.5 shadow-lg whitespace-nowrap" style={{ fontSize: '10px' }}>
              {groups.map(g => (
                <div key={g.key} className="flex items-center gap-1.5 py-0.5">
                  <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
                  <span className="font-medium">{g.label}</span>
                  <span className="text-gray-400 ml-auto pl-3">{g.score.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div
        ref={barRef}
        className="relative"
        style={{ minWidth: '80px', maxWidth: '160px' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex h-5 rounded overflow-hidden bg-gray-100 cursor-default">
          {groups.map(g => {
            const pct = (g.score / totalScore) * 100;
            const isHov = hovered === g.key;
            return (
              <div
                key={g.key}
                className="relative flex items-center justify-center transition-opacity duration-100"
                style={{
                  width: `${pct}%`,
                  minWidth: pct > 8 ? '14px' : '4px',
                  backgroundColor: g.color,
                  opacity: hovered && !isHov ? 0.4 : 1,
                }}
                onMouseEnter={() => setHovered(g.key)}
              >
                {pct > 18 && (
                  <span className="text-white font-semibold leading-none select-none" style={{ fontSize: '8px' }}>
                    {MUSCLE_GROUP_LABEL[g.key]?.[0] || g.key[0]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {tooltipEl}
    </>
  );
}

// ─── Delta rules tooltip (tree per motion) ───────────────────────────────
type MuscleRecord = { id: string; label: string; parent_ids?: string[]; [k: string]: unknown };

function getMuscleLabelMuscles(all: MuscleRecord[], id: string): string {
  return all.find(m => m.id === id)?.label ?? id;
}

function getMuscleLevelMuscles(id: string, all: MuscleRecord[]): 'primary' | 'secondary' | 'tertiary' {
  const m = all.find(mu => mu.id === id);
  if (!m?.parent_ids?.length) return 'primary';
  const parent = all.find(mu => mu.id === m.parent_ids![0]);
  if (!parent?.parent_ids?.length) return 'secondary';
  return 'tertiary';
}

function findPrimaryForMuscles(id: string, all: MuscleRecord[]): string {
  const m = all.find(mu => mu.id === id);
  if (!m?.parent_ids?.length) return id;
  return findPrimaryForMuscles(m.parent_ids[0], all);
}

function findSecondaryForMuscles(id: string, all: MuscleRecord[]): string | null {
  const m = all.find(mu => mu.id === id);
  if (!m?.parent_ids?.length) return null;
  const parent = all.find(mu => mu.id === m.parent_ids![0]);
  if (!parent?.parent_ids?.length) return null;
  return parent.id;
}

type TreeBranch = { label: string; score?: number; children?: Record<string, TreeBranch> };

function buildDeltaTreeFromFlat(flat: Record<string, number>, allMuscles: MuscleRecord[]): Record<string, TreeBranch> {
  const tree: Record<string, TreeBranch> = {};
  for (const [muscleId, score] of Object.entries(flat)) {
    const m = allMuscles.find(mu => mu.id === muscleId);
    const label = getMuscleLabelMuscles(allMuscles, muscleId);
    if (!m?.parent_ids?.length) {
      tree[muscleId] = { label, score, children: tree[muscleId]?.children ?? {} };
      continue;
    }
    for (const pid of m.parent_ids) {
      const parent = allMuscles.find(mu => mu.id === pid);
      if (!parent) continue;
      if (!parent.parent_ids?.length) {
        if (!tree[pid]) tree[pid] = { label: getMuscleLabelMuscles(allMuscles, pid), children: {} };
        const p = tree[pid];
        p.children = p.children ?? {};
        p.children[muscleId] = { label, score, children: (p.children[muscleId] as TreeBranch)?.children ?? {} };
      } else {
        const pId = findPrimaryForMuscles(pid, allMuscles);
        if (!tree[pId]) tree[pId] = { label: getMuscleLabelMuscles(allMuscles, pId), children: {} };
        const p = tree[pId];
        p.children = p.children ?? {};
        if (!p.children[pid]) p.children[pid] = { label: getMuscleLabelMuscles(allMuscles, pid), children: {} };
        const s = p.children[pid];
        s.children = s.children ?? {};
        s.children[muscleId] = { label, score };
      }
    }
  }
  return tree;
}

function DeltaRulesTooltipContent({
  rules,
  refData,
}: {
  rules: Record<string, Record<string, number> | "inherit">;
  refData: Record<string, Record<string, unknown>[]>;
}) {
  const muscles = (refData['muscles'] ?? []) as MuscleRecord[];
  const motions = (refData['motions'] ?? []) as Record<string, unknown>[];
  const getMotionLabel = (id: string) => motions.find((r) => String(r.id) === id)?.['label'] ?? id;

  return (
    <div className="bg-gray-900 text-gray-100 rounded-lg shadow-xl border border-gray-700 overflow-hidden max-h-[70vh] overflow-y-auto" style={{ fontSize: '10px', minWidth: '200px', maxWidth: '320px' }}>
      <div className="px-2.5 py-1.5 border-b border-gray-700 font-semibold text-amber-200 text-[11px] sticky top-0 bg-gray-900 z-10">
        Delta rules
      </div>
      <div className="p-2 space-y-3">
        {Object.entries(rules).map(([motionId, flatOrInherit]) => {
          const motionLabel = getMotionLabel(motionId);
          
          // Handle "inherit" case
          if (flatOrInherit === "inherit") {
            return (
              <div key={motionId} className="rounded bg-gray-800/80 overflow-hidden">
                <div className="px-2 py-1 font-medium text-blue-200 border-b border-gray-700">{motionLabel}</div>
                <div className="p-1.5">
                  <span className="text-green-300 italic text-xs">Inherits from parent</span>
                </div>
              </div>
            );
          }
          
          // Handle actual delta rules
          const flat = flatOrInherit as Record<string, number>;
          const tree = buildDeltaTreeFromFlat(flat, muscles);
          return (
            <div key={motionId} className="rounded bg-gray-800/80 overflow-hidden">
              <div className="px-2 py-1 font-medium text-blue-200 border-b border-gray-700">{motionLabel}</div>
              <div className="p-1.5 space-y-0.5">
                {Object.entries(tree).map(([pId, p]) => (
                  <div key={pId} className="pl-0">
                    <div className="flex items-center gap-1.5 py-0.5">
                      <span className="text-amber-300 font-medium">{p.label}</span>
                      {p.score != null && <span className="text-gray-400 font-mono ml-auto">{p.score >= 0 ? '+' : ''}{p.score}</span>}
                    </div>
                    {p.children && Object.keys(p.children).length > 0 && (
                      <div className="pl-2 border-l border-gray-600 ml-1 space-y-0.5">
                        {Object.entries(p.children).map(([sId, s]) => (
                          <div key={sId}>
                            <div className="flex items-center gap-1.5 py-0.5">
                              <span className="text-cyan-200">{s.label}</span>
                              {s.score != null && <span className="text-gray-400 font-mono ml-auto text-[9px]">{s.score >= 0 ? '+' : ''}{s.score}</span>}
                            </div>
                            {s.children && Object.keys(s.children).length > 0 && (
                              <div className="pl-2 border-l border-gray-600 ml-1">
                                {Object.entries(s.children).map(([tId, t]) => (
                                  <div key={tId} className="flex items-center gap-1.5 py-0.5">
                                    <span className="text-gray-300">{t.label}</span>
                                    {t.score != null && <span className="text-gray-500 font-mono ml-auto text-[9px]">{t.score >= 0 ? '+' : ''}{t.score}</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface FlatDisplayNode {
  id: string;
  label: string;
  score: number;
  computed: boolean;
  children: FlatDisplayNode[];
}

function parseParentIds(m: Record<string, unknown>): string[] {
  let pids = m.parent_ids ?? m.parentIds;
  if (typeof pids === 'string') {
    try { pids = JSON.parse(pids); } catch { return []; }
  }
  return Array.isArray(pids) ? pids.map(String) : [];
}

function buildMuscleDisplayTree(
  flat: Record<string, number>,
  muscles: MuscleRecord[]
): FlatDisplayNode[] {
  if (Object.keys(flat).length === 0 || muscles.length === 0) return [];

  const muscleMap = new Map<string, MuscleRecord>();
  const parentIdsOf = new Map<string, string[]>();
  const childrenOf = new Map<string, string[]>();
  const rootIds: string[] = [];

  for (const m of muscles) {
    const id = String(m.id ?? '');
    muscleMap.set(id, m);
    const pids = parseParentIds(m as Record<string, unknown>);
    parentIdsOf.set(id, pids);
    if (pids.length === 0) rootIds.push(id);
    for (const pid of pids) {
      if (!childrenOf.has(pid)) childrenOf.set(pid, []);
      childrenOf.get(pid)!.push(id);
    }
  }

  const flatIds = new Set(Object.keys(flat));
  const neededIds = new Set<string>();
  function ensureAncestors(id: string) {
    if (neededIds.has(id)) return;
    neededIds.add(id);
    for (const pid of parentIdsOf.get(id) ?? []) ensureAncestors(pid);
  }
  for (const id of flatIds) ensureAncestors(id);

  function buildNode(id: string): FlatDisplayNode | null {
    if (!neededIds.has(id)) return null;
    const m = muscleMap.get(id);
    const label = (m?.label ?? id).trim() || id.replace(/_/g, ' ');
    const kids = (childrenOf.get(id) || [])
      .map(cid => buildNode(cid))
      .filter((n): n is FlatDisplayNode => n !== null);
    const hasKids = kids.length > 0;
    const score = hasKids
      ? Math.round(kids.reduce((s, c) => s + c.score, 0) * 100) / 100
      : (flat[id] ?? 0);
    return { id, label, score, computed: hasKids, children: kids };
  }

  const tree: FlatDisplayNode[] = [];
  for (const rid of rootIds) { const n = buildNode(rid); if (n) tree.push(n); }
  const reachable = new Set<string>();
  (function collect(nodes: FlatDisplayNode[]) { for (const n of nodes) { reachable.add(n.id); collect(n.children); } })(tree);
  for (const id of flatIds) {
    if (!reachable.has(id)) {
      const m = muscleMap.get(id);
      const label = (m?.label ?? id).trim() || id.replace(/_/g, ' ');
      tree.push({ id, label, score: flat[id] ?? 0, computed: false, children: [] });
    }
  }
  return tree;
}

/** Targets: flat schema. On hover: full tree with children nested under parents; labels only (no ids). */
function MuscleTargetsTooltipContent({
  targets,
  refData,
}: {
  targets: Record<string, unknown>;
  refData: Record<string, Record<string, unknown>[]>;
}) {
  const muscles = (refData['muscles'] ?? []) as MuscleRecord[];

  const flat: Record<string, number> = {};
  if (targets && typeof targets === 'object') {
    for (const [k, v] of Object.entries(targets)) {
      if (typeof v === 'number') flat[k] = v;
    }
  }

  const tree = buildMuscleDisplayTree(flat, muscles);
  const hasContent = tree.length > 0;

  const labelClassByDepth: string[] = ['text-blue-200 font-medium', 'text-cyan-200', 'text-gray-300'];
  const scoreClassByDepth: string[] = ['text-gray-300 font-mono', 'text-gray-400 font-mono', 'text-gray-500 font-mono'];
  const getLabelClass = (d: number) => labelClassByDepth[d] ?? 'text-gray-400';
  const getScoreClass = (d: number) => scoreClassByDepth[d] ?? 'text-gray-500 font-mono';

  const renderNode = (node: FlatDisplayNode, depth: number, path: string) => {
    const labelClass = getLabelClass(depth);
    const scoreClass = getScoreClass(depth);
    const indentPx = 8 + depth * 14;

    if (depth === 0) {
      return (
        <div key={path} className="rounded bg-gray-800/80 overflow-hidden">
          <div className="px-2 py-1 font-medium text-blue-200 border-b border-gray-700">{node.label}</div>
          <div className="p-1.5 space-y-0.5">
            <div className="flex items-center gap-1.5 py-0.5">
              <span className="text-gray-400 text-[9px]">Score:</span>
              <span className={scoreClass}>{node.score}</span>
            </div>
            {node.children.length > 0 && (
              <div className="mt-1 space-y-0.5 border-l border-gray-600 ml-1.5 pl-2">
                {node.children.map((child, i) => renderNode(child, depth + 1, `${path}.${i}.${child.id}`))}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div key={path} style={{ paddingLeft: depth >= 1 ? indentPx : 0 }}>
        <div className="flex items-center gap-1.5 py-0.5">
          {depth >= 1 && <span className="text-gray-500 mr-0.5">└</span>}
          <span className={labelClass}>{node.label}</span>
          <span className={`${scoreClass} ml-auto text-[9px]`}>{node.score}</span>
        </div>
        {node.children.length > 0 && (
          <div className="border-l border-gray-600 ml-1.5 pl-2 mt-0.5">
            {node.children.map((child, i) => renderNode(child, depth + 1, `${path}.${i}.${child.id}`))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gray-900 text-gray-100 rounded-lg shadow-xl border border-gray-700 overflow-hidden max-h-[70vh] overflow-y-auto" style={{ fontSize: '10px', minWidth: '200px', maxWidth: '320px' }}>
      <div className="px-2.5 py-1.5 border-b border-gray-700 font-semibold text-amber-200 text-[11px] sticky top-0 bg-gray-900 z-10">
        Muscle Targets
      </div>
      <div className="p-2 space-y-3">
        {!hasContent ? (
          <div className="text-gray-400 text-xs italic">No muscle targets</div>
        ) : tree.map((node, i) => renderNode(node, 0, `root-${i}-${node.id}`))}
      </div>
    </div>
  );
}

function MuscleTargetsCellWithTooltip({
  targets,
  refData,
}: {
  targets: Record<string, unknown>;
  refData: Record<string, Record<string, unknown>[]>;
}) {
  const [show, setShow] = React.useState(false);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });
  const ref = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<number | null>(null);

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimeout();
    hideTimeoutRef.current = setTimeout(() => {
      setShow(false);
      hideTimeoutRef.current = null;
    }, 100);
  }, [clearHideTimeout]);

  const onEnter = useCallback(() => {
    clearHideTimeout();
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ left: rect.left, top: rect.bottom });
    setShow(true);
  }, [clearHideTimeout]);

  const onLeave = useCallback(() => {
    scheduleHide();
  }, [scheduleHide]);

  const onTooltipEnter = useCallback(() => {
    clearHideTimeout();
    setShow(true);
  }, [clearHideTimeout]);

  const onTooltipLeave = useCallback(() => {
    scheduleHide();
  }, [scheduleHide]);

  React.useEffect(() => {
    return () => {
      clearHideTimeout();
    };
  }, [clearHideTimeout]);

  const tooltipEl =
    show && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={tooltipRef}
            className="fixed z-[9999] pointer-events-auto"
            style={{ left: pos.left, top: pos.top }}
            onMouseEnter={onTooltipEnter}
            onMouseLeave={onTooltipLeave}
          >
            <MuscleTargetsTooltipContent targets={targets} refData={refData} />
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <span
        ref={ref}
        className="text-xs cursor-help"
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        <MuscleTargetBar targets={targets} refData={refData} />
      </span>
      {tooltipEl}
    </>
  );
}

function DeltaRulesCellWithTooltip({
  rules,
  refData,
  ruleCount,
}: {
  rules: Record<string, Record<string, number> | "inherit">;
  refData: Record<string, Record<string, unknown>[]>;
  ruleCount: number;
}) {
  const [show, setShow] = React.useState(false);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });
  const ref = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<number | null>(null);

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimeout();
    hideTimeoutRef.current = setTimeout(() => {
      setShow(false);
      hideTimeoutRef.current = null;
    }, 100);
  }, [clearHideTimeout]);

  const onEnter = useCallback(() => {
    clearHideTimeout();
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ left: rect.left, top: rect.bottom });
    setShow(true);
  }, [clearHideTimeout]);

  const onLeave = useCallback(() => {
    scheduleHide();
  }, [scheduleHide]);

  const onTooltipEnter = useCallback(() => {
    clearHideTimeout();
    setShow(true);
  }, [clearHideTimeout]);

  const onTooltipLeave = useCallback(() => {
    scheduleHide();
  }, [scheduleHide]);

  React.useEffect(() => {
    return () => {
      clearHideTimeout();
    };
  }, [clearHideTimeout]);

  const tooltipEl =
    show && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={tooltipRef}
            className="fixed z-[9999] pointer-events-auto"
            style={{ left: pos.left, top: pos.top }}
            onMouseEnter={onTooltipEnter}
            onMouseLeave={onTooltipLeave}
          >
            <DeltaRulesTooltipContent rules={rules} refData={refData} />
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <span
        ref={ref}
        className="text-xs cursor-help"
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        {ruleCount} rule(s)
      </span>
      {tooltipEl}
    </>
  );
}

export default function TableEditor({ schemas, onDataChange }: TableEditorProps) {
  const { key } = useParams<{ key: string }>();
  const schema = useMemo(() => schemas.find((s) => s.key === key), [schemas, key]);

  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [editRowHistory, setEditRowHistory] = useState<Record<string, unknown>[]>([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [showFilterForm, setShowFilterForm] = useState(false);
  const [sortCol, setSortCol] = useState('sort_order');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [groupBy, setGroupBy] = useState<string | null>(null);
  const [fkRefs, setFkRefs] = useState<FKRef[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteLabel, setDeleteLabel] = useState('');
  const [reassignTarget, setReassignTarget] = useState('');
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [justDropped, setJustDropped] = useState(false);
  const [isDraggingScroll, setIsDraggingScroll] = useState(false);
  const [scrollStartX, setScrollStartX] = useState(0);
  const [scrollStartScrollLeft, setScrollStartScrollLeft] = useState(0);
  const [scrollMouseDown, setScrollMouseDown] = useState(false);
  const [draggedRowId, setDraggedRowId] = useState<string | null>(null);
  const [isDraggingRow, setIsDraggingRow] = useState(false);
  const [rowDragHandleActive, setRowDragHandleActive] = useState(false);
  const [muscleTierFilter, setMuscleTierFilter] = useState<'ALL' | 'PRIMARY' | 'SECONDARY' | 'TERTIARY'>('ALL');
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const tableScrollRef = React.useRef<HTMLDivElement>(null);

  const [refData, setRefData] = useState<Record<string, Record<string, unknown>[]>>({});

  const loadData = useCallback(async () => {
    if (!key) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.getTable(key);
      setRows(Array.isArray(data) ? data as Record<string, unknown>[] : []);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [key]);

  const loadRefData = useCallback(async () => {
    if (!schema) return;
    const fkTables = new Set<string>();
    for (const f of schema.fields) {
      if (f.refTable) fkTables.add(f.refTable);
      if (f.jsonShape === 'muscle_targets' || f.jsonShape === 'delta_rules') fkTables.add('muscles');
    }
    const entries: Record<string, Record<string, unknown>[]> = {};
    await Promise.all(
      [...fkTables].map(async (refKey) => {
        try {
          const data = await api.getTable(refKey);
          if (Array.isArray(data)) {
            entries[refKey] = data as Record<string, unknown>[];
          }
        } catch {
          entries[refKey] = [];
        }
      })
    );
    setRefData(entries);
  }, [schema]);

  // Load column settings from localStorage; filter stale fields and merge in any new schema fields
  const loadColumnSettings = useCallback(() => {
    if (!key || !schema) return;
    const storageKey = `table-columns-${key}`;
    const saved = localStorage.getItem(storageKey);
    const allFieldNames = schema.fields.map((f) => f.name);
    const allFieldSet = new Set(allFieldNames);
    if (saved) {
      try {
        const { order, visible, widths } = JSON.parse(saved);
        const validOrder = (Array.isArray(order) ? order : []).filter((n: string) => allFieldSet.has(n));
        const validVisible = (Array.isArray(visible) ? visible : []).filter((n: string) => allFieldSet.has(n));
        const orderSet = new Set(validOrder);
        const missing = allFieldNames.filter((n) => !orderSet.has(n));
        const mergedOrder = validOrder.length > 0 ? [...validOrder, ...missing] : allFieldNames;
        const visibleSet = new Set(validVisible);
        missing.forEach((n) => visibleSet.add(n));
        setColumnOrder(mergedOrder);
        setVisibleColumns(visibleSet.size > 0 ? Array.from(visibleSet) : mergedOrder.slice(0, 8));
        setColumnWidths(widths && typeof widths === 'object' ? widths : {});
      } catch {
        initializeDefaultColumns();
      }
    } else {
      initializeDefaultColumns();
    }
  }, [key, schema]);

  const initializeDefaultColumns = useCallback(() => {
    if (!schema) return;
    const allFields = schema.fields;
    const defaultOrder = allFields.map((f) => f.name);
    const defaultVisible = defaultOrder.slice(0, 8);
    setColumnOrder(defaultOrder);
    setVisibleColumns(defaultVisible);
    setColumnWidths({});
  }, [schema]);

  const saveColumnSettings = useCallback((visible: string[], order: string[]) => {
    if (!key) return;
    const storageKey = `table-columns-${key}`;
    localStorage.setItem(storageKey, JSON.stringify({ visible, order, widths: columnWidths }));
    setVisibleColumns(visible);
    setColumnOrder(order);
    toast.success('Column settings saved');
  }, [key, columnWidths]);

  const saveColumnWidths = useCallback(() => {
    if (!key) return;
    const storageKey = `table-columns-${key}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        localStorage.setItem(storageKey, JSON.stringify({ ...data, widths: columnWidths }));
      } catch {
        // Ignore
      }
    }
  }, [key, columnWidths]);

  // Default group-by: motions → muscles; else category_id if present; else parent_id if present; else parent_ids (e.g. muscles)
  const defaultGroupByForTable = useMemo(() => {
    if (!schema) return null;
    if (key === 'motions') return 'muscles';
    const hasCategoryId = schema.fields.some((f) => f.name === 'category_id');
    const hasParentId = schema.fields.some((f) => f.name === 'parent_id');
    const hasParentIds = schema.fields.some((f) => f.name === 'parent_ids');
    if (hasCategoryId) return 'category_id';
    if (hasParentId) return 'parent_id';
    if (hasParentIds) return 'parent_ids';
    return null;
  }, [key, schema]);

  const loadDataRef = React.useRef(loadData);
  const loadRefDataRef = React.useRef(loadRefData);
  const loadColumnSettingsRef = React.useRef(loadColumnSettings);
  React.useEffect(() => { loadDataRef.current = loadData; }, [loadData]);
  React.useEffect(() => { loadRefDataRef.current = loadRefData; }, [loadRefData]);
  React.useEffect(() => { loadColumnSettingsRef.current = loadColumnSettings; }, [loadColumnSettings]);

  useEffect(() => {
    setEditRow(null);
    setIsNew(false);
    setEditRowHistory([]);
    setSearch('');
    setFilters([]);
    setShowFilterForm(false);
    setSortCol('sort_order');
    setSortDir('asc');
    setDeleteConfirm(null);
    setMuscleTierFilter('ALL');
    setGroupBy(defaultGroupByForTable);
    loadDataRef.current();
    loadRefDataRef.current();
    loadColumnSettingsRef.current();
    // Only re-run when the selected table changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, defaultGroupByForTable]);

  const applyFilter = (row: Record<string, unknown>, filter: FilterRule): boolean => {
    const field = schema?.fields.find((f) => f.name === filter.field);
    if (!field) return true;

    const rowValue = row[filter.field];

    switch (filter.operator) {
      case 'equals':
        if (field.type === 'boolean') {
          return rowValue === filter.value;
        }
        return String(rowValue) === String(filter.value);

      case 'contains':
        return String(rowValue || '').toLowerCase().includes(String(filter.value).toLowerCase());

      case 'not_contains':
        return !String(rowValue || '').toLowerCase().includes(String(filter.value).toLowerCase());

      case 'greater_than':
        return Number(rowValue) > Number(filter.value);

      case 'less_than':
        return Number(rowValue) < Number(filter.value);

      case 'is_null':
        return rowValue === null || rowValue === undefined || rowValue === '';

      case 'is_not_null':
        return rowValue !== null && rowValue !== undefined && rowValue !== '';

      case 'in':
        if (Array.isArray(filter.value)) {
          if (Array.isArray(rowValue)) {
            return filter.value.some((v) => rowValue.includes(v));
          }
          return filter.value.includes(String(rowValue));
        }
        return false;

      case 'not_in':
        if (Array.isArray(filter.value)) {
          if (Array.isArray(rowValue)) {
            return !filter.value.some((v) => rowValue.includes(v));
          }
          return !filter.value.includes(String(rowValue));
        }
        return true;

      default:
        return true;
    }
  };

  const computeMuscleTier = useCallback((row: Record<string, unknown>, allRows: Record<string, unknown>[]): 'PRIMARY' | 'SECONDARY' | 'TERTIARY' => {
    const raw = row.parent_ids;
    const pids: string[] = Array.isArray(raw) ? raw as string[] : typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return []; } })() : [];
    if (pids.length === 0) return 'PRIMARY';
    const parent = allRows.find(r => r.id === pids[0]);
    if (!parent) return 'SECONDARY';
    const parentPids: string[] = Array.isArray(parent.parent_ids) ? parent.parent_ids as string[] : typeof parent.parent_ids === 'string' ? (() => { try { return JSON.parse(parent.parent_ids as string); } catch { return []; } })() : [];
    return parentPids.length === 0 ? 'SECONDARY' : 'TERTIARY';
  }, []);

  const filtered = useMemo(() => {
    let result = rows;

    // For the muscles table, compute and attach _muscle_tier
    const isMusclesTable = key === 'muscles';
    if (isMusclesTable) {
      result = result.map(r => ({ ...r, _muscle_tier: computeMuscleTier(r, rows) }));
      if (muscleTierFilter !== 'ALL') {
        result = result.filter(r => r._muscle_tier === muscleTierFilter);
      }
    }

    // Apply text search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((v) => String(v).toLowerCase().includes(q))
      );
    }

    // Apply filters
    for (const filter of filters) {
      result = result.filter((row) => applyFilter(row, filter));
    }

    // Sort
    result = [...result].sort((a, b) => {
      const aVal = a[sortCol];
      const bVal = b[sortCol];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });

    // Group by field if specified
    if (groupBy && schema) {
      // Special handling for grouping by muscles on MOTIONS table (nested: primary -> secondary -> motions)
      if (groupBy === 'muscles' && key === 'motions') {
        const muscles = refData['muscles'] || [];
        const muscleMap = new Map(muscles.map((m: Record<string, unknown>) => [String(m.id ?? ''), m as { id: string; label?: string; parent_ids?: string[] }]));
        
        const findRoot = (muscleId: string): string =>
          findRootMuscleId(muscleId, muscleMap);
        
        // Fallback: root with highest aggregated score from flat muscle_targets
        const getPrimaryMuscleForMotion = (motion: Record<string, unknown>): string | null => {
          const flat = asFlatMuscleTargets(motion.muscle_targets);
          if (Object.keys(flat).length === 0) return null;
          const byRoot: Record<string, number> = {};
          for (const [muscleId, score] of Object.entries(flat)) {
            const rootId = findRoot(muscleId);
            byRoot[rootId] = (byRoot[rootId] ?? 0) + score;
          }
          const entries = Object.entries(byRoot).filter(([, s]) => s > 0);
          if (entries.length === 0) return null;
          return entries.reduce((best, cur) => (cur[1] > best[1] ? cur : best))[0];
        };
        
        const getEffectiveGroupingId = (motion: Record<string, unknown>): string | null =>
          (motion.muscle_grouping_id != null && motion.muscle_grouping_id !== '')
            ? String(motion.muscle_grouping_id)
            : getPrimaryMuscleForMotion(motion);
        
        // Group by (rootId, effectiveId) -> motions
        const rootToSecondaryToMotions = new Map<string, Map<string, Record<string, unknown>[]>>();
        
        result.forEach(motion => {
          const effectiveId = getEffectiveGroupingId(motion);
          const rootId = effectiveId ? findRoot(effectiveId) : null;
          const r = rootId ?? '__none__';
          if (!rootToSecondaryToMotions.has(r)) {
            rootToSecondaryToMotions.set(r, new Map());
          }
          const secMap = rootToSecondaryToMotions.get(r)!;
          const s = effectiveId ?? '__none__';
          if (!secMap.has(s)) secMap.set(s, []);
          secMap.get(s)!.push(motion);
        });
        
        const getLabel = (id: string): string => {
          if (id === '__none__') return 'No Primary Muscle';
          const m = muscleMap.get(id);
          return String(m?.label ?? m?.id ?? id ?? 'Unknown');
        };
        
        const grouped: Record<string, unknown>[] = [];
        const sortedRoots = Array.from(rootToSecondaryToMotions.keys()).sort((a, b) =>
          getLabel(a).localeCompare(getLabel(b))
        );
        
        const addMotionRows = (
          motions: Record<string, unknown>[],
          baseLevel: number
        ) => {
          const parentMotions: Record<string, unknown>[] = [];
          const childMotionsMap = new Map<string, Record<string, unknown>[]>();
          motions.forEach(motion => {
            const parentId = motion.parent_id;
            if (!parentId || parentId === '' || parentId === null) {
              parentMotions.push(motion);
            } else {
              const parentIdStr = String(parentId);
              if (!childMotionsMap.has(parentIdStr)) childMotionsMap.set(parentIdStr, []);
              childMotionsMap.get(parentIdStr)!.push(motion);
            }
          });
          parentMotions.sort((a, b) =>
            String(a[schema.labelField] ?? a[schema.idField] ?? '').localeCompare(String(b[schema.labelField] ?? b[schema.idField] ?? ''))
          );
          parentMotions.forEach(parentMotion => {
            const pid = String(parentMotion[schema.idField] ?? '');
            grouped.push({ ...parentMotion, _groupLevel: baseLevel });
            const children = childMotionsMap.get(pid) || [];
            children.sort((a, b) =>
              String(a[schema.labelField] ?? a[schema.idField] ?? '').localeCompare(String(b[schema.labelField] ?? b[schema.idField] ?? ''))
            );
            children.forEach(child => grouped.push({ ...child, _groupLevel: baseLevel + 1 }));
            childMotionsMap.delete(pid);
          });
          childMotionsMap.forEach(children => {
            children.sort((a, b) =>
              String(a[schema.labelField] ?? a[schema.idField] ?? '').localeCompare(String(b[schema.labelField] ?? b[schema.idField] ?? ''))
            );
            children.forEach(child => grouped.push({ ...child, _groupLevel: baseLevel }));
          });
        };
        
        sortedRoots.forEach(rootId => {
          grouped.push({
            _isSectionHeader: true,
            _sectionLabel: getLabel(rootId),
            _groupLevel: 0,
          });
          const secMap = rootToSecondaryToMotions.get(rootId)!;
          const sortedSecondaries = Array.from(secMap.entries()).sort((a, b) =>
            getLabel(a[0]).localeCompare(getLabel(b[0]))
          );
          const hasNestedSecondaries = sortedSecondaries.some(([eid]) => eid !== rootId);
          
          sortedSecondaries.forEach(([effectiveId, motions]) => {
            if (hasNestedSecondaries && effectiveId !== rootId) {
              // Show secondary header only when there are real sub-groups
              grouped.push({
                _isSectionHeader: true,
                _sectionLabel: getLabel(effectiveId),
                _groupLevel: 1,
              });
              addMotionRows(motions, 2);
            } else {
              // No secondary header: motions sit directly under primary
              addMotionRows(motions, 0);
            }
          });
        });
        
        return grouped;
      }
      
      // Special handling for grouping by category_id on EQUIPMENT table (group by full category path)
      if (groupBy === 'category_id' && key === 'equipment') {
        const categories = refData['equipmentCategories'] || [];
        const categoryMap = new Map(categories.map((c: Record<string, unknown>) => [String(c.id ?? ''), c]));
        
        // Helper to build full category path (including all parents)
        const getCategoryPath = (categoryId: string | null | undefined): string[] => {
          if (!categoryId) return [];
          const path: string[] = [];
          let currentId: string | null | undefined = categoryId;
          const visited = new Set<string>();
          
          while (currentId && !visited.has(currentId)) {
            visited.add(currentId);
            const category = categoryMap.get(currentId);
            if (category) {
              path.unshift(String(category.id ?? currentId));
              currentId = category.parent_id as string | null | undefined;
            } else {
              break;
            }
          }
          
          return path;
        };
        
        // Group equipment by their full category path
        const pathGroups = new Map<string, Record<string, unknown>[]>();
        
        result.forEach(equipment => {
          const categoryId = equipment.category_id;
          const path = getCategoryPath(categoryId as string | null | undefined);
          const pathKey = path.length > 0 ? path.join(' > ') : 'No Category';
          
          if (!pathGroups.has(pathKey)) {
            pathGroups.set(pathKey, []);
          }
          pathGroups.get(pathKey)!.push(equipment);
        });
        
        // Sort groups by path (alphabetically)
        const grouped: Record<string, unknown>[] = [];
        const sortedGroups = Array.from(pathGroups.entries()).sort((a, b) => {
          if (a[0] === 'No Category') return 1;
          if (b[0] === 'No Category') return -1;
          return a[0].localeCompare(b[0]);
        });
        
        sortedGroups.forEach(([pathKey, equipmentList]) => {
          // Add section header row for this category path
          grouped.push({ 
            _isSectionHeader: true, 
            _sectionLabel: pathKey,
            _groupLevel: 0 
          });
          
          // Sort equipment within group
          equipmentList.sort((a, b) => {
            const aLabel = String(a[schema.labelField] ?? a[schema.idField] ?? '');
            const bLabel = String(b[schema.labelField] ?? b[schema.idField] ?? '');
            return aLabel.localeCompare(bLabel);
          });
          
          // Add equipment with group level 1 (indented under section header)
          equipmentList.forEach((equipment) => {
            grouped.push({ ...equipment, _groupLevel: 1 });
          });
        });
        
        return grouped;
      }
      
      const groupField = schema.fields.find(f => f.name === groupBy);
      if (groupField) {
        // Build parent-child relationships
        const parentRows: Record<string, unknown>[] = [];
        const childRows: Record<string, unknown>[] = [];
        const idField = schema.idField;
        
        result.forEach(row => {
          const groupValue = row[groupBy];
          const rowId = String(row[idField] ?? '');
          let isParent = false;
          
          if (groupField.type === 'fk') {
            // For FK fields, check if this row's ID is referenced by other rows
            isParent = result.some(r => {
              const refValue = r[groupBy];
              return String(refValue) === rowId && r !== row;
            });
          } else if (groupField.type === 'fk[]') {
            // For FK[] fields, check if this row's ID is in any other row's array
            isParent = result.some(r => {
              const refArray = r[groupBy];
              return Array.isArray(refArray) && refArray.includes(rowId) && r !== row;
            });
          } else if (groupField.type === 'string' || groupField.type === 'number') {
            // For simple fields, group by value - handled separately below
            return;
          }
          
          if (isParent || groupValue == null || groupValue === '') {
            parentRows.push(row);
          } else {
            childRows.push(row);
          }
        });
        
        // For FK/FK[] fields, organize parent-child relationships
        if (groupField.type === 'fk' || groupField.type === 'fk[]') {
          // Special handling for multi-level hierarchies (like Muscles table with parent_ids)
          if (groupField.type === 'fk[]' && key === 'muscles') {
            // Build a hierarchy tree for multi-level grouping
            const rowMap = new Map<string, Record<string, unknown>>();
            result.forEach(row => {
              const rowId = String(row[idField] ?? '');
              rowMap.set(rowId, row);
            });
            
            // Find all primary rows (no parents)
            const primaryRows: Record<string, unknown>[] = [];
            const allRows = Array.from(rowMap.values());
            
            allRows.forEach(row => {
              const parentIds = row[groupBy];
              const pidArray = Array.isArray(parentIds) ? parentIds as string[] : [];
              if (pidArray.length === 0) {
                primaryRows.push(row);
              }
            });
            
            // Recursively build hierarchy and assign levels
            const grouped: Record<string, unknown>[] = [];
            const processed = new Set<string>();
            
            const addRowWithChildren = (row: Record<string, unknown>, level: number) => {
              const rowId = String(row[idField] ?? '');
              if (processed.has(rowId)) return;
              
              grouped.push({ ...row, _groupLevel: level });
              processed.add(rowId);
              
              // Find children of this row
              const children = allRows.filter(childRow => {
                const childParentIds = childRow[groupBy];
                const childPidArray = Array.isArray(childParentIds) ? childParentIds as string[] : [];
                return childPidArray.includes(rowId);
              });
              
              // Sort children and add them recursively
              children.sort((a, b) => {
                const aLabel = String(a[schema.labelField] ?? a[idField] ?? '');
                const bLabel = String(b[schema.labelField] ?? b[idField] ?? '');
                return aLabel.localeCompare(bLabel);
              });
              
              children.forEach(child => {
                addRowWithChildren(child, level + 1);
              });
            };
            
            // Sort primary rows and process them
            primaryRows.sort((a, b) => {
              const aLabel = String(a[schema.labelField] ?? a[idField] ?? '');
              const bLabel = String(b[schema.labelField] ?? b[idField] ?? '');
              return aLabel.localeCompare(bLabel);
            });
            
            primaryRows.forEach(primary => {
              addRowWithChildren(primary, 0);
            });
            
            // Add any remaining orphaned rows
            allRows.forEach(row => {
              const rowId = String(row[idField] ?? '');
              if (!processed.has(rowId)) {
                grouped.push({ ...row, _groupLevel: 0 });
              }
            });
            
            return grouped;
          } else {
            // Standard 2-level grouping for FK fields or simple FK[] fields
            const grouped: Record<string, unknown>[] = [];
            const processed = new Set<string>();
            
            // Add parent rows first, followed by their children
            parentRows.forEach(parent => {
              const parentId = String(parent[idField] ?? '');
              grouped.push({ ...parent, _groupLevel: 0 });
              processed.add(parentId);
              
              // Add children of this parent
              childRows.forEach(child => {
                const childId = String(child[idField] ?? '');
                if (processed.has(childId)) return;
                
                const childGroupValue = child[groupBy];
                let isChildOfParent = false;
                
                if (groupField.type === 'fk') {
                  isChildOfParent = String(childGroupValue) === parentId;
                } else if (groupField.type === 'fk[]') {
                  isChildOfParent = Array.isArray(childGroupValue) && childGroupValue.includes(parentId);
                }
                
                if (isChildOfParent) {
                  grouped.push({ ...child, _groupLevel: 1 });
                  processed.add(childId);
                }
              });
            });
            
            // Add remaining orphaned rows
            childRows.forEach(child => {
              const childId = String(child[idField] ?? '');
              if (!processed.has(childId)) {
                grouped.push({ ...child, _groupLevel: 0 });
              }
            });
            
            return grouped;
          }
        } else {
          // For simple fields (string/number), group by value
          const valueMap = new Map<string | null, Record<string, unknown>[]>();
          
          result.forEach(row => {
            const groupValue = row[groupBy];
            const groupKey = groupValue == null ? null : String(groupValue);
            if (!valueMap.has(groupKey)) {
              valueMap.set(groupKey, []);
            }
            valueMap.get(groupKey)!.push(row);
          });
          
          const grouped: Record<string, unknown>[] = [];
          const sortedGroups = Array.from(valueMap.entries()).sort((a, b) => {
            if (a[0] === null) return 1;
            if (b[0] === null) return -1;
            return String(a[0]).localeCompare(String(b[0]));
          });
          
          sortedGroups.forEach(([groupKey, groupRows]) => {
            groupRows.forEach((row, idx) => {
              grouped.push({ ...row, _groupLevel: idx === 0 ? 0 : 1 });
            });
          });
          
          return grouped;
        }
      }
    }
    
    return result;
  }, [rows, search, filters, sortCol, sortDir, schema, key, muscleTierFilter, computeMuscleTier, groupBy]);

  const visibleCols = useMemo(() => {
    if (!schema) return [];
    if (columnOrder.length === 0 || visibleColumns.length === 0) {
      // Fallback to default if not loaded yet
      return schema.fields.slice(0, 8);
    }
    // Use custom order and visibility
    const fieldMap = new Map(schema.fields.map((f) => [f.name, f]));
    return columnOrder
      .map((name) => fieldMap.get(name))
      .filter((f): f is TableField => f !== undefined && visibleColumns.includes(f.name));
  }, [schema, columnOrder, visibleColumns]);

  const handleSort = (col: string) => {
    if (justDropped) {
      setJustDropped(false);
      return;
    }
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
  };

  // Column drag-and-drop handlers
  const handleColumnDragStart = (e: React.DragEvent, columnName: string) => {
    setDraggedColumn(columnName);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', columnName);
    e.stopPropagation();
  };

  const handleColumnDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleColumnDrop = (e: React.DragEvent, targetColumn: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedColumn || draggedColumn === targetColumn) {
      setDraggedColumn(null);
      return;
    }

    const currentOrder = [...columnOrder];
    const draggedIndex = currentOrder.indexOf(draggedColumn);
    const targetIndex = currentOrder.indexOf(targetColumn);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedColumn(null);
      return;
    }

    currentOrder.splice(draggedIndex, 1);
    currentOrder.splice(targetIndex, 0, draggedColumn);

    setColumnOrder(currentOrder);
    setDraggedColumn(null);
    setJustDropped(true);
    saveColumnSettings(visibleColumns, currentOrder);
  };

  // Column resize handlers
  const handleResizeStart = (e: React.MouseEvent, columnName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(columnName);
    setResizeStartX(e.clientX);
    setResizeStartWidth(columnWidths[columnName] || 150);
  };

  useEffect(() => {
    if (!resizingColumn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - resizeStartX;
      const newWidth = Math.max(80, resizeStartWidth + diff);
      setColumnWidths((prev) => ({ ...prev, [resizingColumn]: newWidth }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
      saveColumnWidths();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn, resizeStartX, resizeStartWidth, saveColumnWidths]);

  // Drag-to-scroll handlers
  const handleScrollMouseDown = (e: React.MouseEvent) => {
    // Don't start drag scroll if clicking on interactive elements
    const target = e.target as HTMLElement;
    
    // Exclude buttons, inputs, resize handles, drag handles
    if (
      target.tagName === 'BUTTON' ||
      target.tagName === 'INPUT' ||
      target.tagName === 'SELECT' ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('.cursor-col-resize') ||
      target.closest('.row-drag-handle') ||
      resizingColumn ||
      isDraggingRow
    ) {
      return;
    }

    // Allow drag-to-scroll on table and container
    setScrollMouseDown(true);
    setScrollStartX(e.clientX);
    if (tableScrollRef.current) {
      setScrollStartScrollLeft(tableScrollRef.current.scrollLeft);
    }
  };

  useEffect(() => {
    if (!scrollMouseDown) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!tableScrollRef.current) return;
      
      // Only start scrolling if mouse moved significantly (prevents accidental scroll on click)
      const moved = Math.abs(e.clientX - scrollStartX);
      if (moved > 5) {
        setIsDraggingScroll(true);
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'grabbing';
        const diff = scrollStartX - e.clientX;
        tableScrollRef.current.scrollLeft = scrollStartScrollLeft + diff;
      }
    };

    const handleMouseUp = () => {
      // Keep isDraggingScroll true briefly to prevent side-panel opening
      if (isDraggingScroll) {
        setTimeout(() => {
          setIsDraggingScroll(false);
        }, 100);
      } else {
        setIsDraggingScroll(false);
      }
      setScrollMouseDown(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [scrollMouseDown, scrollStartX, scrollStartScrollLeft]);

  const handleAdd = () => {
    if (!schema) return;
    const newRow: Record<string, unknown> = {};
    for (const f of schema.fields) {
      newRow[f.name] = f.defaultValue ?? (f.type === 'boolean' ? false : f.type === 'number' ? 0 : f.type === 'string[]' || f.type === 'fk[]' ? [] : '');
    }
    newRow.sort_order = rows.length;
    setEditRow(newRow);
    setIsNew(true);
    setEditRowHistory([]);
  };

  const handleOpenRow = useCallback((row: Record<string, unknown>) => {
    setEditRow(prev => {
      if (prev) {
        setEditRowHistory(h => [...h, prev]);
      }
      return { ...row };
    });
    setIsNew(false);
  }, []);

  const handleClosePanel = useCallback(() => {
    if (editRowHistory.length > 0) {
      const prev = editRowHistory[editRowHistory.length - 1];
      setEditRow({ ...prev });
      setEditRowHistory(h => h.slice(0, -1));
      setIsNew(false);
    } else {
      setEditRow(null);
      setIsNew(false);
    }
  }, [editRowHistory]);

  const handleCopyTable = useCallback(async () => {
    if (!schema || rows.length === 0) {
      toast.error('No data to copy');
      return;
    }

    try {
      // Get all fields in order (use columnOrder if available, otherwise schema order)
      const allFields = schema.fields;
      const fieldOrder = columnOrder.length > 0 ? columnOrder : allFields.map(f => f.name);
      const orderedFields = fieldOrder
        .map(name => allFields.find(f => f.name === name))
        .filter((f): f is TableField => f !== undefined);

      // Build header row
      const headers = orderedFields.map(f => f.name);

      // For TSV: any cell containing tab, newline, or double-quote must be wrapped in "
      // and internal " escaped as "". So pasted data is parsed correctly.
      const escapeTsvCell = (cell: string): string => {
        if (cell.includes('\t') || cell.includes('\n') || cell.includes('\r') || cell.includes('"')) {
          return '"' + cell.replace(/"/g, '""') + '"';
        }
        return cell;
      };

      // Build data rows
      const dataRows = rows.map(row => {
        return orderedFields.map(field => {
          const val = row[field.name];
          
          if (val == null || val === '' || String(val).toLowerCase() === 'null') {
            return '';
          }

          if (field.type === 'json') {
            if (val == null) return '';
            return JSON.stringify(val);
          }

          if (field.type === 'string[]' || field.type === 'fk[]') {
            if (Array.isArray(val)) return JSON.stringify(val);
            return String(val);
          }

          if (field.type === 'boolean') {
            return val ? 'true' : 'false';
          }

          if (field.type === 'fk') {
            return String(val);
          }

          const str = String(val);
          const escaped = str.replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\r/g, '');
          return escapeTsvCell(escaped);
        });
      });

      const tsvLines = [
        headers.join('\t'),
        ...dataRows.map(row => row.join('\t'))
      ];
      const tsvContent = tsvLines.join('\n');

      // Copy to clipboard
      await navigator.clipboard.writeText(tsvContent);
      toast.success(`Copied ${rows.length} rows to clipboard`);
    } catch (err) {
      console.error('Failed to copy table:', err);
      toast.error('Failed to copy table to clipboard');
    }
  }, [schema, rows, columnOrder, refData]);

  const handleImportRows = useCallback(async (
    importRows: Record<string, unknown>[],
    mode: 'upsert' | 'replace',
    opts?: { hardDeleteExisting?: boolean }
  ): Promise<{ inserted: number; updated: number; skipped: number; errors: string[] }> => {
    if (!key || !schema) return { inserted: 0, updated: 0, skipped: 0, errors: ['No table selected'] };

    const needsSync = key === 'motions' || key === 'motionPaths';

    // If replace mode, delete ALL existing rows first (including inactive) so INSERT won't hit duplicate key.
    // We always hard-delete so that rows are actually removed; otherwise INSERT would fail on duplicate id.
    if (mode === 'replace') {
      const deleteErrors: string[] = [];
      const hard = true;
      let idsToDelete: string[];
      try {
        idsToDelete = await api.getTableIds(key);
      } catch (err) {
        return { inserted: 0, updated: 0, skipped: 0, errors: [`Failed to list existing rows: ${err}`] };
      }
      for (const id of idsToDelete) {
        try {
          await api.deleteRow(key, id, { breakLinks: true, skipSync: needsSync, hard });
        } catch (err) {
          deleteErrors.push(`Failed to delete row "${id}": ${err}`);
        }
      }
      if (deleteErrors.length > 0) {
        return { inserted: 0, updated: 0, skipped: 0, errors: deleteErrors };
      }
      await loadData();
    }

    const existingById: Record<string, boolean> = {};
    for (const r of rows) {
      const id = r[schema.idField];
      if (id != null) existingById[String(id)] = true;
    }

    let inserted = 0, updated = 0, skipped = 0;
    const errors: string[] = [];

    for (const row of importRows) {
      const id = row[schema.idField];
      if (id == null || String(id) === '') {
        skipped++;
        continue;
      }
      try {
        if (mode === 'replace' || !existingById[String(id)]) {
          await api.addRow(key, row, needsSync ? { skipSync: true } : undefined);
          inserted++;
          existingById[String(id)] = true;
        } else {
          await api.updateRow(key, String(id), row, needsSync ? { skipSync: true } : undefined);
          updated++;
        }
      } catch (err) {
        errors.push(`Row "${id}": ${err}`);
        skipped++;
      }
    }

    // Run a single sync after all import operations complete
    if (needsSync) {
      try { await api.syncTable(key); } catch { /* ignore */ }
    }

    await loadData();
    onDataChange();
    if (mode === 'replace') {
      toast.success(`Replace complete: ${inserted} rows imported`);
    } else {
      toast.success(`Import complete: ${inserted} added, ${updated} updated`);
    }
    return { inserted, updated, skipped, errors };
  }, [key, schema, rows, loadData, onDataChange]);

  const handleSave = async (row: Record<string, unknown>) => {
    if (!key || !schema) return;
    try {
      if (isNew) {
        await api.addRow(key, row);
        toast.success(`Created "${row[schema.labelField] || row[schema.idField]}"`);
      } else {
        await api.updateRow(key, row[schema.idField] as string, row);
        toast.success('Saved');
      }
      setEditRow(null);
      setIsNew(false);
      setEditRowHistory([]);
      await loadData();
      onDataChange();
    } catch (err) {
      toast.error(`Save failed: ${err}`);
    }
  };

  // Row drag-and-drop handlers
  const handleRowDragStart = (e: React.DragEvent, rowId: string) => {
    // Only allow drag if drag handle was activated
    if (!rowDragHandleActive) {
      e.preventDefault();
      return;
    }
    setDraggedRowId(rowId);
    setIsDraggingRow(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', rowId);
    e.stopPropagation();
  };

  const handleRowDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleRowDrop = async (e: React.DragEvent, targetRowId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!key || !draggedRowId || draggedRowId === targetRowId) {
      setDraggedRowId(null);
      setIsDraggingRow(false);
      return;
    }

    const draggedIdx = filtered.findIndex((r) => r.id === draggedRowId);
    const targetIdx = filtered.findIndex((r) => r.id === targetRowId);
    if (draggedIdx === -1 || targetIdx === -1) {
      setDraggedRowId(null);
      setIsDraggingRow(false);
      return;
    }

    const ids = filtered.map((r) => r.id as string);
    ids.splice(draggedIdx, 1);
    ids.splice(targetIdx, 0, draggedRowId);

    try {
      await api.reorder(key, ids);
      await loadData();
      onDataChange();
      toast.success('Row order updated');
    } catch (err) {
      toast.error(`Reorder failed: ${err}`);
    } finally {
      setDraggedRowId(null);
      setIsDraggingRow(false);
    }
  };

  const handleDeleteClick = async (id: string) => {
    if (!key) return;
    const row = rows.find((r) => r.id === id);
    setDeleteLabel(row ? String(row[schema?.labelField || 'label'] ?? id) : id);
    setReassignTarget('');
    try {
      const { refs } = await api.getFKRefs(key, id);
      setFkRefs(refs);
    } catch {
      setFkRefs([]);
    }
    setDeleteConfirm(id);
  };

  const handleDeleteConfirm = async () => {
    if (!key || !deleteConfirm) return;
    try {
      await api.deleteRow(key, deleteConfirm);
      toast.success(`Deleted "${deleteLabel}"`);
      setDeleteConfirm(null);
      setFkRefs([]);
      await loadData();
      onDataChange();
    } catch (err) {
      toast.error(`Delete failed: ${err}`);
    }
  };

  const handleForceDeleteBreakLinks = async () => {
    if (!key || !deleteConfirm) return;
    try {
      await api.deleteRow(key, deleteConfirm, { breakLinks: true });
      toast.success(`Force deleted "${deleteLabel}" and cleared references`);
      setDeleteConfirm(null);
      setFkRefs([]);
      await loadData();
      onDataChange();
    } catch (err) {
      toast.error(`Force delete failed: ${err}`);
    }
  };

  const handleReassignAndDelete = async () => {
    if (!key || !deleteConfirm || !reassignTarget) return;
    try {
      await api.deleteRow(key, deleteConfirm, { reassignTo: reassignTarget });
      toast.success(`Deleted "${deleteLabel}" and reassigned references to "${reassignTarget}"`);
      setDeleteConfirm(null);
      setFkRefs([]);
      await loadData();
      onDataChange();
    } catch (err) {
      toast.error(`Reassign failed: ${err}`);
    }
  };

  const handleHardDelete = async () => {
    if (!key || !deleteConfirm) return;
    try {
      await api.deleteRow(key, deleteConfirm, { hard: true });
      toast.success(`Permanently deleted "${deleteLabel}" from database`);
      setDeleteConfirm(null);
      setFkRefs([]);
      await loadData();
      onDataChange();
    } catch (err) {
      toast.error(`Hard delete failed: ${err}`);
    }
  };

  // Group FK refs by table+field
  const groupedRefs = useMemo((): GroupedFKRef[] => {
    const map = new Map<string, GroupedFKRef>();
    for (const ref of fkRefs) {
      const gk = `${ref.table}::${ref.field}`;
      if (!map.has(gk)) {
        const tableSchema = schemas.find((s) => s.key === ref.table);
        map.set(gk, { table: ref.table, tableLabel: tableSchema?.label || ref.table, field: ref.field, refs: [] });
      }
      map.get(gk)!.refs.push(ref);
    }
    return [...map.values()];
  }, [fkRefs, schemas]);

  // Other rows for reassign dropdown (exclude the one being deleted)
  const otherRows = useMemo(() => rows.filter((r) => r.id !== deleteConfirm), [rows, deleteConfirm]);

  // Column settings data for modal - ensure ALL fields are always included
  const columnSettingsData = useMemo(() => {
    if (!schema) return null;
    const allFields = schema.fields;
    const allFieldNames = allFields.map((f) => f.name);
    const defaultOrder = allFieldNames;
    const defaultVisible = defaultOrder.slice(0, 8);
    
    // Ensure columnOrder includes ALL current fields and excludes stale ones
    let finalOrder: string[];
    if (columnOrder.length > 0) {
      const allFieldSet = new Set(allFieldNames);
      const validOrder = columnOrder.filter((n) => allFieldSet.has(n));
      const orderSet = new Set(validOrder);
      const missing = allFieldNames.filter((n) => !orderSet.has(n));
      finalOrder = [...validOrder, ...missing];
    } else {
      finalOrder = defaultOrder;
    }
    
    return {
      fields: allFields,
      visibleColumns: visibleColumns.length > 0 ? visibleColumns : defaultVisible,
      columnOrder: finalOrder,
    };
  }, [schema, visibleColumns, columnOrder]);

  const cellDisplay = (row: Record<string, unknown>, field: TableField) => {
    const val = row[field.name];
    if (val == null || val === '' || String(val).toLowerCase() === 'null') return <span className="text-gray-300">—</span>;
    
    // Custom rendering for upper_lower on MUSCLES table (UPPER / LOWER / BOTH)
    if (key === 'muscles' && field.name === 'upper_lower' && Array.isArray(val)) {
      const isUpper = val.some((v) => String(v).toUpperCase() === 'UPPER' || String(v).toUpperCase() === 'UPPER BODY');
      const isLower = val.some((v) => String(v).toUpperCase() === 'LOWER' || String(v).toUpperCase() === 'LOWER BODY');
      const isBoth = isUpper && isLower;
      if (isBoth) return <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">BOTH</span>;
      if (isUpper) return <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">UPPER</span>;
      if (isLower) return <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">LOWER</span>;
      return <span className="text-gray-300">—</span>;
    }
    
    // Custom rendering for parent_id on MOTIONS table (show actual ID, not label)
    if (key === 'motions' && field.name === 'parent_id') {
      return val ? <span className="text-xs font-mono">{String(val)}</span> : <span className="text-gray-300">—</span>;
    }
    
    // Custom rendering for parent_id on GRIPS table (show actual ID, not label)
    if (key === 'grips' && field.name === 'parent_id') {
      return val ? <span className="text-xs font-mono">{String(val)}</span> : <span className="text-gray-300">—</span>;
    }
    
    // Custom rendering for category_id on EQUIPMENT table (show actual ID, not label)
    if (key === 'equipment' && field.name === 'category_id') {
      return val ? <span className="text-xs font-mono">{String(val)}</span> : <span className="text-gray-300">—</span>;
    }
    
    // Custom rendering for upper_lower on MOTIONS table (display as UPPER/LOWER)
    if (key === 'motions' && field.name === 'upper_lower') {
      const v = String(val).toUpperCase();
      if (v === 'UPPER') return <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">UPPER</span>;
      if (v === 'LOWER') return <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">LOWER</span>;
      return <span className="text-gray-300">—</span>;
    }
    
    if (field.type === 'boolean') {
      return val ? (
        <span className="inline-block w-2 h-2 rounded-full bg-green-500" title="true" />
      ) : (
        <span className="inline-block w-2 h-2 rounded-full bg-gray-300" title="false" />
      );
    }
    if (field.type === 'string[]' || field.type === 'fk[]') {
      if (!Array.isArray(val)) return String(val);
      if (val.length === 0) return <span className="text-gray-300">[]</span>;
      return (
        <span className="text-xs">
          {val.slice(0, 3).join(', ')}
          {val.length > 3 && <span className="text-gray-400"> +{val.length - 3}</span>}
        </span>
      );
    }
    if (field.type === 'json') {
      if (field.jsonShape === 'muscle_targets' && val && typeof val === 'object') {
        const targets = val as Record<string, unknown>;
        // Flat schema: only muscle IDs with numeric scores count
        const hasTargets = Object.entries(targets).some(([, v]) => typeof v === 'number');
        if (!hasTargets) return <span className="text-gray-300">—</span>;
        return (
          <MuscleTargetsCellWithTooltip
            targets={targets}
            refData={refData}
          />
        );
      }
      if (field.jsonShape === 'default_delta_configs' && val && typeof val === 'object' && !Array.isArray(val)) {
        const ddc = val as { motionPaths?: string };
        const def = ddc.motionPaths ?? '—';
        const summary = def === '—' ? 'No default path' : `Default path: ${def}\n(Path options are defined on the Motion Paths table.)`;
        return (
          <span className="text-xs cursor-help" title={summary}>
            {def === '—' ? '—' : `motionPaths: ${def}`}
          </span>
        );
      }
      if (field.jsonShape === 'delta_rules' && val && typeof val === 'object' && !Array.isArray(val)) {
        const rules = val as Record<string, Record<string, number> | "inherit">;
        const keys = Object.keys(rules);
        if (keys.length === 0) return <span className="text-gray-300">—</span>;
        // Count only non-inherit rules for display
        const nonInheritCount = Object.values(rules).filter(v => v !== "inherit").length;
        return (
          <DeltaRulesCellWithTooltip
            rules={rules}
            refData={refData}
            ruleCount={nonInheritCount}
          />
        );
      }
      if (field.jsonShape === 'free' && val && typeof val === 'object' && !Array.isArray(val)) {
        const keys = Object.keys(val as Record<string, unknown>);
        return keys.length === 0 ? <span className="text-gray-300">—</span> : <span className="text-xs">{'{...}'} ({keys.length})</span>;
      }
      return <span className="text-xs text-gray-400">{'{...}'}</span>;
    }
    if (field.type === 'fk' && field.refTable && refData[field.refTable]) {
      const ref = refData[field.refTable].find((r) => r.id === val);
      if (ref) return String(ref[field.refLabelField || 'label'] || val);
      // If FK value exists but ref not found, show the ID value
      return String(val);
    }
    const str = String(val);
    return str.length > 40 ? str.slice(0, 40) + '...' : str;
  };

  if (!schema) {
    return <div className="p-8 text-gray-500">Table not found. Select a table from the sidebar.</div>;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{schema.label}</h1>
          <p className="text-sm text-gray-400">{schema.file} &middot; {rows.length} rows</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowColumnSettings(true)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium flex items-center gap-2"
            title="Configure columns"
          >
            <span>⚙️</span>
            Columns
          </button>
          <button
            onClick={handleCopyTable}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium flex items-center gap-2"
            title="Copy table to clipboard (TSV format for Excel)"
          >
            <span>📋</span>
            Copy Table
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium flex items-center gap-2"
            title="Import rows from CSV or pasted data"
          >
            <span>📥</span>
            Import Rows
          </button>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
          >
            + Add Row
          </button>
        </div>
      </div>

      {/* Collapsible table description */}
      {schema?.description && (
        <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setDescriptionExpanded((e) => !e)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left transition-colors"
          >
            <span className="text-sm font-medium text-gray-700">
              {descriptionExpanded ? 'Hide' : 'Show'} table description
            </span>
            <span
              className={`text-gray-500 transition-transform ${descriptionExpanded ? 'rotate-180' : ''}`}
              aria-hidden
            >
              ▼
            </span>
          </button>
          {descriptionExpanded && (
            <div className="px-4 py-3 bg-white border-t border-gray-200">
              <div className="text-sm text-gray-700 whitespace-pre-wrap table-description">
                {schema.description.split(/\n/).map((line, i) => {
                  const parts: React.ReactNode[] = [];
                  let rest = line;
                  let key = 0;
                  while (rest.length > 0) {
                    const bold = rest.match(/^\*\*(.+?)\*\*/);
                    if (bold) {
                      parts.push(<strong key={key++}>{bold[1]}</strong>);
                      rest = rest.slice(bold[0].length);
                    } else {
                      const next = rest.indexOf('**');
                      const chunk = next === -1 ? rest : rest.slice(0, next);
                      parts.push(chunk);
                      rest = next === -1 ? '' : rest.slice(next);
                      key++;
                    }
                  }
                  return <p key={i} className="mb-2 last:mb-0">{parts}</p>;
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-4 space-y-2">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Search rows..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 max-w-md px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {key === 'muscles' && (
            <select
              value={muscleTierFilter}
              onChange={(e) => setMuscleTierFilter(e.target.value as typeof muscleTierFilter)}
              className="px-3 py-2 text-sm border rounded bg-white border-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Tiers</option>
              <option value="PRIMARY">Primary</option>
              <option value="SECONDARY">Secondary</option>
              <option value="TERTIARY">Tertiary</option>
            </select>
          )}
          {schema && (
            <>
              <select
                value={groupBy || ''}
                onChange={(e) => setGroupBy(e.target.value || null)}
                className="px-3 py-2 text-sm border rounded bg-white border-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Group by: None</option>
                {schema.fields
                  .filter(f => f.type === 'fk' || f.type === 'fk[]' || f.type === 'string' || f.type === 'number')
                  .map(field => (
                    <option key={field.name} value={field.name}>
                      Group by: {field.label || field.name}
                    </option>
                  ))}
                {/* Special option for grouping by muscles on MOTIONS table */}
                {key === 'motions' && (
                  <option value="muscles">Group by: Muscles</option>
                )}
              </select>
              <button
                type="button"
                onClick={() => setShowFilterForm(!showFilterForm)}
                className={`px-3 py-2 text-sm border rounded ${
                  filters.length > 0
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {filters.length > 0 ? `Filters (${filters.length})` : '+ Filter'}
              </button>
            </>
          )}
          {filtered.length !== rows.length && (
            <span className="px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded">
              Showing {filtered.length} of {rows.length}
            </span>
          )}
        </div>
        {schema && showFilterForm && (
          <FilterBar
            schema={schema}
            filters={filters}
            onChange={setFilters}
            refData={refData}
            onToggleForm={setShowFilterForm}
          />
        )}
        {filters.length > 0 && !showFilterForm && (
          <div className="flex flex-wrap gap-2">
            {filters.map((filter, index) => {
              const field = schema.fields.find((f) => f.name === filter.field);
              return (
                <div
                  key={index}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded text-sm"
                >
                  <span className="font-medium text-blue-800">{field?.name || filter.field}</span>
                  <span className="text-blue-600">{filter.operator.replace(/_/g, ' ')}</span>
                  {filter.operator !== 'is_null' && filter.operator !== 'is_not_null' && (
                    <span className="text-blue-700">
                      {Array.isArray(filter.value)
                        ? `[${filter.value.length}]`
                        : String(filter.value)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setFilters(filters.filter((_, i) => i !== index))}
                    className="text-blue-500 hover:text-blue-700 font-bold ml-1"
                  >
                    ×
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => setFilters([])}
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <div
          ref={tableScrollRef}
          onMouseDown={handleScrollMouseDown}
          className={`overflow-x-auto border rounded-lg ${isDraggingScroll ? 'cursor-grabbing' : scrollMouseDown ? 'cursor-grabbing' : ''}`}
          style={{ userSelect: isDraggingScroll ? 'none' : 'auto' }}
        >
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                {visibleCols.map((col, index) => {
                  const width = columnWidths[col.name] || 150;
                  const isFirst = index === 0;
                  return (
                    <th
                      key={col.name}
                      draggable
                      onDragStart={(e) => handleColumnDragStart(e, col.name)}
                      onDragOver={handleColumnDragOver}
                      onDrop={(e) => handleColumnDrop(e, col.name)}
                      onClick={() => handleSort(col.name)}
                      style={{ width: `${width}px`, minWidth: `${width}px` }}
                      className={`px-3 py-2 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap relative ${
                        isFirst ? 'sticky left-0 z-20 bg-gray-50 border-r border-gray-200' : ''
                      } ${draggedColumn === col.name ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center gap-1">
                        <span
                          className="text-gray-400 cursor-grab active:cursor-grabbing mr-1"
                          title="Drag to reorder"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        >
                          ☰
                        </span>
                        <span className="flex-1">
                          {col.name}
                          {col.refTable && <span className="text-blue-400 ml-0.5 text-xs">FK</span>}
                          {sortCol === col.name && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                        </span>
                      </div>
                      <div
                        onMouseDown={(e) => handleResizeStart(e, col.name)}
                        className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400 ${
                          resizingColumn === col.name ? 'bg-blue-500' : ''
                        }`}
                        title="Drag to resize"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </th>
                  );
                })}
                {key === 'muscles' && (
                  <th
                    className="px-3 py-2 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                    style={{ width: '90px', minWidth: '90px' }}
                    onClick={() => handleSort('_muscle_tier')}
                  >
                    Tier
                    {sortCol === '_muscle_tier' && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                )}
                <th className="px-3 py-2 text-right font-medium text-gray-600 w-28 sticky right-0 z-10 bg-gray-50">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => {
                const rowId = String(row.id ?? idx);
                const isDragged = draggedRowId === rowId;
                const isSectionHeader = (row._isSectionHeader as boolean) || false;
                
                // Render section header row (nested: _groupLevel 0 = primary, 1 = secondary)
                if (isSectionHeader) {
                  const sectionLabel = String(row._sectionLabel ?? '');
                  const headerLevel = (row._groupLevel as number) ?? 0;
                  return (
                    <tr 
                      key={`header-${idx}`} 
                      className="bg-gray-100 border-b border-gray-300"
                      style={{ pointerEvents: 'none' }}
                    >
                      <td 
                        colSpan={visibleCols.length + (key === 'muscles' ? 2 : 1)}
                        className="px-4 py-2 font-semibold text-gray-700 text-sm uppercase tracking-wider"
                        style={{ paddingLeft: `${16 + headerLevel * 24}px` }}
                      >
                        {sectionLabel}
                      </td>
                    </tr>
                  );
                }
                
                return (
                  <tr
                    key={rowId}
                    draggable={true}
                    onDragStart={(e) => handleRowDragStart(e, rowId)}
                    onDragOver={handleRowDragOver}
                    onDrop={(e) => handleRowDrop(e, rowId)}
                    onDragEnd={() => {
                      setIsDraggingRow(false);
                      setDraggedRowId(null);
                      setRowDragHandleActive(false);
                    }}
                    className={`border-b hover:bg-blue-50 cursor-pointer group ${
                      isDragged ? 'opacity-50' : ''
                    }`}
                    onClick={(e) => {
                      // Don't open side-panel if user was scrolling horizontally or dragging row
                      if (isDraggingScroll || isDraggingRow) {
                        return;
                      }
                      // Don't open if clicking on drag handle or delete button
                      const target = e.target as HTMLElement;
                      if (target.closest('.row-drag-handle') || target.closest('button')) {
                        return;
                      }
                      setEditRow({ ...row });
                      setIsNew(false);
                      setEditRowHistory([]);
                    }}
                  >
                    {visibleCols.map((col, index) => {
                      const width = columnWidths[col.name] || 150;
                      const isFirst = index === 0;
                      const isIdField = col.name === schema.idField;
                      const groupLevel = (row._groupLevel as number) || 0;
                      return (
                        <td
                          key={col.name}
                          style={{ width: `${width}px`, minWidth: `${width}px` }}
                          className={`px-3 py-2 truncate ${
                            isFirst
                              ? 'sticky left-0 z-10 bg-white group-hover:bg-blue-50 border-r border-gray-200'
                              : ''
                          }`}
                        >
                          {isIdField ? (
                            <div className="flex items-center gap-2" style={{ paddingLeft: isFirst ? `${groupLevel * 24}px` : '0' }}>
                              <span
                                className="row-drag-handle text-gray-400 cursor-grab active:cursor-grabbing hover:text-gray-600 select-none"
                                title="Drag to reorder"
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setRowDragHandleActive(true);
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                }}
                              >
                                ☰
                              </span>
                              <span>{cellDisplay(row, col)}</span>
                            </div>
                          ) : (
                            <div style={{ paddingLeft: isFirst ? `${groupLevel * 24}px` : '0' }}>
                              {cellDisplay(row, col)}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    {key === 'muscles' && (
                      <td className="px-3 py-2" style={{ width: '90px', minWidth: '90px' }}>
                        {(() => {
                          const tier = row._muscle_tier as string;
                          const cls = tier === 'PRIMARY'
                            ? 'bg-blue-100 text-blue-700'
                            : tier === 'SECONDARY'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-purple-100 text-purple-700';
                          return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{tier}</span>;
                        })()}
                      </td>
                    )}
                    <td className="px-3 py-2 text-right whitespace-nowrap space-x-1 sticky right-0 z-10 bg-white group-hover:bg-blue-50 border-l border-gray-200">
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(row.id as string); }} className="text-red-400 hover:text-red-600 text-xs">Delete</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={visibleCols.length + (key === 'muscles' ? 2 : 1)} className="px-3 py-8 text-center text-gray-400">
                    {search ? 'No matching rows' : 'No data'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Row Editor - only when schema is loaded to avoid white screen */}
      {editRow && schema && (
        <RowEditor
          key={String(editRow[schema.idField] ?? 'new')}
          schema={schema}
          row={editRow}
          isNew={isNew}
          refData={refData}
          onSave={handleSave}
          onCancel={handleClosePanel}
          onOpenRow={handleOpenRow}
          hasHistory={editRowHistory.length > 0}
        />
      )}

      {/* Enhanced Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl">
            <h3 className="font-bold text-gray-800 mb-1">Delete Row</h3>
            <p className="text-sm text-gray-600 mb-3">
              Delete <span className="font-medium">{deleteLabel}</span>{' '}
              <code className="bg-gray-100 px-1 text-xs">{deleteConfirm}</code>?
            </p>

            {fkRefs.length > 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded">
                <p className="font-medium text-amber-800 text-sm mb-2">
                  This record is referenced by {fkRefs.length} record{fkRefs.length !== 1 ? 's' : ''}:
                </p>
                <div className="space-y-1.5 mb-3 max-h-40 overflow-y-auto">
                  {groupedRefs.map((g) => (
                    <div key={`${g.table}::${g.field}`} className="text-xs">
                      <span className="font-medium text-amber-800">{g.refs.length}</span>
                      {' '}
                      <span className="text-amber-700">{g.tableLabel}</span>
                      <span className="text-amber-500 ml-1">via {g.field}</span>
                      <div className="ml-4 text-amber-600">
                        {g.refs.slice(0, 5).map((r, i) => (
                          <span key={i}>{i > 0 ? ', ' : ''}{r.rowLabel}</span>
                        ))}
                        {g.refs.length > 5 && <span> ...+{g.refs.length - 5} more</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reassign option */}
                <div className="border-t border-amber-200 pt-2 mt-2">
                  <label className="block text-xs font-medium text-amber-800 mb-1">
                    Reassign references to:
                  </label>
                  <select
                    value={reassignTarget}
                    onChange={(e) => setReassignTarget(e.target.value)}
                    className="w-full px-2 py-1.5 border border-amber-300 rounded text-xs bg-white"
                  >
                    <option value="">-- Select replacement --</option>
                    {otherRows.map((r) => (
                      <option key={String(r.id)} value={String(r.id)}>
                        {String(r[schema?.labelField || 'label'] ?? r.id)} ({String(r.id)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>

              {fkRefs.length > 0 && reassignTarget && (
                <button
                  onClick={handleReassignAndDelete}
                  className="px-4 py-2 text-sm bg-amber-600 text-white rounded hover:bg-amber-700"
                >
                  Reassign & Delete
                </button>
              )}

              {fkRefs.length > 0 && (
                <button
                  onClick={handleForceDeleteBreakLinks}
                  className="px-4 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
                  title="Delete and set all referencing fields to empty"
                >
                  Force Delete & Break Links
                </button>
              )}

              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
              >
                {fkRefs.length > 0 ? 'Delete Anyway' : 'Delete'}
              </button>

              <button
                onClick={handleHardDelete}
                className="px-4 py-2 text-sm bg-red-800 text-white rounded hover:bg-red-900 border border-red-900"
                title="Remove row from database permanently (cannot be undone)"
              >
                Permanently delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Column Settings Modal */}
      {showColumnSettings && columnSettingsData && (
        <ColumnSettings
          fields={columnSettingsData.fields}
          visibleColumns={columnSettingsData.visibleColumns}
          columnOrder={columnSettingsData.columnOrder}
          onSave={saveColumnSettings}
          onClose={() => setShowColumnSettings(false)}
        />
      )}

      {showImportModal && schema && (
        <ImportRowsModal
          schema={schema}
          existingRows={rows}
          onImport={handleImportRows}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
}
