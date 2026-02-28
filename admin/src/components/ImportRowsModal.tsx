import React, { useState, useMemo, useCallback, useRef } from 'react';
import type { TableSchema, TableField } from '../api';

/* ───────────────────────── types ───────────────────────── */

type SourceMode = 'csv' | 'paste';
type Step = 'source' | 'input' | 'mapping' | 'importing';

interface ColumnMapping {
  sourceIndex: number;
  sourceHeader: string;
  targetField: string;       // schema field name or '__skip__'
  enabled: boolean;
}

interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

interface ImportRowsModalProps {
  schema: TableSchema;
  existingRows: Record<string, unknown>[];
  onImport: (
    rows: Record<string, unknown>[],
    mode: 'upsert' | 'replace',
    opts?: { hardDeleteExisting?: boolean }
  ) => Promise<ImportResult>;
  onClose: () => void;
}

/* ───────────────────── CSV / TSV parser ────────────────── */

function detectDelimiter(text: string): string {
  const firstLine = text.split('\n')[0] || '';
  const tabs = (firstLine.match(/\t/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  const pipes = (firstLine.match(/\|/g) || []).length;
  if (tabs >= commas && tabs >= pipes && tabs > 0) return '\t';
  if (pipes >= commas && pipes > 0) return '|';
  return ',';
}

function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        row.push(current.trim());
        current = '';
      } else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        row.push(current.trim());
        if (row.some(c => c !== '')) rows.push(row);
        row = [];
        current = '';
        if (ch === '\r') i++;
      } else {
        current += ch;
      }
    }
  }
  row.push(current.trim());
  if (row.some(c => c !== '')) rows.push(row);
  return rows;
}

/* ───────────────── type coercion helpers ───────────────── */

/**
 * Try to parse a string that looks like JSON but may have unquoted keys/values.
 * e.g. {default: MID_MID, options: [HIGH_HIGH, MID_MID]}
 */
function parseJsonLike(str: string): object | null {
  let s = str.trim();
  if (!s.startsWith('{') && !s.startsWith('[')) return null;
  // Quote unquoted keys
  s = s.replace(/([{,[\s])([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
  // Quote unquoted string values
  s = s.replace(/(:\s*|[,[\s])(?!"[\d-]|true\b|false\b|null\b|\[|\{)([A-Za-z_][A-Za-z0-9_]*)(?=\s*[,\]}):])/g, '$1"$2"');
  try {
    const out = JSON.parse(s);
    return typeof out === 'object' && out !== null ? out : null;
  } catch {
    return null;
  }
}

function coerceValue(raw: string, field: TableField): unknown {
  if (raw === '' || raw === undefined || raw === null) return undefined;
  switch (field.type) {
    case 'number':
      return Number(raw) || 0;
    case 'boolean':
      return ['true', '1', 'yes', 'TRUE'].includes(raw);
    case 'string[]': {
      let arr: string[];
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) arr = parsed.filter((item): item is string => typeof item === 'string');
        else arr = raw.split(',').map(s => s.trim()).filter(s => s !== '');
      } catch {
        let processed = raw.trim();
        if (processed.startsWith('[') && processed.endsWith(']')) {
          processed = processed.slice(1, -1).trim();
        }
        arr = processed.split(',').map(s => s.trim()).filter(s => s !== '');
      }
      // muscles.upper_lower: case-insensitive, store as UPPER / LOWER
      if (field.name === 'upper_lower') {
        const normalized = arr
          .map((s) => {
            const u = String(s).trim().toUpperCase();
            if (u === 'UPPER' || u === 'UPPER BODY') return 'UPPER';
            if (u === 'LOWER' || u === 'LOWER BODY') return 'LOWER';
            return null;
          })
          .filter((s): s is string => s !== null);
        return [...new Set(normalized)];
      }
      return arr;
    }
    case 'fk[]': {
      // Valid JSON array
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* not valid JSON */ }
      // Bracket-wrapped comma-separated: [ID1, ID2]
      let processed = raw.trim();
      if (processed.startsWith('[') && processed.endsWith(']')) {
        processed = processed.slice(1, -1).trim();
      }
      // Comma-separated string
      return processed.split(',').map(s => s.trim()).filter(s => s !== '');
    }
    case 'json': {
      const trimmed = raw.trim();
      if (!trimmed) return undefined;
      // Valid JSON
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'object' && parsed !== null) return parsed;
      } catch { /* not valid JSON */ }
      // Unquoted JS-like object: {default: MID_MID, options: [HIGH_HIGH]}
      const obj = parseJsonLike(trimmed);
      if (obj) return obj;
      // Can't parse - return empty object rather than a string
      return {};
    }
    default:
      // motions.upper_lower: case-insensitive, store as UPPER / LOWER
      if (field.name === 'upper_lower') {
        const u = raw.trim().toUpperCase();
        if (u === 'UPPER' || u === 'LOWER') return u;
        return raw;
      }
      return raw;
  }
}

/* ────────────── auto-map source cols to schema ─────────── */

function autoMap(sourceHeaders: string[], fields: TableField[]): ColumnMapping[] {
  const fieldNames = fields.map(f => f.name);

  return sourceHeaders.map((header, idx) => {
    const normalised = header.toLowerCase().replace(/[\s_-]+/g, '_');

    // exact match
    let match = fieldNames.find(fn => fn.toLowerCase() === normalised);

    // partial / fuzzy
    if (!match) {
      match = fieldNames.find(fn =>
        normalised.includes(fn.toLowerCase()) || fn.toLowerCase().includes(normalised)
      );
    }

    return {
      sourceIndex: idx,
      sourceHeader: header,
      targetField: match || '__skip__',
      enabled: !!match,
    };
  });
}

/* ═══════════════════ Component ═══════════════════════════ */

export default function ImportRowsModal({ schema, existingRows, onImport, onClose }: ImportRowsModalProps) {
  const [step, setStep] = useState<Step>('source');
  const [sourceMode, setSourceMode] = useState<SourceMode>('csv');

  // raw parsed data
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [hasHeaders, setHasHeaders] = useState(true);

  // paste input
  const [pasteText, setPasteText] = useState('');

  // mapping
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [overwriteEmpty, setOverwriteEmpty] = useState(false);
  const [replaceAll, setReplaceAll] = useState(false);
  const [replaceHardDelete, setReplaceHardDelete] = useState(false);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);

  // results
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const schemaFields = useMemo(() => schema.fields, [schema]);
  const existingById = useMemo(() => {
    const map: Record<string, Record<string, unknown>> = {};
    for (const r of existingRows) {
      const id = r[schema.idField];
      if (typeof id === 'string' || typeof id === 'number') map[String(id)] = r;
    }
    return map;
  }, [existingRows, schema.idField]);

  /* ─── CSV file handler ──────────────────────────────────── */

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const delim = detectDelimiter(text);
      const allRows = parseDelimited(text, delim);
      if (allRows.length < 1) return;

      const headers = allRows[0];
      const dataRows = allRows.slice(1);
      setParsedHeaders(headers);
      setParsedRows(dataRows);
      setHasHeaders(true);
      setMappings(autoMap(headers, schemaFields));
      setStep('mapping');
    };
    reader.readAsText(file);
  }, [schemaFields]);

  /* ─── Paste handler ─────────────────────────────────────── */

  const handleParsePaste = useCallback(() => {
    if (!pasteText.trim()) return;

    const delim = detectDelimiter(pasteText);
    const allRows = parseDelimited(pasteText, delim);
    if (allRows.length < 1) return;

    if (hasHeaders) {
      const headers = allRows[0];
      const dataRows = allRows.slice(1);
      setParsedHeaders(headers);
      setParsedRows(dataRows);
      setMappings(autoMap(headers, schemaFields));
    } else {
      const colCount = Math.max(...allRows.map(r => r.length));
      const generatedHeaders = Array.from({ length: colCount }, (_, i) => `Column ${i + 1}`);
      setParsedHeaders(generatedHeaders);
      setParsedRows(allRows);
      setMappings(autoMap(generatedHeaders, schemaFields));
    }
    setStep('mapping');
  }, [pasteText, hasHeaders, schemaFields]);

  /* ─── Mapping helpers ───────────────────────────────────── */

  const updateMapping = useCallback((idx: number, changes: Partial<ColumnMapping>) => {
    setMappings(prev => prev.map((m, i) => i === idx ? { ...m, ...changes } : m));
  }, []);

  const usedTargets = useMemo(() => {
    const s = new Set<string>();
    mappings.forEach(m => { if (m.enabled && m.targetField !== '__skip__') s.add(m.targetField); });
    return s;
  }, [mappings]);

  const hasIdMapping = useMemo(
    () => mappings.some(m => m.enabled && m.targetField === schema.idField),
    [mappings, schema.idField]
  );

  /* ─── Build import rows ─────────────────────────────────── */

  const buildImportRows = useCallback((): Record<string, unknown>[] => {
    const activeMappings = mappings.filter(m => m.enabled && m.targetField !== '__skip__');
    return parsedRows.map(srcRow => {
      const row: Record<string, unknown> = {};
      for (const m of activeMappings) {
        const rawVal = srcRow[m.sourceIndex] ?? '';
        const field = schemaFields.find(f => f.name === m.targetField);
        if (!field) continue;
        const coerced = coerceValue(rawVal, field);
        if (coerced === undefined && !overwriteEmpty) continue;
        row[m.targetField] = coerced === undefined ? null : coerced;
      }
      return row;
    });
  }, [mappings, parsedRows, schemaFields, overwriteEmpty]);

  const previewStats = useMemo(() => {
    if (step !== 'mapping') return { insert: 0, update: 0, skip: 0, total: 0, replace: replaceAll };
    const rows = buildImportRows();
    if (replaceAll) {
      return { insert: 0, update: 0, skip: 0, total: rows.length, replace: true };
    }
    let insert = 0, update = 0, skip = 0;
    for (const r of rows) {
      const id = String(r[schema.idField] ?? '');
      if (!id) { skip++; continue; }
      if (existingById[id]) update++;
      else insert++;
    }
    return { insert, update, skip, total: rows.length, replace: false };
  }, [step, buildImportRows, schema.idField, existingById, replaceAll]);

  /* ─── Execute import ────────────────────────────────────── */

  const handleImport = useCallback(async () => {
    setImporting(true);
    setStep('importing');
    setShowReplaceConfirm(false);
    try {
      const rows = buildImportRows();
      const opts = replaceAll ? { hardDeleteExisting: replaceHardDelete } : undefined;
      const res = await onImport(rows, replaceAll ? 'replace' : 'upsert', opts);
      setResult(res);
    } catch (err: unknown) {
      setResult({ inserted: 0, updated: 0, skipped: 0, errors: [String(err)] });
    }
    setImporting(false);
  }, [buildImportRows, onImport, replaceAll, replaceHardDelete]);

  const handleImportClick = useCallback(() => {
    if (replaceAll) {
      setShowReplaceConfirm(true);
    } else {
      handleImport();
    }
  }, [replaceAll, handleImport]);

  /* ─── Column reorder for headerless paste ───────────────── */

  const moveColumn = useCallback((from: number, to: number) => {
    setMappings(prev => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next.map((m, i) => ({ ...m, sourceIndex: i }));
    });
    setParsedHeaders(prev => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setParsedRows(prev => prev.map(row => {
      const next = [...row];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    }));
  }, []);

  /* ═══════════════════ render ════════════════════════════ */

  const renderSourceStep = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Choose how you want to import data into <strong>{schema.label}</strong>.</p>
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => { setSourceMode('csv'); setStep('input'); }}
          className={`p-6 border-2 rounded-lg text-left hover:border-blue-400 transition-colors ${
            sourceMode === 'csv' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
          }`}
        >
          <div className="text-2xl mb-2">📄</div>
          <div className="font-semibold text-gray-800">Import CSV File</div>
          <p className="text-xs text-gray-500 mt-1">Upload a .csv, .tsv, or text file with delimited data.</p>
        </button>
        <button
          onClick={() => { setSourceMode('paste'); setStep('input'); }}
          className={`p-6 border-2 rounded-lg text-left hover:border-blue-400 transition-colors ${
            sourceMode === 'paste' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
          }`}
        >
          <div className="text-2xl mb-2">📋</div>
          <div className="font-semibold text-gray-800">Paste Table Data</div>
          <p className="text-xs text-gray-500 mt-1">Paste tab-separated, comma-separated, or pipe-separated data directly.</p>
        </button>
      </div>
    </div>
  );

  const renderInputStep = () => (
    <div className="space-y-4">
      {sourceMode === 'csv' ? (
        <>
          <p className="text-sm text-gray-500">Select a CSV, TSV, or delimited text file. The delimiter will be auto-detected.</p>
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <div className="text-4xl mb-2">📂</div>
            <p className="text-gray-600 font-medium">Click to choose file</p>
            <p className="text-xs text-gray-400 mt-1">or drag and drop</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.tsv,.txt,.dat"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            Paste your data below. Supports tab-separated (from spreadsheets), comma-separated, or pipe-separated values.
          </p>
          <div className="flex items-center gap-3 py-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasHeaders}
                onChange={e => setHasHeaders(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              First row contains headers
            </label>
          </div>
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder={"id\tlabel\tcommon_names\nFLAT\tFlat\t[\"Level\"]"}
            className="w-full h-48 border border-gray-300 rounded-lg p-3 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleParsePaste}
            disabled={!pasteText.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 text-sm font-medium"
          >
            Parse Data
          </button>
        </>
      )}
    </div>
  );

  const renderMappingStep = () => {
    const sampleRow = parsedRows[0] || [];
    const isHeaderless = !hasHeaders && sourceMode === 'paste';

    return (
      <div className="space-y-5">
        {/* Stats bar */}
        <div className="flex gap-4 text-sm">
          <span className="px-3 py-1 bg-gray-100 rounded-full text-gray-700">
            {parsedRows.length} row{parsedRows.length !== 1 ? 's' : ''} parsed
          </span>
          {previewStats.replace ? (
            <>
              <span className="px-3 py-1 bg-red-50 text-red-700 rounded-full">
                {existingRows.length} existing rows will be deleted
              </span>
              <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full">
                {previewStats.total} new rows will be imported
              </span>
            </>
          ) : (
            <>
              <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full">
                {previewStats.insert} new
              </span>
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full">
                {previewStats.update} update
              </span>
              {previewStats.skip > 0 && (
                <span className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full">
                  {previewStats.skip} skip (no id)
                </span>
              )}
            </>
          )}
        </div>

        {/* Mapping table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-3 py-2 w-10">On</th>
                {isHeaderless && <th className="px-3 py-2 w-10"></th>}
                <th className="px-3 py-2">Source Column</th>
                <th className="px-3 py-2 w-8"></th>
                <th className="px-3 py-2">Maps To</th>
                <th className="px-3 py-2">Sample</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((m, idx) => (
                <tr
                  key={idx}
                  className={`border-t ${m.enabled ? '' : 'opacity-40 bg-gray-50'}`}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={m.enabled}
                      onChange={e => updateMapping(idx, { enabled: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600"
                    />
                  </td>
                  {isHeaderless && (
                    <td className="px-3 py-1">
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => idx > 0 && moveColumn(idx, idx - 1)}
                          disabled={idx === 0}
                          className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-20 leading-none"
                          title="Move up"
                        >&#9650;</button>
                        <button
                          onClick={() => idx < mappings.length - 1 && moveColumn(idx, idx + 1)}
                          disabled={idx === mappings.length - 1}
                          className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-20 leading-none"
                          title="Move down"
                        >&#9660;</button>
                      </div>
                    </td>
                  )}
                  <td className="px-3 py-2 font-medium text-gray-700">
                    {m.sourceHeader}
                  </td>
                  <td className="px-3 py-2 text-gray-400 text-center">→</td>
                  <td className="px-3 py-2">
                    <select
                      value={m.targetField}
                      onChange={e => updateMapping(idx, { targetField: e.target.value, enabled: e.target.value !== '__skip__' })}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="__skip__">-- Skip --</option>
                      {schemaFields.map(f => (
                        <option
                          key={f.name}
                          value={f.name}
                          disabled={usedTargets.has(f.name) && m.targetField !== f.name}
                        >
                          {f.name}{f.type === 'fk' || f.type === 'fk[]' ? ' (FK)' : ''}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-400 truncate max-w-[180px]" title={sampleRow[m.sourceIndex] ?? ''}>
                    {sampleRow[m.sourceIndex] ?? ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!hasIdMapping && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-4 py-3 text-sm">
            No column is mapped to <strong>{schema.idField}</strong>. Rows without an ID will be skipped and cannot update existing records.
          </div>
        )}

        {/* Options */}
        <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">Import Options</h4>
          {!replaceAll && (
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={overwriteEmpty}
                onChange={e => setOverwriteEmpty(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-blue-600"
              />
              <div>
                <div className="text-sm text-gray-800">Overwrite with empty values</div>
                <div className="text-xs text-gray-500">
                  When enabled, if an imported row has an empty value for a column, the existing value in the table will be cleared.
                  When disabled, empty import values are ignored and the existing value is preserved.
                </div>
              </div>
            </label>
          )}
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={replaceAll}
              onChange={e => {
                setReplaceAll(e.target.checked);
                if (e.target.checked) {
                  setOverwriteEmpty(false);
                } else {
                  setReplaceHardDelete(false);
                }
              }}
              className="mt-0.5 rounded border-gray-300 text-red-600"
            />
            <div>
              <div className="text-sm text-gray-800">Replace all table rows</div>
              <div className="text-xs text-gray-500">
                When enabled, all existing rows in the table will be deleted before importing the new data. This action cannot be undone.
              </div>
            </div>
          </label>
          {replaceAll && (
            <label className="flex items-start gap-3 cursor-pointer select-none ml-6 mt-2">
              <input
                type="checkbox"
                checked={replaceHardDelete}
                onChange={e => setReplaceHardDelete(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-red-700"
              />
              <div>
                <div className="text-sm text-gray-800">Permanently delete existing rows (hard delete)</div>
                <div className="text-xs text-gray-500">
                  Remove rows from the database instead of deactivating them. They will no longer appear in pgAdmin or any backup.
                </div>
              </div>
            </label>
          )}
        </div>

        {/* Data preview */}
        {parsedRows.length > 0 && (
          <details className="border rounded-lg">
            <summary className="px-4 py-2 cursor-pointer text-sm font-medium text-gray-600 hover:bg-gray-50">
              Preview parsed data ({Math.min(parsedRows.length, 5)} of {parsedRows.length} rows)
            </summary>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500">
                    {mappings.filter(m => m.enabled && m.targetField !== '__skip__').map((m, i) => (
                      <th key={i} className="px-3 py-1.5 font-medium">{m.targetField}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 5).map((row, ri) => (
                    <tr key={ri} className="border-t">
                      {mappings.filter(m => m.enabled && m.targetField !== '__skip__').map((m, ci) => (
                        <td key={ci} className="px-3 py-1.5 truncate max-w-[150px]">
                          {row[m.sourceIndex] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </div>
    );
  };

  const renderImportingStep = () => (
    <div className="py-10 text-center space-y-4">
      {importing ? (
        <>
          <div className="text-3xl animate-spin inline-block">⏳</div>
          <p className="text-gray-600">Importing rows...</p>
        </>
      ) : result ? (
        <>
          {result.errors.length > 0 ? (
            <div className="text-3xl">⚠️</div>
          ) : (
            <div className="text-3xl">✅</div>
          )}
          <div className="space-y-2">
            <p className="text-gray-800 font-semibold text-lg">Import Complete</p>
            <div className="flex justify-center gap-4 text-sm">
              <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full">{result.inserted} inserted</span>
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full">{result.updated} updated</span>
              {result.skipped > 0 && (
                <span className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full">{result.skipped} skipped</span>
              )}
            </div>
            {result.errors.length > 0 && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-left text-sm text-red-700 max-h-40 overflow-y-auto">
                {result.errors.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );

  const stepTitle: Record<Step, string> = {
    source: 'Import Rows',
    input: sourceMode === 'csv' ? 'Upload File' : 'Paste Data',
    mapping: 'Map Columns',
    importing: 'Import',
  };

  const canGoBack: Record<Step, Step | null> = {
    source: null,
    input: 'source',
    mapping: 'input',
    importing: null,
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl mx-4 shadow-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            {canGoBack[step] && !importing && (
              <button
                onClick={() => setStep(canGoBack[step]!)}
                className="text-gray-400 hover:text-gray-700 text-lg"
                title="Back"
              >←</button>
            )}
            <h2 className="text-lg font-semibold text-gray-800">{stepTitle[step]}</h2>
          </div>
          {!importing && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {step === 'source' && renderSourceStep()}
          {step === 'input' && renderInputStep()}
          {step === 'mapping' && renderMappingStep()}
          {step === 'importing' && renderImportingStep()}
        </div>

        {/* Replace confirmation dialog */}
        {showReplaceConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Confirm Replace All Rows</h3>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete all existing rows before importing data?
                {replaceHardDelete ? (
                  <> This will <strong>permanently remove</strong> <strong>{existingRows.length}</strong> row{existingRows.length !== 1 ? 's' : ''} from the database (hard delete). This cannot be undone.</>
                ) : (
                  <> <strong>{existingRows.length}</strong> existing row{existingRows.length !== 1 ? 's' : ''} will be deactivated (soft delete) and cannot be undone.</>
                )}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowReplaceConfirm(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
                >
                  {replaceHardDelete ? 'Yes, Permanently Delete All & Import' : 'Yes, Delete All & Import'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-lg">
          {step === 'mapping' && (
            <button
              onClick={handleImportClick}
              disabled={parsedRows.length === 0 || (!replaceAll && !hasIdMapping)}
              className={`px-5 py-2 rounded text-sm font-medium disabled:opacity-40 ${
                replaceAll
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {replaceAll ? 'Replace All & Import' : `Import ${parsedRows.length} Row${parsedRows.length !== 1 ? 's' : ''}`}
            </button>
          )}
          {step === 'importing' && !importing && (
            <button
              onClick={onClose}
              className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
            >
              Done
            </button>
          )}
          {step !== 'importing' && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
