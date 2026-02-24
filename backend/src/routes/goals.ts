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

const goalSchema = z.object({
  type: z.enum(["strength", "consistency"]),
  exerciseId: z.string().optional(),
  targetWeight: z.number().optional(),
  targetWeightUnit: z.enum(["lbs", "kg"]).optional(),
  targetWorkoutsPerWeek: z.number().int().optional(),
});

router.get(
  "/",
  wrap(async (req, res) => {
    const goals = await prisma.userGoal.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      include: { exercise: { select: { id: true, name: true } } },
    });
    res.json(goals);
  })
);

router.post(
  "/",
  wrap(async (req, res) => {
    const data = goalSchema.parse(req.body);
    const goal = await prisma.userGoal.create({
      data: { userId: req.userId!, ...data },
    });
    res.status(201).json(goal);
  })
);

router.put(
  "/:id",
  wrap(async (req, res) => {
    const id = paramId(req);
    const existing = await prisma.userGoal.findFirst({
      where: { id, userId: req.userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }
    const data = goalSchema
      .partial()
      .merge(z.object({ completed: z.boolean().optional() }))
      .parse(req.body);
    const goal = await prisma.userGoal.update({
      where: { id },
      data,
    });
    res.json(goal);
  })
);

router.delete(
  "/:id",
  wrap(async (req, res) => {
    const id = paramId(req);
    const existing = await prisma.userGoal.findFirst({
      where: { id, userId: req.userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }
    await prisma.userGoal.delete({ where: { id } });
    res.json({ ok: true });
  })
);

export default router;
