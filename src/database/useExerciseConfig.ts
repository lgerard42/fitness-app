/**
 * React hooks for accessing exercise configuration data
 * Provides cached, reactive access to database queries
 */
import { useState, useEffect } from 'react';
import * as SQLite from 'expo-sqlite';
import {
  getExerciseCategories,
  getCardioTypes,
  getPrimaryMuscles,
  getSecondaryMuscles,
  getTertiaryMuscles,
  getTrainingFocus,
  getCategoriesAsStrings,
  getPrimaryMusclesAsStrings,
  getCardioTypesAsStrings,
  getTrainingFocusAsStrings,
  buildPrimaryToSecondaryMap,
  getEquipmentPickerSections,
  getGymEquipmentLabels,
  getCableAttachments,
  getSingleDoubleEquipmentLabels,
  getEquipmentIconsByLabel,
  type EquipmentPickerItem,
  type ExerciseCategory,
  type CardioType,
  type PrimaryMuscle,
  type SecondaryMuscle,
  type TertiaryMuscle,
  type TrainingFocus,
} from './exerciseConfigService';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let categoriesCache: ExerciseCategory[] | null = null;
let equipmentSectionsCache: { title: string; data: EquipmentPickerItem[] }[] | null = null;
let gymEquipmentLabelsCache: string[] | null = null;
let cableAttachmentsCache: { id: string; label: string }[] | null = null;
let singleDoubleEquipmentCache: string[] | null = null;
let equipmentIconsByLabelCache: Record<string, string> | null = null;
let cardioTypesCache: CardioType[] | null = null;
let primaryMusclesCache: PrimaryMuscle[] | null = null;
let secondaryMusclesCache: SecondaryMuscle[] | null = null;
let tertiaryMusclesCache: TertiaryMuscle[] | null = null;
let trainingFocusCache: TrainingFocus[] | null = null;
let categoriesStringsCache: string[] | null = null;
let primaryMusclesStringsCache: string[] | null = null;
let cardioTypesStringsCache: string[] | null = null;
let trainingFocusStringsCache: string[] | null = null;
let primaryToSecondaryMapCache: Record<string, string[]> | null = null;

/**
 * Initialize database (call once at app startup)
 */
export async function initExerciseConfigDatabase(): Promise<void> {
  if (!dbInstance) {
    const { initDatabase } = await import('./initDatabase');
    dbInstance = await initDatabase();
  }
}

/**
 * Hook to get exercise categories
 */
export function useExerciseCategories(): ExerciseCategory[] {
  const [categories, setCategories] = useState<ExerciseCategory[]>(categoriesCache || []);

  useEffect(() => {
    if (categoriesCache) {
      setCategories(categoriesCache);
      return;
    }

    getExerciseCategories().then(data => {
      categoriesCache = data;
      setCategories(data);
    });
  }, []);

  return categories;
}

/**
 * Hook to get categories as simple string array (legacy compatibility)
 */
export function useCategoriesAsStrings(): string[] {
  const [categories, setCategories] = useState<string[]>(categoriesStringsCache || []);

  useEffect(() => {
    if (categoriesStringsCache) {
      setCategories(categoriesStringsCache);
      return;
    }

    getCategoriesAsStrings().then(data => {
      categoriesStringsCache = data;
      setCategories(data);
    });
  }, []);

  return categories;
}

/**
 * Hook to get cardio types
 */
export function useCardioTypes(): CardioType[] {
  const [types, setTypes] = useState<CardioType[]>(cardioTypesCache || []);

  useEffect(() => {
    if (cardioTypesCache) {
      setTypes(cardioTypesCache);
      return;
    }

    getCardioTypes().then(data => {
      cardioTypesCache = data;
      setTypes(data);
    });
  }, []);

  return types;
}

/**
 * Hook to get cardio types as simple string array (legacy compatibility)
 */
export function useCardioTypesAsStrings(): string[] {
  const [types, setTypes] = useState<string[]>(cardioTypesStringsCache || []);

  useEffect(() => {
    if (cardioTypesStringsCache) {
      setTypes(cardioTypesStringsCache);
      return;
    }

    getCardioTypesAsStrings().then(data => {
      cardioTypesStringsCache = data;
      setTypes(data);
    });
  }, []);

  return types;
}

/**
 * Hook to get primary muscles
 */
export function usePrimaryMuscles(): PrimaryMuscle[] {
  const [muscles, setMuscles] = useState<PrimaryMuscle[]>(primaryMusclesCache || []);

  useEffect(() => {
    if (primaryMusclesCache) {
      setMuscles(primaryMusclesCache);
      return;
    }

    getPrimaryMuscles().then(data => {
      primaryMusclesCache = data;
      setMuscles(data);
    });
  }, []);

  return muscles;
}

/**
 * Hook to get primary muscles as simple string array (legacy compatibility)
 */
export function usePrimaryMusclesAsStrings(): string[] {
  const [muscles, setMuscles] = useState<string[]>(primaryMusclesStringsCache || []);

  useEffect(() => {
    if (primaryMusclesStringsCache) {
      setMuscles(primaryMusclesStringsCache);
      return;
    }

    getPrimaryMusclesAsStrings().then(data => {
      primaryMusclesStringsCache = data;
      setMuscles(data);
    });
  }, []);

  return muscles;
}

/**
 * Hook to get secondary muscles
 */
export function useSecondaryMuscles(): SecondaryMuscle[] {
  const [muscles, setMuscles] = useState<SecondaryMuscle[]>(secondaryMusclesCache || []);

  useEffect(() => {
    if (secondaryMusclesCache) {
      setMuscles(secondaryMusclesCache);
      return;
    }

    getSecondaryMuscles().then(data => {
      secondaryMusclesCache = data;
      setMuscles(data);
    });
  }, []);

  return muscles;
}

/**
 * Hook to get tertiary muscles
 */
export function useTertiaryMuscles(): TertiaryMuscle[] {
  const [muscles, setMuscles] = useState<TertiaryMuscle[]>(tertiaryMusclesCache || []);

  useEffect(() => {
    if (tertiaryMusclesCache) {
      setMuscles(tertiaryMusclesCache);
      return;
    }

    getTertiaryMuscles().then(data => {
      tertiaryMusclesCache = data;
      setMuscles(data);
    });
  }, []);

  return muscles;
}

/**
 * Hook to get training focus
 */
export function useTrainingFocus(): TrainingFocus[] {
  const [focus, setFocus] = useState<TrainingFocus[]>(trainingFocusCache || []);

  useEffect(() => {
    if (trainingFocusCache) {
      setFocus(trainingFocusCache);
      return;
    }

    getTrainingFocus().then(data => {
      trainingFocusCache = data;
      setFocus(data);
    });
  }, []);

  return focus;
}

/**
 * Hook to get training focus as simple string array (legacy compatibility)
 */
export function useTrainingFocusAsStrings(): string[] {
  const [focus, setFocus] = useState<string[]>(trainingFocusStringsCache || []);

  useEffect(() => {
    if (trainingFocusStringsCache) {
      setFocus(trainingFocusStringsCache);
      return;
    }

    getTrainingFocusAsStrings().then(data => {
      trainingFocusStringsCache = data;
      setFocus(data);
    });
  }, []);

  return focus;
}

/**
 * Hook to get PRIMARY_TO_SECONDARY_MAP (legacy compatibility)
 */
export function usePrimaryToSecondaryMap(): Record<string, string[]> {
  const [map, setMap] = useState<Record<string, string[]>>(primaryToSecondaryMapCache || {});

  useEffect(() => {
    if (primaryToSecondaryMapCache) {
      setMap(primaryToSecondaryMapCache);
      return;
    }

    buildPrimaryToSecondaryMap().then(data => {
      primaryToSecondaryMapCache = data;
      setMap(data);
    });
  }, []);

  return map;
}

/**
 * Hook to get equipment picker sections (category -> equipment list)
 */
export function useEquipmentPickerSections(): { title: string; data: EquipmentPickerItem[] }[] {
  const [sections, setSections] = useState<{ title: string; data: EquipmentPickerItem[] }[]>(equipmentSectionsCache || []);

  useEffect(() => {
    if (equipmentSectionsCache) {
      setSections(equipmentSectionsCache);
      return;
    }

    getEquipmentPickerSections().then(data => {
      equipmentSectionsCache = data;
      setSections(data);
    });
  }, []);

  return sections;
}

/**
 * Hook to get gym equipment labels (flat list)
 */
export function useGymEquipmentLabels(): string[] {
  const [labels, setLabels] = useState<string[]>(gymEquipmentLabelsCache || []);

  useEffect(() => {
    if (gymEquipmentLabelsCache) {
      setLabels(gymEquipmentLabelsCache);
      return;
    }

    getGymEquipmentLabels().then(data => {
      gymEquipmentLabelsCache = data;
      setLabels(data);
    });
  }, []);

  return labels;
}

/**
 * Hook to get cable attachments
 */
export function useCableAttachments(): { id: string; label: string }[] {
  const [attachments, setAttachments] = useState<{ id: string; label: string }[]>(cableAttachmentsCache || []);

  useEffect(() => {
    if (cableAttachmentsCache) {
      setAttachments(cableAttachmentsCache);
      return;
    }

    getCableAttachments().then(data => {
      cableAttachmentsCache = data;
      setAttachments(data);
    });
  }, []);

  return attachments;
}

/**
 * Hook to get label -> icon (base64) map for gym equipment
 */
export function useEquipmentIconsByLabel(): Record<string, string> {
  const [map, setMap] = useState<Record<string, string>>(equipmentIconsByLabelCache || {});

  useEffect(() => {
    if (equipmentIconsByLabelCache) {
      setMap(equipmentIconsByLabelCache);
      return;
    }

    getEquipmentIconsByLabel().then(data => {
      equipmentIconsByLabelCache = data;
      setMap(data);
    });
  }, []);

  return map;
}

/**
 * Hook to get single/double equipment labels
 */
export function useSingleDoubleEquipmentLabels(): string[] {
  const [labels, setLabels] = useState<string[]>(singleDoubleEquipmentCache || []);

  useEffect(() => {
    if (singleDoubleEquipmentCache) {
      setLabels(singleDoubleEquipmentCache);
      return;
    }

    getSingleDoubleEquipmentLabels().then(data => {
      singleDoubleEquipmentCache = data;
      setLabels(data);
    });
  }, []);

  return labels;
}
