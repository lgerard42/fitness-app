/**
 * Builds grouped dropdown options for muscle tree "add" selectors.
 * - Primary dropdown: all muscles grouped by root (primary) parent; is_scorable=false roots become section headers.
 * - Secondary dropdown: same structure but only muscles under the given primary id.
 */

export interface MuscleForDropdown {
  id: string;
  label: string;
  parent_ids?: string[];
  is_scorable?: boolean;
}

export interface MuscleDropdownOption {
  value: string;
  label: string;
  /** For secondary dropdown only: 1 = secondary (show bold), 2 = tertiary (show indented). */
  depth?: 1 | 2;
}

export interface MuscleDropdownGroup {
  /** Section header (root muscle label); non-scorable roots appear only as headers. */
  groupLabel: string;
  options: MuscleDropdownOption[];
}

function parseParentIds(m: MuscleForDropdown): string[] {
  const raw = m.parent_ids;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }
  return [];
}

function getRootId(muscleId: string, muscles: Map<string, MuscleForDropdown>): string {
  const m = muscles.get(muscleId);
  if (!m) return muscleId;
  const pids = parseParentIds(m);
  if (pids.length === 0) return muscleId;
  return getRootId(pids[0], muscles);
}

/** Collect all descendant ids under a root (depth-first). */
function collectUnderRoot(
  rootId: string,
  muscles: Map<string, MuscleForDropdown>,
  childrenOf: Map<string, string[]>
): string[] {
  const out: string[] = [];
  const queue = [rootId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    out.push(id);
    for (const cid of childrenOf.get(id) || []) {
      queue.push(cid);
    }
  }
  return out;
}

/** Depth relative to root: 0 = root, 1 = secondary, 2 = tertiary. */
function depthUnderRoot(
  mid: string,
  rootId: string,
  muscleMap: Map<string, MuscleForDropdown>
): 0 | 1 | 2 {
  if (mid === rootId) return 0;
  const m = muscleMap.get(mid);
  const pids = m ? parseParentIds(m) : [];
  if (pids.length === 0) return 0;
  const parent = muscleMap.get(pids[0]);
  const parentPids = parent ? parseParentIds(parent) : [];
  if (parentPids.length === 0) return 1;
  return 2;
}

/** If tertiary, returns secondary (parent) id; if secondary, returns self; if primary, returns null. */
function secondaryIdUnderRoot(
  mid: string,
  rootId: string,
  muscleMap: Map<string, MuscleForDropdown>
): string | null {
  const d = depthUnderRoot(mid, rootId, muscleMap);
  if (d === 0) return null;
  if (d === 1) return mid;
  const m = muscleMap.get(mid);
  const pids = m ? parseParentIds(m) : [];
  return pids.length > 0 ? pids[0] : null;
}

/**
 * Build options for one root: group tertiaries under their parent secondary, indent tertiaries, sort alphabetically.
 */
function buildOptionsForRoot(
  rootId: string,
  muscleMap: Map<string, MuscleForDropdown>,
  childrenOf: Map<string, string[]>,
  excludeIds: Set<string>
): MuscleDropdownOption[] {
  const idsUnderRoot = collectUnderRoot(rootId, muscleMap, childrenOf);
  const scorableIds = idsUnderRoot.filter(mid => {
    if (excludeIds.has(mid)) return false;
    return muscleMap.get(mid)?.is_scorable !== false;
  });

  const primaryOpt: MuscleDropdownOption[] = [];
  const bySecondary = new Map<string, string[]>();

  for (const mid of scorableIds) {
    const d = depthUnderRoot(mid, rootId, muscleMap);
    const label = muscleMap.get(mid)?.label ?? mid;
    if (d === 0) {
      primaryOpt.push({ value: mid, label });
      continue;
    }
    if (d === 1) {
      if (!bySecondary.has(mid)) bySecondary.set(mid, []);
      bySecondary.get(mid)!.push(mid);
      continue;
    }
    const sId = secondaryIdUnderRoot(mid, rootId, muscleMap);
    if (sId != null) {
      if (!bySecondary.has(sId)) bySecondary.set(sId, []);
      bySecondary.get(sId)!.push(mid);
    }
  }

  const options: MuscleDropdownOption[] = [...primaryOpt];

  const secondaryIds = Array.from(bySecondary.keys());
  secondaryIds.sort((a, b) => (muscleMap.get(a)?.label ?? a).localeCompare(muscleMap.get(b)?.label ?? b));

  for (const sId of secondaryIds) {
    const list = bySecondary.get(sId)!;
    const secondary = list.find(mid => mid === sId);
    const tertiaries = list.filter(mid => mid !== sId);
    tertiaries.sort((a, b) => (muscleMap.get(a)?.label ?? a).localeCompare(muscleMap.get(b)?.label ?? b));

    if (secondary != null) options.push({ value: sId, label: muscleMap.get(sId)?.label ?? sId });
    for (const tId of tertiaries) {
      options.push({ value: tId, label: `  ${muscleMap.get(tId)?.label ?? tId}` });
    }
  }

  return options;
}

/**
 * Build groups for the primary (outermost) dropdown: all muscles grouped by root.
 * Within each root: secondaries and tertiaries grouped (tertiaries indented under secondary), all sorted alphabetically.
 * excludeIds: muscle ids already in the tree (e.g. already added).
 */
export function buildPrimaryMuscleDropdownGroups(
  allMuscles: MuscleForDropdown[],
  excludeIds: Set<string>
): MuscleDropdownGroup[] {
  const muscleMap = new Map<string, MuscleForDropdown>();
  const childrenOf = new Map<string, string[]>();
  const rootIds: string[] = [];

  for (const m of allMuscles) {
    const id = m.id;
    muscleMap.set(id, m);
    const pids = parseParentIds(m);
    if (pids.length === 0) rootIds.push(id);
    else {
      const pid = pids[0];
      if (!childrenOf.has(pid)) childrenOf.set(pid, []);
      childrenOf.get(pid)!.push(id);
    }
  }

  rootIds.sort((a, b) => (muscleMap.get(a)?.label ?? a).localeCompare(muscleMap.get(b)?.label ?? b));

  const groups: MuscleDropdownGroup[] = [];
  for (const rid of rootIds) {
    const root = muscleMap.get(rid);
    const groupLabel = root?.label ?? rid;
    const options = buildOptionsForRoot(rid, muscleMap, childrenOf, excludeIds);
    if (options.length > 0) groups.push({ groupLabel, options });
  }
  return groups;
}

/**
 * Build options for the secondary dropdown only: no primary (current level).
 * Top level = secondaries (depth 1, render bold). Under each = tertiaries (depth 2, indented). Sorted alphabetically.
 */
function buildOptionsForSecondaryDropdown(
  rootId: string,
  muscleMap: Map<string, MuscleForDropdown>,
  childrenOf: Map<string, string[]>,
  excludeIds: Set<string>
): MuscleDropdownOption[] {
  const idsUnderRoot = collectUnderRoot(rootId, muscleMap, childrenOf);
  const scorableIds = idsUnderRoot.filter(mid => {
    if (excludeIds.has(mid)) return false;
    return muscleMap.get(mid)?.is_scorable !== false;
  });

  const bySecondary = new Map<string, string[]>();

  for (const mid of scorableIds) {
    const d = depthUnderRoot(mid, rootId, muscleMap);
    if (d === 0) continue;
    if (d === 1) {
      if (!bySecondary.has(mid)) bySecondary.set(mid, []);
      bySecondary.get(mid)!.push(mid);
      continue;
    }
    const sId = secondaryIdUnderRoot(mid, rootId, muscleMap);
    if (sId != null) {
      if (!bySecondary.has(sId)) bySecondary.set(sId, []);
      bySecondary.get(sId)!.push(mid);
    }
  }

  const options: MuscleDropdownOption[] = [];
  const secondaryIds = Array.from(bySecondary.keys());
  secondaryIds.sort((a, b) => (muscleMap.get(a)?.label ?? a).localeCompare(muscleMap.get(b)?.label ?? b));

  for (const sId of secondaryIds) {
    const list = bySecondary.get(sId)!;
    const secondary = list.find(mid => mid === sId);
    const tertiaries = list.filter(mid => mid !== sId);
    tertiaries.sort((a, b) => (muscleMap.get(a)?.label ?? a).localeCompare(muscleMap.get(b)?.label ?? b));

    if (secondary != null) {
      options.push({ value: sId, label: muscleMap.get(sId)?.label ?? sId, depth: 1 });
    }
    for (const tId of tertiaries) {
      options.push({ value: tId, label: muscleMap.get(tId)?.label ?? tId, depth: 2 });
    }
  }

  return options;
}

/**
 * Build groups for the secondary dropdown: only muscles under the given primary (root) id.
 * Excludes the primary (current level). Secondaries at top level (depth 1), tertiaries indented under (depth 2). Sorted alphabetically.
 */
export function buildSecondaryMuscleDropdownGroups(
  allMuscles: MuscleForDropdown[],
  primaryId: string,
  excludeIds: Set<string>
): MuscleDropdownGroup[] {
  const muscleMap = new Map<string, MuscleForDropdown>();
  const childrenOf = new Map<string, string[]>();
  for (const m of allMuscles) {
    muscleMap.set(m.id, m);
    const pids = parseParentIds(m);
    if (pids.length > 0) {
      const pid = pids[0];
      if (!childrenOf.has(pid)) childrenOf.set(pid, []);
      childrenOf.get(pid)!.push(m.id);
    }
  }
  const root = muscleMap.get(primaryId);
  const groupLabel = root?.label ?? primaryId;
  const options = buildOptionsForSecondaryDropdown(primaryId, muscleMap, childrenOf, excludeIds);
  if (options.length === 0) return [];
  return [{ groupLabel, options }];
}
