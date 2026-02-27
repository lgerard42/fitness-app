import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../api';
import { sp } from '../../styles/sidePanelStyles';

interface MuscleHierarchyFieldProps {
  tableKey: 'muscles';
  currentRecordId: string;
  onFieldsChange: (fields: Record<string, string[]>) => void;
  onOpenRow?: (row: Record<string, unknown>) => void;
}

interface MuscleRecord {
  id: string;
  label: string;
  parent_ids?: string[];
  [key: string]: unknown;
}

type MuscleTier = 'primary' | 'secondary' | 'tertiary';

function parseParentIds(record: MuscleRecord): string[] {
  const raw = record.parent_ids;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
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

export default function MuscleHierarchyField({ tableKey, currentRecordId, onFieldsChange, onOpenRow }: MuscleHierarchyFieldProps) {
  const [allMuscles, setAllMuscles] = useState<MuscleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const loadAllData = useCallback(async () => {
    try {
      const data = await api.getTable('muscles');
      const muscles = Array.isArray(data) ? (data as MuscleRecord[]) : [];
      setAllMuscles(muscles);
    } catch (err) {
      console.error('Failed to load muscle data:', err);
      setAllMuscles([]);
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

  const handleOpenMuscle = useCallback((e: React.MouseEvent, muscleId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onOpenRow) {
      console.warn('onOpenRow callback not provided');
      return;
    }
    const muscle = allMuscles.find(m => m.id === muscleId);
    if (muscle) {
      try {
        onOpenRow(muscle);
      } catch (error) {
        console.error('Error opening muscle:', error);
      }
    } else {
      console.warn(`Muscle with id ${muscleId} not found`);
    }
  }, [onOpenRow, allMuscles]);

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

  // Set parent of current record (for primary muscles: make this muscle a child of another)
  const setParentOfCurrent = useCallback(async (parentId: string) => {
    if (!currentRecordId || !parentId) return;
    const newParentIds = [parentId];
    try {
      await api.updateRow('muscles', currentRecordId, { parent_ids: newParentIds });
      const updated = allMuscles.map(m => m.id === currentRecordId ? { ...m, parent_ids: newParentIds } : m);
      setAllMuscles(updated);
      notifyFieldsChange(updated);
    } catch (err) {
      console.error('Failed to set parent:', err);
    }
  }, [currentRecordId, allMuscles, notifyFieldsChange]);

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
    if (!currentRecord || !currentRecordId) return [];

    if (currentTier === 'primary') {
      const linkedChildIds = secondaries.filter(s => parseParentIds(s).includes(currentRecordId)).map(s => s.id);
      return secondaries.filter(s => !linkedChildIds.includes(s.id));
    }
    if (currentTier === 'secondary') {
      const linkedParentIds = parseParentIds(currentRecord);
      return primaries.filter(p => !linkedParentIds.includes(p.id));
    }
    const linkedParentIds = parseParentIds(currentRecord);
    return secondaries.filter(s => !linkedParentIds.includes(s.id));
  }, [currentTier, currentRecord, currentRecordId, primaries, secondaries]);

  // Must be called before any early returns to satisfy React's rules of hooks
  const otherPrimaries = useMemo(() => {
    if (!currentRecord || currentTier !== 'primary') return [];
    return primaries.filter(p => p.id !== currentRecord.id);
  }, [currentRecord, currentTier, primaries]);

  if (loading) {
    return <div className={sp.muscleHierarchy.loading}>Loading muscle data...</div>;
  }

  if (!currentRecordId || currentRecordId.trim() === '') {
    return <div className={sp.muscleHierarchy.loading}>Invalid muscle ID</div>;
  }

  if (!currentRecord) {
    return (
      <div className={sp.muscleHierarchy.container}>
        <div className="text-sm text-red-600 p-4">
          Muscle with ID &quot;{currentRecordId}&quot; not found. It may have been deleted or the data is still loading.
        </div>
      </div>
    );
  }

  return (
    <div className={sp.muscleHierarchy.container}>
      {/* Primary: option to assign this muscle to a parent (make it a child of another muscle) */}
      {currentTier === 'primary' && currentRecord && otherPrimaries.length > 0 && (
        <div className={sp.muscleHierarchy.card}>
          <div className={`${sp.muscleHierarchy.header} ${sp.muscleHierarchy.headerExpanded}`}>
            <span className="text-xs text-gray-600 font-medium">This muscle has no parent. Make it a child of:</span>
            <div className="flex items-center gap-2 flex-1 flex-wrap mt-1">
              <select
                id="set-parent-primary-dropdown"
                className={sp.muscleHierarchy.addDropdown}
                defaultValue=""
                onChange={async (e) => {
                  const parentId = e.target.value;
                  if (parentId) {
                    await setParentOfCurrent(parentId);
                    e.target.value = '';
                  }
                }}
              >
                <option value="">Choose parent muscle...</option>
                {otherPrimaries.map(p => (
                  <option key={p.id} value={p.id}>{p.label} ({p.id})</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Primary: list of secondaries with nested tertiaries */}
      {currentTier === 'primary' && currentRecord && hierarchyItems.map((item) => {
        if (item.type !== 'primary-view') return null;
        const { secondary, tertiaries: terts } = item;
        const key = `sec-${secondary.id}`;
        const isExp = expanded.has(key);
        return (
          <div key={secondary.id} className={sp.muscleHierarchy.card}>
            <div className={`${sp.muscleHierarchy.header} ${isExp ? sp.muscleHierarchy.headerExpanded : ''}`}>
              <div className="flex items-center gap-2 flex-1">
                <button type="button" onClick={() => toggleExpand(key)} className={sp.muscleHierarchy.toggle}>
                  {isExp ? '▼' : '▶'}
                </button>
                <span className={sp.muscleHierarchy.label}>{currentRecord.label}</span>
                <span className={sp.muscleHierarchy.muscleId}>{currentRecord.id}</span>
                <span className={sp.muscleHierarchy.arrow}>→</span>
                <button type="button" onClick={(e) => handleOpenMuscle(e, secondary.id)} className={sp.muscleHierarchy.link}>{secondary.label}</button>
                <span className={sp.muscleHierarchy.muscleId}>{secondary.id}</span>
                {terts.length > 0 && <span className={sp.muscleHierarchy.count}>({terts.length} tertiary)</span>}
              </div>
              <button type="button" onClick={() => unlinkParent(secondary.id, currentRecordId)}
                className={sp.muscleHierarchy.removeBtn}>Remove</button>
            </div>
            {isExp && (
              <div className={sp.muscleHierarchy.expandedContent}>
                {terts.map(t => (
                  <div key={t.id} className={sp.muscleHierarchy.tertiaryItem}>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={(e) => handleOpenMuscle(e, t.id)} className={sp.muscleHierarchy.link}>{t.label}</button>
                      <span className={sp.muscleHierarchy.muscleId}>{t.id}</span>
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
          <div key={primary.id} className={sp.muscleHierarchy.card}>
            <div className={`${sp.muscleHierarchy.header} ${isExp ? sp.muscleHierarchy.headerExpanded : ''}`}>
              <div className="flex items-center gap-2 flex-1">
                <button type="button" onClick={() => toggleExpand(key)} className={sp.muscleHierarchy.toggle}>
                  {isExp ? '▼' : '▶'}
                </button>
                <button type="button" onClick={(e) => handleOpenMuscle(e, primary.id)} className={sp.muscleHierarchy.link}>{primary.label}</button>
                <span className={sp.muscleHierarchy.muscleId}>{primary.id}</span>
                <span className={sp.muscleHierarchy.arrow}>→</span>
                <span className={sp.muscleHierarchy.label}>{secondary.label}</span>
                <span className={sp.muscleHierarchy.muscleId}>{secondary.id}</span>
                {terts.length > 0 && <span className={sp.muscleHierarchy.count}>({terts.length} tertiary)</span>}
              </div>
              <button type="button" onClick={() => unlinkParent(currentRecordId, primary.id)}
                className={sp.muscleHierarchy.removeBtn}>Remove</button>
            </div>
            {isExp && (
              <div className={sp.muscleHierarchy.expandedContent}>
                {terts.map(t => (
                  <div key={t.id} className={sp.muscleHierarchy.tertiaryItem}>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={(e) => handleOpenMuscle(e, t.id)} className={sp.muscleHierarchy.link}>{t.label}</button>
                      <span className={sp.muscleHierarchy.muscleId}>{t.id}</span>
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
          <div key={secondary.id} className={sp.card.list}>
            <div className={sp.header.base}>
              <div className="flex items-center gap-2 flex-1 flex-wrap">
                {pris.length > 0 ? (
                  pris.map((p, i) => (
                    <React.Fragment key={p.id}>
                      {i > 0 && <span className={sp.meta.id}>,</span>}
                      <button type="button" onClick={(e) => handleOpenMuscle(e, p.id)} className={sp.link.small}>{p.label}</button>
                    </React.Fragment>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 italic">No primary</span>
                )}
                <span className={sp.meta.arrow}>→</span>
                <button type="button" onClick={(e) => handleOpenMuscle(e, secondary.id)} className={sp.link.small}>{secondary.label}</button>
                <span className={sp.meta.arrow}>→</span>
                <span className="text-sm font-medium text-gray-700">{tertiary.label}</span>
                <span className={sp.meta.id}>{tertiary.id}</span>
              </div>
              <button type="button" onClick={() => unlinkParent(currentRecordId, secondary.id)}
                className={sp.removeBtn.textMl}>Remove</button>
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
            className={sp.muscleHierarchy.addDropdown}
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
        <div className={sp.muscleHierarchy.emptyState}>
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
    <div className={sp.muscleHierarchy.childAdder}>
      {!showCreateForm ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">+</span>
          <select
            value={selectedChildId}
            onChange={e => setSelectedChildId(e.target.value)}
            disabled={adding}
            className={sp.muscleHierarchy.childAdderDropdown}
          >
            <option value="">Add Child Muscle...</option>
            {availableChildren.map(t => (
              <option key={t.id} value={t.id}>{t.label} ({t.id})</option>
            ))}
          </select>
          <button type="button" onClick={handleAdd} disabled={!selectedChildId || adding}
            className={sp.muscleHierarchy.childAdderButton}>
            {adding ? 'Adding...' : 'Add'}
          </button>
          <button type="button" onClick={() => setShowCreateForm(true)}
            className={sp.muscleHierarchy.childAdderCreateButton}>Create</button>
        </div>
      ) : (
        <div className={sp.muscleHierarchy.childAdderForm}>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">New:</span>
            <input type="text" placeholder="ID (required)" value={newChild.id}
              onChange={e => setNewChild({ ...newChild, id: e.target.value })}
              className={sp.muscleHierarchy.childAdderInput} />
            <input type="text" placeholder="Label (required)" value={newChild.label}
              onChange={e => setNewChild({ ...newChild, label: e.target.value })}
              className={sp.muscleHierarchy.childAdderInput} />
          </div>
          <div className="flex items-center gap-2">
            <input type="text" placeholder="Technical Name (optional)" value={newChild.technical_name}
              onChange={e => setNewChild({ ...newChild, technical_name: e.target.value })}
              className={sp.muscleHierarchy.childAdderInput} />
            <input type="text" placeholder="Short Description (optional)" value={newChild.short_description}
              onChange={e => setNewChild({ ...newChild, short_description: e.target.value })}
              className={sp.muscleHierarchy.childAdderInput} />
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleCreate} disabled={!newChild.id || !newChild.label || creating}
              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button type="button" onClick={() => { setShowCreateForm(false); setNewChild({ id: '', label: '', technical_name: '', short_description: '' }); }}
              className={sp.muscleHierarchy.childAdderCancel}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
