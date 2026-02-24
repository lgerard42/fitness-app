import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import {
  resolveAllDeltas,
  computeActivation,
  flattenMuscleTargets,
} from "../../../shared/scoring";
import { evaluateConstraints } from "../../../shared/constraints";
import type {
  Motion,
  ModifierRow,
  Equipment,
} from "../../../shared/types";
import { config } from "../config";

const router = Router();

function getTablesDir(): string {
  return config.tablesDir || path.resolve(__dirname, "../../../src/database/tables");
}

function readTable<T>(filename: string): T {
  return JSON.parse(
    fs.readFileSync(path.join(getTablesDir(), filename), "utf-8")
  ) as T;
}

const MODIFIER_FILES: Record<string, string> = {
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

function buildMotionsMap(): Record<string, Motion> {
  const motions = readTable<Motion[]>("motions.json");
  return Object.fromEntries(motions.map((m) => [m.id, m]));
}

function buildModifierTables(): Record<string, Record<string, ModifierRow>> {
  const tables: Record<string, Record<string, ModifierRow>> = {};
  for (const [key, file] of Object.entries(MODIFIER_FILES)) {
    const filePath = path.join(getTablesDir(), file);
    if (!fs.existsSync(filePath)) continue;
    const rows = readTable<ModifierRow[]>(file);
    tables[key] = Object.fromEntries(rows.map((r) => [r.id, r]));
  }
  return tables;
}

/** POST /api/scoring/compute */
router.post("/compute", (req: Request, res: Response) => {
  try {
    const { motionId, selectedModifiers, policy } = req.body;
    if (!motionId || !selectedModifiers) {
      res.status(400).json({ error: "motionId and selectedModifiers required" });
      return;
    }

    const motionsMap = buildMotionsMap();
    const motion = motionsMap[motionId];
    if (!motion) {
      res.status(404).json({ error: `Motion "${motionId}" not found` });
      return;
    }

    const modifierTables = buildModifierTables();
    const deltas = resolveAllDeltas(motionId, selectedModifiers, motionsMap, modifierTables);
    const result = computeActivation(motion.muscle_targets, deltas, policy);

    res.json({ motionId, motionLabel: motion.label, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/scoring/trace */
router.post("/trace", (req: Request, res: Response) => {
  try {
    const { motionId, selectedModifiers } = req.body;
    const motionsMap = buildMotionsMap();
    const motion = motionsMap[motionId];
    if (!motion) {
      res.status(404).json({ error: `Motion "${motionId}" not found` });
      return;
    }

    const modifierTables = buildModifierTables();
    const baseScores = flattenMuscleTargets(motion.muscle_targets);
    const deltas = resolveAllDeltas(motionId, selectedModifiers || [], motionsMap, modifierTables);
    const withDeltas = computeActivation(motion.muscle_targets, deltas);

    const comparison: Record<string, { base: number; final: number; delta: number }> = {};
    const allIds = new Set([...Object.keys(baseScores), ...Object.keys(withDeltas.finalScores)]);
    for (const id of allIds) {
      const base = baseScores[id] ?? 0;
      const final = withDeltas.finalScores[id] ?? 0;
      comparison[id] = { base, final, delta: parseFloat((final - base).toFixed(4)) };
    }

    res.json({ motionId, motionLabel: motion.label, resolvedDeltas: deltas, comparison });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/scoring/constraints */
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
      const list = readTable<Equipment[]>("equipment.json");
      equipment = list.find((e) => e.id === equipmentId) ?? null;
    }

    res.json(evaluateConstraints({ motion, equipment }));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
