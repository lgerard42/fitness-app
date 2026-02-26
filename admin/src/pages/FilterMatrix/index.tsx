import React, { useEffect, useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { api, type TableSchema } from '../../api';

// Simple markdown parser for descriptions (handles **bold** and `code`)
function renderMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  // Find all markdown patterns (bold and code)
  const matches: Array<{ start: number; end: number; content: string; type: 'bold' | 'code' }> = [];
  
  // Match **bold**
  let boldMatch;
  const boldRegex = /\*\*(.*?)\*\*/g;
  while ((boldMatch = boldRegex.exec(text)) !== null) {
    matches.push({
      start: boldMatch.index,
      end: boldMatch.index + boldMatch[0].length,
      content: boldMatch[1],
      type: 'bold',
    });
  }

  // Match `code`
  let codeMatch;
  const codeRegex = /`([^`]+)`/g;
  while ((codeMatch = codeRegex.exec(text)) !== null) {
    matches.push({
      start: codeMatch.index,
      end: codeMatch.index + codeMatch[0].length,
      content: codeMatch[1],
      type: 'code',
    });
  }

  // Sort by position and remove overlaps (prefer earlier matches)
  matches.sort((a, b) => a.start - b.start);
  const filteredMatches: typeof matches = [];
  for (const match of matches) {
    const overlaps = filteredMatches.some(
      (m) => match.start < m.end && match.end > m.start
    );
    if (!overlaps) {
      filteredMatches.push(match);
    }
  }

  // Build React elements
  filteredMatches.forEach((match) => {
    // Add text before match
    if (match.start > lastIndex) {
      const beforeText = text.slice(lastIndex, match.start);
      if (beforeText) {
        parts.push(<React.Fragment key={key++}>{beforeText}</React.Fragment>);
      }
    }

    // Add matched element
    if (match.type === 'bold') {
      parts.push(<strong key={key++}>{match.content}</strong>);
    } else {
      parts.push(
        <code key={key++} className="bg-gray-100 px-1 rounded text-xs font-mono">
          {match.content}
        </code>
      );
    }

    lastIndex = match.end;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    parts.push(<React.Fragment key={key++}>{remainingText}</React.Fragment>);
  }

  return parts.length > 0 ? parts : text;
}

interface FilterMatrixProps {
  schemas: TableSchema[];
  onDataChange: () => void;
}

type MatrixTab =
  | 'MOTION_PATHS' | 'TORSO_ANGLES' | 'TORSO_ORIENTATIONS' | 'RESISTANCE_ORIGIN'
  | 'GRIPS' | 'GRIP_WIDTHS' | 'ELBOW_RELATIONSHIP' | 'EXECUTION_STYLES'
  | 'FOOT_POSITIONS' | 'STANCE_WIDTHS' | 'STANCE_TYPES' | 'LOAD_PLACEMENT'
  | 'SUPPORT_STRUCTURES' | 'LOADING_AIDS' | 'RANGE_OF_MOTION';

type EquipmentFilter = 'all' | 'equipment' | 'attachments';

interface TabDef {
  key: MatrixTab;
  label: string;
  refTable: string;
  filterFn?: (row: Record<string, unknown>) => boolean;
}

interface TabGroup {
  group: string;
  tabs: TabDef[];
}

const TAB_GROUPS: TabGroup[] = [
  {
    group: 'Trajectory & Posture',
    tabs: [
      { key: 'MOTION_PATHS', label: 'Motion Paths', refTable: 'motionPaths' },
      { key: 'TORSO_ANGLES', label: 'Torso Angles', refTable: 'torsoAngles' },
      { key: 'TORSO_ORIENTATIONS', label: 'Torso Orientations', refTable: 'torsoOrientations' },
      { key: 'RESISTANCE_ORIGIN', label: 'Resistance Origin', refTable: 'resistanceOrigin' },
    ],
  },
  {
    group: 'Upper Body',
    tabs: [
      { key: 'GRIPS', label: 'Grips', refTable: 'grips', filterFn: (r) => r.grip_category !== 'Width' && r.parent_id == null },
      { key: 'GRIP_WIDTHS', label: 'Grip Widths', refTable: 'gripWidths' },
      { key: 'ELBOW_RELATIONSHIP', label: 'Elbow Rel.', refTable: 'elbowRelationship' },
      { key: 'EXECUTION_STYLES', label: 'Exec. Styles', refTable: 'executionStyles' },
    ],
  },
  {
    group: 'Lower Body',
    tabs: [
      { key: 'FOOT_POSITIONS', label: 'Foot Positions', refTable: 'footPositions' },
      { key: 'STANCE_WIDTHS', label: 'Stance Widths', refTable: 'stanceWidths' },
      { key: 'STANCE_TYPES', label: 'Stance Types', refTable: 'stanceTypes' },
      { key: 'LOAD_PLACEMENT', label: 'Load Placement', refTable: 'loadPlacement' },
    ],
  },
  {
    group: 'Execution',
    tabs: [
      { key: 'SUPPORT_STRUCTURES', label: 'Support Struct.', refTable: 'supportStructures' },
      { key: 'LOADING_AIDS', label: 'Loading Aids', refTable: 'loadingAids' },
      { key: 'RANGE_OF_MOTION', label: 'Range of Motion', refTable: 'rangeOfMotion' },
    ],
  },
];

const ALL_TABS: TabDef[] = TAB_GROUPS.flatMap(g => g.tabs);

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

interface CategoryGroup {
  categoryId: string;
  categoryLabel: string;
  rows: Record<string, unknown>[];
}

export default function FilterMatrix({ schemas, onDataChange }: FilterMatrixProps) {
  const [equipFilter, setEquipFilter] = useState<EquipmentFilter>('all');
  const [activeTab, setActiveTab] = useState<MatrixTab>('GRIPS');
  const [allRows, setAllRows] = useState<Record<string, unknown>[]>([]);
  const [savedRows, setSavedRows] = useState<Record<string, unknown>[]>([]);
  const [colOptions, setColOptions] = useState<Record<string, unknown>[]>([]);
  const [categories, setCategories] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copySource, setCopySource] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ updated: number; errors: string[] } | null>(null);
  const [importTargetTab, setImportTargetTab] = useState<MatrixTab>(activeTab);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const currentTabDef = ALL_TABS.find((t) => t.key === activeTab)!;
  const currentSchema = schemas.find(s => s.key === currentTabDef.refTable);

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

  const groupedRows = useMemo((): CategoryGroup[] => {
    const catMap = new Map<string, { label: string; sortOrder: number }>();
    categories.forEach(c => {
      catMap.set(String(c.id), {
        label: String(c.label ?? c.id),
        sortOrder: typeof c.sort_order === 'number' ? c.sort_order : 999,
      });
    });

    const byCategory = new Map<string, Record<string, unknown>[]>();
    rows.forEach(row => {
      const catId = row.category_id ? String(row.category_id) : '__UNCATEGORIZED__';
      if (!byCategory.has(catId)) byCategory.set(catId, []);
      byCategory.get(catId)!.push(row);
    });

    return Array.from(byCategory.entries())
      .sort((a, b) => {
        if (a[0] === '__UNCATEGORIZED__') return 1;
        if (b[0] === '__UNCATEGORIZED__') return -1;
        const orderA = catMap.get(a[0])?.sortOrder ?? 999;
        const orderB = catMap.get(b[0])?.sortOrder ?? 999;
        return orderA - orderB;
      })
      .map(([catId, catRows]) => ({
        categoryId: catId,
        categoryLabel: catId === '__UNCATEGORIZED__' ? 'Uncategorized' : (catMap.get(catId)?.label ?? catId),
        rows: catRows,
      }));
  }, [rows, categories]);

  const loadEquip = useCallback(async () => {
    setLoading(true);
    try {
      const [equipData, catData] = await Promise.all([
        api.getTable('equipment'),
        api.getTable('equipmentCategories'),
      ]);
      const data = Array.isArray(equipData) ? (equipData as Record<string, unknown>[]) : [];
      const normalized = data.map(r => {
        if (typeof r.modifier_constraints === 'string') {
          try { r.modifier_constraints = JSON.parse(r.modifier_constraints as string); } catch { r.modifier_constraints = {}; }
        }
        return r;
      });
      setAllRows(normalized);
      setSavedRows(normalized.map(r => ({ ...r, modifier_constraints: { ...(r.modifier_constraints as Record<string, unknown>) } })));
      setCategories(Array.isArray(catData) ? catData as Record<string, unknown>[] : []);
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

  const copyRulesFrom = (sourceId: string, targetRow: Record<string, unknown>) => {
    const sourceRow = allRows.find(r => r.id === sourceId);
    if (!sourceRow) return;
    const val = getConstraintArray(sourceRow, activeTab);
    updateRow(String(targetRow.id), setConstraintArray(targetRow, activeTab, val ? [...val] : null));
  };

  // ─── Export/Copy/Import ───
  const buildExportData = useCallback((tab: MatrixTab = activeTab): Record<string, unknown>[] => {
    return rows.map(row => {
      const rowData: Record<string, unknown> = {
        equipment_id: row.id,
        equipment_label: row.label,
      };
      colOptions.forEach(opt => {
        const optId = String(opt.id);
        const arr = getConstraintArray(row, tab);
        const checked = arr !== null && arr.includes(optId);
        rowData[optId] = checked ? '1' : '0';
      });
      return rowData;
    });
  }, [rows, colOptions, activeTab]);

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

      const headers = ['equipment_id', 'equipment_label', ...colOptions.map(o => String(o.id))];
      const tsvRows = data.map(row =>
        headers.map(h => {
          const val = row[h];
          return escapeTsv(val == null ? '' : String(val));
        }).join('\t')
      );

      const tsv = [headers.join('\t'), ...tsvRows].join('\n');
      await navigator.clipboard.writeText(tsv);
      toast.success(`Copied ${data.length} equipment rows to clipboard`);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy to clipboard');
    }
  }, [buildExportData, colOptions]);

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
      const headers = ['equipment_id', 'equipment_label', ...colOptions.map(o => String(o.id))];
      const csvRows = data.map(row =>
        headers.map(h => {
          const val = row[h];
          return escapeCsv(val == null ? '' : String(val));
        }).join(',')
      );
      const csv = [headers.join(','), ...csvRows].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `filter-matrix-${activeTab.toLowerCase()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${data.length} equipment rows as CSV`);
    } catch (err) {
      console.error('Failed to download CSV:', err);
      toast.error('Failed to download CSV');
    }
  }, [buildExportData, colOptions, activeTab]);

  const handleImport = useCallback(async () => {
    if (!importText.trim()) { toast.error('Paste data first'); return; }

    setImporting(true);
    setImportResult(null);

    try {
      const firstLine = importText.split('\n')[0];
      const isTsv = firstLine.includes('\t');
      const delimiter = isTsv ? '\t' : ',';

      const lines = importText.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast.error('Need at least a header row and one data row'); setImporting(false); return; }

      const parseRow = (line: string): string[] => {
        const cells: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
            else { inQuotes = !inQuotes; }
          } else if (ch === delimiter && !inQuotes) {
            cells.push(current.trim());
            current = '';
          } else {
            current += ch;
          }
        }
        cells.push(current.trim());
        return cells;
      };

      const headerCells = parseRow(lines[0]);
      const equipmentIdIdx = headerCells.findIndex(h => h.toLowerCase() === 'equipment_id');
      if (equipmentIdIdx < 0) { toast.error('Missing equipment_id column'); setImporting(false); return; }

      const optionColumns = headerCells
        .map((h, idx) => ({ header: h, idx }))
        .filter(({ header }) => header.toLowerCase() !== 'equipment_id' && header.toLowerCase() !== 'equipment_label');

      let updated = 0;
      const errors: string[] = [];

      for (let lineIdx = 1; lineIdx < lines.length; lineIdx++) {
        const cells = parseRow(lines[lineIdx]);
        const equipmentId = cells[equipmentIdIdx]?.trim();
        if (!equipmentId) continue;

        const equipmentRow = allRows.find(r => String(r.id) === equipmentId);
        if (!equipmentRow) {
          errors.push(`Row ${lineIdx + 1}: Equipment "${equipmentId}" not found`);
          continue;
        }

        const checkedOptions: string[] = [];
        optionColumns.forEach(({ header, idx }) => {
          const cellVal = cells[idx]?.trim();
          if (cellVal === '1' || cellVal === 'true' || cellVal === 'yes' || cellVal === 'checked') {
            checkedOptions.push(header);
          }
        });

        const currentVal = getConstraintArray(equipmentRow, importTargetTab);
        const newVal = checkedOptions.length > 0 ? checkedOptions : null;
        if (JSON.stringify(currentVal) !== JSON.stringify(newVal)) {
          updateRow(equipmentId, setConstraintArray(equipmentRow, importTargetTab, newVal));
          updated++;
        }
      }

      setImportResult({ updated, errors });
      if (updated > 0) {
        toast.success(`Import complete: ${updated} equipment rows updated`);
      } else if (errors.length > 0) {
        toast.error(`Import completed with ${errors.length} errors`);
      } else {
        toast('No changes to import');
      }
    } catch (err) {
      console.error('Import failed:', err);
      toast.error('Failed to import data');
      setImportResult({ updated: 0, errors: [String(err)] });
    } finally {
      setImporting(false);
    }
  }, [importText, importTargetTab, allRows]);

  useEffect(() => {
    if (showImportModal) {
      setImportTargetTab(activeTab);
      setImportText('');
      setImportResult(null);
    }
  }, [showImportModal, activeTab]);

  const totalEquipment = rows.length;
  const nullCount = rows.filter(isNullField).length;
  const activeEquipment = totalEquipment - nullCount;
  const totalCells = activeEquipment * colOptions.length;
  const checkedCells = rows.reduce((sum, row) => sum + getCheckedCount(row), 0);

  const renderEquipmentRow = (row: Record<string, unknown>) => {
    const nulled = isNullField(row);
    const count = getCheckedCount(row);
    const total = colOptions.length;
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
      <tr key={String(row.id)} className="border-b hover:bg-gray-50">
        <td className="px-3 py-1.5 font-medium text-gray-800 sticky left-0 bg-white whitespace-nowrap z-10">
          {String(row.label)}
          {Boolean(row.is_attachment) && <span className="ml-1 text-xs text-purple-500">(att)</span>}
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
          <td
            key={String(col.id)}
            className={`p-0 text-center cursor-pointer select-none ${nulled ? 'opacity-20 cursor-default' : isChecked(row, String(col.id)) ? 'bg-blue-100' : 'hover:bg-blue-50'}`}
            onClick={() => { if (!nulled) toggleCell(row, String(col.id)); }}
          >
            <input
              type="checkbox"
              checked={isChecked(row, String(col.id))}
              onChange={() => toggleCell(row, String(col.id))}
              disabled={nulled}
              className={`w-5 h-5 rounded pointer-events-none ${nulled ? 'opacity-20' : 'text-blue-600'}`}
              tabIndex={-1}
            />
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
  };

  const renderColumnHeaders = (isSticky: boolean) => (
    <tr className={isSticky ? 'bg-gray-50 border-b' : 'bg-gray-50 border-b border-t-2 border-t-gray-300'}>
      <th className={`px-3 py-2 text-left font-medium text-gray-600 sticky left-0 ${isSticky ? 'bg-gray-50 z-10' : 'bg-gray-50 z-10'} min-w-[180px]`}>Equipment</th>
      <th className="px-2 py-2 text-center font-medium text-gray-400 min-w-[44px]">N/A</th>
      <th className="px-2 py-2 text-center font-medium text-blue-500 min-w-[50px]">Count</th>
      {colOptions.map((col) => (
        <th key={String(col.id)} className="px-2 py-2 text-center font-medium text-gray-600 min-w-[80px] whitespace-nowrap" title={String(col.id)}>
          {String(col.label)}
        </th>
      ))}
      <th className="px-2 py-2 text-center font-medium text-gray-400 min-w-[120px]">Quick</th>
    </tr>
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 mb-1">Filter Matrix Editor</h1>
          <p className="text-sm text-gray-500">
            Configure modifier constraints for each piece of equipment.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            title="Import modifier constraints from pasted data"
          >
            <span>📥</span>
            Import
          </button>
        </div>
      </div>

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

        <div className="ml-auto flex gap-3 text-xs text-gray-500">
          <span>{totalEquipment} equipment</span>
          <span>{colOptions.length} options</span>
          <span className="font-medium text-blue-600">
            {checkedCells}/{totalCells} enabled ({totalCells > 0 ? Math.round((checkedCells / totalCells) * 100) : 0}%)
          </span>
          {nullCount > 0 && <span className="text-amber-600">{nullCount} N/A</span>}
        </div>
      </div>

      {/* Two-tier Tab Bar */}
      <div className="mb-4 flex flex-col gap-1">
        {/* Top bar: group selector */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 justify-center" style={{ width: '600px' }}>
          {TAB_GROUPS.map((group) => {
            const isActive = group.tabs.some(t => t.key === activeTab);
            return (
              <button
                key={group.group}
                onClick={() => { if (!isActive) setActiveTab(group.tabs[0].key); }}
                className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap text-center ${
                  isActive
                    ? 'bg-blue-400 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {group.group}
              </button>
            );
          })}
        </div>
        {/* Bottom bar: table selector within active group */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 justify-center" style={{ width: '600px' }}>
          {TAB_GROUPS.find(g => g.tabs.some(t => t.key === activeTab))?.tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap text-center ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table Description */}
      {currentSchema?.description && (
        <div className="mb-4 border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
          <button
            onClick={() => setDescriptionExpanded(!descriptionExpanded)}
            className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700">
              About {currentSchema.label}
            </span>
            <span className="text-gray-400 text-xs">
              {descriptionExpanded ? '▼' : '▶'}
            </span>
          </button>
          {descriptionExpanded && (
            <div className="px-4 py-3 border-t border-gray-200 bg-white">
              <div className="text-sm text-gray-600 whitespace-pre-wrap">
                {renderMarkdown(currentSchema.description)}
              </div>
            </div>
          )}
        </div>
      )}

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
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="text-xs">
            <thead className="bg-gray-50 border-b">
              {renderColumnHeaders(true)}
            </thead>
            <tbody>
              {groupedRows.map((group, groupIdx) => (
                <React.Fragment key={group.categoryId}>
                  {groupIdx > 0 && renderColumnHeaders(false)}
                  <tr className="bg-gray-100 border-b">
                    <td
                      colSpan={colOptions.length + 4}
                      className="px-3 py-1.5 font-bold text-gray-700 text-xs uppercase tracking-wide sticky left-0 bg-gray-100 z-10"
                    >
                      {group.categoryLabel}
                      <span className="ml-2 font-normal text-gray-400 normal-case tracking-normal">({group.rows.length})</span>
                    </td>
                  </tr>
                  {group.rows.map(renderEquipmentRow)}
                </React.Fragment>
              ))}
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

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Import Filter Matrix</h2>
              <button onClick={() => { setShowImportModal(false); setImportText(''); setImportResult(null); }} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Import to:</label>
                <select
                  value={importTargetTab}
                  onChange={(e) => setImportTargetTab(e.target.value as MatrixTab)}
                  className="w-full px-3 py-2 border rounded bg-white border-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TAB_GROUPS.map(group => (
                    <optgroup key={group.group} label={group.group}>
                      {group.tabs.map(tab => (
                        <option key={tab.key} value={tab.key}>{tab.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Paste CSV/TSV data:</label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full h-48 px-3 py-2 border rounded font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="equipment_id	equipment_label	OPTION_ID_1	OPTION_ID_2&#10;EQUIP_1	Equipment Name	1	0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format: First row is headers (<code className="bg-gray-100 px-1 rounded">equipment_id</code>, <code className="bg-gray-100 px-1 rounded">equipment_label</code>, then option IDs).
                  <br />
                  Values: <code className="bg-gray-100 px-1 rounded">1</code> or <code className="bg-gray-100 px-1 rounded">true</code> = checked, <code className="bg-gray-100 px-1 rounded">0</code> or <code className="bg-gray-100 px-1 rounded">false</code> = unchecked.
                </p>
              </div>
              {importResult && (
                <div className={`p-3 rounded-lg text-sm ${importResult.errors.length > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                  <div className="font-medium mb-1">{importResult.updated} equipment rows updated</div>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-medium text-yellow-700">{importResult.errors.length} errors:</div>
                      <ul className="mt-1 text-xs text-yellow-600 list-disc list-inside space-y-0.5 max-h-32 overflow-y-auto">
                        {importResult.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                onClick={() => { setShowImportModal(false); setImportText(''); setImportResult(null); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importing || !importText.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
