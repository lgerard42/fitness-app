import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScoringSimulation } from '../useScoringSimulation';
import type { SimulationInput } from '../useScoringSimulation';

vi.mock('../../../../shared/scoring/resolveDeltas', () => ({
  resolveAllDeltas: vi.fn().mockReturnValue([]),
  resolveSingleDelta: vi.fn(),
}));

vi.mock('../../../../shared/scoring/computeActivation', () => ({
  computeActivation: vi.fn().mockReturnValue({ muscles: {} }),
  flattenMuscleTargets: vi.fn().mockReturnValue({}),
  sumDeltas: vi.fn().mockReturnValue({}),
}));

const DEBOUNCE_MS = 150;

function baseInput(): SimulationInput & { baselineDirty?: boolean } {
  return {
    motionId: null,
    muscleTargets: null,
    editingConfig: null,
    modifierTableData: {},
    motionsMap: {},
    localDeltaOverrides: {},
    customCombo: null,
    baselineDirty: false,
  };
}

describe('useScoringSimulation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty result when motionId is null', async () => {
    const { result } = renderHook(() => useScoringSimulation(baseInput()));

    await act(async () => {
      vi.advanceTimersByTime(DEBOUNCE_MS + 50);
    });

    expect(result.current.activation).toBeNull();
    expect(result.current.resolvedDeltas).toEqual([]);
    expect(result.current.deltaSum).toEqual({});
    expect(result.current.top3Impact).toEqual([]);
  });

  it('produces provenanceChips even with null motionId after debounce', async () => {
    const { result } = renderHook(() => useScoringSimulation(baseInput()));

    await act(async () => {
      vi.advanceTimersByTime(DEBOUNCE_MS + 50);
    });

    expect(result.current.provenanceChips).toContain('Saved Baseline');
  });

  it('computes simulation when motionId and muscleTargets are provided', async () => {
    const { resolveAllDeltas } = await import('../../../../shared/scoring/resolveDeltas');
    const { computeActivation, sumDeltas } = await import('../../../../shared/scoring/computeActivation');

    vi.mocked(resolveAllDeltas).mockReturnValue([]);
    vi.mocked(computeActivation).mockReturnValue({ muscles: { chest: 80 } } as any);
    vi.mocked(sumDeltas).mockReturnValue({ chest: 5 });

    const input = {
      ...baseInput(),
      motionId: 'bench-press',
      muscleTargets: { chest: { upper: 100, lower: 0 } } as any,
    };

    const { result } = renderHook(() => useScoringSimulation(input));

    await act(async () => {
      vi.advanceTimersByTime(DEBOUNCE_MS + 50);
    });

    expect(resolveAllDeltas).toHaveBeenCalled();
    expect(computeActivation).toHaveBeenCalled();
    expect(result.current.activation).toEqual({ muscles: { chest: 80 } });
  });

  it('reports Simulation Error on exception in scoring logic', async () => {
    const { resolveAllDeltas } = await import('../../../../shared/scoring/resolveDeltas');
    vi.mocked(resolveAllDeltas).mockImplementation(() => {
      throw new Error('scoring broke');
    });

    const input = {
      ...baseInput(),
      motionId: 'bench-press',
      muscleTargets: { chest: {} } as any,
    };

    const { result } = renderHook(() => useScoringSimulation(input));

    await act(async () => {
      vi.advanceTimersByTime(DEBOUNCE_MS + 50);
    });

    expect(result.current.provenanceChips).toContain('Simulation Error');
    expect(result.current.activation).toBeNull();
  });

  it('shows Local Unsaved Baseline chip when baselineDirty is true', async () => {
    const input = { ...baseInput(), baselineDirty: true };
    const { result } = renderHook(() => useScoringSimulation(input));

    await act(async () => {
      vi.advanceTimersByTime(DEBOUNCE_MS + 50);
    });

    expect(result.current.provenanceChips).toContain('Local Unsaved Baseline');
  });
});
