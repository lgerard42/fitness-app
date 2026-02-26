import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { paramId } from "../middleware/paramId";
import { wrap } from "../middleware/asyncHandler";
import {
  listGoals,
  createGoal,
  updateGoal,
  deleteGoal,
} from "../services/goalService";

const router = Router();
router.use(requireAuth);

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
    res.json(await listGoals(req.userId!));
  })
);

router.post(
  "/",
  wrap(async (req, res) => {
    const data = goalSchema.parse(req.body);
    res.status(201).json(await createGoal(req.userId!, data));
  })
);

router.put(
  "/:id",
  wrap(async (req, res) => {
    const data = goalSchema
      .partial()
      .merge(z.object({ completed: z.boolean().optional() }))
      .parse(req.body);
    res.json(await updateGoal(req.userId!, paramId(req), data));
  })
);

router.delete(
  "/:id",
  wrap(async (req, res) => {
    await deleteGoal(req.userId!, paramId(req));
    res.json({ ok: true });
  })
);

export default router;
