import {
  asFlatMuscleTargets,
  getMuscleIdWithMaxScore,
  getMuscleIdWithMaxCalculatedScore,
  findRootMuscleId,
  getSelectableMuscleIds,
  buildMuscleOptionGroups,
  type MuscleRecord,
} from "../utils/muscleGrouping";

function muscleMap(records: MuscleRecord[]): Map<string, MuscleRecord> {
  const m = new Map<string, MuscleRecord>();
  records.forEach((r) => m.set(String(r.id), r));
  return m;
}

describe("asFlatMuscleTargets", () => {
  it("parses flat Record<id, number>", () => {
    expect(asFlatMuscleTargets({ ARM: 1, BICEP: 0.8 })).toEqual({ ARM: 1, BICEP: 0.8 });
  });

  it("ignores non-number values", () => {
    expect(asFlatMuscleTargets({ ARM: 1, BICEP: "x", TRICEP: null })).toEqual({ ARM: 1 });
  });

  it("returns empty for null/undefined/array", () => {
    expect(asFlatMuscleTargets(null)).toEqual({});
    expect(asFlatMuscleTargets(undefined)).toEqual({});
    expect(asFlatMuscleTargets([])).toEqual({});
  });
});

describe("getMuscleIdWithMaxScore", () => {
  it("returns muscle with highest score", () => {
    expect(getMuscleIdWithMaxScore({ ARM: 0.5, BICEP: 0.9, TRICEP: 0.3 })).toBe("BICEP");
  });

  it("returns null for empty", () => {
    expect(getMuscleIdWithMaxScore({})).toBeNull();
  });

  it("returns first when tie", () => {
    const id = getMuscleIdWithMaxScore({ A: 1, B: 1 });
    expect(id === "A" || id === "B").toBe(true);
  });
});

describe("findRootMuscleId", () => {
  it("returns self when no parents", () => {
    const map = muscleMap([{ id: "ARM", parent_ids: [] }]);
    expect(findRootMuscleId("ARM", map)).toBe("ARM");
  });

  it("walks to root", () => {
    const map = muscleMap([
      { id: "ARM", parent_ids: [] },
      { id: "BICEP", parent_ids: ["ARM"] },
      { id: "BICEP_INNER", parent_ids: ["BICEP"] },
    ]);
    expect(findRootMuscleId("BICEP_INNER", map)).toBe("ARM");
    expect(findRootMuscleId("BICEP", map)).toBe("ARM");
    expect(findRootMuscleId("ARM", map)).toBe("ARM");
  });

  it("returns id when not in map", () => {
    expect(findRootMuscleId("X", new Map())).toBe("X");
  });
});

describe("getSelectableMuscleIds", () => {
  it("includes only muscles with children and calculated score >= minScore", () => {
    const list = [
      { id: "ARM", parent_ids: [] },
      { id: "BICEP", parent_ids: ["ARM"] },
    ];
    const map = muscleMap(list);
    const flat = { BICEP: 0.8 };
    const ids = getSelectableMuscleIds(flat, map, 0.5);
    expect(ids.has("BICEP")).toBe(false);
    expect(ids.has("ARM")).toBe(true);
  });

  it("excludes muscles with no children (leaf muscles never qualify)", () => {
    const map = muscleMap([
      { id: "ARM", parent_ids: [] },
      { id: "BICEP", parent_ids: ["ARM"] },
    ]);
    const ids = getSelectableMuscleIds({ BICEP: 0.9 }, map, 0.5);
    expect(ids.has("BICEP")).toBe(false);
  });

  it("excludes parent when its calculated score is below minScore", () => {
    const map = muscleMap([
      { id: "ARM", parent_ids: [] },
      { id: "BICEP", parent_ids: ["ARM"] },
    ]);
    const ids = getSelectableMuscleIds({ BICEP: 0.3 }, map, 0.5);
    expect(ids.has("ARM")).toBe(false);
  });

  it("uses calculated score (sum of children when no explicit) and custom minScore", () => {
    const map = muscleMap([
      { id: "ARM", parent_ids: [] },
      { id: "BICEP", parent_ids: ["ARM"] },
    ]);
    expect(getSelectableMuscleIds({ ARM: 0.6, BICEP: 0.1 }, map, 0.5).has("ARM")).toBe(true);
    expect(getSelectableMuscleIds({ BICEP: 0.4 }, map, 0.3).has("ARM")).toBe(true);
  });
});

describe("buildMuscleOptionGroups", () => {
  it("groups by primary with options under each", () => {
    const list: MuscleRecord[] = [
      { id: "ARM", parent_ids: [], label: "Arms" },
      { id: "BICEP", parent_ids: ["ARM"], label: "Biceps" },
    ];
    const map = muscleMap(list);
    const selectable = new Set(["ARM"]);
    const groups = buildMuscleOptionGroups(selectable, map, list);
    expect(groups.length).toBe(1);
    expect(groups[0].primary.id).toBe("ARM");
    expect(groups[0].options.length).toBe(1);
    expect(groups[0].options[0].id).toBe("ARM");
  });
});

describe("getMuscleIdWithMaxCalculatedScore", () => {
  it("returns selectable id with highest calculated score", () => {
    const list = [
      { id: "ARM", parent_ids: [] },
      { id: "BICEP", parent_ids: ["ARM"] },
      { id: "LEG", parent_ids: [] },
      { id: "QUAD", parent_ids: ["LEG"] },
    ];
    const map = muscleMap(list);
    const flat = { BICEP: 0.8, QUAD: 0.5 };
    const selectable = getSelectableMuscleIds(flat, map, 0.5);
    const id = getMuscleIdWithMaxCalculatedScore(flat, map, selectable);
    expect(id).toBe("ARM");
  });

  it("returns null when selectable is empty", () => {
    const map = muscleMap([{ id: "ARM", parent_ids: [] }]);
    expect(getMuscleIdWithMaxCalculatedScore({}, map, new Set())).toBeNull();
  });
});
