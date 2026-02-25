/**
 * React hooks for accessing exercise configuration data.
 * Provides cached, reactive access to reference data via the backend API.
 */
import { useState, useEffect } from 'react';
import {
  getExerciseCategories,
  getCardioTypes,
  getPrimaryMuscles,
  getSecondaryMuscles,
  getTertiaryMuscles,
  getAllMuscles,
  getTrainingFocus,
  getCategoriesAsStrings,
  getPrimaryMusclesAsStrings,
  getCardioTypesAsStrings,
  getTrainingFocusAsStrings,
  buildPrimaryToSecondaryMap,
  getEquipmentPickerSections,
  getEquipmentLabels,
  getAttachments,
  getSingleDoubleEquipmentLabels,
  getEquipmentIconsByLabel,
  getGripTypes,
  getGripWidths,
  type EquipmentPickerItem,
  type ExerciseCategory,
  type CardioType,
  type Muscle,
  type TrainingFocus,
  type Grip,
} from './configFacade';

let categoriesCache: ExerciseCategory[] | null = null;
let equipmentSectionsCache: { title: string; data: EquipmentPickerItem[] }[] | null = null;
let equipmentLabelsCache: string[] | null = null;
let attachmentsCache: { id: string; label: string }[] | null = null;
let equipmentIconsByLabelCache: Record<string, string> | null = null;
let singleDoubleEquipmentCache: string[] | null = null;
let cardioTypesCache: CardioType[] | null = null;
let allMusclesCache: Muscle[] | null = null;
let primaryMusclesCache: Muscle[] | null = null;
let secondaryMusclesCache: Muscle[] | null = null;
let tertiaryMusclesCache: Muscle[] | null = null;
let trainingFocusCache: TrainingFocus[] | null = null;
let categoriesStringsCache: string[] | null = null;
let primaryMusclesStringsCache: string[] | null = null;
let cardioTypesStringsCache: string[] | null = null;
let trainingFocusStringsCache: string[] | null = null;
let primaryToSecondaryMapCache: Record<string, string[]> | null = null;
let gripTypesCache: Grip[] | null = null;
let gripWidthsCache: Grip[] | null = null;

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

export function useAllMuscles(): Muscle[] {
  const [muscles, setMuscles] = useState<Muscle[]>(allMusclesCache || []);

  useEffect(() => {
    if (allMusclesCache) {
      setMuscles(allMusclesCache);
      return;
    }

    getAllMuscles().then(data => {
      allMusclesCache = data;
      setMuscles(data);
    });
  }, []);

  return muscles;
}

export function usePrimaryMuscles(): Muscle[] {
  const [muscles, setMuscles] = useState<Muscle[]>(primaryMusclesCache || []);

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

export function useSecondaryMuscles(): Muscle[] {
  const [muscles, setMuscles] = useState<Muscle[]>(secondaryMusclesCache || []);

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

export function useTertiaryMuscles(): Muscle[] {
  const [muscles, setMuscles] = useState<Muscle[]>(tertiaryMusclesCache || []);

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

export function useEquipmentLabels(): string[] {
  const [labels, setLabels] = useState<string[]>(equipmentLabelsCache || []);

  useEffect(() => {
    if (equipmentLabelsCache) {
      setLabels(equipmentLabelsCache);
      return;
    }

    getEquipmentLabels().then(data => {
      equipmentLabelsCache = data;
      setLabels(data);
    });
  }, []);

  return labels;
}

export function useAttachments(): { id: string; label: string }[] {
  const [attachments, setAttachments] = useState<{ id: string; label: string }[]>(attachmentsCache || []);

  useEffect(() => {
    if (attachmentsCache) {
      setAttachments(attachmentsCache);
      return;
    }

    getAttachments().then(data => {
      attachmentsCache = data;
      setAttachments(data);
    });
  }, []);

  return attachments;
}

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

export function useGripTypes(): Grip[] {
  const [types, setTypes] = useState<Grip[]>(gripTypesCache || []);

  useEffect(() => {
    if (gripTypesCache) {
      setTypes(gripTypesCache);
      return;
    }

    getGripTypes().then(data => {
      gripTypesCache = data;
      setTypes(data);
    });
  }, []);

  return types;
}

export function useGripWidths(): Grip[] {
  const [widths, setWidths] = useState<Grip[]>(gripWidthsCache || []);

  useEffect(() => {
    if (gripWidthsCache) {
      setWidths(gripWidthsCache);
      return;
    }

    getGripWidths().then(data => {
      gripWidthsCache = data;
      setWidths(data);
    });
  }, []);

  return widths;
}
