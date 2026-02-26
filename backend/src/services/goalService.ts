import { prisma } from "../config/db";

export type CreateGoalData = {
  type: "strength" | "consistency";
  exerciseId?: string;
  targetWeight?: number;
  targetWeightUnit?: "lbs" | "kg";
  targetWorkoutsPerWeek?: number;
};

export type UpdateGoalData = Partial<CreateGoalData> & {
  completed?: boolean;
};

export async function listGoals(userId: string) {
  return prisma.userGoal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { exercise: { select: { id: true, name: true } } },
  });
}

export async function createGoal(userId: string, data: CreateGoalData) {
  return prisma.userGoal.create({
    data: { userId, ...data },
  });
}

export async function updateGoal(userId: string, id: string, data: UpdateGoalData) {
  const existing = await prisma.userGoal.findFirst({
    where: { id, userId },
  });
  if (!existing) throw Object.assign(new Error("Goal not found"), { status: 404 });
  return prisma.userGoal.update({ where: { id }, data });
}

export async function deleteGoal(userId: string, id: string) {
  const existing = await prisma.userGoal.findFirst({
    where: { id, userId },
  });
  if (!existing) throw Object.assign(new Error("Goal not found"), { status: 404 });
  await prisma.userGoal.delete({ where: { id } });
}
