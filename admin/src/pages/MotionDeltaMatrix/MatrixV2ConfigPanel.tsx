import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../../api';
import toast from 'react-hot-toast';
import type {
  MatrixConfigRow,
  MatrixConfigJson,
  TableConfig,
  ValidationResult,
  ResolverOutput,
  ModifierTableKey,
} from '../../../../shared/types/matrixV2';
import { MODIFIER_TABLE_KEYS } from '../../../../shared/types/matrixV2';
const MODIFIER_TABLE_KEYS_ARR = [...MODIFIER_TABLE_KEYS];
import type { MuscleTargets, ModifierRow } from '../../../../shared/types';
import { useWorkstationState } from '../../hooks/useWorkstationState';
import { useScoringSimulation } from '../../hooks/useScoringSimulation';
import BaselineCard from '../../components/workstation/BaselineCard';
import SimulationPreview from '../../components/workstation/SimulationPreview';
import DeltaBranchCard from '../../components/workstation/DeltaBranchCard';
import DirtyBadge from '../../components/workstation/DirtyBadge';

interface MotionForPanel {
  id: string;
  label: string;
  parent_id?: string | null;
  muscle_targets?: Record<string, unknown>;
}

interface MatrixV2ConfigPanelProps {
  motions: MotionForPanel[];
  /** Optional: for "filter by muscle" dropdown; if not provided, muscle filter is hidden or disabled */
  allMuscles?: Array<{ id: string; label: string }>;
  refreshKey?: number;
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

const MODIFIER_TABLE_GROUPS: Array<{ label: string; tables: ModifierTableKey[] }> = [
  { label: 'Trajectory & Posture', tables: ['motionPaths', 'torsoAngles', 'torsoOrientations', 'resistanceOrigin'] },
  { label: 'Upper Body Mechanics', tables: ['grips', 'gripWidths', 'elbowRelationship', 'executionStyles'] },
  { label: 'Lower Body Mechanics', tables: ['footPositions', 'stanceWidths', 'stanceTypes', 'loadPlacement'] },
  { label: 'Execution Variables', tables: ['supportStructures', 'loadingAids', 'rangeOfMotion'] },
];

function parseDegreeFromId(id: string): number | null {
  const m = id.match(/DEG_(NEG_)?(\d+)/i);
  if (!m) return null;
  const val = parseInt(m[2], 10);
  return m[1] ? -val : val;
}

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

/** Return set of muscle ids that appear in motion's muscle_targets (flat or nested). */
function getMuscleIdsFromTargets(muscle_targets: Record<string, unknown> | undefined): Set<string> {
  if (!muscle_targets || typeof muscle_targets !== 'object') return new Set();
  const ids = new Set<string>();
  for (const [k, v] of Object.entries(muscle_targets)) {
    if (typeof v === 'number') ids.add(k);
    else if (v && typeof v === 'object' && !Array.isArray(v)) {
      getMuscleIdsFromTargets(v as Record<string, unknown>).forEach(id => ids.add(id));
    }
  }
  return ids;
}

export default function MatrixV2ConfigPanel({ motions, allMuscles = [], refreshKey }: MatrixV2ConfigPanelProps) {
  // ─── Matrix config state (existing) ───
  const [configs, setConfigs] = useState<MatrixConfigRow[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<MatrixConfigJson | null>(null);
  const [savedConfig, setSavedConfig] = useState<string>('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [resolverPreview, setResolverPreview] = useState<ResolverOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [modifierRows, setModifierRows] = useState<Record<string, Array<{ id: string; label: string; parent_id?: string | null; [k: string]: unknown }>>>({});

  const [scopeType, setScopeType] = useState<'motion' | 'motion_group'>('motion_group');
  const [scopeId, setScopeId] = useState('');
  const [notes, setNotes] = useState('');
  const [showResolverPreview, setShowResolverPreview] = useState(false);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(MODIFIER_TABLE_GROUPS.map(g => g.label)));
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPasteText, setImportPasteText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Import wizard state
  type ImportStep = 'source' | 'input' | 'column_map' | 'review' | 'importing';
  type ImportParsedRow = { motionId: string; version: number | null; muscleTargets: unknown; tables: Record<string, unknown>; valid: boolean; skipReason?: string };
  type ImportRowMapping = { motionId: string; targetConfigId: string }; // '' = skip, '__new__' = create new draft
  type ImportColumnMappingEntry = { header: string; tableKey: string; include: 'import' | 'exclude' };
  const [importStep, setImportStep] = useState<ImportStep>('source');
  const [importSourceMode, setImportSourceMode] = useState<'json' | 'csv' | 'paste'>('paste');
  const [importParsedRows, setImportParsedRows] = useState<ImportParsedRow[]>([]);
  const [importHasVersionCol, setImportHasVersionCol] = useState(false);
  const [importRowMappings, setImportRowMappings] = useState<ImportRowMapping[]>([]);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string; details?: string[] } | null>(null);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importColumnMapping, setImportColumnMapping] = useState<ImportColumnMappingEntry[]>([]);
  const [selectedColumnIndices, setSelectedColumnIndices] = useState<Set<number>>(new Set());
  const [bulkColumnAction, setBulkColumnAction] = useState<'import' | 'exclude'>('import');
  const [showImportActiveConfirm, setShowImportActiveConfirm] = useState(false);
  const [importConfirmCallback, setImportConfirmCallback] = useState<(() => void) | null>(null);

  // Sidebar collapse state
  const [collapsedScopeGroups, setCollapsedScopeGroups] = useState<Set<string>>(new Set());

  // Motion list filters (below "Matrix V2 Workstation")
  const [motionSearch, setMotionSearch] = useState('');
  const [muscleFilterId, setMuscleFilterId] = useState('');

  // Active-edit confirmation dialogs
  const [showActiveEditSaveConfirm, setShowActiveEditSaveConfirm] = useState(false);
  const [showActiveEditCancelConfirm, setShowActiveEditCancelConfirm] = useState(false);

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
    const rows: Record<string, Array<{ id: string; label: string; parent_id?: string | null; [k: string]: unknown }>> = {};
    for (const key of MODIFIER_TABLE_KEYS) {
      try {
        const data = await api.getTable(key);
        rows[key] = (data as any[]).map(r => ({
          id: r.id,
          label: r.label,
          parent_id: r.parent_id ?? null,
          allow_torso_orientations: r.allow_torso_orientations,
          allows_secondary: r.allows_secondary,
          is_valid_secondary: r.is_valid_secondary,
          sort_order: r.sort_order ?? 0,
        }));
      } catch {
        rows[key] = [];
      }
    }
    setModifierRows(rows);
  }, []);

  useEffect(() => {
    api.ensureDraftsForAllMotions().then(() => loadConfigs()).catch(() => loadConfigs());
    loadModifierRows();
    workstation.loadModifierTableData();
  }, [loadConfigs, loadModifierRows, workstation.loadModifierTableData]);

  useEffect(() => {
    if (refreshKey && refreshKey > 0) {
      loadConfigs();
      loadModifierRows();
      workstation.loadModifierTableData();
    }
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Auto-select motion when scope changes ───
  useEffect(() => {
    if (scopeType === 'motion' && scopeId) {
      workstation.setSelectedMotionId(scopeId);
      const allMotions = Object.values(workstation.motionsMap);
      if (allMotions.length > 0) {
        workstation.loadMotionData(scopeId, allMotions);
      }
    } else if (familyMotions.length === 1) {
      const onlyId = familyMotions[0].id;
      if (workstation.selectedMotionId !== onlyId) {
        workstation.setSelectedMotionId(onlyId);
        const allMotions = Object.values(workstation.motionsMap);
        if (allMotions.length > 0) {
          workstation.loadMotionData(onlyId, allMotions);
        }
      }
    } else if (familyMotions.length > 1 && !workstation.selectedMotionId) {
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

  const handleCreateDraft = async (motionId: string) => {
    const motion = motions.find(m => m.id === motionId);
    if (!motion) return;
    const st = motion.parent_id ? 'motion' : 'motion_group';
    try {
      setLoading(true);
      const { config } = await api.createMatrixConfig({
        scope_type: st as any,
        scope_id: motionId,
        config_json: emptyConfigJson(),
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

  const handleSaveActiveAsNewVersion = async () => {
    if (!selectedConfigId || !editingConfig || !selectedConfig) return;
    try {
      setLoading(true);
      // Clone the original active config
      const cloned = await api.cloneMatrixConfig(selectedConfigId);
      // Apply local edits to the clone
      await api.updateMatrixConfig(cloned.id, { config_json: editingConfig, notes });
      // Activate the clone (auto-demotes the old active to draft)
      const result = await api.activateMatrixConfig(cloned.id);
      if (result.error) { toast.error(result.error); return; }
      toast.success(`Saved as v${cloned.config_version} and activated`);
      await loadConfigs();
      selectConfig(result.config);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save as new version');
    } finally {
      setLoading(false);
      setShowActiveEditSaveConfirm(false);
    }
  };

  const handleCancelActiveEdits = () => {
    if (!selectedConfig) return;
    selectConfig(selectedConfig);
    setShowActiveEditCancelConfirm(false);
    toast('Changes discarded');
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

  const handleDelete = async () => {
    if (!selectedConfigId || !selectedConfig) return;
    try {
      setLoading(true);
      const isActive = selectedConfig.status === 'active';
      const result = await api.deleteMatrixConfig(selectedConfigId, isActive);
      if (!result.ok) {
        toast.error('Delete failed');
        return;
      }
      if (result.was_active) {
        toast.success('Active config deleted — no config is active for this scope now');
      } else {
        toast.success('Draft deleted');
      }
      setSelectedConfigId(null);
      setEditingConfig(null);
      setSavedConfig('');
      setShowDeleteConfirm(false);
      await loadConfigs();
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
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

  const toggleGroupExpand = (group: string) => {
    const next = new Set(expandedGroups);
    if (next.has(group)) next.delete(group);
    else next.add(group);
    setExpandedGroups(next);
  };

  const updateTableConfig = useCallback((tableKey: ModifierTableKey, patch: Partial<TableConfig>) => {
    if (!editingConfig) return;
    const updated = { ...editingConfig };
    const tc = updated.tables[tableKey] || emptyTableConfig();
    updated.tables = { ...updated.tables, [tableKey]: { ...tc, ...patch } };
    setEditingConfig(updated);
  }, [editingConfig]);

  const motionFamily = useMemo(() => {
    if (!scopeId) return [];
    const selectedMotion = motions.find(m => m.id === scopeId);
    const primaryId = selectedMotion?.parent_id || scopeId;
    const primary = motions.find(m => m.id === primaryId);
    if (!primary) return [];
    const children = motions.filter(m => m.parent_id === primaryId);
    return [primary, ...children];
  }, [scopeId, motions]);

  const isActiveConfig = selectedConfig?.status === 'active';
  const activeConfigDirty = isActiveConfig && configDirty;

  // ─── Export helpers ───
  const generateTableExport = useCallback(() => {
    const family = motionFamily.length > 0 ? motionFamily : [motions.find(m => m.id === scopeId)].filter(Boolean) as typeof motions;
    const tableKeys = MODIFIER_TABLE_KEYS as readonly string[];
    const header = ['MOTION_ID', 'MUSCLE_TARGETS', ...tableKeys];
    const rows = family.map(m => {
      const motion = workstation.motionsMap[m.id];
      const mt = motion?.muscle_targets ?? {};
      const cells: string[] = [m.id, JSON.stringify(mt)];
      for (const tk of tableKeys) {
        const tc = editingConfig?.tables[tk as ModifierTableKey];
        if (!tc || !tc.applicability) { cells.push(''); continue; }
        const tableData: Record<string, unknown> = {};
        for (const rid of tc.allowed_row_ids) {
          const rowData = workstation.modifierTableData[tk]?.[rid];
          if (!rowData) continue;
          const delta = rowData.delta_rules?.[m.id];
          tableData[rid] = delta ?? null;
        }
        cells.push(JSON.stringify({ config: tc, deltas: tableData }));
      }
      return cells;
    });
    return { header, rows };
  }, [motionFamily, motions, scopeId, editingConfig, workstation.motionsMap, workstation.modifierTableData]);

  const handleExportJson = async () => {
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
      setShowExportModal(false);
    } catch (err: any) {
      toast.error(err.message || 'Export failed');
    }
  };

  const handleExportTable = useCallback(() => {
    const { header, rows } = generateTableExport();
    const tsv = [header.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    const blob = new Blob([tsv], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `matrix-table-${scopeType}-${scopeId}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  }, [generateTableExport, scopeType, scopeId]);

  const handleCopyTable = useCallback(async () => {
    const { header, rows } = generateTableExport();
    const tsv = [header.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    try {
      await navigator.clipboard.writeText(tsv);
      toast.success('Table copied to clipboard');
      setShowExportModal(false);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  }, [generateTableExport]);

  // ─── Import helpers ───
  const motionIdSet = useMemo(() => new Set(motions.map(m => m.id)), [motions]);

  const parseTableImport = useCallback((text: string): { rows: ImportParsedRow[]; hasVersionCol: boolean; headers: string[] } => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) throw new Error('Table must have at least a header and one data row');
    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const header = lines[0].split(delimiter).map(h => h.trim());
    const motionIdIdx = header.findIndex(h => h.toUpperCase() === 'MOTION_ID');
    const mtIdx = header.findIndex(h => h.toUpperCase() === 'MUSCLE_TARGETS');
    if (motionIdIdx < 0) throw new Error('Missing MOTION_ID column');

    const versionIdx = header.findIndex(h => h.toUpperCase() === 'VERSION');
    const hasVersionCol = versionIdx >= 0;

    const reservedIdxs = new Set([motionIdIdx, mtIdx, versionIdx].filter(i => i >= 0));
    const tableColMap: Record<string, number> = {};
    for (let i = 0; i < header.length; i++) {
      if (!reservedIdxs.has(i)) {
        tableColMap[header[i]] = i;
      }
    }

    const dataRows: ImportParsedRow[] = lines.slice(1).filter(l => l.trim()).map(line => {
      const cells = line.split(delimiter).map(c => c.trim());
      const motionId = cells[motionIdIdx] || '';
      const exists = motionIdSet.has(motionId);

      let muscleTargets: unknown = null;
      if (mtIdx >= 0 && cells[mtIdx]) {
        try { muscleTargets = JSON.parse(cells[mtIdx]); } catch { /* skip invalid JSON */ }
      }

      const tables: Record<string, unknown> = {};
      for (const [key, idx] of Object.entries(tableColMap)) {
        if (cells[idx]) {
          try { tables[key] = JSON.parse(cells[idx]); } catch { /* skip invalid JSON */ }
        }
      }

      const version = hasVersionCol && cells[versionIdx] ? parseInt(cells[versionIdx], 10) || null : null;

      return {
        motionId,
        version,
        muscleTargets,
        tables,
        valid: exists && !!motionId,
        skipReason: !motionId ? 'Empty MOTION_ID' : !exists ? `Motion "${motionId}" not found in motions table` : undefined,
      };
    });
    return { rows: dataRows, hasVersionCol, headers: header };
  }, [motionIdSet]);

  const autoDetectTableKey = useCallback((header: string): string => {
    const h = header.trim();
    const lower = h.toLowerCase();
    if (MODIFIER_TABLE_KEYS_ARR.includes(h as ModifierTableKey)) return h;
    for (const key of MODIFIER_TABLE_KEYS_ARR) {
      if (key.toLowerCase() === lower) return key;
      const label = (MODIFIER_TABLE_LABELS as Record<string, string>)[key];
      if (label && label.toLowerCase() === lower) return key;
    }
    return '';
  }, []);

  // ─── Render ───
  return (
    <div className="h-full flex">
      {/* ── Left sidebar: scope + config list + motion context ── */}
      <div className="w-72 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-3 border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-900">Matrix V2 Workstation</h2>
        </div>

        {/* Search and muscle filter bar */}
        <div className="p-2 border-b border-gray-200 bg-gray-50 space-y-2">
          <input
            type="text"
            placeholder="Search motions..."
            value={motionSearch}
            onChange={(e) => setMotionSearch(e.target.value)}
            className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          {allMuscles.length > 0 && (
            <select
              value={muscleFilterId}
              onChange={(e) => setMuscleFilterId(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All muscles</option>
              {allMuscles
                .filter((m) => m.id && m.label)
                .sort((a, b) => (a.label || '').localeCompare(b.label || ''))
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
            </select>
          )}
        </div>

        {/* Motion Context Selector — only show if there are variations (children) */}
        {familyMotions.length > 1 && (
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
        {scopeType === 'motion_group' && scopeId && (
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

        {/* Config List — all motions, grouped parent→children */}
        <div className="flex-1 overflow-y-auto">
          {(() => {
            const configsByScope = new Map<string, MatrixConfigRow[]>();
            for (const cfg of configs) {
              const arr = configsByScope.get(cfg.scope_id) || [];
              arr.push(cfg);
              configsByScope.set(cfg.scope_id, arr);
            }

            const searchLower = motionSearch.trim().toLowerCase();
            const visibleMotionIds = (() => {
              const set = new Set<string>();
              for (const m of motions) {
                const matchesSearch = !searchLower || (m.label || '').toLowerCase().includes(searchLower);
                const matchesMuscle = !muscleFilterId || getMuscleIdsFromTargets(m.muscle_targets as Record<string, unknown>).has(muscleFilterId);
                if (matchesSearch && matchesMuscle) set.add(m.id);
              }
              return set;
            })();

            const allRoots = motions.filter(m => !m.parent_id).sort((a, b) => a.label.localeCompare(b.label));
            const roots = allRoots.filter((root) => {
              const selfVisible = visibleMotionIds.has(root.id);
              const children = motions.filter(m => m.parent_id === root.id);
              const anyChildVisible = children.some(c => visibleMotionIds.has(c.id));
              return selfVisible || anyChildVisible;
            });

            const renderMotionCard = (motion: typeof motions[0], indent: boolean) => {
              const cfgs = configsByScope.get(motion.id) || [];
              const hasMultiple = cfgs.length > 1;
              const isCollapsed = collapsedScopeGroups.has(motion.id);
              const activeCount = cfgs.filter(c => c.status === 'active').length;
              const draftCount = cfgs.filter(c => c.status === 'draft').length;
              const anySelected = cfgs.some(c => c.id === selectedConfigId);

              return (
                <div key={motion.id} className={`border-b border-gray-100 ${anySelected ? 'bg-blue-50/30' : ''}`}>
                  <div
                    className={`px-3 py-2 flex items-center gap-1.5 ${cfgs.length > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    onClick={() => {
                      if (hasMultiple) {
                        setCollapsedScopeGroups(prev => {
                          const next = new Set(prev);
                          if (next.has(motion.id)) next.delete(motion.id);
                          else next.add(motion.id);
                          return next;
                        });
                      } else if (cfgs.length === 1) {
                        selectConfig(cfgs[0]);
                      }
                    }}
                  >
                    {hasMultiple && (
                      <span className="text-[10px] text-gray-400">{isCollapsed ? '▶' : '▼'}</span>
                    )}
                    {indent && <span className="text-[10px] text-gray-400 mr-0.5">└</span>}
                    <span className="text-xs font-medium text-gray-900 truncate flex-1">
                      {motion.label}
                    </span>
                    <div className="flex items-center gap-1">
                      {activeCount > 0 && <span className="text-[9px] px-1 py-0.5 rounded-full bg-green-100 text-green-800 font-medium">{activeCount} active</span>}
                      {draftCount > 0 && <span className="text-[9px] px-1 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-medium">{draftCount} draft{draftCount > 1 ? 's' : ''}</span>}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCreateDraft(motion.id); }}
                        disabled={loading}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 font-medium whitespace-nowrap"
                      >
                        + Draft
                      </button>
                    </div>
                  </div>
                  {!hasMultiple && cfgs.length === 1 ? null : (
                    !isCollapsed && hasMultiple && (
                      <div className="border-t border-gray-50 ml-2">
                        {cfgs.map(cfg => (
                          <div
                            key={cfg.id}
                            onClick={() => selectConfig(cfg)}
                            className={`px-3 py-1.5 cursor-pointer hover:bg-gray-50 ${selectedConfigId === cfg.id ? 'bg-blue-50' : ''}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-gray-600">v{cfg.config_version}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                cfg.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {cfg.status}
                              </span>
                            </div>
                            {cfg.notes && <div className="text-[9px] text-gray-400 truncate mt-0.5">{cfg.notes}</div>}
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              );
            };

            if (roots.length === 0) {
              return <div className="p-3 text-xs text-gray-400 text-center">No motions found</div>;
            }

            return roots.map(root => {
              const children = motions
                .filter(m => m.parent_id === root.id && visibleMotionIds.has(m.id))
                .sort((a, b) => a.label.localeCompare(b.label));
              return (
                <React.Fragment key={root.id}>
                  {renderMotionCard(root, false)}
                  {children.map(child => renderMotionCard(child, true))}
                </React.Fragment>
              );
            });
          })()}
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
                {scopeType === 'motion_group' ? 'Motion' : 'Variation'}: <strong>{motions.find(m => m.id === scopeId)?.label || scopeId}</strong>
              </span>
              {selectedConfig && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  selectedConfig.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {selectedConfig.status} v{selectedConfig.config_version}
                </span>
              )}
              {activeConfigDirty && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800">
                  Editing active — changes will save as new version
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
              {activeConfigDirty ? (
                <>
                  <button onClick={() => setShowActiveEditSaveConfirm(true)} disabled={loading}
                    className="text-xs bg-green-600 text-white rounded px-3 py-1 hover:bg-green-700 disabled:opacity-50">
                    Save as New Version
                  </button>
                  <button onClick={() => setShowActiveEditCancelConfirm(true)} disabled={loading}
                    className="text-xs bg-gray-500 text-white rounded px-3 py-1 hover:bg-gray-600 disabled:opacity-50">
                    Cancel Changes
                  </button>
                </>
              ) : (
                <>
                  <button onClick={handleSave} disabled={loading || isActiveConfig}
                    className="text-xs bg-blue-600 text-white rounded px-3 py-1 hover:bg-blue-700 disabled:opacity-50">
                    Save Draft
                  </button>
                  <button onClick={handleValidate} disabled={loading}
                    className="text-xs bg-yellow-600 text-white rounded px-3 py-1 hover:bg-yellow-700 disabled:opacity-50">
                    Validate
                  </button>
                  <button onClick={handleActivate} disabled={loading || isActiveConfig}
                    className="text-xs bg-green-600 text-white rounded px-3 py-1 hover:bg-green-700 disabled:opacity-50">
                    Activate
                  </button>
                  <button onClick={handleClone} disabled={loading}
                    className="text-xs bg-gray-600 text-white rounded px-3 py-1 hover:bg-gray-700 disabled:opacity-50">
                    Clone
                  </button>
                </>
              )}
              <button onClick={() => setShowDeleteConfirm(true)} disabled={loading}
                className="text-xs bg-red-600 text-white rounded px-3 py-1 hover:bg-red-700 disabled:opacity-50">
                Delete
              </button>
              <button onClick={handleResolverPreview} disabled={loading}
                className="text-xs bg-purple-600 text-white rounded px-3 py-1 hover:bg-purple-700 disabled:opacity-50">
                Preview Config
              </button>
              <button onClick={() => setShowExportModal(true)} disabled={loading}
                className="text-xs bg-gray-500 text-white rounded px-3 py-1 hover:bg-gray-600 disabled:opacity-50">
                Export
              </button>
              <button onClick={() => { setShowImportModal(true); setImportStep('source'); setImportParsedRows([]); setImportResult(null); setImportPasteText(''); setImportHasVersionCol(false); setImportRowMappings([]); }} disabled={loading}
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
                {MODIFIER_TABLE_GROUPS.map(group => {
                  const isGroupExpanded = expandedGroups.has(group.label);
                  return (
                    <div key={group.label} className="border border-gray-300 rounded bg-white">
                      <div
                        className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-gray-100 bg-gray-50"
                        onClick={() => toggleGroupExpand(group.label)}
                      >
                        <span className="text-xs text-gray-500">{isGroupExpanded ? '▼' : '▶'}</span>
                        <span className="text-xs font-bold text-gray-700">{group.label}</span>
                        <span className="text-[10px] text-gray-400 ml-auto">
                          {group.tables.filter(tk => editingConfig.tables[tk]?.applicability).length}/{group.tables.length} active
                        </span>
                      </div>
                      {isGroupExpanded && (
                        <div className="border-t border-gray-200 space-y-0">
                          {group.tables.map(tableKey => {
                            const tc = editingConfig.tables[tableKey];
                            const isApplicable = tc?.applicability ?? false;
                            const isExpanded = expandedTables.has(tableKey);
                            const rows = modifierRows[tableKey] || [];
                            const hasHierarchy = rows.some(r => r.parent_id);
                            const useVertical = rows.length > 10 || hasHierarchy || (tc?.one_per_group === true);
                            const allowedSet = new Set(tc?.allowed_row_ids || []);

                            const visibleRows = rows.filter(row => {
                              if (!row.parent_id) return true;
                              return allowedSet.has(row.parent_id as string);
                            });
                            // Order so parents are followed by their children (nested list)
                            const orderedRows = (() => {
                              const roots = visibleRows.filter(r => !r.parent_id).sort((a, b) => (a.label || a.id).localeCompare(b.label || b.id));
                              const result: typeof visibleRows = [];
                              const seen = new Set<string>();
                              for (const root of roots) {
                                result.push(root);
                                seen.add(root.id);
                                const children = visibleRows.filter(r => r.parent_id === root.id).sort((a, b) => (a.label || a.id).localeCompare(b.label || b.id));
                                for (const c of children) {
                                  result.push(c);
                                  seen.add(c.id);
                                }
                              }
                              // Orphans (e.g. child whose parent not in visibleRows) at end
                              for (const row of visibleRows) {
                                if (!seen.has(row.id)) result.push(row);
                              }
                              return result;
                            })();
                            // Same order for allowed ids (used in Load Placement and Delta Scoring)
                            const orderedAllowedIds = orderedRows.filter(r => allowedSet.has(r.id)).map(r => r.id);

                            const groupConfig = scopeType === 'motion'
                              ? configs.find(c => c.scope_type === 'motion_group' && c.status === 'active' && motions.find(m => m.id === scopeId)?.parent_id === c.scope_id)
                              : null;
                            const groupTableConfig = groupConfig?.config_json?.tables?.[tableKey as ModifierTableKey];
                            const inheritedLocalRules = groupTableConfig?.local_rules || [];
                            const localTombstones = new Set(
                              (tc?.local_rules || []).filter((r: any) => r._tombstoned).map((r: any) => r.rule_id)
                            );

                            const isTorsoOrientations = tableKey === 'torsoOrientations';
                            const torsoAnglesConfig = editingConfig.tables['torsoAngles'];
                            let torsoOrientationsDisabled = false;
                            if (isTorsoOrientations && torsoAnglesConfig) {
                              const torsoAngleRows = modifierRows['torsoAngles'] || [];
                              const anyAllowOrientations = (torsoAnglesConfig.allowed_row_ids || []).some(rid => {
                                const r = torsoAngleRows.find(row => row.id === rid);
                                return r?.allow_torso_orientations === true;
                              });
                              if (!anyAllowOrientations) torsoOrientationsDisabled = true;
                            }

                            return (
                              <div key={tableKey} className={`border-b border-gray-100 last:border-b-0 ${torsoOrientationsDisabled ? 'opacity-50' : ''}`}>
                                <div
                                  className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-gray-50"
                                  onClick={() => toggleTableExpand(tableKey)}
                                >
                                  <span className="text-xs text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                                  <label className="flex items-center gap-1.5 cursor-pointer" onClick={e => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      checked={isApplicable}
                                      onChange={() => !torsoOrientationsDisabled && toggleTableApplicability(tableKey)}
                                      className="rounded border-gray-300"
                                      disabled={torsoOrientationsDisabled}
                                    />
                                    <span className="text-xs font-medium text-gray-800">
                                      {MODIFIER_TABLE_LABELS[tableKey] || tableKey}
                                    </span>
                                  </label>
                                  {torsoOrientationsDisabled && (
                                    <span className="text-[9px] text-orange-600 italic">No torso angles allow orientations</span>
                                  )}
                                  {isApplicable && !torsoOrientationsDisabled && (
                                    <span className="text-[10px] text-gray-500">
                                      {tc?.allowed_row_ids.length || 0} rows
                                      {tc?.default_row_id && ` | default: ${tc.default_row_id}`}
                                    </span>
                                  )}
                                </div>

                                {isExpanded && isApplicable && tc && !torsoOrientationsDisabled && (
                                  <div className="border-t border-gray-100 px-3 py-2 space-y-2">
                                    {/* Default / Home-Base + Allow 1 Per Group row */}
                                    <div className="flex items-center gap-4 flex-wrap">
                                      <div>
                                        <div className="text-[10px] font-medium text-gray-600 mb-1">Default / Home-Base</div>
                                        <select
                                          value={tc.default_row_id || ''}
                                          onChange={(e) => setDefaultRow(tableKey, e.target.value || null)}
                                          className="text-xs border border-gray-300 rounded px-2 py-1"
                                        >
                                          <option value="">None (no default)</option>
                                          {orderedAllowedIds.map(rid => {
                                            const row = rows.find(r => r.id === rid);
                                            return <option key={rid} value={rid}>{row?.parent_id ? '└ ' : ''}{row?.label || rid}</option>;
                                          })}
                                        </select>
                                      </div>
                                      <label className="flex items-center gap-1.5 cursor-pointer shrink-0 pt-5">
                                        <input
                                          type="checkbox"
                                          checked={tc.one_per_group ?? false}
                                          onChange={() => updateTableConfig(tableKey, { one_per_group: !tc.one_per_group })}
                                          className="rounded border-gray-300"
                                        />
                                        <span className="text-[10px] font-medium text-gray-700">1 row per group</span>
                                      </label>
                                    </div>

                                    {/* Allowed rows */}
                                    <div>
                                      <div className="text-[10px] font-medium text-gray-600 mb-1">Allowed Rows</div>
                                      <div className={useVertical ? 'flex flex-col gap-0.5' : 'flex flex-wrap gap-1'}>
                                        {orderedRows.map(row => {
                                          const isAllowed = allowedSet.has(row.id);
                                          const isChild = !!row.parent_id;
                                          const assignments = tc.row_motion_assignments || {};
                                          const assignedMotionId = assignments[row.id] || '';
                                          const takenMotionIds = new Set(
                                            Object.entries(assignments)
                                              .filter(([rid]) => rid !== row.id)
                                              .map(([, mid]) => mid)
                                          );
                                          return (
                                            <div key={row.id} className={`flex items-center gap-1 ${isChild ? 'ml-4' : ''}`}>
                                              <button
                                                onClick={() => toggleAllowedRow(tableKey, row.id)}
                                                className={`text-[10px] px-2 py-0.5 rounded border text-center whitespace-nowrap min-w-[120px] ${
                                                  isAllowed
                                                    ? 'bg-blue-100 border-blue-300 text-blue-800'
                                                    : 'bg-gray-50 border-gray-200 text-gray-500'
                                                } hover:opacity-80 disabled:opacity-50`}
                                              >
                                                {isChild && <span className="text-gray-400 mr-1">└</span>}
                                                {row.label}
                                              </button>
                                              {tc.one_per_group && isAllowed && motionFamily.length > 0 && (
                                                <select
                                                  value={assignedMotionId}
                                                  onChange={async (e) => {
                                                    const oldMotionId = assignedMotionId;
                                                    const newMotionId = e.target.value;
                                                    const next = { ...assignments, [row.id]: newMotionId };
                                                    if (!newMotionId) delete next[row.id];
                                                    updateTableConfig(tableKey, { row_motion_assignments: next });

                                                    if (oldMotionId && newMotionId && oldMotionId !== newMotionId) {
                                                      const rowData = workstation.modifierTableData[tableKey]?.[row.id];
                                                      if (rowData?.delta_rules) {
                                                        const dr = { ...(rowData.delta_rules as Record<string, unknown>) };
                                                        if (dr[oldMotionId] !== undefined) {
                                                          dr[newMotionId] = dr[oldMotionId];
                                                          delete dr[oldMotionId];
                                                          try {
                                                            await api.updateRow(tableKey, row.id, { delta_rules: dr });
                                                            workstation.loadModifierTableData();
                                                          } catch (err) {
                                                            console.warn('Failed to move delta_rules on reassignment:', err);
                                                          }
                                                        }
                                                      }
                                                    }
                                                  }}
                                                  className="text-[9px] border border-gray-300 rounded px-1 py-0.5 max-w-[140px]"
                                                >
                                                  <option value="">Unassigned</option>
                                                  {motionFamily.map(m => (
                                                    <option
                                                      key={m.id}
                                                      value={m.id}
                                                      disabled={takenMotionIds.has(m.id)}
                                                    >
                                                      {m.parent_id ? '└ ' : ''}{m.label}
                                                      {takenMotionIds.has(m.id) ? ' (taken)' : ''}
                                                    </option>
                                                  ))}
                                                </select>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    {/* Torso Angles: Angle Range Editor */}
                                    {tableKey === 'torsoAngles' && tc.allowed_row_ids.length > 0 && (() => {
                                      const ar = tc.angle_range || { min: -90, max: 90, step: 5, default: 0 };
                                      const degreeOpts: number[] = [];
                                      for (let d = -90; d <= 90; d += 5) degreeOpts.push(d);

                                      const handleAngleRangeChange = (field: 'min' | 'max', newVal: number) => {
                                        const updatedAr = { ...ar, [field]: newVal };

                                        const allAngleRows = modifierRows['torsoAngles'] || [];
                                        const inRangeIds: string[] = [];
                                        const outOfRangeIds: string[] = [];
                                        for (const aRow of allAngleRows) {
                                          const deg = parseDegreeFromId(aRow.id);
                                          if (deg === null) continue;
                                          if (deg >= updatedAr.min && deg <= updatedAr.max) {
                                            inRangeIds.push(aRow.id);
                                          } else if (allowedSet.has(aRow.id)) {
                                            outOfRangeIds.push(aRow.id);
                                          }
                                        }

                                        let newAllowed = [...tc.allowed_row_ids];
                                        for (const id of inRangeIds) {
                                          if (!newAllowed.includes(id)) newAllowed.push(id);
                                        }

                                        if (outOfRangeIds.length > 0) {
                                          const labels = outOfRangeIds.map(id => {
                                            const r = allAngleRows.find(row => row.id === id);
                                            return r?.label || id;
                                          });
                                          if (confirm(`The following rows are outside the new range and will be removed:\n${labels.join(', ')}\n\nContinue?`)) {
                                            newAllowed = newAllowed.filter(id => !outOfRangeIds.includes(id));
                                          }
                                        }

                                        updateTableConfig(tableKey, {
                                          angle_range: updatedAr,
                                          allowed_row_ids: newAllowed,
                                        });
                                      };

                                      return (
                                        <div className="border-t border-gray-100 pt-2">
                                          <div className="text-[10px] font-medium text-gray-600 mb-1">Angle Range</div>
                                          <div className="grid grid-cols-4 gap-2">
                                            <div>
                                              <label className="text-[9px] text-gray-500 block">min</label>
                                              <select
                                                value={ar.min}
                                                onChange={(e) => handleAngleRangeChange('min', parseInt(e.target.value))}
                                                className="w-full text-[10px] border border-gray-300 rounded px-1.5 py-0.5"
                                              >
                                                {degreeOpts.filter(d => d < ar.max).map(d => (
                                                  <option key={d} value={d}>{d}&deg;</option>
                                                ))}
                                              </select>
                                            </div>
                                            <div>
                                              <label className="text-[9px] text-gray-500 block">max</label>
                                              <select
                                                value={ar.max}
                                                onChange={(e) => handleAngleRangeChange('max', parseInt(e.target.value))}
                                                className="w-full text-[10px] border border-gray-300 rounded px-1.5 py-0.5"
                                              >
                                                {degreeOpts.filter(d => d > ar.min).map(d => (
                                                  <option key={d} value={d}>{d}&deg;</option>
                                                ))}
                                              </select>
                                            </div>
                                            <div>
                                              <label className="text-[9px] text-gray-500 block">step</label>
                                              <input
                                                type="number"
                                                value={ar.step}
                                                onChange={(e) => updateTableConfig(tableKey, { angle_range: { ...ar, step: parseFloat(e.target.value) || 5 } })}
                                                className="w-full text-[10px] border border-gray-300 rounded px-1.5 py-0.5"
                                              />
                                            </div>
                                            <div>
                                              <label className="text-[9px] text-gray-500 block">default</label>
                                              <input
                                                type="number"
                                                value={ar.default}
                                                onChange={(e) => updateTableConfig(tableKey, { angle_range: { ...ar, default: parseFloat(e.target.value) || 0 } })}
                                                className="w-full text-[10px] border border-gray-300 rounded px-1.5 py-0.5"
                                              />
                                            </div>
                                          </div>
                                          <div className="text-[9px] text-gray-400 mt-1">
                                            Range: {ar.min}&deg; to {ar.max}&deg; &mdash; rows within range are auto-selected
                                          </div>
                                        </div>
                                      );
                                    })()}

                                    {/* Load Placement: Secondary Config */}
                                    {tableKey === 'loadPlacement' && tc.allowed_row_ids.length > 0 && (() => {
                                      const lpRows = modifierRows['loadPlacement'] || [];
                                      const secOverrides = tc.secondary_overrides || {};
                                      const validSecIds = tc.valid_secondary_ids ||
                                        lpRows.filter(r => r.is_valid_secondary === true).map(r => r.id);
                                      const allowedWithSecondary = tc.allowed_row_ids.filter(rid => {
                                        const r = lpRows.find(row => row.id === rid);
                                        return r?.allows_secondary === true;
                                      });
                                      if (allowedWithSecondary.length === 0) return null;
                                      return (
                                        <div className="border-t border-gray-100 pt-2">
                                          <div className="text-[10px] font-medium text-gray-600 mb-1">Secondary Placement Config</div>
                                          <div className="space-y-1.5">
                                            {orderedAllowedIds.map(rid => {
                                              const r = lpRows.find(row => row.id === rid);
                                              if (!r) return null;
                                              const nativeAllows = r.allows_secondary === true;
                                              const effectiveAllows = nativeAllows && (secOverrides[rid] !== false);
                                              return (
                                                <div key={rid} className="text-[10px] border border-gray-200 rounded p-1.5">
                                                  <div className="flex items-center gap-2">
                                                    <span className="font-medium text-gray-700">{r.label}</span>
                                                    {nativeAllows ? (
                                                      <label className="flex items-center gap-1 cursor-pointer ml-auto">
                                                        <input
                                                          type="checkbox"
                                                          checked={effectiveAllows}
                                                          onChange={() => {
                                                            const next = { ...secOverrides, [rid]: !effectiveAllows };
                                                            updateTableConfig(tableKey, { secondary_overrides: next });
                                                          }}
                                                          className="rounded border-gray-300"
                                                        />
                                                        <span className="text-[9px] text-gray-500">Allows secondary</span>
                                                      </label>
                                                    ) : (
                                                      <span className="text-[9px] text-gray-400 ml-auto">No secondary</span>
                                                    )}
                                                  </div>
                                                  {effectiveAllows && (
                                                    <div className="mt-1 ml-2">
                                                      <div className="text-[9px] text-gray-500 mb-0.5">Valid secondary placements:</div>
                                                      <div className="flex flex-wrap gap-0.5">
                                                        {lpRows.filter(sr => sr.is_valid_secondary === true).map(sr => {
                                                          const isSelected = validSecIds.includes(sr.id);
                                                          return (
                                                            <button
                                                              key={sr.id}
                                                              onClick={() => {
                                                                const next = isSelected
                                                                  ? validSecIds.filter((id: string) => id !== sr.id)
                                                                  : [...validSecIds, sr.id];
                                                                updateTableConfig(tableKey, { valid_secondary_ids: next });
                                                              }}
                                                              className={`text-[9px] px-1.5 py-0.5 rounded border ${
                                                                isSelected
                                                                  ? 'bg-green-100 border-green-300 text-green-800'
                                                                  : 'bg-gray-50 border-gray-200 text-gray-400'
                                                              }`}
                                                            >
                                                              {sr.label}
                                                            </button>
                                                          );
                                                        })}
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      );
                                    })()}

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
                                    {tc.allowed_row_ids.length > 0 && (() => {
                                      const resolvedMotionId = tc.one_per_group ? null : workstation.selectedMotionId;
                                      if (!tc.one_per_group && !resolvedMotionId) return null;
                                      const assignments = tc.row_motion_assignments || {};
                                      const takenMotionIds = new Set(Object.values(assignments));

                                      return (
                                        <div>
                                          <div className="text-[10px] font-medium text-red-700 mb-1 mt-2 pt-2 border-t border-red-200">
                                            Delta Scoring
                                          </div>
                                          <div className="space-y-1">
                                            {orderedAllowedIds.map(rowId => {
                                              const rowData = workstation.modifierTableData[tableKey]?.[rowId];
                                              if (!rowData) return null;
                                              const compositeKey = `${tableKey}.${rowId}`;
                                              const rowLabel = rows.find(r => r.id === rowId)?.label || rowId;

                                              if (tc.one_per_group) {
                                                const assignedMid = assignments[rowId] || '';
                                                if (!assignedMid) return null;
                                                const assignmentDropdown = (
                                                  <select
                                                    value={assignedMid}
                                                    onChange={async (e) => {
                                                      const oldMid = assignedMid;
                                                      const newMid = e.target.value;
                                                      const next = { ...assignments, [rowId]: newMid };
                                                      if (!newMid) delete next[rowId];
                                                      updateTableConfig(tableKey, { row_motion_assignments: next });

                                                      if (oldMid && newMid && oldMid !== newMid) {
                                                        const rd = workstation.modifierTableData[tableKey]?.[rowId];
                                                        if (rd?.delta_rules) {
                                                          const dr = { ...(rd.delta_rules as Record<string, unknown>) };
                                                          if (dr[oldMid] !== undefined) {
                                                            dr[newMid] = dr[oldMid];
                                                            delete dr[oldMid];
                                                            try {
                                                              await api.updateRow(tableKey, rowId, { delta_rules: dr });
                                                              workstation.loadModifierTableData();
                                                            } catch (err) {
                                                              console.warn('Failed to move delta_rules on reassignment:', err);
                                                            }
                                                          }
                                                        }
                                                      }
                                                    }}
                                                    className="text-[9px] border border-gray-300 rounded px-1 py-0.5 max-w-[120px]"
                                                    onClick={e => e.stopPropagation()}
                                                  >
                                                    <option value="">Unassigned</option>
                                                    {motionFamily.map(m => (
                                                      <option key={m.id} value={m.id} disabled={takenMotionIds.has(m.id) && m.id !== assignedMid}>
                                                        {m.parent_id ? '└ ' : ''}{m.label}
                                                      </option>
                                                    ))}
                                                  </select>
                                                );

                                                return (
                                                  <DeltaBranchCard
                                                    key={compositeKey}
                                                    tableKey={tableKey}
                                                    tableLabel={MODIFIER_TABLE_LABELS[tableKey] || tableKey}
                                                    rowId={rowId}
                                                    rowLabel={rowLabel}
                                                    motionId={assignedMid}
                                                    motionLabel={motionFamily.find(m => m.id === assignedMid)?.label || assignedMid}
                                                    parentMotionId={motionFamily.find(m => m.id === assignedMid)?.parent_id || null}
                                                    modifierRow={rowData}
                                                    motionsMap={workstation.motionsMap}
                                                    modifierTableData={workstation.modifierTableData[tableKey] || {}}
                                                    dirty={workstation.deltaDirtyKeys.has(compositeKey)}
                                                    localOverride={workstation.localDeltaOverrides[compositeKey]}
                                                    onDeltaChange={workstation.setLocalDelta}
                                                    onSave={workstation.saveDeltaBranch}
                                                    inlineAssignment={assignmentDropdown}
                                                  />
                                                );
                                              }

                                              return (
                                                <DeltaBranchCard
                                                  key={compositeKey}
                                                  tableKey={tableKey}
                                                  tableLabel={MODIFIER_TABLE_LABELS[tableKey] || tableKey}
                                                  rowId={rowId}
                                                  rowLabel={rowLabel}
                                                  motionId={resolvedMotionId!}
                                                  motionLabel={workstation.selectedMotion?.label || resolvedMotionId!}
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
                                      );
                                    })()}
                                  </div>
                                )}
                              </div>
                            );
                          })}
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

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-4 w-96 space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Export Config</h3>
            <div className="space-y-2">
              <button
                onClick={handleExportJson}
                disabled={!selectedConfigId}
                className="w-full text-left text-xs border border-gray-200 rounded p-2 hover:bg-gray-50 disabled:opacity-50"
              >
                <div className="font-medium text-gray-800">Full JSON</div>
                <div className="text-gray-500 mt-0.5">Download complete config as JSON file</div>
              </button>
              <button
                onClick={handleExportTable}
                className="w-full text-left text-xs border border-gray-200 rounded p-2 hover:bg-gray-50"
              >
                <div className="font-medium text-gray-800">Table (TSV)</div>
                <div className="text-gray-500 mt-0.5">Download motion x delta table for Excel</div>
              </button>
              <button
                onClick={handleCopyTable}
                className="w-full text-left text-xs border border-gray-200 rounded p-2 hover:bg-blue-50"
              >
                <div className="font-medium text-blue-800">Copy Table to Clipboard</div>
                <div className="text-blue-600 mt-0.5">Tab-separated, paste directly into Excel</div>
              </button>
            </div>
            <button
              onClick={() => setShowExportModal(false)}
              className="w-full text-xs text-gray-500 hover:text-gray-700 py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Import Wizard Modal */}
      {showImportModal && (() => {
        const validRows = importParsedRows.filter(r => r.valid);
        const skippedRows = importParsedRows.filter(r => !r.valid);
        const importableCount = importHasVersionCol
          ? validRows.length
          : importRowMappings.filter(m => m.targetConfigId !== '').length;

        const configsForMotion = (motionId: string) => {
          const motion = motions.find(m => m.id === motionId);
          if (!motion) return [];
          const isChild = !!motion.parent_id;
          const scopeType = isChild ? 'motion' : 'motion_group';
          const scopeId = motionId;
          return configs.filter(c => c.scope_type === scopeType && c.scope_id === scopeId);
        };

        const runImportWithForce = async (forceUpdateActive: boolean) => {
          setShowImportActiveConfirm(false);
          setImportConfirmCallback(null);
          setImportStep('importing');
          const details: string[] = [];
          let applied = 0;

          try {
            for (let i = 0; i < validRows.length; i++) {
              const row = validRows[i];
              let targetConfigId: string | null = null;

              if (importHasVersionCol && row.version) {
                const motion = motions.find(m => m.id === row.motionId);
                const isChild = !!motion?.parent_id;
                const scopeType = isChild ? 'motion' : 'motion_group';
                const matching = configs.filter(c => c.scope_type === scopeType && c.scope_id === row.motionId && c.config_version === row.version);
                if (matching.length > 0) {
                  targetConfigId = matching[0].id;
                } else {
                  details.push(`${row.motionId} v${row.version}: no matching draft found, skipped`);
                  continue;
                }
              } else {
                const mapping = importRowMappings.find(m => m.motionId === row.motionId);
                if (!mapping || !mapping.targetConfigId) {
                  details.push(`${row.motionId}: skipped (no version selected)`);
                  continue;
                }
                targetConfigId = mapping.targetConfigId;
              }

              if (targetConfigId === '__new__') {
                const motion = motions.find(m => m.id === row.motionId);
                const isChild = !!motion?.parent_id;
                try {
                  const { config: newCfg } = await api.createMatrixConfig({
                    scope_type: isChild ? 'motion' : 'motion_group',
                    scope_id: row.motionId,
                    config_json: emptyConfigJson(),
                    notes: 'Created via import',
                  });
                  targetConfigId = newCfg.id;
                } catch (err: any) {
                  details.push(`${row.motionId}: failed to create draft — ${err.message}`);
                  continue;
                }
              }

              if (!targetConfigId || targetConfigId === '__new__') {
                details.push(`${row.motionId}: skipped (no valid target config)`);
                continue;
              }

              try {
                const existingCfg = await api.getMatrixConfig(targetConfigId);
                if (!existingCfg) { details.push(`${row.motionId}: config not found`); continue; }
                const cfgJson = existingCfg.config_json as MatrixConfigJson;
                const isActive = existingCfg.status === 'active';

                if (row.tables && importColumnMapping.length > 0) {
                  for (const entry of importColumnMapping) {
                    if (entry.include !== 'import' || !entry.tableKey) continue;
                    const cellData = row.tables[entry.header];
                    if (!cellData) continue;
                    const parsed = cellData as { config?: TableConfig; deltas?: Record<string, unknown> };
                    if (parsed.config) {
                      cfgJson.tables = { ...cfgJson.tables, [entry.tableKey]: parsed.config };
                    }
                  }
                }

                await api.updateMatrixConfig(targetConfigId, {
                  config_json: cfgJson,
                  notes: existingCfg.notes || undefined,
                  force: isActive && forceUpdateActive,
                });

                if (row.muscleTargets) {
                  details.push(`${row.motionId}: config updated + muscle targets included (apply via baseline card)`);
                } else {
                  details.push(`${row.motionId}: config updated`);
                }
                applied++;
              } catch (err: any) {
                details.push(`${row.motionId}: update failed — ${err.message}`);
              }
            }

            for (const s of skippedRows) {
              details.push(`${s.motionId || '(empty)'}: skipped — ${s.skipReason}`);
            }

            await loadConfigs();
            setImportResult({
              success: applied > 0,
              message: `${applied} of ${validRows.length} row${validRows.length !== 1 ? 's' : ''} applied${skippedRows.length > 0 ? `, ${skippedRows.length} skipped (invalid motion ID)` : ''}`,
              details,
            });
          } catch (err: any) {
            setImportResult({ success: false, message: err.message || 'Import failed', details });
          }
        };

        const handleApplyImport = () => {
          const targetIds = new Set<string>();
          for (const row of validRows) {
            let targetConfigId: string | null = null;
            if (importHasVersionCol && row.version) {
              const motion = motions.find(m => m.id === row.motionId);
              const isChild = !!motion?.parent_id;
              const scopeType = isChild ? 'motion' : 'motion_group';
              const matching = configs.filter(c => c.scope_type === scopeType && c.scope_id === row.motionId && c.config_version === row.version);
              if (matching.length > 0) targetConfigId = matching[0].id;
            } else {
              const mapping = importRowMappings.find(m => m.motionId === row.motionId);
              targetConfigId = mapping?.targetConfigId && mapping.targetConfigId !== '__new__' ? mapping.targetConfigId : null;
            }
            if (targetConfigId) targetIds.add(targetConfigId);
          }
          const activeTargets = configs.filter(c => targetIds.has(c.id) && c.status === 'active');
          if (activeTargets.length > 0) {
            setImportConfirmCallback(() => runImportWithForce(true));
            setShowImportActiveConfirm(true);
            return;
          }
          runImportWithForce(false);
        };

        return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                {importStep !== 'source' && importStep !== 'importing' && (
                  <button
                    onClick={() => setImportStep(importStep === 'review' ? 'column_map' : importStep === 'column_map' ? 'input' : 'source')}
                    className="text-gray-400 hover:text-gray-700 text-lg"
                  >←</button>
                )}
                <h2 className="text-base font-semibold text-gray-800">
                  {importStep === 'source' ? 'Import Config Data' : importStep === 'input' ? (importSourceMode === 'json' ? 'Upload JSON' : importSourceMode === 'csv' ? 'Upload CSV / TSV' : 'Paste Table Data') : importStep === 'column_map' ? 'Map Import Columns' : importStep === 'review' ? 'Review & Map Import' : 'Importing'}
                </h2>
              </div>
              {importStep !== 'importing' && (
                <button onClick={() => { setShowImportModal(false); setImportPasteText(''); }} className="text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
              )}
            </div>
            {/* Body */}
            <div className="px-6 py-5 overflow-y-auto flex-1">
              {importStep === 'source' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">Choose how you want to import data.</p>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => { setImportSourceMode('json'); setImportStep('input'); }}
                      className="p-4 border-2 rounded-lg text-left hover:border-blue-400 transition-colors border-gray-200"
                    >
                      <div className="font-semibold text-gray-800 text-sm">Full JSON</div>
                      <p className="text-xs text-gray-500 mt-1">Upload a complete config JSON file</p>
                    </button>
                    <button
                      onClick={() => { setImportSourceMode('csv'); setImportStep('input'); }}
                      className="p-4 border-2 rounded-lg text-left hover:border-blue-400 transition-colors border-gray-200"
                    >
                      <div className="font-semibold text-gray-800 text-sm">CSV / TSV File</div>
                      <p className="text-xs text-gray-500 mt-1">Upload a delimited table file</p>
                    </button>
                    <button
                      onClick={() => { setImportSourceMode('paste'); setImportStep('input'); }}
                      className="p-4 border-2 rounded-lg text-left hover:border-blue-400 transition-colors border-gray-200"
                    >
                      <div className="font-semibold text-gray-800 text-sm">Paste Table</div>
                      <p className="text-xs text-gray-500 mt-1">Paste tab-separated data from a spreadsheet</p>
                    </button>
                  </div>
                </div>
              )}

              {importStep === 'input' && importSourceMode === 'json' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">Select a JSON file containing a full Matrix V2 config.</p>
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
                          setImportStep('importing');
                          const result = await api.importMatrixConfig(data, 'create');
                          if (result.imported) {
                            setImportResult({ success: true, message: 'Config imported successfully' });
                            await loadConfigs();
                            if (result.config) selectConfig(result.config);
                          } else {
                            setValidation(result.validation);
                            setImportResult({ success: false, message: 'Import has validation issues - review before saving' });
                          }
                        } catch (err: any) {
                          setImportResult({ success: false, message: err.message || 'Import failed' });
                        }
                      };
                      input.click();
                    }}
                  >
                    <p className="text-gray-600 font-medium">Click to choose JSON file</p>
                    <p className="text-xs text-gray-400 mt-1">.json files only</p>
                  </div>
                </div>
              )}

              {importStep === 'input' && (importSourceMode === 'csv' || importSourceMode === 'paste') && (
                <div className="space-y-4">
                  {importSourceMode === 'csv' ? (
                    <>
                      <p className="text-sm text-gray-500">Upload a CSV, TSV, or delimited text file. Expected columns: MOTION_ID (required), MUSCLE_TARGETS, VERSION (optional), then modifier table columns.</p>
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
                              const { rows, hasVersionCol, headers } = parseTableImport(text);
                              setImportParsedRows(rows);
                              setImportHasVersionCol(hasVersionCol);
                              setImportHeaders(headers);
                              const reserved = new Set(['MOTION_ID', 'MUSCLE_TARGETS', 'VERSION']);
                              setImportColumnMapping(headers.map(h => {
                                const tableKey = reserved.has(h.toUpperCase()) ? '' : autoDetectTableKey(h);
                                return { header: h, tableKey, include: tableKey ? 'import' as const : 'exclude' as const };
                              }));
                              setSelectedColumnIndices(new Set());
                              const validR = rows.filter(r => r.valid);
                              if (!hasVersionCol) {
                                setImportRowMappings(validR.map(r => {
                                  const cfgs = configsForMotion(r.motionId);
                                  return { motionId: r.motionId, targetConfigId: cfgs.length === 1 ? cfgs[0].id : cfgs.length === 0 ? '__new__' : '' };
                                }));
                              }
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
                      <p className="text-sm text-gray-500">Paste tab-separated data below. Expected columns: MOTION_ID (required), MUSCLE_TARGETS, VERSION (optional), then modifier table columns.</p>
                      <textarea
                        value={importPasteText}
                        onChange={(e) => setImportPasteText(e.target.value)}
                        placeholder={"MOTION_ID\tVERSION\tMUSCLE_TARGETS\tgrips\t...\nPRESS\t2\t{...}\t{...}\t..."}
                        className="w-full h-48 border border-gray-300 rounded-lg p-3 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => {
                          try {
                            const { rows, hasVersionCol, headers } = parseTableImport(importPasteText);
                            setImportParsedRows(rows);
                            setImportHasVersionCol(hasVersionCol);
                            setImportHeaders(headers);
                            const reserved = new Set(['MOTION_ID', 'MUSCLE_TARGETS', 'VERSION']);
                            setImportColumnMapping(headers.map(h => {
                              const tableKey = reserved.has(h.toUpperCase()) ? '' : autoDetectTableKey(h);
                              return { header: h, tableKey, include: tableKey ? 'import' as const : 'exclude' as const };
                            }));
                            setSelectedColumnIndices(new Set());
                            const validR = rows.filter(r => r.valid);
                            if (!hasVersionCol) {
                              setImportRowMappings(validR.map(r => {
                                const cfgs = configsForMotion(r.motionId);
                                return { motionId: r.motionId, targetConfigId: cfgs.length === 1 ? cfgs[0].id : cfgs.length === 0 ? '__new__' : '' };
                              }));
                            }
                            setImportStep('column_map');
                          } catch (err: any) {
                            toast.error(err.message || 'Parse failed');
                          }
                        }}
                        disabled={!importPasteText.trim()}
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
                  <p className="text-sm text-gray-500">Map each import column to a modifier table and choose Import or Exclude. Excluded columns are not applied during import.</p>
                  {/* Bulk actions */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-medium text-gray-600">Bulk select:</span>
                    <select
                      value={bulkColumnAction}
                      onChange={(e) => setBulkColumnAction(e.target.value as 'import' | 'exclude')}
                      className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                      className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded text-xs font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
                          <tr
                            key={idx}
                            className={`border-t ${entry.include === 'exclude' ? 'bg-gray-100 opacity-75' : ''}`}
                          >
                            <td className="px-2 py-2">
                              <input
                                type="checkbox"
                                checked={selectedColumnIndices.has(idx)}
                                onChange={(e) => {
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
                                onChange={(e) => setImportColumnMapping(prev => prev.map((e2, i) => i === idx ? { ...e2, tableKey: e.target.value } : e2))}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                                disabled={entry.include === 'exclude'}
                              >
                                <option value="">— Not mapped —</option>
                                {MODIFIER_TABLE_KEYS.map(tk => (
                                  <option key={tk} value={tk}>{(MODIFIER_TABLE_LABELS as Record<string, string>)[tk] || tk}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={entry.include}
                                onChange={(e) => setImportColumnMapping(prev => prev.map((e2, i) => i === idx ? { ...e2, include: e.target.value as 'import' | 'exclude' } : e2))}
                                className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  {/* Stats bar */}
                  <div className="flex gap-3 text-sm flex-wrap">
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-gray-700">
                      {importParsedRows.length} row{importParsedRows.length !== 1 ? 's' : ''} parsed
                    </span>
                    <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full">
                      {validRows.length} valid
                    </span>
                    {skippedRows.length > 0 && (
                      <span className="px-3 py-1 bg-red-50 text-red-700 rounded-full">
                        {skippedRows.length} skipped (invalid)
                      </span>
                    )}
                    {importHasVersionCol && (
                      <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full">
                        VERSION column detected
                      </span>
                    )}
                  </div>

                  {/* Skipped rows warning */}
                  {skippedRows.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                      <div className="font-medium mb-1">{skippedRows.length} row{skippedRows.length !== 1 ? 's' : ''} will be skipped:</div>
                      <ul className="list-disc ml-5 space-y-0.5 text-xs">
                        {skippedRows.map((r, i) => (
                          <li key={i}>{r.skipReason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Version mapping table */}
                  {validRows.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 text-left text-gray-500 uppercase tracking-wider text-[10px]">
                            <th className="px-3 py-2">Motion</th>
                            <th className="px-3 py-2">Data</th>
                            <th className="px-3 py-2">{importHasVersionCol ? 'Version (from file)' : 'Import to Version'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {validRows.map((row, ri) => {
                            const motion = motions.find(m => m.id === row.motionId);
                            const motionCfgs = configsForMotion(row.motionId);
                            const mapping = importRowMappings.find(m => m.motionId === row.motionId);

                            return (
                              <tr key={ri} className="border-t">
                                <td className="px-3 py-2">
                                  <div className="font-medium text-gray-800">{motion?.label || row.motionId}</div>
                                  <div className="text-[10px] text-gray-400">{row.motionId}{motion?.parent_id ? ` (variation of ${motions.find(m => m.id === motion.parent_id)?.label || motion.parent_id})` : ''}</div>
                                </td>
                                <td className="px-3 py-2 text-gray-500">
                                  {row.muscleTargets ? 'Targets ' : ''}{Object.keys(row.tables).filter(k => row.tables[k]).length > 0 ? `${Object.keys(row.tables).filter(k => row.tables[k]).length} table(s)` : ''}
                                  {!row.muscleTargets && Object.keys(row.tables).filter(k => row.tables[k]).length === 0 ? '—' : ''}
                                </td>
                                <td className="px-3 py-2">
                                  {importHasVersionCol ? (
                                    <span className="text-gray-700">v{row.version || '?'}</span>
                                  ) : (
                                    <select
                                      value={mapping?.targetConfigId || ''}
                                      onChange={(e) => {
                                        setImportRowMappings(prev => prev.map(m => m.motionId === row.motionId ? { ...m, targetConfigId: e.target.value } : m));
                                      }}
                                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                      <option value="">-- Skip this row --</option>
                                      <option value="__new__">+ Create New Draft</option>
                                      {motionCfgs.map(c => (
                                        <option key={c.id} value={c.id}>
                                          v{c.config_version} ({c.status}){c.notes ? ` — ${c.notes}` : ''}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
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
                        <div className="border rounded-lg max-h-48 overflow-y-auto">
                          <div className="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-600 sticky top-0">Details</div>
                          <ul className="px-4 py-2 space-y-1 text-xs text-gray-600">
                            {importResult.details.map((d, i) => (
                              <li key={i} className={d.includes('skipped') || d.includes('failed') ? 'text-red-600' : 'text-green-700'}>
                                {d}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-lg">
              {importStep === 'column_map' && (
                <button
                  onClick={() => setImportStep('review')}
                  className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                >
                  Continue to Review
                </button>
              )}
              {importStep === 'review' && (
                <button
                  onClick={handleApplyImport}
                  disabled={importableCount === 0}
                  className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 text-sm font-medium"
                >
                  Apply Import ({importableCount} row{importableCount !== 1 ? 's' : ''})
                </button>
              )}
              {importStep === 'importing' && importResult && (
                <button
                  onClick={() => { setShowImportModal(false); setImportPasteText(''); }}
                  className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                >
                  Done
                </button>
              )}
              {importStep !== 'importing' && (
                <button
                  onClick={() => { setShowImportModal(false); setImportPasteText(''); }}
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

      {/* Import to active config confirmation */}
      {showImportActiveConfirm && importConfirmCallback && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Import to active config?</h3>
            <p className="text-sm text-gray-600 mb-4">
              One or more target configs are <strong>active</strong>. Importing will overwrite them. Are you sure you want to proceed?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowImportActiveConfirm(false); setImportConfirmCallback(null); }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => importConfirmCallback()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
              >
                Yes, proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Active as New Version Confirmation */}
      {showActiveEditSaveConfirm && selectedConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Save as New Version?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Your changes will be saved as a <strong>new version</strong> and immediately <strong>activated</strong>.
              The current active version (v{selectedConfig.config_version}) will become an inactive draft.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700 mb-4">
              Scope: <strong>{motions.find(m => m.id === selectedConfig.scope_id)?.label || selectedConfig.scope_id}</strong>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowActiveEditSaveConfirm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium">
                Go Back
              </button>
              <button onClick={handleSaveActiveAsNewVersion} disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium disabled:opacity-50">
                {loading ? 'Saving...' : 'Save & Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Active Edit Confirmation */}
      {showActiveEditCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Discard Changes?</h3>
            <p className="text-sm text-gray-600 mb-4">
              All unsaved changes to this active config will be discarded and the original values will be restored.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowActiveEditCancelConfirm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium">
                Keep Editing
              </button>
              <button onClick={handleCancelActiveEdits}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium">
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && selectedConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {selectedConfig.status === 'active' ? 'Delete Active Config' : 'Delete Draft'}
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              Are you sure you want to delete this config?
            </p>
            {selectedConfig.status === 'active' && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 mb-4">
                This is an <strong>active config</strong>. Deleting it means there will be no active config for scope
                <strong> {motions.find(m => m.id === selectedConfig.scope_id)?.label || selectedConfig.scope_id}</strong>.
                The resolver will fall back to defaults for this scope until a new config is activated.
              </div>
            )}
            <div className="text-xs text-gray-500 mb-4">
              <div>Scope: {selectedConfig.scope_type} / {motions.find(m => m.id === selectedConfig.scope_id)?.label || selectedConfig.scope_id}</div>
              <div>Version: v{selectedConfig.config_version}</div>
              <div>Status: {selectedConfig.status}</div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
              >
                {selectedConfig.status === 'active' ? 'Delete Active Config' : 'Delete Draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
