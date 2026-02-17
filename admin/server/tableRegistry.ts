/**
 * Central schema registry for all JSON tables.
 * Drives the admin UI: forms, dropdowns, validation, and relationship resolution.
 */

export interface TableField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'string[]' | 'json' | 'fk' | 'fk[]';
  required?: boolean;
  /** For FK / FK[] fields: which table to reference */
  refTable?: string;
  /** For FK / FK[] fields: which field on the referenced table to display (default "label") */
  refLabelField?: string;
  /** For json fields: hint about the shape for specialized editors */
  jsonShape?: 'muscle_targets' | 'equipment_category_map' | 'allowed_rules' | 'free';
  /** Default value for new rows */
  defaultValue?: unknown;
}

export interface TableSchema {
  /** Key used in API routes, e.g. "gripTypes" */
  key: string;
  /** Filename relative to the tables directory */
  file: string;
  /** Human-readable name */
  label: string;
  /** Group for sidebar organization */
  group: 'Exercise Setup' | 'Muscles' | 'Equipment' | 'Motions' | 'Grips & Stance';
  /** Primary key field (always "id") */
  idField: string;
  /** Field used for display labels in dropdowns */
  labelField: string;
  /** Field definitions */
  fields: TableField[];
  /** Which field to sort by (default: "sort_order") */
  sortField?: string;
  /** True for key-value map tables like equipmentIcons */
  isKeyValueMap?: boolean;
}

// ─── Shared field patterns ───────────────────────────────────────────

const baseFields = (extra: TableField[] = []): TableField[] => [
  { name: 'id', type: 'string', required: true },
  { name: 'label', type: 'string', required: true },
  ...extra,
  { name: 'sort_order', type: 'number', defaultValue: 0 },
  { name: 'is_active', type: 'boolean', defaultValue: true },
];

const standardFields = (extra: TableField[] = []): TableField[] =>
  baseFields([
    { name: 'technical_name', type: 'string' },
    { name: 'common_names', type: 'string[]', defaultValue: [] },
    { name: 'icon', type: 'string', defaultValue: '' },
    { name: 'short_description', type: 'string' },
    ...extra,
  ]);

const subLabelFields = (extra: TableField[] = []): TableField[] =>
  baseFields([
    { name: 'sub_label', type: 'string' },
    { name: 'common_names', type: 'string[]', defaultValue: [] },
    { name: 'icon', type: 'string', defaultValue: '' },
    { name: 'short_description', type: 'string' },
    ...extra,
  ]);

const subLabelFieldsNoIcon = (extra: TableField[] = []): TableField[] =>
  baseFields([
    { name: 'sub_label', type: 'string' },
    { name: 'common_names', type: 'string[]', defaultValue: [] },
    { name: 'short_description', type: 'string' },
    ...extra,
  ]);

// ─── Table definitions ───────────────────────────────────────────────

export const TABLE_REGISTRY: TableSchema[] = [
  // ── Exercise Setup ──────────────────────────────────────────────
  {
    key: 'exerciseCategories',
    file: 'exerciseCategories.json',
    label: 'Exercise Categories',
    group: 'Exercise Setup',
    idField: 'id',
    labelField: 'label',
    fields: standardFields([
      { name: 'cardio_types_allowed', type: 'json', jsonShape: 'allowed_rules' },
      { name: 'muscle_groups_allowed', type: 'json', jsonShape: 'allowed_rules' },
      { name: 'training_focus_allowed', type: 'json', jsonShape: 'allowed_rules' },
    ]),
  },
  {
    key: 'cardioTypes',
    file: 'cardioTypes.json',
    label: 'Cardio Types',
    group: 'Exercise Setup',
    idField: 'id',
    labelField: 'label',
    fields: standardFields(),
  },
  {
    key: 'trainingFocus',
    file: 'trainingFocus.json',
    label: 'Training Focus',
    group: 'Exercise Setup',
    idField: 'id',
    labelField: 'label',
    fields: standardFields(),
  },

  // ── Muscles ─────────────────────────────────────────────────────
  {
    key: 'muscleGroups',
    file: 'muscleGroups.json',
    label: 'Muscle Groups',
    group: 'Muscles',
    idField: 'id',
    labelField: 'label',
    fields: baseFields([
      { name: 'values_table', type: 'string', required: true },
      { name: 'common_names', type: 'string[]', defaultValue: [] },
      { name: 'icon', type: 'string', defaultValue: '' },
      { name: 'short_description', type: 'string' },
    ]),
  },
  {
    key: 'primaryMuscles',
    file: 'primaryMuscles.json',
    label: 'Primary Muscles',
    group: 'Muscles',
    idField: 'id',
    labelField: 'label',
    fields: standardFields([
      { name: 'upper_lower', type: 'string[]', defaultValue: [] },
    ]),
  },
  {
    key: 'secondaryMuscles',
    file: 'secondaryMuscles.json',
    label: 'Secondary Muscles',
    group: 'Muscles',
    idField: 'id',
    labelField: 'label',
    fields: standardFields([
      { name: 'primary_muscle_ids', type: 'fk[]', refTable: 'primaryMuscles', refLabelField: 'label' },
    ]),
  },
  {
    key: 'tertiaryMuscles',
    file: 'tertiaryMuscles.json',
    label: 'Tertiary Muscles',
    group: 'Muscles',
    idField: 'id',
    labelField: 'label',
    fields: standardFields([
      { name: 'secondary_muscle_ids', type: 'fk[]', refTable: 'secondaryMuscles', refLabelField: 'label' },
    ]),
  },

  // ── Equipment ───────────────────────────────────────────────────
  {
    key: 'equipmentCategories',
    file: 'equipmentCategories.json',
    label: 'Equipment Categories',
    group: 'Equipment',
    idField: 'id',
    labelField: 'label',
    fields: subLabelFields([
      { name: 'sub_categories_table', type: 'string' },
    ]),
  },
  {
    key: 'supportEquipmentCategories',
    file: 'supportEquipmentCategories.json',
    label: 'Support Equipment Categories',
    group: 'Equipment',
    idField: 'id',
    labelField: 'label',
    fields: subLabelFields(),
  },
  {
    key: 'weightsEquipmentCategories',
    file: 'weightsEquipmentCategories.json',
    label: 'Weights Equipment Categories',
    group: 'Equipment',
    idField: 'id',
    labelField: 'label',
    fields: subLabelFields(),
  },
  {
    key: 'gymEquipment',
    file: 'gymEquipment.json',
    label: 'Gym Equipment',
    group: 'Equipment',
    idField: 'id',
    labelField: 'label',
    fields: baseFields([
      { name: 'sub_label', type: 'string' },
      { name: 'common_names', type: 'string[]', defaultValue: [] },
      { name: 'icon', type: 'string', defaultValue: '' },
      { name: 'short_description', type: 'string' },
      { name: 'equipment_categories', type: 'json', jsonShape: 'equipment_category_map' },
      { name: 'max_instances', type: 'number', defaultValue: 1 },
      { name: 'cable_attachments', type: 'boolean', defaultValue: false },
      { name: 'allowed_grip_types', type: 'fk[]', refTable: 'gripTypes', refLabelField: 'label' },
      { name: 'allowed_grip_widths', type: 'fk[]', refTable: 'gripWidths', refLabelField: 'label' },
      { name: 'allowed_stance_types', type: 'fk[]', refTable: 'stanceTypes', refLabelField: 'label' },
      { name: 'allowed_stance_widths', type: 'fk[]', refTable: 'stanceWidths', refLabelField: 'label' },
    ]),
  },
  {
    key: 'cableAttachments',
    file: 'cableAttachments.json',
    label: 'Cable Attachments',
    group: 'Equipment',
    idField: 'id',
    labelField: 'label',
    fields: subLabelFields([
      { name: 'allowed_grip_types', type: 'fk[]', refTable: 'gripTypes', refLabelField: 'label' },
      { name: 'allowed_grip_widths', type: 'fk[]', refTable: 'gripWidths', refLabelField: 'label' },
      { name: 'allowed_stance_types', type: 'fk[]', refTable: 'stanceTypes', refLabelField: 'label' },
      { name: 'allowed_stance_widths', type: 'fk[]', refTable: 'stanceWidths', refLabelField: 'label' },
    ]),
  },
  {
    key: 'equipmentIcons',
    file: 'equipmentIcons.json',
    label: 'Equipment Icons',
    group: 'Equipment',
    idField: 'id',
    labelField: 'id',
    isKeyValueMap: true,
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'value', type: 'string', required: true },
    ],
  },

  // ── Motions ─────────────────────────────────────────────────────
  {
    key: 'primaryMotions',
    file: 'primaryMotions.json',
    label: 'Primary Motions',
    group: 'Motions',
    idField: 'id',
    labelField: 'label',
    fields: baseFields([
      { name: 'upperLowerBody', type: 'string' },
      { name: 'sub_label', type: 'string' },
      { name: 'common_names', type: 'string[]', defaultValue: [] },
      { name: 'short_description', type: 'string' },
      { name: 'muscle_targets', type: 'json', jsonShape: 'muscle_targets' },
    ]),
  },
  {
    key: 'primaryMotionVariations',
    file: 'primaryMotionVariations.json',
    label: 'Primary Motion Variations',
    group: 'Motions',
    idField: 'id',
    labelField: 'label',
    fields: baseFields([
      { name: 'primary_motion_key', type: 'fk', required: true, refTable: 'primaryMotions', refLabelField: 'label' },
      { name: 'common_names', type: 'string[]', defaultValue: [] },
      { name: 'short_description', type: 'string' },
      { name: 'muscle_targets', type: 'json', jsonShape: 'muscle_targets' },
      { name: 'motion_planes', type: 'fk[]', refTable: 'motionPlanes', refLabelField: 'label' },
    ]),
  },
  {
    key: 'motionPlanes',
    file: 'motionPlanes.json',
    label: 'Motion Planes',
    group: 'Motions',
    idField: 'id',
    labelField: 'label',
    fields: subLabelFieldsNoIcon(),
  },

  // ── Grips & Stance ──────────────────────────────────────────────
  {
    key: 'gripTypes',
    file: 'gripTypes.json',
    label: 'Grip Types',
    group: 'Grips & Stance',
    idField: 'id',
    labelField: 'label',
    fields: baseFields([
      { name: 'subLabel', type: 'string' },
      { name: 'common_names', type: 'string[]', defaultValue: [] },
      { name: 'icon', type: 'string', defaultValue: '' },
      { name: 'short_description', type: 'string' },
      { name: 'variations', type: 'string', defaultValue: '' },
    ]),
  },
  {
    key: 'gripWidths',
    file: 'gripWidths.json',
    label: 'Grip Widths',
    group: 'Grips & Stance',
    idField: 'id',
    labelField: 'label',
    fields: baseFields([
      { name: 'subLabel', type: 'string' },
      { name: 'common_names', type: 'string[]', defaultValue: [] },
      { name: 'icon', type: 'string', defaultValue: '' },
      { name: 'short_description', type: 'string' },
    ]),
  },
  {
    key: 'rotatingGripVariations',
    file: 'rotatingGripVariations.json',
    label: 'Rotating Grip Variations',
    group: 'Grips & Stance',
    idField: 'id',
    labelField: 'label',
    fields: baseFields([
      { name: 'subLabel', type: 'string' },
      { name: 'common_names', type: 'string[]', defaultValue: [] },
      { name: 'icon', type: 'string', defaultValue: '' },
      { name: 'short_description', type: 'string' },
    ]),
  },
  {
    key: 'stanceTypes',
    file: 'stanceTypes.json',
    label: 'Stance Types',
    group: 'Grips & Stance',
    idField: 'id',
    labelField: 'label',
    fields: baseFields([
      { name: 'subLabel', type: 'string' },
      { name: 'common_names', type: 'string[]', defaultValue: [] },
      { name: 'short_description', type: 'string' },
    ]),
  },
  {
    key: 'stanceWidths',
    file: 'stanceWidths.json',
    label: 'Stance Widths',
    group: 'Grips & Stance',
    idField: 'id',
    labelField: 'label',
    fields: baseFields([
      { name: 'subLabel', type: 'string' },
      { name: 'common_names', type: 'string[]', defaultValue: [] },
      { name: 'short_description', type: 'string' },
    ]),
  },
];

/** Lookup a schema by key */
export function getSchema(key: string): TableSchema | undefined {
  return TABLE_REGISTRY.find((t) => t.key === key);
}

/** Get all groups for sidebar */
export function getGroups(): string[] {
  const seen = new Set<string>();
  return TABLE_REGISTRY.filter((t) => {
    if (seen.has(t.group)) return false;
    seen.add(t.group);
    return true;
  }).map((t) => t.group);
}
