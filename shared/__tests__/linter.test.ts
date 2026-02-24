import { lintAll, formatLintResults } from "../linter/deltaLinter";
import type { Motion, Muscle, ModifierRow } from "../types";

const MUSCLES: Muscle[] = [
  { id: "ARMS", label: "Arms", parent_ids: [] },
  { id: "BICEPS", label: "Biceps", parent_ids: ["ARMS"] },
  { id: "BRACHIALIS", label: "Brachialis", parent_ids: ["BICEPS"] },
  { id: "TRICEPS", label: "Triceps", parent_ids: ["ARMS"] },
  { id: "CHEST", label: "Chest", parent_ids: [] },
  { id: "CHEST_MID", label: "Mid Chest", parent_ids: ["CHEST"] },
];

const MOTIONS: Motion[] = [
  {
    id: "CURL",
    label: "Curl",
    parent_id: null,
    upper_lower: ["UPPER"],
    muscle_targets: {
      ARMS: {
        _score: 2.87,
        BICEPS: { _score: 2.42, BRACHIALIS: { _score: 0.82 } },
      },
    },
    default_delta_configs: {},
  },
  {
    id: "PRESS",
    label: "Press",
    parent_id: null,
    upper_lower: ["UPPER"],
    muscle_targets: {
      CHEST: { _score: 0.9, CHEST_MID: { _score: 0.9 } },
    },
    default_delta_configs: {},
  },
  {
    id: "PRESS_FLAT",
    label: "Flat Press",
    parent_id: "PRESS",
    upper_lower: ["UPPER"],
    muscle_targets: {
      CHEST: { _score: 0.92, CHEST_MID: { _score: 0.92 } },
    },
    default_delta_configs: {},
  },
];

describe("Delta Linter", () => {
  it("reports no issues for valid data", () => {
    const modifiers: Record<string, ModifierRow[]> = {
      grips: [
        {
          id: "PRONATED",
          label: "Pronated",
          delta_rules: {
            CURL: { BRACHIALIS: 0.3 },
            PRESS: {},
          },
        },
      ],
    };

    const issues = lintAll(MOTIONS, MUSCLES, modifiers);
    expect(issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  it("detects unknown motion ID in delta_rules", () => {
    const modifiers: Record<string, ModifierRow[]> = {
      grips: [
        {
          id: "TEST",
          label: "Test",
          delta_rules: {
            NONEXISTENT_MOTION: { BICEPS: 0.5 },
          },
        },
      ],
    };

    const issues = lintAll(MOTIONS, MUSCLES, modifiers);
    const errors = issues.filter((i) => i.severity === "error");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain("Unknown motion ID");
  });

  it("detects unknown muscle ID in delta values", () => {
    const modifiers: Record<string, ModifierRow[]> = {
      grips: [
        {
          id: "TEST",
          label: "Test",
          delta_rules: {
            CURL: { FAKE_MUSCLE: 0.5 },
          },
        },
      ],
    };

    const issues = lintAll(MOTIONS, MUSCLES, modifiers);
    const warnings = issues.filter((i) => i.severity === "warning");
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].message).toContain("Unknown muscle ID");
  });

  it("detects inherit on root motion (no parent)", () => {
    const modifiers: Record<string, ModifierRow[]> = {
      grips: [
        {
          id: "TEST",
          label: "Test",
          delta_rules: {
            CURL: "inherit",
          },
        },
      ],
    };

    const issues = lintAll(MOTIONS, MUSCLES, modifiers);
    const errors = issues.filter((i) => i.severity === "error");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain("no parent_id");
  });

  it("allows valid inherit on child motion", () => {
    const modifiers: Record<string, ModifierRow[]> = {
      grips: [
        {
          id: "TEST",
          label: "Test",
          delta_rules: {
            PRESS_FLAT: "inherit",
            PRESS: { CHEST_MID: 0.1 },
          },
        },
      ],
    };

    const issues = lintAll(MOTIONS, MUSCLES, modifiers);
    const errors = issues.filter((i) => i.severity === "error");
    expect(errors).toHaveLength(0);
  });

  it("detects unknown parent_id in motions", () => {
    const brokenMotions: Motion[] = [
      ...MOTIONS,
      {
        id: "BROKEN",
        label: "Broken",
        parent_id: "DOES_NOT_EXIST",
        upper_lower: ["UPPER"],
        muscle_targets: {},
        default_delta_configs: {},
      },
    ];

    const issues = lintAll(brokenMotions, MUSCLES, {});
    const errors = issues.filter((i) => i.severity === "error");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain("Unknown parent motion ID");
  });

  it("detects unknown muscle in muscle_targets", () => {
    const motionsWithBadTarget: Motion[] = [
      {
        id: "BAD",
        label: "Bad",
        parent_id: null,
        upper_lower: ["UPPER"],
        muscle_targets: {
          CHEST: {
            _score: 1,
            UNKNOWN_MUSCLE: { _score: 0.5 },
          },
        } as any,
        default_delta_configs: {},
      },
    ];

    const issues = lintAll(motionsWithBadTarget, MUSCLES, {});
    const warnings = issues.filter((i) => i.severity === "warning");
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].message).toContain("Unknown muscle ID");
  });

  it("formatLintResults produces readable output", () => {
    const modifiers: Record<string, ModifierRow[]> = {
      grips: [
        {
          id: "TEST",
          label: "Test",
          delta_rules: { NONEXISTENT: { BICEPS: 0.5 } },
        },
      ],
    };

    const issues = lintAll(MOTIONS, MUSCLES, modifiers);
    const formatted = formatLintResults(issues);
    expect(formatted).toContain("ERR");
    expect(formatted).toContain("Summary:");
  });

  it("formats empty results correctly", () => {
    const formatted = formatLintResults([]);
    expect(formatted).toBe("No issues found.");
  });
});
