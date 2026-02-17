import React, { useEffect, useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { api, type TableSchema } from '../api';

interface FilterMatrixProps {
  schemas: TableSchema[];
  onDataChange: () => void;
}

type MatrixTab = 'allowed_grip_types' | 'allowed_grip_widths' | 'allowed_stance_types' | 'allowed_stance_widths';
type SourceTable = 'gymEquipment' | 'cableAttachments';
type ViewMode = 'equipment' | 'option';

const TABS: { key: MatrixTab; label: string; refTable: string }[] = [
  { key: 'allowed_grip_types', label: 'Grip Types', refTable: 'gripTypes' },
  { key: 'allowed_grip_widths', label: 'Grip Widths', refTable: 'gripWidths' },
  { key: 'allowed_stance_types', label: 'Stance Types', refTable: 'stanceTypes' },
  { key: 'allowed_stance_widths', label: 'Stance Widths', refTable: 'stanceWidths' },
];

const ALLOWED_COLS: MatrixTab[] = ['allowed_grip_types', 'allowed_grip_widths', 'allowed_stance_types', 'allowed_stance_widths'];

function rowHasChanges(row: Record<string, unknown>, saved: Record<string, unknown>): boolean {
  for (const col of ALLOWED_COLS) {
    const a = row[col];
    const b = saved[col];
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return true;
      const sa = [...a].sort();
      const sb = [...b].sort();
      if (sa.some((v, i) => v !== sb[i])) return true;
    } else if (a !== b) {
      return true;
    }
  }
  return false;
}

export default function FilterMatrix({ onDataChange }: FilterMatrixProps) {
  const [sourceTable, setSourceTable] = useState<SourceTable>('gymEquipment');
  const [activeTab, setActiveTab] = useState<MatrixTab>('allowed_grip_types');
  const [viewMode, setViewMode] = useState<ViewMode>('equipment');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [savedRows, setSavedRows] = useState<Record<string, unknown>[]>([]);
  const [colOptions, setColOptions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copySource, setCopySource] = useState('');

  const currentTabDef = TABS.find((t) => t.key === activeTab)!;

  const hasChanges = useMemo(() => {
    if (rows.length !== savedRows.length) return true;
    return rows.some((r, i) => {
      const saved = savedRows.find((s) => s.id === r.id);
      return !saved || rowHasChanges(r, saved);
    });
  }, [rows, savedRows]);

  const loadEquip = useCallback(async () => {
    setLoading(true);
    try {
      const equipData = await api.getTable(sourceTable);
      const data = Array.isArray(equipData) ? (equipData as Record<string, unknown>[]) : [];
      setRows(data);
      setSavedRows(data);
    } catch (err) {
      console.error('Failed to load equipment:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [sourceTable]);

  const loadColOptions = useCallback(async () => {
    try {
      const refData = await api.getTable(currentTabDef.refTable);
      setColOptions(Array.isArray(refData) ? refData as Record<string, unknown>[] : []);
    } catch (err) {
      console.error('Failed to load options:', err);
    }
  }, [currentTabDef.refTable]);

  useEffect(() => {
    loadEquip();
  }, [loadEquip]);

  useEffect(() => {
    loadColOptions();
  }, [loadColOptions]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const updates: Record<string, Record<string, unknown>> = {};
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const saved = savedRows.find((s) => s.id === row.id);
        if (!saved || rowHasChanges(row, saved)) {
          updates[row.id as string] = {
            allowed_grip_types: row.allowed_grip_types,
            allowed_grip_widths: row.allowed_grip_widths,
            allowed_stance_types: row.allowed_stance_types,
            allowed_stance_widths: row.allowed_stance_widths,
          };
        }
      }
      if (Object.keys(updates).length > 0) {
        await api.bulkUpdateMatrix(sourceTable, updates);
        setSavedRows([...rows]);
        toast.success('Changes saved');
        onDataChange();
      }
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }, [sourceTable, rows, savedRows, onDataChange]);

  const handleCancel = useCallback(() => {
    setRows([...savedRows]);
    toast.success('Changes discarded');
  }, [savedRows]);

  const isChecked = (row: Record<string, unknown>, colId: string): boolean => {
    const val = row[activeTab];
    if (val === null || val === undefined) return false;
    if (Array.isArray(val)) return val.includes(colId);
    return false;
  };

  const isNullField = (row: Record<string, unknown>): boolean => {
    const val = row[activeTab];
    return val === null || val === undefined;
  };

  const getCheckedCount = (row: Record<string, unknown>): number => {
    const val = row[activeTab];
    if (!Array.isArray(val)) return 0;
    return val.length;
  };

  const getEquipmentCountForOption = (optionId: string): number => {
    return rows.filter((r) => {
      const val = r[activeTab];
      return Array.isArray(val) && val.includes(optionId);
    }).length;
  };

  const toggleCell = (rowIdx: number, colId: string) => {
    const row = rows[rowIdx];
    const current = row[activeTab];
    let newVal: string[] | null;

    if (current === null || current === undefined) {
      newVal = [colId];
    } else if (Array.isArray(current)) {
      if (current.includes(colId)) {
        newVal = current.filter((v: string) => v !== colId);
      } else {
        newVal = [...current, colId];
      }
    } else {
      newVal = [colId];
    }

    const updated = [...rows];
    updated[rowIdx] = { ...updated[rowIdx], [activeTab]: newVal };
    setRows(updated);
  };

  const toggleNull = (rowIdx: number) => {
    const row = rows[rowIdx];
    const current = row[activeTab];
    const newVal = current === null || current === undefined ? [] : null;

    const updated = [...rows];
    updated[rowIdx] = { ...updated[rowIdx], [activeTab]: newVal };
    setRows(updated);
  };

  const selectAllForRow = (rowIdx: number) => {
    const allIds = colOptions.map((o) => String(o.id));
    const updated = [...rows];
    updated[rowIdx] = { ...updated[rowIdx], [activeTab]: allIds };
    setRows(updated);
  };

  const clearAllForRow = (rowIdx: number) => {
    const updated = [...rows];
    updated[rowIdx] = { ...updated[rowIdx], [activeTab]: [] };
    setRows(updated);
  };

  const selectAllForColumn = (optionId: string) => {
    const updated = rows.map((row) => {
      const current = row[activeTab];
      if (current === null || current === undefined) return row;
      const arr = Array.isArray(current) ? current : [];
      if (arr.includes(optionId)) return row;
      const newVal = [...arr, optionId];
      return { ...row, [activeTab]: newVal };
    });
    setRows(updated);
  };

  const clearAllForColumn = (optionId: string) => {
    const updated = rows.map((row) => {
      const current = row[activeTab];
      if (!Array.isArray(current) || !current.includes(optionId)) return row;
      const newVal = current.filter((v: string) => v !== optionId);
      return { ...row, [activeTab]: newVal };
    });
    setRows(updated);
  };

  const copyRulesFrom = (sourceId: string, targetIdx: number) => {
    const sourceRow = rows.find((r) => r.id === sourceId);
    if (!sourceRow) return;
    const newVal = sourceRow[activeTab];

    const updated = [...rows];
    updated[targetIdx] = { ...updated[targetIdx], [activeTab]: Array.isArray(newVal) ? [...newVal] : newVal };
    setRows(updated);
  };

  // Stats for summary bar
  const totalEquipment = rows.length;
  const nullCount = rows.filter(isNullField).length;
  const activeEquipment = totalEquipment - nullCount;
  const totalCells = activeEquipment * colOptions.length;
  const checkedCells = rows.reduce((sum, row) => sum + getCheckedCount(row), 0);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-1">Filter Matrix Editor</h1>
      <p className="text-sm text-gray-500 mb-4">
        Configure which grip types, grip widths, stance types, and stance widths are allowed for each piece of equipment.
      </p>

      {/* Source table + View mode toggle */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="flex gap-1 bg-gray-100 rounded p-0.5">
          <button
            onClick={() => setSourceTable('gymEquipment')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              sourceTable === 'gymEquipment' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Gym Equipment
          </button>
          <button
            onClick={() => setSourceTable('cableAttachments')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              sourceTable === 'cableAttachments' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Cable Attachments
          </button>
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

        {/* Stats */}
        <div className="ml-auto flex gap-3 text-xs text-gray-500">
          <span>{totalEquipment} equipment</span>
          <span>{colOptions.length} options</span>
          <span className="font-medium text-blue-600">
            {checkedCells}/{totalCells} enabled ({totalCells > 0 ? Math.round((checkedCells / totalCells) * 100) : 0}%)
          </span>
          {nullCount > 0 && <span className="text-amber-600">{nullCount} N/A</span>}
        </div>
      </div>

      {/* Tab selector */}
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

      {/* Save / Cancel bar - shown when there are unsaved changes */}
      {hasChanges && !loading && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium text-amber-800">You have unsaved changes</span>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400">Loading matrix...</div>
      ) : viewMode === 'equipment' ? (
        /* ─── Equipment-centric view ────────────────────── */
        <div className="overflow-x-auto border rounded-lg">
          <table className="text-xs">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600 sticky left-0 bg-gray-50 min-w-[180px] z-10">
                  Equipment
                </th>
                <th className="px-2 py-2 text-center font-medium text-gray-400 min-w-[44px]">N/A</th>
                <th className="px-2 py-2 text-center font-medium text-blue-500 min-w-[50px]">Count</th>
                {colOptions.map((col) => (
                  <th
                    key={String(col.id)}
                    className="px-2 py-2 text-center font-medium text-gray-600 min-w-[80px] whitespace-nowrap group"
                    title={String(col.id)}
                  >
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
              {rows.map((row, rowIdx) => {
                const nulled = isNullField(row);
                const count = getCheckedCount(row);
                const total = colOptions.length;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <tr key={String(row.id)} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-1.5 font-medium text-gray-800 sticky left-0 bg-white whitespace-nowrap z-10">
                      {String(row.label)}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={nulled}
                        onChange={() => toggleNull(rowIdx)}
                        title="Set as null (not applicable)"
                        className="rounded text-amber-500"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {nulled ? (
                        <span className="text-gray-300">--</span>
                      ) : (
                        <span className={`font-medium ${pct === 100 ? 'text-green-600' : pct === 0 ? 'text-gray-300' : 'text-blue-600'}`}>
                          {count}/{total}
                        </span>
                      )}
                    </td>
                    {colOptions.map((col) => (
                      <td key={String(col.id)} className="px-2 py-1.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked(row, String(col.id))}
                          onChange={() => toggleCell(rowIdx, String(col.id))}
                          disabled={nulled}
                          className={`rounded ${nulled ? 'opacity-20' : 'text-blue-600'}`}
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1.5 text-center space-x-1">
                      <button onClick={() => selectAllForRow(rowIdx)} className="text-blue-500 hover:underline" disabled={nulled}>All</button>
                      <button onClick={() => clearAllForRow(rowIdx)} className="text-gray-400 hover:underline" disabled={nulled}>None</button>
                      <button
                        onClick={() => {
                          if (copySource) copyRulesFrom(copySource, rowIdx);
                        }}
                        className={`${copySource ? 'text-green-600 hover:underline' : 'text-gray-300 cursor-default'}`}
                        disabled={!copySource || nulled}
                        title={copySource ? `Paste from ${copySource}` : 'Select a source first'}
                      >
                        Paste
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* ─── Option-centric view ────────────────────── */
        <div className="overflow-x-auto border rounded-lg">
          <table className="text-xs">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600 sticky left-0 bg-gray-50 min-w-[180px] z-10">
                  {currentTabDef.label}
                </th>
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
                    {rows.map((row, rowIdx) => {
                      const nulled = isNullField(row);
                      return (
                        <td key={String(row.id)} className="px-2 py-1.5 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked(row, optId)}
                            onChange={() => toggleCell(rowIdx, optId)}
                            disabled={nulled}
                            className={`rounded ${nulled ? 'opacity-20' : 'text-blue-600'}`}
                          />
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

      {/* Copy rules toolbar */}
      <div className="mt-4 p-3 bg-gray-50 border rounded-lg">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-600 font-medium">Copy Rules:</span>
          <select
            value={copySource}
            onChange={(e) => setCopySource(e.target.value)}
            className="px-2 py-1 border rounded text-xs bg-white"
          >
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
