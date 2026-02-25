/**
 * Scoring engine routes -- loads all data from Postgres.
 */
import { Router, Request, Response } from "express";
import { pool } from "../../drizzle/db";
import {
  resolveAllDeltas,
  computeActivation,
  flattenMuscleTargets,
} from "../../../../shared/scoring";
import { evaluateConstraints } from "../../../../shared/constraints";
import { lintAll, formatLintResults } from "../../../../shared/linter/deltaLinter";
import type {
  Motion,
  ModifierRow,
  Muscle,
  Equipment,
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

    const resolvedDeltas = resolveAllDeltas(motionId, selectedModifiers, motionsMap, modifierTables);
    const result = computeActivation(motion.muscle_targets, resolvedDeltas, policy);
    res.json({ motionId, motionLabel: motion.label, ...result });
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

    const baseScores = flattenMuscleTargets(motion.muscle_targets);
    const resolvedDeltas = resolveAllDeltas(motionId, selectedModifiers || [], motionsMap, modifierTables);
    const withDeltas = computeActivation(motion.muscle_targets, resolvedDeltas);

    const comparison: Record<string, { base: number; final: number; delta: number }> = {};
    const allMuscleIds = new Set([...Object.keys(baseScores), ...Object.keys(withDeltas.finalScores)]);
    for (const muscleId of allMuscleIds) {
      const base = baseScores[muscleId] ?? 0;
      const final = withDeltas.finalScores[muscleId] ?? 0;
      comparison[muscleId] = { base, final, delta: parseFloat((final - base).toFixed(4)) };
    }
    res.json({ motionId, motionLabel: motion.label, resolvedDeltas, comparison });
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

    const modifierTables: Record<string, ModifierRow[]> = {};
    for (const [key, pgTable] of Object.entries(MODIFIER_PG_TABLES)) {
      try {
        modifierTables[key] = await queryTable<ModifierRow>(pgTable);
      } catch { /* skip */ }
    }

    const issues = lintAll(motions, muscles, modifierTables);
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
