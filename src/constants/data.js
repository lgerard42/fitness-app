export const CATEGORIES = ["Cardio", "Lifts", "Training"];

export const PRIMARY_MUSCLES = ["Arms", "Back", "Chest", "Core", "Legs", "Shoulders", "Full Body", "Olympic", "Other"];

export const CARDIO_TYPES = [
  "Heart Rate (Zone 2 / Max HR)", "Intervals", "Low-Impact", "Sprint", "Steady-State", "Tempo/Threshold", "Other"
];

export const TRAINING_FOCUS = [
  "Acceleration", "Agility", "Balance", "Change of Direction", "Conditioning", "Coordination", "Deceleration", 
  "Jump Training", "Mobility", "Plyometrics", "Power", "Reaction Time", "Speed", "Throwing/Rotation", "Other"
];

// Weight Equipment Categories and Tags
export const WEIGHT_EQUIP_CATEGORIES = {
  "Bars": ["Barbell", "EZ Bar", "Trap Bar (Hex Bar)", "Safety Squat Bar", "Swiss / Football Bar", "Cambered Bar"],
  "Load Type": ["Dumbbell", "Kettlebell", "Plate", "Medicine Ball", "Sandbag", "Weighted Vest", "Bodyweight", "Band", "Chains", "Reps Only",],
  "Machines": ["Machine (Selectorized)", "Plate Loaded (Machine)", "Smith Machine"],
  "Cable": ["Cable"],
  "Suspension": ["TRX / Suspension Trainer", "Rings"],
  "Stability": ["Stability Ball", "BOSU", "Balance Pad", "Sliders"],
  "Functional": ["Sled / Prowler", "Log", "Yoke", "Tire", "Mace", "Steel / Indian Club", "Ropes"],
  "Other": ["Other"]
};

// Flattened list of all equipment tags for backward compatibility
export const WEIGHT_EQUIP_TAGS = Object.values(WEIGHT_EQUIP_CATEGORIES).flat();

// Single/Double toggle options
export const SINGLE_DOUBLE_OPTIONS = ["Single", "Double"];

// Equipment that supports Single/Double toggle (when Double = true use normal grip/stance; when Single = true use empty)
export const SINGLE_DOUBLE_EQUIPMENT = ["Dumbbell", "Kettlebell", "Plate", "Chains", "Cable", "Other"];

// Cable attachment options (Cable equipment only, optional)
export const CABLE_ATTACHMENTS = [
  "Lat Pulldown Bar", "Straight Bar", "Single Handle", "V-Grip",
  "MAG Grip Bar", "PRO-Style Bar", "Multi/T-Bar Style", "Multi-Row",
  "EZ Bar", "V-Bar", "Ankle Strap", "Ab Harness", "Rope", "Other"
];

// Grip Type options for upper body exercises
export const GRIP_TYPES = [
  "Neutral", "Pronated", "Supinated", "Semi-Pronated", "Semi-Supinated", 
  "Rotating", "1up/1down", "Flat Palms Up", "Other"
];

// Grip Width options for upper body exercises
export const GRIP_WIDTHS = [
  "Narrow", "Shoulder Width", "Wide", "Extra Narrow", "Extra Wide"
];

// Stance Type options for leg exercises
export const STANCE_TYPES = [
  "Neutral (Feet Forward)", "Toes Out (External Rotation)", 
  "Toes In (Internal Rotation)", "Split Stance", "Other"
];

// Stance Width options for leg exercises
export const STANCE_WIDTHS = [
  "Narrow", "Shoulder Width", "Wide", "Extra Narrow", "Extra Wide"
];

// Full option lists used in equipment mapping (for reference / reuse)
const GRIP_WIDTH_FULL = ["Extra Narrow", "Narrow", "Shoulder Width", "Wide", "Extra Wide"];
const STANCE_TYPE_FULL = ["Neutral (Feet Forward)", "Toes Out (External Rotation)", "Toes In (Internal Rotation)", "Split Stance", "Other"];
const STANCE_WIDTH_FULL = ["Extra Narrow", "Narrow", "Shoulder Width", "Wide", "Extra Wide"];

/**
 * Per-equipment options for Grip Type, Grip Width, Stance Type, Stance Width.
 * null/undefined or empty array = field not applicable (do not show).
 */
export const EQUIPMENT_GRIP_STANCE_OPTIONS = {
  // Bars
  "Barbell": {
    gripType: ["Pronated", "Supinated", "1up/1down"],
    gripWidth: GRIP_WIDTH_FULL,
    stanceType: STANCE_TYPE_FULL,
    stanceWidth: STANCE_WIDTH_FULL,
  },
  "EZ Bar": {
    gripType: ["Semi-Pronated", "Semi-Supinated"],
    gripWidth: ["Narrow", "Shoulder Width", "Wide"],
    stanceType: STANCE_TYPE_FULL,
    stanceWidth: STANCE_WIDTH_FULL,
  },
  "Trap Bar (Hex Bar)": {
    gripType: ["Neutral", "Semi-Pronated", "Semi-Supinated"],
    gripWidth: null,
    stanceType: ["Neutral (Feet Forward)", "Toes Out (External Rotation)"],
    stanceWidth: STANCE_WIDTH_FULL,
  },
  "Safety Squat Bar": {
    gripType: null,
    gripWidth: null,
    stanceType: STANCE_TYPE_FULL,
    stanceWidth: STANCE_WIDTH_FULL,
  },
  "Swiss / Football Bar": {
    gripType: ["Neutral", "Semi-Pronated"],
    gripWidth: GRIP_WIDTH_FULL,
    stanceType: STANCE_TYPE_FULL,
    stanceWidth: STANCE_WIDTH_FULL,
  },
  "Cambered Bar": {
    gripType: ["Pronated", "1up/1down", "Supinated", "Neutral", "Semi-Pronated", "Semi-Supinated"],
    gripWidth: GRIP_WIDTH_FULL,
    stanceType: STANCE_TYPE_FULL,
    stanceWidth: STANCE_WIDTH_FULL,
  },
  // Load Type
  "Dumbbell": {
    gripType: ["Pronated", "Supinated", "Neutral", "1up/1down", "Semi-Pronated", "Semi-Supinated", "Rotating", "Other"],
    gripWidth: GRIP_WIDTH_FULL,
    stanceType: STANCE_TYPE_FULL,
    stanceWidth: STANCE_WIDTH_FULL,
  },
  "Kettlebell": {
    gripType: ["Pronated", "Supinated", "Neutral", "Semi-Pronated", "Semi-Supinated"],
    gripWidth: GRIP_WIDTH_FULL,
    stanceType: STANCE_TYPE_FULL,
    stanceWidth: STANCE_WIDTH_FULL,
  },
  "Plate": {
    gripType: ["Pronated", "Neutral", "Other", "Semi-Pronated", "Semi-Supinated", "Flat Palms Up", "Supinated"],
    gripWidth: null,
    stanceType: STANCE_TYPE_FULL,
    stanceWidth: STANCE_WIDTH_FULL,
  },
  "Medicine Ball": {
    gripType: null,
    gripWidth: GRIP_WIDTH_FULL,
    stanceType: STANCE_TYPE_FULL,
    stanceWidth: STANCE_WIDTH_FULL,
  },
  "Sandbag": {
    gripType: ["Neutral", "Pronated", "Other"],
    gripWidth: GRIP_WIDTH_FULL,
    stanceType: STANCE_TYPE_FULL,
    stanceWidth: STANCE_WIDTH_FULL,
  },
  "Weighted Vest": {
    gripType: null,
    gripWidth: null,
    stanceType: STANCE_TYPE_FULL,
    stanceWidth: STANCE_WIDTH_FULL,
  },
  "Bodyweight": {
    gripType: ["Pronated", "Supinated", "Neutral", "Rotating", "1up/1down", "Semi-Pronated", "Semi-Supinated", "Other"],
    gripWidth: GRIP_WIDTH_FULL,
    stanceType: STANCE_TYPE_FULL,
    stanceWidth: STANCE_WIDTH_FULL,
  },
  "Band": {
    gripType: ["Pronated", "Supinated", "Neutral", "1up/1down", "Semi-Pronated", "Semi-Supinated", "Rotating", "Other"],
    gripWidth: null,
    stanceType: STANCE_TYPE_FULL,
    stanceWidth: STANCE_WIDTH_FULL,
  },
  "Chains": {
    gripType: null,
    gripWidth: null,
    stanceType: STANCE_TYPE_FULL,
    stanceWidth: STANCE_WIDTH_FULL,
  },
  // Machines
  "Machine (Selectorized)": {
    gripType: ["Neutral", "Pronated", "Semi-Pronated", "Supinated", "1up/1down", "Semi-Supinated", "Rotating"],
    gripWidth: GRIP_WIDTH_FULL,
    stanceType: ["Neutral (Feet Forward)", "Toes Out (External Rotation)", "Other"],
    stanceWidth: STANCE_WIDTH_FULL,
  },
  "Plate Loaded (Machine)": {
    gripType: ["Neutral", "Pronated", "Semi-Pronated", "Supinated", "1up/1down", "Semi-Supinated", "Rotating"],
    gripWidth: GRIP_WIDTH_FULL,
    stanceType: ["Neutral (Feet Forward)", "Toes Out (External Rotation)", "Other"],
    stanceWidth: STANCE_WIDTH_FULL,
  },
  "Smith Machine": {
    gripType: ["Pronated", "1up/1down", "Supinated"],
    gripWidth: GRIP_WIDTH_FULL,
    stanceType: ["Neutral (Feet Forward)", "Toes Out (External Rotation)", "Other"],
    stanceWidth: STANCE_WIDTH_FULL,
  },
  // Cable
  "Cable": {
    gripType: ["Pronated", "Supinated", "Neutral", "1up/1down", "Semi-Pronated", "Semi-Supinated", "Rotating", "Other"],
    gripWidth: GRIP_WIDTH_FULL,
    stanceType: STANCE_TYPE_FULL,
    stanceWidth: STANCE_WIDTH_FULL,
  },
  // Suspension
  "TRX / Suspension Trainer": {
    gripType: ["Neutral", "Rotating", "Semi-Supinated", "1up/1down", "Semi-Pronated", "Supinated", "Pronated"],
    gripWidth: null,
    stanceType: STANCE_TYPE_FULL,
    stanceWidth: STANCE_WIDTH_FULL,
  },
  "Rings": {
    gripType: ["Neutral", "Rotating", "Semi-Supinated", "1up/1down", "Semi-Pronated", "Supinated", "Pronated"],
    gripWidth: ["Extra Narrow", "Narrow", "Shoulder Width", "Extra Wide", "Wide"],
    stanceType: STANCE_TYPE_FULL,
    stanceWidth: null,
  },
  // Stability
  "Stability Ball": { gripType: null, gripWidth: null, stanceType: null, stanceWidth: null },
  "BOSU": {
    gripType: null,
    gripWidth: null,
    stanceType: STANCE_TYPE_FULL,
    stanceWidth: null,
  },
  "Balance Pad": { gripType: null, gripWidth: null, stanceType: null, stanceWidth: null },
  "Sliders": {
    gripType: null,
    gripWidth: null,
    stanceType: STANCE_TYPE_FULL,
    stanceWidth: null,
  },
  // Functional
  "Sled / Prowler": { gripType: null, gripWidth: null, stanceType: null, stanceWidth: null },
  "Log": { gripType: null, gripWidth: null, stanceType: null, stanceWidth: null },
  "Yoke": { gripType: null, gripWidth: null, stanceType: null, stanceWidth: null },
  "Tire": { gripType: null, gripWidth: null, stanceType: null, stanceWidth: null },
  "Mace": { gripType: null, gripWidth: null, stanceType: null, stanceWidth: null },
  "Steel / Indian Club": { gripType: null, gripWidth: null, stanceType: null, stanceWidth: null },
  "Ropes": {
    gripType: ["Neutral", "Other", "Semi-Pronated", "Semi-Supinated", "Supinated", "Pronated"],
    gripWidth: null,
    stanceType: null,
    stanceWidth: STANCE_WIDTH_FULL,
  },
  // Other
  "Other": {
    gripType: ["Pronated", "Supinated", "Neutral", "1up/1down", "Semi-Pronated", "Semi-Supinated", "Rotating", "Other"],
    gripWidth: null,
    stanceType: STANCE_TYPE_FULL,
    stanceWidth: STANCE_WIDTH_FULL,
  },
};

/**
 * When Cable equipment has a Cable Attachment selected, use these options instead of base Cable.
 * Key = attachment name; value = same shape as EQUIPMENT_GRIP_STANCE_OPTIONS.
 */
export const CABLE_ATTACHMENT_GRIP_STANCE_OPTIONS = {
  "Rope": {
    gripType: ["Neutral", "Semi-Supinated", "Semi-Pronated", "Rotating"],
    gripWidth: null,
    stanceType: null,
    stanceWidth: null,
  },
  "Lat Pulldown Bar": {
    gripType: ["Supinated", "Pronated"],
    gripWidth: GRIP_WIDTH_FULL,
    stanceType: null,
    stanceWidth: null,
  },
  "Straight Bar": {
    gripType: ["Supinated", "Pronated"],
    gripWidth: ["Extra Wide", "Extra Narrow", "Wide", "Shoulder Width", "Narrow"],
    stanceType: null,
    stanceWidth: null,
  },
  "Single Handle": {
    gripType: ["Neutral", "Pronated", "Supinated", "Semi-Pronated", "Semi-Supinated", "Rotating", "Other"],
    gripWidth: null,
    stanceType: null,
    stanceWidth: null,
  },
  "V-Grip": {
    gripType: ["Neutral", "Semi-Pronated", "Semi-Supinated"],
    gripWidth: ["Narrow", "Extra Narrow"],
    stanceType: null,
    stanceWidth: null,
  },
  "MAG Grip Bar": {
    gripType: ["Neutral", "Semi-Pronated", "Semi-Supinated"],
    gripWidth: GRIP_WIDTH_FULL,
    stanceType: null,
    stanceWidth: null,
  },
  "PRO-Style Bar": {
    gripType: ["Neutral", "Pronated", "Supinated", "Semi-Pronated", "Semi-Supinated"],
    gripWidth: GRIP_WIDTH_FULL,
    stanceType: null,
    stanceWidth: null,
  },
  "Multi/T-Bar Style": {
    gripType: ["Neutral"],
    gripWidth: ["Shoulder Width"],
    stanceType: null,
    stanceWidth: null,
  },
  "Multi-Row": {
    gripType: ["Neutral", "Pronated", "Supinated", "Semi-Pronated", "Semi-Supinated"],
    gripWidth: GRIP_WIDTH_FULL,
    stanceType: null,
    stanceWidth: null,
  },
  "EZ Bar": {
    gripType: ["Semi-Pronated", "Semi-Supinated"],
    gripWidth: ["Narrow", "Shoulder Width", "Wide"],
    stanceType: null,
    stanceWidth: null,
  },
  "V-Bar": {
    gripType: ["Semi-Pronated", "Semi-Supinated"],
    gripWidth: ["Narrow", "Extra Narrow"],
    stanceType: null,
    stanceWidth: null,
  },
  "Ankle Strap": {
    gripType: ["Neutral"],
    gripWidth: null,
    stanceType: null,
    stanceWidth: null,
  },
  "Ab Harness": {
    gripType: null,
    gripWidth: null,
    stanceType: null,
    stanceWidth: null,
  },
  "Other": {
    gripType: ["Neutral", "Pronated", "Supinated", "Semi-Pronated", "Semi-Supinated", "Rotating", "1up/1down", "Flat Palms Up", "Other"],
    gripWidth: GRIP_WIDTH_FULL,
    stanceType: ["Narrow", "Shoulder Width", "Wide", "Extra Narrow", "Extra Wide"],
    stanceWidth: ["Extra Wide", "Extra Narrow", "Wide", "Shoulder Width", "Narrow"],
  },
};

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

/** Map legacy "Assisted Machine" to "Machine (Selectorized)" + assistedNegative */
export const migrateAssistedMachine = (ex) => {
  const tags = ex.weightEquipTags || [];
  if (!tags.includes("Assisted Machine")) return ex;
  const weightEquipTags = tags.map(t => t === "Assisted Machine" ? "Machine (Selectorized)" : t);
  return { ...ex, weightEquipTags, assistedNegative: true };
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
