/**
 * Recursive muscle tree utilities: build from flat scores, flatten, recompute,
 * and depth/children helpers. Supports arbitrary hierarchy depth (not fixed 3 levels).
 */

export interface MuscleRecord {
  id: string;
  label?: string;
  parent_ids?: string[];
  [key: string]: unknown;
}

export type TreeNode = { _score: number; [childId: string]: TreeNode | number };

function parseParentIds(m: MuscleRecord): string[] {
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

/** Root muscle ID for a given muscle (walk parent_ids to top). Cycle-safe. */
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

/** Path from root to muscleId (inclusive). Empty if not under root or cycle. */
function getPathFromRoot(
  muscleId: string,
  rootId: string,
  muscleMap: Map<string, MuscleRecord>
): string[] {
  const visited = new Set<string>();
  const path: string[] = [];
  let current: string | undefined = muscleId;
  while (current && !visited.has(current)) {
    visited.add(current);
    path.unshift(current);
    if (current === rootId) return path;
    const m = muscleMap.get(current);
    const pids = m?.parent_ids;
    if (!pids || !Array.isArray(pids) || pids.length === 0) break;
    current = pids[0];
  }
  return path[path.length - 1] === rootId ? path : [];
}

/** Path from root to muscleId (inclusive). Root is the first element. */
export function getPathFromRootToMuscle(
  muscleId: string,
  muscleMap: Map<string, MuscleRecord>
): string[] {
  const rootId = findRootMuscleId(muscleId, muscleMap);
  return getPathFromRoot(muscleId, rootId, muscleMap);
}

/** Ensure node exists at path and return it. Mutates tree. */
function ensurePath(
  tree: TreeNode,
  path: string[],
  flat: Record<string, number>
): TreeNode {
  let node = tree;
  for (let i = 0; i < path.length; i++) {
    const id = path[i];
    if (!node[id] || typeof node[id] === 'number') {
      (node as Record<string, TreeNode>)[id] = { _score: flat[id] ?? 0 };
    }
    node = node[id] as TreeNode;
    if (id in flat) node._score = flat[id];
  }
  return node;
}

/**
 * Build tree from flat scores. Resolves full ancestor chain per muscle and
 * places score at the correct leaf. Supports arbitrary depth.
 */
export function buildMuscleTreeFromFlat(
  flat: Record<string, number>,
  allMuscles: MuscleRecord[]
): TreeNode {
  const tree: TreeNode = { _score: 0 };
  const muscleMap = new Map<string, MuscleRecord>();
  for (const m of allMuscles) muscleMap.set(m.id, m);

  for (const [muscleId, score] of Object.entries(flat)) {
    const m = allMuscles.find(mu => mu.id === muscleId);
    if (!m) continue;
    const pids = parseParentIds(m);
    if (pids.length === 0) {
      if (!tree[muscleId]) (tree as Record<string, TreeNode>)[muscleId] = { _score: 0 };
      (tree[muscleId] as TreeNode)._score = score;
      continue;
    }
    const rootId = findRootMuscleId(muscleId, muscleMap);
    const path = getPathFromRoot(muscleId, rootId, muscleMap);
    if (path.length === 0) continue;
    const node = ensurePath(tree, path, flat);
    node._score = score;
  }

  for (const [id, score] of Object.entries(flat)) {
    if (id in tree && typeof tree[id] !== 'number') {
      (tree[id] as TreeNode)._score = score;
    }
  }
  return tree;
}

/**
 * Flatten tree to Record<muscleId, number>. Recursively visits all levels.
 */
export function flattenMuscleTree(tree: TreeNode): Record<string, number> {
  const flat: Record<string, number> = {};
  function visit(node: TreeNode, key: string) {
    if (key !== '_score') flat[key] = (node as TreeNode)._score ?? 0;
  }
  function walk(node: TreeNode, prefix: string[]) {
    const keys = Object.keys(node).filter(k => k !== '_score');
    for (const k of keys) {
      const child = node[k];
      if (typeof child === 'number') continue;
      const path = [...prefix, k];
      visit(child, k);
      walk(child, path);
    }
  }
  const rootKeys = Object.keys(tree).filter(k => k !== '_score');
  for (const k of rootKeys) {
    const child = tree[k];
    if (typeof child === 'number') continue;
    visit(child, k);
    walk(child, [k]);
  }
  return flat;
}

/**
 * Recompute _score for each node as sum of children's (recomputed) totals. Leaves unchanged.
 */
export function recomputeScoresRecursive(tree: TreeNode): void {
  function walk(node: TreeNode): number {
    const keys = Object.keys(node).filter(k => k !== '_score');
    if (keys.length === 0) return node._score ?? 0;
    let sum = 0;
    for (const k of keys) {
      const child = node[k];
      if (typeof child === 'number') continue;
      sum += walk(child);
    }
    node._score = Math.round(sum * 100) / 100;
    return node._score;
  }
  const rootKeys = Object.keys(tree).filter(k => k !== '_score');
  for (const k of rootKeys) {
    const child = tree[k];
    if (typeof child === 'number') continue;
    walk(child);
  }
}

/**
 * Depth of muscle under root (0 = root, 1 = child of root, etc.). Cycle-safe.
 */
export function getDepthUnderRoot(
  muscleId: string,
  rootId: string,
  muscleMap: Map<string, MuscleRecord>
): number {
  if (muscleId === rootId) return 0;
  const path = getPathFromRoot(muscleId, rootId, muscleMap);
  return path.length > 0 ? path.length - 1 : 0;
}

/**
 * Direct children of a parent in the hierarchy. Replaces getSecondariesFor(pId) / getTertiariesFor(sId).
 */
export function getChildrenOf(
  parentId: string,
  allMuscles: MuscleRecord[]
): MuscleRecord[] {
  return allMuscles.filter(m => {
    const pids = parseParentIds(m);
    return pids.includes(parentId);
  });
}
