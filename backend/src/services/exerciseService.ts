import { prisma } from "../config/db";

export type CreateExerciseData = {
  name: string;
  category: string;
  assistedNegative: boolean;
  config?: any;
};

export async function listExercises(userId: string) {
  return prisma.exerciseLibrary.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
}

export async function createExercise(userId: string, data: CreateExerciseData) {
  return prisma.exerciseLibrary.create({
    data: { userId, ...data },
  });
}

export async function updateExercise(
  userId: string,
  id: string,
  data: Partial<CreateExerciseData>
) {
  const existing = await prisma.exerciseLibrary.findFirst({
    where: { id, userId },
  });
  if (!existing) throw Object.assign(new Error("Exercise not found"), { status: 404 });
  return prisma.exerciseLibrary.update({ where: { id }, data });
}

export async function deleteExercise(userId: string, id: string) {
  const existing = await prisma.exerciseLibrary.findFirst({
    where: { id, userId },
  });
  if (!existing) throw Object.assign(new Error("Exercise not found"), { status: 404 });
  await prisma.exerciseLibrary.delete({ where: { id } });
}
