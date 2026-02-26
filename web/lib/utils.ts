// Re-export shared formatting and calculation utilities
export { formatDate, formatDurationMs as formatDuration, formatWeight, formatNumber } from '@shared/utils/formatting';
export { getExercisesFromItems, calculateTotalVolume, calculateStreak } from '@shared/utils/calculations';

/** Tailwind className merge helper (web-specific) */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
