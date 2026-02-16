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
  cardio_types_allowed?: string; // JSON string
  muscle_groups_allowed?: string; // JSON string
  training_focus_allowed?: string; // JSON string
}

export interface CardioType {
  id: string;
  label: string;
  technical_name?: string;
  common_names?: string;
  icon?: string;
  short_description?: string;
}

export interface PrimaryMuscle {
  id: string;
  label: string;
  technical_name?: string;
  common_names?: string;
  icon?: string;
  short_description?: string;
  upper_lower?: string; // JSON array string
}

export interface SecondaryMuscle {
  id: string;
  label: string;
  technical_name?: string;
  common_names?: string;
  icon?: string;
  short_description?: string;
  primary_muscle_ids?: string; // JSON array string
}

export interface TertiaryMuscle {
  id: string;
  label: string;
  technical_name?: string;
  common_names?: string;
  icon?: string;
  short_description?: string;
  secondary_muscle_ids?: string; // JSON array string
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
  label: string;
  sub_label?: string;
  common_names?: string;
  icon?: string;
  short_description?: string;
  sub_categories_table?: string;
}

export interface GymEquipment {
  id: string;
  label: string;
  sub_label?: string;
  common_names?: string;
  icon?: string;
  short_description?: string;
  equipment_categories?: string; // JSON string
  max_instances: number;
  cable_attachments: number;
}

export interface CableAttachment {
  id: string;
  label: string;
  sub_label?: string;
  common_names?: string;
  icon?: string;
  short_description?: string;
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
 * Get all primary muscles
 */
export async function getPrimaryMuscles(): Promise<PrimaryMuscle[]> {
  const db = await getDatabase();
  return await db.getAllAsync<PrimaryMuscle>('SELECT * FROM primary_muscles ORDER BY label');
}

/**
 * Get primary muscle by ID
 */
export async function getPrimaryMuscleById(id: string): Promise<PrimaryMuscle | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<PrimaryMuscle>(
    'SELECT * FROM primary_muscles WHERE id = ?',
    [id]
  );
  return result || null;
}

/**
 * Get all secondary muscles
 */
export async function getSecondaryMuscles(): Promise<SecondaryMuscle[]> {
  const db = await getDatabase();
  return await db.getAllAsync<SecondaryMuscle>('SELECT * FROM secondary_muscles ORDER BY label');
}

/**
 * Get secondary muscles by primary muscle ID(s)
 */
export async function getSecondaryMusclesByPrimary(primaryIds: string[]): Promise<SecondaryMuscle[]> {
  if (primaryIds.length === 0) return [];
  
  const db = await getDatabase();
  const placeholders = primaryIds.map(() => '?').join(',');
  const query = `
    SELECT * FROM secondary_muscles 
    WHERE primary_muscle_ids LIKE '%' || ? || '%'
    ORDER BY label
  `;
  
  // For each primary ID, find secondaries that include it in their primary_muscle_ids JSON array
  const allSecondaries = new Map<string, SecondaryMuscle>();
  
  for (const primaryId of primaryIds) {
    const results = await db.getAllAsync<SecondaryMuscle>(query, [primaryId]);
    results.forEach(sec => {
      if (!allSecondaries.has(sec.id)) {
        allSecondaries.set(sec.id, sec);
      }
    });
  }
  
  return Array.from(allSecondaries.values()).sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Get secondary muscle by ID
 */
export async function getSecondaryMuscleById(id: string): Promise<SecondaryMuscle | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<SecondaryMuscle>(
    'SELECT * FROM secondary_muscles WHERE id = ?',
    [id]
  );
  return result || null;
}

/**
 * Get all tertiary muscles
 */
export async function getTertiaryMuscles(): Promise<TertiaryMuscle[]> {
  const db = await getDatabase();
  return await db.getAllAsync<TertiaryMuscle>('SELECT * FROM tertiary_muscles ORDER BY label');
}

/**
 * Get tertiary muscles by secondary muscle ID(s)
 */
export async function getTertiaryMusclesBySecondary(secondaryIds: string[]): Promise<TertiaryMuscle[]> {
  if (secondaryIds.length === 0) return [];
  
  const db = await getDatabase();
  const allTertiaries = new Map<string, TertiaryMuscle>();
  
  for (const secondaryId of secondaryIds) {
    const query = `
      SELECT * FROM tertiary_muscles 
      WHERE secondary_muscle_ids LIKE '%' || ? || '%'
      ORDER BY label
    `;
    const results = await db.getAllAsync<TertiaryMuscle>(query, [secondaryId]);
    results.forEach(ter => {
      if (!allTertiaries.has(ter.id)) {
        allTertiaries.set(ter.id, ter);
      }
    });
  }
  
  return Array.from(allTertiaries.values()).sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Get tertiary muscle by ID
 */
export async function getTertiaryMuscleById(id: string): Promise<TertiaryMuscle | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<TertiaryMuscle>(
    'SELECT * FROM tertiary_muscles WHERE id = ?',
    [id]
  );
  return result || null;
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
  if (!category || !category.cardio_types_allowed) return [];
  
  const config = parseJson<{ allowed?: string }>(category.cardio_types_allowed, {});
  if (config.allowed === 'CARDIO_TYPES') {
    const allCardioTypes = await getCardioTypes();
    return allCardioTypes.map(ct => ct.id);
  }
  return [];
}

/**
 * Get allowed muscle groups for a category
 */
export async function getAllowedMuscleGroupsForCategory(categoryId: string): Promise<{
  required?: string[];
  allowed?: string[];
}> {
  const category = await getExerciseCategoryById(categoryId);
  if (!category || !category.muscle_groups_allowed) return {};
  
  return parseJson<{ required?: string[]; allowed?: string[] }>(
    category.muscle_groups_allowed,
    {}
  );
}

/**
 * Get allowed training focus for a category
 */
export async function getAllowedTrainingFocusForCategory(categoryId: string): Promise<{
  required?: string;
  allowed?: string;
}> {
  const category = await getExerciseCategoryById(categoryId);
  if (!category || !category.training_focus_allowed) return {};
  
  return parseJson<{ required?: string; allowed?: string }>(
    category.training_focus_allowed,
    {}
  );
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
  const eqCategories = await db.getAllAsync<{ id: string; label: string; sub_categories_table: string }>(
    'SELECT id, label, sub_categories_table FROM equipment_categories ORDER BY id'
  );
  const sections: { title: string; data: EquipmentPickerItem[] }[] = [];

  const subTableMap: Record<string, string> = {
    SUPPORT_EQUIPMENT_CATEGORIES: 'support_equipment_categories',
    WEIGHTS_EQUIPMENT_CATEGORIES: 'weights_equipment_categories',
  };
  for (const cat of eqCategories) {
    const subTable = cat.sub_categories_table;
    if (!subTable) continue;
    const subTableSnake = subTableMap[subTable] || subTable.toLowerCase();
    const subCats = await db.getAllAsync<{ id: string; label: string }>(
      `SELECT id, label FROM ${subTableSnake} ORDER BY id`
    );
    for (const sub of subCats) {
      const equip = await db.getAllAsync<{ label: string; icon: string }>(
        `SELECT label, icon FROM gym_equipment WHERE equipment_categories LIKE '%"${cat.id}":"${sub.id}"%' ORDER BY label`
      );
      if (equip.length > 0) {
        sections.push({
          title: sub.label,
          data: equip.map((e) => ({ label: e.label, icon: e.icon || undefined })),
        });
      }
    }
  }
  return sections;
}

/**
 * Get label -> icon (base64) map for all gym equipment. Used by EquipmentIcon component.
 * This is the single source for equipment icons in the UI; do not use hard-coded icon maps.
 */
export async function getEquipmentIconsByLabel(): Promise<Record<string, string>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ label: string; icon: string }>(
    'SELECT label, icon FROM gym_equipment WHERE icon != "" AND icon IS NOT NULL'
  );
  const map: Record<string, string> = {};
  for (const r of rows) {
    if (r.icon) map[r.label] = r.icon;
  }
  return map;
}

/**
 * Get all gym equipment labels (flat list) for filters and backward compatibility
 */
export async function getGymEquipmentLabels(): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ label: string }>('SELECT label FROM gym_equipment ORDER BY label');
  return rows.map((r) => r.label);
}

/**
 * Get cable attachments as { id, label }[]
 */
export async function getCableAttachments(): Promise<{ id: string; label: string }[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<CableAttachment>('SELECT id, label FROM cable_attachments ORDER BY label');
  return rows.map((r) => ({ id: r.id, label: r.label }));
}

/**
 * Get equipment IDs that support single/double toggle
 */
export async function getSingleDoubleEquipmentLabels(): Promise<string[]> {
  const db = await getDatabase();
  const ids = ['DUMBBELL', 'KETTLEBELL', 'PLATE', 'CHAINS', 'CABLE', 'WEIGHTS_OTHER'];
  const labels: string[] = [];
  for (const id of ids) {
    const row = await db.getFirstAsync<{ label: string }>('SELECT label FROM gym_equipment WHERE id = ?', [id]);
    if (row) labels.push(row.label);
  }
  return labels;
}

/**
 * Build PRIMARY_TO_SECONDARY_MAP from database (for backward compatibility)
 */
export async function buildPrimaryToSecondaryMap(): Promise<Record<string, string[]>> {
  const primaries = await getPrimaryMuscles();
  const secondaries = await getSecondaryMuscles();
  
  const map: Record<string, string[]> = {};
  
  primaries.forEach(primary => {
    const relatedSecondaries = secondaries
      .filter(sec => {
        const primaryIds = parseJson<string[]>(sec.primary_muscle_ids, []);
        return primaryIds.includes(primary.id);
      })
      .map(sec => sec.label);
    
    if (relatedSecondaries.length > 0) {
      map[primary.label] = relatedSecondaries.sort();
    }
  });
  
  return map;
}
