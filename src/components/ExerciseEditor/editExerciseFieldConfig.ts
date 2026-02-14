/**
 * Single source of truth for EditExercise field labels, placeholders, and input configuration.
 * Modify here to change labels/styling for all categories (Cardio/Lifts/Training).
 */
export const FIELD_LABELS = {
  exerciseName: 'EXERCISE NAME',
  description: 'Description',
  category: 'CATEGORY',
  primaryMuscleGroups: 'PRIMARY MUSCLE GROUPS',
  secondary: 'SECONDARY',
  metabolicIntensity: 'METABOLIC INTENSITY',
  trainingFocus: 'TRAINING FOCUS',
  weightEquip: 'WEIGHT EQUIP.',
  add2nd: 'ADD 2ND',
  cableAttachments: 'CABLE ATTACHMENTS',
  assistedNegative: 'ASSISTED / NEGATIVE',
  additionalSettings: 'ADDITIONAL SETTINGS:',
  trackDuration: 'TRACK DURATION',
  trackReps: 'TRACK REPS',
  trackDistance: 'TRACK DISTANCE',
  allowDurationTracking: 'ALLOW DURATION TRACKING',
  allowRepsTracking: 'ALLOW REPS TRACKING',
  allowDistanceTracking: 'ALLOW DISTANCE TRACKING',
  on: 'ON',
} as const;

export const PLACEHOLDERS = {
  exerciseName: 'e.g. Bulgarian Split Squat',
  description: 'Add notes about form, cues, or setup...',
  metabolicIntensity: 'Select METABOLIC INTENSITY...',
  trainingFocus: 'Select Training Focus...',
  cableAttachment: 'Select Cable Attachment...',
  equipment: 'Equipment',
  gripType: 'Grip Type',
  gripWidth: 'Grip Width',
} as const;
