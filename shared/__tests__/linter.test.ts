import { lintAll, formatLintResults } from "../linter/deltaLinter";
import type { Motion, Muscle, ModifierRow, ComboRule } from "../types";

const MUSCLES: Muscle[] = [
  { id: "ARMS", label: "Arms", parent_ids: [], is_scorable: false },
  { id: "BICEPS", label: "Biceps", parent_ids: ["ARMS"], is_scorable: true },
  { id: "BRACHIALIS", label: "Brachialis", parent_ids: ["BICEPS"], is_scorable: true },
  { id: "TRICEPS", label: "Triceps", parent_ids: ["ARMS"], is_scorable: true },
  { id: "CHEST", label: "Chest", parent_ids: [], is_scorable: false },
  { id: "CHEST_MID", label: "Mid Chest", parent_ids: ["CHEST"], is_scorable: true },
];

const MOTIONS: Motion[] = [
  {
    id: "CURL",
    label: "Curl",
    parent_id: null,
    upper_lower: ["UPPER"],
    muscle_targets: { BICEPS: 0.85, BRACHIALIS: 0.75 },
    default_delta_configs: {},
  },
  {
    id: "PRESS",
    label: "Press",
    parent_id: null,
    upper_lower: ["UPPER"],
    muscle_targets: { CHEST: 0.9, CHEST_MID: 0.9 },
    default_delta_configs: {},
  },
  {
    id: "PRESS_FLAT",
    label: "Flat Press",
    parent_id: "PRESS",
    upper_lower: ["UPPER"],
    muscle_targets: { CHEST: 0.92, CHEST_MID: 0.92 },
    default_delta_configs: {},
  },
];

describe("Delta Linter", () => {
  it("reports no issues for valid data", () => {
    const modifiers: Record<string, ModifierRow[]> = {
      grips: [
        { id: "NONE", label: "None", delta_rules: {} },
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
        { id: "NONE", label: "None", delta_rules: {} },
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
        { id: "NONE", label: "None", delta_rules: {} },
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
        { id: "NONE", label: "None", delta_rules: {} },
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
        muscle_targets: { UNKNOWN_MUSCLE: 0.5 },
        default_delta_configs: {},
      },
    ];

    const issues = lintAll(motionsWithBadTarget, MUSCLES, {});
    const warnings = issues.filter((i) => i.severity === "warning");
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].message).toContain("Unknown muscle ID");
  });

  it("detects non-number value in muscle_targets", () => {
    const motionsWithBadValue: Motion[] = [
      {
        id: "BAD",
        label: "Bad",
        parent_id: null,
        upper_lower: ["UPPER"],
        muscle_targets: { BICEPS: "high" as any },
        default_delta_configs: {},
      },
    ];

    const issues = lintAll(motionsWithBadValue, MUSCLES, {});
    const errors = issues.filter((i) => i.severity === "error");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain("Score must be a number");
  });

  it("formatLintResults produces readable output", () => {
    const modifiers: Record<string, ModifierRow[]> = {
      grips: [
        { id: "NONE", label: "None", delta_rules: {} },
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

describe("Combo Rule Linting", () => {
  const baseModifiers: Record<string, ModifierRow[]> = {
    grips: [
      { id: "NONE", label: "None", delta_rules: {} },
      { id: "OVERHAND", label: "Overhand", delta_rules: { CURL: { BICEPS: 0.1 } } },
      { id: "NEUTRAL", label: "Neutral", delta_rules: { CURL: { BICEPS: -0.1 } } },
    ],
  };

  function makeComboRule(overrides: Partial<ComboRule> & Pick<ComboRule, "id" | "motion_id" | "action_type">): ComboRule {
    return {
      label: `Rule ${overrides.id}`,
      trigger_conditions_json: [],
      action_payload_json: {} as any,
      expected_primary_muscles: [],
      expected_not_primary: [],
      priority: 0,
      sort_order: 0,
      is_active: true,
      ...overrides,
    };
  }

  it("warns when CLAMP_MUSCLE targets a non-scorable muscle", () => {
    const rule = makeComboRule({
      id: "cr1",
      motion_id: "CURL",
      action_type: "CLAMP_MUSCLE",
      action_payload_json: { clamps: { ARMS: 0.5 } },
    });
    const issues = lintAll(MOTIONS, MUSCLES, baseModifiers, [rule]);
    const scorableWarnings = issues.filter(
      (i) => i.message.includes("not scorable") && i.table === "combo_rules"
    );
    expect(scorableWarnings).toHaveLength(1);
    expect(scorableWarnings[0].message).toContain("ARMS");
  });

  it("does not warn when CLAMP_MUSCLE targets a scorable muscle", () => {
    const rule = makeComboRule({
      id: "cr1",
      motion_id: "CURL",
      action_type: "CLAMP_MUSCLE",
      action_payload_json: { clamps: { BICEPS: 0.5 } },
    });
    const issues = lintAll(MOTIONS, MUSCLES, baseModifiers, [rule]);
    const scorableWarnings = issues.filter(
      (i) => i.message.includes("not scorable") && i.table === "combo_rules"
    );
    expect(scorableWarnings).toHaveLength(0);
  });

  it("errors when REPLACE_DELTA references a non-existent row", () => {
    const rule = makeComboRule({
      id: "cr1",
      motion_id: "CURL",
      action_type: "REPLACE_DELTA",
      action_payload_json: { table_key: "grips", row_id: "DOES_NOT_EXIST" },
    });
    const issues = lintAll(MOTIONS, MUSCLES, baseModifiers, [rule]);
    const rowErrors = issues.filter(
      (i) => i.message.includes("not found in modifier table") && i.table === "combo_rules"
    );
    expect(rowErrors).toHaveLength(1);
    expect(rowErrors[0].message).toContain("DOES_NOT_EXIST");
    expect(rowErrors[0].message).toContain("grips");
  });

  it("does not error when REPLACE_DELTA references an existing row", () => {
    const rule = makeComboRule({
      id: "cr1",
      motion_id: "CURL",
      action_type: "REPLACE_DELTA",
      action_payload_json: { table_key: "grips", row_id: "OVERHAND" },
    });
    const issues = lintAll(MOTIONS, MUSCLES, baseModifiers, [rule]);
    const rowErrors = issues.filter(
      (i) => i.message.includes("not found in modifier table") && i.table === "combo_rules"
    );
    expect(rowErrors).toHaveLength(0);
  });
});
