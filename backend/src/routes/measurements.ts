import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { paramId } from "../middleware/paramId";
import { wrap } from "../middleware/asyncHandler";
import {
  listMeasurements,
  createMeasurement,
  deleteMeasurement,
} from "../services/measurementService";

const router = Router();
router.use(requireAuth);

const measurementSchema = z.object({
  date: z.string(),
  weight: z.number().optional(),
  bodyFatPercent: z.number().optional(),
  neck: z.number().optional(),
  chest: z.number().optional(),
  waist: z.number().optional(),
  leftArm: z.number().optional(),
  rightArm: z.number().optional(),
  leftThigh: z.number().optional(),
  rightThigh: z.number().optional(),
  unit: z.enum(["lbs", "kg"]).default("lbs"),
  circumferenceUnit: z.enum(["in", "cm"]).default("in"),
});

router.get(
  "/",
  wrap(async (req, res) => {
    res.json(await listMeasurements(req.userId!));
  })
);

router.post(
  "/",
  wrap(async (req, res) => {
    const data = measurementSchema.parse(req.body);
    res.status(201).json(await createMeasurement(req.userId!, data));
  })
);

router.delete(
  "/:id",
  wrap(async (req, res) => {
    await deleteMeasurement(req.userId!, paramId(req));
    res.json({ ok: true });
  })
);

export default router;
