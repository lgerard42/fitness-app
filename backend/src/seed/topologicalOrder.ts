/**
 * Locked topological seed order respecting FK dependencies.
 *
 * Tier 0: No dependencies
 * Tier 1: Self-referencing (parent_id -> same table)
 * Tier 2: No cross-table FKs
 * Tier 3: Cross-table FKs (equipment -> equipmentCategories)
 */

export interface SeedTableEntry {
  /** camelCase key matching admin tableRegistry */
  key: string;
  /** JSON filename */
  file: string;
  /** PostgreSQL table name (snake_case) */
  pgTable: string;
  /** Seed tier for ordering */
  tier: 0 | 1 | 2 | 3;
  /** Whether the table is a key-value map (not an array) */
  isKeyValueMap?: boolean;
  /** Self-referencing FK column name, if any */
  selfRefColumn?: string;
  /** Cross-table FK definitions */
  foreignKeys?: { column: string; refTable: string }[];
}

export const SEED_ORDER: SeedTableEntry[] = [
  // Tier 0
  { key: "exerciseCategories", file: "exerciseCategories.json", pgTable: "exercise_categories", tier: 0 },
  { key: "cardioTypes", file: "cardioTypes.json", pgTable: "cardio_types", tier: 0 },
  { key: "trainingFocus", file: "trainingFocus.json", pgTable: "training_focus", tier: 0 },
  { key: "muscles", file: "muscles.json", pgTable: "muscles", tier: 0 },

  // Tier 1 -- self-referencing
  { key: "motions", file: "motions.json", pgTable: "motions", tier: 1, selfRefColumn: "parent_id" },
  { key: "grips", file: "grips.json", pgTable: "grips", tier: 1, selfRefColumn: "parent_id" },
  { key: "equipmentCategories", file: "equipmentCategories.json", pgTable: "equipment_categories", tier: 1, selfRefColumn: "parent_id" },

  // Tier 2 -- no cross-table FKs
  { key: "motionPaths", file: "motionPaths.json", pgTable: "motion_paths", tier: 2 },
  { key: "torsoAngles", file: "torsoAngles.json", pgTable: "torso_angles", tier: 2 },
  { key: "torsoOrientations", file: "torsoOrientations.json", pgTable: "torso_orientations", tier: 2 },
  { key: "resistanceOrigin", file: "resistanceOrigin.json", pgTable: "resistance_origin", tier: 2 },
  { key: "gripWidths", file: "gripWidths.json", pgTable: "grip_widths", tier: 2 },
  { key: "elbowRelationship", file: "elbowRelationship.json", pgTable: "elbow_relationship", tier: 2 },
  { key: "executionStyles", file: "executionStyles.json", pgTable: "execution_styles", tier: 2 },
  { key: "footPositions", file: "footPositions.json", pgTable: "foot_positions", tier: 2 },
  { key: "stanceWidths", file: "stanceWidths.json", pgTable: "stance_widths", tier: 2 },
  { key: "stanceTypes", file: "stanceTypes.json", pgTable: "stance_types", tier: 2 },
  { key: "loadPlacement", file: "loadPlacement.json", pgTable: "load_placement", tier: 2 },
  { key: "supportStructures", file: "supportStructures.json", pgTable: "support_structures", tier: 2 },
  { key: "loadingAids", file: "loadingAids.json", pgTable: "loading_aids", tier: 2 },
  { key: "rangeOfMotion", file: "rangeOfMotion.json", pgTable: "range_of_motion", tier: 2 },

  // Tier 3 -- cross-table FKs
  {
    key: "equipment",
    file: "equipment.json",
    pgTable: "equipment",
    tier: 3,
    foreignKeys: [{ column: "category_id", refTable: "equipment_categories" }],
  },
  { key: "equipmentIcons", file: "equipmentIcons.json", pgTable: "equipment_icons", tier: 3, isKeyValueMap: true },
];
