/**
 * Tests for delta_rules ↔ Matrix V2 Config sync logic.
 *
 * These tests validate the pure logic used by syncDeltasForMotion:
 *   - Building config_json from delta_rules scan results
 *   - Merging new rows into existing active config's allowed_row_ids
 *   - Auto-creating configs when none exist
 *   - Correct scope_type assignment (motion_group vs motion)
 */

import type { MatrixConfigJson, TableConfig } from "../types/matrixV2";
import { MODIFIER_TABLE_KEYS } from "../types/matrixV2";

// ─── Helpers reproducing the sync logic from matrixConfigService ─────

function buildConfigFromDeltaScan(
  rowsByTable: Record<string, string[]>,
  scopeType: "motion" | "motion_group",
  scopeId: string,
): MatrixConfigJson {
  const configJson: MatrixConfigJson = {
    meta: { description: "Auto-created from delta_rules", scope_type: scopeType, scope_id: scopeId },
    tables: {},
    rules: [],
    extensions: {},
  };
  for (const [tKey, rowIds] of Object.entries(rowsByTable)) {
    configJson.tables[tKey] = {
      applicability: true,
      allowed_row_ids: rowIds,
      default_row_id: rowIds[0] || null,
      null_noop_allowed: false,
    };
  }
  return configJson;
}

function mergeRowsIntoExistingConfig(
  configJson: MatrixConfigJson,
  rowsByTable: Record<string, string[]>,
): { updated: boolean; config: MatrixConfigJson } {
  let updated = false;
  for (const [tKey, rowIds] of Object.entries(rowsByTable)) {
    if (!configJson.tables[tKey]) {
      configJson.tables[tKey] = {
        applicability: true,
        allowed_row_ids: rowIds,
        default_row_id: rowIds[0] || null,
        null_noop_allowed: false,
      };
      updated = true;
    } else {
      const tc = configJson.tables[tKey];
      for (const rid of rowIds) {
        if (!tc.allowed_row_ids.includes(rid)) {
          tc.allowed_row_ids.push(rid);
          updated = true;
        }
      }
    }
  }
  return { updated, config: configJson };
}

function determineScopeType(parentId: string | null): "motion" | "motion_group" {
  return parentId ? "motion" : "motion_group";
}

function scanDeltaRulesForMotion(
  tables: Record<string, Array<{ id: string; delta_rules: Record<string, unknown> | null }>>,
  motionId: string,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [tableKey, rows] of Object.entries(tables)) {
    const matchingRows = rows.filter(
      (r) => r.delta_rules && typeof r.delta_rules === "object" && motionId in r.delta_rules,
    );
    if (matchingRows.length > 0) {
      result[tableKey] = matchingRows.map((r) => r.id);
    }
  }
  return result;
}

function collectAllMotionIds(
  tables: Record<string, Array<{ id: string; delta_rules: Record<string, unknown> | null }>>,
): Set<string> {
  const ids = new Set<string>();
  for (const rows of Object.values(tables)) {
    for (const row of rows) {
      if (row.delta_rules && typeof row.delta_rules === "object") {
        for (const key of Object.keys(row.delta_rules)) {
          ids.add(key);
        }
      }
    }
  }
  return ids;
}

// ═══════════════════════════════════════════════════════════════════
//  Scope Type Assignment
// ═══════════════════════════════════════════════════════════════════

describe("Scope Type Assignment", () => {
  test("root motion (no parent) gets motion_group scope", () => {
    expect(determineScopeType(null)).toBe("motion_group");
  });

  test("child motion (has parent_id) gets motion scope", () => {
    expect(determineScopeType("PRESS")).toBe("motion");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Delta Rules Scanning
// ═══════════════════════════════════════════════════════════════════

describe("Delta Rules Scanning", () => {
  const sampleTables = {
    grips: [
      { id: "PRONATED", delta_rules: { PRESS_FLAT: { pec: 5 }, PRESS_INCLINE: { anterior_delt: 3 } } },
      { id: "NEUTRAL", delta_rules: { PRESS_FLAT: { pec: -2 } } },
      { id: "SUPINATED", delta_rules: null },
    ],
    torsoAngles: [
      { id: "DEG_0", delta_rules: { PRESS_FLAT: { pec: 10 } } },
      { id: "DEG_45", delta_rules: { PRESS_INCLINE: { anterior_delt: 8 } } },
    ],
    loadPlacement: [
      { id: "FRONT", delta_rules: {} },
      { id: "BACK", delta_rules: null },
    ],
  };

  test("finds all rows referencing a specific motion", () => {
    const result = scanDeltaRulesForMotion(sampleTables, "PRESS_FLAT");
    expect(result).toEqual({
      grips: ["PRONATED", "NEUTRAL"],
      torsoAngles: ["DEG_0"],
    });
  });

  test("returns empty when no rows reference the motion", () => {
    const result = scanDeltaRulesForMotion(sampleTables, "NONEXISTENT");
    expect(result).toEqual({});
  });

  test("handles null delta_rules gracefully", () => {
    const result = scanDeltaRulesForMotion(sampleTables, "PRESS_FLAT");
    expect(result.grips).not.toContain("SUPINATED");
  });

  test("collects all unique motion IDs across all tables", () => {
    const ids = collectAllMotionIds(sampleTables);
    expect(ids).toEqual(new Set(["PRESS_FLAT", "PRESS_INCLINE"]));
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Config Building from Scan
// ═══════════════════════════════════════════════════════════════════

describe("Config Building from Delta Scan", () => {
  test("creates correct config_json structure", () => {
    const rowsByTable = {
      grips: ["PRONATED", "NEUTRAL"],
      torsoAngles: ["DEG_0"],
    };
    const config = buildConfigFromDeltaScan(rowsByTable, "motion_group", "PRESS");

    expect(config.meta.scope_type).toBe("motion_group");
    expect(config.meta.scope_id).toBe("PRESS");
    expect(config.tables.grips).toBeDefined();
    expect(config.tables.grips.applicability).toBe(true);
    expect(config.tables.grips.allowed_row_ids).toEqual(["PRONATED", "NEUTRAL"]);
    expect(config.tables.grips.default_row_id).toBe("PRONATED");
    expect(config.tables.torsoAngles.allowed_row_ids).toEqual(["DEG_0"]);
  });

  test("sets first row as default", () => {
    const config = buildConfigFromDeltaScan(
      { grips: ["NEUTRAL", "PRONATED"] },
      "motion",
      "PRESS_FLAT",
    );
    expect(config.tables.grips.default_row_id).toBe("NEUTRAL");
  });

  test("empty scan produces empty tables", () => {
    const config = buildConfigFromDeltaScan({}, "motion_group", "PRESS");
    expect(Object.keys(config.tables)).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Merging into Existing Config
// ═══════════════════════════════════════════════════════════════════

describe("Merging Rows into Existing Config", () => {
  test("adds new rows to existing table's allowed_row_ids", () => {
    const existing: MatrixConfigJson = {
      meta: {},
      tables: {
        grips: {
          applicability: true,
          allowed_row_ids: ["PRONATED"],
          default_row_id: "PRONATED",
          null_noop_allowed: false,
        },
      },
      rules: [],
      extensions: {},
    };
    const { updated, config } = mergeRowsIntoExistingConfig(existing, {
      grips: ["PRONATED", "NEUTRAL"],
    });
    expect(updated).toBe(true);
    expect(config.tables.grips.allowed_row_ids).toEqual(["PRONATED", "NEUTRAL"]);
  });

  test("does not duplicate existing rows", () => {
    const existing: MatrixConfigJson = {
      meta: {},
      tables: {
        grips: {
          applicability: true,
          allowed_row_ids: ["PRONATED", "NEUTRAL"],
          default_row_id: "PRONATED",
          null_noop_allowed: false,
        },
      },
      rules: [],
      extensions: {},
    };
    const { updated } = mergeRowsIntoExistingConfig(existing, {
      grips: ["PRONATED", "NEUTRAL"],
    });
    expect(updated).toBe(false);
  });

  test("creates new table entry when table not in existing config", () => {
    const existing: MatrixConfigJson = {
      meta: {},
      tables: {
        grips: {
          applicability: true,
          allowed_row_ids: ["PRONATED"],
          default_row_id: "PRONATED",
          null_noop_allowed: false,
        },
      },
      rules: [],
      extensions: {},
    };
    const { updated, config } = mergeRowsIntoExistingConfig(existing, {
      torsoAngles: ["DEG_0", "DEG_45"],
    });
    expect(updated).toBe(true);
    expect(config.tables.torsoAngles).toBeDefined();
    expect(config.tables.torsoAngles.allowed_row_ids).toEqual(["DEG_0", "DEG_45"]);
    expect(config.tables.torsoAngles.default_row_id).toBe("DEG_0");
  });

  test("preserves existing config properties", () => {
    const existing: MatrixConfigJson = {
      meta: { description: "Custom" },
      tables: {
        grips: {
          applicability: true,
          allowed_row_ids: ["PRONATED"],
          default_row_id: "PRONATED",
          null_noop_allowed: true,
          one_per_group: true,
        },
      },
      rules: [{ rule_id: "r1", type: "partition", tables: ["grips"], conditions: [], description: "" }],
      extensions: { custom: true },
    };
    const { config } = mergeRowsIntoExistingConfig(existing, {
      grips: ["NEUTRAL"],
    });
    expect(config.meta.description).toBe("Custom");
    expect(config.tables.grips.null_noop_allowed).toBe(true);
    expect(config.tables.grips.one_per_group).toBe(true);
    expect(config.rules).toHaveLength(1);
    expect((config.extensions as any).custom).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  End-to-End Sync Decision Logic
// ═══════════════════════════════════════════════════════════════════

describe("Sync Decision Logic", () => {
  function syncDecision(
    rowsByTable: Record<string, string[]>,
    existingActive: MatrixConfigJson | null,
    parentId: string | null,
    motionId: string,
  ): { action: "created" | "updated" | "noop" } {
    if (Object.keys(rowsByTable).length === 0) {
      return { action: "noop" };
    }

    if (existingActive) {
      const { updated } = mergeRowsIntoExistingConfig(existingActive, rowsByTable);
      return { action: updated ? "updated" : "noop" };
    }

    return { action: "created" };
  }

  test("noop when no delta_rules reference the motion", () => {
    expect(syncDecision({}, null, null, "PRESS")).toEqual({ action: "noop" });
  });

  test("creates config when delta_rules exist but no active config", () => {
    expect(
      syncDecision({ grips: ["PRONATED"] }, null, null, "PRESS"),
    ).toEqual({ action: "created" });
  });

  test("updates config when delta_rules include new rows", () => {
    const existing: MatrixConfigJson = {
      meta: {},
      tables: {
        grips: {
          applicability: true,
          allowed_row_ids: ["PRONATED"],
          default_row_id: "PRONATED",
          null_noop_allowed: false,
        },
      },
      rules: [],
      extensions: {},
    };
    expect(
      syncDecision({ grips: ["PRONATED", "NEUTRAL"] }, existing, null, "PRESS"),
    ).toEqual({ action: "updated" });
  });

  test("noop when all rows already in active config", () => {
    const existing: MatrixConfigJson = {
      meta: {},
      tables: {
        grips: {
          applicability: true,
          allowed_row_ids: ["PRONATED", "NEUTRAL"],
          default_row_id: "PRONATED",
          null_noop_allowed: false,
        },
      },
      rules: [],
      extensions: {},
    };
    expect(
      syncDecision({ grips: ["PRONATED"] }, existing, null, "PRESS"),
    ).toEqual({ action: "noop" });
  });
});

// ═══════════════════════════════════════════════════════════════════
//  MODIFIER_TABLE_KEYS Consistency
// ═══════════════════════════════════════════════════════════════════

describe("MODIFIER_TABLE_KEYS Consistency", () => {
  test("all 15 modifier table keys are present", () => {
    expect(MODIFIER_TABLE_KEYS).toHaveLength(15);
    expect(MODIFIER_TABLE_KEYS).toContain("motionPaths");
    expect(MODIFIER_TABLE_KEYS).toContain("grips");
    expect(MODIFIER_TABLE_KEYS).toContain("rangeOfMotion");
  });

  test("auto-created config covers all scanned tables", () => {
    const rowsByTable: Record<string, string[]> = {};
    for (const key of MODIFIER_TABLE_KEYS) {
      rowsByTable[key] = [`ROW_${key}`];
    }
    const config = buildConfigFromDeltaScan(rowsByTable, "motion_group", "PRESS");
    expect(Object.keys(config.tables)).toHaveLength(15);
    for (const key of MODIFIER_TABLE_KEYS) {
      expect(config.tables[key]).toBeDefined();
      expect(config.tables[key].allowed_row_ids).toEqual([`ROW_${key}`]);
    }
  });
});
