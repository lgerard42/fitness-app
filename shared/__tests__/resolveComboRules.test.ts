import { resolveComboRules } from "../scoring/resolveComboRules";
import { computeActivation } from "../scoring/computeActivation";
import { resolveAllDeltas } from "../scoring/resolveDeltas";
import type {
  ComboRule,
  ModifierSelection,
  Motion,
  ModifierRow,
} from "../types";

// ─── Fixtures ─────────────────────────────────────────────────────────

const MOTIONS: Record<string, Motion> = {
  PRESS: {
    id: "PRESS",
    label: "Press",
    parent_id: null,
    upper_lower: ["UPPER"],
    muscle_targets: { CHEST_MID: 0.9, TRICEPS: 0.72, DELTS_FRONT: 0.48 },
    default_delta_configs: {},
  },
  PRESS_INCLINE: {
    id: "PRESS_INCLINE",
    label: "Incline Press",
    parent_id: "PRESS",
    upper_lower: ["UPPER"],
    muscle_targets: { CHEST_UPPER: 0.85, TRICEPS: 0.65, DELTS_FRONT: 0.55 },
    default_delta_configs: {},
  },
  CURL: {
    id: "CURL",
    label: "Curl",
    parent_id: null,
    upper_lower: ["UPPER"],
    muscle_targets: { BICEPS: 0.9, FOREARMS: 0.4 },
    default_delta_configs: {},
  },
};

function makeRule(overrides: Partial<ComboRule> & Pick<ComboRule, "id" | "motion_id" | "action_type">): ComboRule {
  return {
    label: overrides.label ?? `Rule ${overrides.id}`,
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

// ─── Tests ────────────────────────────────────────────────────────────

describe("resolveComboRules", () => {
  it("returns passthrough when no rules exist", () => {
    const result = resolveComboRules("PRESS", [{ tableKey: "grips", rowId: "OVERHAND" }], []);
    expect(result.effectiveMotionId).toBe("PRESS");
    expect(result.deltaOverrides).toEqual([]);
    expect(result.clampMap).toEqual({});
    expect(result.rulesFired).toEqual([]);
  });

  it("returns passthrough when no rules match", () => {
    const rule = makeRule({
      id: "r1",
      motion_id: "PRESS",
      action_type: "SWITCH_MOTION",
      trigger_conditions_json: [{ tableKey: "grips", operator: "eq", value: "UNDERHAND" }],
      action_payload_json: { proxy_motion_id: "CURL" },
    });
    const result = resolveComboRules("PRESS", [{ tableKey: "grips", rowId: "OVERHAND" }], [rule]);
    expect(result.effectiveMotionId).toBe("PRESS");
    expect(result.rulesFired).toHaveLength(0);
  });

  it("SWITCH_MOTION sets effectiveMotionId when conditions match", () => {
    const rule = makeRule({
      id: "r1",
      motion_id: "PRESS",
      action_type: "SWITCH_MOTION",
      trigger_conditions_json: [{ tableKey: "grips", operator: "eq", value: "NEUTRAL" }],
      action_payload_json: { proxy_motion_id: "PRESS_INCLINE" },
    });
    const sel: ModifierSelection[] = [{ tableKey: "grips", rowId: "NEUTRAL" }];
    const result = resolveComboRules("PRESS", sel, [rule]);
    expect(result.effectiveMotionId).toBe("PRESS_INCLINE");
    expect(result.rulesFired).toHaveLength(1);
    expect(result.rulesFired[0].actionType).toBe("SWITCH_MOTION");
    expect(result.rulesFired[0].winnerReason).toBe("only match");
  });

  it("REPLACE_DELTA adds delta overrides", () => {
    const rule = makeRule({
      id: "r1",
      motion_id: "PRESS",
      action_type: "REPLACE_DELTA",
      trigger_conditions_json: [{ tableKey: "grips", operator: "eq", value: "NEUTRAL" }],
      action_payload_json: { table_key: "grips", row_id: "NEUTRAL", deltas: { CHEST_MID: -0.2 } },
    });
    const result = resolveComboRules("PRESS", [{ tableKey: "grips", rowId: "NEUTRAL" }], [rule]);
    expect(result.deltaOverrides).toHaveLength(1);
    expect(result.deltaOverrides[0].deltas).toEqual({ CHEST_MID: -0.2 });
  });

  it("CLAMP_MUSCLE populates clampMap", () => {
    const rule = makeRule({
      id: "r1",
      motion_id: "PRESS",
      action_type: "CLAMP_MUSCLE",
      trigger_conditions_json: [{ tableKey: "grips", operator: "eq", value: "NEUTRAL" }],
      action_payload_json: { clamps: { TRICEPS: 0.5 } },
    });
    const result = resolveComboRules("PRESS", [{ tableKey: "grips", rowId: "NEUTRAL" }], [rule]);
    expect(result.clampMap).toEqual({ TRICEPS: 0.5 });
  });

  describe("tie-breaking", () => {
    it("prefers higher specificity (more conditions)", () => {
      const general = makeRule({
        id: "r1",
        motion_id: "PRESS",
        action_type: "SWITCH_MOTION",
        trigger_conditions_json: [{ tableKey: "grips", operator: "eq", value: "NEUTRAL" }],
        action_payload_json: { proxy_motion_id: "CURL" },
        priority: 0,
      });
      const specific = makeRule({
        id: "r2",
        motion_id: "PRESS",
        action_type: "SWITCH_MOTION",
        trigger_conditions_json: [
          { tableKey: "grips", operator: "eq", value: "NEUTRAL" },
          { tableKey: "torsoAngles", operator: "eq", value: "INCLINE" },
        ],
        action_payload_json: { proxy_motion_id: "PRESS_INCLINE" },
        priority: 0,
      });
      const sel: ModifierSelection[] = [
        { tableKey: "grips", rowId: "NEUTRAL" },
        { tableKey: "torsoAngles", rowId: "INCLINE" },
      ];
      const result = resolveComboRules("PRESS", sel, [general, specific]);
      expect(result.effectiveMotionId).toBe("PRESS_INCLINE");
      expect(result.rulesFired[0].winnerReason).toBe("highest specificity");
    });

    it("falls back to priority when specificity is equal", () => {
      const lowPrio = makeRule({
        id: "r1",
        motion_id: "PRESS",
        action_type: "SWITCH_MOTION",
        trigger_conditions_json: [{ tableKey: "grips", operator: "eq", value: "NEUTRAL" }],
        action_payload_json: { proxy_motion_id: "CURL" },
        priority: 1,
      });
      const highPrio = makeRule({
        id: "r2",
        motion_id: "PRESS",
        action_type: "SWITCH_MOTION",
        trigger_conditions_json: [{ tableKey: "grips", operator: "eq", value: "NEUTRAL" }],
        action_payload_json: { proxy_motion_id: "PRESS_INCLINE" },
        priority: 10,
      });
      const result = resolveComboRules("PRESS", [{ tableKey: "grips", rowId: "NEUTRAL" }], [lowPrio, highPrio]);
      expect(result.effectiveMotionId).toBe("PRESS_INCLINE");
      expect(result.rulesFired[0].winnerReason).toBe("priority tie-break");
    });

    it("falls back to rule id when specificity and priority are equal", () => {
      const ruleA = makeRule({
        id: "aaa",
        motion_id: "PRESS",
        action_type: "SWITCH_MOTION",
        trigger_conditions_json: [{ tableKey: "grips", operator: "eq", value: "NEUTRAL" }],
        action_payload_json: { proxy_motion_id: "PRESS_INCLINE" },
        priority: 5,
      });
      const ruleB = makeRule({
        id: "bbb",
        motion_id: "PRESS",
        action_type: "SWITCH_MOTION",
        trigger_conditions_json: [{ tableKey: "grips", operator: "eq", value: "NEUTRAL" }],
        action_payload_json: { proxy_motion_id: "CURL" },
        priority: 5,
      });
      const result = resolveComboRules("PRESS", [{ tableKey: "grips", rowId: "NEUTRAL" }], [ruleB, ruleA]);
      expect(result.effectiveMotionId).toBe("PRESS_INCLINE");
      expect(result.rulesFired[0].winnerReason).toBe("id tie-break");
    });
  });

  describe("order-independence", () => {
    it("produces the same result regardless of selectedModifiers order", () => {
      const rule = makeRule({
        id: "r1",
        motion_id: "PRESS",
        action_type: "SWITCH_MOTION",
        trigger_conditions_json: [
          { tableKey: "grips", operator: "eq", value: "NEUTRAL" },
          { tableKey: "torsoAngles", operator: "eq", value: "INCLINE" },
        ],
        action_payload_json: { proxy_motion_id: "PRESS_INCLINE" },
      });
      const selA: ModifierSelection[] = [
        { tableKey: "grips", rowId: "NEUTRAL" },
        { tableKey: "torsoAngles", rowId: "INCLINE" },
      ];
      const selB: ModifierSelection[] = [
        { tableKey: "torsoAngles", rowId: "INCLINE" },
        { tableKey: "grips", rowId: "NEUTRAL" },
      ];
      const resultA = resolveComboRules("PRESS", selA, [rule]);
      const resultB = resolveComboRules("PRESS", selB, [rule]);
      expect(resultA).toEqual(resultB);
    });
  });

  it("handles multiple action types in one pass", () => {
    const switchRule = makeRule({
      id: "r1",
      motion_id: "PRESS",
      action_type: "SWITCH_MOTION",
      trigger_conditions_json: [{ tableKey: "grips", operator: "eq", value: "NEUTRAL" }],
      action_payload_json: { proxy_motion_id: "PRESS_INCLINE" },
    });
    const replaceRule = makeRule({
      id: "r2",
      motion_id: "PRESS",
      action_type: "REPLACE_DELTA",
      trigger_conditions_json: [{ tableKey: "grips", operator: "eq", value: "NEUTRAL" }],
      action_payload_json: { table_key: "grips", row_id: "NEUTRAL", deltas: { CHEST_MID: -0.1 } },
    });
    const clampRule = makeRule({
      id: "r3",
      motion_id: "PRESS",
      action_type: "CLAMP_MUSCLE",
      trigger_conditions_json: [{ tableKey: "grips", operator: "eq", value: "NEUTRAL" }],
      action_payload_json: { clamps: { TRICEPS: 0.3 } },
    });
    const sel: ModifierSelection[] = [{ tableKey: "grips", rowId: "NEUTRAL" }];
    const result = resolveComboRules("PRESS", sel, [switchRule, replaceRule, clampRule]);
    expect(result.effectiveMotionId).toBe("PRESS_INCLINE");
    expect(result.deltaOverrides).toHaveLength(1);
    expect(result.clampMap).toEqual({ TRICEPS: 0.3 });
    expect(result.rulesFired).toHaveLength(3);
  });

  it("ignores inactive rules", () => {
    const rule = makeRule({
      id: "r1",
      motion_id: "PRESS",
      action_type: "SWITCH_MOTION",
      trigger_conditions_json: [{ tableKey: "grips", operator: "eq", value: "NEUTRAL" }],
      action_payload_json: { proxy_motion_id: "PRESS_INCLINE" },
      is_active: false,
    });
    const result = resolveComboRules("PRESS", [{ tableKey: "grips", rowId: "NEUTRAL" }], [rule]);
    expect(result.effectiveMotionId).toBe("PRESS");
    expect(result.rulesFired).toHaveLength(0);
  });

  it("ignores rules for different motions", () => {
    const rule = makeRule({
      id: "r1",
      motion_id: "CURL",
      action_type: "SWITCH_MOTION",
      trigger_conditions_json: [{ tableKey: "grips", operator: "eq", value: "NEUTRAL" }],
      action_payload_json: { proxy_motion_id: "PRESS_INCLINE" },
    });
    const result = resolveComboRules("PRESS", [{ tableKey: "grips", rowId: "NEUTRAL" }], [rule]);
    expect(result.effectiveMotionId).toBe("PRESS");
  });

  it("supports 'in' operator matching any of multiple values", () => {
    const rule = makeRule({
      id: "r1",
      motion_id: "PRESS",
      action_type: "CLAMP_MUSCLE",
      trigger_conditions_json: [
        { tableKey: "grips", operator: "in", value: ["NEUTRAL", "OVERHAND"] },
      ],
      action_payload_json: { clamps: { TRICEPS: 0.4 } },
    });
    const result = resolveComboRules("PRESS", [{ tableKey: "grips", rowId: "OVERHAND" }], [rule]);
    expect(result.clampMap).toEqual({ TRICEPS: 0.4 });
  });

  it("supports 'not_eq' operator", () => {
    const rule = makeRule({
      id: "r1",
      motion_id: "PRESS",
      action_type: "CLAMP_MUSCLE",
      trigger_conditions_json: [
        { tableKey: "grips", operator: "not_eq", value: "UNDERHAND" },
      ],
      action_payload_json: { clamps: { TRICEPS: 0.4 } },
    });
    const result = resolveComboRules("PRESS", [{ tableKey: "grips", rowId: "OVERHAND" }], [rule]);
    expect(result.clampMap).toEqual({ TRICEPS: 0.4 });

    const resultUnder = resolveComboRules("PRESS", [{ tableKey: "grips", rowId: "UNDERHAND" }], [rule]);
    expect(resultUnder.clampMap).toEqual({});
  });
});

describe("computeActivation with combo overrides", () => {
  it("applies CLAMP_MUSCLE after delta resolution", () => {
    const muscleTargets = { CHEST_MID: 0.9, TRICEPS: 0.72, DELTS_FRONT: 0.48 };
    const resolvedDeltas = [
      { modifierTable: "grips", modifierId: "NEUTRAL", motionId: "PRESS", deltas: { TRICEPS: 0.3 }, inherited: false },
    ];
    const result = computeActivation(muscleTargets, resolvedDeltas, {}, {
      clampMap: { TRICEPS: 0.5 },
    });
    expect(result.finalScores.TRICEPS).toBe(0.5);
  });

  it("applies REPLACE_DELTA overrides", () => {
    const muscleTargets = { CHEST_MID: 0.9, TRICEPS: 0.72 };
    const resolvedDeltas = [
      { modifierTable: "grips", modifierId: "NEUTRAL", motionId: "PRESS", deltas: { CHEST_MID: 0.5 }, inherited: false },
    ];
    const result = computeActivation(muscleTargets, resolvedDeltas, {}, {
      deltaOverrides: [{ table_key: "grips", row_id: "NEUTRAL", deltas: { CHEST_MID: -0.2 } }],
    });
    expect(result.finalScores.CHEST_MID).toBe(0.7);
  });
});
