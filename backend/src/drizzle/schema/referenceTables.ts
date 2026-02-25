/**
 * Reference table name constants and mappings.
 *
 * Schema is now defined in prisma/schema.prisma. This file only
 * exports the table name arrays and lookup maps used by admin CRUD,
 * the reference service, and the seed pipeline.
 */

export const ALL_REFERENCE_TABLES = [
  "exercise_categories",
  "cardio_types",
  "training_focus",
  "muscles",
  "motions",
  "grips",
  "equipment_categories",
  "motion_paths",
  "torso_angles",
  "torso_orientations",
  "resistance_origin",
  "grip_widths",
  "elbow_relationship",
  "execution_styles",
  "foot_positions",
  "stance_widths",
  "stance_types",
  "load_placement",
  "support_structures",
  "loading_aids",
  "range_of_motion",
  "equipment",
  "equipment_icons",
] as const;

export type ReferenceTableName = (typeof ALL_REFERENCE_TABLES)[number];

/**
 * Maps JSON table key (camelCase from admin registry) to Postgres table name.
 */
export const TABLE_KEY_TO_PG: Record<string, ReferenceTableName> = {
  exerciseCategories: "exercise_categories",
  cardioTypes: "cardio_types",
  trainingFocus: "training_focus",
  muscles: "muscles",
  motions: "motions",
  grips: "grips",
  equipmentCategories: "equipment_categories",
  motionPaths: "motion_paths",
  torsoAngles: "torso_angles",
  torsoOrientations: "torso_orientations",
  resistanceOrigin: "resistance_origin",
  gripWidths: "grip_widths",
  elbowRelationship: "elbow_relationship",
  executionStyles: "execution_styles",
  footPositions: "foot_positions",
  stanceWidths: "stance_widths",
  stanceTypes: "stance_types",
  loadPlacement: "load_placement",
  supportStructures: "support_structures",
  loadingAids: "loading_aids",
  rangeOfMotion: "range_of_motion",
  equipment: "equipment",
  equipmentIcons: "equipment_icons",
};
