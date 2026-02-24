import { useState, useCallback, useMemo } from "react";
import {
  resolveAllDeltas,
  computeActivation,
} from "@shared/scoring";
import { evaluateConstraints } from "@shared/constraints";
import type {
  Motion,
  ModifierRow,
  Equipment,
  ExerciseCategory,
  ModifierSelection,
  ActivationResult,
  ConstraintEvaluatorOutput,
} from "@shared/types";

export interface ComposerDataContext {
  motions: Record<string, Motion>;
  modifierTables: Record<string, Record<string, ModifierRow>>;
  equipment: Record<string, Equipment>;
  exerciseCategories: Record<string, ExerciseCategory>;
}

export interface ComposerState {
  selectedMotion: string | null;
  selectedEquipment: string | null;
  selectedCategory: string | null;
  selectedModifiers: Record<string, string>;
}

/**
 * Core hook for the mobile exercise composer.
 * Drives the constraint-based UI and live scoring.
 */
export function useExerciseComposer(data: ComposerDataContext | null) {
  const [state, setState] = useState<ComposerState>({
    selectedMotion: null,
    selectedEquipment: null,
    selectedCategory: null,
    selectedModifiers: {},
  });

  const setMotion = useCallback((motionId: string | null) => {
    setState((prev) => ({
      ...prev,
      selectedMotion: motionId,
      selectedModifiers: {},
    }));
  }, []);

  const setEquipment = useCallback((equipmentId: string | null) => {
    setState((prev) => ({
      ...prev,
      selectedEquipment: equipmentId,
    }));
  }, []);

  const setCategory = useCallback((categoryId: string | null) => {
    setState((prev) => ({
      ...prev,
      selectedCategory: categoryId,
    }));
  }, []);

  const setModifier = useCallback(
    (tableKey: string, rowId: string | null) => {
      setState((prev) => {
        const next = { ...prev.selectedModifiers };
        if (rowId) {
          next[tableKey] = rowId;
        } else {
          delete next[tableKey];
        }
        return { ...prev, selectedModifiers: next };
      });
    },
    []
  );

  // Evaluate constraints
  const constraints: ConstraintEvaluatorOutput | null = useMemo(() => {
    if (!data || !state.selectedMotion) return null;

    const motion = data.motions[state.selectedMotion];
    if (!motion) return null;

    const equipment = state.selectedEquipment
      ? data.equipment[state.selectedEquipment]
      : null;

    const torsoAngleRow = state.selectedModifiers.torsoAngles
      ? (data.modifierTables.torsoAngles?.[
          state.selectedModifiers.torsoAngles
        ] as unknown as { allow_torso_orientations?: boolean })
      : null;

    return evaluateConstraints({
      motion,
      equipment,
      selectedTorsoAngle: torsoAngleRow,
    });
  }, [data, state.selectedMotion, state.selectedEquipment, state.selectedModifiers]);

  // Live scoring
  const activation: ActivationResult | null = useMemo(() => {
    if (!data || !state.selectedMotion) return null;

    const motion = data.motions[state.selectedMotion];
    if (!motion) return null;

    const modifierSelections: ModifierSelection[] = Object.entries(
      state.selectedModifiers
    ).map(([tableKey, rowId]) => ({ tableKey, rowId }));

    const resolvedDeltas = resolveAllDeltas(
      state.selectedMotion,
      modifierSelections,
      data.motions,
      data.modifierTables
    );

    return computeActivation(motion.muscle_targets, resolvedDeltas);
  }, [data, state.selectedMotion, state.selectedModifiers]);

  const reset = useCallback(() => {
    setState({
      selectedMotion: null,
      selectedEquipment: null,
      selectedCategory: null,
      selectedModifiers: {},
    });
  }, []);

  return {
    state,
    constraints,
    activation,
    setMotion,
    setEquipment,
    setCategory,
    setModifier,
    reset,
  };
}
