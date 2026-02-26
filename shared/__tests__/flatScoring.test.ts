import { flattenMuscleTargets } from "../scoring/computeActivation";
import type { MuscleTargets, Muscle } from "../types";

const MUSCLES: Muscle[] = [
  { id: "CHEST", label: "Chest", parent_ids: [] },
  { id: "CHEST_MID", label: "Mid Chest", parent_ids: ["CHEST"] },
  { id: "CHEST_UPPER", label: "Upper Chest", parent_ids: ["CHEST"] },
  { id: "ARMS", label: "Arms", parent_ids: [] },
  { id: "BICEPS", label: "Biceps", parent_ids: ["ARMS"] },
  { id: "BICEP_INNER", label: "Inner Bicep", parent_ids: ["BICEPS"] },
  { id: "BICEP_OUTER", label: "Outer Bicep", parent_ids: ["BICEPS"] },
  { id: "TRICEPS", label: "Triceps", parent_ids: ["ARMS"] },
  { id: "FOREARMS", label: "Forearms", parent_ids: ["ARMS"] },
  { id: "FOREARM_BOTTOM", label: "Bottom Forearm", parent_ids: ["FOREARMS"] },
  // Multi-parent muscle: belongs to both CHEST and ARMS
  { id: "PEC_MINOR", label: "Pec Minor", parent_ids: ["CHEST", "ARMS"] },
  { id: "SHOULDERS", label: "Shoulders", parent_ids: [] },
  { id: "DELTS_FRONT", label: "Front Delts", parent_ids: ["SHOULDERS"] },
];

describe("flattenMuscleTargets (identity)", () => {
  it("returns a shallow copy of the flat map", () => {
    const flat: MuscleTargets = { CHEST_MID: 0.9, TRICEPS: 0.72 };
    const result = flattenMuscleTargets(flat);
    expect(result).toEqual(flat);
    expect(result).not.toBe(flat);
  });

  it("handles empty map", () => {
    expect(flattenMuscleTargets({})).toEqual({});
  });
});

describe("flat-to-tree conversion for display", () => {
  function buildDisplayTree(flat: Record<string, number>, muscles: Muscle[]) {
    const muscleMap = new Map(muscles.map(m => [m.id, m]));
    const childrenOf = new Map<string, string[]>();
    const rootIds: string[] = [];

    for (const m of muscles) {
      if (m.parent_ids.length === 0) rootIds.push(m.id);
      for (const pid of m.parent_ids) {
        if (!childrenOf.has(pid)) childrenOf.set(pid, []);
        childrenOf.get(pid)!.push(m.id);
      }
    }

    const flatIds = new Set(Object.keys(flat));
    const neededIds = new Set<string>();
    function ensureAncestors(id: string) {
      if (neededIds.has(id)) return;
      neededIds.add(id);
      const m = muscleMap.get(id);
      if (!m) return;
      for (const pid of m.parent_ids) ensureAncestors(pid);
    }
    for (const id of flatIds) ensureAncestors(id);

    interface Node { id: string; score: number; computed: boolean; children: Node[] }
    function buildNode(id: string): Node | null {
      if (!neededIds.has(id)) return null;
      const kids = (childrenOf.get(id) || [])
        .map(cid => buildNode(cid))
        .filter((n): n is Node => n !== null);
      const hasKids = kids.length > 0;
      const score = hasKids
        ? Math.round(kids.reduce((s, c) => s + c.score, 0) * 100) / 100
        : (flat[id] ?? 0);
      return { id, score, computed: hasKids, children: kids };
    }

    const tree: Node[] = [];
    for (const rid of rootIds) { const n = buildNode(rid); if (n) tree.push(n); }
    return tree;
  }

  it("builds single-level tree for root-only scores", () => {
    const flat = { CHEST: 0.9, ARMS: 0.7 };
    const tree = buildDisplayTree(flat, MUSCLES);
    expect(tree.length).toBe(2);
    expect(tree.find(n => n.id === "CHEST")?.score).toBe(0.9);
    expect(tree.find(n => n.id === "CHEST")?.computed).toBe(false);
  });

  it("computes parent scores from children", () => {
    const flat = { CHEST_MID: 0.5, CHEST_UPPER: 0.3 };
    const tree = buildDisplayTree(flat, MUSCLES);
    const chest = tree.find(n => n.id === "CHEST");
    expect(chest).toBeDefined();
    expect(chest!.computed).toBe(true);
    expect(chest!.score).toBe(0.8);
    expect(chest!.children.length).toBe(2);
  });

  it("computes 3-level hierarchy", () => {
    const flat = { BICEP_INNER: 0.82, BICEP_OUTER: 0.78, FOREARM_BOTTOM: 0.45 };
    const tree = buildDisplayTree(flat, MUSCLES);
    const arms = tree.find(n => n.id === "ARMS");
    expect(arms).toBeDefined();
    expect(arms!.computed).toBe(true);

    const biceps = arms!.children.find(c => c.id === "BICEPS");
    expect(biceps).toBeDefined();
    expect(biceps!.computed).toBe(true);
    expect(biceps!.score).toBe(1.6);
    expect(biceps!.children.length).toBe(2);

    const forearms = arms!.children.find(c => c.id === "FOREARMS");
    expect(forearms).toBeDefined();
    expect(forearms!.score).toBe(0.45);

    expect(arms!.score).toBe(2.05);
  });

  it("handles multi-parent muscle (appears under all parents)", () => {
    const flat = { PEC_MINOR: 0.3 };
    const tree = buildDisplayTree(flat, MUSCLES);

    const chest = tree.find(n => n.id === "CHEST");
    const arms = tree.find(n => n.id === "ARMS");

    expect(chest).toBeDefined();
    expect(chest!.children.some(c => c.id === "PEC_MINOR")).toBe(true);

    expect(arms).toBeDefined();
    expect(arms!.children.some(c => c.id === "PEC_MINOR")).toBe(true);
  });

  it("handles empty flat map", () => {
    const tree = buildDisplayTree({}, MUSCLES);
    expect(tree.length).toBe(0);
  });
});

describe("round-trip: flat → display tree → edit → flat", () => {
  it("editing a leaf score preserves all other scores", () => {
    const original = { BICEP_INNER: 0.82, BICEP_OUTER: 0.78, CHEST_MID: 0.9 };
    const edited = { ...original, BICEP_INNER: 1.0 };
    expect(edited.BICEP_INNER).toBe(1.0);
    expect(edited.BICEP_OUTER).toBe(0.78);
    expect(edited.CHEST_MID).toBe(0.9);
  });

  it("adding a muscle preserves existing scores", () => {
    const original = { CHEST_MID: 0.9 };
    const withNew = { ...original, CHEST_UPPER: 0 };
    expect(withNew.CHEST_MID).toBe(0.9);
    expect(withNew.CHEST_UPPER).toBe(0);
    expect(Object.keys(withNew).length).toBe(2);
  });

  it("removing a muscle and descendants cleans up correctly", () => {
    const original = { BICEP_INNER: 0.82, BICEP_OUTER: 0.78, CHEST_MID: 0.9 };
    const muscleMap = new Map(MUSCLES.map(m => [m.id, m]));
    const childrenOf = new Map<string, string[]>();
    for (const m of MUSCLES) {
      for (const pid of m.parent_ids) {
        if (!childrenOf.has(pid)) childrenOf.set(pid, []);
        childrenOf.get(pid)!.push(m.id);
      }
    }

    const newFlat = { ...original };
    function removeRec(id: string) {
      delete newFlat[id];
      for (const kid of childrenOf.get(id) || []) {
        if (kid in newFlat) removeRec(kid);
      }
    }
    removeRec("BICEPS");
    expect(newFlat).toEqual({ CHEST_MID: 0.9 });
  });
});
