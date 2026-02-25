import { useState, useCallback, useRef, useMemo } from 'react';
import { api } from '../api';
import toast from 'react-hot-toast';
import type { MuscleTargets, DeltaRules, ModifierRow, Motion } from '../../../shared/types';
import type { MatrixConfigJson } from '../../../shared/types/matrixV2';
import { MODIFIER_TABLE_KEYS } from '../../../shared/types/matrixV2';


export type DirtyDomain = 'baseline' | 'config' | string; // string for delta keys like "torsoAngles.DEG_45"

export interface WorkstationMotion {
  id: string;
  label: string;
  parent_id: string | null;
  muscle_targets: MuscleTargets;
}

export interface WorkstationState {
  selectedMotionId: string | null;
  selectedMotion: WorkstationMotion | null;

  // Baseline editing
  localBaseline: MuscleTargets | null;
  baselineDirty: boolean;
  setLocalBaseline: (mt: MuscleTargets) => void;
  saveBaseline: () => Promise<boolean>;

  // Delta branch editing (keyed by "tableKey.rowId")
  localDeltaOverrides: Record<string, Record<string, number> | 'inherit'>;
  deltaDirtyKeys: Set<string>;
  setLocalDelta: (tableKey: string, rowId: string, value: Record<string, number> | 'inherit') => void;
  saveDeltaBranch: (tableKey: string, rowId: string) => Promise<boolean>;
  saveAllDirtyDeltas: () => Promise<{ successes: string[]; failures: string[] }>;

  // Motion selection
  setSelectedMotionId: (id: string | null) => void;
  loadMotionData: (motionId: string, motions: Motion[]) => void;

  // Global dirty tracking
  dirtyDomains: Set<DirtyDomain>;
  clearAllDirty: () => void;

  // Modifier table data (full rows needed for simulation)
  modifierTableData: Record<string, Record<string, ModifierRow>>;
  motionsMap: Record<string, Motion>;
  loadModifierTableData: () => Promise<void>;

  // Saving all dirty domains
  saveAllDirty: () => Promise<{ successes: string[]; failures: string[] }>;
}

export function useWorkstationState(
  motions: Array<{ id: string; label: string; parent_id?: string | null }>,
  editingConfig: MatrixConfigJson | null,
  configDirty: boolean,
  onSaveConfig: () => Promise<void>,
): WorkstationState {
  const [selectedMotionId, setSelectedMotionId] = useState<string | null>(null);
  const [localBaseline, setLocalBaselineRaw] = useState<MuscleTargets | null>(null);
  const [baselineDirty, setBaselineDirty] = useState(false);
  const [localDeltaOverrides, setLocalDeltaOverrides] = useState<Record<string, Record<string, number> | 'inherit'>>({});
  const [deltaDirtyKeys, setDeltaDirtyKeys] = useState<Set<string>>(new Set());
  const [modifierTableData, setModifierTableData] = useState<Record<string, Record<string, ModifierRow>>>({});
  const [motionsMap, setMotionsMap] = useState<Record<string, Motion>>({});

  const savedBaselineRef = useRef<MuscleTargets | null>(null);

  const selectedMotion = useMemo<WorkstationMotion | null>(() => {
    if (!selectedMotionId) return null;
    const m = motions.find(mo => mo.id === selectedMotionId);
    if (!m) return null;
    return {
      id: m.id,
      label: m.label,
      parent_id: m.parent_id ?? null,
      muscle_targets: localBaseline || ({} as MuscleTargets),
    };
  }, [selectedMotionId, motions, localBaseline]);

  const loadMotionData = useCallback((motionId: string, allMotions: Motion[]) => {
    const motion = allMotions.find(m => m.id === motionId);
    if (motion) {
      const mt = (motion.muscle_targets as MuscleTargets) || {};
      setLocalBaselineRaw(JSON.parse(JSON.stringify(mt)));
      savedBaselineRef.current = JSON.parse(JSON.stringify(mt));
      setBaselineDirty(false);
    }
    setLocalDeltaOverrides({});
    setDeltaDirtyKeys(new Set());
  }, []);

  const setLocalBaseline = useCallback((mt: MuscleTargets) => {
    setLocalBaselineRaw(mt);
    setBaselineDirty(true);
  }, []);

  const saveBaseline = useCallback(async (): Promise<boolean> => {
    if (!selectedMotionId || !localBaseline) return false;
    try {
      await api.updateRow('motions', selectedMotionId, { muscle_targets: localBaseline });
      savedBaselineRef.current = JSON.parse(JSON.stringify(localBaseline));
      setBaselineDirty(false);
      toast.success('Baseline saved');
      return true;
    } catch (err: any) {
      toast.error(`Baseline save failed: ${err.message}`);
      return false;
    }
  }, [selectedMotionId, localBaseline]);

  const setLocalDelta = useCallback((tableKey: string, rowId: string, value: Record<string, number> | 'inherit') => {
    const key = `${tableKey}.${rowId}`;
    setLocalDeltaOverrides(prev => ({ ...prev, [key]: value }));
    setDeltaDirtyKeys(prev => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const saveDeltaBranch = useCallback(async (tableKey: string, rowId: string): Promise<boolean> => {
    if (!selectedMotionId) return false;
    const key = `${tableKey}.${rowId}`;
    const localValue = localDeltaOverrides[key];
    if (localValue === undefined) return false;

    const rowData = modifierTableData[tableKey]?.[rowId];
    if (!rowData) {
      toast.error(`Row ${rowId} not found in ${tableKey}`);
      return false;
    }

    const updatedDeltaRules: DeltaRules = { ...(rowData.delta_rules || {}) };
    updatedDeltaRules[selectedMotionId] = localValue;

    try {
      await api.updateRow(tableKey, rowId, { delta_rules: updatedDeltaRules });
      setModifierTableData(prev => ({
        ...prev,
        [tableKey]: {
          ...prev[tableKey],
          [rowId]: { ...prev[tableKey][rowId], delta_rules: updatedDeltaRules },
        },
      }));
      setDeltaDirtyKeys(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      // Sync delta_rules to active Matrix V2 config
      try {
        await api.syncDeltasForMotion(selectedMotionId);
      } catch { /* best-effort */ }
      toast.success(`Delta saved: ${tableKey}.${rowId}`);
      return true;
    } catch (err: any) {
      toast.error(`Delta save failed (${tableKey}.${rowId}): ${err.message}`);
      return false;
    }
  }, [selectedMotionId, localDeltaOverrides, modifierTableData]);

  const saveAllDirtyDeltas = useCallback(async () => {
    const successes: string[] = [];
    const failures: string[] = [];
    for (const key of deltaDirtyKeys) {
      const [tableKey, rowId] = key.split('.');
      const ok = await saveDeltaBranch(tableKey, rowId);
      if (ok) successes.push(key);
      else failures.push(key);
    }
    return { successes, failures };
  }, [deltaDirtyKeys, saveDeltaBranch]);

  const loadModifierTableData = useCallback(async () => {
    const tables: Record<string, Record<string, ModifierRow>> = {};
    const promises = MODIFIER_TABLE_KEYS.map(async (key) => {
      try {
        const data = await api.getTable(key) as ModifierRow[];
        const map: Record<string, ModifierRow> = {};
        for (const row of data) {
          if (row.is_active !== false) {
            map[row.id] = row;
          }
        }
        tables[key] = map;
      } catch {
        tables[key] = {};
      }
    });
    await Promise.all(promises);
    setModifierTableData(tables);

    // Also load motions as a map
    try {
      const motionsData = await api.getTable('motions') as Motion[];
      const mMap: Record<string, Motion> = {};
      for (const m of motionsData) {
        if (m.is_active !== false) {
          mMap[m.id] = m;
        }
      }
      setMotionsMap(mMap);
    } catch { /* handled upstream */ }
  }, []);

  const dirtyDomains = useMemo(() => {
    const domains = new Set<DirtyDomain>();
    if (baselineDirty) domains.add('baseline');
    if (configDirty) domains.add('config');
    for (const key of deltaDirtyKeys) {
      domains.add(key);
    }
    return domains;
  }, [baselineDirty, configDirty, deltaDirtyKeys]);

  const clearAllDirty = useCallback(() => {
    setBaselineDirty(false);
    setDeltaDirtyKeys(new Set());
    setLocalDeltaOverrides({});
  }, []);

  const saveAllDirty = useCallback(async () => {
    const successes: string[] = [];
    const failures: string[] = [];

    if (baselineDirty) {
      const ok = await saveBaseline();
      if (ok) successes.push('baseline');
      else failures.push('baseline');
    }

    if (configDirty) {
      try {
        await onSaveConfig();
        successes.push('config');
      } catch {
        failures.push('config');
      }
    }

    const deltaResult = await saveAllDirtyDeltas();
    successes.push(...deltaResult.successes);
    failures.push(...deltaResult.failures);

    return { successes, failures };
  }, [baselineDirty, configDirty, saveBaseline, onSaveConfig, saveAllDirtyDeltas]);

  return {
    selectedMotionId,
    selectedMotion,
    localBaseline,
    baselineDirty,
    setLocalBaseline,
    saveBaseline,
    localDeltaOverrides,
    deltaDirtyKeys,
    setLocalDelta,
    saveDeltaBranch,
    saveAllDirtyDeltas,
    setSelectedMotionId,
    loadMotionData,
    dirtyDomains,
    clearAllDirty,
    modifierTableData,
    motionsMap,
    loadModifierTableData,
    saveAllDirty,
  };
}
