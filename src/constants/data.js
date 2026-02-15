// Legacy migration: equipment labels from gym equipment table (for migrateExercise when DB not yet loaded)
const _gymEquipment = require('../database/tables/gymEquipment.json');
export const LEGACY_EQUIPMENT_LABELS = _gymEquipment.map((r) => r.label);

/** Generate option id: remove special chars, replace spaces with _, lowercase */
export function toId(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s/g, '_')
    .toLowerCase();
}

// Single/Double toggle options: { id, label }
export const SINGLE_DOUBLE_OPTIONS = [
  { id: 'single', label: 'Single' },
  { id: 'double', label: 'Double' },
];

// Grip Type options: { id, label }
export const GRIP_TYPES = [
  { id: 'neutral', label: 'Neutral' },
  { id: 'pronated', label: 'Pronated' },
  { id: 'supinated', label: 'Supinated' },
  { id: 'semi_pronated', label: 'Semi-Pronated' },
  { id: 'semi_supinated', label: 'Semi-Supinated' },
  { id: 'rotating', label: 'Rotating' },
  { id: '1up_1down', label: '1up/1down' },
  { id: 'flat_palms_up', label: 'Flat Palms Up' },
  { id: 'other', label: 'Other' },
];

// Grip Width options: { id, label }
export const GRIP_WIDTHS = [
  { id: 'extra_narrow', label: 'Extra Narrow' },
  { id: 'narrow', label: 'Narrow' },
  { id: 'shoulder_width', label: 'Shoulder Width' },
  { id: 'wide', label: 'Wide' },
  { id: 'extra_wide', label: 'Extra Wide' },
];

// Stance Type options: { id, label, sublabel? } — label = primary, sublabel = secondary line in UI
export const STANCE_TYPES = [
  { id: 'neutral_feet_forward', label: 'Neutral', sublabel: 'Feet Forward' },
  { id: 'toes_out_external_rotation', label: 'External Rotation', sublabel: 'Toes Out' },
  { id: 'toes_in_internal_rotation', label: 'Internal Rotation', sublabel: 'Toes In' },
  { id: 'split_stance', label: 'Split Stance' },
  { id: 'other', label: 'Other' },
];

// Stance Width options: { id, label }
export const STANCE_WIDTHS = [
  { id: 'extra_narrow', label: 'Extra Narrow' },
  { id: 'narrow', label: 'Narrow' },
  { id: 'shoulder_width', label: 'Shoulder Width' },
  { id: 'wide', label: 'Wide' },
  { id: 'extra_wide', label: 'Extra Wide' },
];

// Lookup by id for display
export const GRIP_TYPES_BY_ID = Object.fromEntries(GRIP_TYPES.map(o => [o.id, o]));
export const GRIP_WIDTHS_BY_ID = Object.fromEntries(GRIP_WIDTHS.map(o => [o.id, o]));
export const STANCE_TYPES_BY_ID = Object.fromEntries(STANCE_TYPES.map(o => [o.id, o]));
export const STANCE_WIDTHS_BY_ID = Object.fromEntries(STANCE_WIDTHS.map(o => [o.id, o]));
export const SINGLE_DOUBLE_OPTIONS_BY_ID = Object.fromEntries(SINGLE_DOUBLE_OPTIONS.map(o => [o.id, o]));

/** Build CABLE_ATTACHMENTS_BY_ID from cable attachments array (from useCableAttachments) */
export function buildCableAttachmentsById(cableAttachments) {
  return Object.fromEntries((cableAttachments || []).map(o => [o.id, o]));
}

/** Normalize saved value to option id (pass through if already id, else resolve legacy label). */
export function optionIdFromLegacy(value, optionList, byId) {
  if (!value) return '';
  if (byId && byId[value]) return value;
  const v = String(value);
  const option = optionList.find(
    o => o.label === v ||
      (o.id && o.id.toLowerCase() === v.toLowerCase()) ||
      (o.sublabel && `${o.label} (${o.sublabel})` === v) ||
      (o.sublabel && `${o.sublabel} (${o.label})` === v)
  );
  return option ? option.id : value;
}

// Id arrays for equipment mapping (values in EQUIPMENT_GRIP_STANCE_OPTIONS)
const GRIP_WIDTH_FULL_IDS = GRIP_WIDTHS.map(o => o.id);
const STANCE_TYPE_FULL_IDS = STANCE_TYPES.map(o => o.id);
const STANCE_WIDTH_FULL_IDS = STANCE_WIDTHS.map(o => o.id);
const STANCE_TYPE_LEG_MACHINE_IDS = ['neutral_feet_forward', 'toes_out_external_rotation', 'other'];
const STANCE_TYPE_TRAP_IDS = ['neutral_feet_forward', 'toes_out_external_rotation'];

/**
 * Per-equipment options for Grip Type, Grip Width, Stance Type, Stance Width.
 * Values are arrays of option ids. null/undefined or empty array = field not applicable (do not show).
 */
export const EQUIPMENT_GRIP_STANCE_OPTIONS = {
  // Bars
  "Barbell": {
    gripType: ["pronated", "supinated", "1up_1down"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "EZ Bar": {
    gripType: ["semi_pronated", "semi_supinated"],
    gripWidth: ["narrow", "shoulder_width", "wide"],
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Trap Bar (Hex Bar)": {
    gripType: ["neutral", "semi_pronated", "semi_supinated"],
    gripWidth: null,
    stanceType: STANCE_TYPE_TRAP_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Safety Squat Bar": {
    gripType: null,
    gripWidth: null,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Swiss / Football Bar": {
    gripType: ["neutral", "semi_pronated"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Cambered Bar": {
    gripType: ["pronated", "1up_1down", "supinated", "neutral", "semi_pronated", "semi_supinated"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  // Free-Weights
  "Dumbbell": {
    gripType: ["pronated", "supinated", "neutral", "1up_1down", "semi_pronated", "semi_supinated", "rotating", "other"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Kettlebell": {
    gripType: ["pronated", "supinated", "neutral", "semi_pronated", "semi_supinated"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Plate": {
    gripType: ["pronated", "neutral", "other", "semi_pronated", "semi_supinated", "flat_palms_up", "supinated"],
    gripWidth: null,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Medicine Ball": {
    gripType: null,
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Sandbag": {
    gripType: ["neutral", "pronated", "other"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Weighted Vest": {
    gripType: null,
    gripWidth: null,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Bodyweight": {
    gripType: ["pronated", "supinated", "neutral", "rotating", "1up_1down", "semi_pronated", "semi_supinated", "other"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Band": {
    gripType: ["pronated", "supinated", "neutral", "1up_1down", "semi_pronated", "semi_supinated", "rotating", "other"],
    gripWidth: null,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Chains": {
    gripType: null,
    gripWidth: null,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  // Machines
  "Assisted Machine": {
    gripType: ["neutral", "pronated", "semi_pronated", "supinated", "1up_1down", "semi_supinated", "rotating"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_LEG_MACHINE_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Machine (Selectorized)": {
    gripType: ["neutral", "pronated", "semi_pronated", "supinated", "1up_1down", "semi_supinated", "rotating"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_LEG_MACHINE_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Plate Loaded (Machine)": {
    gripType: ["neutral", "pronated", "semi_pronated", "supinated", "1up_1down", "semi_supinated", "rotating"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_LEG_MACHINE_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Smith Machine": {
    gripType: ["pronated", "1up_1down", "supinated"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_LEG_MACHINE_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  // Cable
  "Cable": {
    gripType: ["pronated", "supinated", "neutral", "1up_1down", "semi_pronated", "semi_supinated", "rotating", "other"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  // Suspension
  "TRX / Suspension Trainer": {
    gripType: ["neutral", "rotating", "semi_supinated", "1up_1down", "semi_pronated", "supinated", "pronated"],
    gripWidth: null,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Rings": {
    gripType: ["neutral", "rotating", "semi_supinated", "1up_1down", "semi_pronated", "supinated", "pronated"],
    gripWidth: ["extra_narrow", "narrow", "shoulder_width", "extra_wide", "wide"],
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: null,
  },
  // Stability
  "Stability Ball": { gripType: null, gripWidth: null, stanceType: null, stanceWidth: null },
  "BOSU": {
    gripType: null,
    gripWidth: null,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: null,
  },
  "Balance Pad": { gripType: null, gripWidth: null, stanceType: null, stanceWidth: null },
  "Sliders": {
    gripType: null,
    gripWidth: null,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: null,
  },
  // Functional
  "Sled / Prowler": { gripType: null, gripWidth: null, stanceType: null, stanceWidth: null },
  "Log": { gripType: null, gripWidth: null, stanceType: null, stanceWidth: null },
  "Yoke": { gripType: null, gripWidth: null, stanceType: null, stanceWidth: null },
  "Tire": { gripType: null, gripWidth: null, stanceType: null, stanceWidth: null },
  "Mace": { gripType: null, gripWidth: null, stanceType: null, stanceWidth: null },
  "Steel / Indian Club": { gripType: null, gripWidth: null, stanceType: null, stanceWidth: null },
  "Battle Ropes": {
    gripType: ["neutral", "other", "semi_pronated", "semi_supinated", "supinated", "pronated"],
    gripWidth: null,
    stanceType: null,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  // Other
  "Other": {
    gripType: ["pronated", "supinated", "neutral", "1up_1down", "semi_pronated", "semi_supinated", "rotating", "other"],
    gripWidth: null,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
};

/**
 * When Cable equipment has a Cable Attachment selected, use these options instead of base Cable.
 * Key = attachment id (uppercase from DB); value = same shape as EQUIPMENT_GRIP_STANCE_OPTIONS (arrays of ids).
 */
export const CABLE_ATTACHMENT_GRIP_STANCE_OPTIONS = {
  "ROPE": {
    gripType: ["neutral", "semi_supinated", "semi_pronated", "rotating"],
    gripWidth: null,
    stanceType: null,
    stanceWidth: null,
  },
  "LAT_PULLDOWN_BAR": {
    gripType: ["supinated", "pronated"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: null,
    stanceWidth: null,
  },
  "STRAIGHT_BAR": {
    gripType: ["supinated", "pronated"],
    gripWidth: ["extra_wide", "extra_narrow", "wide", "shoulder_width", "narrow"],
    stanceType: null,
    stanceWidth: null,
  },
  "SINGLE_HANDLE": {
    gripType: ["neutral", "pronated", "supinated", "semi_pronated", "semi_supinated", "rotating", "other"],
    gripWidth: null,
    stanceType: null,
    stanceWidth: null,
  },
  "V_GRIP": {
    gripType: ["neutral", "semi_pronated", "semi_supinated"],
    gripWidth: ["narrow", "extra_narrow"],
    stanceType: null,
    stanceWidth: null,
  },
  "MAG_GRIP_BAR": {
    gripType: ["neutral", "semi_pronated", "semi_supinated"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: null,
    stanceWidth: null,
  },
  "PRO_STYLE_BAR": {
    gripType: ["neutral", "pronated", "supinated", "semi_pronated", "semi_supinated"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: null,
    stanceWidth: null,
  },
  "MULTI_T_BAR_STYLE": {
    gripType: ["neutral"],
    gripWidth: ["shoulder_width"],
    stanceType: null,
    stanceWidth: null,
  },
  "MULTI_ROW": {
    gripType: ["neutral", "pronated", "supinated", "semi_pronated", "semi_supinated"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: null,
    stanceWidth: null,
  },
  "EZ_BAR": {
    gripType: ["semi_pronated", "semi_supinated"],
    gripWidth: ["narrow", "shoulder_width", "wide"],
    stanceType: null,
    stanceWidth: null,
  },
  "V_BAR": {
    gripType: ["semi_pronated", "semi_supinated"],
    gripWidth: ["narrow", "extra_narrow"],
    stanceType: null,
    stanceWidth: null,
  },
  "ANKLE_STRAP": {
    gripType: ["neutral"],
    gripWidth: null,
    stanceType: null,
    stanceWidth: null,
  },
  "AB_HARNESS": {
    gripType: null,
    gripWidth: null,
    stanceType: null,
    stanceWidth: null,
  },
  "LANDMINE": {
    gripType: ["neutral", "pronated", "semi_pronated", "semi_supinated"],
    gripWidth: ["narrow", "shoulder_width", "wide"],
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "OTHER": {
    gripType: ["neutral", "pronated", "supinated", "semi_pronated", "semi_supinated", "rotating", "1up_1down", "flat_palms_up", "other"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
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
    const found = LEGACY_EQUIPMENT_LABELS.find(t => t.includes(ex.equipment) || ex.equipment?.includes?.(t));
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

/** Map legacy "Assisted Machine" to "Machine (Selectorized)" + assistedNegative (for old persisted data) */
export const migrateAssistedMachine = (ex) => {
  const tags = ex.weightEquipTags || [];
  if (!tags.includes("Assisted Machine")) return ex;
  // Assisted Machine is now its own equipment; keep as-is
  return ex;
};

export const formatDuration = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
