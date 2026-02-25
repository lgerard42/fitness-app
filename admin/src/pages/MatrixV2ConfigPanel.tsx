import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import toast from 'react-hot-toast';
import type {
  MatrixConfigRow,
  MatrixConfigJson,
  TableConfig,
  ValidationResult,
  ResolverOutput,
  ModifierTableKey,
} from '../../../shared/types/matrixV2';
import { MODIFIER_TABLE_KEYS } from '../../../shared/types/matrixV2';

interface MatrixV2ConfigPanelProps {
  motions: Array<{ id: string; label: string; parent_id?: string | null }>;
}

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

function emptyConfigJson(): MatrixConfigJson {
  return { meta: {}, tables: {}, rules: [], extensions: {} };
}

function emptyTableConfig(): TableConfig {
  return {
    applicability: false,
    allowed_row_ids: [],
    default_row_id: null,
    null_noop_allowed: false,
  };
}

export default function MatrixV2ConfigPanel({ motions }: MatrixV2ConfigPanelProps) {
  const [configs, setConfigs] = useState<MatrixConfigRow[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<MatrixConfigJson | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [resolverPreview, setResolverPreview] = useState<ResolverOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [modifierRows, setModifierRows] = useState<Record<string, Array<{ id: string; label: string }>>>({});

  const [scopeType, setScopeType] = useState<'motion' | 'motion_group'>('motion_group');
  const [scopeId, setScopeId] = useState('');
  const [notes, setNotes] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const parentMotions = motions.filter(m => !m.parent_id);
  const groupOptions = [...new Set([
    ...parentMotions.map(m => m.id),
    ...motions.filter(m => m.parent_id).map(m => m.parent_id!),
  ])];

  const loadConfigs = useCallback(async () => {
    try {
      const data = await api.listMatrixConfigs();
      setConfigs(data);
    } catch (err) {
      console.error('Failed to load configs:', err);
    }
  }, []);

  const loadModifierRows = useCallback(async () => {
    const rows: Record<string, Array<{ id: string; label: string }>> = {};
    for (const key of MODIFIER_TABLE_KEYS) {
      try {
        const data = await api.getTable(key);
        rows[key] = (data as any[]).map(r => ({ id: r.id, label: r.label }));
      } catch {
        rows[key] = [];
      }
    }
    setModifierRows(rows);
  }, []);

  useEffect(() => {
    loadConfigs();
    loadModifierRows();
  }, [loadConfigs, loadModifierRows]);

  const selectedConfig = configs.find(c => c.id === selectedConfigId);

  const selectConfig = useCallback((cfg: MatrixConfigRow) => {
    setSelectedConfigId(cfg.id);
    setEditingConfig(JSON.parse(JSON.stringify(cfg.config_json)));
    setScopeType(cfg.scope_type);
    setScopeId(cfg.scope_id);
    setNotes(cfg.notes || '');
    setValidation(null);
    setResolverPreview(null);
  }, []);

  const handleCreate = async () => {
    if (!scopeId) { toast.error('Select a scope'); return; }
    try {
      setLoading(true);
      const { config } = await api.createMatrixConfig({
        scope_type: scopeType,
        scope_id: scopeId,
        config_json: editingConfig || emptyConfigJson(),
        notes,
      });
      toast.success('Draft created');
      await loadConfigs();
      selectConfig(config);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedConfigId || !editingConfig) return;
    try {
      setLoading(true);
      const updated = await api.updateMatrixConfig(selectedConfigId, {
        config_json: editingConfig,
        notes,
      });
      toast.success('Draft saved');
      await loadConfigs();
      selectConfig(updated);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!selectedConfigId) return;
    try {
      setLoading(true);
      const result = await api.validateMatrixConfig(selectedConfigId);
      setValidation(result);
      if (result.can_activate) toast.success('Valid - ready to activate');
      else toast.error(`${result.errors.length} error(s) found`);
    } catch (err: any) {
      toast.error(err.message || 'Validation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!selectedConfigId) return;
    try {
      setLoading(true);
      const result = await api.activateMatrixConfig(selectedConfigId);
      if (result.error) { toast.error(result.error); return; }
      toast.success('Config activated!');
      await loadConfigs();
      selectConfig(result.config);
    } catch (err: any) {
      toast.error(err.message || 'Activation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClone = async () => {
    if (!selectedConfigId) return;
    try {
      setLoading(true);
      const cloned = await api.cloneMatrixConfig(selectedConfigId);
      toast.success('Cloned to new draft');
      await loadConfigs();
      selectConfig(cloned);
    } catch (err: any) {
      toast.error(err.message || 'Clone failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    const previewId = scopeType === 'motion' ? scopeId : null;
    if (!previewId) {
      const children = motions.filter(m => m.parent_id === scopeId);
      if (children.length > 0) {
        const mode = selectedConfig?.status === 'draft' ? 'draft_preview' : 'active_only';
        const result = await api.resolveMatrixConfig(children[0].id, mode);
        setResolverPreview(result);
        setShowPreview(true);
        return;
      }
      toast.error('Select a child motion for preview');
      return;
    }
    try {
      const mode = selectedConfig?.status === 'draft' ? 'draft_preview' : 'active_only';
      const result = await api.resolveMatrixConfig(previewId, mode);
      setResolverPreview(result);
      setShowPreview(true);
    } catch (err: any) {
      toast.error(err.message || 'Preview failed');
    }
  };

  const handleExport = async () => {
    if (!selectedConfigId) return;
    try {
      const data = await api.exportMatrixConfig(selectedConfigId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `matrix-config-${scopeType}-${scopeId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.message || 'Export failed');
    }
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        const result = await api.importMatrixConfig(data, 'create');
        if (result.imported) {
          toast.success('Config imported');
          await loadConfigs();
          if (result.config) selectConfig(result.config);
        } else {
          setValidation(result.validation);
          toast.error('Import has validation issues - review before saving');
        }
      } catch (err: any) {
        toast.error(err.message || 'Import failed');
      }
    };
    input.click();
  };

  const toggleTableApplicability = (tableKey: ModifierTableKey) => {
    if (!editingConfig) return;
    const updated = { ...editingConfig };
    const existing = updated.tables[tableKey];
    if (existing) {
      updated.tables = { ...updated.tables, [tableKey]: { ...existing, applicability: !existing.applicability } };
    } else {
      updated.tables = { ...updated.tables, [tableKey]: { ...emptyTableConfig(), applicability: true } };
    }
    setEditingConfig(updated);
  };

  const toggleAllowedRow = (tableKey: ModifierTableKey, rowId: string) => {
    if (!editingConfig) return;
    const updated = { ...editingConfig };
    const tc = updated.tables[tableKey] || emptyTableConfig();
    const rows = [...tc.allowed_row_ids];
    const idx = rows.indexOf(rowId);
    if (idx >= 0) rows.splice(idx, 1);
    else rows.push(rowId);
    updated.tables = { ...updated.tables, [tableKey]: { ...tc, allowed_row_ids: rows } };
    setEditingConfig(updated);
  };

  const setDefaultRow = (tableKey: ModifierTableKey, rowId: string | null) => {
    if (!editingConfig) return;
    const updated = { ...editingConfig };
    const tc = updated.tables[tableKey] || emptyTableConfig();
    updated.tables = { ...updated.tables, [tableKey]: { ...tc, default_row_id: rowId } };
    setEditingConfig(updated);
  };

  const toggleTableExpand = (key: string) => {
    const next = new Set(expandedTables);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpandedTables(next);
  };

  return (
    <div className="h-full flex">
      {/* Left sidebar: config list */}
      <div className="w-72 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-3 border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-900 mb-2">Matrix V2 Configs</h2>
          <div className="flex gap-1 mb-2">
            <select
              value={scopeType}
              onChange={(e) => setScopeType(e.target.value as any)}
              className="text-xs border border-gray-300 rounded px-1 py-0.5 flex-1"
            >
              <option value="motion_group">Group</option>
              <option value="motion">Motion</option>
            </select>
            <select
              value={scopeId}
              onChange={(e) => setScopeId(e.target.value)}
              className="text-xs border border-gray-300 rounded px-1 py-0.5 flex-1"
            >
              <option value="">Select...</option>
              {(scopeType === 'motion_group' ? groupOptions : motions.map(m => m.id)).map((id) => (
                <option key={id} value={id}>
                  {motions.find(m => m.id === id)?.label || id}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCreate}
            disabled={loading || !scopeId}
            className="w-full text-xs bg-blue-600 text-white rounded py-1 hover:bg-blue-700 disabled:opacity-50"
          >
            New Draft
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {configs.map(cfg => (
            <div
              key={cfg.id}
              onClick={() => selectConfig(cfg)}
              className={`px-3 py-2 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${selectedConfigId === cfg.id ? 'bg-blue-50' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-900 truncate">
                  {motions.find(m => m.id === cfg.scope_id)?.label || cfg.scope_id}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  cfg.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {cfg.status}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-gray-500">{cfg.scope_type}</span>
                <span className="text-[10px] text-gray-400">v{cfg.config_version}</span>
                {cfg.validation_status && (
                  <span className={`text-[10px] ${cfg.validation_status === 'valid' ? 'text-green-600' : cfg.validation_status === 'error' ? 'text-red-600' : 'text-yellow-600'}`}>
                    {cfg.validation_status}
                  </span>
                )}
              </div>
            </div>
          ))}
          {configs.length === 0 && (
            <div className="p-3 text-xs text-gray-400 text-center">No configs yet</div>
          )}
        </div>
      </div>

      {/* Main editing area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!editingConfig ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Select or create a config
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2">
              <span className="text-xs text-gray-600 mr-2">
                {scopeType === 'motion_group' ? 'Group' : 'Motion'}: <strong>{motions.find(m => m.id === scopeId)?.label || scopeId}</strong>
              </span>
              {selectedConfig && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  selectedConfig.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {selectedConfig.status} v{selectedConfig.config_version}
                </span>
              )}
              <div className="flex-1" />
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes..."
                className="text-xs border border-gray-300 rounded px-2 py-1 w-48"
              />
              <button onClick={handleSave} disabled={loading || selectedConfig?.status === 'active'}
                className="text-xs bg-blue-600 text-white rounded px-3 py-1 hover:bg-blue-700 disabled:opacity-50">
                Save Draft
              </button>
              <button onClick={handleValidate} disabled={loading}
                className="text-xs bg-yellow-600 text-white rounded px-3 py-1 hover:bg-yellow-700 disabled:opacity-50">
                Validate
              </button>
              <button onClick={handleActivate} disabled={loading || selectedConfig?.status === 'active'}
                className="text-xs bg-green-600 text-white rounded px-3 py-1 hover:bg-green-700 disabled:opacity-50">
                Activate
              </button>
              <button onClick={handleClone} disabled={loading}
                className="text-xs bg-gray-600 text-white rounded px-3 py-1 hover:bg-gray-700 disabled:opacity-50">
                Clone
              </button>
              <button onClick={handlePreview} disabled={loading}
                className="text-xs bg-purple-600 text-white rounded px-3 py-1 hover:bg-purple-700 disabled:opacity-50">
                Preview
              </button>
              <button onClick={handleExport} disabled={loading}
                className="text-xs bg-gray-500 text-white rounded px-3 py-1 hover:bg-gray-600 disabled:opacity-50">
                Export
              </button>
              <button onClick={handleImport} disabled={loading}
                className="text-xs bg-gray-500 text-white rounded px-3 py-1 hover:bg-gray-600 disabled:opacity-50">
                Import
              </button>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto flex">
              {/* Table config panels */}
              <div className="flex-1 p-4 space-y-2 overflow-y-auto">
                <h3 className="text-sm font-bold text-gray-900 mb-2">Modifier Table Configuration</h3>
                {MODIFIER_TABLE_KEYS.map(tableKey => {
                  const tc = editingConfig.tables[tableKey];
                  const isApplicable = tc?.applicability ?? false;
                  const isExpanded = expandedTables.has(tableKey);
                  const rows = modifierRows[tableKey] || [];

                  return (
                    <div key={tableKey} className="border border-gray-200 rounded bg-white">
                      <div
                        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleTableExpand(tableKey)}
                      >
                        <span className="text-xs text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                        <label className="flex items-center gap-1.5 cursor-pointer" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isApplicable}
                            onChange={() => toggleTableApplicability(tableKey)}
                            className="rounded border-gray-300"
                            disabled={selectedConfig?.status === 'active'}
                          />
                          <span className="text-xs font-medium text-gray-800">
                            {MODIFIER_TABLE_LABELS[tableKey] || tableKey}
                          </span>
                        </label>
                        {isApplicable && (
                          <span className="text-[10px] text-gray-500">
                            {tc?.allowed_row_ids.length || 0} rows
                            {tc?.default_row_id && ` | default: ${tc.default_row_id}`}
                          </span>
                        )}
                      </div>

                      {isExpanded && isApplicable && tc && (
                        <div className="border-t border-gray-200 px-3 py-2 space-y-2">
                          {/* Allowed rows */}
                          <div>
                            <div className="text-[10px] font-medium text-gray-600 mb-1">Allowed Rows</div>
                            <div className="flex flex-wrap gap-1">
                              {rows.map(row => {
                                const isAllowed = tc.allowed_row_ids.includes(row.id);
                                return (
                                  <button
                                    key={row.id}
                                    onClick={() => toggleAllowedRow(tableKey, row.id)}
                                    disabled={selectedConfig?.status === 'active'}
                                    className={`text-[10px] px-2 py-0.5 rounded border ${
                                      isAllowed
                                        ? 'bg-blue-100 border-blue-300 text-blue-800'
                                        : 'bg-gray-50 border-gray-200 text-gray-500'
                                    } hover:opacity-80 disabled:opacity-50`}
                                  >
                                    {row.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Default */}
                          <div>
                            <div className="text-[10px] font-medium text-gray-600 mb-1">Default / Home-Base</div>
                            <select
                              value={tc.default_row_id || ''}
                              onChange={(e) => setDefaultRow(tableKey, e.target.value || null)}
                              disabled={selectedConfig?.status === 'active'}
                              className="text-xs border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="">None (no default)</option>
                              {tc.allowed_row_ids.map(rid => {
                                const row = rows.find(r => r.id === rid);
                                return <option key={rid} value={rid}>{row?.label || rid}</option>;
                              })}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Right sidebar: validation + preview */}
              <div className="w-80 border-l border-gray-200 bg-gray-50 flex flex-col">
                {/* Validation panel */}
                {validation && (
                  <div className="p-3 border-b border-gray-200">
                    <h4 className="text-xs font-bold text-gray-900 mb-2">Validation</h4>
                    <div className="flex gap-2 mb-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${validation.can_activate ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {validation.can_activate ? 'Can Activate' : 'Blocked'}
                      </span>
                      {validation.errors.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-800">
                          {validation.errors.length} error(s)
                        </span>
                      )}
                      {validation.warnings.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800">
                          {validation.warnings.length} warning(s)
                        </span>
                      )}
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {[...validation.errors, ...validation.warnings, ...validation.info].map((msg, i) => (
                        <div key={i} className={`text-[10px] p-1.5 rounded ${
                          msg.severity === 'error' ? 'bg-red-50 text-red-800' :
                          msg.severity === 'warning' ? 'bg-yellow-50 text-yellow-800' :
                          'bg-blue-50 text-blue-800'
                        }`}>
                          <span className="font-medium uppercase">{msg.severity}</span>
                          {msg.path && <span className="text-gray-500 ml-1">[{msg.path}]</span>}
                          <div>{msg.message}</div>
                          {msg.suggested_fix && <div className="italic text-gray-600 mt-0.5">{msg.suggested_fix}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resolved preview */}
                {showPreview && resolverPreview && (
                  <div className="flex-1 p-3 overflow-y-auto">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-gray-900">Resolved Preview</h4>
                      <button onClick={() => setShowPreview(false)} className="text-[10px] text-gray-500 hover:text-gray-700">
                        Close
                      </button>
                    </div>
                    <div className="text-[10px] space-y-1 mb-2">
                      <div className="text-gray-600">
                        Resolver v{resolverPreview.resolver_version} | Mode: {resolverPreview.mode}
                      </div>
                      {resolverPreview.resolved_from.group_config_id && (
                        <div className="text-gray-500">
                          Group: {resolverPreview.resolved_from.group_config_id} v{resolverPreview.resolved_from.group_config_version}
                        </div>
                      )}
                      {resolverPreview.resolved_from.motion_config_id && (
                        <div className="text-gray-500">
                          Motion: {resolverPreview.resolved_from.motion_config_id} v{resolverPreview.resolved_from.motion_config_version}
                        </div>
                      )}
                    </div>
                    {resolverPreview.diagnostics.length > 0 && (
                      <div className="mb-2 space-y-1">
                        {resolverPreview.diagnostics.map((d, i) => (
                          <div key={i} className={`text-[10px] p-1 rounded ${
                            d.severity === 'error' ? 'bg-red-50' : d.severity === 'warning' ? 'bg-yellow-50' : 'bg-blue-50'
                          }`}>
                            {d.message}
                          </div>
                        ))}
                      </div>
                    )}
                    <pre className="text-[9px] bg-gray-900 text-green-400 p-2 rounded overflow-auto max-h-96 whitespace-pre-wrap">
                      {JSON.stringify(resolverPreview, null, 2)}
                    </pre>
                  </div>
                )}

                {!validation && !showPreview && (
                  <div className="flex-1 flex items-center justify-center text-xs text-gray-400">
                    Click "Validate" or "Preview"
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
