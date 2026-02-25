import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function daysAgoFinished(n: number, durationMs: number): Date {
  return new Date(daysAgo(n).getTime() + durationMs);
}

interface SetDef {
  position: number;
  weight: string;
  reps: string;
  isWarmup?: boolean;
  type?: string;
}

interface ExerciseDef {
  exerciseId: string;
  exerciseName: string;
  position: number;
  sets: SetDef[];
}

interface WorkoutDef {
  id: string;
  name: string;
  daysAgo: number;
  durationMs: number;
  duration: string;
  exercises: ExerciseDef[];
}

async function main() {
  console.log("Seeding database with comprehensive dummy data...");

  const passwordHash = await bcrypt.hash("password123", 12);

  const user = await prisma.user.upsert({
    where: { email: "alex@example.com" },
    update: { name: "Alex Johnson", bodyWeight: 182 },
    create: {
      email: "alex@example.com",
      name: "Alex Johnson",
      passwordHash,
      bodyWeight: 182,
    },
  });

  await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, weightUnit: "lbs", defaultRestTimerSeconds: 90 },
  });

  const exerciseDefs = [
    { id: "seed-bench-press", name: "Bench Press" },
    { id: "seed-squat", name: "Barbell Squat" },
    { id: "seed-deadlift", name: "Deadlift" },
    { id: "seed-ohp", name: "Overhead Press" },
    { id: "seed-barbell-row", name: "Barbell Row" },
    { id: "seed-pullup", name: "Pull-ups" },
    { id: "seed-rdl", name: "Romanian Deadlift" },
    { id: "seed-leg-press", name: "Leg Press" },
    { id: "seed-incline-db", name: "Incline Dumbbell Press" },
    { id: "seed-tricep-pushdown", name: "Tricep Pushdown" },
    { id: "seed-barbell-curl", name: "Barbell Curl" },
    { id: "seed-calf-raise", name: "Standing Calf Raise" },
  ];

  const exercises: Record<string, { id: string; name: string }> = {};
  for (const def of exerciseDefs) {
    const ex = await prisma.exerciseLibrary.upsert({
      where: { id: def.id },
      update: { name: def.name },
      create: { id: def.id, userId: user.id, name: def.name, category: "Lifts" },
    });
    exercises[def.id] = ex;
  }

  await prisma.personalRecord.deleteMany({ where: { userId: user.id } });
  await prisma.userGoal.deleteMany({ where: { userId: user.id } });
  await prisma.bodyMeasurement.deleteMany({ where: { userId: user.id } });
  await prisma.workout.deleteMany({ where: { userId: user.id } });

  const workouts: WorkoutDef[] = [
    {
      id: "seed-w1", name: "Push Day", daysAgo: 1, durationMs: 3600000, duration: "60m",
      exercises: [
        { exerciseId: "seed-bench-press", exerciseName: "Bench Press", position: 0, sets: [
          { position: 0, weight: "135", reps: "10", isWarmup: true },
          { position: 1, weight: "185", reps: "8" },
          { position: 2, weight: "205", reps: "6" },
          { position: 3, weight: "215", reps: "5" },
        ]},
        { exerciseId: "seed-ohp", exerciseName: "Overhead Press", position: 1, sets: [
          { position: 0, weight: "95", reps: "10" },
          { position: 1, weight: "105", reps: "8" },
          { position: 2, weight: "115", reps: "6" },
        ]},
        { exerciseId: "seed-incline-db", exerciseName: "Incline Dumbbell Press", position: 2, sets: [
          { position: 0, weight: "60", reps: "10" },
          { position: 1, weight: "65", reps: "8" },
          { position: 2, weight: "70", reps: "8" },
        ]},
        { exerciseId: "seed-tricep-pushdown", exerciseName: "Tricep Pushdown", position: 3, sets: [
          { position: 0, weight: "50", reps: "12" },
          { position: 1, weight: "55", reps: "10" },
          { position: 2, weight: "60", reps: "10" },
        ]},
      ],
    },
    {
      id: "seed-w2", name: "Pull Day", daysAgo: 3, durationMs: 4200000, duration: "70m",
      exercises: [
        { exerciseId: "seed-deadlift", exerciseName: "Deadlift", position: 0, sets: [
          { position: 0, weight: "225", reps: "5", isWarmup: true },
          { position: 1, weight: "315", reps: "5" },
          { position: 2, weight: "365", reps: "3" },
          { position: 3, weight: "385", reps: "2" },
        ]},
        { exerciseId: "seed-barbell-row", exerciseName: "Barbell Row", position: 1, sets: [
          { position: 0, weight: "135", reps: "10" },
          { position: 1, weight: "155", reps: "8" },
          { position: 2, weight: "165", reps: "8" },
        ]},
        { exerciseId: "seed-pullup", exerciseName: "Pull-ups", position: 2, sets: [
          { position: 0, weight: "0", reps: "12" },
          { position: 1, weight: "25", reps: "8" },
          { position: 2, weight: "25", reps: "7" },
        ]},
        { exerciseId: "seed-barbell-curl", exerciseName: "Barbell Curl", position: 3, sets: [
          { position: 0, weight: "65", reps: "12" },
          { position: 1, weight: "75", reps: "10" },
          { position: 2, weight: "75", reps: "9" },
        ]},
      ],
    },
    {
      id: "seed-w3", name: "Leg Day", daysAgo: 5, durationMs: 3900000, duration: "65m",
      exercises: [
        { exerciseId: "seed-squat", exerciseName: "Barbell Squat", position: 0, sets: [
          { position: 0, weight: "185", reps: "8", isWarmup: true },
          { position: 1, weight: "245", reps: "6" },
          { position: 2, weight: "275", reps: "5" },
          { position: 3, weight: "295", reps: "3" },
        ]},
        { exerciseId: "seed-rdl", exerciseName: "Romanian Deadlift", position: 1, sets: [
          { position: 0, weight: "185", reps: "10" },
          { position: 1, weight: "205", reps: "8" },
          { position: 2, weight: "225", reps: "8" },
        ]},
        { exerciseId: "seed-leg-press", exerciseName: "Leg Press", position: 2, sets: [
          { position: 0, weight: "360", reps: "12" },
          { position: 1, weight: "410", reps: "10" },
          { position: 2, weight: "450", reps: "8" },
        ]},
        { exerciseId: "seed-calf-raise", exerciseName: "Standing Calf Raise", position: 3, sets: [
          { position: 0, weight: "180", reps: "15" },
          { position: 1, weight: "200", reps: "12" },
          { position: 2, weight: "200", reps: "12" },
        ]},
      ],
    },
    {
      id: "seed-w4", name: "Push Day", daysAgo: 7, durationMs: 3600000, duration: "60m",
      exercises: [
        { exerciseId: "seed-bench-press", exerciseName: "Bench Press", position: 0, sets: [
          { position: 0, weight: "135", reps: "10", isWarmup: true },
          { position: 1, weight: "185", reps: "8" },
          { position: 2, weight: "200", reps: "6" },
          { position: 3, weight: "210", reps: "5" },
        ]},
        { exerciseId: "seed-ohp", exerciseName: "Overhead Press", position: 1, sets: [
          { position: 0, weight: "95", reps: "10" },
          { position: 1, weight: "105", reps: "8" },
          { position: 2, weight: "110", reps: "7" },
        ]},
      ],
    },
    {
      id: "seed-w5", name: "Pull Day", daysAgo: 9, durationMs: 4000000, duration: "67m",
      exercises: [
        { exerciseId: "seed-deadlift", exerciseName: "Deadlift", position: 0, sets: [
          { position: 0, weight: "225", reps: "5", isWarmup: true },
          { position: 1, weight: "295", reps: "5" },
          { position: 2, weight: "345", reps: "3" },
          { position: 3, weight: "375", reps: "2" },
        ]},
        { exerciseId: "seed-barbell-row", exerciseName: "Barbell Row", position: 1, sets: [
          { position: 0, weight: "135", reps: "10" },
          { position: 1, weight: "145", reps: "8" },
          { position: 2, weight: "155", reps: "8" },
        ]},
      ],
    },
    {
      id: "seed-w6", name: "Leg Day", daysAgo: 12, durationMs: 3600000, duration: "60m",
      exercises: [
        { exerciseId: "seed-squat", exerciseName: "Barbell Squat", position: 0, sets: [
          { position: 0, weight: "185", reps: "8", isWarmup: true },
          { position: 1, weight: "235", reps: "6" },
          { position: 2, weight: "265", reps: "5" },
          { position: 3, weight: "285", reps: "4" },
        ]},
        { exerciseId: "seed-leg-press", exerciseName: "Leg Press", position: 1, sets: [
          { position: 0, weight: "360", reps: "12" },
          { position: 1, weight: "400", reps: "10" },
          { position: 2, weight: "430", reps: "8" },
        ]},
      ],
    },
    {
      id: "seed-w7", name: "Push Day", daysAgo: 14, durationMs: 3300000, duration: "55m",
      exercises: [
        { exerciseId: "seed-bench-press", exerciseName: "Bench Press", position: 0, sets: [
          { position: 0, weight: "135", reps: "10", isWarmup: true },
          { position: 1, weight: "175", reps: "8" },
          { position: 2, weight: "195", reps: "6" },
          { position: 3, weight: "205", reps: "5" },
        ]},
        { exerciseId: "seed-ohp", exerciseName: "Overhead Press", position: 1, sets: [
          { position: 0, weight: "85", reps: "10" },
          { position: 1, weight: "100", reps: "8" },
          { position: 2, weight: "105", reps: "7" },
        ]},
      ],
    },
    {
      id: "seed-w8", name: "Pull Day", daysAgo: 16, durationMs: 3900000, duration: "65m",
      exercises: [
        { exerciseId: "seed-deadlift", exerciseName: "Deadlift", position: 0, sets: [
          { position: 0, weight: "225", reps: "5", isWarmup: true },
          { position: 1, weight: "285", reps: "5" },
          { position: 2, weight: "335", reps: "3" },
          { position: 3, weight: "365", reps: "2" },
        ]},
        { exerciseId: "seed-pullup", exerciseName: "Pull-ups", position: 1, sets: [
          { position: 0, weight: "0", reps: "12" },
          { position: 1, weight: "20", reps: "8" },
          { position: 2, weight: "20", reps: "8" },
        ]},
      ],
    },
    {
      id: "seed-w9", name: "Leg Day", daysAgo: 19, durationMs: 3600000, duration: "60m",
      exercises: [
        { exerciseId: "seed-squat", exerciseName: "Barbell Squat", position: 0, sets: [
          { position: 0, weight: "185", reps: "8", isWarmup: true },
          { position: 1, weight: "225", reps: "6" },
          { position: 2, weight: "255", reps: "5" },
          { position: 3, weight: "275", reps: "4" },
        ]},
        { exerciseId: "seed-rdl", exerciseName: "Romanian Deadlift", position: 1, sets: [
          { position: 0, weight: "175", reps: "10" },
          { position: 1, weight: "195", reps: "8" },
          { position: 2, weight: "215", reps: "8" },
        ]},
      ],
    },
    {
      id: "seed-w10", name: "Push Day", daysAgo: 21, durationMs: 3600000, duration: "60m",
      exercises: [
        { exerciseId: "seed-bench-press", exerciseName: "Bench Press", position: 0, sets: [
          { position: 0, weight: "135", reps: "10", isWarmup: true },
          { position: 1, weight: "175", reps: "8" },
          { position: 2, weight: "190", reps: "6" },
          { position: 3, weight: "200", reps: "5" },
        ]},
      ],
    },
    {
      id: "seed-w11", name: "Pull Day", daysAgo: 23, durationMs: 3600000, duration: "60m",
      exercises: [
        { exerciseId: "seed-deadlift", exerciseName: "Deadlift", position: 0, sets: [
          { position: 0, weight: "225", reps: "5", isWarmup: true },
          { position: 1, weight: "275", reps: "5" },
          { position: 2, weight: "325", reps: "3" },
          { position: 3, weight: "355", reps: "2" },
        ]},
      ],
    },
    {
      id: "seed-w12", name: "Leg Day", daysAgo: 26, durationMs: 3600000, duration: "60m",
      exercises: [
        { exerciseId: "seed-squat", exerciseName: "Barbell Squat", position: 0, sets: [
          { position: 0, weight: "185", reps: "8", isWarmup: true },
          { position: 1, weight: "215", reps: "6" },
          { position: 2, weight: "245", reps: "5" },
          { position: 3, weight: "265", reps: "4" },
        ]},
      ],
    },
    {
      id: "seed-w13", name: "Push Day", daysAgo: 28, durationMs: 3600000, duration: "60m",
      exercises: [
        { exerciseId: "seed-bench-press", exerciseName: "Bench Press", position: 0, sets: [
          { position: 0, weight: "135", reps: "10", isWarmup: true },
          { position: 1, weight: "170", reps: "8" },
          { position: 2, weight: "185", reps: "6" },
          { position: 3, weight: "195", reps: "5" },
        ]},
      ],
    },
    {
      id: "seed-w14", name: "Pull Day", daysAgo: 30, durationMs: 3600000, duration: "60m",
      exercises: [
        { exerciseId: "seed-deadlift", exerciseName: "Deadlift", position: 0, sets: [
          { position: 0, weight: "225", reps: "5", isWarmup: true },
          { position: 1, weight: "265", reps: "5" },
          { position: 2, weight: "315", reps: "3" },
          { position: 3, weight: "345", reps: "2" },
        ]},
      ],
    },
    {
      id: "seed-w15", name: "Leg Day", daysAgo: 33, durationMs: 3600000, duration: "60m",
      exercises: [
        { exerciseId: "seed-squat", exerciseName: "Barbell Squat", position: 0, sets: [
          { position: 0, weight: "185", reps: "8", isWarmup: true },
          { position: 1, weight: "205", reps: "6" },
          { position: 2, weight: "235", reps: "5" },
          { position: 3, weight: "255", reps: "4" },
        ]},
      ],
    },
    {
      id: "seed-w16", name: "Push Day", daysAgo: 35, durationMs: 3300000, duration: "55m",
      exercises: [
        { exerciseId: "seed-bench-press", exerciseName: "Bench Press", position: 0, sets: [
          { position: 0, weight: "135", reps: "10", isWarmup: true },
          { position: 1, weight: "165", reps: "8" },
          { position: 2, weight: "180", reps: "6" },
          { position: 3, weight: "190", reps: "5" },
        ]},
        { exerciseId: "seed-ohp", exerciseName: "Overhead Press", position: 1, sets: [
          { position: 0, weight: "80", reps: "10" },
          { position: 1, weight: "95", reps: "8" },
          { position: 2, weight: "100", reps: "7" },
        ]},
      ],
    },
    {
      id: "seed-w17", name: "Full Body", daysAgo: 38, durationMs: 4200000, duration: "70m",
      exercises: [
        { exerciseId: "seed-squat", exerciseName: "Barbell Squat", position: 0, sets: [
          { position: 0, weight: "185", reps: "8", isWarmup: true },
          { position: 1, weight: "195", reps: "6" },
          { position: 2, weight: "225", reps: "5" },
        ]},
        { exerciseId: "seed-bench-press", exerciseName: "Bench Press", position: 1, sets: [
          { position: 0, weight: "135", reps: "10", isWarmup: true },
          { position: 1, weight: "155", reps: "8" },
          { position: 2, weight: "175", reps: "6" },
        ]},
        { exerciseId: "seed-deadlift", exerciseName: "Deadlift", position: 2, sets: [
          { position: 0, weight: "225", reps: "5", isWarmup: true },
          { position: 1, weight: "255", reps: "5" },
          { position: 2, weight: "295", reps: "3" },
        ]},
      ],
    },
  ];

  for (const w of workouts) {
    await prisma.workout.create({
      data: {
        id: w.id,
        userId: user.id,
        name: w.name,
        startedAt: daysAgo(w.daysAgo),
        finishedAt: daysAgoFinished(w.daysAgo, w.durationMs),
        duration: w.duration,
        exercises: {
          create: w.exercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            category: "Lifts",
            position: ex.position,
            sets: {
              create: ex.sets.map((s) => ({
                position: s.position,
                type: s.isWarmup ? "Warmup" : "Working",
                weight: s.weight,
                reps: s.reps,
                completed: true,
                isWarmup: s.isWarmup || false,
              })),
            },
          })),
        },
      },
    });
  }

  const measurementData = [
    { id: "seed-bm1", daysAgo: 1, weight: 182, bodyFatPercent: 14.5, chest: 42, waist: 33, leftArm: 15, rightArm: 15.2, leftThigh: 24, rightThigh: 24.5 },
    { id: "seed-bm2", daysAgo: 7, weight: 183, bodyFatPercent: 14.8, chest: 42, waist: 33.2, leftArm: 15, rightArm: 15.1, leftThigh: 24, rightThigh: 24.3 },
    { id: "seed-bm3", daysAgo: 14, weight: 184, bodyFatPercent: 15.0, chest: 41.8, waist: 33.5, leftArm: 14.8, rightArm: 15.0, leftThigh: 23.8, rightThigh: 24.2 },
    { id: "seed-bm4", daysAgo: 21, weight: 185, bodyFatPercent: 15.2, chest: 41.5, waist: 33.8, leftArm: 14.8, rightArm: 14.9, leftThigh: 23.5, rightThigh: 24.0 },
    { id: "seed-bm5", daysAgo: 28, weight: 186, bodyFatPercent: 15.5, chest: 41.2, waist: 34, leftArm: 14.5, rightArm: 14.8, leftThigh: 23.5, rightThigh: 23.8 },
    { id: "seed-bm6", daysAgo: 35, weight: 187, bodyFatPercent: 15.8, chest: 41, waist: 34.2, leftArm: 14.5, rightArm: 14.6, leftThigh: 23.2, rightThigh: 23.5 },
    { id: "seed-bm7", daysAgo: 42, weight: 188, bodyFatPercent: 16.0, chest: 40.8, waist: 34.5, leftArm: 14.3, rightArm: 14.5, leftThigh: 23, rightThigh: 23.3 },
    { id: "seed-bm8", daysAgo: 49, weight: 189, bodyFatPercent: 16.2, chest: 40.5, waist: 34.8, leftArm: 14.2, rightArm: 14.3, leftThigh: 23, rightThigh: 23.2 },
    { id: "seed-bm9", daysAgo: 56, weight: 190, bodyFatPercent: 16.5, chest: 40.5, waist: 35, leftArm: 14, rightArm: 14.2, leftThigh: 22.8, rightThigh: 23 },
    { id: "seed-bm10", daysAgo: 63, weight: 191, bodyFatPercent: 16.8, chest: 40.2, waist: 35.2, leftArm: 14, rightArm: 14, leftThigh: 22.5, rightThigh: 22.8 },
  ];

  for (const m of measurementData) {
    await prisma.bodyMeasurement.create({
      data: {
        id: m.id,
        userId: user.id,
        date: daysAgo(m.daysAgo),
        weight: m.weight,
        bodyFatPercent: m.bodyFatPercent,
        chest: m.chest,
        waist: m.waist,
        leftArm: m.leftArm,
        rightArm: m.rightArm,
        leftThigh: m.leftThigh,
        rightThigh: m.rightThigh,
        unit: "lbs",
        circumferenceUnit: "in",
      },
    });
  }

  const goalData = [
    { id: "seed-g1", type: "strength", exerciseId: "seed-bench-press", targetWeight: 225, targetWeightUnit: "lbs" },
    { id: "seed-g2", type: "strength", exerciseId: "seed-squat", targetWeight: 315, targetWeightUnit: "lbs" },
    { id: "seed-g3", type: "consistency", targetWorkoutsPerWeek: 4 },
    { id: "seed-g4", type: "strength", exerciseId: "seed-deadlift", targetWeight: 405, targetWeightUnit: "lbs" },
  ];

  for (const g of goalData) {
    await prisma.userGoal.create({
      data: {
        id: g.id,
        userId: user.id,
        type: g.type,
        exerciseId: g.exerciseId,
        targetWeight: g.targetWeight,
        targetWeightUnit: g.targetWeightUnit,
        targetWorkoutsPerWeek: g.targetWorkoutsPerWeek,
      },
    });
  }

  const prData = [
    { id: "seed-pr1", exerciseId: "seed-bench-press", weight: 215, daysAgo: 1 },
    { id: "seed-pr2", exerciseId: "seed-squat", weight: 295, daysAgo: 5 },
    { id: "seed-pr3", exerciseId: "seed-deadlift", weight: 385, daysAgo: 3 },
    { id: "seed-pr4", exerciseId: "seed-ohp", weight: 115, daysAgo: 1 },
    { id: "seed-pr5", exerciseId: "seed-barbell-row", weight: 165, daysAgo: 3 },
    { id: "seed-pr6", exerciseId: "seed-rdl", weight: 225, daysAgo: 5 },
    { id: "seed-pr7", exerciseId: "seed-leg-press", weight: 450, daysAgo: 5 },
    { id: "seed-pr8", exerciseId: "seed-pullup", weight: 25, daysAgo: 3 },
  ];

  for (const pr of prData) {
    await prisma.personalRecord.create({
      data: {
        id: pr.id,
        userId: user.id,
        exerciseId: pr.exerciseId,
        weight: pr.weight,
        weightUnit: "lbs",
        achievedAt: daysAgo(pr.daysAgo),
      },
    });
  }

  console.log("Seed complete!");
  console.log("  Demo user: alex@example.com / password123");
  console.log(`  ${workouts.length} workouts, ${measurementData.length} measurements, ${goalData.length} goals, ${prData.length} PRs`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
