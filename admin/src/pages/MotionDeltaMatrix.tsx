import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api, type TableSchema } from '../api';
import toast from 'react-hot-toast';
import MatrixV2ConfigPanel from './MatrixV2ConfigPanel';

interface MotionDeltaMatrixProps {
  schemas: TableSchema[];
  onDataChange: () => void;
}

interface MotionRecord {
  id: string;
  label: string;
  parent_id?: string | null;
  muscle_targets?: Record<string, unknown>;
  [key: string]: unknown;
}

interface MuscleRecord {
  id: string;
  label: string;
  parent_ids?: string[];
  [key: string]: unknown;
}

// Tables that have delta_rules
const DELTA_TABLES: { key: string; label: string }[] = [
  { key: 'motionPaths', label: 'Motion Paths' },
  { key: 'torsoAngles', label: 'Torso Angles' },
  { key: 'torsoOrientations', label: 'Torso Orientations' },
  { key: 'resistanceOrigin', label: 'Resistance Origin' },
  { key: 'grips', label: 'Grips' },
  { key: 'gripWidths', label: 'Grip Widths' },
  { key: 'elbowRelationship', label: 'Elbow Relationship' },
  { key: 'executionStyles', label: 'Execution Styles' },
  { key: 'footPositions', label: 'Foot Positions' },
  { key: 'stanceWidths', label: 'Stance Widths' },
  { key: 'stanceTypes', label: 'Stance Types' },
  { key: 'loadPlacement', label: 'Load Placement' },
  { key: 'supportStructures', label: 'Support Structures' },
  { key: 'loadingAids', label: 'Loading Aids' },
  { key: 'rangeOfMotion', label: 'Range of Motion' },
  { key: 'equipmentCategories', label: 'Equipment Categories' },
  { key: 'equipment', label: 'Equipment' },
];

const DELTA_TABLE_KEYS = DELTA_TABLES.map(t => t.key);

// Map table keys to their groups
const TABLE_GROUP_MAP: Record<string, string> = {
  motionPaths: 'Trajectory & Posture',
  torsoAngles: 'Trajectory & Posture',
  torsoOrientations: 'Trajectory & Posture',
  resistanceOrigin: 'Trajectory & Posture',
  grips: 'Upper Body Mechanics',
  gripWidths: 'Upper Body Mechanics',
  elbowRelationship: 'Upper Body Mechanics',
  executionStyles: 'Upper Body Mechanics',
  footPositions: 'Lower Body Mechanics',
  stanceWidths: 'Lower Body Mechanics',
  stanceTypes: 'Lower Body Mechanics',
  loadPlacement: 'Lower Body Mechanics',
  supportStructures: 'Execution Variables',
  loadingAids: 'Execution Variables',
  rangeOfMotion: 'Execution Variables',
  equipmentCategories: 'Equipment',
  equipment: 'Equipment',
};

// Group DELTA_TABLES by their group and calculate colspans
function getGroupedTableHeaders(): Array<{ group: string; startIdx: number; count: number }> {
  const groups: Array<{ group: string; startIdx: number; count: number }> = [];
  let currentGroup = '';
  let startIdx = 0;
  let count = 0;

  DELTA_TABLES.forEach((table, idx) => {
    const group = TABLE_GROUP_MAP[table.key] || 'Other';
    if (group !== currentGroup) {
      if (currentGroup && count > 0) {
        groups.push({ group: currentGroup, startIdx, count });
      }
      currentGroup = group;
      startIdx = idx;
      count = 1;
    } else {
      count++;
    }
  });

  // Add the last group
  if (currentGroup && count > 0) {
    groups.push({ group: currentGroup, startIdx, count });
  }

  return groups;
}

// A single relationship: one row from one table that has this motion in its delta_rules
interface DeltaRelationship {
  tableKey: string;
  rowId: string;
  rowLabel: string;
  motionValue: Record<string, number> | "inherit";
}

// ─── Inline DeltaMuscleTree (simplified for the matrix side-panel) ───

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

type TreeNode = { _score: number; [childId: string]: TreeNode | number };

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
  return tree;
}

// Display tree for tooltip (label + score + children)
type TreeBranch = { label: string; score?: number; children?: Record<string, TreeBranch> };

function buildDeltaTreeFromFlat(flat: Record<string, number>, allMuscles: MuscleRecord[]): Record<string, TreeBranch> {
  const tree: Record<string, TreeBranch> = {};
  for (const [muscleId, score] of Object.entries(flat)) {
    const level = getMuscleLevel(muscleId, allMuscles);
    const label = getMuscleLabel(allMuscles, muscleId);
    if (level === 'primary') {
      tree[muscleId] = { label, score, children: tree[muscleId]?.children ?? {} };
    } else if (level === 'secondary') {
      const pId = findPrimaryFor(muscleId, allMuscles);
      if (!tree[pId]) tree[pId] = { label: getMuscleLabel(allMuscles, pId), children: {} };
      const p = tree[pId];
      p.children = p.children ?? {};
      p.children[muscleId] = { label, score, children: (p.children[muscleId] as TreeBranch)?.children ?? {} };
    } else {
      const sId = findSecondaryFor(muscleId, allMuscles);
      const pId = findPrimaryFor(muscleId, allMuscles);
      if (!tree[pId]) tree[pId] = { label: getMuscleLabel(allMuscles, pId), children: {} };
      const p = tree[pId];
      p.children = p.children ?? {};
      if (sId && !p.children[sId]) p.children[sId] = { label: getMuscleLabel(allMuscles, sId), children: {} };
      if (sId) {
        const s = p.children[sId];
        s.children = s.children ?? {};
        s.children[muscleId] = { label, score };
      }
    }
  }
  return tree;
}

function MatrixCellTooltipContent({
  motionLabel,
  tableLabel,
  rels,
  muscles,
}: {
  motionLabel: string;
  tableLabel: string;
  rels: DeltaRelationship[];
  muscles: MuscleRecord[];
}) {
  return (
    <div className="bg-gray-900 text-gray-100 rounded-lg shadow-xl border border-gray-700 overflow-hidden max-h-[70vh] overflow-y-auto" style={{ fontSize: '10px', minWidth: '200px', maxWidth: '320px' }}>
      <div className="px-2.5 py-1.5 border-b border-gray-700 font-semibold text-amber-200 text-[11px] sticky top-0 bg-gray-900 z-10">
        {motionLabel} · {tableLabel}
      </div>
      <div className="p-2 space-y-3">
        {rels.length === 0 ? (
          <div className="text-gray-400 text-xs italic">No rules</div>
        ) : (
          rels.map(rel => (
            <div key={rel.rowId} className="rounded bg-gray-800/80 overflow-hidden">
              <div className="px-2 py-1 font-medium text-blue-200 border-b border-gray-700">{rel.rowLabel}</div>
              <div className="p-1.5">
                {rel.motionValue === 'inherit' ? (
                  <span className="text-green-300 italic text-xs">Inherits from parent</span>
                ) : Object.keys(rel.motionValue).length === 0 ? (
                  <span className="text-gray-400 text-xs italic">Empty (no modifiers)</span>
                ) : (
                  <div className="space-y-0.5">
                    {Object.entries(buildDeltaTreeFromFlat(rel.motionValue, muscles)).map(([pId, p]) => (
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
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Inline delta tree editor for single-motion context ───
function InlineDeltaEditor({
  delta,
  allMuscles,
  onSave,
}: {
  delta: Record<string, number>;
  allMuscles: MuscleRecord[];
  onSave: (newDelta: Record<string, number>) => void;
}) {
  const tree = useMemo(() => buildTreeFromFlat(delta, allMuscles), [delta, allMuscles]);
  const primaries = allMuscles.filter(m => !m.parent_ids || m.parent_ids.length === 0);

  const updateScore = (muscleId: string, value: number) => {
    const newFlat = { ...delta, [muscleId]: value };
    onSave(newFlat);
  };

  const removeMuscle = (muscleId: string) => {
    const newFlat = { ...delta };
    delete newFlat[muscleId];
    onSave(newFlat);
  };

  const addMuscle = (muscleId: string) => {
    onSave({ ...delta, [muscleId]: 0 });
  };

  const usedPrimaries = new Set<string>();
  Object.keys(delta).forEach(id => usedPrimaries.add(findPrimaryFor(id, allMuscles)));

  const availablePrimaries = primaries.filter(p => !usedPrimaries.has(p.id));
  const pKeys = Object.keys(tree).filter(k => k !== '_score');

  return (
    <div className="space-y-1">
      {pKeys.length === 0 && (
        <div className="text-xs text-gray-400 italic py-1">No delta modifiers</div>
      )}
      {pKeys.map(pId => {
        const pNode = tree[pId] as TreeNode;
        const pLabel = getMuscleLabel(allMuscles, pId);
        const sKeys = Object.keys(pNode).filter(k => k !== '_score');

        return (
          <div key={pId} className="border border-gray-200 rounded p-1 bg-gray-50">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-gray-700">{pLabel}</span>
              {sKeys.length === 0 && (
                <>
                  <input
                    type="number"
                    value={pNode._score}
                    onChange={e => updateScore(pId, parseFloat(e.target.value) || 0)}
                    className="w-14 text-[10px] border border-gray-300 rounded px-0.5 py-0 text-right"
                    step="0.1"
                  />
                  <button onClick={() => removeMuscle(pId)} className="text-red-400 hover:text-red-600 text-[10px] ml-auto">×</button>
                </>
              )}
            </div>
            {sKeys.length > 0 && (
              <div className="pl-2 mt-0.5 space-y-0.5 border-l border-gray-200 ml-0.5">
                {sKeys.map(sId => {
                  const sNode = pNode[sId] as TreeNode;
                  const sLabel = getMuscleLabel(allMuscles, sId);
                  const tKeys = Object.keys(sNode).filter(k => k !== '_score');

                  return (
                    <div key={sId}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-600">{sLabel}</span>
                        {tKeys.length === 0 && (
                          <>
                            <input
                              type="number"
                              value={sNode._score}
                              onChange={e => updateScore(sId, parseFloat(e.target.value) || 0)}
                              className="w-14 text-[10px] border border-gray-300 rounded px-0.5 py-0 text-right"
                              step="0.1"
                            />
                            <button onClick={() => removeMuscle(sId)} className="text-red-400 hover:text-red-600 text-[10px] ml-auto">×</button>
                          </>
                        )}
                      </div>
                      {tKeys.length > 0 && (
                        <div className="pl-2 mt-0.5 space-y-0 border-l border-gray-200 ml-0.5">
                          {tKeys.map(tId => {
                            const tNode = sNode[tId] as TreeNode;
                            const tLabel = getMuscleLabel(allMuscles, tId);
                            return (
                              <div key={tId} className="flex items-center gap-1.5">
                                <span className="text-[10px] text-gray-500">{tLabel}</span>
                                <input
                                  type="number"
                                  value={tNode._score}
                                  onChange={e => updateScore(tId, parseFloat(e.target.value) || 0)}
                                  className="w-14 text-[10px] border border-gray-300 rounded px-0.5 py-0 text-right"
                                  step="0.1"
                                />
                                <button onClick={() => removeMuscle(tId)} className="text-red-400 hover:text-red-600 text-[10px] ml-auto">×</button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      {/* Add muscle dropdown */}
      <select
        onChange={e => { if (e.target.value) addMuscle(e.target.value); e.target.value = ''; }}
        className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 text-gray-600 bg-white mt-0.5"
        defaultValue=""
      >
        <option value="">+ Add muscle...</option>
        {allMuscles.map(m => (
          <option key={m.id} value={m.id} disabled={m.id in delta}>
            {m.label} ({getMuscleLevel(m.id, allMuscles)})
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Main component ───

export default function MotionDeltaMatrix({ onDataChange }: MotionDeltaMatrixProps) {
  const [activeTab, setActiveTab] = useState<'delta_rules' | 'v2_config'>('delta_rules');
  const [motions, setMotions] = useState<MotionRecord[]>([]);
  const [tableData, setTableData] = useState<Record<string, Record<string, unknown>[]>>({});
  const [muscles, setMuscles] = useState<MuscleRecord[]>([]);
  const [selectedMotion, setSelectedMotion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set(DELTA_TABLE_KEYS)); // All tables expanded by default
  const [familyPlanesExpanded, setFamilyPlanesExpanded] = useState(false);
  const [cellTooltip, setCellTooltip] = useState<{ motionId: string; tableKey: string; left: number; top: number } | null>(null);
  const cellTooltipHideTimeoutRef = useRef<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [motionsData, musclesData, ...otherTablesData] = await Promise.all([
        api.getTable('motions'),
        api.getTable('muscles'),
        ...DELTA_TABLE_KEYS.map(table => api.getTable(table).catch(() => [])),
      ]);

      setMotions(Array.isArray(motionsData) ? motionsData : []);
      setMuscles(Array.isArray(musclesData) ? musclesData : []);
      
      const tableDataMap: Record<string, Record<string, unknown>[]> = {};
      DELTA_TABLE_KEYS.forEach((table, idx) => {
        const data = otherTablesData[idx];
        tableDataMap[table] = Array.isArray(data) ? data : [];
      });
      setTableData(tableDataMap);
    } catch (err) {
      console.error('Failed to load data:', err);
      toast.error('Failed to load matrix data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getPrimaryMuscleForMotion = useCallback((motion: MotionRecord): string | null => {
    const targets = motion.muscle_targets as Record<string, unknown> | undefined;
    if (!targets || typeof targets !== 'object') return null;
    const primaryMuscleIds = Object.keys(targets).filter(k => k !== '_score');
    if (primaryMuscleIds.length === 0) return null;
    if (primaryMuscleIds.length === 1) return primaryMuscleIds[0];
    let maxScore = -Infinity;
    let maxMuscleId: string | null = null;
    primaryMuscleIds.forEach(muscleId => {
      const muscleNode = targets[muscleId] as Record<string, unknown> | undefined;
      if (muscleNode && typeof muscleNode === 'object') {
        const score = typeof muscleNode._score === 'number' ? muscleNode._score : 0;
        if (score > maxScore) { maxScore = score; maxMuscleId = muscleId; }
      }
    });
    return maxMuscleId || primaryMuscleIds[0];
  }, []);

  // Group motions by muscles
  const groupedMotions = useMemo(() => {
    if (!Array.isArray(muscles) || muscles.length === 0) return motions.map(m => ({ ...m, _groupLevel: 0 }));
    
    const muscleMap = new Map(muscles.map((m: MuscleRecord) => [String(m.id ?? ''), m]));
    const muscleGroups = new Map<string | null, MotionRecord[]>();
    
    motions.forEach(motion => {
      const primaryMuscleId = getPrimaryMuscleForMotion(motion);
      if (!muscleGroups.has(primaryMuscleId)) muscleGroups.set(primaryMuscleId, []);
      muscleGroups.get(primaryMuscleId)!.push(motion);
    });
    
    const grouped: (MotionRecord & { _groupLevel?: number; _isSectionHeader?: boolean; _sectionLabel?: string })[] = [];
    const sortedGroups = Array.from(muscleGroups.entries()).sort((a, b) => {
      if (a[0] === null) return 1;
      if (b[0] === null) return -1;
      const muscleA = muscleMap.get(a[0]!);
      const muscleB = muscleMap.get(b[0]!);
      return String(muscleA?.label ?? a[0] ?? '').localeCompare(String(muscleB?.label ?? b[0] ?? ''));
    });
    
    sortedGroups.forEach(([muscleId, motionsList]) => {
      const muscle = muscleId ? muscleMap.get(muscleId) : null;
      const muscleLabel = muscleId ? String(muscle?.label ?? muscleId ?? 'Unknown') : 'No Primary Muscle';
      grouped.push({ _isSectionHeader: true, _sectionLabel: muscleLabel, _groupLevel: 0 } as any);
      
      const parents: MotionRecord[] = [];
      const childMap = new Map<string, MotionRecord[]>();
      
      motionsList.forEach(motion => {
        if (!motion.parent_id) { parents.push(motion); }
        else {
          const pid = String(motion.parent_id);
          if (!childMap.has(pid)) childMap.set(pid, []);
          childMap.get(pid)!.push(motion);
        }
      });
      
      parents.sort((a, b) => String(a.label).localeCompare(String(b.label)));
      parents.forEach(p => {
        grouped.push({ ...p, _groupLevel: 0 });
        const children = childMap.get(String(p.id)) || [];
        children.sort((a, b) => String(a.label).localeCompare(String(b.label)));
        children.forEach(c => grouped.push({ ...c, _groupLevel: 1 }));
        childMap.delete(String(p.id));
      });
      childMap.forEach(children => {
        children.sort((a, b) => String(a.label).localeCompare(String(b.label)));
        children.forEach(c => grouped.push({ ...c, _groupLevel: 0 }));
      });
    });
    
    return grouped;
  }, [motions, muscles, getPrimaryMuscleForMotion]);

  // For a given motionId, find ALL rows across ALL tables that reference it in their delta_rules
  const getRelationshipsForMotion = useCallback((motionId: string): Record<string, DeltaRelationship[]> => {
    const result: Record<string, DeltaRelationship[]> = {};
    
    DELTA_TABLE_KEYS.forEach(tableKey => {
      const tableRows = tableData[tableKey] || [];
      const matches: DeltaRelationship[] = [];
      
      tableRows.forEach(row => {
        const dr = row.delta_rules;
        if (!dr || typeof dr !== 'object' || Array.isArray(dr)) return;
        const rules = dr as Record<string, unknown>;
        if (!(motionId in rules)) return;
        
        const motionValue = rules[motionId];
        let parsed: Record<string, number> | "inherit";
        if (motionValue === "inherit") {
          parsed = "inherit";
        } else if (motionValue && typeof motionValue === 'object' && !Array.isArray(motionValue)) {
          const flat: Record<string, number> = {};
          for (const [k, v] of Object.entries(motionValue as Record<string, unknown>)) {
            if (typeof v === 'number') flat[k] = v;
          }
          parsed = flat;
        } else {
          parsed = {};
        }
        
        matches.push({
          tableKey,
          rowId: String(row.id),
          rowLabel: String(row.label ?? row.id),
          motionValue: parsed,
        });
      });
      
      if (matches.length > 0) {
        matches.sort((a, b) => a.rowLabel.localeCompare(b.rowLabel));
        result[tableKey] = matches;
      }
    });
    
    return result;
  }, [tableData]);

  // Count how many rows in a table reference this motion
  const countRelationships = useCallback((motionId: string, tableKey: string): { total: number; inherit: number; empty: number; configured: number } => {
    const tableRows = tableData[tableKey] || [];
    let total = 0, inherit = 0, empty = 0, configured = 0;
    
    tableRows.forEach(row => {
      const dr = row.delta_rules;
      if (!dr || typeof dr !== 'object' || Array.isArray(dr)) return;
      const rules = dr as Record<string, unknown>;
      if (!(motionId in rules)) return;
      
      total++;
      const val = rules[motionId];
      if (val === "inherit") { inherit++; }
      else if (val && typeof val === 'object' && Object.keys(val).length > 0) { configured++; }
      else { empty++; }
    });
    
    return { total, inherit, empty, configured };
  }, [tableData]);

  const getTableLabel = useCallback((key: string): string => {
    return DELTA_TABLES.find(t => t.key === key)?.label || key;
  }, []);

  const clearCellTooltipHideTimeout = useCallback(() => {
    if (cellTooltipHideTimeoutRef.current) {
      clearTimeout(cellTooltipHideTimeoutRef.current);
      cellTooltipHideTimeoutRef.current = null;
    }
  }, []);

  const scheduleCellTooltipHide = useCallback(() => {
    clearCellTooltipHideTimeout();
    cellTooltipHideTimeoutRef.current = window.setTimeout(() => {
      setCellTooltip(null);
      cellTooltipHideTimeoutRef.current = null;
    }, 100);
  }, [clearCellTooltipHideTimeout]);

  useEffect(() => () => clearCellTooltipHideTimeout(), [clearCellTooltipHideTimeout]);

  // Save delta_rules for a motion on a specific row in a specific table
  const saveDelta = useCallback(async (tableKey: string, rowId: string, motionId: string, newMotionValue: Record<string, number> | "inherit") => {
    try {
      const tableRows = tableData[tableKey] || [];
      const row = tableRows.find(r => String(r.id) === rowId);
      if (!row) return;
      
      const currentDr = (row.delta_rules && typeof row.delta_rules === 'object' && !Array.isArray(row.delta_rules))
        ? { ...(row.delta_rules as Record<string, unknown>) }
        : {};
      currentDr[motionId] = newMotionValue;
      
      await api.updateRow(tableKey, rowId, { delta_rules: currentDr });
      await loadData();
      onDataChange();
    } catch (err) {
      console.error('Failed to save delta:', err);
      toast.error('Failed to save');
    }
  }, [tableData, loadData, onDataChange]);

  // Remove this motion from a row's delta_rules
  const removeDelta = useCallback(async (tableKey: string, rowId: string, motionId: string) => {
    try {
      const tableRows = tableData[tableKey] || [];
      const row = tableRows.find(r => String(r.id) === rowId);
      if (!row) return;
      
      const currentDr = (row.delta_rules && typeof row.delta_rules === 'object' && !Array.isArray(row.delta_rules))
        ? { ...(row.delta_rules as Record<string, unknown>) }
        : {};
      delete currentDr[motionId];
      
      await api.updateRow(tableKey, rowId, { delta_rules: currentDr });
      toast.success('Removed rule');
      await loadData();
      onDataChange();
    } catch (err) {
      console.error('Failed to remove delta:', err);
      toast.error('Failed to remove');
    }
  }, [tableData, loadData, onDataChange]);

  // Add this motion to a new row's delta_rules (empty object)
  const addDelta = useCallback(async (tableKey: string, rowId: string, motionId: string) => {
    try {
      const tableRows = tableData[tableKey] || [];
      const row = tableRows.find(r => String(r.id) === rowId);
      if (!row) return;
      
      const currentDr = (row.delta_rules && typeof row.delta_rules === 'object' && !Array.isArray(row.delta_rules))
        ? { ...(row.delta_rules as Record<string, unknown>) }
        : {};
      currentDr[motionId] = {};
      
      await api.updateRow(tableKey, rowId, { delta_rules: currentDr });
      toast.success('Added rule');
      await loadData();
      onDataChange();
    } catch (err) {
      console.error('Failed to add delta:', err);
      toast.error('Failed to add');
    }
  }, [tableData, loadData, onDataChange]);

  const toggleCard = useCallback((cardKey: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(cardKey)) next.delete(cardKey); else next.add(cardKey);
      return next;
    });
  }, []);

  const toggleTable = useCallback((tableKey: string) => {
    setExpandedTables(prev => {
      const next = new Set(prev);
      if (next.has(tableKey)) next.delete(tableKey); else next.add(tableKey);
      return next;
    });
  }, []);

  // ─── Selected motion data (must be before family hooks) ───
  const selectedMotionData = useMemo(() => {
    return selectedMotion ? motions.find(m => m.id === selectedMotion) ?? null : null;
  }, [selectedMotion, motions]);

  // ─── Family paths logic (for MOTION_PATHS section) ───
  const familyMotions = useMemo(() => {
    if (!selectedMotion || !selectedMotionData) return [];
    const primaryId = selectedMotionData.parent_id || selectedMotion;
    return motions.filter(m => m.id === primaryId || m.parent_id === primaryId);
  }, [selectedMotion, selectedMotionData, motions]);

  const familyPlaneUsage = useMemo(() => {
    if (!selectedMotion) return {};
    const usage: Record<string, { motionId: string; motionLabel: string }> = {};
    const familyIds = new Set(familyMotions.map(m => m.id));
    familyIds.delete(selectedMotion);
    
    const motionPathsRows = tableData['motionPaths'] || [];
    for (const plane of motionPathsRows) {
      const rules = plane.delta_rules;
      if (!rules || typeof rules !== 'object' || Array.isArray(rules)) continue;
      for (const mid of Object.keys(rules)) {
        if (familyIds.has(mid)) {
          const motion = motions.find(m => m.id === mid);
          usage[String(plane.id)] = { motionId: mid, motionLabel: motion?.label ?? mid };
          break;
        }
      }
    }
    return usage;
  }, [selectedMotion, familyMotions, tableData, motions]);

  const allFamilyPlaneInfo = useMemo(() => {
    if (!selectedMotion) return [];
    const motionPathsRows = tableData['motionPaths'] || [];
    // Get relationships for selected motion to determine which planes are assigned to it
    const selectedMotionRelationships = getRelationshipsForMotion(selectedMotion);
    const selectedSet = new Set((selectedMotionRelationships['motionPaths'] || []).map(r => r.rowId));
    
    const result: Array<{
      planeId: string;
      planeLabel: string;
      assignedToMotionId: string | null;
      assignedToMotionLabel: string | null;
    }> = [];

    // Add planes assigned to family motions
    for (const [planeId, info] of Object.entries(familyPlaneUsage)) {
      const plane = motionPathsRows.find(p => String(p.id) === planeId);
      result.push({
        planeId,
        planeLabel: plane ? String(plane.label ?? planeId) : planeId,
        assignedToMotionId: info.motionId,
        assignedToMotionLabel: info.motionLabel,
      });
    }

    // Add unassigned planes (not assigned to selected motion or any family motion)
    for (const plane of motionPathsRows) {
      const planeId = String(plane.id);
      if (!selectedSet.has(planeId) && !familyPlaneUsage[planeId]) {
        result.push({
          planeId,
          planeLabel: String(plane.label ?? planeId),
          assignedToMotionId: null,
          assignedToMotionLabel: null,
        });
      }
    }

    return result.sort((a, b) => a.planeLabel.localeCompare(b.planeLabel));
  }, [selectedMotion, getRelationshipsForMotion, familyPlaneUsage, tableData]);

  const reassignPlane = useCallback(async (planeId: string, fromMotionId: string | null, toMotionId: string) => {
    try {
      const motionPathsRows = tableData['motionPaths'] || [];
      const plane = motionPathsRows.find(p => String(p.id) === planeId);
      if (!plane) return;

      const newRules = (plane.delta_rules && typeof plane.delta_rules === 'object' && !Array.isArray(plane.delta_rules))
        ? { ...(plane.delta_rules as Record<string, unknown>) }
        : {};
      
      if (fromMotionId) delete newRules[fromMotionId];
      newRules[toMotionId] = newRules[toMotionId] ?? {};

      await api.updateRow('motionPaths', planeId, { delta_rules: newRules });
      toast.success('Reassigned plane');
      await loadData();
      onDataChange();
    } catch (err) {
      console.error('Failed to reassign plane:', err);
      toast.error('Failed to reassign plane');
    }
  }, [tableData, loadData, onDataChange]);

  // ─── Build flat export data (one row per motion, one column per table) ───
  const buildExportData = useCallback((): Record<string, unknown>[] => {
    return motions.map(motion => {
      const row: Record<string, unknown> = {
        motion_id: motion.id,
        motion_label: motion.label,
        parent_id: motion.parent_id || null,
        muscle_targets: motion.muscle_targets || null,
      };

      DELTA_TABLE_KEYS.forEach(tableKey => {
        const tableRows = tableData[tableKey] || [];
        const cellObj: Record<string, Record<string, number> | "inherit"> = {};

        tableRows.forEach(tRow => {
          const dr = tRow.delta_rules;
          if (!dr || typeof dr !== 'object' || Array.isArray(dr)) return;
          const rules = dr as Record<string, unknown>;
          if (!(motion.id in rules)) return;

          const val = rules[motion.id];
          if (val === "inherit") {
            cellObj[String(tRow.id)] = "inherit";
          } else if (val && typeof val === 'object' && !Array.isArray(val)) {
            const flat: Record<string, number> = {};
            for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
              if (typeof v === 'number') flat[k] = v;
            }
            cellObj[String(tRow.id)] = flat;
          } else {
            cellObj[String(tRow.id)] = {};
          }
        });

        row[tableKey] = Object.keys(cellObj).length > 0 ? cellObj : null;
      });

      return row;
    });
  }, [motions, tableData]);

  const handleCopyMatrix = useCallback(async () => {
    try {
      const data = buildExportData();
      if (data.length === 0) { toast.error('No data to copy'); return; }

      const escapeTsv = (cell: string): string => {
        if (cell.includes('\t') || cell.includes('\n') || cell.includes('\r') || cell.includes('"')) {
          return '"' + cell.replace(/"/g, '""') + '"';
        }
        return cell;
      };

      // Order: motion_id, motion_label, parent_id, muscle_targets, then delta tables (motionPaths first)
      const motionPathsIdx = DELTA_TABLE_KEYS.indexOf('motionPaths');
      const otherTables = [...DELTA_TABLE_KEYS];
      if (motionPathsIdx >= 0) {
        otherTables.splice(motionPathsIdx, 1);
      }
      const headers = ['motion_id', 'motion_label', 'parent_id', 'muscle_targets', ...(motionPathsIdx >= 0 ? ['motionPaths'] : []), ...otherTables];
      const rows = data.map(row =>
        headers.map(h => {
          const val = row[h];
          if (val == null) return '';
          if (typeof val === 'object') return escapeTsv(JSON.stringify(val));
          return escapeTsv(String(val));
        }).join('\t')
      );

      const tsv = [headers.join('\t'), ...rows].join('\n');
      await navigator.clipboard.writeText(tsv);
      toast.success(`Copied ${data.length} motions to clipboard`);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy to clipboard');
    }
  }, [buildExportData]);

  const handleDownloadCsv = useCallback(() => {
    try {
      const data = buildExportData();
      if (data.length === 0) {
        toast.error('No data to download');
        return;
      }
      const escapeCsv = (cell: string): string => {
        if (cell.includes(',') || cell.includes('\n') || cell.includes('\r') || cell.includes('"')) {
          return '"' + cell.replace(/"/g, '""') + '"';
        }
        return cell;
      };
      const motionPathsIdx = DELTA_TABLE_KEYS.indexOf('motionPaths');
      const otherTables = [...DELTA_TABLE_KEYS];
      if (motionPathsIdx >= 0) otherTables.splice(motionPathsIdx, 1);
      const headers = ['motion_id', 'motion_label', 'parent_id', 'muscle_targets', ...(motionPathsIdx >= 0 ? ['motionPaths'] : []), ...otherTables];
      const rows = data.map(row =>
        headers.map(h => {
          const val = row[h];
          if (val == null) return '';
          if (typeof val === 'object') return escapeCsv(JSON.stringify(val));
          return escapeCsv(String(val));
        }).join(',')
      );
      const csv = [headers.join(','), ...rows].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'motion-delta-matrix.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${data.length} motions as CSV`);
    } catch (err) {
      console.error('Failed to download CSV:', err);
      toast.error('Failed to download CSV');
    }
  }, [buildExportData]);

  // ─── Import ───
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ updated: number; errors: string[] } | null>(null);

  const handleImport = useCallback(async () => {
    if (!importText.trim()) { toast.error('Paste data first'); return; }

    setImporting(true);
    setImportResult(null);

    try {
      // Parse TSV
      const lines = importText.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast.error('Need at least a header row and one data row'); setImporting(false); return; }

      const delimiter = lines[0].includes('\t') ? '\t' : ',';
      const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
      const motionIdIdx = headers.indexOf('motion_id');
      if (motionIdIdx === -1) { toast.error('Missing "motion_id" column'); setImporting(false); return; }

      // Map header indices to table keys
      const tableColMap: { headerIdx: number; tableKey: string }[] = [];
      headers.forEach((h, idx) => {
        if (DELTA_TABLE_KEYS.includes(h)) {
          tableColMap.push({ headerIdx: idx, tableKey: h });
        }
      });

      if (tableColMap.length === 0) { toast.error('No table columns found (expected column names like motionPaths, grips, etc.)'); setImporting(false); return; }

      // Parse each TSV cell, handling quoted JSON
      const parseTsvRow = (line: string): string[] => {
        const cells: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (inQuotes) {
            if (ch === '"') {
              if (line[i + 1] === '"') { current += '"'; i++; }
              else inQuotes = false;
            } else { current += ch; }
          } else {
            if (ch === '"') { inQuotes = true; }
            else if (ch === delimiter) { cells.push(current.trim()); current = ''; }
            else { current += ch; }
          }
        }
        cells.push(current.trim());
        return cells;
      };

      // Build a map of changes: tableKey -> rowId -> motionId -> value
      const changeMap: Record<string, Record<string, Record<string, Record<string, number> | "inherit">>> = {};

      const errors: string[] = [];

      for (let lineIdx = 1; lineIdx < lines.length; lineIdx++) {
        const cells = parseTsvRow(lines[lineIdx]);
        const motionId = cells[motionIdIdx]?.trim();
        if (!motionId) continue;

        for (const { headerIdx, tableKey } of tableColMap) {
          const cellVal = cells[headerIdx]?.trim();
          if (!cellVal || cellVal === '' || cellVal === 'null') continue;

          let parsed: Record<string, Record<string, number> | "inherit">;
          try {
            parsed = JSON.parse(cellVal);
            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) continue;
          } catch {
            errors.push(`Row ${lineIdx + 1}, ${tableKey}: invalid JSON`);
            continue;
          }

          // parsed is { rowId: deltaValue, ... }
          for (const [rowId, deltaVal] of Object.entries(parsed)) {
            if (!changeMap[tableKey]) changeMap[tableKey] = {};
            if (!changeMap[tableKey][rowId]) changeMap[tableKey][rowId] = {};

            if (deltaVal === "inherit") {
              changeMap[tableKey][rowId][motionId] = "inherit";
            } else if (deltaVal && typeof deltaVal === 'object' && !Array.isArray(deltaVal)) {
              const flat: Record<string, number> = {};
              for (const [k, v] of Object.entries(deltaVal)) {
                if (typeof v === 'number') flat[k] = v;
              }
              changeMap[tableKey][rowId][motionId] = flat;
            } else {
              changeMap[tableKey][rowId][motionId] = {};
            }
          }

        }
      }

      // Apply changes to each table row
      let updatedRows = 0;

      for (const [tableKey, rowChanges] of Object.entries(changeMap)) {
        for (const [rowId, motionDeltas] of Object.entries(rowChanges)) {
          const tableRows = tableData[tableKey] || [];
          const row = tableRows.find(r => String(r.id) === rowId);

          if (!row) {
            errors.push(`${tableKey}: row "${rowId}" not found, skipped`);
            continue;
          }

          const currentDr = (row.delta_rules && typeof row.delta_rules === 'object' && !Array.isArray(row.delta_rules))
            ? { ...(row.delta_rules as Record<string, unknown>) }
            : {};

          // Merge motion deltas into the row's delta_rules
          for (const [motionId, deltaVal] of Object.entries(motionDeltas)) {
            currentDr[motionId] = deltaVal;
          }

          try {
            await api.updateRow(tableKey, rowId, { delta_rules: currentDr });
            updatedRows++;
          } catch (err) {
            errors.push(`${tableKey} "${rowId}": save failed - ${err}`);
          }
        }
      }

      await loadData();
      onDataChange();
      setImportResult({ updated: updatedRows, errors });
      toast.success(`Import complete: ${updatedRows} rows updated across ${Object.keys(changeMap).length} tables`);
    } catch (err) {
      console.error('Import failed:', err);
      toast.error(`Import failed: ${err}`);
    } finally {
      setImporting(false);
    }
  }, [importText, tableData, loadData, onDataChange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-500 text-lg">Loading Motion Delta Matrix...</div>
      </div>
    );
  }

  const relationships = selectedMotion ? getRelationshipsForMotion(selectedMotion) : {};

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {cellTooltip && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-[9999] pointer-events-auto"
          style={{ left: cellTooltip.left, top: cellTooltip.top }}
          onMouseEnter={clearCellTooltipHideTimeout}
          onMouseLeave={scheduleCellTooltipHide}
        >
          <MatrixCellTooltipContent
            motionLabel={motions.find(m => m.id === cellTooltip.motionId)?.label ?? cellTooltip.motionId}
            tableLabel={getTableLabel(cellTooltip.tableKey)}
            rels={getRelationshipsForMotion(cellTooltip.motionId)[cellTooltip.tableKey] ?? []}
            muscles={muscles}
          />
        </div>,
        document.body
      )}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Motion Delta Matrix</h1>
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => setActiveTab('delta_rules')}
              className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
                activeTab === 'delta_rules'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Delta Rules
            </button>
            <button
              onClick={() => setActiveTab('v2_config')}
              className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
                activeTab === 'v2_config'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Matrix V2 Config
            </button>
          </div>
        </div>
        {activeTab === 'delta_rules' && <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCsv}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium flex items-center gap-2"
            title="Download matrix as CSV"
          >
            <svg className="w-5 h-5 text-green-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 3h18v18H3z" />
              <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
            </svg>
            Download CSV
          </button>
          <button
            onClick={handleCopyMatrix}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium flex items-center gap-2"
            title="Copy matrix to clipboard (TSV format)"
          >
            <span>📋</span>
            Copy Matrix
          </button>
          <button
            onClick={() => { setShowImportModal(true); setImportText(''); setImportResult(null); }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium flex items-center gap-2"
            title="Import delta rules from pasted data"
          >
            <span>📥</span>
            Import
          </button>
        </div>}
      </div>

      {activeTab === 'v2_config' ? (
        <div className="flex-1 overflow-hidden">
          <MatrixV2ConfigPanel motions={motions} />
        </div>
      ) : (
      <div className="flex-1 flex overflow-hidden">
        {/* Matrix table */}
        <div className={`flex-1 overflow-auto transition-all ${selectedMotion ? '' : ''}`}>
          <div className="p-4">
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    {/* Group header row */}
                    <tr>
                      <th className="sticky left-0 z-30 bg-gray-50 border-r border-gray-200"></th>
                      {getGroupedTableHeaders().map(({ group, count }, idx) => (
                        <th
                          key={`group-${idx}`}
                          colSpan={count}
                          className="px-2 py-1 text-center text-[10px] font-semibold text-gray-600 uppercase border-r border-gray-200 last:border-r-0 bg-gray-100"
                        >
                          {group}
                        </th>
                      ))}
                    </tr>
                    {/* Column header row */}
                    <tr>
                      <th className="sticky left-0 z-20 bg-gray-50 px-2 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase border-r border-gray-200 min-w-[200px]">
                        Motion
                      </th>
                      {DELTA_TABLES.map(t => (
                        <th key={t.key} className="px-2 py-1.5 text-center text-xs font-semibold text-gray-700 uppercase border-r border-gray-200 last:border-r-0 min-w-[100px]">
                          {t.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {groupedMotions.map((motion, idx) => {
                      if ((motion as any)._isSectionHeader) {
                        return (
                          <tr key={`header-${idx}`} className="bg-gray-100">
                            <td colSpan={DELTA_TABLES.length + 1} className="px-2 py-1 font-semibold text-gray-900 text-xs" style={{ pointerEvents: 'none' }}>
                              {(motion as any)._sectionLabel}
                            </td>
                          </tr>
                        );
                      }

                      const motionId = motion.id;
                      const groupLevel = (motion as any)._groupLevel || 0;
                      const isSelected = selectedMotion === motionId;

                      return (
                        <tr
                          key={motionId}
                          className={`hover:bg-blue-50 cursor-pointer ${isSelected ? 'bg-blue-100' : ''}`}
                          onClick={() => { setSelectedMotion(motionId); setExpandedCards(new Set()); }}
                        >
                          <td
                            className={`sticky left-0 z-10 px-2 py-1 border-r border-gray-200 ${isSelected ? 'bg-blue-100' : 'bg-white'}`}
                            style={{ paddingLeft: `${groupLevel * 20 + 8}px` }}
                          >
                            <span className="font-medium text-gray-900 text-xs">{motion.label}</span>
                          </td>
                          {DELTA_TABLE_KEYS.map(tableKey => {
                            const counts = countRelationships(motionId, tableKey);
                            return (
                              <td
                                key={tableKey}
                                className="px-2 py-1 text-center border-r border-gray-200 last:border-r-0 cursor-help"
                                onMouseEnter={(e) => {
                                  clearCellTooltipHideTimeout();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setCellTooltip({ motionId, tableKey, left: rect.left, top: rect.bottom + 4 });
                                }}
                                onMouseLeave={scheduleCellTooltipHide}
                              >
                                {counts.total === 0 ? (
                                  <span className="text-gray-300">—</span>
                                ) : (
                                  <div className="flex items-center justify-center gap-1">
                                    {counts.configured > 0 && (
                                      <span className="text-xs font-medium text-blue-600">{counts.configured}</span>
                                    )}
                                    {counts.inherit > 0 && (
                                      <span className="text-xs italic text-green-600">
                                        {counts.configured > 0 ? `+${counts.inherit}i` : `${counts.inherit}i`}
                                      </span>
                                    )}
                                    {counts.empty > 0 && (
                                      <span className="text-xs text-red-400">
                                        {(counts.configured > 0 || counts.inherit > 0) ? `+${counts.empty}!` : `${counts.empty}!`}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Side panel */}
        {selectedMotion && selectedMotionData && (
          <div className="w-[420px] flex-shrink-0 bg-white border-l border-gray-200 overflow-y-auto">
            <div className="p-2 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">{selectedMotionData.label}</h2>
                  <p className="text-[10px] text-gray-500 mt-0.5">{selectedMotion}</p>
                </div>
                <button onClick={() => setSelectedMotion(null)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
              </div>
            </div>

            <div className="p-2 space-y-2">
              {DELTA_TABLE_KEYS.map(tableKey => {
                const tableRelationships = relationships[tableKey] || [];
                const tableRows = tableData[tableKey] || [];
                const rowsWithMotion = new Set(tableRelationships.map(r => r.rowId));
                const availableRows = tableRows.filter(r => !rowsWithMotion.has(String(r.id)));
                const isTableExpanded = expandedTables.has(tableKey);
                const isMotionPaths = tableKey === 'motionPaths';

                return (
                  <div key={tableKey} className="border border-gray-200 rounded overflow-hidden">
                    <div 
                      className="bg-gray-50 px-2 py-1 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleTable(tableKey)}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-400">{isTableExpanded ? '▼' : '▶'}</span>
                        <h3 className="text-[10px] font-semibold text-gray-700 uppercase">{getTableLabel(tableKey)}</h3>
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {tableRelationships.length} rule{tableRelationships.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {isTableExpanded && (
                      <>
                        <div className="divide-y divide-gray-100">
                          {tableRelationships.length === 0 && (
                            <div className="px-2 py-1 text-[10px] text-gray-400 italic">No rules for this motion</div>
                          )}

                          {tableRelationships.map(rel => {
                        const cardKey = `${tableKey}::${rel.rowId}`;
                        const isExpanded = expandedCards.has(cardKey);
                        const isInherit = rel.motionValue === "inherit";
                        const deltaObj = isInherit ? {} : rel.motionValue;
                        const deltaCount = Object.keys(deltaObj).length;
                        const hasNoDelta = !isInherit && deltaCount === 0;

                        return (
                          <div key={cardKey} className={`${hasNoDelta ? 'bg-red-50' : ''}`}>
                            <div className="px-2 py-1 flex items-center gap-1.5">
                              <button
                                onClick={() => toggleCard(cardKey)}
                                className="text-gray-400 hover:text-gray-600 text-[10px] flex-shrink-0"
                              >
                                {isExpanded ? '▼' : '▶'}
                              </button>
                              <span className={`text-xs font-medium flex-1 ${hasNoDelta ? 'text-red-700' : 'text-gray-900'}`}>
                                {rel.rowLabel}
                              </span>
                              <label className="flex items-center gap-1 cursor-pointer flex-shrink-0">
                                <input
                                  type="checkbox"
                                  checked={isInherit}
                                  onChange={() => saveDelta(tableKey, rel.rowId, selectedMotion!, isInherit ? {} : "inherit")}
                                  className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-[9px] text-gray-500">Inherit</span>
                              </label>
                              {isInherit ? (
                                <span className="text-[10px] text-green-600 italic flex-shrink-0">inherited</span>
                              ) : deltaCount > 0 ? (
                                <span className="text-[10px] text-blue-600 font-medium flex-shrink-0">{deltaCount} muscles</span>
                              ) : (
                                <span className="text-[10px] text-red-500 flex-shrink-0">empty</span>
                              )}
                              <button
                                onClick={() => removeDelta(tableKey, rel.rowId, selectedMotion!)}
                                className="text-red-300 hover:text-red-500 text-xs flex-shrink-0 ml-0.5"
                                title="Remove this motion from this row's delta_rules"
                              >
                                ×
                              </button>
                            </div>

                            {isExpanded && !isInherit && (
                              <div className="px-2 pb-2 pt-0.5">
                                <InlineDeltaEditor
                                  delta={deltaObj}
                                  allMuscles={muscles}
                                  onSave={(newDelta) => saveDelta(tableKey, rel.rowId, selectedMotion!, newDelta)}
                                />
                              </div>
                            )}

                            {isExpanded && isInherit && (
                              <div className="px-2 pb-2 pt-0.5 text-[10px] text-gray-500 italic">
                                This motion inherits delta rules from its parent on this row.
                              </div>
                            )}
                          </div>
                          );
                        })}
                        </div>

                        {/* Add Rule dropdown */}
                        {availableRows.length > 0 && (
                          <div className="border-t border-gray-100 px-2 py-1">
                            <select
                              onChange={e => { if (e.target.value) addDelta(tableKey, e.target.value, selectedMotion!); e.target.value = ''; }}
                              className="w-full text-[10px] border border-gray-300 rounded px-1.5 py-1 text-gray-600 bg-white"
                              defaultValue=""
                            >
                              <option value="">+ Add rule...</option>
                              {availableRows.map(r => (
                                <option key={String(r.id)} value={String(r.id)}>
                                  {String(r.label ?? r.id)}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Motion paths in this family section (only for motionPaths table) */}
                        {isMotionPaths && allFamilyPlaneInfo.length > 0 && (
                          <div className="border-t border-amber-200 bg-amber-50/30">
                            <div
                              className="px-2 py-1 flex items-center gap-1 cursor-pointer hover:bg-amber-100/50"
                              onClick={() => setFamilyPlanesExpanded(prev => !prev)}
                            >
                              <span className="text-[10px] text-gray-400">{familyPlanesExpanded ? '▼' : '▶'}</span>
                              <span className="text-[10px] font-semibold text-gray-700">Motion paths in this family</span>
                              <span className="text-[10px] text-gray-400 ml-auto">{allFamilyPlaneInfo.length}</span>
                            </div>
                            {familyPlanesExpanded && (
                              <div className="px-2 pb-2 pt-1 space-y-1">
                                {allFamilyPlaneInfo.map(info => {
                                  const isAssigned = info.assignedToMotionId !== null;
                                  const assignableMotions = familyMotions.filter(m => m.id !== info.assignedToMotionId);

                                  return (
                                    <div key={info.planeId} className="flex items-center gap-1.5 text-[10px]">
                                      <span className={isAssigned ? 'text-gray-900 font-medium' : 'text-gray-500 italic'}>
                                        {info.planeLabel}
                                      </span>
                                      {isAssigned ? (
                                        <>
                                          <span className="text-gray-400">→</span>
                                          <span className="text-gray-600">{info.assignedToMotionLabel}</span>
                                        </>
                                      ) : (
                                        <span className="text-gray-400 italic">Unassigned</span>
                                      )}
                                      {assignableMotions.length > 0 && (
                                        <select
                                          onChange={e => {
                                            if (e.target.value) {
                                              reassignPlane(info.planeId, info.assignedToMotionId, e.target.value);
                                              e.target.value = '';
                                            }
                                          }}
                                          className="ml-auto text-[9px] border border-gray-300 rounded px-1 py-0.5 text-gray-600 bg-white flex-shrink-0"
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
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-[700px] max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Import Delta Rules</h2>
                <p className="text-xs text-gray-500 mt-1">Paste TSV data (e.g., copied from this matrix or a spreadsheet)</p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected format</label>
                <p className="text-xs text-gray-500 mb-2">
                  Tab-separated with columns: <code className="bg-gray-100 px-1 rounded">motion_id</code>, <code className="bg-gray-100 px-1 rounded">motion_label</code> (optional), and one or more table columns
                  (<code className="bg-gray-100 px-1 rounded">motionPaths</code>, <code className="bg-gray-100 px-1 rounded">grips</code>, etc.).
                  Each table cell is a JSON object mapping row IDs to delta values:
                </p>
                <pre className="text-[10px] bg-gray-50 border border-gray-200 rounded p-2 overflow-x-auto text-gray-600">
{`motion_id\tmotionPaths\tgrips
CURL\t{"MID_MID":{"BICEPS":5},"HIGH_HIGH":"inherit"}\t{"PRONATED":{"BICEPS":-2}}`}
                </pre>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paste data</label>
                <textarea
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  className="w-full h-48 text-xs font-mono border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Paste TSV data here..."
                />
              </div>

              {importResult && (
                <div className={`p-3 rounded-lg text-sm ${importResult.errors.length > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                  <div className="font-medium">{importResult.updated} rows updated</div>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="text-xs font-medium text-yellow-700">{importResult.errors.length} errors:</div>
                      <div className="max-h-32 overflow-y-auto">
                        {importResult.errors.map((err, i) => (
                          <div key={i} className="text-xs text-yellow-600">{err}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              >
                {importResult ? 'Close' : 'Cancel'}
              </button>
              <button
                onClick={handleImport}
                disabled={importing || !importText.trim()}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {importing ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Importing...
                  </>
                ) : (
                  'Import & Merge'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
