import {
  pgTable,
  text,
  boolean,
  integer,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

export const sourceTypeEnum = pgEnum("source_type", ["seed", "admin"]);

// ─── Tier 0: No dependencies ───────────────────────────────────────

export const exerciseCategories = pgTable("exercise_categories", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  technicalName: text("technical_name"),
  commonNames: jsonb("common_names").default([]),
  shortDescription: text("short_description"),
  exerciseInputPermissions: jsonb("exercise_input_permissions"),
  sortOrder: integer("sort_order").notNull().default(0),
  icon: text("icon").default(""),
  isActive: boolean("is_active").notNull().default(true),
  sourceType: sourceTypeEnum("source_type").notNull().default("seed"),
});

export const cardioTypes = pgTable("cardio_types", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  technicalName: text("technical_name"),
  commonNames: jsonb("common_names").default([]),
  shortDescription: text("short_description"),
  sortOrder: integer("sort_order").notNull().default(0),
  icon: text("icon").default(""),
  isActive: boolean("is_active").notNull().default(true),
  sourceType: sourceTypeEnum("source_type").notNull().default("seed"),
});

export const trainingFocus = pgTable("training_focus", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  technicalName: text("technical_name"),
  commonNames: jsonb("common_names").default([]),
  shortDescription: text("short_description"),
  sortOrder: integer("sort_order").notNull().default(0),
  icon: text("icon").default(""),
  isActive: boolean("is_active").notNull().default(true),
  sourceType: sourceTypeEnum("source_type").notNull().default("seed"),
});

export const muscles = pgTable("muscles", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  parentIds: jsonb("parent_ids").default([]),
  commonNames: jsonb("common_names").default([]),
  technicalName: text("technical_name"),
  shortDescription: text("short_description"),
  function: text("function"),
  location: text("location"),
  triggers: text("triggers"),
  upperLower: jsonb("upper_lower").default([]),
  sortOrder: integer("sort_order").notNull().default(0),
  icon: text("icon").default(""),
  isActive: boolean("is_active").notNull().default(true),
  sourceType: sourceTypeEnum("source_type").notNull().default("seed"),
});

// ─── Tier 1: Self-referencing ───────────────────────────────────────

export const motions = pgTable("motions", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  parentId: text("parent_id").references((): any => motions.id, {
    onUpdate: "cascade",
    onDelete: "restrict",
  }),
  upperLower: jsonb("upper_lower").default([]),
  muscleTargets: jsonb("muscle_targets"),
  defaultDeltaConfigs: jsonb("default_delta_configs"),
  commonNames: jsonb("common_names").default([]),
  shortDescription: text("short_description"),
  sortOrder: integer("sort_order").notNull().default(0),
  icon: text("icon").default(""),
  isActive: boolean("is_active").notNull().default(true),
  sourceType: sourceTypeEnum("source_type").notNull().default("seed"),
});

export const grips = pgTable("grips", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  parentId: text("parent_id").references((): any => grips.id, {
    onUpdate: "cascade",
    onDelete: "restrict",
  }),
  isDynamic: boolean("is_dynamic").notNull().default(false),
  gripCategory: text("grip_category"),
  rotationPath: jsonb("rotation_path"),
  commonNames: jsonb("common_names").default([]),
  deltaRules: jsonb("delta_rules"),
  shortDescription: text("short_description"),
  sortOrder: integer("sort_order").notNull().default(0),
  icon: text("icon").default(""),
  isActive: boolean("is_active").notNull().default(true),
  sourceType: sourceTypeEnum("source_type").notNull().default("seed"),
});

export const equipmentCategories = pgTable("equipment_categories", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  parentId: text("parent_id").references((): any => equipmentCategories.id, {
    onUpdate: "cascade",
    onDelete: "restrict",
  }),
  commonNames: jsonb("common_names").default([]),
  shortDescription: text("short_description"),
  sortOrder: integer("sort_order").notNull().default(0),
  icon: text("icon").default(""),
  isActive: boolean("is_active").notNull().default(true),
  sourceType: sourceTypeEnum("source_type").notNull().default("seed"),
});

// ─── Tier 2: Modifier tables (no cross-table FKs) ──────────────────

export const motionPaths = pgTable("motion_paths", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  commonNames: jsonb("common_names").default([]),
  deltaRules: jsonb("delta_rules"),
  shortDescription: text("short_description"),
  sortOrder: integer("sort_order").notNull().default(0),
  icon: text("icon").default(""),
  isActive: boolean("is_active").notNull().default(true),
  sourceType: sourceTypeEnum("source_type").notNull().default("seed"),
});

export const torsoAngles = pgTable("torso_angles", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  commonNames: jsonb("common_names").default([]),
  shortDescription: text("short_description"),
  deltaRules: jsonb("delta_rules"),
  angleRange: jsonb("angle_range"),
  allowTorsoOrientations: boolean("allow_torso_orientations")
    .notNull()
    .default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  icon: text("icon").default(""),
  isActive: boolean("is_active").notNull().default(true),
  sourceType: sourceTypeEnum("source_type").notNull().default("seed"),
});

export const torsoOrientations = pgTable("torso_orientations", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  commonNames: jsonb("common_names").default([]),
  shortDescription: text("short_description"),
  deltaRules: jsonb("delta_rules"),
  sortOrder: integer("sort_order").notNull().default(0),
  icon: text("icon").default(""),
  isActive: boolean("is_active").notNull().default(true),
  sourceType: sourceTypeEnum("source_type").notNull().default("seed"),
});

export const resistanceOrigin = pgTable("resistance_origin", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  commonNames: jsonb("common_names").default([]),
  deltaRules: jsonb("delta_rules"),
  shortDescription: text("short_description"),
  sortOrder: integer("sort_order").notNull().default(0),
  icon: text("icon").default(""),
  isActive: boolean("is_active").notNull().default(true),
  sourceType: sourceTypeEnum("source_type").notNull().default("seed"),
});

export const gripWidths = pgTable("grip_widths", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  commonNames: jsonb("common_names").default([]),
  shortDescription: text("short_description"),
  deltaRules: jsonb("delta_rules"),
  sortOrder: integer("sort_order").notNull().default(0),
  icon: text("icon").default(""),
  isActive: boolean("is_active").notNull().default(true),
  sourceType: sourceTypeEnum("source_type").notNull().default("seed"),
});

export const elbowRelationship = pgTable("elbow_relationship", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  commonNames: jsonb("common_names").default([]),
  shortDescription: text("short_description"),
  deltaRules: jsonb("delta_rules"),
  sortOrder: integer("sort_order").notNull().default(0),
  icon: text("icon").default(""),
  isActive: boolean("is_active").notNull().default(true),
  sourceType: sourceTypeEnum("source_type").notNull().default("seed"),
});

export const executionStyles = pgTable("execution_styles", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  commonNames: jsonb("common_names").default([]),
  deltaRules: jsonb("delta_rules"),
  shortDescription: text("short_description"),
  sortOrder: integer("sort_order").notNull().default(0),
  icon: text("icon").default(""),
  isActive: boolean("is_active").notNull().default(true),
  sourceType: sourceTypeEnum("source_type").notNull().default("seed"),
});

export const footPositions = pgTable("foot_positions", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  commonNames: jsonb("common_names").default([]),
  shortDescription: text("short_description"),
  deltaRules: jsonb("delta_rules"),
  sortOrder: integer("sort_order").notNull().default(0),
  icon: text("icon").default(""),
  isActive: boolean("is_active").notNull().default(true),
  sourceType: sourceTypeEnum("source_type").notNull().default("seed"),
});

export const stanceWidths = pgTable("stance_widths", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  commonNames: jsonb("common_names").default([]),
  shortDescription: text("short_description"),
  deltaRules: jsonb("delta_rules"),
  sortOrder: integer("sort_order").notNull().default(0),
  icon: text("icon").default(""),
  isActive: boolean("is_active").notNull().default(true),
  sourceType: sourceTypeEnum("source_type").notNull().default("seed"),
});

export const stanceTypes = pgTable("stance_types", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  commonNames: jsonb("common_names").default([]),
  shortDescription: text("short_description"),
  deltaRules: jsonb("delta_rules"),
  sortOrder: integer("sort_order").notNull().default(0),
  icon: text("icon").default(""),
  isActive: boolean("is_active").notNull().default(true),
  sourceType: sourceTypeEnum("source_type").notNull().default("seed"),
});

export const loadPlacement = pgTable("load_placement", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  commonNames: jsonb("common_names").default([]),
  loadCategory: text("load_category"),
  allowsSecondary: boolean("allows_secondary").notNull().default(false),
  isValidSecondary: boolean("is_valid_secondary").notNull().default(false),
  deltaRules: jsonb("delta_rules"),
  shortDescription: text("short_description"),
  sortOrder: integer("sort_order").notNull().default(0),
  icon: text("icon").default(""),
  isActive: boolean("is_active").notNull().default(true),
  sourceType: sourceTypeEnum("source_type").notNull().default("seed"),
});

export const supportStructures = pgTable("support_structures", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  commonNames: jsonb("common_names").default([]),
  shortDescription: text("short_description"),
  deltaRules: jsonb("delta_rules"),
  sortOrder: integer("sort_order").notNull().default(0),
  icon: text("icon").default(""),
  isActive: boolean("is_active").notNull().default(true),
  sourceType: sourceTypeEnum("source_type").notNull().default("seed"),
});

export const loadingAids = pgTable("loading_aids", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  commonNames: jsonb("common_names").default([]),
  shortDescription: text("short_description"),
  deltaRules: jsonb("delta_rules"),
  sortOrder: integer("sort_order").notNull().default(0),
  icon: text("icon").default(""),
  isActive: boolean("is_active").notNull().default(true),
  sourceType: sourceTypeEnum("source_type").notNull().default("seed"),
});

export const rangeOfMotion = pgTable("range_of_motion", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  commonNames: jsonb("common_names").default([]),
  shortDescription: text("short_description"),
  deltaRules: jsonb("delta_rules"),
  sortOrder: integer("sort_order").notNull().default(0),
  icon: text("icon").default(""),
  isActive: boolean("is_active").notNull().default(true),
  sourceType: sourceTypeEnum("source_type").notNull().default("seed"),
});

// ─── Tier 3: Cross-table FKs ───────────────────────────────────────

export const equipment = pgTable("equipment", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  categoryId: text("category_id").references(() => equipmentCategories.id, {
    onUpdate: "cascade",
    onDelete: "restrict",
  }),
  commonNames: jsonb("common_names").default([]),
  shortDescription: text("short_description"),
  isAttachment: boolean("is_attachment").notNull().default(false),
  requiresAttachment: boolean("requires_attachment").notNull().default(false),
  maxInstances: integer("max_instances").notNull().default(1),
  modifierConstraints: jsonb("modifier_constraints"),
  sortOrder: integer("sort_order").notNull().default(0),
  icon: text("icon").default(""),
  isActive: boolean("is_active").notNull().default(true),
  sourceType: sourceTypeEnum("source_type").notNull().default("seed"),
});

export const equipmentIcons = pgTable("equipment_icons", {
  id: text("id").primaryKey(),
  value: text("value").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sourceType: sourceTypeEnum("source_type").notNull().default("seed"),
});

// ─── Table name constants for triggers and seed ordering ────────────

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

/**
 * Maps each Drizzle table schema object to its Postgres table name.
 */
export const DRIZZLE_TABLES: Record<string, any> = {
  exercise_categories: exerciseCategories,
  cardio_types: cardioTypes,
  training_focus: trainingFocus,
  muscles,
  motions,
  grips,
  equipment_categories: equipmentCategories,
  motion_paths: motionPaths,
  torso_angles: torsoAngles,
  torso_orientations: torsoOrientations,
  resistance_origin: resistanceOrigin,
  grip_widths: gripWidths,
  elbow_relationship: elbowRelationship,
  execution_styles: executionStyles,
  foot_positions: footPositions,
  stance_widths: stanceWidths,
  stance_types: stanceTypes,
  load_placement: loadPlacement,
  support_structures: supportStructures,
  loading_aids: loadingAids,
  range_of_motion: rangeOfMotion,
  equipment,
  equipment_icons: equipmentIcons,
};
