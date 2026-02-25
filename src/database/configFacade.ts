/**
 * Facade over exerciseConfigService that routes reads through the
 * ReferenceDataProvider when USE_BACKEND_REFERENCE is enabled.
 *
 * When the flag is OFF this module is a transparent pass-through --
 * every public function delegates directly to exerciseConfigService.
 *
 * When the flag is ON, bulk-read functions (getAll*, getTable) pull
 * from the cached bootstrap instead of hitting SQLite.  Functions
 * that do by-ID lookups or derive data still operate over the same
 * row arrays, just sourced from the provider rather than SQLite.
 */
import { FEATURE_FLAGS } from "../config/featureFlags";
import { createReferenceProvider } from "./providers/factory";
import type { BootstrapData } from "./providers/types";

import * as svc from "./exerciseConfigService";
export * from "./exerciseConfigService";

let bootstrapCache: BootstrapData | null = null;

async function ensureBootstrap(): Promise<BootstrapData> {
  if (bootstrapCache) return bootstrapCache;
  const provider = createReferenceProvider();
  bootstrapCache = await provider.getBootstrap({ allowStaleCache: true });
  return bootstrapCache;
}

function getTableRows<T>(data: BootstrapData, key: string): T[] {
  return (data.tables[key] || []) as T[];
}

function findById<T extends { id: string }>(
  rows: T[],
  id: string
): T | null {
  return rows.find((r) => r.id === id) || null;
}

function parseJson<T>(jsonString: string | null | undefined, defaultValue: T): T {
  if (!jsonString) return defaultValue;
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Invalidate in-memory cache so next call re-fetches.
 */
export function invalidateBootstrapCache(): void {
  bootstrapCache = null;
}

// ── Base table overrides ────────────────────────────────────────────

export async function getExerciseCategories(): Promise<svc.ExerciseCategory[]> {
  if (!FEATURE_FLAGS.USE_BACKEND_REFERENCE) return svc.getExerciseCategories();
  const data = await ensureBootstrap();
  return getTableRows<svc.ExerciseCategory>(data, "exerciseCategories");
}

export async function getExerciseCategoryById(
  id: string
): Promise<svc.ExerciseCategory | null> {
  if (!FEATURE_FLAGS.USE_BACKEND_REFERENCE)
    return svc.getExerciseCategoryById(id);
  const rows = await getExerciseCategories();
  return findById(rows, id);
}

export async function getCardioTypes(): Promise<svc.CardioType[]> {
  if (!FEATURE_FLAGS.USE_BACKEND_REFERENCE) return svc.getCardioTypes();
  const data = await ensureBootstrap();
  return getTableRows<svc.CardioType>(data, "cardioTypes");
}

export async function getAllMuscles(): Promise<svc.Muscle[]> {
  if (!FEATURE_FLAGS.USE_BACKEND_REFERENCE) return svc.getAllMuscles();
  const data = await ensureBootstrap();
  return getTableRows<svc.Muscle>(data, "muscles");
}

export async function getTrainingFocus(): Promise<svc.TrainingFocus[]> {
  if (!FEATURE_FLAGS.USE_BACKEND_REFERENCE) return svc.getTrainingFocus();
  const data = await ensureBootstrap();
  return getTableRows<svc.TrainingFocus>(data, "trainingFocus");
}

export async function getAllGrips(): Promise<svc.Grip[]> {
  if (!FEATURE_FLAGS.USE_BACKEND_REFERENCE) return svc.getAllGrips();
  const data = await ensureBootstrap();
  return getTableRows<svc.Grip>(data, "grips");
}

export async function getGripWidths(): Promise<svc.Grip[]> {
  if (!FEATURE_FLAGS.USE_BACKEND_REFERENCE) return svc.getGripWidths();
  const data = await ensureBootstrap();
  return getTableRows<svc.Grip>(data, "gripWidths");
}

export async function getDeltaModifiers(
  table: Parameters<typeof svc.getDeltaModifiers>[0]
): Promise<svc.DeltaModifier[]> {
  if (!FEATURE_FLAGS.USE_BACKEND_REFERENCE) return svc.getDeltaModifiers(table);
  const data = await ensureBootstrap();
  const keyMap: Record<string, string> = {
    foot_positions: "footPositions",
    stance_types: "stanceTypes",
    stance_widths: "stanceWidths",
    torso_angles: "torsoAngles",
    torso_orientations: "torsoOrientations",
    support_structures: "supportStructures",
    elbow_relationship: "elbowRelationship",
    loading_aids: "loadingAids",
  };
  return getTableRows<svc.DeltaModifier>(data, keyMap[table] || table);
}

// ── Derived function overrides (avoid SQLite for tier/string/picker) ─

export async function getPrimaryMuscles(): Promise<svc.Muscle[]> {
  if (!FEATURE_FLAGS.USE_BACKEND_REFERENCE) return svc.getPrimaryMuscles();
  const allMuscles = await getAllMuscles();
  return allMuscles.filter(m => {
    const parents = parseJson<string[]>(m.parent_ids || '[]', []);
    return parents.length === 0;
  });
}

export async function getSecondaryMuscles(): Promise<svc.Muscle[]> {
  if (!FEATURE_FLAGS.USE_BACKEND_REFERENCE) return svc.getSecondaryMuscles();
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

export async function getTertiaryMuscles(): Promise<svc.Muscle[]> {
  if (!FEATURE_FLAGS.USE_BACKEND_REFERENCE) return svc.getTertiaryMuscles();
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

export async function getMusclesByParent(parentId: string): Promise<svc.Muscle[]> {
  if (!FEATURE_FLAGS.USE_BACKEND_REFERENCE) return svc.getMusclesByParent(parentId);
  const allMuscles = await getAllMuscles();
  return allMuscles.filter(m => {
    const parents = parseJson<string[]>(m.parent_ids || '[]', []);
    return parents.includes(parentId);
  });
}

export async function getCategoriesAsStrings(): Promise<string[]> {
  if (!FEATURE_FLAGS.USE_BACKEND_REFERENCE) return svc.getCategoriesAsStrings();
  const categories = await getExerciseCategories();
  return categories.map(c => c.label);
}

export async function getPrimaryMusclesAsStrings(): Promise<string[]> {
  if (!FEATURE_FLAGS.USE_BACKEND_REFERENCE) return svc.getPrimaryMusclesAsStrings();
  const muscles = await getPrimaryMuscles();
  return muscles.map(m => m.label);
}

export async function getCardioTypesAsStrings(): Promise<string[]> {
  if (!FEATURE_FLAGS.USE_BACKEND_REFERENCE) return svc.getCardioTypesAsStrings();
  const types = await getCardioTypes();
  return types.map(t => t.label);
}

export async function getTrainingFocusAsStrings(): Promise<string[]> {
  if (!FEATURE_FLAGS.USE_BACKEND_REFERENCE) return svc.getTrainingFocusAsStrings();
  const focus = await getTrainingFocus();
  return focus.map(f => f.label);
}

export async function buildPrimaryToSecondaryMap(): Promise<Record<string, string[]>> {
  if (!FEATURE_FLAGS.USE_BACKEND_REFERENCE) return svc.buildPrimaryToSecondaryMap();
  const primaries = await getPrimaryMuscles();
  const secondaries = await getSecondaryMuscles();
  const map: Record<string, string[]> = {};
  primaries.forEach(primary => {
    const related = secondaries
      .filter(sec => {
        const pids = parseJson<string[]>(sec.parent_ids || '[]', []);
        return pids.includes(primary.id);
      })
      .map(sec => sec.label)
      .sort();
    if (related.length > 0) {
      map[primary.label] = related;
    }
  });
  return map;
}

export async function getEquipmentPickerSections(): Promise<{ title: string; data: svc.EquipmentPickerItem[] }[]> {
  if (!FEATURE_FLAGS.USE_BACKEND_REFERENCE) return svc.getEquipmentPickerSections();
  const data = await ensureBootstrap();
  const equipCats = getTableRows<svc.EquipmentCategory>(data, "equipmentCategories");
  const equipment = getTableRows<svc.Equipment>(data, "equipment");
  const subCats = equipCats
    .filter(c => c.parent_id)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const sections: { title: string; data: svc.EquipmentPickerItem[] }[] = [];
  for (const sub of subCats) {
    const items = equipment
      .filter(e => e.category_id === sub.id && !e.is_attachment)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(e => ({ label: e.label }));
    if (items.length > 0) {
      sections.push({ title: sub.label, data: items });
    }
  }
  return sections;
}

export async function getEquipmentLabels(): Promise<string[]> {
  if (!FEATURE_FLAGS.USE_BACKEND_REFERENCE) return svc.getEquipmentLabels();
  const data = await ensureBootstrap();
  const equipment = getTableRows<svc.Equipment>(data, "equipment");
  return equipment
    .filter(e => !e.is_attachment)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(e => e.label);
}

export async function getAttachments(): Promise<{ id: string; label: string }[]> {
  if (!FEATURE_FLAGS.USE_BACKEND_REFERENCE) return svc.getAttachments();
  const data = await ensureBootstrap();
  const equipment = getTableRows<svc.Equipment>(data, "equipment");
  return equipment
    .filter(e => e.is_attachment)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(e => ({ id: e.id, label: e.label }));
}

export async function getEquipmentIconsByLabel(): Promise<Record<string, string>> {
  if (!FEATURE_FLAGS.USE_BACKEND_REFERENCE) return svc.getEquipmentIconsByLabel();
  const data = await ensureBootstrap();
  const equipment = getTableRows<svc.Equipment>(data, "equipment");
  const equipmentIcons = require('./tables/equipmentIcons.json') as Record<string, string>;
  const map: Record<string, string> = {};
  for (const e of equipment) {
    const icon = equipmentIcons[e.id];
    if (icon) map[e.label] = icon;
  }
  return map;
}

export async function getSingleDoubleEquipmentLabels(): Promise<string[]> {
  if (!FEATURE_FLAGS.USE_BACKEND_REFERENCE) return svc.getSingleDoubleEquipmentLabels();
  const data = await ensureBootstrap();
  const equipment = getTableRows<svc.Equipment>(data, "equipment");
  const ids = ['DUMBBELL', 'KETTLEBELL', 'PLATE', 'CHAINS', 'CABLE_STACK', 'WEIGHTS_OTHER'];
  return equipment
    .filter(e => ids.includes(e.id))
    .map(e => e.label);
}

export async function getGripTypes(): Promise<svc.Grip[]> {
  if (!FEATURE_FLAGS.USE_BACKEND_REFERENCE) return svc.getGripTypes();
  const grips = await getAllGrips();
  return grips.filter(g => g.grip_category !== 'Width' && !g.parent_id);
}
