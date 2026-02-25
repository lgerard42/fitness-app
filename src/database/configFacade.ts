/**
 * Facade that provides typed access to exercise reference data
 * via the backend bootstrap cache (RemotePostgresProvider).
 */
import { createReferenceProvider } from "./providers/factory";
import type { BootstrapData } from "./providers/types";
import type {
  ExerciseCategory,
  CardioType,
  Muscle,
  TrainingFocus,
  EquipmentCategory,
  Equipment,
  Grip,
  DeltaModifier,
  EquipmentPickerItem,
} from "./referenceTypes";

export type {
  ExerciseCategory,
  CardioType,
  Muscle,
  TrainingFocus,
  EquipmentCategory,
  Equipment,
  Grip,
  DeltaModifier,
  EquipmentPickerItem,
} from "./referenceTypes";

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

export function invalidateBootstrapCache(): void {
  bootstrapCache = null;
}

// ── Base table accessors ────────────────────────────────────────────

export async function getExerciseCategories(): Promise<ExerciseCategory[]> {
  const data = await ensureBootstrap();
  return getTableRows<ExerciseCategory>(data, "exerciseCategories");
}

export async function getExerciseCategoryById(
  id: string
): Promise<ExerciseCategory | null> {
  const rows = await getExerciseCategories();
  return findById(rows, id);
}

export async function getCardioTypes(): Promise<CardioType[]> {
  const data = await ensureBootstrap();
  return getTableRows<CardioType>(data, "cardioTypes");
}

export async function getAllMuscles(): Promise<Muscle[]> {
  const data = await ensureBootstrap();
  return getTableRows<Muscle>(data, "muscles");
}

export async function getTrainingFocus(): Promise<TrainingFocus[]> {
  const data = await ensureBootstrap();
  return getTableRows<TrainingFocus>(data, "trainingFocus");
}

export async function getAllGrips(): Promise<Grip[]> {
  const data = await ensureBootstrap();
  return getTableRows<Grip>(data, "grips");
}

export async function getGripWidths(): Promise<Grip[]> {
  const data = await ensureBootstrap();
  return getTableRows<Grip>(data, "gripWidths");
}

export async function getDeltaModifiers(
  table: 'foot_positions' | 'stance_types' | 'stance_widths' | 'torso_angles' | 'torso_orientations' | 'support_structures' | 'elbow_relationship' | 'loading_aids'
): Promise<DeltaModifier[]> {
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
  return getTableRows<DeltaModifier>(data, keyMap[table] || table);
}

// ── Derived functions ───────────────────────────────────────────────

export async function getPrimaryMuscles(): Promise<Muscle[]> {
  const allMuscles = await getAllMuscles();
  return allMuscles.filter(m => {
    const parents = parseJson<string[]>(m.parent_ids || '[]', []);
    return parents.length === 0;
  });
}

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

export async function getMusclesByParent(parentId: string): Promise<Muscle[]> {
  const allMuscles = await getAllMuscles();
  return allMuscles.filter(m => {
    const parents = parseJson<string[]>(m.parent_ids || '[]', []);
    return parents.includes(parentId);
  });
}

export async function getCategoriesAsStrings(): Promise<string[]> {
  const categories = await getExerciseCategories();
  return categories.map(c => c.label);
}

export async function getPrimaryMusclesAsStrings(): Promise<string[]> {
  const muscles = await getPrimaryMuscles();
  return muscles.map(m => m.label);
}

export async function getCardioTypesAsStrings(): Promise<string[]> {
  const types = await getCardioTypes();
  return types.map(t => t.label);
}

export async function getTrainingFocusAsStrings(): Promise<string[]> {
  const focus = await getTrainingFocus();
  return focus.map(f => f.label);
}

export async function buildPrimaryToSecondaryMap(): Promise<Record<string, string[]>> {
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

export async function getEquipmentPickerSections(): Promise<{ title: string; data: EquipmentPickerItem[] }[]> {
  const data = await ensureBootstrap();
  const equipCats = getTableRows<EquipmentCategory>(data, "equipmentCategories");
  const equipment = getTableRows<Equipment>(data, "equipment");
  const subCats = equipCats
    .filter(c => c.parent_id)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const sections: { title: string; data: EquipmentPickerItem[] }[] = [];
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
  const data = await ensureBootstrap();
  const equipment = getTableRows<Equipment>(data, "equipment");
  return equipment
    .filter(e => !e.is_attachment)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(e => e.label);
}

export async function getAttachments(): Promise<{ id: string; label: string }[]> {
  const data = await ensureBootstrap();
  const equipment = getTableRows<Equipment>(data, "equipment");
  return equipment
    .filter(e => e.is_attachment)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(e => ({ id: e.id, label: e.label }));
}

export async function getEquipmentIconsByLabel(): Promise<Record<string, string>> {
  const data = await ensureBootstrap();
  const equipment = getTableRows<Equipment>(data, "equipment");
  const equipmentIcons = require('./tables/equipmentIcons.json') as Record<string, string>;
  const map: Record<string, string> = {};
  for (const e of equipment) {
    const icon = equipmentIcons[e.id];
    if (icon) map[e.label] = icon;
  }
  return map;
}

export async function getSingleDoubleEquipmentLabels(): Promise<string[]> {
  const data = await ensureBootstrap();
  const equipment = getTableRows<Equipment>(data, "equipment");
  const ids = ['DUMBBELL', 'KETTLEBELL', 'PLATE', 'CHAINS', 'CABLE_STACK', 'WEIGHTS_OTHER'];
  return equipment
    .filter(e => ids.includes(e.id))
    .map(e => e.label);
}

export async function getGripTypes(): Promise<Grip[]> {
  const grips = await getAllGrips();
  return grips.filter(g => g.grip_category !== 'Width' && !g.parent_id);
}
