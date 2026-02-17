import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { api, type TableSchema } from '../api';

interface FilterMatrixProps {
  schemas: TableSchema[];
  onDataChange: () => void;
}

type MatrixTab = 'allowed_grip_types' | 'allowed_grip_widths' | 'allowed_stance_types' | 'allowed_stance_widths';
type SourceTable = 'gymEquipment' | 'cableAttachments';

const TABS: { key: MatrixTab; label: string; refTable: string }[] = [
  { key: 'allowed_grip_types', label: 'Grip Types', refTable: 'gripTypes' },
  { key: 'allowed_grip_widths', label: 'Grip Widths', refTable: 'gripWidths' },
  { key: 'allowed_stance_types', label: 'Stance Types', refTable: 'stanceTypes' },
  { key: 'allowed_stance_widths', label: 'Stance Widths', refTable: 'stanceWidths' },
];

export default function FilterMatrix({ onDataChange }: FilterMatrixProps) {
  const [sourceTable, setSourceTable] = useState<SourceTable>('gymEquipment');
  const [activeTab, setActiveTab] = useState<MatrixTab>('allowed_grip_types');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [colOptions, setColOptions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const currentTabDef = TABS.find((t) => t.key === activeTab)!;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [equipData, refData] = await Promise.all([
        api.getTable(sourceTable),
        api.getTable(currentTabDef.refTable),
      ]);
      setRows(Array.isArray(equipData) ? equipData as Record<string, unknown>[] : []);
      setColOptions(Array.isArray(refData) ? refData as Record<string, unknown>[] : []);
    } catch (err) {
      console.error('Failed to load matrix data:', err);
    } finally {
      setLoading(false);
    }
  }, [sourceTable, currentTabDef.refTable]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const toggleCell = async (rowIdx: number, colId: string) => {
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

    try {
      await api.updateRow(sourceTable, row.id as string, { [activeTab]: newVal });
    } catch (err) {
      console.error('Failed to update:', err);
      loadData();
    }
  };

  const toggleNull = async (rowIdx: number) => {
    const row = rows[rowIdx];
    const current = row[activeTab];
    const newVal = current === null || current === undefined ? [] : null;

    const updated = [...rows];
    updated[rowIdx] = { ...updated[rowIdx], [activeTab]: newVal };
    setRows(updated);

    try {
      await api.updateRow(sourceTable, row.id as string, { [activeTab]: newVal });
    } catch (err) {
      console.error('Failed to update:', err);
      loadData();
    }
  };

  const selectAllForRow = async (rowIdx: number) => {
    const row = rows[rowIdx];
    const allIds = colOptions.map((o) => String(o.id));
    const updated = [...rows];
    updated[rowIdx] = { ...updated[rowIdx], [activeTab]: allIds };
    setRows(updated);
    try {
      await api.updateRow(sourceTable, row.id as string, { [activeTab]: allIds });
    } catch (err) {
      loadData();
    }
  };

  const clearAllForRow = async (rowIdx: number) => {
    const row = rows[rowIdx];
    const updated = [...rows];
    updated[rowIdx] = { ...updated[rowIdx], [activeTab]: [] };
    setRows(updated);
    try {
      await api.updateRow(sourceTable, row.id as string, { [activeTab]: [] });
    } catch (err) {
      loadData();
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-2">Filter Matrix Editor</h1>
      <p className="text-sm text-gray-500 mb-4">
        Configure which grip types, grip widths, stance types, and stance widths are allowed for each piece of equipment.
      </p>

      {/* Source table toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSourceTable('gymEquipment')}
          className={`px-4 py-2 rounded text-sm font-medium ${
            sourceTable === 'gymEquipment'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Gym Equipment
        </button>
        <button
          onClick={() => setSourceTable('cableAttachments')}
          className={`px-4 py-2 rounded text-sm font-medium ${
            sourceTable === 'cableAttachments'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Cable Attachments
        </button>
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 mb-4 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-400">Loading matrix...</div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="text-xs">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600 sticky left-0 bg-gray-50 min-w-[180px]">
                  Equipment
                </th>
                <th className="px-2 py-2 text-center font-medium text-gray-400 min-w-[60px]">N/A</th>
                {colOptions.map((col) => (
                  <th
                    key={String(col.id)}
                    className="px-2 py-2 text-center font-medium text-gray-600 min-w-[80px] whitespace-nowrap"
                    title={String(col.id)}
                  >
                    {String(col.label)}
                  </th>
                ))}
                <th className="px-2 py-2 text-center font-medium text-gray-400 min-w-[80px]">Quick</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => {
                const nulled = isNullField(row);
                return (
                  <tr key={String(row.id)} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-1.5 font-medium text-gray-800 sticky left-0 bg-white whitespace-nowrap">
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
                      <button
                        onClick={() => selectAllForRow(rowIdx)}
                        className="text-blue-500 hover:underline"
                        disabled={nulled}
                      >
                        All
                      </button>
                      <button
                        onClick={() => clearAllForRow(rowIdx)}
                        className="text-gray-400 hover:underline"
                        disabled={nulled}
                      >
                        None
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
