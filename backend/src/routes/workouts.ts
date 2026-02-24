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

type SetInput = z.infer<typeof setSchema>;
type ChildExerciseInput = z.infer<typeof childExerciseSchema>;
type ExerciseInput = z.infer<typeof exerciseSchema>;

function mapSets(sets: SetInput[]) {
  return sets.map((s) => ({
    position: s.position,
    type: s.type,
    weight: s.weight,
    weight2: s.weight2,
    reps: s.reps,
    reps2: s.reps2,
    duration: s.duration,
    distance: s.distance,
    completed: s.completed,
    isWarmup: s.isWarmup,
    isDropset: s.isDropset,
    isFailure: s.isFailure,
    restPeriodSeconds: s.restPeriodSeconds,
    dropSetId: s.dropSetId,
  }));
}

const workoutInclude = {
  exercises: {
    where: { parentId: null },
    orderBy: { position: "asc" as const },
    include: {
      sets: { orderBy: { position: "asc" as const } },
      children: {
        orderBy: { position: "asc" as const },
        include: { sets: { orderBy: { position: "asc" as const } } },
      },
    },
  },
};

router.get(
  "/",
  wrap(async (req, res) => {
    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = parseInt((req.query.limit as string) || "20", 10);
    const skip = (page - 1) * limit;

    const [workouts, total] = await Promise.all([
      prisma.workout.findMany({
        where: { userId: req.userId },
        orderBy: { startedAt: "desc" },
        skip,
        take: limit,
        include: workoutInclude,
      }),
      prisma.workout.count({ where: { userId: req.userId } }),
    ]);

    res.json({ workouts, total, page, limit });
  })
);

router.get(
  "/:id",
  wrap(async (req, res) => {
    const id = paramId(req);
    const workout = await prisma.workout.findFirst({
      where: { id, userId: req.userId },
      include: workoutInclude,
    });
    if (!workout) {
      res.status(404).json({ error: "Workout not found" });
      return;
    }
    res.json(workout);
  })
);

router.post(
  "/",
  wrap(async (req, res) => {
    const data = createWorkoutSchema.parse(req.body);

    const workout = await prisma.workout.create({
      data: {
        userId: req.userId!,
        name: data.name,
        startedAt: new Date(data.startedAt),
        finishedAt: data.finishedAt ? new Date(data.finishedAt) : undefined,
        duration: data.duration,
        sessionNotes: data.sessionNotes,
        exercises: {
          create: data.exercises.map((ex: ExerciseInput) => ({
            exerciseId: ex.exerciseId || undefined,
            exerciseName: ex.exerciseName,
            category: ex.category,
            position: ex.position,
            notes: ex.notes,
            groupType: ex.groupType,
            config: ex.config,
            sets: { create: mapSets(ex.sets) },
            children: ex.children
              ? {
                  create: ex.children.map((child: ChildExerciseInput) => ({
                    workoutId: "",
                    exerciseId: child.exerciseId || undefined,
                    exerciseName: child.exerciseName,
                    category: child.category,
                    position: child.position,
                    notes: child.notes,
                    config: child.config,
                    sets: { create: mapSets(child.sets) },
                  })),
                }
              : undefined,
          })),
        },
      },
      include: workoutInclude,
    });

    res.status(201).json(workout);
  })
);

router.delete(
  "/:id",
  wrap(async (req, res) => {
    const id = paramId(req);
    const workout = await prisma.workout.findFirst({
      where: { id, userId: req.userId },
    });
    if (!workout) {
      res.status(404).json({ error: "Workout not found" });
      return;
    }
    await prisma.workout.delete({ where: { id } });
    res.json({ ok: true });
  })
);

export default router;
