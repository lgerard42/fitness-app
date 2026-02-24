import { evaluateConstraints } from "../constraints/evaluator";
import {
  upperLowerIsolation,
  equipmentConstraints,
  torsoOrientationGating,
} from "../constraints/deadZones";
import type { Motion, Equipment } from "../types";

const UPPER_MOTION: Motion = {
  id: "CURL",
  label: "Curl",
  parent_id: null,
  upper_lower: ["UPPER"],
  muscle_targets: {},
  default_delta_configs: { motionPaths: "LOW_HIGH" },
};

const LOWER_MOTION: Motion = {
  id: "SQUAT",
  label: "Squat",
  parent_id: null,
  upper_lower: ["LOWER"],
  muscle_targets: {},
  default_delta_configs: {},
};

const COMPOUND_MOTION: Motion = {
  id: "DEADLIFT",
  label: "Deadlift",
  parent_id: null,
  upper_lower: ["UPPER", "LOWER"],
  muscle_targets: {},
  default_delta_configs: {},
};

const BARBELL: Equipment = {
  id: "BARBELL",
  label: "Barbell",
  category_id: "BARS",
  modifier_constraints: {
    GRIPS: ["PRONATED", "SUPINATED", "ALTERNATING", "FLAT"],
    GRIP_WIDTHS: ["EXTRA_NARROW", "NARROW", "SHOULDERS", "WIDE", "EXTRA_WIDE"],
  },
};

const TRX: Equipment = {
  id: "TRX",
  label: "TRX",
  category_id: "SUSPENSION",
  modifier_constraints: {
    GRIPS: [
      "NEUTRAL",
      "PRONATED",
      "SUPINATED",
      "SEMI_PRONATED",
      "SEMI_SUPINATED",
      "ROTATING",
      "OTHER",
    ],
  },
};

const NO_CONSTRAINT_EQUIPMENT: Equipment = {
  id: "DUMBBELL",
  label: "Dumbbell",
  category_id: "FREE_WEIGHTS",
  modifier_constraints: {},
};

describe("upperLowerIsolation", () => {
  it("hides lower body modifiers for upper-only motion", () => {
    const result = upperLowerIsolation(UPPER_MOTION);
    expect(result.footPositions?.tableState).toBe("hidden");
    expect(result.stanceWidths?.tableState).toBe("hidden");
    expect(result.stanceTypes?.tableState).toBe("hidden");
    expect(result.grips).toBeUndefined();
  });

  it("hides upper body modifiers for lower-only motion", () => {
    const result = upperLowerIsolation(LOWER_MOTION);
    expect(result.grips?.tableState).toBe("hidden");
    expect(result.gripWidths?.tableState).toBe("hidden");
    expect(result.elbowRelationship?.tableState).toBe("hidden");
    expect(result.footPositions).toBeUndefined();
  });

  it("hides nothing for compound motions", () => {
    const result = upperLowerIsolation(COMPOUND_MOTION);
    expect(Object.keys(result).length).toBe(0);
  });
});

describe("equipmentConstraints", () => {
  it("restricts grips for barbell", () => {
    const result = equipmentConstraints(BARBELL.modifier_constraints);
    expect(result.grips?.allowedValues).toEqual([
      "PRONATED",
      "SUPINATED",
      "ALTERNATING",
      "FLAT",
    ]);
    expect(result.gripWidths?.allowedValues).toEqual([
      "EXTRA_NARROW",
      "NARROW",
      "SHOULDERS",
      "WIDE",
      "EXTRA_WIDE",
    ]);
  });

  it("restricts grips for TRX", () => {
    const result = equipmentConstraints(TRX.modifier_constraints);
    expect(result.grips?.allowedValues).toContain("NEUTRAL");
    expect(result.grips?.allowedValues).toContain("ROTATING");
    expect(result.grips?.allowedValues).not.toContain("ALTERNATING");
  });

  it("returns empty for equipment without constraints", () => {
    const result = equipmentConstraints(
      NO_CONSTRAINT_EQUIPMENT.modifier_constraints
    );
    expect(Object.keys(result).length).toBe(0);
  });
});

describe("torsoOrientationGating", () => {
  it("hides torso orientations when angle disallows them", () => {
    const result = torsoOrientationGating({
      allow_torso_orientations: false,
    });
    expect(result.torsoOrientations?.tableState).toBe("hidden");
  });

  it("allows torso orientations when angle allows them", () => {
    const result = torsoOrientationGating({
      allow_torso_orientations: true,
    });
    expect(Object.keys(result).length).toBe(0);
  });

  it("handles null input gracefully", () => {
    const result = torsoOrientationGating(null);
    expect(Object.keys(result).length).toBe(0);
  });
});

describe("evaluateConstraints - integrated", () => {
  it("upper motion with barbell: hides lower mods + restricts grips", () => {
    const output = evaluateConstraints({
      motion: UPPER_MOTION,
      equipment: BARBELL,
    });

    // Lower body hidden
    expect(output.modifiers.footPositions.tableState).toBe("hidden");
    expect(output.modifiers.stanceWidths.tableState).toBe("hidden");
    expect(output.modifiers.stanceTypes.tableState).toBe("hidden");

    // Upper body allowed with equipment restrictions
    expect(output.modifiers.grips.tableState).toBe("allowed");
    expect(output.modifiers.grips.allowedValues).toEqual([
      "PRONATED",
      "SUPINATED",
      "ALTERNATING",
      "FLAT",
    ]);

    // Motion default applied
    expect(output.modifiers.motionPaths.tableState).toBe("defaulted");
    expect(output.modifiers.motionPaths.defaultValue).toBe("LOW_HIGH");
  });

  it("lower motion with no equipment: hides upper mods", () => {
    const output = evaluateConstraints({ motion: LOWER_MOTION });

    expect(output.modifiers.grips.tableState).toBe("hidden");
    expect(output.modifiers.gripWidths.tableState).toBe("hidden");
    expect(output.modifiers.elbowRelationship.tableState).toBe("hidden");

    // Lower body modifiers allowed
    expect(output.modifiers.footPositions.tableState).toBe("allowed");
    expect(output.modifiers.stanceWidths.tableState).toBe("allowed");
  });

  it("compound motion shows all modifiers", () => {
    const output = evaluateConstraints({ motion: COMPOUND_MOTION });

    // Everything should be allowed (no dead zones for compound)
    for (const [, constraint] of Object.entries(output.modifiers)) {
      expect(["allowed", "defaulted"]).toContain(constraint.tableState);
    }
  });

  it("all 15 modifier tables are present in output", () => {
    const output = evaluateConstraints({ motion: UPPER_MOTION });
    const keys = Object.keys(output.modifiers);

    expect(keys).toContain("motionPaths");
    expect(keys).toContain("torsoAngles");
    expect(keys).toContain("grips");
    expect(keys).toContain("gripWidths");
    expect(keys).toContain("elbowRelationship");
    expect(keys).toContain("executionStyles");
    expect(keys).toContain("footPositions");
    expect(keys).toContain("stanceWidths");
    expect(keys).toContain("stanceTypes");
    expect(keys).toContain("loadPlacement");
    expect(keys).toContain("supportStructures");
    expect(keys).toContain("loadingAids");
    expect(keys).toContain("rangeOfMotion");
    expect(keys).toContain("torsoOrientations");
    expect(keys).toContain("resistanceOrigin");
    expect(keys.length).toBe(15);
  });
});
