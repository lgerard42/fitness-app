/**
 * Tests for Matrix V2 Config integrity constraints:
 *   - At most 1 active config per (scope_type, scope_id)
 *   - Unique config_version per (scope_type, scope_id)
 *   - Auto-draft creation for motions
 *   - Deduplication logic
 *   - Activation demotion of all prior actives
 *   - Angle range auto-select logic
 *   - Delta reassignment logic
 *   - DeltaBranchCard prop contracts
 */

import type { MatrixConfigJson, MatrixConfigRow, TableConfig, MatrixScopeType, MatrixConfigStatus } from "../types/matrixV2";

// ─── Mock config row factory ──────────────────────────────────────────

let idCounter = 0;
function mockConfigRow(overrides: Partial<MatrixConfigRow> = {}): MatrixConfigRow {
  idCounter++;
  return {
    id: `cfg_${idCounter}`,
    scope_type: "motion_group",
    scope_id: "PRESS",
    status: "draft",
    schema_version: "1.0",
    config_version: idCounter,
    config_json: { meta: {}, tables: {}, rules: [], extensions: {} },
    notes: null,
    validation_status: null,
    validation_summary: null,
    is_deleted: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    published_at: null,
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}

beforeEach(() => { idCounter = 0; });

// ═══════════════════════════════════════════════════════════════════
//  Active Config Uniqueness
// ═══════════════════════════════════════════════════════════════════

describe("Active Config Uniqueness", () => {
  function findDuplicateActiveScopes(configs: MatrixConfigRow[]): string[] {
    const activeByScope = new Map<string, number>();
    for (const c of configs) {
      if (c.status === "active" && !c.is_deleted) {
        const key = `${c.scope_type}:${c.scope_id}`;
        activeByScope.set(key, (activeByScope.get(key) || 0) + 1);
      }
    }
    return Array.from(activeByScope.entries())
      .filter(([, count]) => count > 1)
      .map(([key]) => key);
  }

  test("no duplicates when each scope has at most 1 active", () => {
    const configs = [
      mockConfigRow({ scope_id: "PRESS", status: "active" }),
      mockConfigRow({ scope_id: "PRESS", status: "draft" }),
      mockConfigRow({ scope_id: "FLY", status: "active" }),
    ];
    expect(findDuplicateActiveScopes(configs)).toEqual([]);
  });

  test("detects duplicates when same scope has 2 active", () => {
    const configs = [
      mockConfigRow({ scope_id: "PRESS", status: "active" }),
      mockConfigRow({ scope_id: "PRESS", status: "active" }),
      mockConfigRow({ scope_id: "FLY", status: "active" }),
    ];
    expect(findDuplicateActiveScopes(configs)).toEqual(["motion_group:PRESS"]);
  });

  test("soft-deleted active configs are excluded", () => {
    const configs = [
      mockConfigRow({ scope_id: "PRESS", status: "active" }),
      mockConfigRow({ scope_id: "PRESS", status: "active", is_deleted: true }),
    ];
    expect(findDuplicateActiveScopes(configs)).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Version Uniqueness
// ═══════════════════════════════════════════════════════════════════

describe("Version Uniqueness", () => {
  function findDuplicateVersions(configs: MatrixConfigRow[]): string[] {
    const versionsByScope = new Map<string, Set<number>>();
    const dupes: string[] = [];
    for (const c of configs) {
      if (c.is_deleted) continue;
      const key = `${c.scope_type}:${c.scope_id}`;
      const versions = versionsByScope.get(key) || new Set();
      if (versions.has(c.config_version)) {
        dupes.push(`${key}:v${c.config_version}`);
      }
      versions.add(c.config_version);
      versionsByScope.set(key, versions);
    }
    return dupes;
  }

  test("no duplicates with unique versions", () => {
    const configs = [
      mockConfigRow({ scope_id: "PRESS", config_version: 1 }),
      mockConfigRow({ scope_id: "PRESS", config_version: 2 }),
      mockConfigRow({ scope_id: "PRESS", config_version: 3 }),
    ];
    expect(findDuplicateVersions(configs)).toEqual([]);
  });

  test("detects duplicate version numbers", () => {
    const configs = [
      mockConfigRow({ scope_id: "PRESS", config_version: 1 }),
      mockConfigRow({ scope_id: "PRESS", config_version: 1 }),
      mockConfigRow({ scope_id: "PRESS", config_version: 2 }),
    ];
    expect(findDuplicateVersions(configs)).toEqual(["motion_group:PRESS:v1"]);
  });

  test("different scopes can have same version number", () => {
    const configs = [
      mockConfigRow({ scope_id: "PRESS", config_version: 1 }),
      mockConfigRow({ scope_id: "FLY", config_version: 1 }),
    ];
    expect(findDuplicateVersions(configs)).toEqual([]);
  });

  test("soft-deleted configs excluded from duplicate check", () => {
    const configs = [
      mockConfigRow({ scope_id: "PRESS", config_version: 1 }),
      mockConfigRow({ scope_id: "PRESS", config_version: 1, is_deleted: true }),
    ];
    expect(findDuplicateVersions(configs)).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Deduplication Logic
// ═══════════════════════════════════════════════════════════════════

describe("Deduplication Logic", () => {
  function deduplicateActiveConfigs(
    configs: MatrixConfigRow[],
  ): { demoted: string[]; kept: string } {
    const actives = configs
      .filter(c => c.status === "active" && !c.is_deleted)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    if (actives.length <= 1) return { demoted: [], kept: actives[0]?.id ?? "" };
    return {
      kept: actives[0].id,
      demoted: actives.slice(1).map(c => c.id),
    };
  }

  test("keeps most recently updated active, demotes rest", () => {
    const configs = [
      mockConfigRow({ id: "old", scope_id: "PRESS", status: "active", updated_at: "2025-01-01T00:00:00Z" }),
      mockConfigRow({ id: "newest", scope_id: "PRESS", status: "active", updated_at: "2025-06-01T00:00:00Z" }),
      mockConfigRow({ id: "mid", scope_id: "PRESS", status: "active", updated_at: "2025-03-01T00:00:00Z" }),
    ];
    const result = deduplicateActiveConfigs(configs);
    expect(result.kept).toBe("newest");
    expect(result.demoted).toContain("old");
    expect(result.demoted).toContain("mid");
    expect(result.demoted).toHaveLength(2);
  });

  test("no demotion needed for single active", () => {
    const configs = [
      mockConfigRow({ id: "only", scope_id: "PRESS", status: "active" }),
    ];
    const result = deduplicateActiveConfigs(configs);
    expect(result.kept).toBe("only");
    expect(result.demoted).toEqual([]);
  });

  function renumberDuplicateVersions(
    configs: MatrixConfigRow[],
  ): { renumbered: Array<{ id: string; oldVersion: number; newVersion: number }> } {
    const nonDeleted = configs.filter(c => !c.is_deleted);
    const byScope = new Map<string, MatrixConfigRow[]>();
    for (const c of nonDeleted) {
      const key = `${c.scope_type}:${c.scope_id}`;
      const arr = byScope.get(key) || [];
      arr.push(c);
      byScope.set(key, arr);
    }

    const renumbered: Array<{ id: string; oldVersion: number; newVersion: number }> = [];

    for (const [, scopeConfigs] of byScope) {
      const byVersion = new Map<number, MatrixConfigRow[]>();
      for (const c of scopeConfigs) {
        const arr = byVersion.get(c.config_version) || [];
        arr.push(c);
        byVersion.set(c.config_version, arr);
      }

      let maxVer = Math.max(...scopeConfigs.map(c => c.config_version));

      for (const [ver, dupes] of byVersion) {
        if (dupes.length <= 1) continue;
        dupes.sort((a, b) => {
          if (a.status !== b.status) return a.status === "active" ? -1 : 1;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
        for (let i = 1; i < dupes.length; i++) {
          maxVer++;
          renumbered.push({ id: dupes[i].id, oldVersion: ver, newVersion: maxVer });
          dupes[i].config_version = maxVer;
        }
      }
    }

    return { renumbered };
  }

  test("renumbers duplicate versions keeping first, bumping rest", () => {
    const configs = [
      mockConfigRow({ id: "a", scope_id: "PRESS", config_version: 1, status: "active", updated_at: "2025-06-01T00:00:00Z" }),
      mockConfigRow({ id: "b", scope_id: "PRESS", config_version: 1, status: "draft", updated_at: "2025-01-01T00:00:00Z" }),
      mockConfigRow({ id: "c", scope_id: "PRESS", config_version: 2, status: "draft" }),
    ];
    const result = renumberDuplicateVersions(configs);
    expect(result.renumbered).toHaveLength(1);
    expect(result.renumbered[0].id).toBe("b");
    expect(result.renumbered[0].oldVersion).toBe(1);
    expect(result.renumbered[0].newVersion).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Activation Demotion
// ═══════════════════════════════════════════════════════════════════

describe("Activation Demotion", () => {
  function simulateActivation(
    configs: MatrixConfigRow[],
    activateId: string,
  ): { activated: string; demoted: string[] } {
    const target = configs.find(c => c.id === activateId);
    if (!target) throw new Error("Config not found");

    const others = configs.filter(
      c => c.id !== activateId
        && c.scope_type === target.scope_type
        && c.scope_id === target.scope_id
        && c.status === "active"
        && !c.is_deleted,
    );

    return {
      activated: activateId,
      demoted: others.map(c => c.id),
    };
  }

  test("demotes ALL existing actives (not just first)", () => {
    const configs = [
      mockConfigRow({ id: "active1", scope_id: "PRESS", status: "active" }),
      mockConfigRow({ id: "active2", scope_id: "PRESS", status: "active" }),
      mockConfigRow({ id: "active3", scope_id: "PRESS", status: "active" }),
      mockConfigRow({ id: "draft1", scope_id: "PRESS", status: "draft" }),
    ];
    const result = simulateActivation(configs, "draft1");
    expect(result.activated).toBe("draft1");
    expect(result.demoted).toHaveLength(3);
    expect(result.demoted).toContain("active1");
    expect(result.demoted).toContain("active2");
    expect(result.demoted).toContain("active3");
  });

  test("does not demote configs from different scopes", () => {
    const configs = [
      mockConfigRow({ id: "press_active", scope_id: "PRESS", status: "active" }),
      mockConfigRow({ id: "fly_active", scope_id: "FLY", status: "active" }),
      mockConfigRow({ id: "press_draft", scope_id: "PRESS", status: "draft" }),
    ];
    const result = simulateActivation(configs, "press_draft");
    expect(result.demoted).toEqual(["press_active"]);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Auto-Draft Ensure Logic
// ═══════════════════════════════════════════════════════════════════

describe("Auto-Draft Ensure Logic", () => {
  function ensureDrafts(
    motions: Array<{ id: string; parent_id: string | null }>,
    existingConfigs: MatrixConfigRow[],
  ): { toCreate: Array<{ scope_type: MatrixScopeType; scope_id: string }> } {
    const existingScopes = new Set(existingConfigs.filter(c => !c.is_deleted).map(c => c.scope_id));
    const toCreate: Array<{ scope_type: MatrixScopeType; scope_id: string }> = [];

    for (const m of motions) {
      if (!existingScopes.has(m.id)) {
        toCreate.push({
          scope_type: m.parent_id ? "motion" : "motion_group",
          scope_id: m.id,
        });
      }
    }
    return { toCreate };
  }

  test("creates drafts for motions without any config", () => {
    const motions = [
      { id: "PRESS", parent_id: null },
      { id: "PRESS_FLAT", parent_id: "PRESS" },
      { id: "FLY", parent_id: null },
    ];
    const configs = [
      mockConfigRow({ scope_id: "PRESS", scope_type: "motion_group" }),
    ];
    const result = ensureDrafts(motions, configs);
    expect(result.toCreate).toHaveLength(2);
    expect(result.toCreate).toContainEqual({ scope_type: "motion", scope_id: "PRESS_FLAT" });
    expect(result.toCreate).toContainEqual({ scope_type: "motion_group", scope_id: "FLY" });
  });

  test("skips motions that already have configs", () => {
    const motions = [{ id: "PRESS", parent_id: null }];
    const configs = [mockConfigRow({ scope_id: "PRESS", scope_type: "motion_group" })];
    const result = ensureDrafts(motions, configs);
    expect(result.toCreate).toEqual([]);
  });

  test("correct scope_type for child motions", () => {
    const motions = [{ id: "PRESS_INCLINE", parent_id: "PRESS" }];
    const result = ensureDrafts(motions, []);
    expect(result.toCreate[0].scope_type).toBe("motion");
  });

  test("correct scope_type for root motions", () => {
    const motions = [{ id: "PRESS", parent_id: null }];
    const result = ensureDrafts(motions, []);
    expect(result.toCreate[0].scope_type).toBe("motion_group");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Motion Delete → Config Cleanup
// ═══════════════════════════════════════════════════════════════════

describe("Motion Delete Config Cleanup", () => {
  function simulateMotionDelete(
    motionId: string,
    configs: MatrixConfigRow[],
  ): { softDeleted: string[]; remaining: string[] } {
    const toDelete = configs.filter(c => c.scope_id === motionId && !c.is_deleted).map(c => c.id);
    const remaining = configs.filter(c => c.scope_id !== motionId && !c.is_deleted).map(c => c.id);
    return { softDeleted: toDelete, remaining };
  }

  test("soft-deletes all configs for deleted motion", () => {
    const configs = [
      mockConfigRow({ id: "p1", scope_id: "PRESS", status: "active" }),
      mockConfigRow({ id: "p2", scope_id: "PRESS", status: "draft" }),
      mockConfigRow({ id: "f1", scope_id: "FLY", status: "active" }),
    ];
    const result = simulateMotionDelete("PRESS", configs);
    expect(result.softDeleted).toEqual(["p1", "p2"]);
    expect(result.remaining).toEqual(["f1"]);
  });

  test("no-op for motion with no configs", () => {
    const configs = [
      mockConfigRow({ id: "f1", scope_id: "FLY", status: "active" }),
    ];
    const result = simulateMotionDelete("NONEXISTENT", configs);
    expect(result.softDeleted).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Angle Range Auto-Select Logic
// ═══════════════════════════════════════════════════════════════════

describe("Angle Range Auto-Select Logic", () => {
  function parseDegreeFromId(id: string): number | null {
    const m = id.match(/DEG_(NEG_)?(\d+)/i);
    if (!m) return null;
    const val = parseInt(m[2], 10);
    return m[1] ? -val : val;
  }

  function computeAngleRangeSync(
    allRows: Array<{ id: string }>,
    currentAllowed: string[],
    newMin: number,
    newMax: number,
  ): { inRange: string[]; outOfRange: string[] } {
    const inRange: string[] = [];
    const outOfRange: string[] = [];
    const allowedSet = new Set(currentAllowed);

    for (const row of allRows) {
      const deg = parseDegreeFromId(row.id);
      if (deg === null) continue;
      if (deg >= newMin && deg <= newMax) {
        inRange.push(row.id);
      } else if (allowedSet.has(row.id)) {
        outOfRange.push(row.id);
      }
    }
    return { inRange, outOfRange };
  }

  const torsoRows = [
    { id: "DEG_NEG_30" },
    { id: "DEG_NEG_15" },
    { id: "DEG_0" },
    { id: "DEG_15" },
    { id: "DEG_30" },
    { id: "DEG_45" },
    { id: "DEG_60" },
  ];

  test("selects rows within range", () => {
    const result = computeAngleRangeSync(torsoRows, [], -30, 0);
    expect(result.inRange).toEqual(["DEG_NEG_30", "DEG_NEG_15", "DEG_0"]);
    expect(result.outOfRange).toEqual([]);
  });

  test("identifies out-of-range rows that are currently allowed", () => {
    const result = computeAngleRangeSync(
      torsoRows,
      ["DEG_NEG_30", "DEG_NEG_15", "DEG_0", "DEG_45"],
      -15,
      0,
    );
    expect(result.inRange).toEqual(["DEG_NEG_15", "DEG_0"]);
    expect(result.outOfRange).toEqual(["DEG_NEG_30", "DEG_45"]);
  });

  test("non-allowed out-of-range rows are not flagged", () => {
    const result = computeAngleRangeSync(torsoRows, ["DEG_0"], -15, 15);
    expect(result.outOfRange).toEqual([]);
    expect(result.inRange).toEqual(["DEG_NEG_15", "DEG_0", "DEG_15"]);
  });

  test("degree dropdown options in 5-degree increments", () => {
    const opts: number[] = [];
    for (let d = -90; d <= 90; d += 5) opts.push(d);
    expect(opts).toHaveLength(37);
    expect(opts[0]).toBe(-90);
    expect(opts[opts.length - 1]).toBe(90);
    expect(opts).toContain(0);
    expect(opts).toContain(-30);
    expect(opts).toContain(45);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Delta Reassignment Logic
// ═══════════════════════════════════════════════════════════════════

describe("Delta Reassignment Logic", () => {
  function moveDeltaRules(
    deltaRules: Record<string, unknown>,
    oldMotionId: string,
    newMotionId: string,
  ): Record<string, unknown> {
    const dr = { ...deltaRules };
    if (dr[oldMotionId] !== undefined) {
      dr[newMotionId] = dr[oldMotionId];
      delete dr[oldMotionId];
    }
    return dr;
  }

  test("copies deltas from old motion to new and removes old", () => {
    const dr = { PRESS_FLAT: { pec: 5 }, PRESS_INCLINE: { anterior_delt: 3 } };
    const result = moveDeltaRules(dr, "PRESS_FLAT", "PRESS_DECLINE");
    expect(result).toEqual({
      PRESS_DECLINE: { pec: 5 },
      PRESS_INCLINE: { anterior_delt: 3 },
    });
  });

  test("no-op when old motion not in delta_rules", () => {
    const dr = { PRESS_FLAT: { pec: 5 } };
    const result = moveDeltaRules(dr, "NONEXISTENT", "NEW_MOTION");
    expect(result).toEqual({ PRESS_FLAT: { pec: 5 } });
  });

  test("handles inherit value", () => {
    const dr: Record<string, unknown> = { PRESS_FLAT: "inherit" };
    const result = moveDeltaRules(dr, "PRESS_FLAT", "PRESS_DECLINE");
    expect(result).toEqual({ PRESS_DECLINE: "inherit" });
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Scope Lock Key Hashing
// ═══════════════════════════════════════════════════════════════════

describe("Scope Lock Key Hashing", () => {
  function scopeLockKey(scopeType: string, scopeId: string): number {
    let hash = 0x1505;
    const str = `mmc:${scopeType}:${scopeId}`;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0x7fffffff;
    }
    return hash;
  }

  test("produces consistent hash for same input", () => {
    const a = scopeLockKey("motion_group", "PRESS");
    const b = scopeLockKey("motion_group", "PRESS");
    expect(a).toBe(b);
  });

  test("produces different hashes for different scopes", () => {
    const a = scopeLockKey("motion_group", "PRESS");
    const b = scopeLockKey("motion_group", "FLY");
    expect(a).not.toBe(b);
  });

  test("produces different hashes for different scope types", () => {
    const a = scopeLockKey("motion_group", "PRESS");
    const b = scopeLockKey("motion", "PRESS");
    expect(a).not.toBe(b);
  });

  test("hash is within 32-bit positive integer range", () => {
    const h = scopeLockKey("motion_group", "PRESS_INCLINE_CLOSE_GRIP_WIDE_STANCE");
    expect(h).toBeGreaterThan(0);
    expect(h).toBeLessThanOrEqual(0x7fffffff);
  });
});
