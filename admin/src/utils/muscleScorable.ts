/**
 * Helpers for enforcing is_scorable in muscle tree builders.
 * Non-scorable muscles must not appear in persisted muscle_targets or delta_rules.
 */

export type MuscleWithScorable = { id: string; is_scorable?: boolean };

/**
 * Returns a new object with only keys whose muscle has is_scorable !== false.
 * Use when persisting or calling onChange/onSave with a flat muscle map.
 */
export function filterScorableOnly(
  flat: Record<string, number>,
  muscles: MuscleWithScorable[]
): Record<string, number> {
  const scorableIds = new Set(
    muscles.filter(m => m.is_scorable !== false).map(m => m.id)
  );
  const out: Record<string, number> = {};
  for (const [id, score] of Object.entries(flat)) {
    if (scorableIds.has(id)) out[id] = score;
  }
  return out;
}

/**
 * Returns true if the muscle is scorable (treat missing/undefined as scorable for backward compatibility).
 */
export function isMuscleScorable(muscles: MuscleWithScorable[], id: string): boolean {
  const m = muscles.find(x => x.id === id);
  return m?.is_scorable !== false;
}

/**
 * Returns muscles that are scorable. Use for "add muscle" dropdowns.
 */
export function getScorableMuscles<T extends MuscleWithScorable>(muscles: T[]): T[] {
  return muscles.filter(m => m.is_scorable !== false);
}
