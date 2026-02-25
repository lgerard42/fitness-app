import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../config/db";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

function wrap(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);
}

const upsertSchema = z.object({
  exerciseId: z.string(),
  weight: z.number(),
  weightUnit: z.enum(["lbs", "kg"]).default("lbs"),
  achievedAt: z.string(),
});

router.get(
  "/",
  wrap(async (req, res) => {
    const records = await prisma.personalRecord.findMany({
      where: { userId: req.userId },
      include: { exercise: { select: { id: true, name: true } } },
      orderBy: { weight: "desc" },
    });

    res.json(
      records.map((pr) => ({
        id: pr.id,
        exerciseId: pr.exerciseId,
        exerciseName: pr.exercise?.name || "",
        weight: pr.weight,
        weightUnit: pr.weightUnit,
        date: pr.achievedAt.toISOString(),
      }))
    );
  })
);

router.post(
  "/",
  wrap(async (req, res) => {
    const data = upsertSchema.parse(req.body);

    const existing = await prisma.personalRecord.findFirst({
      where: {
        userId: req.userId,
        exerciseId: data.exerciseId,
      },
    });

    if (existing && existing.weight >= data.weight) {
      res.json({ updated: false, current: existing.weight });
      return;
    }

    if (existing) {
      const updated = await prisma.personalRecord.update({
        where: { id: existing.id },
        data: {
          weight: data.weight,
          weightUnit: data.weightUnit,
          achievedAt: new Date(data.achievedAt),
        },
        include: { exercise: { select: { id: true, name: true } } },
      });
      res.json({
        updated: true,
        record: {
          id: updated.id,
          exerciseId: updated.exerciseId,
          exerciseName: updated.exercise?.name || "",
          weight: updated.weight,
          weightUnit: updated.weightUnit,
          date: updated.achievedAt.toISOString(),
        },
      });
      return;
    }

    const created = await prisma.personalRecord.create({
      data: {
        userId: req.userId!,
        exerciseId: data.exerciseId,
        weight: data.weight,
        weightUnit: data.weightUnit,
        achievedAt: new Date(data.achievedAt),
      },
      include: { exercise: { select: { id: true, name: true } } },
    });

    res.status(201).json({
      updated: true,
      record: {
        id: created.id,
        exerciseId: created.exerciseId,
        exerciseName: created.exercise?.name || "",
        weight: created.weight,
        weightUnit: created.weightUnit,
        date: created.achievedAt.toISOString(),
      },
    });
  })
);

export default router;
