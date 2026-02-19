import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, type TableSchema, type TableField, type FKRef } from '../api';
import RowEditor from '../components/RowEditor';
import ColumnSettings from '../components/ColumnSettings';
import FilterBar, { type FilterRule } from '../components/FilterBar';

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

function MuscleTargetBar({ targets }: { targets: Record<string, unknown> }) {
  const [hovered, setHovered] = React.useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = React.useState<{ top: number; left: number } | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const groups = Object.entries(targets)
    .filter(([k]) => k !== '_score' && MUSCLE_GROUP_COLORS[k])
    .map(([k, v]) => ({ key: k, score: (v as Record<string, unknown>)?._score as number || 0 }))
    .filter(g => g.score > 0)
    .sort((a, b) => b.score - a.score);

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
                  <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: MUSCLE_GROUP_COLORS[g.key] }} />
                  <span className="font-medium">{MUSCLE_GROUP_LABEL[g.key] || g.key}</span>
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
            const color = MUSCLE_GROUP_COLORS[g.key];
            const isHov = hovered === g.key;
            return (
              <div
                key={g.key}
                className="relative flex items-center justify-center transition-opacity duration-100"
                style={{
                  width: `${pct}%`,
                  minWidth: pct > 8 ? '14px' : '4px',
                  backgroundColor: color,
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

export default function TableEditor({ schemas, onDataChange }: TableEditorProps) {
  const { key } = useParams<{ key: string }>();
  const schema = useMemo(() => schemas.find((s) => s.key === key), [schemas, key]);

  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [showFilterForm, setShowFilterForm] = useState(false);
  const [sortCol, setSortCol] = useState('sort_order');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [fkRefs, setFkRefs] = useState<FKRef[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteLabel, setDeleteLabel] = useState('');
  const [reassignTarget, setReassignTarget] = useState('');
  const [showColumnSettings, setShowColumnSettings] = useState(false);
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

  // Load column settings from localStorage; merge in any schema fields missing from saved config (e.g. new columns)
  const loadColumnSettings = useCallback(() => {
    if (!key || !schema) return;
    const storageKey = `table-columns-${key}`;
    const saved = localStorage.getItem(storageKey);
    const allFieldNames = schema.fields.map((f) => f.name);
    if (saved) {
      try {
        const { order, visible, widths } = JSON.parse(saved);
        const orderSet = new Set(Array.isArray(order) ? order : []);
        const visibleSet = new Set(Array.isArray(visible) ? visible : []);
        const missing = allFieldNames.filter((n) => !orderSet.has(n));
        const mergedOrder = Array.isArray(order) && order.length > 0 ? [...order, ...missing] : allFieldNames;
        missing.forEach((n) => visibleSet.add(n));
        const mergedVisible = Array.isArray(visible) && visible.length > 0 ? [...visible, ...missing] : mergedOrder.slice(0, 8);
        setColumnOrder(mergedOrder);
        setVisibleColumns(mergedVisible.length > 0 ? Array.from(visibleSet) : mergedOrder.slice(0, 8));
        setColumnWidths(widths && typeof widths === 'object' ? widths : {});
      } catch {
        // Invalid JSON, use defaults
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

  useEffect(() => {
    setEditRow(null);
    setIsNew(false);
    setSearch('');
    setFilters([]);
    setShowFilterForm(false);
    setSortCol('sort_order');
    setSortDir('asc');
    setDeleteConfirm(null);
    loadData();
    loadRefData();
    loadColumnSettings();
  }, [key, loadData, loadRefData, loadColumnSettings]);

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

  const filtered = useMemo(() => {
    let result = rows;

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
    return result;
  }, [rows, search, filters, sortCol, sortDir, schema]);

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
    
    // Exclude buttons, inputs, draggable columns, resize handles, drag handles
    if (
      target.tagName === 'BUTTON' ||
      target.tagName === 'INPUT' ||
      target.tagName === 'SELECT' ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('[draggable="true"]') ||
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
  };

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

      // Build data rows
      const dataRows = rows.map(row => {
        return orderedFields.map(field => {
          const val = row[field.name];
          
          if (val == null) {
            return '';
          }

          // Handle JSON fields - stringify them
          if (field.type === 'json') {
            return JSON.stringify(val);
          }

          // Handle arrays (string[] or fk[])
          if (field.type === 'string[]' || field.type === 'fk[]') {
            if (Array.isArray(val)) {
              return JSON.stringify(val);
            }
            return String(val);
          }

          // Handle boolean
          if (field.type === 'boolean') {
            return val ? 'true' : 'false';
          }

          // Handle FK - try to resolve to label
          if (field.type === 'fk' && field.refTable && refData[field.refTable]) {
            const ref = refData[field.refTable].find((r) => r.id === val);
            if (ref) {
              return String(ref[field.refLabelField || 'label'] || val);
            }
          }

          // Default: convert to string and escape tabs/newlines
          const str = String(val);
          // Replace tabs with spaces and newlines with spaces to avoid breaking TSV format
          return str.replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\r/g, '');
        });
      });

      // Combine headers and rows
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
    
    // Ensure columnOrder includes ALL fields (merge any missing)
    let finalOrder: string[];
    if (columnOrder.length > 0) {
      const orderSet = new Set(columnOrder);
      const missing = allFieldNames.filter((n) => !orderSet.has(n));
      finalOrder = [...columnOrder, ...missing];
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
    if (field.type === 'json') {
      if (field.jsonShape === 'muscle_targets' && val && typeof val === 'object') {
        return <MuscleTargetBar targets={val as Record<string, unknown>} />;
      }
      if (field.jsonShape === 'grip_type_configs' && val && typeof val === 'object' && !Array.isArray(val)) {
        const keys = Object.keys(val as Record<string, unknown>);
        return keys.length === 0 ? <span className="text-gray-300">—</span> : <span className="text-xs">{keys.length} grip config(s)</span>;
      }
      return <span className="text-xs text-gray-400">{'{...}'}</span>;
    }
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
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
          >
            + Add Row
          </button>
        </div>
      </div>

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
          {schema && (
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
                <th className="px-3 py-2 text-right font-medium text-gray-600 w-28 sticky right-0 z-10 bg-gray-50">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => {
                const rowId = String(row.id ?? idx);
                const isDragged = draggedRowId === rowId;
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
                    }}
                  >
                    {visibleCols.map((col, index) => {
                      const width = columnWidths[col.name] || 150;
                      const isFirst = index === 0;
                      const isIdField = col.name === schema.idField;
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
                            <div className="flex items-center gap-2">
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
                            cellDisplay(row, col)
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right whitespace-nowrap space-x-1 sticky right-0 z-10 bg-white group-hover:bg-blue-50 border-l border-gray-200">
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(row.id as string); }} className="text-red-400 hover:text-red-600 text-xs">Delete</button>
                    </td>
                  </tr>
                );
              })}
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
    </div>
  );
}
