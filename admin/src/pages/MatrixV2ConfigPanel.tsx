import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import type { MuscleTargets, ModifierRow } from '../../../shared/types';
import { useWorkstationState } from '../hooks/useWorkstationState';
import { useScoringSimulation } from '../hooks/useScoringSimulation';
import BaselineCard from '../components/workstation/BaselineCard';
import SimulationPreview from '../components/workstation/SimulationPreview';
import DeltaBranchCard from '../components/workstation/DeltaBranchCard';
import DirtyBadge from '../components/workstation/DirtyBadge';

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
  // ─── Matrix config state (existing) ───
  const [configs, setConfigs] = useState<MatrixConfigRow[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<MatrixConfigJson | null>(null);
  const [savedConfig, setSavedConfig] = useState<string>('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [resolverPreview, setResolverPreview] = useState<ResolverOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [modifierRows, setModifierRows] = useState<Record<string, Array<{ id: string; label: string }>>>({});

  const [scopeType, setScopeType] = useState<'motion' | 'motion_group'>('motion_group');
  const [scopeId, setScopeId] = useState('');
  const [notes, setNotes] = useState('');
  const [showResolverPreview, setShowResolverPreview] = useState(false);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  // ─── Simulation state ───
  const [simMode, setSimMode] = useState<'defaults' | 'custom'>('defaults');
  const [customCombo, setCustomCombo] = useState<Array<{ tableKey: string; rowId: string }>>([]);
  const [previewMotionId, setPreviewMotionId] = useState<string>('');
  const [showDiff, setShowDiff] = useState(false);

  // ─── Config dirty tracking ───
  const configDirty = useMemo(() => {
    if (!editingConfig) return false;
    return JSON.stringify(editingConfig) !== savedConfig;
  }, [editingConfig, savedConfig]);

  const handleSaveConfig = useCallback(async () => {
    if (!selectedConfigId || !editingConfig) return;
    const updated = await api.updateMatrixConfig(selectedConfigId, {
      config_json: editingConfig,
      notes,
    });
    toast.success('Draft saved');
    setSavedConfig(JSON.stringify(editingConfig));
    await loadConfigs();
    selectConfig(updated);
  }, [selectedConfigId, editingConfig, notes]);

  // ─── Workstation state hook ───
  const workstation = useWorkstationState(motions, editingConfig, configDirty, handleSaveConfig);

  // ─── Derived values ───
  const parentMotions = motions.filter(m => !m.parent_id);
  const groupOptions = [...new Set([
    ...parentMotions.map(m => m.id),
    ...motions.filter(m => m.parent_id).map(m => m.parent_id!),
  ])];

  // Family motions for the motion context selector
  const familyMotions = useMemo(() => {
    if (scopeType === 'motion') {
      return motions.filter(m => m.id === scopeId);
    }
    // For group: show root + all children in the family
    const root = motions.find(m => m.id === scopeId);
    if (!root) return [];
    const children = motions.filter(m => m.parent_id === scopeId);
    return [root, ...children];
  }, [scopeType, scopeId, motions]);

  // ─── Muscle labels for simulation ───
  const [muscleLabels, setMuscleLabels] = useState<Record<string, string>>({});
  useEffect(() => {
    api.getTable('muscles').then((data) => {
      const labels: Record<string, string> = {};
      for (const m of data as Array<{ id: string; label: string }>) {
        labels[m.id] = m.label;
      }
      setMuscleLabels(labels);
    }).catch(console.error);
  }, []);

  // ─── Modifier row labels for simulation provenance ───
  const modifierRowLabels = useMemo(() => {
    const labels: Record<string, Record<string, string>> = {};
    for (const [tableKey, rows] of Object.entries(modifierRows)) {
      labels[tableKey] = {};
      for (const row of rows) {
        labels[tableKey][row.id] = row.label;
      }
    }
    return labels;
  }, [modifierRows]);

  // ─── Allowed rows by table (for custom combo selector) ───
  const allowedRowsByTable = useMemo(() => {
    const result: Record<string, Array<{ id: string; label: string }>> = {};
    if (!editingConfig?.tables) return result;
    for (const [tableKey, tc] of Object.entries(editingConfig.tables)) {
      if (!tc || !tc.applicability) continue;
      const allRows = modifierRows[tableKey] || [];
      result[tableKey] = tc.allowed_row_ids
        .map(id => allRows.find(r => r.id === id))
        .filter(Boolean) as Array<{ id: string; label: string }>;
    }
    return result;
  }, [editingConfig, modifierRows]);

  // ─── Scoring simulation ───
  const simulation = useScoringSimulation({
    motionId: workstation.selectedMotionId,
    muscleTargets: workstation.localBaseline,
    editingConfig,
    modifierTableData: workstation.modifierTableData,
    motionsMap: workstation.motionsMap,
    localDeltaOverrides: workstation.localDeltaOverrides,
    customCombo: simMode === 'custom' ? customCombo : null,
    baselineDirty: workstation.baselineDirty,
  });

  // ─── Data loading ───
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
    workstation.loadModifierTableData();
  }, [loadConfigs, loadModifierRows, workstation.loadModifierTableData]);

  // ─── Auto-select motion when scope changes ───
  useEffect(() => {
    if (scopeType === 'motion' && scopeId) {
      workstation.setSelectedMotionId(scopeId);
      const allMotions = Object.values(workstation.motionsMap);
      if (allMotions.length > 0) {
        workstation.loadMotionData(scopeId, allMotions);
      }
    } else if (familyMotions.length > 0 && !workstation.selectedMotionId) {
      const firstId = familyMotions[0].id;
      workstation.setSelectedMotionId(firstId);
      const allMotions = Object.values(workstation.motionsMap);
      if (allMotions.length > 0) {
        workstation.loadMotionData(firstId, allMotions);
      }
    }
  }, [scopeType, scopeId, familyMotions, workstation.motionsMap]);

  const handleMotionContextChange = useCallback((motionId: string) => {
    workstation.setSelectedMotionId(motionId);
    const allMotions = Object.values(workstation.motionsMap);
    if (allMotions.length > 0) {
      workstation.loadMotionData(motionId, allMotions);
    }
  }, [workstation]);

  // ─── Config CRUD handlers ───
  const selectedConfig = configs.find(c => c.id === selectedConfigId);

  // ─── Active config for diff ───
  const activeConfig = useMemo(() => {
    if (!scopeType || !scopeId) return null;
    return configs.find(c => c.scope_type === scopeType && c.scope_id === scopeId && c.status === 'active') || null;
  }, [configs, scopeType, scopeId]);

  const configDiff = useMemo(() => {
    if (!activeConfig || !editingConfig || selectedConfig?.status === 'active') return null;
    const activeJson = activeConfig.config_json as MatrixConfigJson;
    const diff: Array<{ table: string; type: 'added' | 'removed' | 'changed'; detail: string }> = [];
    const allTableKeys = new Set([
      ...Object.keys(activeJson.tables || {}),
      ...Object.keys(editingConfig.tables || {}),
    ]);
    for (const key of allTableKeys) {
      const oldTc = activeJson.tables?.[key as ModifierTableKey];
      const newTc = editingConfig.tables?.[key as ModifierTableKey];
      const label = MODIFIER_TABLE_LABELS[key] || key;
      if (!oldTc && newTc) {
        diff.push({ table: label, type: 'added', detail: `Table added (${newTc.applicability ? 'applicable' : 'not applicable'})` });
      } else if (oldTc && !newTc) {
        diff.push({ table: label, type: 'removed', detail: 'Table removed' });
      } else if (oldTc && newTc) {
        if (oldTc.applicability !== newTc.applicability) {
          diff.push({ table: label, type: 'changed', detail: `Applicability: ${oldTc.applicability} → ${newTc.applicability}` });
        }
        if (oldTc.default_row_id !== newTc.default_row_id) {
          diff.push({ table: label, type: 'changed', detail: `Default: ${oldTc.default_row_id || 'none'} → ${newTc.default_row_id || 'none'}` });
        }
        const oldRows = new Set(oldTc.allowed_row_ids || []);
        const newRows = new Set(newTc.allowed_row_ids || []);
        const addedRows = [...newRows].filter(r => !oldRows.has(r));
        const removedRows = [...oldRows].filter(r => !newRows.has(r));
        if (addedRows.length > 0) diff.push({ table: label, type: 'added', detail: `Rows added: ${addedRows.join(', ')}` });
        if (removedRows.length > 0) diff.push({ table: label, type: 'removed', detail: `Rows removed: ${removedRows.join(', ')}` });
      }
    }
    return diff.length > 0 ? diff : null;
  }, [activeConfig, editingConfig, selectedConfig]);

  const selectConfig = useCallback((cfg: MatrixConfigRow) => {
    setSelectedConfigId(cfg.id);
    const cfgJson = JSON.parse(JSON.stringify(cfg.config_json));
    setEditingConfig(cfgJson);
    setSavedConfig(JSON.stringify(cfgJson));
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
      await handleSaveConfig();
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

  const handleResolverPreview = async () => {
    const targetMotionId = previewMotionId || (scopeType === 'motion' ? scopeId : null);
    if (!targetMotionId) {
      const children = motions.filter(m => m.parent_id === scopeId);
      if (children.length > 0) {
        const mode = selectedConfig?.status === 'draft' ? 'draft_preview' : 'active_only';
        try {
          const result = await api.resolveMatrixConfig(children[0].id, mode);
          setResolverPreview(result);
          setShowResolverPreview(true);
        } catch (err: any) {
          toast.error(err.message || 'Preview failed');
        }
        return;
      }
      toast.error('Select a child motion for preview');
      return;
    }
    try {
      const mode = selectedConfig?.status === 'draft' ? 'draft_preview' : 'active_only';
      const result = await api.resolveMatrixConfig(targetMotionId, mode);
      setResolverPreview(result);
      setShowResolverPreview(true);
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

  // ─── Save & Next Motion ───
  const handleSaveAndNext = async () => {
    const result = await workstation.saveAllDirty();
    if (result.failures.length > 0) {
      toast.error(`Partial save: ${result.failures.join(', ')} failed`);
    }
    // Advance to next sibling
    const currentIdx = familyMotions.findIndex(m => m.id === workstation.selectedMotionId);
    if (currentIdx >= 0 && currentIdx < familyMotions.length - 1) {
      handleMotionContextChange(familyMotions[currentIdx + 1].id);
    } else if (familyMotions.length > 0) {
      toast('Last motion in family reached');
    }
  };

  // ─── Table config operations ───
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

  const isReadOnly = selectedConfig?.status === 'active';

  // ─── Render ───
  return (
    <div className="h-full flex">
      {/* ── Left sidebar: scope + config list + motion context ── */}
      <div className="w-72 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-3 border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-900 mb-2">Matrix V2 Workstation</h2>
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

        {/* Motion Context Selector */}
        {familyMotions.length > 0 && (
          <div className="p-3 border-b border-gray-200 bg-indigo-50">
            <div className="text-[10px] font-bold text-indigo-800 mb-1">Motion Context</div>
            <select
              value={workstation.selectedMotionId || ''}
              onChange={(e) => handleMotionContextChange(e.target.value)}
              className="w-full text-xs border border-indigo-300 rounded px-1.5 py-1 bg-white"
            >
              <option value="">Select motion...</option>
              {familyMotions.map(m => (
                <option key={m.id} value={m.id}>
                  {m.parent_id ? '  └ ' : ''}{m.label}
                </option>
              ))}
            </select>
            {workstation.selectedMotion && workstation.selectedMotion.parent_id && (
              <div className="text-[9px] text-indigo-600 mt-1">
                Child of: {motions.find(m => m.id === workstation.selectedMotion!.parent_id)?.label || workstation.selectedMotion.parent_id}
              </div>
            )}
          </div>
        )}

        {/* Group Preview Context */}
        {scopeType === 'motion_group' && (
          <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
            <div className="text-[10px] font-medium text-gray-600 mb-1">Preview as</div>
            <select
              value={previewMotionId}
              onChange={(e) => setPreviewMotionId(e.target.value)}
              className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5"
            >
              <option value="">Auto (first child)</option>
              {familyMotions.filter(m => m.parent_id).map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Config List */}
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

      {/* ── Main editing area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!editingConfig ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Select or create a config
          </div>
        ) : (
          <>
            {/* ── Toolbar ── */}
            <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2 flex-wrap">
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
              <DirtyBadge dirtyCount={workstation.dirtyDomains.size} domains={workstation.dirtyDomains} />
              <div className="flex-1" />
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes..."
                className="text-xs border border-gray-300 rounded px-2 py-1 w-40"
              />
              <button onClick={handleSave} disabled={loading || isReadOnly}
                className="text-xs bg-blue-600 text-white rounded px-3 py-1 hover:bg-blue-700 disabled:opacity-50">
                Save Draft
              </button>
              <button onClick={handleValidate} disabled={loading}
                className="text-xs bg-yellow-600 text-white rounded px-3 py-1 hover:bg-yellow-700 disabled:opacity-50">
                Validate
              </button>
              <button onClick={handleActivate} disabled={loading || isReadOnly}
                className="text-xs bg-green-600 text-white rounded px-3 py-1 hover:bg-green-700 disabled:opacity-50">
                Activate
              </button>
              <button onClick={handleClone} disabled={loading}
                className="text-xs bg-gray-600 text-white rounded px-3 py-1 hover:bg-gray-700 disabled:opacity-50">
                Clone
              </button>
              <button onClick={handleResolverPreview} disabled={loading}
                className="text-xs bg-purple-600 text-white rounded px-3 py-1 hover:bg-purple-700 disabled:opacity-50">
                Preview Config
              </button>
              <button onClick={handleExport} disabled={loading}
                className="text-xs bg-gray-500 text-white rounded px-3 py-1 hover:bg-gray-600 disabled:opacity-50">
                Export
              </button>
              <button onClick={handleImport} disabled={loading}
                className="text-xs bg-gray-500 text-white rounded px-3 py-1 hover:bg-gray-600 disabled:opacity-50">
                Import
              </button>
              {familyMotions.length > 1 && (
                <button
                  onClick={handleSaveAndNext}
                  disabled={loading || workstation.dirtyDomains.size === 0}
                  className="text-xs bg-indigo-600 text-white rounded px-3 py-1 hover:bg-indigo-700 disabled:opacity-50"
                >
                  Save &amp; Next
                </button>
              )}
            </div>

            {/* ── Content: 3 columns ── */}
            <div className="flex-1 overflow-hidden flex">
              {/* Center: baseline + table configs + delta editing */}
              <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                {/* Baseline Card */}
                {workstation.selectedMotionId && (
                  <BaselineCard
                    motionId={workstation.selectedMotionId}
                    motionLabel={workstation.selectedMotion?.label || workstation.selectedMotionId}
                    muscleTargets={workstation.localBaseline}
                    dirty={workstation.baselineDirty}
                    disabled={false}
                    onChange={workstation.setLocalBaseline}
                    onSave={workstation.saveBaseline}
                  />
                )}

                {/* Modifier Table Configuration */}
                <h3 className="text-sm font-bold text-gray-900">Modifier Table Configuration</h3>
                {MODIFIER_TABLE_KEYS.map(tableKey => {
                  const tc = editingConfig.tables[tableKey];
                  const isApplicable = tc?.applicability ?? false;
                  const isExpanded = expandedTables.has(tableKey);
                  const rows = modifierRows[tableKey] || [];
                  // Inherited rule visibility: find group config rules for this table
                  const groupConfig = scopeType === 'motion'
                    ? configs.find(c => c.scope_type === 'motion_group' && c.status === 'active' && motions.find(m => m.id === scopeId)?.parent_id === c.scope_id)
                    : null;
                  const groupTableConfig = groupConfig?.config_json?.tables?.[tableKey as ModifierTableKey];
                  const inheritedLocalRules = groupTableConfig?.local_rules || [];
                  const localTombstones = new Set(
                    (tc?.local_rules || []).filter((r: any) => r._tombstoned).map((r: any) => r.rule_id)
                  );

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
                            disabled={isReadOnly}
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
                                    disabled={isReadOnly}
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
                              disabled={isReadOnly}
                              className="text-xs border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="">None (no default)</option>
                              {tc.allowed_row_ids.map(rid => {
                                const row = rows.find(r => r.id === rid);
                                return <option key={rid} value={rid}>{row?.label || rid}</option>;
                              })}
                            </select>
                          </div>

                          {/* Inherited Rules (when editing motion-scope config) */}
                          {inheritedLocalRules.length > 0 && scopeType === 'motion' && (
                            <div>
                              <div className="text-[10px] font-medium text-gray-600 mb-1 mt-2 pt-2 border-t border-gray-100">
                                Inherited Rules (from Group)
                              </div>
                              <div className="space-y-1">
                                {inheritedLocalRules.map((rule: any, ri: number) => {
                                  const isTombstoned = localTombstones.has(rule.rule_id);
                                  return (
                                    <div key={ri} className={`text-[10px] px-2 py-1 rounded border ${
                                      isTombstoned
                                        ? 'bg-red-50 border-red-200 text-red-500 line-through'
                                        : 'bg-gray-50 border-gray-200 text-gray-600'
                                    }`}>
                                      <span className="font-mono text-[9px] text-gray-400 mr-1">{rule.rule_id?.substring(0, 8)}...</span>
                                      <span>{rule.action}</span>
                                      {rule.description && <span className="text-gray-400 ml-1">({rule.description})</span>}
                                      {isTombstoned && (
                                        <span className="ml-1 text-red-600 font-medium no-underline">[tombstoned]</span>
                                      )}
                                      {!isTombstoned && (
                                        <span className="ml-1 text-amber-600 font-medium">[inherited]</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Delta Scoring Section */}
                          {workstation.selectedMotionId && tc.allowed_row_ids.length > 0 && (
                            <div>
                              <div className="text-[10px] font-medium text-gray-600 mb-1 mt-2 pt-2 border-t border-gray-100">
                                Delta Scoring
                              </div>
                              <div className="space-y-1">
                                {tc.allowed_row_ids.map(rowId => {
                                  const rowData = workstation.modifierTableData[tableKey]?.[rowId];
                                  if (!rowData) return null;
                                  const compositeKey = `${tableKey}.${rowId}`;
                                  const rowLabel = rows.find(r => r.id === rowId)?.label || rowId;
                                  return (
                                    <DeltaBranchCard
                                      key={compositeKey}
                                      tableKey={tableKey}
                                      tableLabel={MODIFIER_TABLE_LABELS[tableKey] || tableKey}
                                      rowId={rowId}
                                      rowLabel={rowLabel}
                                      motionId={workstation.selectedMotionId!}
                                      motionLabel={workstation.selectedMotion?.label || workstation.selectedMotionId!}
                                      parentMotionId={workstation.selectedMotion?.parent_id || null}
                                      modifierRow={rowData}
                                      motionsMap={workstation.motionsMap}
                                      modifierTableData={workstation.modifierTableData[tableKey] || {}}
                                      dirty={workstation.deltaDirtyKeys.has(compositeKey)}
                                      localOverride={workstation.localDeltaOverrides[compositeKey]}
                                      onDeltaChange={workstation.setLocalDelta}
                                      onSave={workstation.saveDeltaBranch}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ── Right sidebar: simulation + validation + resolver preview ── */}
              <div className="w-80 border-l border-gray-200 bg-gray-50 flex flex-col overflow-hidden">
                {/* Simulation Preview */}
                {workstation.selectedMotionId && (
                  <div className="flex-1 overflow-hidden border-b border-gray-200">
                    <SimulationPreview
                      simulation={simulation}
                      editingConfig={editingConfig}
                      modifierRowLabels={modifierRowLabels}
                      muscleLabels={muscleLabels}
                      simMode={simMode}
                      onSimModeChange={setSimMode}
                      customCombo={customCombo}
                      onCustomComboChange={setCustomCombo}
                      allowedRowsByTable={allowedRowsByTable}
                    />
                  </div>
                )}

                {/* Validation panel */}
                {validation && (
                  <div className="p-3 border-b border-gray-200 max-h-[200px] overflow-y-auto">
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
                    <div className="space-y-1">
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

                {/* Diff against active */}
                {activeConfig && selectedConfig?.status === 'draft' && (
                  <div className="px-3 py-2 border-b border-gray-200">
                    <button
                      onClick={() => setShowDiff(!showDiff)}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      {showDiff ? 'Hide' : 'Show'} Diff vs Active (v{activeConfig.config_version})
                    </button>
                    {showDiff && configDiff && (
                      <div className="mt-2 space-y-1">
                        {configDiff.map((d, i) => (
                          <div key={i} className={`text-[10px] px-1.5 py-1 rounded ${
                            d.type === 'added' ? 'bg-green-50 text-green-800' :
                            d.type === 'removed' ? 'bg-red-50 text-red-800' :
                            'bg-yellow-50 text-yellow-800'
                          }`}>
                            <span className="font-medium">{d.table}</span>: {d.detail}
                          </div>
                        ))}
                      </div>
                    )}
                    {showDiff && !configDiff && (
                      <div className="mt-2 text-[10px] text-gray-400 italic">No differences</div>
                    )}
                  </div>
                )}

                {/* Resolved preview */}
                {showResolverPreview && resolverPreview && (
                  <div className="p-3 overflow-y-auto max-h-[300px]">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-gray-900">Resolved Config Preview</h4>
                      <button onClick={() => setShowResolverPreview(false)} className="text-[10px] text-gray-500 hover:text-gray-700">
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
                    <pre className="text-[9px] bg-gray-900 text-green-400 p-2 rounded overflow-auto max-h-48 whitespace-pre-wrap">
                      {JSON.stringify(resolverPreview, null, 2)}
                    </pre>
                  </div>
                )}

                {!workstation.selectedMotionId && !validation && !showResolverPreview && (
                  <div className="flex-1 flex items-center justify-center text-xs text-gray-400">
                    Select a motion context to see simulation
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
