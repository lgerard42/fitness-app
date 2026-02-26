import { prisma } from "../config/db";

export type CreateMeasurementData = {
  date: string;
  weight?: number;
  bodyFatPercent?: number;
  neck?: number;
  chest?: number;
  waist?: number;
  leftArm?: number;
  rightArm?: number;
  leftThigh?: number;
  rightThigh?: number;
  unit: "lbs" | "kg";
  circumferenceUnit: "in" | "cm";
};

export async function listMeasurements(userId: string) {
  return prisma.bodyMeasurement.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });
}

export async function createMeasurement(userId: string, data: CreateMeasurementData) {
  return prisma.bodyMeasurement.create({
    data: {
      userId,
      ...data,
      date: new Date(data.date),
    },
  });
}

export async function deleteMeasurement(userId: string, id: string) {
  const existing = await prisma.bodyMeasurement.findFirst({
    where: { id, userId },
  });
  if (!existing)
    throw Object.assign(new Error("Measurement not found"), { status: 404 });
  await prisma.bodyMeasurement.delete({ where: { id } });
}
