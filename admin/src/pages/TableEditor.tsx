import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, type TableSchema, type TableField, type FKRef } from '../api';
import RowEditor from '../components/RowEditor';

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

export default function TableEditor({ schemas, onDataChange }: TableEditorProps) {
  const { key } = useParams<{ key: string }>();
  const schema = useMemo(() => schemas.find((s) => s.key === key), [schemas, key]);

  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState('sort_order');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [fkRefs, setFkRefs] = useState<FKRef[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteLabel, setDeleteLabel] = useState('');
  const [reassignTarget, setReassignTarget] = useState('');

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

  useEffect(() => {
    setEditRow(null);
    setIsNew(false);
    setSearch('');
    setSortCol('sort_order');
    setSortDir('asc');
    setDeleteConfirm(null);
    loadData();
    loadRefData();
  }, [key, loadData, loadRefData]);

  const filtered = useMemo(() => {
    let result = rows;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((v) => String(v).toLowerCase().includes(q))
      );
    }
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
    return result;
  }, [rows, search, sortCol, sortDir]);

  const visibleCols = useMemo(() => {
    if (!schema) return [];
    return schema.fields
      .filter((f) => !['json'].includes(f.type) || f.jsonShape !== 'muscle_targets')
      .slice(0, 8);
  }, [schema]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
  };

  const handleAdd = () => {
    if (!schema) return;
    const newRow: Record<string, unknown> = {};
    for (const f of schema.fields) {
      newRow[f.name] = f.defaultValue ?? (f.type === 'boolean' ? false : f.type === 'number' ? 0 : f.type === 'string[]' || f.type === 'fk[]' ? [] : '');
    }
    newRow.sort_order = rows.length;
    setEditRow(newRow);
    setIsNew(true);
  };

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
      await loadData();
      onDataChange();
    } catch (err) {
      toast.error(`Save failed: ${err}`);
    }
  };

  const handleMoveRow = async (rowId: string, direction: 'up' | 'down') => {
    if (!key) return;
    const idx = filtered.findIndex((r) => r.id === rowId);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= filtered.length) return;
    const ids = filtered.map((r) => r.id as string);
    [ids[idx], ids[swapIdx]] = [ids[swapIdx], ids[idx]];
    try {
      await api.reorder(key, ids);
      await loadData();
      onDataChange();
    } catch (err) {
      toast.error(`Reorder failed: ${err}`);
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

  const cellDisplay = (row: Record<string, unknown>, field: TableField) => {
    const val = row[field.name];
    if (val == null) return <span className="text-gray-300">null</span>;
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
    if (field.type === 'json') return <span className="text-xs text-gray-400">{'{...}'}</span>;
    if (field.type === 'fk' && field.refTable && refData[field.refTable]) {
      const ref = refData[field.refTable].find((r) => r.id === val);
      if (ref) return String(ref[field.refLabelField || 'label'] || val);
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
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
        >
          + Add Row
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search rows..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md px-3 py-2 border rounded mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {visibleCols.map((col) => (
                  <th
                    key={col.name}
                    onClick={() => handleSort(col.name)}
                    className="px-3 py-2 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                  >
                    {col.name}
                    {col.refTable && <span className="text-blue-400 ml-0.5 text-xs">FK</span>}
                    {sortCol === col.name && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-medium text-gray-600 w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => (
                <tr
                  key={String(row.id ?? idx)}
                  className="border-b hover:bg-blue-50 cursor-pointer"
                  onClick={() => { setEditRow({ ...row }); setIsNew(false); }}
                >
                  {visibleCols.map((col) => (
                    <td key={col.name} className="px-3 py-2 max-w-xs truncate">{cellDisplay(row, col)}</td>
                  ))}
                  <td className="px-3 py-2 text-right whitespace-nowrap space-x-1">
                    <button onClick={(e) => { e.stopPropagation(); handleMoveRow(row.id as string, 'up'); }} className="text-gray-400 hover:text-gray-600 text-xs" title="Move up">▲</button>
                    <button onClick={(e) => { e.stopPropagation(); handleMoveRow(row.id as string, 'down'); }} className="text-gray-400 hover:text-gray-600 text-xs" title="Move down">▼</button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(row.id as string); }} className="text-red-400 hover:text-red-600 text-xs ml-2">Delete</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={visibleCols.length + 1} className="px-3 py-8 text-center text-gray-400">
                    {search ? 'No matching rows' : 'No data'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Row Editor */}
      {editRow && (
        <RowEditor
          schema={schema}
          row={editRow}
          isNew={isNew}
          refData={refData}
          onSave={handleSave}
          onCancel={() => { setEditRow(null); setIsNew(false); }}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
