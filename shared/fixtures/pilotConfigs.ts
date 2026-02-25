/**
 * Pilot family matrix configs for testing and initial seeding.
 *
 * Verified motion IDs from motions.json (2026-02-24):
 *   Pilot A - Pressing: PRESS -> PRESS_FLAT, PRESS_INCLINE, PRESS_DECLINE
 *                        PRESS_VERTICAL -> PRESS_HIGH_INCLINE, PRESS_OVERHEAD
 *                        DIP -> DIP_CHEST, DIP_TRICEPS
 *   Pilot B - Horizontal Pull: HORIZONTAL_ROW -> ROW_HIGH, ROW_MID, ROW_LOW
 *                               REVERSE_FLY -> REVERSE_FLY_FLAT, REVERSE_FLY_INCLINE, REVERSE_FLY_DECLINE
 *                               FACE_PULL (root, standalone)
 */
import type { MatrixConfigJson } from "../types/matrixV2";

// ─── Pilot A: Pressing Group Config ─────────────────────────────────

export const PRESS_GROUP_CONFIG: MatrixConfigJson = {
  meta: {
    description: "Pressing family group defaults (PRESS root)",
  },
  tables: {
    torsoAngles: {
      applicability: true,
      allowed_row_ids: [
        "DEG_NEG_30",
        "DEG_NEG_15",
        "DEG_0",
        "DEG_15",
        "DEG_30",
        "DEG_45",
      ],
      default_row_id: "DEG_0",
      null_noop_allowed: false,
    },
    grips: {
      applicability: true,
      allowed_row_ids: ["PRONATED", "NEUTRAL", "SEMI_PRONATED", "ROTATING"],
      default_row_id: "PRONATED",
      null_noop_allowed: false,
    },
    gripWidths: {
      applicability: true,
      allowed_row_ids: [],
      default_row_id: null,
      null_noop_allowed: false,
    },
    stanceTypes: {
      applicability: true,
      allowed_row_ids: [],
      default_row_id: null,
      null_noop_allowed: true,
    },
    executionStyles: {
      applicability: true,
      allowed_row_ids: [],
      default_row_id: null,
      null_noop_allowed: true,
    },
    rangeOfMotion: {
      applicability: true,
      allowed_row_ids: [],
      default_row_id: null,
      null_noop_allowed: true,
    },
    footPositions: {
      applicability: false,
      allowed_row_ids: [],
      default_row_id: null,
      null_noop_allowed: true,
    },
    stanceWidths: {
      applicability: false,
      allowed_row_ids: [],
      default_row_id: null,
      null_noop_allowed: true,
    },
  },
  rules: [],
  extensions: {},
};

// ─── Pilot A: Incline Press Override ────────────────────────────────

export const PRESS_INCLINE_OVERRIDE: MatrixConfigJson = {
  meta: {
    description: "Incline Press overrides: narrower torso angle range",
  },
  tables: {
    torsoAngles: {
      applicability: true,
      allowed_row_ids: ["DEG_30", "DEG_45"],
      default_row_id: "DEG_45",
      null_noop_allowed: false,
    },
  },
  rules: [],
  extensions: {},
};

// ─── Pilot A: Decline Press Override ────────────────────────────────

export const PRESS_DECLINE_OVERRIDE: MatrixConfigJson = {
  meta: {
    description: "Decline Press overrides: negative torso angles",
  },
  tables: {
    torsoAngles: {
      applicability: true,
      allowed_row_ids: ["DEG_NEG_30", "DEG_NEG_15"],
      default_row_id: "DEG_NEG_15",
      null_noop_allowed: false,
    },
  },
  rules: [],
  extensions: {},
};

// ─── Pilot B: Horizontal Row Group Config ───────────────────────────

export const HORIZONTAL_ROW_GROUP_CONFIG: MatrixConfigJson = {
  meta: {
    description: "Horizontal Row family group defaults",
  },
  tables: {
    torsoAngles: {
      applicability: true,
      allowed_row_ids: ["DEG_0", "DEG_15", "DEG_30", "DEG_45"],
      default_row_id: "DEG_0",
      null_noop_allowed: false,
    },
    grips: {
      applicability: true,
      allowed_row_ids: ["PRONATED", "NEUTRAL", "SUPINATED", "SEMI_PRONATED"],
      default_row_id: "PRONATED",
      null_noop_allowed: false,
    },
    gripWidths: {
      applicability: true,
      allowed_row_ids: [],
      default_row_id: null,
      null_noop_allowed: false,
    },
    resistanceOrigin: {
      applicability: true,
      allowed_row_ids: [],
      default_row_id: null,
      null_noop_allowed: true,
    },
    stanceTypes: {
      applicability: true,
      allowed_row_ids: [],
      default_row_id: null,
      null_noop_allowed: true,
    },
    footPositions: {
      applicability: false,
      allowed_row_ids: [],
      default_row_id: null,
      null_noop_allowed: true,
    },
    stanceWidths: {
      applicability: false,
      allowed_row_ids: [],
      default_row_id: null,
      null_noop_allowed: true,
    },
  },
  rules: [],
  extensions: {},
};

// ─── Pilot B: Row High Override ─────────────────────────────────────

export const ROW_HIGH_OVERRIDE: MatrixConfigJson = {
  meta: {
    description: "Row High: restrict to higher torso angles",
  },
  tables: {
    torsoAngles: {
      applicability: true,
      allowed_row_ids: ["DEG_30", "DEG_45"],
      default_row_id: "DEG_45",
      null_noop_allowed: false,
    },
  },
  rules: [],
  extensions: {},
};
