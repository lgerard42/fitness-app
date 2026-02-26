import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scoringApi } from '../scoring';
import { request } from '../client';

vi.mock('../client', () => ({
  request: vi.fn().mockResolvedValue({}),
}));

const mockRequest = vi.mocked(request);

describe('scoringApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('computeScoring sends POST to /scoring/compute with body', async () => {
    const body = {
      motionId: 'bench-press',
      selectedModifiers: [{ tableKey: 'grips', rowId: 'wide' }],
    };
    await scoringApi.computeScoring(body);
    expect(mockRequest).toHaveBeenCalledWith('/scoring/compute', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  });

  it('traceScoring sends POST to /scoring/trace', async () => {
    const body = { motionId: 'squat' };
    await scoringApi.traceScoring(body);
    expect(mockRequest).toHaveBeenCalledWith('/scoring/trace', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  });

  it('evaluateConstraints sends POST to /scoring/constraints', async () => {
    const body = { motionId: 'deadlift', equipmentId: 'barbell' };
    await scoringApi.evaluateConstraints(body);
    expect(mockRequest).toHaveBeenCalledWith('/scoring/constraints', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  });

  it('runLinter calls GET /scoring/lint', async () => {
    await scoringApi.runLinter();
    expect(mockRequest).toHaveBeenCalledWith('/scoring/lint');
  });

  it('getManifest calls GET /scoring/manifest', async () => {
    await scoringApi.getManifest();
    expect(mockRequest).toHaveBeenCalledWith('/scoring/manifest');
  });
});
