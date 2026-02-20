import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';

interface MuscleHierarchyFieldProps {
  tableKey: 'muscles';
  currentRecordId: string;
  onFieldsChange: (fields: Record<string, string[]>) => void;
}

interface MuscleRecord {
  id: string;
  label: string;
  parent_ids?: string[];
  [key: string]: unknown;
}

type MuscleTier = 'primary' | 'secondary' | 'tertiary';

function parseParentIds(record: MuscleRecord): string[] {
  if (Array.isArray(record.parent_ids)) return record.parent_ids;
  if (typeof record.parent_ids === 'string') {
    try { return JSON.parse(record.parent_ids); } catch { return []; }
  }
  return [];
}

function classifyMuscle(record: MuscleRecord, allMuscles: MuscleRecord[]): MuscleTier {
  const pids = parseParentIds(record);
  if (pids.length === 0) return 'primary';
  const anyParentIsPrimary = pids.some(pid => {
    const parent = allMuscles.find(m => m.id === pid);
    return parent && parseParentIds(parent).length === 0;
  });
  if (anyParentIsPrimary) return 'secondary';
  return 'tertiary';
}

export default function MuscleHierarchyField({ tableKey, currentRecordId, onFieldsChange }: MuscleHierarchyFieldProps) {
  const [allMuscles, setAllMuscles] = useState<MuscleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const loadAllData = useCallback(async () => {
    try {
      const data = await api.getTable('muscles');
      setAllMuscles((data as MuscleRecord[]) || []);
    } catch (err) {
      console.error('Failed to load muscle data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAllData(); }, [loadAllData]);

  const toggleExpand = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const { primaries, secondaries, tertiaries } = useMemo(() => {
    const p: MuscleRecord[] = [];
    const s: MuscleRecord[] = [];
    const t: MuscleRecord[] = [];
    for (const m of allMuscles) {
      const tier = classifyMuscle(m, allMuscles);
      if (tier === 'primary') p.push(m);
      else if (tier === 'secondary') s.push(m);
      else t.push(m);
    }
    return { primaries: p, secondaries: s, tertiaries: t };
  }, [allMuscles]);

  const currentRecord = useMemo(() => allMuscles.find(m => m.id === currentRecordId), [allMuscles, currentRecordId]);
  const currentTier = useMemo(() => currentRecord ? classifyMuscle(currentRecord, allMuscles) : 'primary', [currentRecord, allMuscles]);

  // After any mutation, update the current record's parent_ids via the callback
  const notifyFieldsChange = useCallback((updatedMuscles: MuscleRecord[]) => {
    const current = updatedMuscles.find(r => r.id === currentRecordId);
    if (current) {
      onFieldsChange({ parent_ids: parseParentIds(current) });
    }
  }, [currentRecordId, onFieldsChange]);

  // Link: add parentId to child's parent_ids
  const linkParent = useCallback(async (childId: string, parentId: string) => {
    const child = allMuscles.find(m => m.id === childId);
    if (!child) return;
    const currentParents = parseParentIds(child);
    if (currentParents.includes(parentId)) return;
    const newParentIds = [...currentParents, parentId];
    try {
      await api.updateRow('muscles', childId, { parent_ids: newParentIds });
      const updated = allMuscles.map(m => m.id === childId ? { ...m, parent_ids: newParentIds } : m);
      setAllMuscles(updated);
      notifyFieldsChange(updated);
    } catch (err) {
      console.error('Failed to link parent:', err);
    }
  }, [allMuscles, notifyFieldsChange]);

  // Unlink: remove parentId from child's parent_ids
  const unlinkParent = useCallback(async (childId: string, parentId: string) => {
    const child = allMuscles.find(m => m.id === childId);
    if (!child) return;
    const newParentIds = parseParentIds(child).filter(id => id !== parentId);
    try {
      await api.updateRow('muscles', childId, { parent_ids: newParentIds });
      const updated = allMuscles.map(m => m.id === childId ? { ...m, parent_ids: newParentIds } : m);
      setAllMuscles(updated);
      notifyFieldsChange(updated);
    } catch (err) {
      console.error('Failed to unlink parent:', err);
    }
  }, [allMuscles, notifyFieldsChange]);

  // Create a new child muscle under a given parent
  const createChild = useCallback(async (parentId: string, newData: Record<string, unknown>) => {
    try {
      await api.addRow('muscles', { ...newData, parent_ids: [parentId] });
      const data = await api.getTable('muscles');
      const updated = (data as MuscleRecord[]) || [];
      setAllMuscles(updated);
      notifyFieldsChange(updated);
    } catch (err) {
      console.error('Failed to create child muscle:', err);
      alert('Failed to create child muscle. Please try again.');
    }
  }, [notifyFieldsChange]);

  // Build hierarchy items for display
  const hierarchyItems = useMemo(() => {
    if (loading || !currentRecord) return [];

    if (currentTier === 'primary') {
      // Show children (secondaries) with their tertiaries
      const children = secondaries.filter(s => parseParentIds(s).includes(currentRecordId));
      return children.map(sec => ({
        type: 'primary-view' as const,
        secondary: sec,
        tertiaries: tertiaries.filter(t => parseParentIds(t).includes(sec.id)),
      }));
    }

    if (currentTier === 'secondary') {
      // Show parents (primaries) with current secondary and its tertiaries
      const parentIds = parseParentIds(currentRecord);
      const myTertiaries = tertiaries.filter(t => parseParentIds(t).includes(currentRecordId));
      return parentIds.map(pid => {
        const primary = primaries.find(p => p.id === pid);
        if (!primary) return null;
        return {
          type: 'secondary-view' as const,
          primary,
          secondary: currentRecord,
          tertiaries: myTertiaries,
        };
      }).filter((x): x is NonNullable<typeof x> => x !== null);
    }

    // Tertiary: show parent chain
    const parentIds = parseParentIds(currentRecord);
    return parentIds.map(sid => {
      const sec = secondaries.find(s => s.id === sid);
      if (!sec) return null;
      const secParents = parseParentIds(sec);
      const pris = secParents.map(pid => primaries.find(p => p.id === pid)).filter(Boolean) as MuscleRecord[];
      return {
        type: 'tertiary-view' as const,
        secondary: sec,
        primaries: pris,
        tertiary: currentRecord,
      };
    }).filter((x): x is NonNullable<typeof x> => x !== null);
  }, [currentTier, currentRecord, currentRecordId, primaries, secondaries, tertiaries, loading]);

  // Available items for "Add" dropdowns
  const availableAddOptions = useMemo(() => {
    if (!currentRecord) return [];

    if (currentTier === 'primary') {
      const linkedChildIds = secondaries.filter(s => parseParentIds(s).includes(currentRecordId)).map(s => s.id);
      return secondaries.filter(s => !linkedChildIds.includes(s.id));
    }
    if (currentTier === 'secondary') {
      const linkedParentIds = parseParentIds(currentRecord);
      return primaries.filter(p => !linkedParentIds.includes(p.id));
    }
    // Tertiary: can add secondary parents
    const linkedParentIds = parseParentIds(currentRecord);
    return secondaries.filter(s => !linkedParentIds.includes(s.id));
  }, [currentTier, currentRecord, currentRecordId, primaries, secondaries]);

  if (loading) {
    return <div className="text-xs text-gray-400 py-2">Loading muscle data...</div>;
  }

  return (
    <div className="space-y-3">
      {/* Primary: list of secondaries with nested tertiaries */}
      {currentTier === 'primary' && hierarchyItems.map((item) => {
        if (item.type !== 'primary-view') return null;
        const { secondary, tertiaries: terts } = item;
        const key = `sec-${secondary.id}`;
        const isExp = expanded.has(key);
        return (
          <div key={secondary.id} className="bg-white border rounded-lg">
            <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <button type="button" onClick={() => toggleExpand(key)} className="text-xs text-gray-500 w-4 flex-shrink-0 hover:text-gray-700">
                  {isExp ? '▼' : '▶'}
                </button>
                <Link to="/table/muscles" className="text-sm font-medium text-blue-600 hover:underline">{secondary.label}</Link>
                <span className="text-xs text-gray-400">{secondary.id}</span>
                {terts.length > 0 && <span className="text-xs text-gray-400 ml-auto">({terts.length} tertiary)</span>}
              </div>
              <button type="button" onClick={() => unlinkParent(secondary.id, currentRecordId)}
                className="text-xs text-red-600 hover:text-red-800 px-2 py-1 hover:bg-red-50 rounded ml-2">Remove</button>
            </div>
            {isExp && (
              <div className="border-t bg-gray-50">
                {terts.map(t => (
                  <div key={t.id} className="px-3 py-1.5 pl-8">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">•</span>
                      <Link to="/table/muscles" className="text-sm text-blue-600 hover:underline">{t.label}</Link>
                      <span className="text-xs text-gray-400">{t.id}</span>
                    </div>
                  </div>
                ))}
                <ChildMuscleAdder
                  currentParentId={secondary.id}
                  existingChildIds={terts.map(t => t.id)}
                  allChildMuscles={tertiaries}
                  onAdd={(childId) => linkParent(childId, secondary.id)}
                  onCreate={(data) => createChild(secondary.id, data)}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Secondary: list of primaries with current secondary and nested tertiaries */}
      {currentTier === 'secondary' && hierarchyItems.map((item) => {
        if (item.type !== 'secondary-view') return null;
        const { primary, secondary, tertiaries: terts } = item;
        const key = `sec-${secondary.id}-pri-${primary.id}`;
        const isExp = expanded.has(key);
        return (
          <div key={primary.id} className="bg-white border rounded-lg">
            <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <button type="button" onClick={() => toggleExpand(key)} className="text-xs text-gray-500 w-4 flex-shrink-0 hover:text-gray-700">
                  {isExp ? '▼' : '▶'}
                </button>
                <Link to="/table/muscles" className="text-sm font-medium text-blue-600 hover:underline">{primary.label}</Link>
                <span className="text-xs text-gray-400">{primary.id}</span>
                <span className="text-xs text-gray-400">→</span>
                <span className="text-sm font-medium text-gray-700">{secondary.label}</span>
                <span className="text-xs text-gray-400">{secondary.id}</span>
                {terts.length > 0 && <span className="text-xs text-gray-400 ml-auto">({terts.length} tertiary)</span>}
              </div>
              <button type="button" onClick={() => unlinkParent(currentRecordId, primary.id)}
                className="text-xs text-red-600 hover:text-red-800 px-2 py-1 hover:bg-red-50 rounded ml-2">Remove</button>
            </div>
            {isExp && (
              <div className="border-t bg-gray-50">
                {terts.map(t => (
                  <div key={t.id} className="px-3 py-1.5 pl-8">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">•</span>
                      <Link to="/table/muscles" className="text-sm text-blue-600 hover:underline">{t.label}</Link>
                      <span className="text-xs text-gray-400">{t.id}</span>
                    </div>
                  </div>
                ))}
                <ChildMuscleAdder
                  currentParentId={secondary.id}
                  existingChildIds={terts.map(t => t.id)}
                  allChildMuscles={tertiaries}
                  onAdd={(childId) => linkParent(childId, secondary.id)}
                  onCreate={(data) => createChild(secondary.id, data)}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Tertiary: list of secondary parents with their primaries */}
      {currentTier === 'tertiary' && hierarchyItems.map((item) => {
        if (item.type !== 'tertiary-view') return null;
        const { secondary, primaries: pris, tertiary } = item;
        return (
          <div key={secondary.id} className="bg-white border rounded-lg">
            <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 flex-wrap">
                {pris.length > 0 ? (
                  pris.map((p, i) => (
                    <React.Fragment key={p.id}>
                      {i > 0 && <span className="text-xs text-gray-400">,</span>}
                      <Link to="/table/muscles" className="text-sm font-medium text-blue-600 hover:underline">{p.label}</Link>
                    </React.Fragment>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 italic">No primary</span>
                )}
                <span className="text-xs text-gray-400">→</span>
                <Link to="/table/muscles" className="text-sm font-medium text-blue-600 hover:underline">{secondary.label}</Link>
                <span className="text-xs text-gray-400">→</span>
                <span className="text-sm font-medium text-gray-700">{tertiary.label}</span>
                <span className="text-xs text-gray-400">{tertiary.id}</span>
              </div>
              <button type="button" onClick={() => unlinkParent(currentRecordId, secondary.id)}
                className="text-xs text-red-600 hover:text-red-800 px-2 py-1 hover:bg-red-50 rounded ml-2">Remove</button>
            </div>
          </div>
        );
      })}

      {/* Add dropdown */}
      {availableAddOptions.length > 0 && (
        <div>
          <select
            value=""
            onChange={async (e) => {
              if (!e.target.value) return;
              const selectedId = e.target.value;
              if (currentTier === 'primary') {
                await linkParent(selectedId, currentRecordId);
              } else if (currentTier === 'secondary') {
                await linkParent(currentRecordId, selectedId);
              } else {
                await linkParent(currentRecordId, selectedId);
              }
            }}
            className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">
              {currentTier === 'primary' ? 'Add Child Muscle...'
                : currentTier === 'secondary' ? 'Add Parent Muscle...'
                : 'Add Parent Muscle...'}
            </option>
            {availableAddOptions.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.label} ({opt.id})</option>
            ))}
          </select>
        </div>
      )}

      {hierarchyItems.length === 0 && (
        <div className="text-xs text-gray-400 py-2 italic">
          No muscles linked. Use the dropdown above to add one.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChildMuscleAdder sub-component (replaces TertiaryMuscleAdder)
// ---------------------------------------------------------------------------

interface ChildMuscleAdderProps {
  currentParentId: string;
  existingChildIds: string[];
  allChildMuscles: MuscleRecord[];
  onAdd: (childId: string) => Promise<void>;
  onCreate: (data: Record<string, unknown>) => Promise<void>;
}

function ChildMuscleAdder({ currentParentId, existingChildIds, allChildMuscles, onAdd, onCreate }: ChildMuscleAdderProps) {
  const [selectedChildId, setSelectedChildId] = useState('');
  const [adding, setAdding] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newChild, setNewChild] = useState({ id: '', label: '', technical_name: '', short_description: '' });
  const [creating, setCreating] = useState(false);

  const availableChildren = useMemo(() => {
    return allChildMuscles.filter(t => !existingChildIds.includes(t.id));
  }, [allChildMuscles, existingChildIds]);

  const handleAdd = async () => {
    if (!selectedChildId) return;
    setAdding(true);
    try {
      await onAdd(selectedChildId);
      setSelectedChildId('');
    } catch (err) {
      console.error('Failed to add child:', err);
      alert('Failed to add child muscle.');
    } finally {
      setAdding(false);
    }
  };

  const handleCreate = async () => {
    if (!newChild.id || !newChild.label) {
      alert('ID and Label are required.');
      return;
    }
    setCreating(true);
    try {
      await onCreate({
        id: newChild.id,
        label: newChild.label,
        technical_name: newChild.technical_name,
        common_names: [],
        icon: '',
        short_description: newChild.short_description,
        sort_order: 0,
        is_active: true,
      });
      setNewChild({ id: '', label: '', technical_name: '', short_description: '' });
      setShowCreateForm(false);
    } catch (err) {
      console.error('Failed to create child:', err);
      alert('Failed to create child muscle.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="px-3 py-2 pl-8 border-t bg-white">
      {!showCreateForm ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">+</span>
          <select
            value={selectedChildId}
            onChange={e => setSelectedChildId(e.target.value)}
            disabled={adding}
            className="flex-1 px-2 py-1 border rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
          >
            <option value="">Add Child Muscle...</option>
            {availableChildren.map(t => (
              <option key={t.id} value={t.id}>{t.label} ({t.id})</option>
            ))}
          </select>
          <button type="button" onClick={handleAdd} disabled={!selectedChildId || adding}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {adding ? 'Adding...' : 'Add'}
          </button>
          <button type="button" onClick={() => setShowCreateForm(true)}
            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Create</button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">New:</span>
            <input type="text" placeholder="ID (required)" value={newChild.id}
              onChange={e => setNewChild({ ...newChild, id: e.target.value })}
              className="flex-1 px-2 py-1 border rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            <input type="text" placeholder="Label (required)" value={newChild.label}
              onChange={e => setNewChild({ ...newChild, label: e.target.value })}
              className="flex-1 px-2 py-1 border rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <input type="text" placeholder="Technical Name (optional)" value={newChild.technical_name}
              onChange={e => setNewChild({ ...newChild, technical_name: e.target.value })}
              className="flex-1 px-2 py-1 border rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            <input type="text" placeholder="Short Description (optional)" value={newChild.short_description}
              onChange={e => setNewChild({ ...newChild, short_description: e.target.value })}
              className="flex-1 px-2 py-1 border rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleCreate} disabled={!newChild.id || !newChild.label || creating}
              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button type="button" onClick={() => { setShowCreateForm(false); setNewChild({ id: '', label: '', technical_name: '', short_description: '' }); }}
              className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
