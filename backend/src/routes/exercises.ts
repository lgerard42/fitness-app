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

const createExerciseSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["Lifts", "Cardio", "Training"]).default("Lifts"),
  assistedNegative: z.boolean().default(false),
  config: z.any().default({}),
});

router.get(
  "/",
  wrap(async (req, res) => {
    const exercises = await prisma.exerciseLibrary.findMany({
      where: { userId: req.userId },
      orderBy: { name: "asc" },
    });
    res.json(exercises);
  })
);

router.post(
  "/",
  wrap(async (req, res) => {
    const data = createExerciseSchema.parse(req.body);
    const exercise = await prisma.exerciseLibrary.create({
      data: { userId: req.userId!, ...data },
    });
    res.status(201).json(exercise);
  })
);

router.put(
  "/:id",
  wrap(async (req, res) => {
    const id = paramId(req);
    const existing = await prisma.exerciseLibrary.findFirst({
      where: { id, userId: req.userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Exercise not found" });
      return;
    }
    const data = createExerciseSchema.partial().parse(req.body);
    const exercise = await prisma.exerciseLibrary.update({
      where: { id },
      data,
    });
    res.json(exercise);
  })
);

router.delete(
  "/:id",
  wrap(async (req, res) => {
    const id = paramId(req);
    const existing = await prisma.exerciseLibrary.findFirst({
      where: { id, userId: req.userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Exercise not found" });
      return;
    }
    await prisma.exerciseLibrary.delete({ where: { id } });
    res.json({ ok: true });
  })
);

export default router;
