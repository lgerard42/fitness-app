/**
 * Table Visibility tab: grid of motions × modifier tables.
 * Each cell is a checkbox: checked = show that table in Matrix V2 Config for that motion.
 * Supports save (with confirm), import, and export (TRUE/FALSE per cell).
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../../api';
import toast from 'react-hot-toast';
import type { MatrixConfigRow, MatrixConfigJson, TableConfig, ModifierTableKey } from '../../../../shared/types/matrixV2';
import { MODIFIER_TABLE_KEYS } from '../../../../shared/types/matrixV2';

const MODIFIER_TABLE_KEYS_ARR = [...MODIFIER_TABLE_KEYS];

const MODIFIER_TABLE_LABELS: Record<string, string> = {
  motionPaths: 'Motion Paths',
  torsoAngles: 'Torso Angles',
  torsoOrientations: 'Torso Orientations',
  resistanceOrigin: 'Resistance Origin',
  grips: 'Grips',
  gripWidths: 'Grip Widths',
  elbowRelationship: 'Elbow Relationship',
  executionStyles: 'Execution Styles',
  footPositions: 'Foot Positions',
  stanceWidths: 'Stance Widths',
  stanceTypes: 'Stance Types',
  loadPlacement: 'Load Placement',
  supportStructures: 'Support Structures',
  loadingAids: 'Loading Aids',
  rangeOfMotion: 'Range of Motion',
};

const MODIFIER_TABLE_GROUPS: Array<{ label: string; tables: ModifierTableKey[] }> = [
  { label: 'Trajectory & Posture', tables: ['motionPaths', 'torsoAngles', 'torsoOrientations', 'resistanceOrigin'] },
  { label: 'Upper Body Mechanics', tables: ['grips', 'gripWidths', 'elbowRelationship', 'executionStyles'] },
  { label: 'Lower Body Mechanics', tables: ['footPositions', 'stanceWidths', 'stanceTypes', 'loadPlacement'] },
  { label: 'Execution Variables', tables: ['supportStructures', 'loadingAids', 'rangeOfMotion'] },
];

function emptyTableConfig(): TableConfig {
  return {
    applicability: false,
    allowed_row_ids: [],
    default_row_id: null,
    null_noop_allowed: false,
  };
}

/** Grid: motionId -> tableKey -> boolean (show table in V2 Config). Default true when missing. */
export type VisibilityGrid = Record<string, Record<string, boolean>>;

interface MotionForPanel {
  id: string;
  label: string;
  parent_id?: string | null;
}

interface TableVisibilityPanelProps {
  motions: MotionForPanel[];
  onDataChange?: () => void;
}

/** Get the config we edit for a motion: draft if exists, else active. */
function getEditingConfigForMotion(configs: MatrixConfigRow[], motionId: string): MatrixConfigRow | null {
  const forMotion = configs.filter(c => c.scope_type === 'motion' && c.scope_id === motionId);
  const draft = forMotion.find(c => c.status === 'draft');
  const active = forMotion.find(c => c.status === 'active');
  return draft ?? active ?? null;
}

/** Build initial grid from configs. Missing table key => true (show). */
function buildGridFromConfigs(configs: MatrixConfigRow[], motionIds: string[]): VisibilityGrid {
  const grid: VisibilityGrid = {};
  for (const motionId of motionIds) {
    grid[motionId] = {};
    const cfg = getEditingConfigForMotion(configs, motionId);
    const tables = (cfg?.config_json as MatrixConfigJson | undefined)?.tables;
    for (const tableKey of MODIFIER_TABLE_KEYS_ARR) {
      const tc = tables?.[tableKey as ModifierTableKey];
      grid[motionId][tableKey] = tc?.applicability ?? true;
    }
  }
  return grid;
}

export default function TableVisibilityPanel({ motions, onDataChange }: TableVisibilityPanelProps) {
  const [configs, setConfigs] = useState<MatrixConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [grid, setGrid] = useState<VisibilityGrid>({});
  const [initialGrid, setInitialGrid] = useState<VisibilityGrid>({});
  const [saving, setSaving] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  // Import wizard (match Matrix V2 Config)
  type ImportStep = 'source' | 'input' | 'column_map' | 'review' | 'importing';
  type ImportSourceMode = 'json' | 'csv' | 'paste';
  type ImportParsedRow = { motionId: string; motionLabel: string; cellsByHeader: Record<string, string>; valid: boolean; skipReason?: string };
  type ImportColumnMappingEntry = { header: string; tableKey: string; include: 'import' | 'exclude' };
  const [importStep, setImportStep] = useState<ImportStep>('source');
  const [importSourceMode, setImportSourceMode] = useState<ImportSourceMode>('paste');
  const [importParsedRows, setImportParsedRows] = useState<ImportParsedRow[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importColumnMapping, setImportColumnMapping] = useState<ImportColumnMappingEntry[]>([]);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string; details?: string[] } | null>(null);
  const [selectedColumnIndices, setSelectedColumnIndices] = useState<Set<number>>(new Set());
  const [bulkColumnAction, setBulkColumnAction] = useState<'import' | 'exclude'>('import');

  const motionIds = useMemo(() => motions.map(m => m.id), [motions]);

  /** Motions sorted alphabetically with parents first, children indented underneath (supports multiple levels). */
  const sortedMotionsWithIndent = useMemo(() => {
    const roots = motions.filter(m => !m.parent_id || m.parent_id === '');
    const byParent = new Map<string, MotionForPanel[]>();
    motions.forEach(m => {
      const pid = m.parent_id && String(m.parent_id).trim();
      if (pid) {
        if (!byParent.has(pid)) byParent.set(pid, []);
        byParent.get(pid)!.push(m);
      }
    });
    const result: Array<{ motion: MotionForPanel; indentLevel: number }> = [];
    const seen = new Set<string>();
    const add = (parentId: string | null, level: number) => {
      const list = parentId === null ? roots : byParent.get(parentId) ?? [];
      const sorted = [...list].sort((a, b) => String(a.label).localeCompare(String(b.label)));
      sorted.forEach(m => {
        if (seen.has(m.id)) return;
        seen.add(m.id);
        result.push({ motion: m, indentLevel: level });
        add(m.id, level + 1);
      });
    };
    add(null, 0);
    const orphans = motions.filter(m => !seen.has(m.id)).sort((a, b) => String(a.label).localeCompare(String(b.label)));
    orphans.forEach(m => result.push({ motion: m, indentLevel: 0 }));
    return result;
  }, [motions]);

  const loadConfigs = useCallback(async () => {
    try {
      await api.ensureDraftsForAllMotions();
      const list = await api.listMatrixConfigs();
      setConfigs(Array.isArray(list) ? list : []);
      const next = buildGridFromConfigs(Array.isArray(list) ? list : [], motionIds);
      setGrid(next);
      setInitialGrid(JSON.parse(JSON.stringify(next)));
    } catch (err) {
      console.error('Table visibility load failed:', err);
      toast.error('Failed to load configs');
    } finally {
      setLoading(false);
    }
  }, [motionIds.join(',')]);

  useEffect(() => {
    setLoading(true);
    loadConfigs();
  }, [loadConfigs]);

  const dirty = useMemo(() => {
    for (const motionId of motionIds) {
      const a = initialGrid[motionId];
      const b = grid[motionId];
      if (!a && !b) continue;
      for (const tk of MODIFIER_TABLE_KEYS_ARR) {
        if ((a?.[tk] ?? true) !== (b?.[tk] ?? true)) return true;
      }
    }
    return false;
  }, [grid, initialGrid, motionIds]);

  const toggle = useCallback((motionId: string, tableKey: string) => {
    setGrid(prev => ({
      ...prev,
      [motionId]: {
        ...(prev[motionId] ?? {}),
        [tableKey]: !(prev[motionId]?.[tableKey] ?? true),
      },
    }));
  }, []);

  const getValue = useCallback((motionId: string, tableKey: string): boolean => {
    return grid[motionId]?.[tableKey] ?? true;
  }, [grid]);

  const handleSaveClick = useCallback(() => {
    if (!dirty) return;
    setShowSaveConfirm(true);
  }, [dirty]);

  const handleSaveConfirm = useCallback(async () => {
    setShowSaveConfirm(false);
    if (!dirty) return;
    setSaving(true);
    try {
      let updated = 0;
      for (const motionId of motionIds) {
        const cur = grid[motionId] ?? {};
        const init = initialGrid[motionId] ?? {};
        const hasChange = MODIFIER_TABLE_KEYS_ARR.some(tk => (cur[tk] ?? true) !== (init[tk] ?? true));
        if (!hasChange) continue;

        const cfg = getEditingConfigForMotion(configs, motionId);
        if (!cfg) {
          toast.error(`No config for motion ${motionId}`);
          continue;
        }
        const json = JSON.parse(JSON.stringify(cfg.config_json)) as MatrixConfigJson;
        if (!json.tables) json.tables = {};
        for (const tableKey of MODIFIER_TABLE_KEYS_ARR) {
          const apply = cur[tableKey] ?? true;
          if (!json.tables[tableKey as ModifierTableKey]) {
            json.tables[tableKey as ModifierTableKey] = { ...emptyTableConfig(), applicability: apply };
          } else {
            json.tables[tableKey as ModifierTableKey]!.applicability = apply;
          }
        }
        await api.updateMatrixConfig(cfg.id, { config_json: json });
        updated++;
      }
      if (updated > 0) {
        toast.success(`Saved table visibility for ${updated} motion(s).`);
        await loadConfigs();
        onDataChange?.();
      }
    } catch (err) {
      console.error('Save failed:', err);
      toast.error('Failed to save table visibility');
    } finally {
      setSaving(false);
    }
  }, [dirty, grid, initialGrid, configs, motionIds, loadConfigs, onDataChange]);

  const motionIdsSet = useMemo(() => new Set(motionIds), [motionIds]);

  const generateTableExport = useCallback(() => {
    const header = ['motion_id', 'motion_label', ...MODIFIER_TABLE_KEYS_ARR];
    const rows = sortedMotionsWithIndent.map(({ motion }) => {
      const vals = MODIFIER_TABLE_KEYS_ARR.map(tk => getValue(motion.id, tk) ? 'TRUE' : 'FALSE');
      return [motion.id, motion.label, ...vals];
    });
    return { header, rows };
  }, [sortedMotionsWithIndent, getValue]);

  const handleExportJson = useCallback(() => {
    const { rows } = generateTableExport();
    const header = ['motion_id', 'motion_label', ...MODIFIER_TABLE_KEYS_ARR];
    const arr = rows.map(cells => {
      const obj: Record<string, string | boolean> = {};
      header.forEach((h, i) => {
        const v = cells[i];
        obj[h] = (h === 'motion_id' || h === 'motion_label') ? v : (v === 'TRUE');
      });
      return obj;
    });
    const blob = new Blob([JSON.stringify(arr, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'table-visibility.json';
    a.click();
    URL.revokeObjectURL(a.href);
    setShowExportModal(false);
    toast.success('Exported as JSON');
  }, [generateTableExport]);

  const handleExportTable = useCallback(() => {
    const { header, rows } = generateTableExport();
    const tsv = [header.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    const blob = new Blob([tsv], { type: 'text/tab-separated-values' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'table-visibility.tsv';
    a.click();
    URL.revokeObjectURL(a.href);
    setShowExportModal(false);
    toast.success('Exported as TSV');
  }, [generateTableExport]);

  const handleCopyTable = useCallback(async () => {
    const { header, rows } = generateTableExport();
    const tsv = [header.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    try {
      await navigator.clipboard.writeText(tsv);
      setShowExportModal(false);
      toast.success('Table copied to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  }, [generateTableExport]);

  const parseTableImport = useCallback((text: string): { rows: ImportParsedRow[]; headers: string[] } => {
    const lines = text.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) throw new Error('Need at least header and one data row');
    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim());
    const motionIdIdx = headers.findIndex(h => h === 'motion_id' || h.toLowerCase() === 'motion_id');
    const motionLabelIdx = headers.findIndex(h => h === 'motion_label' || h.toLowerCase() === 'motion_label');
    if (motionIdIdx < 0) throw new Error('Missing motion_id column');
    const rows: ImportParsedRow[] = lines.slice(1).map(line => {
      const cells = line.split(delimiter).map(c => c.trim());
      const motionId = cells[motionIdIdx] || '';
      const motionLabel = motionLabelIdx >= 0 ? cells[motionLabelIdx] || '' : '';
      const exists = motionIdsSet.has(motionId);
      const cellsByHeader: Record<string, string> = {};
      headers.forEach((h, i) => { cellsByHeader[h] = cells[i] ?? ''; });
      return {
        motionId,
        motionLabel,
        cellsByHeader,
        valid: !!motionId && exists,
        skipReason: !motionId ? 'Empty motion_id' : !exists ? `Motion "${motionId}" not found` : undefined,
      };
    });
    return { rows, headers };
  }, [motionIdsSet]);

  const autoDetectTableKey = useCallback((header: string): string => {
    const h = header.trim();
    if (MODIFIER_TABLE_KEYS_ARR.includes(h)) return h;
    const lower = h.toLowerCase();
    const match = MODIFIER_TABLE_KEYS_ARR.find(tk => tk.toLowerCase() === lower);
    return match || '';
  }, []);

  const applyImportFromParsedRows = useCallback(() => {
    const validRows = importParsedRows.filter(r => r.valid);
    const updates: VisibilityGrid = {};
    for (const row of validRows) {
      const rowData: Record<string, boolean> = {};
      for (const entry of importColumnMapping) {
        if (entry.include !== 'import' || !entry.tableKey || !MODIFIER_TABLE_KEYS_ARR.includes(entry.tableKey)) continue;
        const raw = row.cellsByHeader[entry.header];
        if (raw === undefined) continue;
        const val = String(raw).toUpperCase();
        rowData[entry.tableKey] = val === 'TRUE' || val === '1' || val === 'YES';
      }
      if (Object.keys(rowData).length > 0) {
        updates[row.motionId] = { ...(grid[row.motionId] ?? {}), ...rowData };
      }
    }
    setGrid(prev => {
      const next = { ...prev };
      for (const [mid, row] of Object.entries(updates)) {
        next[mid] = { ...(next[mid] ?? {}), ...row };
      }
      return next;
    });
    setImportResult({ success: true, message: `Imported visibility for ${Object.keys(updates).length} motion(s). Save to apply.` });
    setImportStep('importing');
  }, [importParsedRows, importColumnMapping, grid]);

  const handleImportJsonFile = useCallback((json: unknown) => {
    setImporting(true);
    try {
      const arr = Array.isArray(json) ? json : (json && typeof json === 'object' && 'rows' in json) ? (json as { rows: unknown[] }).rows : null;
      if (!Array.isArray(arr) || arr.length === 0) {
        setImportResult({ success: false, message: 'JSON must be an array of row objects or { rows: [...] }' });
        setImportStep('importing');
        return;
      }
      const updates: VisibilityGrid = {};
      for (const item of arr) {
        if (!item || typeof item !== 'object') continue;
        const rec = item as Record<string, unknown>;
        const motionId = String(rec.motion_id ?? rec.motionId ?? '');
        if (!motionId || !motionIdsSet.has(motionId)) continue;
        const rowData: Record<string, boolean> = {};
        for (const tk of MODIFIER_TABLE_KEYS_ARR) {
          const v = rec[tk];
          if (v === undefined) continue;
          rowData[tk] = v === true || v === 'true' || v === 'TRUE' || v === 1 || v === '1';
        }
        if (Object.keys(rowData).length > 0) updates[motionId] = { ...(grid[motionId] ?? {}), ...rowData };
      }
      setGrid(prev => {
        const next = { ...prev };
        for (const [mid, row] of Object.entries(updates)) {
          next[mid] = { ...(next[mid] ?? {}), ...row };
        }
        return next;
      });
      setImportResult({ success: true, message: `Imported visibility for ${Object.keys(updates).length} motion(s). Save to apply.` });
    } catch (err: any) {
      setImportResult({ success: false, message: err.message || 'Invalid JSON' });
    }
    setImportStep('importing');
    setImporting(false);
  }, [motionIdsSet, grid]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-gray-500">
        Loading table visibility...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b border-gray-200 bg-white">
        <span className="text-sm text-gray-600">
          Check = show this modifier table in Matrix V2 Config for that motion. Uncheck = hide.
        </span>
        {dirty && (
          <span className="text-amber-600 text-sm font-medium">Unsaved changes</span>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setShowExportModal(true)}
          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
        >
          Export
        </button>
        <button
          type="button"
          onClick={() => { setShowImportModal(true); setImportStep('source'); setImportParsedRows([]); setImportResult(null); setImportText(''); setImportHeaders([]); setImportColumnMapping([]); }}
          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
        >
          Import
        </button>
        <button
          type="button"
          onClick={handleSaveClick}
          disabled={!dirty || saving}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-4 w-96 space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Export Table Visibility</h3>
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleExportJson}
                className="w-full text-left text-xs border border-gray-200 rounded p-2 hover:bg-gray-50"
              >
                <div className="font-medium text-gray-800">Full JSON</div>
                <div className="text-gray-500 mt-0.5">Download visibility grid as JSON file</div>
              </button>
              <button
                type="button"
                onClick={handleExportTable}
                className="w-full text-left text-xs border border-gray-200 rounded p-2 hover:bg-gray-50"
              >
                <div className="font-medium text-gray-800">Table (TSV)</div>
                <div className="text-gray-500 mt-0.5">Download motion × table visibility for Excel</div>
              </button>
              <button
                type="button"
                onClick={handleCopyTable}
                className="w-full text-left text-xs border border-gray-200 rounded p-2 hover:bg-blue-50"
              >
                <div className="font-medium text-blue-800">Copy Table to Clipboard</div>
                <div className="text-blue-600 mt-0.5">Tab-separated, paste directly into Excel</div>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowExportModal(false)}
              className="w-full text-xs text-gray-500 hover:text-gray-700 py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden inline-block min-w-full">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {MODIFIER_TABLE_GROUPS.map((group, idx) => (
                  <th
                    key={`g-${idx}`}
                    colSpan={group.tables.length}
                    className="px-2 py-1 text-center text-[10px] font-semibold text-gray-600 uppercase border-r border-gray-200 last:border-r-0 bg-gray-100"
                  >
                    {group.label}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="sticky left-0 z-20 bg-gray-50 px-2 py-1.5 text-left text-xs font-semibold text-gray-700 border-r border-gray-200 min-w-[200px]">
                  Motion
                </th>
                {MODIFIER_TABLE_KEYS_ARR.map(tk => (
                  <th
                    key={tk}
                    className="px-2 py-1.5 text-center text-xs font-semibold text-gray-700 border-r border-gray-200 last:border-r-0 min-w-[90px]"
                  >
                    {MODIFIER_TABLE_LABELS[tk] || tk}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedMotionsWithIndent.map(({ motion, indentLevel }) => (
                <tr key={motion.id} className="hover:bg-gray-50">
                  <td
                    className="sticky left-0 z-10 px-2 py-1 border-r border-gray-200 bg-white font-medium text-gray-900 text-xs"
                    style={{ paddingLeft: `${8 + indentLevel * 20}px` }}
                  >
                    {motion.label}
                  </td>
                  {MODIFIER_TABLE_KEYS_ARR.map(tableKey => (
                    <td
                      key={tableKey}
                      className="px-2 py-1 text-center border-r border-gray-200 last:border-r-0"
                    >
                      <input
                        type="checkbox"
                        checked={getValue(motion.id, tableKey)}
                        onChange={() => toggle(motion.id, tableKey)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showSaveConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md shadow-xl">
            <h3 className="font-bold text-gray-800 mb-2">Save table visibility?</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will update the Matrix V2 Config for each motion with changed checkboxes. Verify your changes before saving.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSaveConfirm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveConfirm}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Wizard Modal */}
      {showImportModal && (() => {
        const validRows = importParsedRows.filter(r => r.valid);
        const skippedRows = importParsedRows.filter(r => !r.valid);
        const importableCount = validRows.length;
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">
                  {importStep === 'source' ? 'Import Table Visibility' : importStep === 'input' ? (importSourceMode === 'json' ? 'Upload JSON' : importSourceMode === 'csv' ? 'Upload CSV / TSV' : 'Paste Table Data') : importStep === 'column_map' ? 'Map Import Columns' : importStep === 'review' ? 'Review & Apply' : 'Importing'}
                </h3>
                {importStep !== 'importing' && (
                  <button type="button" onClick={() => { setShowImportModal(false); setImportText(''); }} className="text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
                )}
              </div>
              <div className="px-6 py-5 overflow-y-auto flex-1">
                {importStep === 'source' && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">Choose how you want to import data.</p>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => { setImportSourceMode('json'); setImportStep('input'); }}
                        className="p-4 border-2 rounded-lg text-left hover:border-blue-400 transition-colors border-gray-200"
                      >
                        <div className="font-semibold text-gray-800 text-sm">Full JSON</div>
                        <p className="text-xs text-gray-500 mt-1">Upload a JSON file (array of rows or {"{ rows: [...] }"})</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setImportSourceMode('csv'); setImportStep('input'); }}
                        className="p-4 border-2 rounded-lg text-left hover:border-blue-400 transition-colors border-gray-200"
                      >
                        <div className="font-semibold text-gray-800 text-sm">CSV / TSV File</div>
                        <p className="text-xs text-gray-500 mt-1">Upload a delimited table file</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setImportSourceMode('paste'); setImportStep('input'); }}
                        className="p-4 border-2 rounded-lg text-left hover:border-blue-400 transition-colors border-gray-200"
                      >
                        <div className="font-semibold text-gray-800 text-sm">Paste Table</div>
                        <p className="text-xs text-gray-500 mt-1">Paste tab- or comma-separated data</p>
                      </button>
                    </div>
                  </div>
                )}

                {importStep === 'input' && importSourceMode === 'json' && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">Select a JSON file. Expected: array of objects with motion_id and modifier table keys (true/false), or {"{ rows: [...] }"}.</p>
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center cursor-pointer hover:border-blue-400 transition-colors"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.json';
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (!file) return;
                          const text = await file.text();
                          try {
                            const data = JSON.parse(text);
                            handleImportJsonFile(data);
                          } catch (err: any) {
                            setImportResult({ success: false, message: err.message || 'Invalid JSON' });
                            setImportStep('importing');
                          }
                        };
                        input.click();
                      }}
                    >
                      <p className="text-gray-600 font-medium">Click to choose JSON file</p>
                      <p className="text-xs text-gray-400 mt-1">.json only</p>
                    </div>
                  </div>
                )}

                {importStep === 'input' && (importSourceMode === 'csv' || importSourceMode === 'paste') && (
                  <div className="space-y-4">
                    {importSourceMode === 'csv' ? (
                      <>
                        <p className="text-sm text-gray-500">Upload CSV, TSV, or delimited file. Required: motion_id. Optional: motion_label, then modifier table columns (TRUE/FALSE).</p>
                        <div
                          className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center cursor-pointer hover:border-blue-400 transition-colors"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = '.csv,.tsv,.txt';
                            input.onchange = async (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (!file) return;
                              const text = await file.text();
                              try {
                                const { rows, headers } = parseTableImport(text);
                                setImportParsedRows(rows);
                                setImportHeaders(headers);
                                const reserved = new Set(['motion_id', 'motion_label']);
                                setImportColumnMapping(headers.map(h => {
                                  const tableKey = reserved.has(h.toLowerCase()) ? '' : autoDetectTableKey(h);
                                  return { header: h, tableKey, include: tableKey ? 'import' as const : 'exclude' as const };
                                }));
                                setSelectedColumnIndices(new Set());
                                setImportStep('column_map');
                              } catch (err: any) {
                                toast.error(err.message || 'Parse failed');
                              }
                            };
                            input.click();
                          }}
                        >
                          <p className="text-gray-600 font-medium">Click to choose file</p>
                          <p className="text-xs text-gray-400 mt-1">.csv, .tsv, or .txt</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-gray-500">Paste tab- or comma-separated data. First row = headers (motion_id required, then modifier table columns). Values: TRUE/FALSE, 1/0, or YES/NO.</p>
                        <textarea
                          value={importText}
                          onChange={e => setImportText(e.target.value)}
                          placeholder="motion_id\tmotion_label\tmotionPaths\tgrips\t...\nPRESS_FLAT\ta\tTRUE\tFALSE\t..."
                          className="w-full h-48 border border-gray-300 rounded-lg p-3 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              const { rows, headers } = parseTableImport(importText);
                              setImportParsedRows(rows);
                              setImportHeaders(headers);
                              const reserved = new Set(['motion_id', 'motion_label']);
                              setImportColumnMapping(headers.map(h => {
                                const tableKey = reserved.has(h.toLowerCase()) ? '' : autoDetectTableKey(h);
                                return { header: h, tableKey, include: tableKey ? 'import' : 'exclude' };
                              }));
                              setSelectedColumnIndices(new Set());
                              setImportStep('column_map');
                            } catch (err: any) {
                              toast.error((err as Error).message || 'Parse failed');
                            }
                          }}
                          disabled={!importText.trim()}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 text-sm font-medium"
                        >
                          Parse Data
                        </button>
                      </>
                    )}
                  </div>
                )}

                {importStep === 'column_map' && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">Map each import column to a modifier table. Excluded columns are not applied.</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-medium text-gray-600">Bulk select:</span>
                      <select
                        value={bulkColumnAction}
                        onChange={e => setBulkColumnAction(e.target.value as 'import' | 'exclude')}
                        className="border border-gray-300 rounded px-2 py-1 text-xs"
                      >
                        <option value="import">Import</option>
                        <option value="exclude">Exclude</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedColumnIndices.size === 0) return;
                          setImportColumnMapping(prev => prev.map((entry, i) =>
                            selectedColumnIndices.has(i) ? { ...entry, include: bulkColumnAction } : entry
                          ));
                          setSelectedColumnIndices(new Set());
                        }}
                        disabled={selectedColumnIndices.size === 0}
                        className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded text-xs font-medium hover:bg-gray-300 disabled:opacity-50"
                      >
                        Apply to selected ({selectedColumnIndices.size})
                      </button>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 text-left text-gray-500 uppercase tracking-wider text-[10px]">
                            <th className="px-2 py-2 w-10">Select</th>
                            <th className="px-3 py-2">Import column</th>
                            <th className="px-3 py-2">Map to</th>
                            <th className="px-3 py-2">Import / Exclude</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importColumnMapping.map((entry, idx) => (
                            <tr key={idx} className={`border-t ${entry.include === 'exclude' ? 'bg-gray-100 opacity-75' : ''}`}>
                              <td className="px-2 py-2">
                                <input
                                  type="checkbox"
                                  checked={selectedColumnIndices.has(idx)}
                                  onChange={e => {
                                    setSelectedColumnIndices(prev => {
                                      const next = new Set(prev);
                                      if (e.target.checked) next.add(idx); else next.delete(idx);
                                      return next;
                                    });
                                  }}
                                  className="rounded border-gray-300"
                                />
                              </td>
                              <td className="px-3 py-2 font-mono text-gray-800">{entry.header}</td>
                              <td className="px-3 py-2">
                                <select
                                  value={entry.tableKey}
                                  onChange={e => setImportColumnMapping(prev => prev.map((e2, i) => i === idx ? { ...e2, tableKey: e.target.value } : e2))}
                                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs disabled:opacity-60"
                                  disabled={entry.include === 'exclude'}
                                >
                                  <option value="">— Not mapped —</option>
                                  {MODIFIER_TABLE_KEYS_ARR.map(tk => (
                                    <option key={tk} value={tk}>{MODIFIER_TABLE_LABELS[tk] || tk}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  value={entry.include}
                                  onChange={e => setImportColumnMapping(prev => prev.map((e2, i) => i === idx ? { ...e2, include: e.target.value as 'import' | 'exclude' } : e2))}
                                  className="border border-gray-300 rounded px-2 py-1 text-xs"
                                >
                                  <option value="import">Import</option>
                                  <option value="exclude">Exclude</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {importStep === 'review' && (
                  <div className="space-y-5">
                    <div className="flex gap-3 text-sm flex-wrap">
                      <span className="px-3 py-1 bg-gray-100 rounded-full text-gray-700">{importParsedRows.length} row(s) parsed</span>
                      <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full">{validRows.length} valid</span>
                      {skippedRows.length > 0 && (
                        <span className="px-3 py-1 bg-red-50 text-red-700 rounded-full">{skippedRows.length} skipped</span>
                      )}
                    </div>
                    {skippedRows.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                        <div className="font-medium mb-1">{skippedRows.length} row(s) will be skipped:</div>
                        <ul className="list-disc ml-5 space-y-0.5 text-xs">
                          {skippedRows.map((r, i) => (
                            <li key={i}>{r.skipReason}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {validRows.length > 0 && (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 text-left text-gray-500 uppercase text-[10px]">
                              <th className="px-3 py-2">Motion</th>
                              <th className="px-3 py-2">Visibility columns</th>
                            </tr>
                          </thead>
                          <tbody>
                            {validRows.slice(0, 20).map((row, ri) => (
                              <tr key={ri} className="border-t">
                                <td className="px-3 py-2 font-medium text-gray-800">{row.motionLabel || row.motionId}</td>
                                <td className="px-3 py-2 text-gray-500">
                                  {importColumnMapping.filter(e => e.include === 'import' && e.tableKey).length} table(s) to apply
                                </td>
                              </tr>
                            ))}
                            {validRows.length > 20 && (
                              <tr className="border-t bg-gray-50">
                                <td colSpan={2} className="px-3 py-2 text-gray-500 text-xs">... and {validRows.length - 20} more</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {importStep === 'importing' && (
                  <div className="py-8 space-y-4">
                    {!importResult ? (
                      <div className="text-center">
                        <div className="text-3xl animate-spin inline-block">&#9203;</div>
                        <p className="text-gray-600 mt-2">Importing...</p>
                      </div>
                    ) : (
                      <>
                        <div className="text-center">
                          <div className="text-3xl">{importResult.success ? '✓' : '!'}</div>
                          <p className={`font-semibold text-lg mt-2 ${importResult.success ? 'text-green-700' : 'text-red-700'}`}>
                            {importResult.message}
                          </p>
                        </div>
                        {importResult.details && importResult.details.length > 0 && (
                          <ul className="space-y-1 text-xs text-gray-600">
                            {importResult.details.map((d, i) => (
                              <li key={i}>{d}</li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-lg">
                {importStep !== 'source' && importStep !== 'importing' && (
                  <button
                    type="button"
                    onClick={() => setImportStep(importStep === 'review' ? 'column_map' : importStep === 'column_map' ? 'input' : 'source')}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm font-medium"
                  >
                    Back
                  </button>
                )}
                {importStep === 'column_map' && (
                  <button
                    type="button"
                    onClick={() => setImportStep('review')}
                    className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                  >
                    Continue to Review
                  </button>
                )}
                {importStep === 'review' && (
                  <button
                    type="button"
                    onClick={applyImportFromParsedRows}
                    disabled={importableCount === 0}
                    className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 text-sm font-medium"
                  >
                    Apply Import ({importableCount} row{importableCount !== 1 ? 's' : ''})
                  </button>
                )}
                {importStep === 'importing' && importResult && (
                  <button
                    type="button"
                    onClick={() => { setShowImportModal(false); setImportText(''); }}
                    className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                  >
                    Done
                  </button>
                )}
                {importStep !== 'importing' && (
                  <button
                    type="button"
                    onClick={() => { setShowImportModal(false); setImportText(''); }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
