import type {
  DeltaRules,
  DeltaEntry,
  ModifierRow,
  Motion,
  ResolvedDelta,
} from "../types";

const MAX_INHERIT_DEPTH = 20;

/**
 * Resolve the delta_rules for a specific motion from a modifier row.
 * Handles "inherit" by walking the motion's parent_id chain.
 *
 * Returns null if no delta applies (motion not found in delta_rules,
 * or entire chain is empty/inherit with no parent).
 */
export function resolveSingleDelta(
  motionId: string,
  modifierRow: ModifierRow,
  motionsMap: Record<string, Motion>,
  modifierTable: Record<string, ModifierRow>,
  modifierTableKey: string
): ResolvedDelta | null {
  const visited = new Set<string>();
  const inheritChain: string[] = [];
  let currentMotionId = motionId;

  for (let depth = 0; depth < MAX_INHERIT_DEPTH; depth++) {
    if (visited.has(currentMotionId)) {
      return null; // Circular reference
    }
    visited.add(currentMotionId);

    const deltaRules: DeltaRules = modifierRow.delta_rules ?? {};
    const entry: DeltaEntry | undefined = deltaRules[currentMotionId];

    if (entry === undefined) {
      // Motion not in this modifier's delta_rules -- try parent motion
      const motion = motionsMap[currentMotionId];
      if (!motion?.parent_id) return null;
      inheritChain.push(currentMotionId);
      currentMotionId = motion.parent_id;
      continue;
    }

    if (entry === "inherit") {
      const motion = motionsMap[currentMotionId];
      if (!motion?.parent_id) return null;
      inheritChain.push(currentMotionId);
      currentMotionId = motion.parent_id;
      continue;
    }

    if (typeof entry === "object" && Object.keys(entry).length === 0) {
      // Home base {} -- no adjustment from this modifier
      return {
        modifierTable: modifierTableKey,
        modifierId: modifierRow.id,
        motionId,
        deltas: {},
        inherited: inheritChain.length > 0,
        inheritChain: inheritChain.length > 0 ? inheritChain : undefined,
      };
    }

    return {
      modifierTable: modifierTableKey,
      modifierId: modifierRow.id,
      motionId,
      deltas: entry as Record<string, number>,
      inherited: inheritChain.length > 0,
      inheritChain: inheritChain.length > 0 ? inheritChain : undefined,
    };
  }

  return null; // Max depth exceeded
}

/**
 * Resolve deltas from all selected modifiers for a given motion.
 * Returns an array of resolved deltas (one per modifier that has
 * applicable delta_rules).
 * Order of application follows the order of selectedModifiers (caller
 * should pass modifiers in cascade order for deterministic scoring).
 */
export function resolveAllDeltas(
  motionId: string,
  selectedModifiers: Array<{ tableKey: string; rowId: string }>,
  motionsMap: Record<string, Motion>,
  modifierTables: Record<string, Record<string, ModifierRow>>
): ResolvedDelta[] {
  const results: ResolvedDelta[] = [];

  for (const selection of selectedModifiers) {
    const table = modifierTables[selection.tableKey];
    if (!table) continue;

    const row = table[selection.rowId];
    if (!row) continue;

    const resolved = resolveSingleDelta(
      motionId,
      row,
      motionsMap,
      table,
      selection.tableKey
    );

    if (resolved && Object.keys(resolved.deltas).length > 0) {
      results.push(resolved);
    }
  }

  return results;
}
