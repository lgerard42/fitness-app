import { prisma } from "../config/db";

type SetInput = {
  position: number;
  type?: string;
  weight?: string;
  weight2?: string;
  reps?: string;
  reps2?: string;
  duration?: string;
  distance?: string;
  completed?: boolean;
  isWarmup?: boolean;
  isDropset?: boolean;
  isFailure?: boolean;
  restPeriodSeconds?: number;
  dropSetId?: string;
};

type ChildExerciseInput = {
  exerciseId?: string;
  exerciseName: string;
  category?: string;
  position: number;
  notes?: any;
  config?: any;
  sets?: SetInput[];
};

export type ExerciseInput = {
  exerciseId?: string;
  exerciseName: string;
  category?: string;
  position: number;
  notes?: any;
  groupType?: string;
  config?: any;
  sets?: SetInput[];
  children?: ChildExerciseInput[];
};

export type CreateWorkoutData = {
  name: string;
  startedAt: string | number;
  finishedAt?: string | number;
  duration?: string;
  sessionNotes?: any;
  exercises?: ExerciseInput[];
};

function mapSets(sets: SetInput[] = []) {
  return sets.map((s) => ({
    position: s.position,
    type: s.type ?? "Working",
    weight: s.weight ?? "",
    weight2: s.weight2,
    reps: s.reps ?? "",
    reps2: s.reps2,
    duration: s.duration ?? "",
    distance: s.distance ?? "",
    completed: s.completed ?? false,
    isWarmup: s.isWarmup ?? false,
    isDropset: s.isDropset ?? false,
    isFailure: s.isFailure ?? false,
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

export async function listWorkouts(
  userId: string,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;

  const [workouts, total] = await Promise.all([
    prisma.workout.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      skip,
      take: limit,
      include: workoutInclude,
    }),
    prisma.workout.count({ where: { userId } }),
  ]);

  return { workouts, total, page, limit };
}

export async function getWorkout(userId: string, id: string) {
  const workout = await prisma.workout.findFirst({
    where: { id, userId },
    include: workoutInclude,
  });
  if (!workout) throw Object.assign(new Error("Workout not found"), { status: 404 });
  return workout;
}

export async function createWorkout(userId: string, data: CreateWorkoutData) {
  const exercises = data.exercises ?? [];
  return prisma.workout.create({
    data: {
      userId,
      name: data.name,
      startedAt: new Date(data.startedAt),
      finishedAt: data.finishedAt ? new Date(data.finishedAt) : undefined,
      duration: data.duration,
      sessionNotes: data.sessionNotes,
      exercises: {
        create: exercises.map((ex) => ({
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
                create: ex.children.map((child) => ({
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
}

export async function deleteWorkout(userId: string, id: string) {
  const workout = await prisma.workout.findFirst({
    where: { id, userId },
  });
  if (!workout) throw Object.assign(new Error("Workout not found"), { status: 404 });
  await prisma.workout.delete({ where: { id } });
}
