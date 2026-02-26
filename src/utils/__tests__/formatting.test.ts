import { formatDuration, formatDate, formatDurationMs, formatWeight, formatNumber } from '@shared/utils/formatting';

describe('formatDuration', () => {
  it('formats 0 seconds as "0:00"', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('formats 1 second as "0:01"', () => {
    expect(formatDuration(1)).toBe('0:01');
  });

  it('formats 60 seconds as "1:00"', () => {
    expect(formatDuration(60)).toBe('1:00');
  });

  it('formats 90 seconds as "1:30"', () => {
    expect(formatDuration(90)).toBe('1:30');
  });

  it('formats 3600 seconds (1 hour) as "1:00:00"', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
  });

  it('formats 3661 seconds as "1:01:01"', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
  });

  it('pads minutes and seconds for multi-hour durations', () => {
    expect(formatDuration(7265)).toBe('2:01:05');
  });
});

describe('formatDate', () => {
  it('formats a date string into "MMM D, YYYY"', () => {
    expect(formatDate('2026-01-05')).toMatch(/Jan\s+5,\s+2026/);
  });

  it('formats a numeric timestamp', () => {
    const ts = new Date('2025-12-25T00:00:00Z').getTime();
    expect(formatDate(ts)).toMatch(/Dec\s+2[45],\s+2025/);
  });

  it('handles ISO date strings', () => {
    expect(formatDate('2024-07-04T12:00:00Z')).toMatch(/Jul\s+4,\s+2024/);
  });
});

describe('formatDurationMs', () => {
  it('formats milliseconds under one hour', () => {
    expect(formatDurationMs(300_000)).toBe('5m');
  });

  it('formats milliseconds over one hour', () => {
    expect(formatDurationMs(5_400_000)).toBe('1h 30m');
  });

  it('formats zero milliseconds', () => {
    expect(formatDurationMs(0)).toBe('0m');
  });
});

describe('formatWeight', () => {
  it('formats weight with default unit', () => {
    expect(formatWeight(135)).toBe('135 lbs');
  });

  it('formats weight with custom unit', () => {
    expect(formatWeight(60, 'kg')).toBe('60 kg');
  });
});

describe('formatNumber', () => {
  it('returns plain number for values under 1000', () => {
    expect(formatNumber(500)).toBe('500');
  });

  it('formats thousands with K suffix', () => {
    expect(formatNumber(1500)).toBe('1.5K');
  });

  it('formats millions with M suffix', () => {
    expect(formatNumber(2_500_000)).toBe('2.5M');
  });
});
