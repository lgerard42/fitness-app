// Legacy migration: equipment labels from equipment table (for migrateExercise when DB not yet loaded)
const _equipment = require('../database/tables/equipment.json');
export const LEGACY_EQUIPMENT_LABELS = _equipment.filter((r) => !r.is_attachment).map((r) => r.label);

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

// Grip Type and Grip Width options are now loaded from database via hooks
// These are kept as empty arrays for backward compatibility - components should use hooks
export const GRIP_TYPES = [];
export const GRIP_WIDTHS = [];

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

// Lookup by id for display - these should be built from database-loaded data in components
// Keeping empty objects for backward compatibility
export const GRIP_TYPES_BY_ID = {};
export const GRIP_WIDTHS_BY_ID = {};
export const STANCE_TYPES_BY_ID = Object.fromEntries(STANCE_TYPES.map(o => [o.id, o]));
export const STANCE_WIDTHS_BY_ID = Object.fromEntries(STANCE_WIDTHS.map(o => [o.id, o]));
export const SINGLE_DOUBLE_OPTIONS_BY_ID = Object.fromEntries(SINGLE_DOUBLE_OPTIONS.map(o => [o.id, o]));

/** Build CABLE_ATTACHMENTS_BY_ID from cable attachments array (from useCableAttachments) */
export function buildCableAttachmentsById(cableAttachments) {
  return Object.fromEntries((cableAttachments || []).map(o => [o.id, o]));
}

/**
 * Helper function to build GRIP_TYPES_BY_ID from database-loaded grip types
 */
export function buildGripTypesById(gripTypes) {
  return Object.fromEntries(gripTypes.map(o => [o.id, { id: o.id, label: o.label }]));
}

/**
 * Helper function to build GRIP_WIDTHS_BY_ID from database-loaded grip widths
 */
export function buildGripWidthsById(gripWidths) {
  return Object.fromEntries(gripWidths.map(o => [o.id, { id: o.id, label: o.label }]));
}

/** Normalize saved value to option id (pass through if already id, else resolve legacy label). */
export function optionIdFromLegacy(value, optionList, byId) {
  if (!value) return '';
  const v = String(value);
  if (byId && byId[v]) return v;
  
  const option = optionList.find(
    o => o.label === v ||
      (o.id && o.id.toLowerCase() === v.toLowerCase()) ||
      (o.sublabel && `${o.label} (${o.sublabel})` === v) ||
      (o.sublabel && `${o.sublabel} (${o.label})` === v)
  );
  return option ? option.id : value;
}

// Id arrays for equipment mapping (values in EQUIPMENT_GRIP_STANCE_OPTIONS)
// Using new IDs directly
const GRIP_WIDTH_FULL_IDS = ['WIDTH_EXTRA_NARROW', 'WIDTH_NARROW', 'WIDTH_SHOULDER', 'WIDTH_WIDE', 'WIDTH_EXTRA_WIDE'];
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
    gripType: ["GRIP_PRONATED", "GRIP_SUPINATED", "GRIP_ALTERNATING"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "EZ Bar": {
    gripType: ["GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED"],
    gripWidth: ["WIDTH_NARROW", "WIDTH_SHOULDER", "WIDTH_WIDE"],
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Trap Bar (Hex Bar)": {
    gripType: ["GRIP_NEUTRAL", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED"],
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
    gripType: ["GRIP_NEUTRAL", "GRIP_SEMI_PRONATED"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Cambered Bar": {
    gripType: ["GRIP_PRONATED", "GRIP_ALTERNATING", "GRIP_SUPINATED", "GRIP_NEUTRAL", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  // Free-Weights
  "Dumbbell": {
    gripType: ["GRIP_PRONATED", "GRIP_SUPINATED", "GRIP_NEUTRAL", "GRIP_ALTERNATING", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED", "GRIP_ROTATING", "GRIP_OTHER"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Kettlebell": {
    gripType: ["GRIP_PRONATED", "GRIP_SUPINATED", "GRIP_NEUTRAL", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Plate": {
    gripType: ["GRIP_PRONATED", "GRIP_NEUTRAL", "GRIP_OTHER", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED", "GRIP_FLAT", "GRIP_SUPINATED"],
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
    gripType: ["GRIP_NEUTRAL", "GRIP_PRONATED", "GRIP_OTHER"],
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
    gripType: ["GRIP_PRONATED", "GRIP_SUPINATED", "GRIP_NEUTRAL", "GRIP_ROTATING", "GRIP_ALTERNATING", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED", "GRIP_OTHER"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Band": {
    gripType: ["GRIP_PRONATED", "GRIP_SUPINATED", "GRIP_NEUTRAL", "GRIP_ALTERNATING", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED", "GRIP_ROTATING", "GRIP_OTHER"],
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
    gripType: ["GRIP_NEUTRAL", "GRIP_PRONATED", "GRIP_SEMI_PRONATED", "GRIP_SUPINATED", "GRIP_ALTERNATING", "GRIP_SEMI_SUPINATED", "GRIP_ROTATING"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_LEG_MACHINE_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Machine (Selectorized)": {
    gripType: ["GRIP_NEUTRAL", "GRIP_PRONATED", "GRIP_SEMI_PRONATED", "GRIP_SUPINATED", "GRIP_ALTERNATING", "GRIP_SEMI_SUPINATED", "GRIP_ROTATING"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_LEG_MACHINE_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Plate Loaded (Machine)": {
    gripType: ["GRIP_NEUTRAL", "GRIP_PRONATED", "GRIP_SEMI_PRONATED", "GRIP_SUPINATED", "GRIP_ALTERNATING", "GRIP_SEMI_SUPINATED", "GRIP_ROTATING"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_LEG_MACHINE_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Smith Machine": {
    gripType: ["GRIP_PRONATED", "GRIP_ALTERNATING", "GRIP_SUPINATED"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_LEG_MACHINE_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  // Cable
  "Cable": {
    gripType: ["GRIP_PRONATED", "GRIP_SUPINATED", "GRIP_NEUTRAL", "GRIP_ALTERNATING", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED", "GRIP_ROTATING", "GRIP_OTHER"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  // Suspension
  "TRX / Suspension Trainer": {
    gripType: ["GRIP_NEUTRAL", "GRIP_ROTATING", "GRIP_SEMI_SUPINATED", "GRIP_ALTERNATING", "GRIP_SEMI_PRONATED", "GRIP_SUPINATED", "GRIP_PRONATED"],
    gripWidth: null,
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "Rings": {
    gripType: ["GRIP_NEUTRAL", "GRIP_ROTATING", "GRIP_SEMI_SUPINATED", "GRIP_ALTERNATING", "GRIP_SEMI_PRONATED", "GRIP_SUPINATED", "GRIP_PRONATED"],
    gripWidth: ["WIDTH_EXTRA_NARROW", "WIDTH_NARROW", "WIDTH_SHOULDER", "WIDTH_EXTRA_WIDE", "WIDTH_WIDE"],
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
    gripType: ["GRIP_NEUTRAL", "GRIP_OTHER", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED", "GRIP_SUPINATED", "GRIP_PRONATED"],
    gripWidth: null,
    stanceType: null,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  // Other
  "Other": {
    gripType: ["GRIP_PRONATED", "GRIP_SUPINATED", "GRIP_NEUTRAL", "GRIP_ALTERNATING", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED", "GRIP_ROTATING", "GRIP_OTHER"],
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
    gripType: ["GRIP_NEUTRAL", "GRIP_SEMI_SUPINATED", "GRIP_SEMI_PRONATED", "GRIP_ROTATING"],
    gripWidth: null,
    stanceType: null,
    stanceWidth: null,
  },
  "LAT_PULLDOWN_BAR": {
    gripType: ["GRIP_SUPINATED", "GRIP_PRONATED"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: null,
    stanceWidth: null,
  },
  "STRAIGHT_BAR": {
    gripType: ["GRIP_SUPINATED", "GRIP_PRONATED"],
    gripWidth: ["WIDTH_EXTRA_WIDE", "WIDTH_EXTRA_NARROW", "WIDTH_WIDE", "WIDTH_SHOULDER", "WIDTH_NARROW"],
    stanceType: null,
    stanceWidth: null,
  },
  "SINGLE_HANDLE": {
    gripType: ["GRIP_NEUTRAL", "GRIP_PRONATED", "GRIP_SUPINATED", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED", "GRIP_ROTATING", "GRIP_OTHER"],
    gripWidth: null,
    stanceType: null,
    stanceWidth: null,
  },
  "V_GRIP": {
    gripType: ["GRIP_NEUTRAL", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED"],
    gripWidth: ["WIDTH_NARROW", "WIDTH_EXTRA_NARROW"],
    stanceType: null,
    stanceWidth: null,
  },
  "MAG_GRIP_BAR": {
    gripType: ["GRIP_NEUTRAL", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: null,
    stanceWidth: null,
  },
  "PRO_STYLE_BAR": {
    gripType: ["GRIP_NEUTRAL", "GRIP_PRONATED", "GRIP_SUPINATED", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: null,
    stanceWidth: null,
  },
  "MULTI_T_BAR_STYLE": {
    gripType: ["GRIP_NEUTRAL"],
    gripWidth: ["WIDTH_SHOULDER"],
    stanceType: null,
    stanceWidth: null,
  },
  "MULTI_ROW": {
    gripType: ["GRIP_NEUTRAL", "GRIP_PRONATED", "GRIP_SUPINATED", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED"],
    gripWidth: GRIP_WIDTH_FULL_IDS,
    stanceType: null,
    stanceWidth: null,
  },
  "EZ_BAR": {
    gripType: ["GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED"],
    gripWidth: ["WIDTH_NARROW", "WIDTH_SHOULDER", "WIDTH_WIDE"],
    stanceType: null,
    stanceWidth: null,
  },
  "V_BAR": {
    gripType: ["GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED"],
    gripWidth: ["WIDTH_NARROW", "WIDTH_EXTRA_NARROW"],
    stanceType: null,
    stanceWidth: null,
  },
  "ANKLE_STRAP": {
    gripType: ["GRIP_NEUTRAL"],
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
    gripType: ["GRIP_NEUTRAL", "GRIP_PRONATED", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED"],
    gripWidth: ["WIDTH_NARROW", "WIDTH_SHOULDER", "WIDTH_WIDE"],
    stanceType: STANCE_TYPE_FULL_IDS,
    stanceWidth: STANCE_WIDTH_FULL_IDS,
  },
  "OTHER": {
    gripType: ["GRIP_NEUTRAL", "GRIP_PRONATED", "GRIP_SUPINATED", "GRIP_SEMI_PRONATED", "GRIP_SEMI_SUPINATED", "GRIP_ROTATING", "GRIP_ALTERNATING", "GRIP_FLAT", "GRIP_OTHER"],
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
