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
  /** Relative depth in this dropdown: 0 = group level (or first in group), 1 = one level nested. Used for indent/bold styling. */
  depth?: number;
  /** When true, option is shown for grouping but not selectable (e.g. is_scorable = false or already in tree). */
  disabled?: boolean;
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

/** Depth relative to root (0 = root, 1 = child of root, etc.). Cycle-safe. */
function depthUnderRoot(
  mid: string,
  rootId: string,
  muscleMap: Map<string, MuscleForDropdown>
): number {
  if (mid === rootId) return 0;
  const visited = new Set<string>();
  let current: string | undefined = mid;
  let depth = 0;
  while (current && !visited.has(current)) {
    visited.add(current);
    depth++;
    const m = muscleMap.get(current);
    const pids = m ? parseParentIds(m) : [];
    if (pids.length === 0) return 0;
    current = pids[0];
    if (current === rootId) return depth;
  }
  return 0;
}

/** Immediate parent id of this node under root (parent in chain toward rootId); null if root. */
function parentIdUnderRoot(
  mid: string,
  rootId: string,
  muscleMap: Map<string, MuscleForDropdown>
): string | null {
  if (mid === rootId) return null;
  const m = muscleMap.get(mid);
  const pids = m ? parseParentIds(m) : [];
  return pids.length > 0 ? pids[0] : null;
}

/**
 * Collect one option for nodeId at the given depth, then recursively all descendants with depth+1.
 * Used to build a full tree of options under each group.
 */
function collectDescendantsWithDepth(
  nodeId: string,
  depth: number,
  childrenOf: Map<string, string[]>,
  getLabel: (id: string) => string,
  disabled: (id: string) => boolean
): MuscleDropdownOption[] {
  const options: MuscleDropdownOption[] = [
    { value: nodeId, label: getLabel(nodeId), depth, disabled: disabled(nodeId) },
  ];
  const children = (childrenOf.get(nodeId) || []).slice().sort((a, b) => getLabel(a).localeCompare(getLabel(b)));
  for (const cid of children) {
    options.push(...collectDescendantsWithDepth(cid, depth + 1, childrenOf, getLabel, disabled));
  }
  return options;
}

/**
 * Unified add-muscle dropdown: recursive grouping with all relative children at all depths.
 * - At root (parentId null): groups = roots (depth 0), options under each = all descendants of that root (depth 0, 1, 2, ...).
 * - At any node (parentId set): groups = direct children (relative depth 1), options = [that child] (depth 0) + all its descendants (depth 1, 2, ...).
 * Includes is_scorable = false for grouping; they are marked disabled and not clickable.
 */
export function buildAddMuscleDropdownGroups(
  parentId: string | null,
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

  const getLabel = (id: string) => muscleMap.get(id)?.label ?? id;
  const disabled = (id: string) => muscleMap.get(id)?.is_scorable === false || excludeIds.has(id);

  function sortIds(ids: string[]) {
    return ids.slice().sort((a, b) => getLabel(a).localeCompare(getLabel(b)));
  }

  if (parentId === null) {
    rootIds.sort((a, b) => getLabel(a).localeCompare(getLabel(b)));
    const groups: MuscleDropdownGroup[] = [];
    for (const rid of rootIds) {
      const groupLabel = getLabel(rid);
      const directChildren = sortIds(childrenOf.get(rid) || []);
      const options: MuscleDropdownOption[] = [];
      for (const cid of directChildren) {
        options.push(...collectDescendantsWithDepth(cid, 0, childrenOf, getLabel, disabled));
      }
      groups.push({ groupLabel, options });
    }
    return groups;
  }

  const directChildren = sortIds(childrenOf.get(parentId) || []);
  const groups: MuscleDropdownGroup[] = [];
  for (const cid of directChildren) {
    const groupLabel = getLabel(cid);
    const options = collectDescendantsWithDepth(cid, 0, childrenOf, getLabel, disabled);
    groups.push({ groupLabel, options });
  }
  return groups;
}

/**
 * Build groups for the primary (outermost) dropdown: all muscles grouped by root.
 * Uses unified recursive grouping; includes non-scorable as disabled.
 */
export function buildPrimaryMuscleDropdownGroups(
  allMuscles: MuscleForDropdown[],
  excludeIds: Set<string>
): MuscleDropdownGroup[] {
  return buildAddMuscleDropdownGroups(null, allMuscles, excludeIds);
}

/**
 * Build groups for the "add under this node" dropdown: only muscles under the given parent id.
 * Uses unified recursive grouping (relative depth 1 as groups, depth 2 nested); includes non-scorable as disabled.
 */
export function buildSecondaryMuscleDropdownGroups(
  allMuscles: MuscleForDropdown[],
  primaryId: string,
  excludeIds: Set<string>
): MuscleDropdownGroup[] {
  return buildAddMuscleDropdownGroups(primaryId, allMuscles, excludeIds);
}

/**
 * Flatten buildAddMuscleDropdownGroups result to a single options array for MuscleSecondarySelect.
 * Relative depth 0 = group-level (bold), depth 1+ = indented by depth. Disabled options are included.
 */
export function flattenAddMuscleGroupsToOptions(groups: MuscleDropdownGroup[]): MuscleDropdownOption[] {
  const out: MuscleDropdownOption[] = [];
  for (const grp of groups) {
    for (const opt of grp.options) out.push(opt);
  }
  return out;
}
