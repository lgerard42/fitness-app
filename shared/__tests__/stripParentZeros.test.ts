import { stripParentZerosFromFlatScores } from "../scoring/stripParentZeros";

describe("stripParentZerosFromFlatScores", () => {
  it("strips parent muscle IDs with score 0", () => {
    const parentIds = new Set<string>(["BICEPS", "ARMS"]);
    const flat = { BICEPS: 0, BICEP_INNER: 0.8, ARMS: 0, BICEP_OUTER: 0.5 };
    const result = stripParentZerosFromFlatScores(flat, parentIds);
    expect(result).toEqual({ BICEP_INNER: 0.8, BICEP_OUTER: 0.5 });
    expect(result).not.toHaveProperty("BICEPS");
    expect(result).not.toHaveProperty("ARMS");
  });

  it("keeps parent muscle IDs with non-zero score", () => {
    const parentIds = new Set<string>(["BICEPS"]);
    const flat = { BICEPS: 0.5, BICEP_INNER: 0.8 };
    const result = stripParentZerosFromFlatScores(flat, parentIds);
    expect(result).toEqual({ BICEPS: 0.5, BICEP_INNER: 0.8 });
  });

  it("keeps all leaf entries including 0", () => {
    const parentIds = new Set<string>(["BICEPS"]);
    const flat = { BICEP_INNER: 0, BICEP_OUTER: 0.5 };
    const result = stripParentZerosFromFlatScores(flat, parentIds);
    expect(result).toEqual({ BICEP_INNER: 0, BICEP_OUTER: 0.5 });
  });

  it("leaves object unchanged when no parent has 0", () => {
    const parentIds = new Set<string>(["BICEPS"]);
    const flat = { BICEP_INNER: 0.8, BICEP_OUTER: 0.5 };
    const result = stripParentZerosFromFlatScores(flat, parentIds);
    expect(result).toEqual(flat);
  });

  it("handles empty flat", () => {
    const parentIds = new Set<string>(["BICEPS"]);
    const result = stripParentZerosFromFlatScores({}, parentIds);
    expect(result).toEqual({});
  });

  it("handles empty parentIds", () => {
    const flat = { BICEPS: 0, BICEP_INNER: 0.8 };
    const result = stripParentZerosFromFlatScores(flat, new Set());
    expect(result).toEqual(flat);
  });
});
