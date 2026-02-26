import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { paramId } from "../middleware/paramId";
import { wrap } from "../middleware/asyncHandler";
import {
  listWorkouts,
  getWorkout,
  createWorkout,
  deleteWorkout,
} from "../services/workoutService";

const router = Router();
router.use(requireAuth);

const setSchema = z.object({
  id: z.string().optional(),
  position: z.number().int(),
  type: z.string().default("Working"),
  weight: z.string().default(""),
  weight2: z.string().optional(),
  reps: z.string().default(""),
  reps2: z.string().optional(),
  duration: z.string().default(""),
  distance: z.string().default(""),
  completed: z.boolean().default(false),
  isWarmup: z.boolean().default(false),
  isDropset: z.boolean().default(false),
  isFailure: z.boolean().default(false),
  restPeriodSeconds: z.number().int().optional(),
  dropSetId: z.string().optional(),
});

const childExerciseSchema = z.object({
  exerciseId: z.string().optional(),
  exerciseName: z.string(),
  category: z.string().default("Lifts"),
  position: z.number().int(),
  notes: z.any().default([]),
  config: z.any().default({}),
  sets: z.array(setSchema).default([]),
});

const exerciseSchema = z.object({
  exerciseId: z.string().optional(),
  exerciseName: z.string(),
  category: z.string().default("Lifts"),
  position: z.number().int(),
  notes: z.any().default([]),
  groupType: z.string().optional(),
  config: z.any().default({}),
  sets: z.array(setSchema).default([]),
  children: z.array(childExerciseSchema).optional(),
});

const createWorkoutSchema = z.object({
  name: z.string(),
  startedAt: z.string().or(z.number()),
  finishedAt: z.string().or(z.number()).optional(),
  duration: z.string().optional(),
  sessionNotes: z.any().default([]),
  exercises: z.array(exerciseSchema).default([]),
});

router.get(
  "/",
  wrap(async (req, res) => {
    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = parseInt((req.query.limit as string) || "20", 10);
    res.json(await listWorkouts(req.userId!, page, limit));
  })
);

router.get(
  "/:id",
  wrap(async (req, res) => {
    res.json(await getWorkout(req.userId!, paramId(req)));
  })
);

router.post(
  "/",
  wrap(async (req, res) => {
    const data = createWorkoutSchema.parse(req.body);
    res.status(201).json(await createWorkout(req.userId!, data));
  })
);

router.delete(
  "/:id",
  wrap(async (req, res) => {
    await deleteWorkout(req.userId!, paramId(req));
    res.json({ ok: true });
  })
);

export default router;
