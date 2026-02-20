/**
 * Service layer for querying exercise configuration tables
 * Provides typed interfaces and helper functions for database queries
 */
import * as SQLite from 'expo-sqlite';

export interface ExerciseCategory {
  id: string;
  label: string;
  technical_name?: string;
  common_names?: string;
  icon?: string;
  short_description?: string;
  exercise_input_permissions?: string; // JSON string: { cardio_types: "allowed"|"required"|"forbidden", muscle_groups: "...", training_focus: "..." }
}

export interface CardioType {
  id: string;
  label: string;
  technical_name?: string;
  common_names?: string;
  icon?: string;
  short_description?: string;
}

export interface Muscle {
  id: string;
  parent_ids?: string; // JSON array string
  label: string;
  common_names?: string;
  technical_name?: string;
  short_description?: string;
  function?: string;
  location?: string;
  triggers?: string;
  upper_lower?: string; // JSON array string
  icon?: string;
  sort_order?: number;
}

export interface TrainingFocus {
  id: string;
  label: string;
  technical_name?: string;
  common_names?: string;
  icon?: string;
  short_description?: string;
}

export interface EquipmentCategory {
  id: string;
  parent_id?: string;
  label: string;
  common_names?: string;
  short_description?: string;
  sort_order?: number;
}

export interface Equipment {
  id: string;
  category_id?: string;
  label: string;
  common_names?: string;
  short_description?: string;
  is_attachment: number;
  requires_attachment: number;
  max_instances: number;
  modifier_constraints?: string; // JSON string
  sort_order?: number;
}

export interface Grip {
  id: string;
  parent_id?: string;
  label: string;
  is_dynamic: number;
  grip_category?: string;
  rotation_path?: string; // JSON string
  common_names?: string;
  delta_rules?: string; // JSON string
  short_description?: string;
  sort_order?: number;
  icon?: string;
}

export interface DeltaModifier {
  id: string;
  label: string;
  common_names?: string;
  icon?: string;
  short_description?: string;
  delta_rules?: string;
}

export interface TorsoAngle extends DeltaModifier {
  angle_range?: string;
  allow_torso_orientations?: number;
}

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    const { initDatabase } = await import('./initDatabase');
    dbInstance = await initDatabase();
  }
  return dbInstance;
}

/**
 * Get all exercise categories
 */
export async function getExerciseCategories(): Promise<ExerciseCategory[]> {
  const db = await getDatabase();
  return await db.getAllAsync<ExerciseCategory>('SELECT * FROM exercise_categories ORDER BY label');
}

/**
 * Get exercise category by ID
 */
export async function getExerciseCategoryById(id: string): Promise<ExerciseCategory | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<ExerciseCategory>(
    'SELECT * FROM exercise_categories WHERE id = ?',
    [id]
  );
  return result || null;
}

/**
 * Get all cardio types
 */
export async function getCardioTypes(): Promise<CardioType[]> {
  const db = await getDatabase();
  return await db.getAllAsync<CardioType>('SELECT * FROM cardio_types ORDER BY label');
}

/**
 * Get cardio type by ID
 */
export async function getCardioTypeById(id: string): Promise<CardioType | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<CardioType>(
    'SELECT * FROM cardio_types WHERE id = ?',
    [id]
  );
  return result || null;
}

/**
 * Get all muscles from the unified muscles table
 */
export async function getAllMuscles(): Promise<Muscle[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Muscle>('SELECT * FROM muscles ORDER BY sort_order, label');
}

/**
 * Get a single muscle by ID
 */
export async function getMuscleById(id: string): Promise<Muscle | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<Muscle>(
    'SELECT * FROM muscles WHERE id = ?',
    [id]
  );
  return result || null;
}

/**
 * Get muscles whose parent_ids contain the given parent ID
 */
export async function getMusclesByParent(parentId: string): Promise<Muscle[]> {
  const allMuscles = await getAllMuscles();
  return allMuscles.filter(m => {
    const parents = parseJson<string[]>(m.parent_ids || '[]', []);
    return parents.includes(parentId);
  });
}

/**
 * Get muscles by tier, computed from the parent chain:
 *   PRIMARY   – parent_ids is empty/null/[]
 *   SECONDARY – parents are PRIMARY (parents have no parents)
 *   TERTIARY  – parents are SECONDARY (parents have parents)
 */
export async function getMusclesByTier(tier: 'PRIMARY' | 'SECONDARY' | 'TERTIARY'): Promise<Muscle[]> {
  switch (tier) {
    case 'PRIMARY': return getPrimaryMuscles();
    case 'SECONDARY': return getSecondaryMuscles();
    case 'TERTIARY': return getTertiaryMuscles();
  }
}

/**
 * PRIMARY muscles: parent_ids is empty, null, or []
 */
export async function getPrimaryMuscles(): Promise<Muscle[]> {
  const allMuscles = await getAllMuscles();
  return allMuscles.filter(m => {
    const parents = parseJson<string[]>(m.parent_ids || '[]', []);
    return parents.length === 0;
  });
}

/**
 * SECONDARY muscles: muscles whose parents are PRIMARY (parents have no parents themselves)
 */
export async function getSecondaryMuscles(): Promise<Muscle[]> {
  const allMuscles = await getAllMuscles();
  const primaryIds = new Set(
    allMuscles
      .filter(m => parseJson<string[]>(m.parent_ids || '[]', []).length === 0)
      .map(m => m.id)
  );
  return allMuscles.filter(m => {
    const parents = parseJson<string[]>(m.parent_ids || '[]', []);
    return parents.length > 0 && parents.some(pid => primaryIds.has(pid));
  });
}

/**
 * TERTIARY muscles: muscles whose parents are SECONDARY (parents have parents)
 */
export async function getTertiaryMuscles(): Promise<Muscle[]> {
  const allMuscles = await getAllMuscles();
  const primaryIds = new Set(
    allMuscles
      .filter(m => parseJson<string[]>(m.parent_ids || '[]', []).length === 0)
      .map(m => m.id)
  );
  const secondaryIds = new Set(
    allMuscles
      .filter(m => {
        const parents = parseJson<string[]>(m.parent_ids || '[]', []);
        return parents.length > 0 && parents.some(pid => primaryIds.has(pid));
      })
      .map(m => m.id)
  );
  return allMuscles.filter(m => {
    const parents = parseJson<string[]>(m.parent_ids || '[]', []);
    return parents.length > 0 && parents.some(pid => secondaryIds.has(pid));
  });
}

/**
 * Get all training focus options
 */
export async function getTrainingFocus(): Promise<TrainingFocus[]> {
  const db = await getDatabase();
  return await db.getAllAsync<TrainingFocus>('SELECT * FROM training_focus ORDER BY label');
}

/**
 * Get training focus by ID
 */
export async function getTrainingFocusById(id: string): Promise<TrainingFocus | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<TrainingFocus>(
    'SELECT * FROM training_focus WHERE id = ?',
    [id]
  );
  return result || null;
}

/**
 * Helper: Parse JSON string safely
 */
function parseJson<T>(jsonString: string | null | undefined, defaultValue: T): T {
  if (!jsonString) return defaultValue;
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Get allowed cardio types for a category
 */
export async function getAllowedCardioTypesForCategory(categoryId: string): Promise<string[]> {
  const category = await getExerciseCategoryById(categoryId);
  if (!category || !category.exercise_input_permissions) return [];
  
  const permissions = parseJson<{ cardio_types?: string }>(category.exercise_input_permissions, {});
  if (permissions.cardio_types === 'allowed' || permissions.cardio_types === 'required') {
    const allCardioTypes = await getCardioTypes();
    return allCardioTypes.map(ct => ct.id);
  }
  return [];
}

/**
 * Get allowed muscle groups for a category
 * Returns the permission level and resolves to actual muscle group arrays if needed
 */
export async function getAllowedMuscleGroupsForCategory(categoryId: string): Promise<{
  required?: string[];
  allowed?: string[];
}> {
  const category = await getExerciseCategoryById(categoryId);
  if (!category || !category.exercise_input_permissions) return {};
  
  const permissions = parseJson<{ muscle_groups?: string }>(category.exercise_input_permissions, {});
  const permissionLevel = permissions.muscle_groups || 'forbidden';
  
  // For backward compatibility, return structure similar to old format
  // If required, return PRIMARY_MUSCLES as required
  // If allowed, return all muscle groups as allowed
  if (permissionLevel === 'required') {
    return { required: ['PRIMARY_MUSCLES'] };
  } else if (permissionLevel === 'allowed') {
    // Return all muscle group types as allowed
    return { allowed: ['PRIMARY_MUSCLES', 'SECONDARY_MUSCLES', 'TERTIARY_MUSCLES'] };
  }
  
  return {};
}

/**
 * Get allowed training focus for a category
 */
export async function getAllowedTrainingFocusForCategory(categoryId: string): Promise<{
  required?: string;
  allowed?: string;
}> {
  const category = await getExerciseCategoryById(categoryId);
  if (!category || !category.exercise_input_permissions) return {};
  
  const permissions = parseJson<{ training_focus?: string }>(category.exercise_input_permissions, {});
  const permissionLevel = permissions.training_focus || 'forbidden';
  
  // For backward compatibility, return structure similar to old format
  if (permissionLevel === 'required') {
    return { required: 'TRAINING_FOCUS' };
  } else if (permissionLevel === 'allowed') {
    return { allowed: 'TRAINING_FOCUS' };
  }
  
  return {};
}

/**
 * Legacy compatibility: Get categories as simple string array (for backward compatibility)
 */
export async function getCategoriesAsStrings(): Promise<string[]> {
  const categories = await getExerciseCategories();
  return categories.map(c => c.label);
}

/**
 * Legacy compatibility: Get primary muscles as simple string array
 */
export async function getPrimaryMusclesAsStrings(): Promise<string[]> {
  const muscles = await getPrimaryMuscles();
  return muscles.map(m => m.label);
}

/**
 * Legacy compatibility: Get cardio types as simple string array
 */
export async function getCardioTypesAsStrings(): Promise<string[]> {
  const types = await getCardioTypes();
  return types.map(t => t.label);
}

/**
 * Legacy compatibility: Get training focus as simple string array
 */
export async function getTrainingFocusAsStrings(): Promise<string[]> {
  const focus = await getTrainingFocus();
  return focus.map(f => f.label);
}

export type EquipmentPickerItem = { label: string; icon?: string };

/**
 * Get equipment picker sections: { title: string; data: EquipmentPickerItem[] }[]
 * Each item includes label and optional icon (base64) from database.
 */
export async function getEquipmentPickerSections(): Promise<{ title: string; data: EquipmentPickerItem[] }[]> {
  const db = await getDatabase();
  const subCats = await db.getAllAsync<{ id: string; label: string }>(
    'SELECT id, label FROM equipment_categories WHERE parent_id IS NOT NULL ORDER BY sort_order, id'
  );
  const sections: { title: string; data: EquipmentPickerItem[] }[] = [];

  for (const sub of subCats) {
    const equip = await db.getAllAsync<{ label: string }>(
      `SELECT label FROM equipment WHERE category_id = ? AND is_attachment = 0 ORDER BY sort_order, label`,
      [sub.id]
    );
    if (equip.length > 0) {
      sections.push({
        title: sub.label,
        data: equip.map((e) => ({ label: e.label })),
      });
    }
  }
  return sections;
}

/**
 * Get label -> icon (base64) map for equipment. Loads from equipmentIcons.json (ID-keyed)
 * and maps to labels via the equipment table.
 */
export async function getEquipmentIconsByLabel(): Promise<Record<string, string>> {
  const db = await getDatabase();
  const equipmentIcons = require('./tables/equipmentIcons.json') as Record<string, string>;
  const rows = await db.getAllAsync<{ id: string; label: string }>(
    'SELECT id, label FROM equipment'
  );
  const map: Record<string, string> = {};
  for (const r of rows) {
    const icon = equipmentIcons[r.id];
    if (icon) map[r.label] = icon;
  }
  return map;
}

/**
 * Get all equipment labels (flat list, non-attachments) for filters and backward compatibility
 */
export async function getEquipmentLabels(): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ label: string }>(
    'SELECT label FROM equipment WHERE is_attachment = 0 ORDER BY sort_order, label'
  );
  return rows.map((r) => r.label);
}

/**
 * Get all equipment items that are cable attachments
 */
export async function getAttachments(): Promise<{ id: string; label: string }[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ id: string; label: string }>(
    'SELECT id, label FROM equipment WHERE is_attachment = 1 ORDER BY sort_order, label'
  );
  return rows;
}

/**
 * Get equipment IDs that support single/double toggle
 */
export async function getSingleDoubleEquipmentLabels(): Promise<string[]> {
  const db = await getDatabase();
  const ids = ['DUMBBELL', 'KETTLEBELL', 'PLATE', 'CHAINS', 'CABLE_STACK', 'WEIGHTS_OTHER'];
  const labels: string[] = [];
  for (const id of ids) {
    const row = await db.getFirstAsync<{ label: string }>('SELECT label FROM equipment WHERE id = ?', [id]);
    if (row) labels.push(row.label);
  }
  return labels;
}

/**
 * Build PRIMARY_TO_SECONDARY_MAP from database (for backward compatibility)
 * Uses the unified muscles table with parent_ids to compute the mapping
 */
export async function buildPrimaryToSecondaryMap(): Promise<Record<string, string[]>> {
  const primaries = await getPrimaryMuscles();
  const secondaries = await getSecondaryMuscles();

  const map: Record<string, string[]> = {};

  primaries.forEach(primary => {
    const relatedSecondaries = secondaries
      .filter(sec => {
        const pids = parseJson<string[]>(sec.parent_ids || '[]', []);
        return pids.includes(primary.id);
      })
      .map(sec => sec.label)
      .sort();

    if (relatedSecondaries.length > 0) {
      map[primary.label] = relatedSecondaries;
    }
  });

  return map;
}

/**
 * Get all grips from the unified grips table
 */
export async function getAllGrips(): Promise<Grip[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Grip>(
    'SELECT * FROM grips WHERE is_active = 1 ORDER BY sort_order, label'
  );
}

/**
 * Get grip by ID
 */
export async function getGripById(id: string): Promise<Grip | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<Grip>(
    'SELECT * FROM grips WHERE id = ?',
    [id]
  );
  return result || null;
}

/**
 * Get grip types (non-width, no parent) from the unified grips table
 */
export async function getGripTypes(): Promise<Grip[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Grip>(
    "SELECT * FROM grips WHERE is_active = 1 AND grip_category != 'Width' AND parent_id IS NULL ORDER BY sort_order, label"
  );
}

/**
 * Get grip widths (grip_category = 'Width') from the unified grips table
 */
export async function getGripWidths(): Promise<Grip[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Grip>(
    "SELECT * FROM grips WHERE is_active = 1 AND grip_category = 'Width' ORDER BY sort_order, label"
  );
}

/**
 * Get rotating grip variations (children of a grip) from the unified grips table
 */
export async function getGripVariations(parentId: string): Promise<Grip[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Grip>(
    'SELECT * FROM grips WHERE is_active = 1 AND parent_id = ? ORDER BY sort_order, label',
    [parentId]
  );
}

/**
 * Get all delta modifier records from a given table
 */
export async function getDeltaModifiers(table: 'foot_positions' | 'stance_types' | 'stance_widths' | 'torso_angles' | 'torso_orientations' | 'support_structures' | 'elbow_relationship' | 'loading_aids'): Promise<DeltaModifier[]> {
  const db = await getDatabase();
  return await db.getAllAsync<DeltaModifier>(
    `SELECT * FROM ${table} WHERE is_active = 1 ORDER BY sort_order, label`
  );
}
