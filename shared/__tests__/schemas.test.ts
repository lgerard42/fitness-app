import {
  validateMotion,
  validateModifierRow,
  validateEquipment,
  validateExerciseCategory,
  validateMuscle,
  validateDeltaRules,
} from "../schemas";

describe("Zod Schemas", () => {
  describe("validateMotion", () => {
    it("accepts valid motion", () => {
      const result = validateMotion({
        id: "CURL",
        label: "Curl",
        parent_id: null,
        upper_lower: ["UPPER"],
        muscle_targets: { BICEP_INNER: 0.82, BICEP_OUTER: 0.78 },
        default_delta_configs: { motionPaths: "LOW_HIGH" },
        sort_order: 11,
        is_active: true,
      });
      expect(result.success).toBe(true);
    });

    it("rejects motion without id", () => {
      const result = validateMotion({
        label: "Curl",
        parent_id: null,
        upper_lower: ["UPPER"],
        muscle_targets: {},
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid upper_lower value", () => {
      const result = validateMotion({
        id: "TEST",
        label: "Test",
        parent_id: null,
        upper_lower: ["BOTH"],
        muscle_targets: {},
      });
      expect(result.success).toBe(false);
    });

    it("accepts motion with parent_id", () => {
      const result = validateMotion({
        id: "PRESS_FLAT",
        label: "Flat Press",
        parent_id: "PRESS",
        upper_lower: ["UPPER"],
        muscle_targets: {},
      });
      expect(result.success).toBe(true);
    });

    it("rejects nested muscle_targets (requires flat Record<string, number>)", () => {
      const result = validateMotion({
        id: "CURL",
        label: "Curl",
        parent_id: null,
        upper_lower: ["UPPER"],
        muscle_targets: { ARMS: { _score: 2.87, BICEPS: { _score: 2.42 } } } as any,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("validateModifierRow", () => {
    it("accepts valid modifier row with delta_rules", () => {
      const result = validateModifierRow({
        id: "PRONATED",
        label: "Pronated",
        delta_rules: {
          CURL: { FOREARM_TOP: 0.4, BRACHIALIS: 0.3 },
          PRESS_FLAT: {},
        },
      });
      expect(result.success).toBe(true);
    });

    it("accepts modifier row with inherit deltas", () => {
      const result = validateModifierRow({
        id: "LOW_HIGH",
        label: "Low to High",
        delta_rules: {
          PRESS_INCLINE: "inherit",
          CURL: "inherit",
          ROTATION: { OBLIQUES_UPPER: 0.3 },
        },
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty array as delta_rules (MID_MID pattern)", () => {
      const result = validateModifierRow({
        id: "MID_MID",
        label: "Mid to Mid",
        delta_rules: [],
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing id", () => {
      const result = validateModifierRow({
        label: "Test",
        delta_rules: {},
      });
      expect(result.success).toBe(false);
    });
  });

  describe("validateEquipment", () => {
    it("accepts valid equipment with constraints", () => {
      const result = validateEquipment({
        id: "BARBELL",
        label: "Barbell",
        category_id: "BARS",
        modifier_constraints: {
          GRIPS: ["PRONATED", "SUPINATED"],
          GRIP_WIDTHS: ["NARROW", "WIDE"],
        },
      });
      expect(result.success).toBe(true);
    });

    it("accepts equipment without constraints", () => {
      const result = validateEquipment({
        id: "DUMBBELL",
        label: "Dumbbell",
        category_id: "FREE_WEIGHTS",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("validateExerciseCategory", () => {
    it("accepts valid category", () => {
      const result = validateExerciseCategory({
        id: "LIFTS",
        label: "Lifts",
        exercise_input_permissions: {
          muscle_groups: "required",
          cardio_types: "allowed",
          training_focus: "disallowed",
        },
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid permission level", () => {
      const result = validateExerciseCategory({
        id: "TEST",
        label: "Test",
        exercise_input_permissions: {
          something: "maybe",
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("validateMuscle", () => {
    it("accepts valid muscle", () => {
      const result = validateMuscle({
        id: "BICEPS",
        label: "Biceps",
        parent_ids: ["ARMS"],
        upper_lower: ["UPPER"],
        technical_name: "Biceps Brachii",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("validateDeltaRules", () => {
    it("accepts mixed delta entries", () => {
      const result = validateDeltaRules({
        CURL: { BRACHIALIS: 0.4 },
        PRESS_INCLINE: "inherit",
        PRESS_FLAT: {},
      });
      expect(result.success).toBe(true);
    });

    it("rejects string values in delta map", () => {
      const result = validateDeltaRules({
        CURL: { BRACHIALIS: "high" },
      });
      expect(result.success).toBe(false);
    });
  });
});
