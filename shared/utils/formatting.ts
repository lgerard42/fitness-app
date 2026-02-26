/**
 * Shared formatting utilities — single source of truth for Mobile, Web, Admin.
 */

/** Format a date string or timestamp into "MMM D, YYYY" (e.g. "Jan 5, 2026") */
export function formatDate(dateStr: string | number): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Format seconds into "M:SS" or "H:MM:SS" (e.g. 90 → "1:30", 3661 → "1:01:01") */
export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Format milliseconds into human-readable "Xh Ym" (e.g. 5400000 → "1h 30m") */
export function formatDurationMs(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0) return `${hours}h ${remainingMinutes}m`;
  return `${minutes}m`;
}

/** Format a weight value with unit (e.g. 135 → "135 lbs") */
export function formatWeight(weight: number, unit: string = 'lbs'): string {
  return `${weight.toFixed(0)} ${unit}`;
}

/** Format large numbers with K/M suffixes (e.g. 1500 → "1.5K") */
export function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(0);
}
