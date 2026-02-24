import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../config/db";
import { requireAuth } from "../middleware/auth";
import { paramId } from "../middleware/paramId";

const router = Router();
router.use(requireAuth);

function wrap(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);
}

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
    const measurements = await prisma.bodyMeasurement.findMany({
      where: { userId: req.userId },
      orderBy: { date: "desc" },
    });
    res.json(measurements);
  })
);

router.post(
  "/",
  wrap(async (req, res) => {
    const data = measurementSchema.parse(req.body);
    const measurement = await prisma.bodyMeasurement.create({
      data: {
        userId: req.userId!,
        ...data,
        date: new Date(data.date),
      },
    });
    res.status(201).json(measurement);
  })
);

router.delete(
  "/:id",
  wrap(async (req, res) => {
    const id = paramId(req);
    const existing = await prisma.bodyMeasurement.findFirst({
      where: { id, userId: req.userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Measurement not found" });
      return;
    }
    await prisma.bodyMeasurement.delete({ where: { id } });
    res.json({ ok: true });
  })
);

export default router;
