import {
  resolveSingleDelta,
  resolveAllDeltas,
} from "../scoring/resolveDeltas";
import {
  flattenMuscleTargets,
  sumDeltas,
  applyDeltas,
  computeActivation,
} from "../scoring/computeActivation";
import type {
  Motion,
  ModifierRow,
  MuscleTargets,
  ResolvedDelta,
  ScorePolicy,
} from "../types";

// ─── Fixture Data (from real JSON tables) ────────────────────────────

const MOTIONS: Record<string, Motion> = {
  PRESS: {
    id: "PRESS",
    label: "Press",
    parent_id: null,
    upper_lower: ["UPPER"],
    muscle_targets: {
      CHEST: { _score: 0.9, CHEST_MID: { _score: 0.9 } },
      ARMS: { _score: 0.72, TRICEPS: { _score: 0.72 } },
      SHOULDERS: { _score: 0.48, DELTS_FRONT: { _score: 0.48 } },
      CORE: { _score: 0.15, CORE_DEEP: { _score: 0.15 } },
    },
    default_delta_configs: {},
  },
  PRESS_FLAT: {
    id: "PRESS_FLAT",
    label: "Flat Press",
    parent_id: "PRESS",
    upper_lower: ["UPPER"],
    muscle_targets: {
      CHEST: { _score: 0.92, CHEST_MID: { _score: 0.92 } },
      ARMS: { _score: 0.72, TRICEPS: { _score: 0.72 } },
      SHOULDERS: { _score: 0.45, DELTS_FRONT: { _score: 0.45 } },
      CORE: { _score: 0.15, CORE_DEEP: { _score: 0.15 } },
    },
    default_delta_configs: {},
  },
  PRESS_INCLINE: {
    id: "PRESS_INCLINE",
    label: "Incline Press",
    parent_id: "PRESS",
    upper_lower: ["UPPER"],
    muscle_targets: {
      CHEST: { _score: 0.92, CHEST_UPPER: { _score: 0.92 } },
      SHOULDERS: { _score: 0.65, DELTS_FRONT: { _score: 0.65 } },
      ARMS: { _score: 0.65, TRICEPS: { _score: 0.65 } },
      CORE: { _score: 0.15, CORE_DEEP: { _score: 0.15 } },
    },
    default_delta_configs: {},
  },
  CURL: {
    id: "CURL",
    label: "Curl",
    parent_id: null,
    upper_lower: ["UPPER"],
    muscle_targets: {
      ARMS: {
        _score: 2.87,
        BICEPS: {
          _score: 2.42,
          BICEP_INNER: { _score: 0.82 },
          BICEP_OUTER: { _score: 0.78 },
          BRACHIALIS: { _score: 0.82 },
        },
        FOREARMS: { _score: 0.45, FOREARM_BOTTOM: { _score: 0.45 } },
      },
    },
    default_delta_configs: { motionPaths: "LOW_HIGH" },
  },
  SQUAT: {
    id: "SQUAT",
    label: "Squat",
    parent_id: null,
    upper_lower: ["LOWER"],
    muscle_targets: {
      LEGS: {
        _score: 2.25,
        QUADS: { _score: 0.88 },
        GLUTES: { _score: 0.72 },
        HAMSTRINGS: { _score: 0.35 },
        THIGHS_INNER: { _score: 0.3 },
      },
      CORE: { _score: 0.45, CORE_DEEP: { _score: 0.45 } },
      BACK: { _score: 0.25, BACK_LOWER: { _score: 0.25 } },
    },
    default_delta_configs: {},
  },
  DIP: {
    id: "DIP",
    label: "Dip",
    parent_id: null,
    upper_lower: ["UPPER"],
    muscle_targets: {
      CHEST: {
        _score: 1.15,
        CHEST_MID: { _score: 0.6 },
        CHEST_LOWER: { _score: 0.55 },
      },
      ARMS: { _score: 0.92, TRICEPS: { _score: 0.92 } },
      SHOULDERS: { _score: 0.55, DELTS_FRONT: { _score: 0.55 } },
      CORE: { _score: 0.35, CORE_DEEP: { _score: 0.35 } },
    },
    default_delta_configs: {},
  },
  FLY_INCLINE: {
    id: "FLY_INCLINE",
    label: "Incline Fly",
    parent_id: "FLY",
    upper_lower: ["UPPER"],
    muscle_targets: {
      CHEST: { _score: 0.92, CHEST_UPPER: { _score: 0.92 } },
      SHOULDERS: { _score: 0.38, DELTS_FRONT: { _score: 0.38 } },
    },
    default_delta_configs: { motionPaths: "LOW_HIGH" },
  },
  FLY: {
    id: "FLY",
    label: "Fly",
    parent_id: null,
    upper_lower: ["UPPER"],
    muscle_targets: {
      CHEST: { _score: 0.75, CHEST_MID: { _score: 0.75 } },
      SHOULDERS: { _score: 0.35, DELTS_FRONT: { _score: 0.35 } },
      CORE: { _score: 0.1, CORE_DEEP: { _score: 0.1 } },
    },
    default_delta_configs: {},
  },
};

const GRIPS: Record<string, ModifierRow> = {
  PRONATED: {
    id: "PRONATED",
    label: "Pronated",
    delta_rules: {
      CURL: { FOREARM_TOP: 0.4, BRACHIALIS: 0.3, BICEP_INNER: -0.5 },
      PULL_FRONT: {},
      ROW_MID: {},
      PRESS_FLAT: {},
    },
  },
  SUPINATED: {
    id: "SUPINATED",
    label: "Supinated",
    delta_rules: {
      CURL: {},
      PRESS_FLAT: {
        CHEST_UPPER: 0.3,
        TRICEP_INNER: 0.2,
        CHEST_MID: -0.2,
      },
    },
  },
  NEUTRAL: {
    id: "NEUTRAL",
    label: "Neutral",
    delta_rules: {
      CURL: { BRACHIALIS: 0.4, FOREARM_OUTER: 0.3, BICEP_INNER: -0.3 },
      PRESS_FLAT: { TRICEP_OUTER: 0.1 },
    },
  },
};

const GRIP_WIDTHS: Record<string, ModifierRow> = {
  EXTRA_NARROW: {
    id: "EXTRA_NARROW",
    label: "Extra Narrow",
    delta_rules: {
      PRESS_FLAT: {
        CHEST_MID: -0.2,
        TRICEP_OUTER: 0.2,
        TRICEP_DEEP: 0.1,
        DELTS_FRONT: 0.1,
      },
      PRESS_INCLINE: {
        CHEST_UPPER: -0.2,
        TRICEP_OUTER: 0.2,
        TRICEP_DEEP: 0.1,
        DELTS_FRONT: 0.1,
      },
      CURL: { BICEP_OUTER: 0.2, BICEP_INNER: -0.2 },
    },
  },
  SHOULDER: {
    id: "SHOULDER",
    label: "Shoulder-Width",
    delta_rules: {},
  },
  WIDE: {
    id: "WIDE",
    label: "Wide",
    delta_rules: {
      PRESS_FLAT: {
        CHEST_MID: 0.1,
        TRICEP_OUTER: -0.1,
        TRICEP_DEEP: -0.1,
      },
      CURL: { BICEP_INNER: 0.15, BICEP_OUTER: -0.15 },
    },
  },
};

const MOTION_PATHS: Record<string, ModifierRow> = {
  MID_MID: {
    id: "MID_MID",
    label: "Mid to Mid (Level)",
    delta_rules: {},
  },
  LOW_HIGH: {
    id: "LOW_HIGH",
    label: "Low to High",
    delta_rules: {
      PRESS_INCLINE: "inherit",
      FLY_INCLINE: "inherit",
      CURL: "inherit",
      ROTATION: { OBLIQUES_UPPER: 0.3, OBLIQUES_LOWER: -0.3 },
      CRUSH: { CHEST_UPPER: 0.4, CHEST_MID: -0.2 },
    },
  },
  HIGH_LOW: {
    id: "HIGH_LOW",
    label: "High to Low",
    delta_rules: {
      PRESS_DECLINE: "inherit",
      FLY_DECLINE: "inherit",
      CRUSH: { CHEST_LOWER: 0.4, CHEST_MID: -0.2 },
    },
  },
};

const MODIFIER_TABLES: Record<string, Record<string, ModifierRow>> = {
  grips: GRIPS,
  gripWidths: GRIP_WIDTHS,
  motionPaths: MOTION_PATHS,
};

// ─── Tests ───────────────────────────────────────────────────────────

describe("flattenMuscleTargets", () => {
  it("flattens CURL muscle targets to flat map", () => {
    const flat = flattenMuscleTargets(MOTIONS.CURL.muscle_targets);
    expect(flat.ARMS).toBe(2.87);
    expect(flat.BICEPS).toBe(2.42);
    expect(flat.BICEP_INNER).toBe(0.82);
    expect(flat.BICEP_OUTER).toBe(0.78);
    expect(flat.BRACHIALIS).toBe(0.82);
    expect(flat.FOREARMS).toBe(0.45);
    expect(flat.FOREARM_BOTTOM).toBe(0.45);
  });

  it("flattens PRESS_FLAT targets", () => {
    const flat = flattenMuscleTargets(MOTIONS.PRESS_FLAT.muscle_targets);
    expect(flat.CHEST).toBe(0.92);
    expect(flat.CHEST_MID).toBe(0.92);
    expect(flat.TRICEPS).toBe(0.72);
    expect(flat.DELTS_FRONT).toBe(0.45);
    expect(flat.CORE_DEEP).toBe(0.15);
  });

  it("flattens SQUAT targets with multi-child groups", () => {
    const flat = flattenMuscleTargets(MOTIONS.SQUAT.muscle_targets);
    expect(flat.LEGS).toBe(2.25);
    expect(flat.QUADS).toBe(0.88);
    expect(flat.GLUTES).toBe(0.72);
    expect(flat.HAMSTRINGS).toBe(0.35);
    expect(flat.THIGHS_INNER).toBe(0.3);
    expect(flat.CORE_DEEP).toBe(0.45);
    expect(flat.BACK_LOWER).toBe(0.25);
  });
});

describe("resolveSingleDelta", () => {
  it("returns direct deltas for PRONATED grip on CURL", () => {
    const result = resolveSingleDelta(
      "CURL",
      GRIPS.PRONATED,
      MOTIONS,
      GRIPS,
      "grips"
    );
    expect(result).not.toBeNull();
    expect(result!.deltas).toEqual({
      FOREARM_TOP: 0.4,
      BRACHIALIS: 0.3,
      BICEP_INNER: -0.5,
    });
    expect(result!.inherited).toBe(false);
  });

  it("returns empty deltas for home-base {} entry", () => {
    const result = resolveSingleDelta(
      "CURL",
      GRIPS.SUPINATED,
      MOTIONS,
      GRIPS,
      "grips"
    );
    expect(result).not.toBeNull();
    expect(result!.deltas).toEqual({});
    expect(result!.inherited).toBe(false);
  });

  it("returns null when motion is not in delta_rules and has no parent", () => {
    const result = resolveSingleDelta(
      "DIP",
      GRIPS.PRONATED,
      MOTIONS,
      GRIPS,
      "grips"
    );
    expect(result).toBeNull();
  });

  it("inherits from parent motion for PRESS_FLAT → PRESS", () => {
    const result = resolveSingleDelta(
      "PRESS_FLAT",
      GRIPS.PRONATED,
      MOTIONS,
      GRIPS,
      "grips"
    );
    // PRESS_FLAT not in PRONATED, so walks to parent PRESS → also not there → null
    // Actually PRONATED has PRESS_FLAT: {} → home base
    expect(result).not.toBeNull();
    expect(result!.deltas).toEqual({});
  });

  it("resolves 'inherit' keyword in motionPaths", () => {
    // LOW_HIGH has "PRESS_INCLINE": "inherit"
    // PRESS_INCLINE's parent is PRESS, but LOW_HIGH doesn't have PRESS either
    // So it should return null (no delta found up the chain)
    const result = resolveSingleDelta(
      "PRESS_INCLINE",
      MOTION_PATHS.LOW_HIGH,
      MOTIONS,
      MOTION_PATHS,
      "motionPaths"
    );
    // inherit → parent PRESS → not in LOW_HIGH → null
    expect(result).toBeNull();
  });

  it("returns direct delta for motion that has a real entry after inherit lookup", () => {
    const result = resolveSingleDelta(
      "ROTATION",
      MOTION_PATHS.LOW_HIGH,
      MOTIONS,
      MOTION_PATHS,
      "motionPaths"
    );
    // ROTATION has direct deltas in LOW_HIGH
    expect(result).not.toBeNull();
    expect(result!.deltas).toEqual({
      OBLIQUES_UPPER: 0.3,
      OBLIQUES_LOWER: -0.3,
    });
  });

  it("inherits via parent_id chain for child motions", () => {
    // PRESS_FLAT isn't in NEUTRAL's delta_rules, but PRESS_FLAT's parent PRESS isn't either
    // But PRESS_FLAT IS in NEUTRAL: { TRICEP_OUTER: 0.1 }
    const result = resolveSingleDelta(
      "PRESS_FLAT",
      GRIPS.NEUTRAL,
      MOTIONS,
      GRIPS,
      "grips"
    );
    expect(result).not.toBeNull();
    expect(result!.deltas).toEqual({ TRICEP_OUTER: 0.1 });
    expect(result!.inherited).toBe(false);
  });
});

describe("resolveAllDeltas", () => {
  it("resolves multiple modifiers for flat bench press", () => {
    const results = resolveAllDeltas(
      "PRESS_FLAT",
      [
        { tableKey: "grips", rowId: "NEUTRAL" },
        { tableKey: "gripWidths", rowId: "WIDE" },
      ],
      MOTIONS,
      MODIFIER_TABLES
    );

    expect(results.length).toBe(2);

    const gripDelta = results.find((r) => r.modifierTable === "grips");
    expect(gripDelta?.deltas).toEqual({ TRICEP_OUTER: 0.1 });

    const widthDelta = results.find(
      (r) => r.modifierTable === "gripWidths"
    );
    expect(widthDelta?.deltas).toEqual({
      CHEST_MID: 0.1,
      TRICEP_OUTER: -0.1,
      TRICEP_DEEP: -0.1,
    });
  });

  it("skips modifiers with no applicable delta", () => {
    const results = resolveAllDeltas(
      "DIP",
      [
        { tableKey: "grips", rowId: "PRONATED" },
        { tableKey: "gripWidths", rowId: "SHOULDER" },
      ],
      MOTIONS,
      MODIFIER_TABLES
    );
    expect(results.length).toBe(0);
  });

  it("handles shoulder-width (empty delta_rules) gracefully", () => {
    const results = resolveAllDeltas(
      "PRESS_FLAT",
      [{ tableKey: "gripWidths", rowId: "SHOULDER" }],
      MOTIONS,
      MODIFIER_TABLES
    );
    expect(results.length).toBe(0);
  });
});

describe("sumDeltas", () => {
  it("sums deltas from multiple modifiers", () => {
    const deltas: ResolvedDelta[] = [
      {
        modifierTable: "grips",
        modifierId: "NEUTRAL",
        motionId: "PRESS_FLAT",
        deltas: { TRICEP_OUTER: 0.1 },
        inherited: false,
      },
      {
        modifierTable: "gripWidths",
        modifierId: "WIDE",
        motionId: "PRESS_FLAT",
        deltas: { CHEST_MID: 0.1, TRICEP_OUTER: -0.1, TRICEP_DEEP: -0.1 },
        inherited: false,
      },
    ];

    const summed = sumDeltas(deltas);
    expect(summed.TRICEP_OUTER).toBeCloseTo(0.0);
    expect(summed.CHEST_MID).toBe(0.1);
    expect(summed.TRICEP_DEEP).toBe(-0.1);
  });
});

describe("applyDeltas", () => {
  it("applies deltas to base scores and clamps", () => {
    const base = { CHEST_MID: 0.92, TRICEPS: 0.72, DELTS_FRONT: 0.45 };
    const deltas = { CHEST_MID: 0.1, TRICEPS: -0.5 };
    const policy: ScorePolicy = {
      clampMin: 0,
      clampMax: 5,
      normalizeOutput: false,
      missingKeyBehavior: "skip",
      outputMode: "raw",
    };

    const result = applyDeltas(base, deltas, policy);
    expect(result.CHEST_MID).toBeCloseTo(1.02);
    expect(result.TRICEPS).toBeCloseTo(0.22);
    expect(result.DELTS_FRONT).toBe(0.45);
  });

  it("clamps negative results to 0", () => {
    const base = { BICEP_INNER: 0.1 };
    const deltas = { BICEP_INNER: -0.5 };

    const result = applyDeltas(base, deltas);
    expect(result.BICEP_INNER).toBe(0);
  });

  it("clamps scores above max", () => {
    const base = { BICEPS: 4.5 };
    const deltas = { BICEPS: 1.0 };

    const result = applyDeltas(base, deltas);
    expect(result.BICEPS).toBe(5);
  });
});

describe("computeActivation - Golden Lifts", () => {
  it("Lift 1: Flat Bench Press - neutral grip, wide width", () => {
    const deltas = resolveAllDeltas(
      "PRESS_FLAT",
      [
        { tableKey: "grips", rowId: "NEUTRAL" },
        { tableKey: "gripWidths", rowId: "WIDE" },
      ],
      MOTIONS,
      MODIFIER_TABLES
    );

    const result = computeActivation(
      MOTIONS.PRESS_FLAT.muscle_targets,
      deltas
    );

    expect(result.baseScores.CHEST_MID).toBe(0.92);
    expect(result.finalScores.CHEST_MID).toBeCloseTo(1.02);
    expect(result.finalScores.DELTS_FRONT).toBe(0.45);
  });

  it("Lift 2: Close-Grip Bench Press (extra narrow)", () => {
    const deltas = resolveAllDeltas(
      "PRESS_FLAT",
      [
        { tableKey: "grips", rowId: "PRONATED" },
        { tableKey: "gripWidths", rowId: "EXTRA_NARROW" },
      ],
      MOTIONS,
      MODIFIER_TABLES
    );

    const result = computeActivation(
      MOTIONS.PRESS_FLAT.muscle_targets,
      deltas
    );

    // Close grip: more tricep, less chest
    expect(result.baseScores.CHEST_MID).toBe(0.92);
    // EXTRA_NARROW deltas: CHEST_MID: -0.2, TRICEP_OUTER: 0.2, TRICEP_DEEP: 0.1, DELTS_FRONT: 0.1
    expect(result.finalScores.CHEST_MID).toBeCloseTo(0.72);
    expect(result.finalScores.DELTS_FRONT).toBeCloseTo(0.55);
  });

  it("Lift 3: Hammer Curl (neutral grip)", () => {
    const deltas = resolveAllDeltas(
      "CURL",
      [{ tableKey: "grips", rowId: "NEUTRAL" }],
      MOTIONS,
      MODIFIER_TABLES
    );

    const result = computeActivation(
      MOTIONS.CURL.muscle_targets,
      deltas
    );

    // Neutral grip on curl: +0.4 brachialis, +0.3 forearm_outer, -0.3 bicep_inner
    expect(result.baseScores.BRACHIALIS).toBe(0.82);
    expect(result.finalScores.BRACHIALIS).toBeCloseTo(1.22);
    expect(result.finalScores.BICEP_INNER).toBeCloseTo(0.52);
  });

  it("Lift 4: Reverse Curl (pronated grip)", () => {
    const deltas = resolveAllDeltas(
      "CURL",
      [{ tableKey: "grips", rowId: "PRONATED" }],
      MOTIONS,
      MODIFIER_TABLES
    );

    const result = computeActivation(
      MOTIONS.CURL.muscle_targets,
      deltas
    );

    // Pronated: +0.4 forearm_top (new muscle), +0.3 brachialis, -0.5 bicep_inner
    expect(result.finalScores.BRACHIALIS).toBeCloseTo(1.12);
    expect(result.finalScores.BICEP_INNER).toBeCloseTo(0.32);
    // FOREARM_TOP not in base, should be skipped by default policy
    expect(result.finalScores.FOREARM_TOP).toBeUndefined();
  });

  it("Lift 5: Reverse Curl with zero policy includes new muscles", () => {
    const deltas = resolveAllDeltas(
      "CURL",
      [{ tableKey: "grips", rowId: "PRONATED" }],
      MOTIONS,
      MODIFIER_TABLES
    );

    const result = computeActivation(
      MOTIONS.CURL.muscle_targets,
      deltas,
      { missingKeyBehavior: "zero" }
    );

    expect(result.finalScores.FOREARM_TOP).toBeCloseTo(0.4);
  });

  it("Lift 6: Squat (no applicable upper body modifiers)", () => {
    const deltas = resolveAllDeltas(
      "SQUAT",
      [
        { tableKey: "grips", rowId: "NEUTRAL" },
        { tableKey: "gripWidths", rowId: "WIDE" },
      ],
      MOTIONS,
      MODIFIER_TABLES
    );

    // No grip/width deltas target SQUAT → empty
    expect(deltas.length).toBe(0);

    const result = computeActivation(
      MOTIONS.SQUAT.muscle_targets,
      deltas
    );

    // All scores unchanged
    expect(result.finalScores.QUADS).toBe(0.88);
    expect(result.finalScores.GLUTES).toBe(0.72);
    expect(result.finalScores).toEqual(result.baseScores);
  });

  it("Lift 7: DIP - no grip deltas defined", () => {
    const deltas = resolveAllDeltas(
      "DIP",
      [{ tableKey: "grips", rowId: "NEUTRAL" }],
      MOTIONS,
      MODIFIER_TABLES
    );

    const result = computeActivation(
      MOTIONS.DIP.muscle_targets,
      deltas
    );

    expect(result.finalScores.CHEST_MID).toBe(0.6);
    expect(result.finalScores.CHEST_LOWER).toBe(0.55);
    expect(result.finalScores.TRICEPS).toBe(0.92);
  });

  it("Lift 8: Normalized output for incline press", () => {
    const deltas = resolveAllDeltas(
      "PRESS_INCLINE",
      [{ tableKey: "gripWidths", rowId: "EXTRA_NARROW" }],
      MOTIONS,
      MODIFIER_TABLES
    );

    const result = computeActivation(
      MOTIONS.PRESS_INCLINE.muscle_targets,
      deltas,
      { normalizeOutput: true }
    );

    // All values should be 0–1
    for (const score of Object.values(result.finalScores)) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  it("Lift 9: Supinated bench press - grip adds chest upper", () => {
    const deltas = resolveAllDeltas(
      "PRESS_FLAT",
      [{ tableKey: "grips", rowId: "SUPINATED" }],
      MOTIONS,
      MODIFIER_TABLES
    );

    const result = computeActivation(
      MOTIONS.PRESS_FLAT.muscle_targets,
      deltas,
      { missingKeyBehavior: "zero" }
    );

    // SUPINATED on PRESS_FLAT: CHEST_UPPER: 0.3, TRICEP_INNER: 0.2, CHEST_MID: -0.2
    expect(result.finalScores.CHEST_MID).toBeCloseTo(0.72);
    expect(result.finalScores.CHEST_UPPER).toBeCloseTo(0.3);
    expect(result.finalScores.TRICEP_INNER).toBeCloseTo(0.2);
  });

  it("Lift 10: Multiple stacked modifiers", () => {
    const deltas = resolveAllDeltas(
      "PRESS_FLAT",
      [
        { tableKey: "grips", rowId: "SUPINATED" },
        { tableKey: "gripWidths", rowId: "EXTRA_NARROW" },
      ],
      MOTIONS,
      MODIFIER_TABLES
    );

    const result = computeActivation(
      MOTIONS.PRESS_FLAT.muscle_targets,
      deltas,
      { missingKeyBehavior: "zero" }
    );

    // Combined: CHEST_MID: -0.2 + -0.2 = -0.4
    expect(result.finalScores.CHEST_MID).toBeCloseTo(0.52);
    // DELTS_FRONT: 0 + 0.1 = 0.1
    expect(result.finalScores.DELTS_FRONT).toBeCloseTo(0.55);
  });
});
