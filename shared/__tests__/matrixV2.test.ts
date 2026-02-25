import {
  validateStructural,
  validateReferential,
  validateSemantic,
  runStructuralValidation,
  runFullValidation,
  type ReferentialContext,
} from "../validators/matrixV2Validator";
import {
  canonicalizeRuleForHash,
  generateRuleId,
} from "../utils/deterministicHash";
import type {
  MatrixConfigRow,
  MatrixConfigJson,
  LocalRule,
  GlobalRule,
  TableConfig,
} from "../types/matrixV2";
import {
  PRESS_GROUP_CONFIG,
  PRESS_INCLINE_OVERRIDE,
  PRESS_DECLINE_OVERRIDE,
  HORIZONTAL_ROW_GROUP_CONFIG,
  ROW_HIGH_OVERRIDE,
} from "../fixtures/pilotConfigs";

// ─── Test Helpers ────────────────────────────────────────────────────

function makeConfigRow(overrides: Partial<MatrixConfigRow> = {}): MatrixConfigRow {
  return {
    id: "test-config-1",
    scope_type: "motion_group",
    scope_id: "PRESS",
    status: "draft",
    schema_version: "1.0",
    config_version: 1,
    config_json: PRESS_GROUP_CONFIG,
    notes: null,
    validation_status: null,
    validation_summary: null,
    is_deleted: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    published_at: null,
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}

const BASE_CONTEXT: ReferentialContext = {
  validMotionIds: new Set([
    "PRESS",
    "PRESS_FLAT",
    "PRESS_INCLINE",
    "PRESS_DECLINE",
    "PRESS_VERTICAL",
    "PRESS_HIGH_INCLINE",
    "PRESS_OVERHEAD",
    "DIP",
    "DIP_CHEST",
    "DIP_TRICEPS",
    "HORIZONTAL_ROW",
    "ROW_HIGH",
    "ROW_MID",
    "ROW_LOW",
    "FACE_PULL",
    "REVERSE_FLY",
  ]),
  validGroupIds: new Set([
    "PRESS",
    "PRESS_VERTICAL",
    "DIP",
    "HORIZONTAL_ROW",
    "REVERSE_FLY",
  ]),
  modifierTableRows: {
    motionPaths: new Set(["MID_MID", "HIGH_HIGH", "LOW_LOW"]),
    torsoAngles: new Set([
      "DEG_NEG_60",
      "DEG_NEG_45",
      "DEG_NEG_30",
      "DEG_NEG_15",
      "DEG_0",
      "DEG_15",
      "DEG_30",
      "DEG_45",
      "DEG_60",
      "DEG_75",
      "DEG_90",
    ]),
    torsoOrientations: new Set(["FACING_FORWARD", "FACING_AWAY"]),
    resistanceOrigin: new Set(["ABOVE", "BELOW", "FRONT", "BEHIND"]),
    grips: new Set([
      "NEUTRAL",
      "PRONATED",
      "SUPINATED",
      "SEMI_PRONATED",
      "SEMI_SUPINATED",
      "ROTATING",
    ]),
    gripWidths: new Set(["NARROW", "STANDARD", "WIDE"]),
    elbowRelationship: new Set(["FLARED", "TUCKED", "NEUTRAL"]),
    executionStyles: new Set(["STANDARD", "PAUSE", "TEMPO"]),
    footPositions: new Set(["FLAT", "ELEVATED", "NEUTRAL"]),
    stanceWidths: new Set(["NARROW", "STANDARD", "WIDE"]),
    stanceTypes: new Set(["STANDING", "SEATED", "KNEELING"]),
    loadPlacement: new Set(["FRONT", "BACK", "OVERHEAD"]),
    supportStructures: new Set(["BENCH", "FLOOR", "WALL"]),
    loadingAids: new Set(["BELT", "STRAPS", "WRAPS"]),
    rangeOfMotion: new Set(["FULL", "PARTIAL", "ISOMETRIC"]),
  },
};

// ═══════════════════════════════════════════════════════════════════
//  Layer 1: Structural Validation
// ═══════════════════════════════════════════════════════════════════

describe("Structural Validation (Layer 1)", () => {
  test("valid config passes structural validation", () => {
    const msgs = validateStructural(PRESS_GROUP_CONFIG);
    const errors = msgs.filter((m) => m.severity === "error");
    expect(errors).toHaveLength(0);
  });

  test("missing required top-level keys fails", () => {
    const msgs = validateStructural({ meta: {} });
    expect(msgs.some((m) => m.severity === "error")).toBe(true);
  });

  test("unknown top-level keys fail", () => {
    const msgs = validateStructural({
      meta: {},
      tables: {},
      rules: [],
      extensions: {},
      unknownKey: "bad",
    });
    expect(msgs.some((m) => m.severity === "error")).toBe(true);
  });

  test("unknown modifier table key flagged as error", () => {
    const config: MatrixConfigJson = {
      meta: {},
      tables: {
        fakeTable: {
          applicability: true,
          allowed_row_ids: [],
          default_row_id: null,
          null_noop_allowed: false,
        },
      } as any,
      rules: [],
      extensions: {},
    };
    const msgs = validateStructural(config);
    expect(msgs.some((m) => m.code === "UNKNOWN_TABLE_KEY")).toBe(true);
  });

  test("global rule missing rule_id flagged", () => {
    const config: MatrixConfigJson = {
      meta: {},
      tables: {},
      rules: [
        {
          rule_id: "",
          type: "partition",
          tables: ["torsoAngles"],
          conditions: [],
        },
      ],
      extensions: {},
    };
    const msgs = validateStructural(config);
    expect(msgs.some((m) => m.code === "STRUCTURAL_INVALID" || m.code === "MISSING_RULE_ID")).toBe(true);
  });

  test("pilot pressing config passes structural validation", () => {
    const result = runStructuralValidation(PRESS_GROUP_CONFIG);
    expect(result.errors).toHaveLength(0);
  });

  test("pilot horizontal row config passes structural validation", () => {
    const result = runStructuralValidation(HORIZONTAL_ROW_GROUP_CONFIG);
    expect(result.errors).toHaveLength(0);
  });

  test("pilot incline override passes structural validation", () => {
    const result = runStructuralValidation(PRESS_INCLINE_OVERRIDE);
    expect(result.errors).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Layer 2: Referential Validation
// ═══════════════════════════════════════════════════════════════════

describe("Referential Validation (Layer 2)", () => {
  test("valid config with valid scope passes", () => {
    const config = makeConfigRow();
    const msgs = validateReferential(config, BASE_CONTEXT);
    const errors = msgs.filter((m) => m.severity === "error");
    expect(errors).toHaveLength(0);
  });

  test("invalid scope_id for motion type errors", () => {
    const config = makeConfigRow({
      scope_type: "motion",
      scope_id: "NONEXISTENT_MOTION",
    });
    const msgs = validateReferential(config, BASE_CONTEXT);
    expect(msgs.some((m) => m.code === "INVALID_SCOPE_ID")).toBe(true);
  });

  test("invalid row ID in allowed_row_ids errors", () => {
    const badConfig: MatrixConfigJson = {
      meta: {},
      tables: {
        torsoAngles: {
          applicability: true,
          allowed_row_ids: ["DEG_0", "FAKE_ANGLE"],
          default_row_id: "DEG_0",
          null_noop_allowed: false,
        },
      },
      rules: [],
      extensions: {},
    };
    const config = makeConfigRow({ config_json: badConfig });
    const msgs = validateReferential(config, BASE_CONTEXT);
    expect(msgs.some((m) => m.code === "INVALID_ROW_ID")).toBe(true);
  });

  test("invalid default row ID errors", () => {
    const badConfig: MatrixConfigJson = {
      meta: {},
      tables: {
        grips: {
          applicability: true,
          allowed_row_ids: ["PRONATED"],
          default_row_id: "FAKE_GRIP",
          null_noop_allowed: false,
        },
      },
      rules: [],
      extensions: {},
    };
    const config = makeConfigRow({ config_json: badConfig });
    const msgs = validateReferential(config, BASE_CONTEXT);
    expect(msgs.some((m) => m.code === "INVALID_DEFAULT_ROW")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Layer 3: Semantic / Coherence Validation
// ═══════════════════════════════════════════════════════════════════

describe("Semantic Validation (Layer 3)", () => {
  test("default not in allowed rows produces error", () => {
    const badConfig: MatrixConfigJson = {
      meta: {},
      tables: {
        torsoAngles: {
          applicability: true,
          allowed_row_ids: ["DEG_0", "DEG_15"],
          default_row_id: "DEG_45",
          null_noop_allowed: false,
        },
      },
      rules: [],
      extensions: {},
    };
    const config = makeConfigRow({ config_json: badConfig });
    const msgs = validateSemantic(config);
    expect(msgs.some((m) => m.code === "DEFAULT_NOT_IN_ALLOWED")).toBe(true);
  });

  test("inapplicable table with populated data produces warnings", () => {
    const badConfig: MatrixConfigJson = {
      meta: {},
      tables: {
        torsoAngles: {
          applicability: false,
          allowed_row_ids: ["DEG_0"],
          default_row_id: "DEG_0",
          null_noop_allowed: false,
        },
      },
      rules: [],
      extensions: {},
    };
    const config = makeConfigRow({ config_json: badConfig });
    const msgs = validateSemantic(config);
    expect(msgs.some((m) => m.code === "INAPPLICABLE_WITH_ROWS")).toBe(true);
    expect(msgs.some((m) => m.code === "INAPPLICABLE_WITH_DEFAULT")).toBe(true);
  });

  test("applicable table with empty rows produces warning", () => {
    const config = makeConfigRow({
      config_json: {
        meta: {},
        tables: {
          torsoAngles: {
            applicability: true,
            allowed_row_ids: [],
            default_row_id: null,
            null_noop_allowed: false,
          },
        },
        rules: [],
        extensions: {},
      },
    });
    const msgs = validateSemantic(config);
    expect(msgs.some((m) => m.code === "APPLICABLE_EMPTY_ROWS")).toBe(true);
  });

  test("duplicate row IDs produce error", () => {
    const config = makeConfigRow({
      config_json: {
        meta: {},
        tables: {
          grips: {
            applicability: true,
            allowed_row_ids: ["PRONATED", "PRONATED", "NEUTRAL"],
            default_row_id: "PRONATED",
            null_noop_allowed: false,
          },
        },
        rules: [],
        extensions: {},
      },
    });
    const msgs = validateSemantic(config);
    expect(msgs.some((m) => m.code === "DUPLICATE_ROW_IDS")).toBe(true);
  });

  test("valid pilot config produces no semantic errors", () => {
    const config = makeConfigRow();
    const msgs = validateSemantic(config);
    const errors = msgs.filter((m) => m.severity === "error");
    expect(errors).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Full Validation Pipeline
// ═══════════════════════════════════════════════════════════════════

describe("Full Validation Pipeline", () => {
  test("valid config passes full validation and can activate", () => {
    const config = makeConfigRow();
    const result = runFullValidation(config, BASE_CONTEXT);
    expect(result.can_activate).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("config with structural errors short-circuits", () => {
    const config = makeConfigRow({
      config_json: { meta: {} } as any,
    });
    const result = runFullValidation(config, BASE_CONTEXT);
    expect(result.can_activate).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Deterministic Hash Utility
// ═══════════════════════════════════════════════════════════════════

describe("Deterministic Hash", () => {
  const sampleRule: LocalRule = {
    rule_id: "old-id",
    action: "hide_table",
    condition: { table: "stanceTypes", operator: "equals", value: "SEATED" },
    description: "Hide foot positions when seated",
  };

  test("same rule always produces same hash", () => {
    const id1 = generateRuleId(sampleRule);
    const id2 = generateRuleId(sampleRule);
    expect(id1).toBe(id2);
    expect(id1).toHaveLength(16);
  });

  test("key order does not affect hash", () => {
    const ruleA: LocalRule = {
      rule_id: "x",
      action: "hide_table",
      condition: { table: "stanceTypes", operator: "equals", value: "SEATED" },
      description: "Test",
    };
    const ruleB: LocalRule = {
      description: "Test",
      condition: { value: "SEATED", operator: "equals", table: "stanceTypes" },
      action: "hide_table",
      rule_id: "y",
    };
    expect(generateRuleId(ruleA)).toBe(generateRuleId(ruleB));
  });

  test("rule_id field is excluded from hash", () => {
    const ruleA = { ...sampleRule, rule_id: "aaa" };
    const ruleB = { ...sampleRule, rule_id: "bbb" };
    expect(generateRuleId(ruleA)).toBe(generateRuleId(ruleB));
  });

  test("transient underscore fields are excluded from hash", () => {
    const ruleA = { ...sampleRule };
    const ruleB = { ...sampleRule, _ui_collapsed: true, _last_edited: "2026-01-01" } as any;
    expect(generateRuleId(ruleA)).toBe(generateRuleId(ruleB));
  });

  test("different semantic content produces different hash", () => {
    const ruleA: LocalRule = {
      rule_id: "x",
      action: "hide_table",
      condition: { table: "stanceTypes", operator: "equals", value: "SEATED" },
    };
    const ruleB: LocalRule = {
      rule_id: "x",
      action: "disable_table",
      condition: { table: "stanceTypes", operator: "equals", value: "SEATED" },
    };
    expect(generateRuleId(ruleA)).not.toBe(generateRuleId(ruleB));
  });

  test("canonicalize produces stable JSON string", () => {
    const canonical = canonicalizeRuleForHash(sampleRule);
    expect(typeof canonical).toBe("string");
    const parsed = JSON.parse(canonical);
    expect(parsed).not.toHaveProperty("rule_id");
    expect(parsed).toHaveProperty("action");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Draft/Active Lifecycle
// ═══════════════════════════════════════════════════════════════════

describe("Lifecycle Semantics", () => {
  test("draft config can be saved with errors", () => {
    const config = makeConfigRow({
      status: "draft",
      config_json: {
        meta: {},
        tables: {
          torsoAngles: {
            applicability: true,
            allowed_row_ids: ["DEG_0"],
            default_row_id: "DEG_45",
            null_noop_allowed: false,
          },
        },
        rules: [],
        extensions: {},
      },
    });
    const result = runFullValidation(config, BASE_CONTEXT);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.can_activate).toBe(false);
    // Draft save should still be allowed (validation does not prevent save)
  });

  test("clean config can be activated", () => {
    const config = makeConfigRow();
    const result = runFullValidation(config, BASE_CONTEXT);
    expect(result.can_activate).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Golden Fixture Tests (Pilot Configs)
// ═══════════════════════════════════════════════════════════════════

describe("Pilot Config Golden Tests", () => {
  test("PRESS group config is structurally valid", () => {
    const result = runStructuralValidation(PRESS_GROUP_CONFIG);
    expect(result.errors).toHaveLength(0);
  });

  test("PRESS group config passes full validation", () => {
    const config = makeConfigRow({ config_json: PRESS_GROUP_CONFIG });
    const result = runFullValidation(config, BASE_CONTEXT);
    expect(result.errors).toHaveLength(0);
    expect(result.can_activate).toBe(true);
  });

  test("PRESS_INCLINE override is structurally valid", () => {
    const result = runStructuralValidation(PRESS_INCLINE_OVERRIDE);
    expect(result.errors).toHaveLength(0);
  });

  test("PRESS_DECLINE override is structurally valid", () => {
    const result = runStructuralValidation(PRESS_DECLINE_OVERRIDE);
    expect(result.errors).toHaveLength(0);
  });

  test("HORIZONTAL_ROW group config passes full validation", () => {
    const config = makeConfigRow({
      scope_id: "HORIZONTAL_ROW",
      config_json: HORIZONTAL_ROW_GROUP_CONFIG,
    });
    const result = runFullValidation(config, BASE_CONTEXT);
    expect(result.errors).toHaveLength(0);
    expect(result.can_activate).toBe(true);
  });

  test("ROW_HIGH override is structurally valid", () => {
    const result = runStructuralValidation(ROW_HIGH_OVERRIDE);
    expect(result.errors).toHaveLength(0);
  });
});
