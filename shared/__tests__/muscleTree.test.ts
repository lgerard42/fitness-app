import {
  buildMuscleTreeFromFlat,
  flattenMuscleTree,
  recomputeScoresRecursive,
  getDepthUnderRoot,
  getChildrenOf,
  findRootMuscleId,
  type MuscleRecord,
  type TreeNode,
} from "../utils/muscleTree";

function muscleMap(records: MuscleRecord[]): Map<string, MuscleRecord> {
  const m = new Map<string, MuscleRecord>();
  records.forEach((r) => m.set(String(r.id), r));
  return m;
}

describe("buildMuscleTreeFromFlat", () => {
  it("builds 3-level tree from flat scores", () => {
    const all: MuscleRecord[] = [
      { id: "ARM", parent_ids: [] },
      { id: "BICEP", parent_ids: ["ARM"] },
      { id: "BICEP_INNER", parent_ids: ["BICEP"] },
    ];
    const flat = { ARM: 0, BICEP: 0, BICEP_INNER: 1 };
    const tree = buildMuscleTreeFromFlat(flat, all);
    expect((tree.ARM as TreeNode)._score).toBe(0);
    expect((tree.ARM as TreeNode).BICEP).toBeDefined();
    expect((tree.ARM as TreeNode).BICEP._score).toBe(0);
    expect((tree.ARM as TreeNode).BICEP.BICEP_INNER).toBeDefined();
    expect((tree.ARM as TreeNode).BICEP.BICEP_INNER._score).toBe(1);
  });

  it("builds 4-level tree and preserves scores", () => {
    const all: MuscleRecord[] = [
      { id: "R", parent_ids: [] },
      { id: "A", parent_ids: ["R"] },
      { id: "B", parent_ids: ["A"] },
      { id: "C", parent_ids: ["B"] },
    ];
    const flat = { R: 0, A: 0, B: 0, C: 2 };
    const tree = buildMuscleTreeFromFlat(flat, all);
    expect((tree.R as TreeNode).A).toBeDefined();
    expect((tree.R as TreeNode).A.B).toBeDefined();
    expect((tree.R as TreeNode).A.B.C).toBeDefined();
    expect((tree.R as TreeNode).A.B.C._score).toBe(2);
  });
});

describe("flattenMuscleTree", () => {
  it("flattens 3-level tree", () => {
    const all: MuscleRecord[] = [
      { id: "ARM", parent_ids: [] },
      { id: "BICEP", parent_ids: ["ARM"] },
      { id: "BICEP_INNER", parent_ids: ["BICEP"] },
    ];
    const flat = { ARM: 0, BICEP: 0, BICEP_INNER: 1 };
    const tree = buildMuscleTreeFromFlat(flat, all);
    const out = flattenMuscleTree(tree);
    expect(out.ARM).toBe(0);
    expect(out.BICEP).toBe(0);
    expect(out.BICEP_INNER).toBe(1);
  });

  it("flattens 4-level tree (no data loss)", () => {
    const all: MuscleRecord[] = [
      { id: "R", parent_ids: [] },
      { id: "A", parent_ids: ["R"] },
      { id: "B", parent_ids: ["A"] },
      { id: "C", parent_ids: ["B"] },
    ];
    const flat = { R: 0, A: 0, B: 0, C: 2 };
    const tree = buildMuscleTreeFromFlat(flat, all);
    const out = flattenMuscleTree(tree);
    expect(out.R).toBe(0);
    expect(out.A).toBe(0);
    expect(out.B).toBe(0);
    expect(out.C).toBe(2);
  });
});

describe("getDepthUnderRoot", () => {
  it("returns 0 for root", () => {
    const map = muscleMap([{ id: "R", parent_ids: [] }]);
    expect(getDepthUnderRoot("R", "R", map)).toBe(0);
  });

  it("returns 1 for child of root, 2 for grandchild", () => {
    const map = muscleMap([
      { id: "R", parent_ids: [] },
      { id: "A", parent_ids: ["R"] },
      { id: "B", parent_ids: ["A"] },
    ]);
    expect(getDepthUnderRoot("A", "R", map)).toBe(1);
    expect(getDepthUnderRoot("B", "R", map)).toBe(2);
  });

  it("returns 3 for 4th level", () => {
    const map = muscleMap([
      { id: "R", parent_ids: [] },
      { id: "A", parent_ids: ["R"] },
      { id: "B", parent_ids: ["A"] },
      { id: "C", parent_ids: ["B"] },
    ]);
    expect(getDepthUnderRoot("C", "R", map)).toBe(3);
  });
});

describe("getChildrenOf", () => {
  it("returns direct children only", () => {
    const all: MuscleRecord[] = [
      { id: "R", parent_ids: [] },
      { id: "A", parent_ids: ["R"] },
      { id: "B", parent_ids: ["A"] },
    ];
    expect(getChildrenOf("R", all).map((m) => m.id)).toEqual(["A"]);
    expect(getChildrenOf("A", all).map((m) => m.id)).toEqual(["B"]);
    expect(getChildrenOf("B", all).map((m) => m.id)).toEqual([]);
  });
});

describe("findRootMuscleId", () => {
  it("walks to root for 4-level chain", () => {
    const map = muscleMap([
      { id: "R", parent_ids: [] },
      { id: "A", parent_ids: ["R"] },
      { id: "B", parent_ids: ["A"] },
      { id: "C", parent_ids: ["B"] },
    ]);
    expect(findRootMuscleId("C", map)).toBe("R");
  });
});
