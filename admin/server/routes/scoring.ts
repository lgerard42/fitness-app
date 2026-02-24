import { Router, Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import {
  resolveAllDeltas,
  computeActivation,
  flattenMuscleTargets,
} from "../../../shared/scoring";
import { evaluateConstraints } from "../../../shared/constraints";
import { lintAll, formatLintResults } from "../../../shared/linter/deltaLinter";
import {
  generateManifest,
  hasChanged,
} from "../../../shared/version/manifest";
import type {
  Motion,
  ModifierRow,
  Muscle,
  Equipment,
} from "../../../shared/types";

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TABLES_DIR = path.resolve(__dirname, "../../../src/database/tables");

function readTable<T>(filename: string): T {
  return JSON.parse(
    fs.readFileSync(path.join(TABLES_DIR, filename), "utf-8")
  ) as T;
}

function buildMotionsMap(): Record<string, Motion> {
  const motions = readTable<Motion[]>("motions.json");
  return Object.fromEntries(motions.map((m) => [m.id, m]));
}

function buildModifierTables(): Record<string, Record<string, ModifierRow>> {
  const files: Record<string, string> = {
    motionPaths: "motionPaths.json",
    torsoAngles: "torsoAngles.json",
    torsoOrientations: "torsoOrientations.json",
    resistanceOrigin: "resistanceOrigin.json",
    grips: "grips.json",
    gripWidths: "gripWidths.json",
    elbowRelationship: "elbowRelationship.json",
    executionStyles: "executionStyles.json",
    footPositions: "footPositions.json",
    stanceWidths: "stanceWidths.json",
    stanceTypes: "stanceTypes.json",
    loadPlacement: "loadPlacement.json",
    supportStructures: "supportStructures.json",
    loadingAids: "loadingAids.json",
    rangeOfMotion: "rangeOfMotion.json",
  };

  const tables: Record<string, Record<string, ModifierRow>> = {};
  for (const [key, file] of Object.entries(files)) {
    const filePath = path.join(TABLES_DIR, file);
    if (!fs.existsSync(filePath)) continue;
    const rows = readTable<ModifierRow[]>(file);
    tables[key] = Object.fromEntries(rows.map((r) => [r.id, r]));
  }
  return tables;
}

/**
 * POST /api/scoring/compute
 * Compute activation scores for a given motion + modifier selection.
 * Body: { motionId, selectedModifiers: [{ tableKey, rowId }], policy? }
 */
router.post("/compute", (req: Request, res: Response) => {
  try {
    const { motionId, selectedModifiers, policy } = req.body;

    if (!motionId || !selectedModifiers) {
      res
        .status(400)
        .json({ error: "motionId and selectedModifiers are required" });
      return;
    }

    const motionsMap = buildMotionsMap();
    const modifierTables = buildModifierTables();

    const motion = motionsMap[motionId];
    if (!motion) {
      res.status(404).json({ error: `Motion "${motionId}" not found` });
      return;
    }

    const resolvedDeltas = resolveAllDeltas(
      motionId,
      selectedModifiers,
      motionsMap,
      modifierTables
    );

    const result = computeActivation(
      motion.muscle_targets,
      resolvedDeltas,
      policy
    );

    res.json({
      motionId,
      motionLabel: motion.label,
      ...result,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/scoring/trace
 * Trace/compare base vs base+deltas for a given motion.
 * Body: { motionId, selectedModifiers: [{ tableKey, rowId }] }
 */
router.post("/trace", (req: Request, res: Response) => {
  try {
    const { motionId, selectedModifiers } = req.body;

    const motionsMap = buildMotionsMap();
    const modifierTables = buildModifierTables();

    const motion = motionsMap[motionId];
    if (!motion) {
      res.status(404).json({ error: `Motion "${motionId}" not found` });
      return;
    }

    const baseScores = flattenMuscleTargets(motion.muscle_targets);
    const resolvedDeltas = resolveAllDeltas(
      motionId,
      selectedModifiers || [],
      motionsMap,
      modifierTables
    );

    const withDeltas = computeActivation(
      motion.muscle_targets,
      resolvedDeltas
    );

    // Build comparison
    const comparison: Record<
      string,
      { base: number; final: number; delta: number }
    > = {};

    const allMuscleIds = new Set([
      ...Object.keys(baseScores),
      ...Object.keys(withDeltas.finalScores),
    ]);

    for (const muscleId of allMuscleIds) {
      const base = baseScores[muscleId] ?? 0;
      const final = withDeltas.finalScores[muscleId] ?? 0;
      comparison[muscleId] = {
        base,
        final,
        delta: parseFloat((final - base).toFixed(4)),
      };
    }

    res.json({
      motionId,
      motionLabel: motion.label,
      resolvedDeltas,
      comparison,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/scoring/constraints
 * Evaluate constraints for a given motion + equipment.
 * Body: { motionId, equipmentId? }
 */
router.post("/constraints", (req: Request, res: Response) => {
  try {
    const { motionId, equipmentId } = req.body;

    const motionsMap = buildMotionsMap();
    const motion = motionsMap[motionId];
    if (!motion) {
      res.status(404).json({ error: `Motion "${motionId}" not found` });
      return;
    }

    let equipment: Equipment | null = null;
    if (equipmentId) {
      const equipmentList = readTable<Equipment[]>("equipment.json");
      equipment = equipmentList.find((e) => e.id === equipmentId) ?? null;
    }

    const result = evaluateConstraints({ motion, equipment });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/scoring/lint
 * Run the delta linter across all tables.
 */
router.get("/lint", (_req: Request, res: Response) => {
  try {
    const motions = readTable<Motion[]>("motions.json");
    const muscles = readTable<Muscle[]>("muscles.json");

    const modifierFiles: Record<string, string> = {
      motionPaths: "motionPaths.json",
      torsoAngles: "torsoAngles.json",
      torsoOrientations: "torsoOrientations.json",
      resistanceOrigin: "resistanceOrigin.json",
      grips: "grips.json",
      gripWidths: "gripWidths.json",
      elbowRelationship: "elbowRelationship.json",
      executionStyles: "executionStyles.json",
      footPositions: "footPositions.json",
      stanceWidths: "stanceWidths.json",
      stanceTypes: "stanceTypes.json",
      loadPlacement: "loadPlacement.json",
      supportStructures: "supportStructures.json",
      loadingAids: "loadingAids.json",
      rangeOfMotion: "rangeOfMotion.json",
    };

    const modifierTables: Record<string, ModifierRow[]> = {};
    for (const [key, file] of Object.entries(modifierFiles)) {
      const filePath = path.join(TABLES_DIR, file);
      if (fs.existsSync(filePath)) {
        modifierTables[key] = readTable<ModifierRow[]>(file);
      }
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

/**
 * GET /api/scoring/manifest
 * Generate the current version manifest for all tables.
 */
router.get("/manifest", (_req: Request, res: Response) => {
  try {
    const manifest = generateManifest(TABLES_DIR);
    res.json(manifest);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
