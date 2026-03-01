/**
 * Scoring engine routes -- loads all data from Postgres.
 */
import { Router, Request, Response } from "express";
import { pool } from "../../drizzle/db";
import {
  resolveAllDeltas,
  computeActivation,
  flattenMuscleTargets,
  resolveComboRules,
} from "../../../../shared/scoring";
import { evaluateConstraints } from "../../../../shared/constraints";
import { lintAll, formatLintResults } from "../../../../shared/linter/deltaLinter";
import type {
  Motion,
  ModifierRow,
  Muscle,
  Equipment,
  ComboRule,
} from "../../../../shared/types";

const router = Router();

const INTERNAL_COLS = new Set(["source_type"]);

function cleanRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (!INTERNAL_COLS.has(k)) out[k] = v;
  }
  return out;
}

async function queryTable<T>(pgTable: string): Promise<T[]> {
  const order = pgTable === "equipment_icons" ? 'ORDER BY "id"' : 'ORDER BY "sort_order", "id"';
  const { rows } = await pool.query(
    `SELECT * FROM "${pgTable}" WHERE is_active = true ${order}`
  );
  return rows.map(cleanRow) as T[];
}

async function buildMotionsMap(): Promise<Record<string, Motion>> {
  const motions = await queryTable<Motion>("motions");
  return Object.fromEntries(motions.map((m) => [m.id, m]));
}

const MODIFIER_PG_TABLES: Record<string, string> = {
  motionPaths: "motion_paths",
  torsoAngles: "torso_angles",
  torsoOrientations: "torso_orientations",
  resistanceOrigin: "resistance_origin",
  grips: "grips",
  gripWidths: "grip_widths",
  elbowRelationship: "elbow_relationship",
  executionStyles: "execution_styles",
  footPositions: "foot_positions",
  stanceWidths: "stance_widths",
  stanceTypes: "stance_types",
  loadPlacement: "load_placement",
  supportStructures: "support_structures",
  loadingAids: "loading_aids",
  rangeOfMotion: "range_of_motion",
};

async function loadComboRules(motionId?: string): Promise<ComboRule[]> {
  if (motionId) {
    const { rows } = await pool.query(
      `SELECT * FROM "combo_rules" WHERE is_active = true AND motion_id = $1 ORDER BY priority DESC, id`,
      [motionId]
    );
    return rows.map(cleanRow) as ComboRule[];
  }
  const { rows } = await pool.query(
    `SELECT * FROM "combo_rules" WHERE is_active = true ORDER BY priority DESC, id`
  );
  return rows.map(cleanRow) as ComboRule[];
}

async function buildModifierTables(): Promise<Record<string, Record<string, ModifierRow>>> {
  const tables: Record<string, Record<string, ModifierRow>> = {};
  for (const [key, pgTable] of Object.entries(MODIFIER_PG_TABLES)) {
    try {
      const rows = await queryTable<ModifierRow>(pgTable);
      tables[key] = Object.fromEntries(rows.map((r) => [r.id, r]));
    } catch { /* table might not exist yet */ }
  }
  return tables;
}

router.post("/compute", async (req: Request, res: Response) => {
  try {
    const { motionId, selectedModifiers, policy } = req.body;
    if (!motionId || !selectedModifiers) {
      res.status(400).json({ error: "motionId and selectedModifiers are required" });
      return;
    }
    const motionsMap = await buildMotionsMap();
    const modifierTables = await buildModifierTables();
    const motion = motionsMap[motionId];
    if (!motion) { res.status(404).json({ error: `Motion "${motionId}" not found` }); return; }

    const comboRules = await loadComboRules(motionId);
    const resolution = resolveComboRules(motionId, selectedModifiers, comboRules);
    const { effectiveMotionId, deltaOverrides, clampMap, rulesFired } = resolution;

    const effectiveMotion = motionsMap[effectiveMotionId] ?? motion;
    const resolvedDeltas = resolveAllDeltas(effectiveMotionId, selectedModifiers, motionsMap, modifierTables);
    const result = computeActivation(effectiveMotion.muscle_targets, resolvedDeltas, policy, {
      deltaOverrides,
      clampMap,
    });
    res.json({ motionId, motionLabel: motion.label, effectiveMotionId, rulesFired, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/trace", async (req: Request, res: Response) => {
  try {
    const { motionId, selectedModifiers } = req.body;
    const motionsMap = await buildMotionsMap();
    const modifierTables = await buildModifierTables();
    const motion = motionsMap[motionId];
    if (!motion) { res.status(404).json({ error: `Motion "${motionId}" not found` }); return; }

    const comboRules = await loadComboRules(motionId);
    const resolution = resolveComboRules(motionId, selectedModifiers || [], comboRules);
    const { effectiveMotionId, deltaOverrides, clampMap, rulesFired } = resolution;

    const effectiveMotion = motionsMap[effectiveMotionId] ?? motion;
    const baseScores = flattenMuscleTargets(effectiveMotion.muscle_targets);
    const resolvedDeltas = resolveAllDeltas(effectiveMotionId, selectedModifiers || [], motionsMap, modifierTables);
    const withDeltas = computeActivation(effectiveMotion.muscle_targets, resolvedDeltas, {}, {
      deltaOverrides,
      clampMap,
    });

    const comparison: Record<string, { base: number; final: number; delta: number }> = {};
    const allMuscleIds = new Set([...Object.keys(baseScores), ...Object.keys(withDeltas.finalScores)]);
    for (const muscleId of allMuscleIds) {
      const base = baseScores[muscleId] ?? 0;
      const final = withDeltas.finalScores[muscleId] ?? 0;
      comparison[muscleId] = { base, final, delta: parseFloat((final - base).toFixed(4)) };
    }
    res.json({ motionId, motionLabel: motion.label, effectiveMotionId, rulesFired, resolvedDeltas, comparison });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/constraints", async (req: Request, res: Response) => {
  try {
    const { motionId, equipmentId } = req.body;
    const motionsMap = await buildMotionsMap();
    const motion = motionsMap[motionId];
    if (!motion) { res.status(404).json({ error: `Motion "${motionId}" not found` }); return; }

    let equipment: Equipment | null = null;
    if (equipmentId) {
      const equipmentList = await queryTable<Equipment>("equipment");
      equipment = equipmentList.find((e) => e.id === equipmentId) ?? null;
    }
    const result = evaluateConstraints({ motion, equipment });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/lint", async (_req: Request, res: Response) => {
  try {
    const motions = await queryTable<Motion>("motions");
    const muscles = await queryTable<Muscle>("muscles");
    const comboRules = await loadComboRules();

    const modifierTables: Record<string, ModifierRow[]> = {};
    for (const [key, pgTable] of Object.entries(MODIFIER_PG_TABLES)) {
      try {
        modifierTables[key] = await queryTable<ModifierRow>(pgTable);
      } catch { /* skip */ }
    }

    const issues = lintAll(motions, muscles, modifierTables, comboRules);
    res.json({
      issues,
      summary: {
        errors: issues.filter((i) => i.severity === "error").length,
        warnings: issues.filter((i) => i.severity === "warning").length,
        info: issues.filter((i) => i.severity === "info").length,
      },
      formatted: formatLintResults(issues),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/sync-defaults", async (req: Request, res: Response) => {
  try {
    const { motionId } = req.body;
    if (!motionId) {
      res.status(400).json({ error: "motionId is required" });
      return;
    }

    const { rows: configRows } = await pool.query(
      `SELECT config_json FROM motion_matrix_configs
       WHERE scope_type = 'motion' AND scope_id = $1
         AND status = 'active' AND is_deleted = FALSE
       ORDER BY updated_at DESC LIMIT 1`,
      [motionId]
    );

    if (configRows.length === 0) {
      res.status(404).json({ error: `No active matrix config for motion "${motionId}"` });
      return;
    }

    const configJson = configRows[0].config_json;
    const tables = configJson?.tables ?? {};
    const defaults: Record<string, string> = {};

    for (const [tableKey, tc] of Object.entries(tables) as [string, any][]) {
      if (tc?.applicability && tc?.default_row_id) {
        defaults[tableKey] = tc.default_row_id;
      }
    }

    await pool.query(
      `UPDATE motions SET default_delta_configs = $1 WHERE id = $2`,
      [JSON.stringify(defaults), motionId]
    );

    res.json({ motionId, synced: defaults });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/manifest", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT table_name, version_seq, last_updated FROM reference_metadata ORDER BY table_name`
    );
    const tables: Record<string, { versionSeq: number; lastUpdated: string }> = {};
    let maxVersion = 0;
    for (const row of rows) {
      tables[row.table_name] = {
        versionSeq: Number(row.version_seq),
        lastUpdated: row.last_updated?.toISOString?.() ?? String(row.last_updated),
      };
      maxVersion = Math.max(maxVersion, Number(row.version_seq));
    }
    res.json({
      source: "postgres",
      referenceVersion: maxVersion,
      tables,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
