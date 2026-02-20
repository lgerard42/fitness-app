import React, { useEffect, useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { api, type TableSchema } from '../api';

interface FilterMatrixProps {
  schemas: TableSchema[];
  onDataChange: () => void;
}

type MatrixTab = 'GRIPS' | 'GRIP_WIDTHS' | 'SUPPORT_STRUCTURES' | 'TORSO_ANGLES';
type ViewMode = 'equipment' | 'option';
type EquipmentFilter = 'all' | 'equipment' | 'attachments';

const TABS: { key: MatrixTab; label: string; refTable: string; filterFn?: (row: Record<string, unknown>) => boolean }[] = [
  { key: 'GRIPS', label: 'Grips', refTable: 'grips', filterFn: (r) => r.grip_category !== 'Width' && r.parent_id == null },
  { key: 'GRIP_WIDTHS', label: 'Grip Widths', refTable: 'grips', filterFn: (r) => r.grip_category === 'Width' },
  { key: 'SUPPORT_STRUCTURES', label: 'Support Structures', refTable: 'supportStructures' },
  { key: 'TORSO_ANGLES', label: 'Torso Angles', refTable: 'torsoAngles' },
];

function getConstraintArray(row: Record<string, unknown>, key: MatrixTab): string[] | null {
  const mc = row.modifier_constraints;
  let parsed: Record<string, unknown>;
  if (typeof mc === 'string') {
    try { parsed = JSON.parse(mc); } catch { return null; }
  } else if (mc && typeof mc === 'object') {
    parsed = mc as Record<string, unknown>;
  } else {
    return null;
  }
  const val = parsed[key];
  if (val === undefined) return null;
  if (Array.isArray(val)) return val as string[];
  return null;
}

function setConstraintArray(row: Record<string, unknown>, key: MatrixTab, value: string[] | null): Record<string, unknown> {
  let parsed: Record<string, unknown>;
  const mc = row.modifier_constraints;
  if (typeof mc === 'string') {
    try { parsed = JSON.parse(mc); } catch { parsed = {}; }
  } else if (mc && typeof mc === 'object') {
    parsed = { ...(mc as Record<string, unknown>) };
  } else {
    parsed = {};
  }
  if (value === null) {
    delete parsed[key];
  } else {
    parsed[key] = value;
  }
  return { ...row, modifier_constraints: parsed };
}

function rowHasChanges(row: Record<string, unknown>, saved: Record<string, unknown>): boolean {
  const a = JSON.stringify(row.modifier_constraints);
  const b = JSON.stringify(saved.modifier_constraints);
  return a !== b;
}

export default function FilterMatrix({ onDataChange }: FilterMatrixProps) {
  const [equipFilter, setEquipFilter] = useState<EquipmentFilter>('all');
  const [activeTab, setActiveTab] = useState<MatrixTab>('GRIPS');
  const [viewMode, setViewMode] = useState<ViewMode>('equipment');
  const [allRows, setAllRows] = useState<Record<string, unknown>[]>([]);
  const [savedRows, setSavedRows] = useState<Record<string, unknown>[]>([]);
  const [colOptions, setColOptions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copySource, setCopySource] = useState('');

  const currentTabDef = TABS.find((t) => t.key === activeTab)!;

  const rows = useMemo(() => {
    if (equipFilter === 'equipment') return allRows.filter(r => !r.is_attachment);
    if (equipFilter === 'attachments') return allRows.filter(r => r.is_attachment);
    return allRows;
  }, [allRows, equipFilter]);

  const hasChanges = useMemo(() => {
    return allRows.some((r) => {
      const saved = savedRows.find((s) => s.id === r.id);
      return !saved || rowHasChanges(r, saved);
    });
  }, [allRows, savedRows]);

  const loadEquip = useCallback(async () => {
    setLoading(true);
    try {
      const equipData = await api.getTable('equipment');
      const data = Array.isArray(equipData) ? (equipData as Record<string, unknown>[]) : [];
      const normalized = data.map(r => {
        if (typeof r.modifier_constraints === 'string') {
          try { r.modifier_constraints = JSON.parse(r.modifier_constraints as string); } catch { r.modifier_constraints = {}; }
        }
        return r;
      });
      setAllRows(normalized);
      setSavedRows(normalized.map(r => ({ ...r, modifier_constraints: { ...(r.modifier_constraints as Record<string, unknown>) } })));
    } catch (err) {
      console.error('Failed to load equipment:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadColOptions = useCallback(async () => {
    try {
      const refData = await api.getTable(currentTabDef.refTable);
      let opts = Array.isArray(refData) ? refData as Record<string, unknown>[] : [];
      if (currentTabDef.filterFn) {
        opts = opts.filter(currentTabDef.filterFn);
      }
      setColOptions(opts);
    } catch (err) {
      console.error('Failed to load options:', err);
    }
  }, [currentTabDef.refTable, currentTabDef.filterFn]);

  useEffect(() => { loadEquip(); }, [loadEquip]);
  useEffect(() => { loadColOptions(); }, [loadColOptions]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      for (const row of allRows) {
        const saved = savedRows.find((s) => s.id === row.id);
        if (!saved || rowHasChanges(row, saved)) {
          await api.updateRow('equipment', String(row.id), { modifier_constraints: row.modifier_constraints });
        }
      }
      setSavedRows(allRows.map(r => ({ ...r, modifier_constraints: { ...(r.modifier_constraints as Record<string, unknown>) } })));
      toast.success('Changes saved');
      onDataChange();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }, [allRows, savedRows, onDataChange]);

  const handleCancel = useCallback(() => {
    setAllRows(savedRows.map(r => ({ ...r, modifier_constraints: { ...(r.modifier_constraints as Record<string, unknown>) } })));
    toast.success('Changes discarded');
  }, [savedRows]);

  const isChecked = (row: Record<string, unknown>, colId: string): boolean => {
    const arr = getConstraintArray(row, activeTab);
    return arr !== null && arr.includes(colId);
  };

  const isNullField = (row: Record<string, unknown>): boolean => {
    return getConstraintArray(row, activeTab) === null;
  };

  const getCheckedCount = (row: Record<string, unknown>): number => {
    const arr = getConstraintArray(row, activeTab);
    return arr ? arr.length : 0;
  };

  const getEquipmentCountForOption = (optionId: string): number => {
    return rows.filter(r => {
      const arr = getConstraintArray(r, activeTab);
      return arr !== null && arr.includes(optionId);
    }).length;
  };

  const updateRow = (rowId: string, newRow: Record<string, unknown>) => {
    setAllRows(prev => prev.map(r => r.id === rowId ? newRow : r));
  };

  const toggleCell = (row: Record<string, unknown>, colId: string) => {
    const current = getConstraintArray(row, activeTab);
    let newVal: string[];
    if (current === null) {
      newVal = [colId];
    } else if (current.includes(colId)) {
      newVal = current.filter(v => v !== colId);
    } else {
      newVal = [...current, colId];
    }
    updateRow(String(row.id), setConstraintArray(row, activeTab, newVal));
  };

  const toggleNull = (row: Record<string, unknown>) => {
    const current = getConstraintArray(row, activeTab);
    const newVal = current === null ? [] : null;
    updateRow(String(row.id), setConstraintArray(row, activeTab, newVal));
  };

  const selectAllForRow = (row: Record<string, unknown>) => {
    const allIds = colOptions.map(o => String(o.id));
    updateRow(String(row.id), setConstraintArray(row, activeTab, allIds));
  };

  const clearAllForRow = (row: Record<string, unknown>) => {
    updateRow(String(row.id), setConstraintArray(row, activeTab, []));
  };

  const selectAllForColumn = (optionId: string) => {
    setAllRows(prev => prev.map(row => {
      const current = getConstraintArray(row, activeTab);
      if (current === null) return row;
      if (current.includes(optionId)) return row;
      return setConstraintArray(row, activeTab, [...current, optionId]);
    }));
  };

  const clearAllForColumn = (optionId: string) => {
    setAllRows(prev => prev.map(row => {
      const current = getConstraintArray(row, activeTab);
      if (!current || !current.includes(optionId)) return row;
      return setConstraintArray(row, activeTab, current.filter(v => v !== optionId));
    }));
  };

  const copyRulesFrom = (sourceId: string, targetRow: Record<string, unknown>) => {
    const sourceRow = allRows.find(r => r.id === sourceId);
    if (!sourceRow) return;
    const val = getConstraintArray(sourceRow, activeTab);
    updateRow(String(targetRow.id), setConstraintArray(targetRow, activeTab, val ? [...val] : null));
  };

  const totalEquipment = rows.length;
  const nullCount = rows.filter(isNullField).length;
  const activeEquipment = totalEquipment - nullCount;
  const totalCells = activeEquipment * colOptions.length;
  const checkedCells = rows.reduce((sum, row) => sum + getCheckedCount(row), 0);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-1">Filter Matrix Editor</h1>
      <p className="text-sm text-gray-500 mb-4">
        Configure modifier constraints for each piece of equipment.
      </p>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="flex gap-1 bg-gray-100 rounded p-0.5">
          {(['all', 'equipment', 'attachments'] as EquipmentFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setEquipFilter(f)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                equipFilter === f ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {f === 'all' ? 'All' : f === 'equipment' ? 'Equipment' : 'Attachments'}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-gray-300" />

        <div className="flex gap-1 bg-gray-100 rounded p-0.5">
          <button
            onClick={() => setViewMode('equipment')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              viewMode === 'equipment' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Equipment View
          </button>
          <button
            onClick={() => setViewMode('option')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              viewMode === 'option' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Option View
          </button>
        </div>

        <div className="ml-auto flex gap-3 text-xs text-gray-500">
          <span>{totalEquipment} equipment</span>
          <span>{colOptions.length} options</span>
          <span className="font-medium text-blue-600">
            {checkedCells}/{totalCells} enabled ({totalCells > 0 ? Math.round((checkedCells / totalCells) * 100) : 0}%)
          </span>
          {nullCount > 0 && <span className="text-amber-600">{nullCount} N/A</span>}
        </div>
      </div>

      <div className="flex gap-1 mb-4 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {hasChanges && !loading && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium text-amber-800">You have unsaved changes</span>
          <div className="flex gap-2">
            <button onClick={handleCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400">Loading matrix...</div>
      ) : viewMode === 'equipment' ? (
        <div className="overflow-x-auto border rounded-lg">
          <table className="text-xs">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600 sticky left-0 bg-gray-50 min-w-[180px] z-10">Equipment</th>
                <th className="px-2 py-2 text-center font-medium text-gray-400 min-w-[44px]">N/A</th>
                <th className="px-2 py-2 text-center font-medium text-blue-500 min-w-[50px]">Count</th>
                {colOptions.map((col) => (
                  <th key={String(col.id)} className="px-2 py-2 text-center font-medium text-gray-600 min-w-[80px] whitespace-nowrap group" title={String(col.id)}>
                    <div>{String(col.label)}</div>
                    <div className="flex justify-center gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => selectAllForColumn(String(col.id))} className="text-blue-500 hover:underline">all</button>
                      <button onClick={() => clearAllForColumn(String(col.id))} className="text-gray-400 hover:underline">none</button>
                    </div>
                  </th>
                ))}
                <th className="px-2 py-2 text-center font-medium text-gray-400 min-w-[120px]">Quick</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const nulled = isNullField(row);
                const count = getCheckedCount(row);
                const total = colOptions.length;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <tr key={String(row.id)} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-1.5 font-medium text-gray-800 sticky left-0 bg-white whitespace-nowrap z-10">
                      {String(row.label)}
                      {row.is_attachment && <span className="ml-1 text-xs text-purple-500">(att)</span>}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <input type="checkbox" checked={nulled} onChange={() => toggleNull(row)} title="Set as null (not applicable)" className="rounded text-amber-500" />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {nulled ? <span className="text-gray-300">--</span> : (
                        <span className={`font-medium ${pct === 100 ? 'text-green-600' : pct === 0 ? 'text-gray-300' : 'text-blue-600'}`}>{count}/{total}</span>
                      )}
                    </td>
                    {colOptions.map((col) => (
                      <td key={String(col.id)} className="px-2 py-1.5 text-center">
                        <input type="checkbox" checked={isChecked(row, String(col.id))} onChange={() => toggleCell(row, String(col.id))} disabled={nulled} className={`rounded ${nulled ? 'opacity-20' : 'text-blue-600'}`} />
                      </td>
                    ))}
                    <td className="px-2 py-1.5 text-center space-x-1">
                      <button onClick={() => selectAllForRow(row)} className="text-blue-500 hover:underline" disabled={nulled}>All</button>
                      <button onClick={() => clearAllForRow(row)} className="text-gray-400 hover:underline" disabled={nulled}>None</button>
                      <button
                        onClick={() => { if (copySource) copyRulesFrom(copySource, row); }}
                        className={`${copySource ? 'text-green-600 hover:underline' : 'text-gray-300 cursor-default'}`}
                        disabled={!copySource || nulled}
                        title={copySource ? `Paste from ${copySource}` : 'Select a source first'}
                      >Paste</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="text-xs">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600 sticky left-0 bg-gray-50 min-w-[180px] z-10">{currentTabDef.label}</th>
                <th className="px-2 py-2 text-center font-medium text-blue-500 min-w-[50px]">Used By</th>
                {rows.map((row) => (
                  <th key={String(row.id)} className="px-2 py-2 text-center font-medium text-gray-600 min-w-[80px] whitespace-nowrap" title={String(row.id)}>
                    {String(row.label)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {colOptions.map((opt) => {
                const optId = String(opt.id);
                const usedBy = getEquipmentCountForOption(optId);
                return (
                  <tr key={optId} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-1.5 font-medium text-gray-800 sticky left-0 bg-white whitespace-nowrap z-10">
                      {String(opt.label)}
                      <span className="text-gray-400 text-xs ml-1">{optId}</span>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={`font-medium ${usedBy === rows.length ? 'text-green-600' : usedBy === 0 ? 'text-gray-300' : 'text-blue-600'}`}>
                        {usedBy}/{rows.length}
                      </span>
                    </td>
                    {rows.map((row) => {
                      const nulled = isNullField(row);
                      return (
                        <td key={String(row.id)} className="px-2 py-1.5 text-center">
                          <input type="checkbox" checked={isChecked(row, optId)} onChange={() => toggleCell(row, optId)} disabled={nulled} className={`rounded ${nulled ? 'opacity-20' : 'text-blue-600'}`} />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 p-3 bg-gray-50 border rounded-lg">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-600 font-medium">Copy Rules:</span>
          <select value={copySource} onChange={(e) => setCopySource(e.target.value)} className="px-2 py-1 border rounded text-xs bg-white">
            <option value="">-- Select source equipment --</option>
            {rows.map((r) => (
              <option key={String(r.id)} value={String(r.id)}>{String(r.label)}</option>
            ))}
          </select>
          <span className="text-xs text-gray-400">
            {copySource
              ? `Click "Paste" on any row to copy ${currentTabDef.label.toLowerCase()} rules from ${rows.find((r) => r.id === copySource)?.label ?? copySource}`
              : 'Select a source equipment to copy its rules to another'}
          </span>
        </div>
      </div>
    </div>
  );
}
