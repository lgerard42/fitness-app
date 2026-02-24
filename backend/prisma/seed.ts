import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("demo123", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@onlyfit.com" },
    update: {},
    create: {
      email: "demo@onlyfit.com",
      name: "Alex Johnson",
      passwordHash,
      bodyWeight: 180,
    },
  });

  await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      weightUnit: "lbs",
      defaultRestTimerSeconds: 90,
    },
  });

  const bench = await prisma.exerciseLibrary.upsert({
    where: { id: "seed-bench-press" },
    update: {},
    create: {
      id: "seed-bench-press",
      userId: user.id,
      name: "Bench Press",
      category: "Lifts",
    },
  });

  const squat = await prisma.exerciseLibrary.upsert({
    where: { id: "seed-squat" },
    update: {},
    create: {
      id: "seed-squat",
      userId: user.id,
      name: "Squat",
      category: "Lifts",
    },
  });

  const deadlift = await prisma.exerciseLibrary.upsert({
    where: { id: "seed-deadlift" },
    update: {},
    create: {
      id: "seed-deadlift",
      userId: user.id,
      name: "Deadlift",
      category: "Lifts",
    },
  });

  const ohp = await prisma.exerciseLibrary.upsert({
    where: { id: "seed-ohp" },
    update: {},
    create: {
      id: "seed-ohp",
      userId: user.id,
      name: "Overhead Press",
      category: "Lifts",
    },
  });

  // Seed a workout
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  await prisma.workout.upsert({
    where: { id: "seed-workout-1" },
    update: {},
    create: {
      id: "seed-workout-1",
      userId: user.id,
      name: "Push Day",
      startedAt: yesterday,
      finishedAt: new Date(yesterday.getTime() + 60 * 60 * 1000),
      duration: "60m",
      exercises: {
        create: [
          {
            exerciseId: bench.id,
            exerciseName: "Bench Press",
            category: "Lifts",
            position: 0,
            sets: {
              create: [
                { position: 0, type: "Warmup", weight: "135", reps: "10", completed: true, isWarmup: true },
                { position: 1, type: "Working", weight: "185", reps: "8", completed: true },
                { position: 2, type: "Working", weight: "205", reps: "6", completed: true },
                { position: 3, type: "Working", weight: "215", reps: "5", completed: true },
              ],
            },
          },
          {
            exerciseId: ohp.id,
            exerciseName: "Overhead Press",
            category: "Lifts",
            position: 1,
            sets: {
              create: [
                { position: 0, type: "Working", weight: "95", reps: "10", completed: true },
                { position: 1, type: "Working", weight: "105", reps: "8", completed: true },
                { position: 2, type: "Working", weight: "115", reps: "6", completed: true },
              ],
            },
          },
        ],
      },
    },
  });

  // Seed body measurement
  await prisma.bodyMeasurement.upsert({
    where: { id: "seed-measurement-1" },
    update: {},
    create: {
      id: "seed-measurement-1",
      userId: user.id,
      date: yesterday,
      weight: 180,
      bodyFatPercent: 15,
      unit: "lbs",
      circumferenceUnit: "in",
    },
  });

  // Seed a goal
  await prisma.userGoal.upsert({
    where: { id: "seed-goal-1" },
    update: {},
    create: {
      id: "seed-goal-1",
      userId: user.id,
      type: "strength",
      exerciseId: bench.id,
      targetWeight: 225,
      targetWeightUnit: "lbs",
    },
  });

  // Seed a PR
  await prisma.personalRecord.upsert({
    where: { id: "seed-pr-1" },
    update: {},
    create: {
      id: "seed-pr-1",
      userId: user.id,
      exerciseId: bench.id,
      weight: 215,
      weightUnit: "lbs",
      achievedAt: yesterday,
    },
  });

  console.log("Seed complete!");
  console.log(`  Demo user: demo@onlyfit.com / demo123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
