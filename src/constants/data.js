export const CATEGORIES = ["Cardio", "Lifts", "Training"];

export const PRIMARY_MUSCLES = ["Arms", "Back", "Chest", "Core", "Legs", "Shoulders", "Full Body", "Olympic", "Other"];

export const CARDIO_TYPES = [
  "Heart Rate (Zone 2 / Max HR)", "Intervals", "Low-Impact", "Sprint", "Steady-State", "Tempo/Threshold", "Other"
];

export const TRAINING_FOCUS = [
  "Acceleration", "Agility", "Balance", "Change of Direction", "Conditioning", "Coordination", "Deceleration", 
  "Jump Training", "Mobility", "Plyometrics", "Power", "Reaction Time", "Speed", "Throwing/Rotation", "Other"
];

export const WEIGHT_EQUIP_TAGS = [
  "Barbell", "Bands", "Bodyweight (Calisthenics)", "Reps","Cable", "Dumbbells", "Kettlebell", "Machine", "Weighted Vest", "Other"
];

export const PRIMARY_TO_SECONDARY_MAP = {
  "Arms": ["Biceps","Forearms","Grip","Triceps"],
  "Back": ["Lats","Lower back","Mid back","Rhomboids","Rear delts","Traps","Upper back"],
  "Chest": ["Lower chest","Mid chest","Upper chest"],
  "Core": ["Abs","Hip flexors","Lower back","Obliques"],
  "Legs": ["Calves","Glutes","Hamstrings","Inner thighs","Outer hips/thighs","Quads"],
  "Shoulders": ["Front delts","Rear delts","Rotator cuff","Side delts","Traps"],
  "Other": ["Neck"],
};

export const HISTORY_DATA = [
  { id: 1, name: "Upper Body Power", date: "Today", duration: "45m", vol: "8,400kg", best: true },
  { id: 2, name: "Leg Hypertrophy", date: "Yesterday", duration: "1h 10m", vol: "12,500kg", best: false },
  { id: 3, name: "Push Day", date: "Mon, Oct 23", duration: "55m", vol: "9,200kg", best: false },
];

export const EXERCISE_LIBRARY = [
  { 
    id: 'e1', 
    name: 'Barbell Squat', 
    category: 'Lifts',
    primaryMuscles: ['Legs'],
    secondaryMuscles: ['Quads', 'Glutes'],
    weightEquipTags: ['Barbell'],
    cardioType: null,
    trainingFocus: null
  },
  { 
    id: 'e2', 
    name: 'Bench Press', 
    category: 'Lifts',
    primaryMuscles: ['Chest'],
    secondaryMuscles: ['Mid chest', 'Triceps'],
    weightEquipTags: ['Barbell'],
    cardioType: null,
    trainingFocus: null
  },
  { 
    id: 'e3', 
    name: 'Deadlift', 
    category: 'Lifts',
    primaryMuscles: ['Back', 'Legs'],
    secondaryMuscles: ['Lower back', 'Hamstrings', 'Glutes'],
    weightEquipTags: ['Barbell'],
    cardioType: null,
    trainingFocus: null
  },
  { 
    id: 'e4', 
    name: 'Pull Up', 
    category: 'Lifts',
    primaryMuscles: ['Back'],
    secondaryMuscles: ['Lats', 'Biceps'],
    weightEquipTags: ['Bodyweight (Calisthenics) / Reps'],
    cardioType: null,
    trainingFocus: null
  },
  { 
    id: 'e5', 
    name: 'Dumbbell Shoulder Press', 
    category: 'Lifts',
    primaryMuscles: ['Shoulders'],
    secondaryMuscles: ['Front delts', 'Triceps'],
    weightEquipTags: ['Dumbbells'],
    cardioType: null,
    trainingFocus: null
  },
  { 
    id: 'e6', 
    name: 'Tricep Extension', 
    category: 'Lifts',
    primaryMuscles: ['Arms'],
    secondaryMuscles: ['Triceps'],
    weightEquipTags: ['Cable'],
    cardioType: null,
    trainingFocus: null
  },
];

export const migrateExercise = (ex) => {
  if (ex.category) return ex;
  let mappedCategory = "Lifts";
  let mappedPrimaries = [];
  if (["Chest", "Back", "Legs", "Shoulders", "Arms", "Core"].includes(ex.muscle)) {
    mappedPrimaries = [ex.muscle];
  } else {
    mappedCategory = "Lifts";
    mappedPrimaries = ["Other"];
  }
  let mappedEquipTags = ex.modalityTags || []; 
  if (ex.equipment && mappedEquipTags.length === 0) {
    const found = WEIGHT_EQUIP_TAGS.find(t => t.includes(ex.equipment));
    if (found) mappedEquipTags = [found];
    else mappedEquipTags = ["Other"];
  }
  return {
    ...ex,
    category: mappedCategory,
    primaryMuscles: mappedPrimaries,
    secondaryMuscles: [],
    cardioType: null,
    trainingFocus: null,
    weightEquipTags: mappedEquipTags
  };
};

export const getAvailableSecondaryMuscles = (primary) => {
  if (PRIMARY_TO_SECONDARY_MAP[primary]) {
    return PRIMARY_TO_SECONDARY_MAP[primary].sort();
  }
  return [];
};

export const formatDuration = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
