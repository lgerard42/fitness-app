import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { paramId } from "../middleware/paramId";
import { wrap } from "../middleware/asyncHandler";
import {
  listExercises,
  createExercise,
  updateExercise,
  deleteExercise,
} from "../services/exerciseService";

const router = Router();
router.use(requireAuth);

const createExerciseSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["Lifts", "Cardio", "Training"]).default("Lifts"),
  assistedNegative: z.boolean().default(false),
  config: z.any().default({}),
});

router.get(
  "/",
  wrap(async (req, res) => {
    res.json(await listExercises(req.userId!));
  })
);

router.post(
  "/",
  wrap(async (req, res) => {
    const data = createExerciseSchema.parse(req.body);
    res.status(201).json(await createExercise(req.userId!, data));
  })
);

router.put(
  "/:id",
  wrap(async (req, res) => {
    const data = createExerciseSchema.partial().parse(req.body);
    res.json(await updateExercise(req.userId!, paramId(req), data));
  })
);

router.delete(
  "/:id",
  wrap(async (req, res) => {
    await deleteExercise(req.userId!, paramId(req));
    res.json({ ok: true });
  })
);

export default router;
