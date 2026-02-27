/**
 * Helpers for motion muscle grouping: effective grouping ID, root resolution,
 * default (highest-scoring muscle), and option set for the Muscle Grouping dropdown.
 * muscle_targets is flat: Record<muscleId, number>. Hierarchy comes from muscles table (parent_ids).
 */

export interface MuscleRecord {
  id: string;
  label?: string;
  parent_ids?: string[];
  [key: string]: unknown;
}

/** Parse muscle_targets as flat Record<muscleId, number>. */
export function asFlatMuscleTargets(
  muscleTargets: unknown
): Record<string, number> {
  if (!muscleTargets || typeof muscleTargets !== 'object' || Array.isArray(muscleTargets))
    return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(muscleTargets as Record<string, unknown>)) {
    if (typeof v === 'number') out[k] = v;
  }
  return out;
}

/** Muscle ID with highest score in flat targets; null if none or all zero. */
export function getMuscleIdWithMaxScore(
  flatTargets: Record<string, number>
): string | null {
  let bestId: string | null = null;
  let bestScore = -Infinity;
  for (const [id, score] of Object.entries(flatTargets)) {
    if (typeof score === 'number' && score > bestScore) {
      bestScore = score;
      bestId = id;
    }
  }
  return bestId;
}

/** Root muscle ID for a given muscle (walk parent_ids to top). */
export function findRootMuscleId(
  muscleId: string,
  muscleMap: Map<string, MuscleRecord>
): string {
  const visited = new Set<string>();
  let current: string | undefined = muscleId;
  while (current && !visited.has(current)) {
    visited.add(current);
    const m = muscleMap.get(current);
    const pids = m?.parent_ids;
    if (!pids || !Array.isArray(pids) || pids.length === 0) return current;
    current = pids[0];
  }
  return muscleId;
}

/** Calculated score: explicit from flatTargets if set, else sum of children's calculated scores. */
function getCalculatedScore(
  id: string,
  flatTargets: Record<string, number>,
  childrenOf: Map<string, MuscleRecord[]>,
  cache: Map<string, number>
): number {
  if (cache.has(id)) return cache.get(id)!;
  const explicit = flatTargets[id];
  if (typeof explicit === 'number') {
    cache.set(id, explicit);
    return explicit;
  }
  const children = childrenOf.get(id) ?? [];
  let sum = 0;
  for (const c of children) {
    sum += getCalculatedScore(c.id, flatTargets, childrenOf, cache);
  }
  cache.set(id, sum);
  return sum;
}

/**
 * Set of muscle IDs selectable for grouping:
 * - Uses calculated score for each muscle (explicit if set, else sum of children's calculated scores).
 * - Only muscles whose calculated score >= minScore qualify.
 * - Only muscles that have at least one child in the hierarchy qualify (no leaf muscles).
 */
export function getSelectableMuscleIds(
  flatTargets: Record<string, number>,
  muscleMap: Map<string, MuscleRecord>,
  minScore: number = 0.5
): Set<string> {
  const childrenOf = new Map<string, MuscleRecord[]>();
  for (const m of muscleMap.values()) {
    const pids = m.parent_ids;
    if (pids?.length && Array.isArray(pids)) {
      const pid = pids[0];
      if (!childrenOf.has(pid)) childrenOf.set(pid, []);
      childrenOf.get(pid)!.push(m);
    }
  }
  const cache = new Map<string, number>();
  const out = new Set<string>();
  for (const id of muscleMap.keys()) {
    const hasChildren = (childrenOf.get(id)?.length ?? 0) > 0;
    if (!hasChildren) continue;
    const score = getCalculatedScore(id, flatTargets, childrenOf, cache);
    if (score >= minScore) out.add(id);
  }
  return out;
}

/** Among selectable IDs, return the one with highest calculated score; null if none. */
export function getMuscleIdWithMaxCalculatedScore(
  flatTargets: Record<string, number>,
  muscleMap: Map<string, MuscleRecord>,
  selectableIds: Set<string>
): string | null {
  if (selectableIds.size === 0) return null;
  const childrenOf = new Map<string, MuscleRecord[]>();
  for (const m of muscleMap.values()) {
    const pids = m.parent_ids;
    if (pids?.length && Array.isArray(pids)) {
      const pid = pids[0];
      if (!childrenOf.has(pid)) childrenOf.set(pid, []);
      childrenOf.get(pid)!.push(m);
    }
  }
  const cache = new Map<string, number>();
  let bestId: string | null = null;
  let bestScore = -Infinity;
  for (const id of selectableIds) {
    const score = getCalculatedScore(id, flatTargets, childrenOf, cache);
    if (score > bestScore) {
      bestScore = score;
      bestId = id;
    }
  }
  return bestId;
}

/** Build primary -> [secondary/tertiary] tree for dropdown: roots that have any selectable descendant, and their selectable descendants. */
export function buildMuscleOptionGroups(
  selectableIds: Set<string>,
  muscleMap: Map<string, MuscleRecord>,
  musclesList: MuscleRecord[]
): Array<{ primary: MuscleRecord; options: Array<{ id: string; label: string; path: string }> }> {
  const roots = musclesList.filter(
    (m) => !m.parent_ids?.length
  );
  const childrenOf = new Map<string, MuscleRecord[]>();
  for (const m of musclesList) {
    const pids = m.parent_ids;
    if (pids?.length) {
      const pid = pids[0];
      if (!childrenOf.has(pid)) childrenOf.set(pid, []);
      childrenOf.get(pid)!.push(m);
    }
  }

  function collectUnder(
    id: string,
    pathPrefix: string,
    muscleMap: Map<string, MuscleRecord>
  ): Array<{ id: string; label: string; path: string }> {
    const m = muscleMap.get(id);
    const label = m?.label ?? id;
    const path = pathPrefix ? `${pathPrefix} > ${label}` : label;
    const options: Array<{ id: string; label: string; path: string }> = [];
    if (selectableIds.has(id)) options.push({ id, label, path });
    for (const child of childrenOf.get(id) ?? []) {
      options.push(...collectUnder(child.id, path, muscleMap));
    }
    return options;
  }

  const groups: Array<{ primary: MuscleRecord; options: Array<{ id: string; label: string; path: string }> }> = [];
  for (const root of roots) {
    const options = collectUnder(root.id, '', muscleMap);
    if (options.length > 0)
      groups.push({ primary: root, options });
  }
  return groups;
}
