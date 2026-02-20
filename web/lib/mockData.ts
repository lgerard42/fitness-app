import type {
  DashboardData,
  Workout,
  Exercise,
  WorkoutSet,
  ExerciseStatsMap,
  BodyMeasurement,
  UserGoal,
  PersonalRecord,
  UserProfile,
} from "@/types";

function makeSet(
  id: string,
  weight: string,
  reps: string,
  completed = true,
  isWarmup = false
): WorkoutSet {
  return {
    id,
    type: isWarmup ? "Warmup" : "Working",
    weight,
    reps,
    duration: "",
    distance: "",
    completed,
    isWarmup,
  };
}

function makeExercise(
  instanceId: string,
  exerciseId: string,
  name: string,
  sets: WorkoutSet[]
): Exercise {
  return {
    instanceId,
    exerciseId,
    name,
    category: "Lifts",
    type: "exercise",
    sets,
  };
}

function daysAgo(n: number): number {
  return Date.now() - n * 24 * 60 * 60 * 1000;
}

function dateStr(n: number): string {
  return new Date(daysAgo(n)).toISOString();
}

const workoutHistory: Workout[] = [
  {
    id: "w1",
    name: "Push Day",
    startedAt: daysAgo(1),
    finishedAt: daysAgo(1) + 3600000,
    duration: "60m",
    date: dateStr(1),
    exercises: [
      makeExercise("e1-1", "bench-press", "Bench Press", [
        makeSet("s1", "135", "10", true, true),
        makeSet("s2", "185", "8"),
        makeSet("s3", "205", "6"),
        makeSet("s4", "215", "5"),
      ]),
      makeExercise("e1-2", "ohp", "Overhead Press", [
        makeSet("s5", "95", "10"),
        makeSet("s6", "105", "8"),
        makeSet("s7", "115", "6"),
      ]),
      makeExercise("e1-3", "incline-db", "Incline Dumbbell Press", [
        makeSet("s8", "60", "10"),
        makeSet("s9", "65", "8"),
        makeSet("s10", "70", "8"),
      ]),
      makeExercise("e1-4", "tricep-pushdown", "Tricep Pushdown", [
        makeSet("s11", "50", "12"),
        makeSet("s12", "55", "10"),
        makeSet("s13", "60", "10"),
      ]),
    ],
  },
  {
    id: "w2",
    name: "Pull Day",
    startedAt: daysAgo(3),
    finishedAt: daysAgo(3) + 4200000,
    duration: "70m",
    date: dateStr(3),
    exercises: [
      makeExercise("e2-1", "deadlift", "Deadlift", [
        makeSet("s14", "225", "5", true, true),
        makeSet("s15", "315", "5"),
        makeSet("s16", "365", "3"),
        makeSet("s17", "385", "2"),
      ]),
      makeExercise("e2-2", "barbell-row", "Barbell Row", [
        makeSet("s18", "135", "10"),
        makeSet("s19", "155", "8"),
        makeSet("s20", "165", "8"),
      ]),
      makeExercise("e2-3", "pullup", "Pull-ups", [
        makeSet("s21", "0", "12"),
        makeSet("s22", "25", "8"),
        makeSet("s23", "25", "7"),
      ]),
      makeExercise("e2-4", "barbell-curl", "Barbell Curl", [
        makeSet("s24", "65", "12"),
        makeSet("s25", "75", "10"),
        makeSet("s26", "75", "9"),
      ]),
    ],
  },
  {
    id: "w3",
    name: "Leg Day",
    startedAt: daysAgo(5),
    finishedAt: daysAgo(5) + 3900000,
    duration: "65m",
    date: dateStr(5),
    exercises: [
      makeExercise("e3-1", "squat", "Barbell Squat", [
        makeSet("s27", "185", "8", true, true),
        makeSet("s28", "245", "6"),
        makeSet("s29", "275", "5"),
        makeSet("s30", "295", "3"),
      ]),
      makeExercise("e3-2", "rdl", "Romanian Deadlift", [
        makeSet("s31", "185", "10"),
        makeSet("s32", "205", "8"),
        makeSet("s33", "225", "8"),
      ]),
      makeExercise("e3-3", "leg-press", "Leg Press", [
        makeSet("s34", "360", "12"),
        makeSet("s35", "410", "10"),
        makeSet("s36", "450", "8"),
      ]),
      makeExercise("e3-4", "calf-raise", "Standing Calf Raise", [
        makeSet("s37", "180", "15"),
        makeSet("s38", "200", "12"),
        makeSet("s39", "200", "12"),
      ]),
    ],
  },
  {
    id: "w4",
    name: "Push Day",
    startedAt: daysAgo(7),
    finishedAt: daysAgo(7) + 3600000,
    duration: "60m",
    date: dateStr(7),
    exercises: [
      makeExercise("e4-1", "bench-press", "Bench Press", [
        makeSet("s40", "135", "10", true, true),
        makeSet("s41", "185", "8"),
        makeSet("s42", "200", "6"),
        makeSet("s43", "210", "5"),
      ]),
      makeExercise("e4-2", "ohp", "Overhead Press", [
        makeSet("s44", "95", "10"),
        makeSet("s45", "105", "8"),
        makeSet("s46", "110", "7"),
      ]),
    ],
  },
  {
    id: "w5",
    name: "Pull Day",
    startedAt: daysAgo(9),
    finishedAt: daysAgo(9) + 4000000,
    duration: "67m",
    date: dateStr(9),
    exercises: [
      makeExercise("e5-1", "deadlift", "Deadlift", [
        makeSet("s47", "225", "5", true, true),
        makeSet("s48", "295", "5"),
        makeSet("s49", "345", "3"),
        makeSet("s50", "375", "2"),
      ]),
      makeExercise("e5-2", "barbell-row", "Barbell Row", [
        makeSet("s51", "135", "10"),
        makeSet("s52", "145", "8"),
        makeSet("s53", "155", "8"),
      ]),
    ],
  },
  {
    id: "w6",
    name: "Leg Day",
    startedAt: daysAgo(12),
    finishedAt: daysAgo(12) + 3600000,
    duration: "60m",
    date: dateStr(12),
    exercises: [
      makeExercise("e6-1", "squat", "Barbell Squat", [
        makeSet("s54", "185", "8", true, true),
        makeSet("s55", "235", "6"),
        makeSet("s56", "265", "5"),
        makeSet("s57", "285", "4"),
      ]),
      makeExercise("e6-2", "leg-press", "Leg Press", [
        makeSet("s58", "360", "12"),
        makeSet("s59", "400", "10"),
        makeSet("s60", "430", "8"),
      ]),
    ],
  },
  {
    id: "w7",
    name: "Push Day",
    startedAt: daysAgo(14),
    finishedAt: daysAgo(14) + 3300000,
    duration: "55m",
    date: dateStr(14),
    exercises: [
      makeExercise("e7-1", "bench-press", "Bench Press", [
        makeSet("s61", "135", "10", true, true),
        makeSet("s62", "175", "8"),
        makeSet("s63", "195", "6"),
        makeSet("s64", "205", "5"),
      ]),
      makeExercise("e7-2", "ohp", "Overhead Press", [
        makeSet("s65", "85", "10"),
        makeSet("s66", "100", "8"),
        makeSet("s67", "105", "7"),
      ]),
    ],
  },
  {
    id: "w8",
    name: "Pull Day",
    startedAt: daysAgo(16),
    finishedAt: daysAgo(16) + 3900000,
    duration: "65m",
    date: dateStr(16),
    exercises: [
      makeExercise("e8-1", "deadlift", "Deadlift", [
        makeSet("s68", "225", "5", true, true),
        makeSet("s69", "285", "5"),
        makeSet("s70", "335", "3"),
        makeSet("s71", "365", "2"),
      ]),
      makeExercise("e8-2", "pullup", "Pull-ups", [
        makeSet("s72", "0", "12"),
        makeSet("s73", "20", "8"),
        makeSet("s74", "20", "8"),
      ]),
    ],
  },
  {
    id: "w9",
    name: "Leg Day",
    startedAt: daysAgo(19),
    finishedAt: daysAgo(19) + 3600000,
    duration: "60m",
    date: dateStr(19),
    exercises: [
      makeExercise("e9-1", "squat", "Barbell Squat", [
        makeSet("s75", "185", "8", true, true),
        makeSet("s76", "225", "6"),
        makeSet("s77", "255", "5"),
        makeSet("s78", "275", "4"),
      ]),
      makeExercise("e9-2", "rdl", "Romanian Deadlift", [
        makeSet("s79", "175", "10"),
        makeSet("s80", "195", "8"),
        makeSet("s81", "215", "8"),
      ]),
    ],
  },
  {
    id: "w10",
    name: "Push Day",
    startedAt: daysAgo(21),
    finishedAt: daysAgo(21) + 3600000,
    duration: "60m",
    date: dateStr(21),
    exercises: [
      makeExercise("e10-1", "bench-press", "Bench Press", [
        makeSet("s82", "135", "10", true, true),
        makeSet("s83", "175", "8"),
        makeSet("s84", "190", "6"),
        makeSet("s85", "200", "5"),
      ]),
    ],
  },
  {
    id: "w11",
    name: "Pull Day",
    startedAt: daysAgo(23),
    finishedAt: daysAgo(23) + 3600000,
    duration: "60m",
    date: dateStr(23),
    exercises: [
      makeExercise("e11-1", "deadlift", "Deadlift", [
        makeSet("s86", "225", "5", true, true),
        makeSet("s87", "275", "5"),
        makeSet("s88", "325", "3"),
        makeSet("s89", "355", "2"),
      ]),
    ],
  },
  {
    id: "w12",
    name: "Leg Day",
    startedAt: daysAgo(26),
    finishedAt: daysAgo(26) + 3600000,
    duration: "60m",
    date: dateStr(26),
    exercises: [
      makeExercise("e12-1", "squat", "Barbell Squat", [
        makeSet("s90", "185", "8", true, true),
        makeSet("s91", "215", "6"),
        makeSet("s92", "245", "5"),
        makeSet("s93", "265", "4"),
      ]),
    ],
  },
  {
    id: "w13",
    name: "Push Day",
    startedAt: daysAgo(28),
    finishedAt: daysAgo(28) + 3600000,
    duration: "60m",
    date: dateStr(28),
    exercises: [
      makeExercise("e13-1", "bench-press", "Bench Press", [
        makeSet("s94", "135", "10", true, true),
        makeSet("s95", "170", "8"),
        makeSet("s96", "185", "6"),
        makeSet("s97", "195", "5"),
      ]),
    ],
  },
  {
    id: "w14",
    name: "Pull Day",
    startedAt: daysAgo(30),
    finishedAt: daysAgo(30) + 3600000,
    duration: "60m",
    date: dateStr(30),
    exercises: [
      makeExercise("e14-1", "deadlift", "Deadlift", [
        makeSet("s98", "225", "5", true, true),
        makeSet("s99", "265", "5"),
        makeSet("s100", "315", "3"),
        makeSet("s101", "345", "2"),
      ]),
    ],
  },
  {
    id: "w15",
    name: "Leg Day",
    startedAt: daysAgo(33),
    finishedAt: daysAgo(33) + 3600000,
    duration: "60m",
    date: dateStr(33),
    exercises: [
      makeExercise("e15-1", "squat", "Barbell Squat", [
        makeSet("s102", "185", "8", true, true),
        makeSet("s103", "205", "6"),
        makeSet("s104", "235", "5"),
        makeSet("s105", "255", "4"),
      ]),
    ],
  },
  {
    id: "w16",
    name: "Push Day",
    startedAt: daysAgo(35),
    finishedAt: daysAgo(35) + 3300000,
    duration: "55m",
    date: dateStr(35),
    exercises: [
      makeExercise("e16-1", "bench-press", "Bench Press", [
        makeSet("s106", "135", "10", true, true),
        makeSet("s107", "165", "8"),
        makeSet("s108", "180", "6"),
        makeSet("s109", "190", "5"),
      ]),
      makeExercise("e16-2", "ohp", "Overhead Press", [
        makeSet("s110", "80", "10"),
        makeSet("s111", "95", "8"),
        makeSet("s112", "100", "7"),
      ]),
    ],
  },
  {
    id: "w17",
    name: "Full Body",
    startedAt: daysAgo(38),
    finishedAt: daysAgo(38) + 4200000,
    duration: "70m",
    date: dateStr(38),
    exercises: [
      makeExercise("e17-1", "squat", "Barbell Squat", [
        makeSet("s113", "185", "8", true, true),
        makeSet("s114", "195", "6"),
        makeSet("s115", "225", "5"),
      ]),
      makeExercise("e17-2", "bench-press", "Bench Press", [
        makeSet("s116", "135", "10", true, true),
        makeSet("s117", "155", "8"),
        makeSet("s118", "175", "6"),
      ]),
      makeExercise("e17-3", "deadlift", "Deadlift", [
        makeSet("s119", "225", "5", true, true),
        makeSet("s120", "255", "5"),
        makeSet("s121", "295", "3"),
      ]),
    ],
  },
];

const exerciseStats: ExerciseStatsMap = {
  "bench-press": {
    pr: 215,
    lastPerformed: dateStr(1),
    history: [
      { date: dateStr(1), sets: [{ weight: "205", reps: "6", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }, { weight: "215", reps: "5", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }] },
      { date: dateStr(7), sets: [{ weight: "200", reps: "6", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }, { weight: "210", reps: "5", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }] },
      { date: dateStr(14), sets: [{ weight: "195", reps: "6", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }, { weight: "205", reps: "5", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }] },
      { date: dateStr(21), sets: [{ weight: "190", reps: "6", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }, { weight: "200", reps: "5", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }] },
      { date: dateStr(28), sets: [{ weight: "185", reps: "6", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }, { weight: "195", reps: "5", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }] },
      { date: dateStr(35), sets: [{ weight: "180", reps: "6", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }, { weight: "190", reps: "5", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }] },
    ],
  },
  squat: {
    pr: 295,
    lastPerformed: dateStr(5),
    history: [
      { date: dateStr(5), sets: [{ weight: "275", reps: "5", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }, { weight: "295", reps: "3", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }] },
      { date: dateStr(12), sets: [{ weight: "265", reps: "5", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }, { weight: "285", reps: "4", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }] },
      { date: dateStr(19), sets: [{ weight: "255", reps: "5", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }, { weight: "275", reps: "4", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }] },
      { date: dateStr(26), sets: [{ weight: "245", reps: "5", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }, { weight: "265", reps: "4", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }] },
      { date: dateStr(33), sets: [{ weight: "235", reps: "5", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }, { weight: "255", reps: "4", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }] },
    ],
  },
  deadlift: {
    pr: 385,
    lastPerformed: dateStr(3),
    history: [
      { date: dateStr(3), sets: [{ weight: "365", reps: "3", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }, { weight: "385", reps: "2", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }] },
      { date: dateStr(9), sets: [{ weight: "345", reps: "3", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }, { weight: "375", reps: "2", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }] },
      { date: dateStr(16), sets: [{ weight: "335", reps: "3", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }, { weight: "365", reps: "2", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }] },
      { date: dateStr(23), sets: [{ weight: "325", reps: "3", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }, { weight: "355", reps: "2", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }] },
      { date: dateStr(30), sets: [{ weight: "315", reps: "3", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }, { weight: "345", reps: "2", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }] },
    ],
  },
  ohp: {
    pr: 115,
    lastPerformed: dateStr(1),
    history: [
      { date: dateStr(1), sets: [{ weight: "105", reps: "8", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }, { weight: "115", reps: "6", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }] },
      { date: dateStr(7), sets: [{ weight: "105", reps: "8", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }, { weight: "110", reps: "7", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }] },
      { date: dateStr(14), sets: [{ weight: "100", reps: "8", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }, { weight: "105", reps: "7", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }] },
      { date: dateStr(35), sets: [{ weight: "95", reps: "8", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }, { weight: "100", reps: "7", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }] },
    ],
  },
  "barbell-row": {
    pr: 165,
    lastPerformed: dateStr(3),
    history: [
      { date: dateStr(3), sets: [{ weight: "155", reps: "8", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }, { weight: "165", reps: "8", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }] },
      { date: dateStr(9), sets: [{ weight: "145", reps: "8", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }, { weight: "155", reps: "8", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }] },
    ],
  },
  pullup: {
    pr: 25,
    lastPerformed: dateStr(3),
    history: [
      { date: dateStr(3), sets: [{ weight: "25", reps: "8", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }, { weight: "25", reps: "7", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }] },
      { date: dateStr(16), sets: [{ weight: "20", reps: "8", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }, { weight: "20", reps: "8", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }] },
    ],
  },
  rdl: {
    pr: 225,
    lastPerformed: dateStr(5),
    history: [
      { date: dateStr(5), sets: [{ weight: "205", reps: "8", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }, { weight: "225", reps: "8", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }] },
      { date: dateStr(19), sets: [{ weight: "195", reps: "8", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }, { weight: "215", reps: "8", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }] },
    ],
  },
  "leg-press": {
    pr: 450,
    lastPerformed: dateStr(5),
    history: [
      { date: dateStr(5), sets: [{ weight: "410", reps: "10", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }, { weight: "450", reps: "8", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }] },
      { date: dateStr(12), sets: [{ weight: "400", reps: "10", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }, { weight: "430", reps: "8", duration: "", distance: "", isWarmup: false, isFailure: false, dropSetId: null }] },
    ],
  },
};

const bodyMeasurements: BodyMeasurement[] = [
  { id: "bm1", date: dateStr(1), weight: 182, bodyFatPercent: 14.5, chest: 42, waist: 33, leftArm: 15, rightArm: 15.2, leftThigh: 24, rightThigh: 24.5, unit: "lbs", circumferenceUnit: "in" },
  { id: "bm2", date: dateStr(7), weight: 183, bodyFatPercent: 14.8, chest: 42, waist: 33.2, leftArm: 15, rightArm: 15.1, leftThigh: 24, rightThigh: 24.3, unit: "lbs", circumferenceUnit: "in" },
  { id: "bm3", date: dateStr(14), weight: 184, bodyFatPercent: 15.0, chest: 41.8, waist: 33.5, leftArm: 14.8, rightArm: 15.0, leftThigh: 23.8, rightThigh: 24.2, unit: "lbs", circumferenceUnit: "in" },
  { id: "bm4", date: dateStr(21), weight: 185, bodyFatPercent: 15.2, chest: 41.5, waist: 33.8, leftArm: 14.8, rightArm: 14.9, leftThigh: 23.5, rightThigh: 24.0, unit: "lbs", circumferenceUnit: "in" },
  { id: "bm5", date: dateStr(28), weight: 186, bodyFatPercent: 15.5, chest: 41.2, waist: 34, leftArm: 14.5, rightArm: 14.8, leftThigh: 23.5, rightThigh: 23.8, unit: "lbs", circumferenceUnit: "in" },
  { id: "bm6", date: dateStr(35), weight: 187, bodyFatPercent: 15.8, chest: 41, waist: 34.2, leftArm: 14.5, rightArm: 14.6, leftThigh: 23.2, rightThigh: 23.5, unit: "lbs", circumferenceUnit: "in" },
  { id: "bm7", date: dateStr(42), weight: 188, bodyFatPercent: 16.0, chest: 40.8, waist: 34.5, leftArm: 14.3, rightArm: 14.5, leftThigh: 23, rightThigh: 23.3, unit: "lbs", circumferenceUnit: "in" },
  { id: "bm8", date: dateStr(49), weight: 189, bodyFatPercent: 16.2, chest: 40.5, waist: 34.8, leftArm: 14.2, rightArm: 14.3, leftThigh: 23, rightThigh: 23.2, unit: "lbs", circumferenceUnit: "in" },
  { id: "bm9", date: dateStr(56), weight: 190, bodyFatPercent: 16.5, chest: 40.5, waist: 35, leftArm: 14, rightArm: 14.2, leftThigh: 22.8, rightThigh: 23, unit: "lbs", circumferenceUnit: "in" },
  { id: "bm10", date: dateStr(63), weight: 191, bodyFatPercent: 16.8, chest: 40.2, waist: 35.2, leftArm: 14, rightArm: 14, leftThigh: 22.5, rightThigh: 22.8, unit: "lbs", circumferenceUnit: "in" },
];

const goals: UserGoal[] = [
  {
    id: "g1",
    type: "strength",
    exerciseId: "bench-press",
    exerciseName: "Bench Press",
    targetWeight: 225,
    targetWeightUnit: "lbs",
    currentProgress: 215,
    createdAt: dateStr(60),
    completed: false,
  },
  {
    id: "g2",
    type: "strength",
    exerciseId: "squat",
    exerciseName: "Barbell Squat",
    targetWeight: 315,
    targetWeightUnit: "lbs",
    currentProgress: 295,
    createdAt: dateStr(60),
    completed: false,
  },
  {
    id: "g3",
    type: "consistency",
    targetWorkoutsPerWeek: 4,
    currentProgress: 3,
    createdAt: dateStr(30),
    completed: false,
  },
  {
    id: "g4",
    type: "strength",
    exerciseId: "deadlift",
    exerciseName: "Deadlift",
    targetWeight: 405,
    targetWeightUnit: "lbs",
    currentProgress: 385,
    createdAt: dateStr(60),
    completed: false,
  },
];

const personalRecords: PersonalRecord[] = [
  { exerciseId: "bench-press", exerciseName: "Bench Press", weight: 215, weightUnit: "lbs", date: dateStr(1) },
  { exerciseId: "squat", exerciseName: "Barbell Squat", weight: 295, weightUnit: "lbs", date: dateStr(5) },
  { exerciseId: "deadlift", exerciseName: "Deadlift", weight: 385, weightUnit: "lbs", date: dateStr(3) },
  { exerciseId: "ohp", exerciseName: "Overhead Press", weight: 115, weightUnit: "lbs", date: dateStr(1) },
  { exerciseId: "barbell-row", exerciseName: "Barbell Row", weight: 165, weightUnit: "lbs", date: dateStr(3) },
  { exerciseId: "rdl", exerciseName: "Romanian Deadlift", weight: 225, weightUnit: "lbs", date: dateStr(5) },
  { exerciseId: "leg-press", exerciseName: "Leg Press", weight: 450, weightUnit: "lbs", date: dateStr(5) },
  { exerciseId: "pullup", exerciseName: "Pull-ups", weight: 25, weightUnit: "lbs", date: dateStr(3) },
];

const user: UserProfile = {
  id: "user-1",
  name: "Alex Johnson",
  email: "alex@example.com",
  createdAt: "2024-06-01T00:00:00Z",
  updatedAt: new Date().toISOString(),
};

const mockData: DashboardData = {
  user,
  workoutHistory,
  exerciseStats,
  bodyMeasurements,
  goals,
  personalRecords,
};

export async function getUserData(): Promise<DashboardData> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockData;
}
