import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

function wrap(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);
}

router.get(
  "/",
  wrap(async (req, res) => {
    const userId = req.userId!;

    const [dbUser, workouts, measurements, goals, personalRecords] =
      await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.workout.findMany({
          where: { userId },
          orderBy: { startedAt: "desc" },
          include: {
            exercises: {
              where: { parentId: null },
              orderBy: { position: "asc" },
              include: {
                sets: { orderBy: { position: "asc" } },
                children: {
                  orderBy: { position: "asc" },
                  include: { sets: { orderBy: { position: "asc" } } },
                },
              },
            },
          },
        }),
        prisma.bodyMeasurement.findMany({
          where: { userId },
          orderBy: { date: "desc" },
        }),
        prisma.userGoal.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          include: { exercise: { select: { id: true, name: true } } },
        }),
        prisma.personalRecord.findMany({
          where: { userId },
          include: { exercise: { select: { id: true, name: true } } },
        }),
      ]);

    if (!dbUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const user = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      avatarUrl: dbUser.avatarUrl,
      createdAt: dbUser.createdAt.toISOString(),
      updatedAt: dbUser.updatedAt.toISOString(),
    };

    function mapSet(s: any) {
      return {
        id: s.id,
        type: s.type,
        weight: s.weight,
        weight2: s.weight2 || undefined,
        reps: s.reps,
        reps2: s.reps2 || undefined,
        duration: s.duration,
        distance: s.distance,
        completed: s.completed,
        isWarmup: s.isWarmup,
        isDropset: s.isDropset,
        isFailure: s.isFailure,
        restPeriodSeconds: s.restPeriodSeconds || undefined,
        dropSetId: s.dropSetId || undefined,
      };
    }

    function mapExercise(ex: any) {
      return {
        instanceId: ex.id,
        exerciseId: ex.exerciseId || ex.id,
        name: ex.exerciseName,
        category: ex.category,
        type: "exercise" as const,
        sets: ex.sets.map(mapSet),
        notes: ex.notes || [],
      };
    }

    function mapExerciseItem(ex: any) {
      if (ex.groupType && ex.children?.length > 0) {
        return {
          instanceId: ex.id,
          type: "group" as const,
          groupType: ex.groupType,
          children: ex.children.map(mapExercise),
        };
      }
      return mapExercise(ex);
    }

    const workoutHistory = workouts.map((w) => ({
      id: w.id,
      name: w.name,
      startedAt: w.startedAt.getTime(),
      finishedAt: w.finishedAt?.getTime(),
      duration: w.duration || undefined,
      date: w.startedAt.toISOString(),
      exercises: w.exercises.map(mapExerciseItem),
      sessionNotes: w.sessionNotes || [],
    }));

    const exerciseStats: Record<string, any> = {};
    for (const w of workouts) {
      for (const ex of w.exercises) {
        const key = ex.exerciseId || ex.exerciseName;
        if (!exerciseStats[key]) {
          exerciseStats[key] = { pr: 0, lastPerformed: null, history: [] };
        }
        const stat = exerciseStats[key];
        const workingSets = ex.sets
          .filter((s: any) => !s.isWarmup)
          .map((s: any) => ({
            weight: s.weight,
            weight2: s.weight2 || undefined,
            reps: s.reps,
            duration: s.duration,
            distance: s.distance,
            isWarmup: s.isWarmup,
            isFailure: s.isFailure,
            dropSetId: s.dropSetId || null,
          }));

        if (workingSets.length > 0) {
          stat.history.push({
            date: w.startedAt.toISOString(),
            sets: workingSets,
          });
        }

        for (const s of ex.sets) {
          const weight = parseFloat(s.weight) || 0;
          if (weight > stat.pr) stat.pr = weight;
        }

        const dateStr = w.startedAt.toISOString();
        if (!stat.lastPerformed || dateStr > stat.lastPerformed) {
          stat.lastPerformed = dateStr;
        }
      }
    }

    const bodyMeasurements = measurements.map((m) => ({
      id: m.id,
      date: m.date.toISOString(),
      weight: m.weight ?? undefined,
      bodyFatPercent: m.bodyFatPercent ?? undefined,
      neck: m.neck ?? undefined,
      chest: m.chest ?? undefined,
      waist: m.waist ?? undefined,
      leftArm: m.leftArm ?? undefined,
      rightArm: m.rightArm ?? undefined,
      leftThigh: m.leftThigh ?? undefined,
      rightThigh: m.rightThigh ?? undefined,
      unit: m.unit,
      circumferenceUnit: m.circumferenceUnit,
    }));

    const goalList = goals.map((g) => ({
      id: g.id,
      type: g.type,
      exerciseId: g.exerciseId || undefined,
      exerciseName: g.exercise?.name || undefined,
      targetWeight: g.targetWeight ?? undefined,
      targetWeightUnit: g.targetWeightUnit || undefined,
      targetWorkoutsPerWeek: g.targetWorkoutsPerWeek ?? undefined,
      currentProgress: g.type === "strength"
        ? (exerciseStats[g.exerciseId || ""]?.pr || 0)
        : undefined,
      createdAt: g.createdAt.toISOString(),
      completed: g.completed,
    }));

    const prList = personalRecords.map((pr) => ({
      exerciseId: pr.exerciseId,
      exerciseName: pr.exercise?.name || "",
      weight: pr.weight,
      weightUnit: pr.weightUnit,
      date: pr.achievedAt.toISOString(),
    }));

    res.json({
      user,
      workoutHistory,
      exerciseStats,
      bodyMeasurements,
      goals: goalList,
      personalRecords: prList,
    });
  })
);

export default router;
