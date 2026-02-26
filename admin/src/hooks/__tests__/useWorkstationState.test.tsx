import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkstationState } from '../useWorkstationState';

vi.mock('../../api', () => ({
  api: {
    updateRow: vi.fn().mockResolvedValue({ ok: true }),
    getTable: vi.fn().mockResolvedValue([]),
    syncDeltasForMotion: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import { api } from '../../api';
import toast from 'react-hot-toast';

const mockApi = vi.mocked(api);
const mockToast = vi.mocked(toast);

const motions = [
  { id: 'm1', label: 'Bench Press', parent_id: null },
  { id: 'm2', label: 'Squat', parent_id: null },
];

function renderState(overrides: { configDirty?: boolean; onSaveConfig?: () => Promise<void> } = {}) {
  return renderHook(() =>
    useWorkstationState(
      motions,
      null,
      overrides.configDirty ?? false,
      overrides.onSaveConfig ?? vi.fn().mockResolvedValue(undefined),
    ),
  );
}

describe('useWorkstationState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initialises with null selectedMotionId', () => {
    const { result } = renderState();
    expect(result.current.selectedMotionId).toBeNull();
    expect(result.current.selectedMotion).toBeNull();
  });

  it('setSelectedMotionId updates selectedMotionId', () => {
    const { result } = renderState();
    act(() => result.current.setSelectedMotionId('m1'));
    expect(result.current.selectedMotionId).toBe('m1');
  });

  it('loadMotionData populates localBaseline and clears dirty state', () => {
    const { result } = renderState();

    const fullMotions = motions.map(m => ({
      ...m,
      muscle_targets: { biceps: { upper: 50, lower: 50 } },
      is_active: true,
    }));

    act(() => {
      result.current.setSelectedMotionId('m1');
      result.current.loadMotionData('m1', fullMotions as any);
    });

    expect(result.current.localBaseline).toEqual({ biceps: { upper: 50, lower: 50 } });
    expect(result.current.baselineDirty).toBe(false);
  });

  it('setLocalBaseline sets dirty flag', () => {
    const { result } = renderState();
    act(() => result.current.setLocalBaseline({ chest: { upper: 80, lower: 20 } } as any));
    expect(result.current.baselineDirty).toBe(true);
  });

  it('saveBaseline calls api.updateRow and shows success toast', async () => {
    const { result } = renderState();

    act(() => {
      result.current.setSelectedMotionId('m1');
      result.current.setLocalBaseline({ chest: { upper: 100, lower: 0 } } as any);
    });

    let ok: boolean;
    await act(async () => {
      ok = await result.current.saveBaseline();
    });

    expect(ok!).toBe(true);
    expect(mockApi.updateRow).toHaveBeenCalledWith('motions', 'm1', {
      muscle_targets: { chest: { upper: 100, lower: 0 } },
    });
    expect(result.current.baselineDirty).toBe(false);
    expect(mockToast.success).toHaveBeenCalledWith('Baseline saved');
  });

  it('saveBaseline returns false when no motion is selected', async () => {
    const { result } = renderState();

    let ok: boolean;
    await act(async () => {
      ok = await result.current.saveBaseline();
    });

    expect(ok!).toBe(false);
    expect(mockApi.updateRow).not.toHaveBeenCalled();
  });

  it('saveBaseline shows error toast on API failure', async () => {
    mockApi.updateRow.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderState();
    act(() => {
      result.current.setSelectedMotionId('m1');
      result.current.setLocalBaseline({ chest: {} } as any);
    });

    let ok: boolean;
    await act(async () => {
      ok = await result.current.saveBaseline();
    });

    expect(ok!).toBe(false);
    expect(mockToast.error).toHaveBeenCalledWith('Baseline save failed: Network error');
  });

  it('setLocalDelta adds to localDeltaOverrides and marks dirty', () => {
    const { result } = renderState();

    act(() => {
      result.current.setLocalDelta('grips', 'wide', { biceps: 10 });
    });

    expect(result.current.localDeltaOverrides['grips.wide']).toEqual({ biceps: 10 });
    expect(result.current.deltaDirtyKeys.has('grips.wide')).toBe(true);
  });

  it('dirtyDomains includes baseline and delta keys', () => {
    const { result } = renderState();

    act(() => {
      result.current.setLocalBaseline({} as any);
      result.current.setLocalDelta('grips', 'narrow', { triceps: 5 });
    });

    expect(result.current.dirtyDomains.has('baseline')).toBe(true);
    expect(result.current.dirtyDomains.has('grips.narrow')).toBe(true);
  });

  it('dirtyDomains includes config when configDirty is true', () => {
    const { result } = renderState({ configDirty: true });
    expect(result.current.dirtyDomains.has('config')).toBe(true);
  });

  it('clearAllDirty resets baseline and delta dirty state', () => {
    const { result } = renderState();

    act(() => {
      result.current.setLocalBaseline({} as any);
      result.current.setLocalDelta('grips', 'wide', { biceps: 10 });
    });

    act(() => result.current.clearAllDirty());

    expect(result.current.baselineDirty).toBe(false);
    expect(result.current.deltaDirtyKeys.size).toBe(0);
    expect(Object.keys(result.current.localDeltaOverrides).length).toBe(0);
  });
});
