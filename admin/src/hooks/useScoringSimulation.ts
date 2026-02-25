import { useMemo, useRef, useState, useEffect } from 'react';
import type { MuscleTargets, ModifierRow, Motion, ActivationResult, ResolvedDelta, FlatMuscleScores } from '../../../shared/types';
import { resolveAllDeltas, resolveSingleDelta } from '../../../shared/scoring/resolveDeltas';
import { computeActivation, flattenMuscleTargets, sumDeltas } from '../../../shared/scoring/computeActivation';
import type { MatrixConfigJson, ModifierTableKey } from '../../../shared/types/matrixV2';

export interface SimulationInput {
  motionId: string | null;
  muscleTargets: MuscleTargets | null;
  editingConfig: MatrixConfigJson | null;
  modifierTableData: Record<string, Record<string, ModifierRow>>;
  motionsMap: Record<string, Motion>;
  localDeltaOverrides: Record<string, Record<string, number> | 'inherit'>;
  customCombo: Array<{ tableKey: string; rowId: string }> | null;
}

export interface SimulationResult {
  activation: ActivationResult | null;
  resolvedDeltas: ResolvedDelta[];
  deltaSum: FlatMuscleScores;
  top3Impact: Array<{ muscleId: string; delta: number }>;
  provenanceChips: string[];
}

const DEBOUNCE_MS = 150;

function buildSelectedModifiers(
  config: MatrixConfigJson | null,
  customCombo: Array<{ tableKey: string; rowId: string }> | null,
): Array<{ tableKey: string; rowId: string }> {
  if (customCombo) return customCombo;
  if (!config?.tables) return [];

  const modifiers: Array<{ tableKey: string; rowId: string }> = [];
  for (const [tableKey, tc] of Object.entries(config.tables)) {
    if (!tc || !tc.applicability || !tc.default_row_id) continue;
    modifiers.push({ tableKey, rowId: tc.default_row_id });
  }
  return modifiers;
}

function buildProvenanceChips(
  muscleTargets: MuscleTargets | null,
  localDeltaOverrides: Record<string, Record<string, number> | 'inherit'>,
  config: MatrixConfigJson | null,
  customCombo: Array<{ tableKey: string; rowId: string }> | null,
  baselineDirty?: boolean,
): string[] {
  const chips: string[] = [];
  chips.push(baselineDirty ? 'Local Unsaved Baseline' : 'Saved Baseline');
  const hasDeltaOverrides = Object.keys(localDeltaOverrides).length > 0;
  chips.push(hasDeltaOverrides ? 'Local Unsaved Delta Branches' : 'Saved Delta Branches');
  chips.push(customCombo ? 'Custom Test Combo' : 'Draft Matrix Config Defaults');
  return chips;
}

export function useScoringSimulation(input: SimulationInput & { baselineDirty?: boolean }): SimulationResult {
  const {
    motionId,
    muscleTargets,
    editingConfig,
    modifierTableData,
    motionsMap,
    localDeltaOverrides,
    customCombo,
    baselineDirty,
  } = input;

  const [result, setResult] = useState<SimulationResult>({
    activation: null,
    resolvedDeltas: [],
    deltaSum: {},
    top3Impact: [],
    provenanceChips: [],
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInputRef = useRef<string>('');

  useEffect(() => {
    const inputKey = JSON.stringify({
      motionId,
      muscleTargets,
      tables: editingConfig?.tables,
      localDeltaOverrides,
      customCombo,
    });

    if (inputKey === lastInputRef.current) return;
    lastInputRef.current = inputKey;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      if (!motionId || !muscleTargets) {
        setResult({
          activation: null,
          resolvedDeltas: [],
          deltaSum: {},
          top3Impact: [],
          provenanceChips: buildProvenanceChips(muscleTargets, localDeltaOverrides, editingConfig, customCombo, baselineDirty),
        });
        return;
      }

      try {
        const selectedModifiers = buildSelectedModifiers(editingConfig, customCombo);

        // Build a modified version of modifier table data that includes local overrides
        const effectiveModifierData = applyLocalDeltaOverrides(
          modifierTableData,
          localDeltaOverrides,
          motionId,
        );

        const resolvedDeltas = resolveAllDeltas(
          motionId,
          selectedModifiers,
          motionsMap,
          effectiveModifierData,
        );

        const activation = computeActivation(muscleTargets, resolvedDeltas);
        const dSum = sumDeltas(resolvedDeltas);

        const top3 = Object.entries(dSum)
          .map(([muscleId, delta]) => ({ muscleId, delta }))
          .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
          .slice(0, 3);

        setResult({
          activation,
          resolvedDeltas,
          deltaSum: dSum,
          top3Impact: top3,
          provenanceChips: buildProvenanceChips(muscleTargets, localDeltaOverrides, editingConfig, customCombo, baselineDirty),
        });
      } catch (err) {
        console.error('Simulation error:', err);
        setResult({
          activation: null,
          resolvedDeltas: [],
          deltaSum: {},
          top3Impact: [],
          provenanceChips: ['Simulation Error'],
        });
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [motionId, muscleTargets, editingConfig, modifierTableData, motionsMap, localDeltaOverrides, customCombo, baselineDirty]);

  return result;
}

/**
 * Creates a copy of modifierTableData with local delta overrides applied.
 * This lets unsaved delta edits reflect in the simulation.
 */
function applyLocalDeltaOverrides(
  modifierTableData: Record<string, Record<string, ModifierRow>>,
  localDeltaOverrides: Record<string, Record<string, number> | 'inherit'>,
  motionId: string,
): Record<string, Record<string, ModifierRow>> {
  if (Object.keys(localDeltaOverrides).length === 0) return modifierTableData;

  const result: Record<string, Record<string, ModifierRow>> = {};
  for (const [tableKey, tableRows] of Object.entries(modifierTableData)) {
    result[tableKey] = { ...tableRows };
  }

  for (const [compositeKey, value] of Object.entries(localDeltaOverrides)) {
    const dotIdx = compositeKey.indexOf('.');
    if (dotIdx < 0) continue;
    const tableKey = compositeKey.substring(0, dotIdx);
    const rowId = compositeKey.substring(dotIdx + 1);

    if (!result[tableKey]?.[rowId]) continue;

    const existingRow = result[tableKey][rowId];
    const updatedDeltaRules = { ...(existingRow.delta_rules || {}), [motionId]: value };
    result[tableKey] = {
      ...result[tableKey],
      [rowId]: { ...existingRow, delta_rules: updatedDeltaRules },
    };
  }

  return result;
}
