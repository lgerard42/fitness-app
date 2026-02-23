/**
 * Central schema registry for all JSON tables.
 * Drives the admin UI: forms, dropdowns, validation, and relationship resolution.
 */
import { TABLE_DESCRIPTIONS } from './tableDescriptions.js';

export interface TableField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'string[]' | 'json' | 'fk' | 'fk[]';
  required?: boolean;
  /** For FK / FK[] fields: which table to reference */
  refTable?: string;
  /** For FK / FK[] fields: which field on the referenced table to display (default "label") */
  refLabelField?: string;
  /** For json fields: hint about the shape for specialized editors */
  jsonShape?: 'muscle_targets' | 'delta_rules' | 'allowed_rules' | 'exercise_input_permissions' | 'motion_paths' | 'default_delta_configs' | 'free';
  /** Default value for new rows */
  defaultValue?: unknown;
  /** Optional display label (defaults to field name) */
  label?: string;
}

export interface TableSchema {
  /** Key used in API routes, e.g. "gripTypes" */
  key: string;
  /** Filename relative to the tables directory */
  file: string;
  /** Human-readable name */
  label: string;
  /** Group for sidebar organization */
  group: 'Exercise Setup' | 'Muscles & Motions' | 'Trajectory & Posture' | 'Upper Body Mechanics' | 'Lower Body Mechanics' | 'Execution Variables' | 'Equipment';
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
  /** If set, this table is shown indented under this parent table in the sidebar */
  parentTableKey?: string;
  /** Human-readable description for the table (purpose, dependencies, dependents). */
  description?: string;
}

// ─── Shared field patterns ───────────────────────────────────────────

const baseFields = (extra: TableField[] = []): TableField[] => [
  { name: 'id', type: 'string', required: true },
  { name: 'label', type: 'string', required: true },
  ...extra,
  { name: 'sort_order', type: 'number', defaultValue: 0 },
  { name: 'icon', type: 'string', defaultValue: '' },
  { name: 'is_active', type: 'boolean', defaultValue: true },
];

const standardFields = (extra: TableField[] = []): TableField[] =>
  baseFields([
    { name: 'technical_name', type: 'string' },
    { name: 'common_names', type: 'string[]', defaultValue: [] },
    { name: 'short_description', type: 'string' },
    ...extra,
  ]);

const subLabelFields = (extra: TableField[] = []): TableField[] =>
  baseFields([
    { name: 'sub_label', type: 'string' },
    { name: 'common_names', type: 'string[]', defaultValue: [] },
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

const TABLE_DEFINITIONS: TableSchema[] = [
  // ── Exercise Setup ──────────────────────────────────────────────
  {
    key: 'exerciseCategories',
    file: 'exerciseCategories.json',
    label: 'Exercise Categories',
    group: 'Exercise Setup',
    idField: 'id',
    labelField: 'label',
    fields: standardFields([
      { name: 'exercise_input_permissions', type: 'json', jsonShape: 'exercise_input_permissions' },
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

  // ── Muscles & Motions ────────────────────────────────────────────
  {
    key: 'muscles',
    file: 'muscles.json',
    label: 'Muscles',
    group: 'Muscles & Motions',
    idField: 'id',
    labelField: 'label',
    fields: baseFields([
      { name: 'parent_ids', type: 'fk[]', refTable: 'muscles', refLabelField: 'label' },
      { name: 'common_names', type: 'string[]', defaultValue: [] },
      { name: 'technical_name', type: 'string' },
      { name: 'short_description', type: 'string' },
      { name: 'function', type: 'string' },
      { name: 'location', type: 'string' },
      { name: 'triggers', type: 'string' },
      { name: 'upper_lower', type: 'string[]', defaultValue: [] },
    ]),
  },

  {
    key: 'motions',
    file: 'motions.json',
    label: 'Motions',
    group: 'Muscles & Motions',
    idField: 'id',
    labelField: 'label',
    fields: baseFields([
      { name: 'parent_id', type: 'fk', refTable: 'motions', refLabelField: 'label' },
      { name: 'upper_lower', type: 'string' },
      { name: 'muscle_targets', type: 'json', jsonShape: 'muscle_targets' },
      { name: 'default_delta_configs', type: 'json', jsonShape: 'default_delta_configs', label: 'Motion paths', defaultValue: {} },
      { name: 'common_names', type: 'string[]', defaultValue: [] },
      { name: 'short_description', type: 'string' },
    ]),
  },
  // ── Trajectory & Posture ────────────────────────────────────────
  {
    key: 'motionPaths',
    file: 'motionPaths.json',
    label: 'Motion Paths',
    group: 'Trajectory & Posture',
    idField: 'id',
    labelField: 'label',
    fields: baseFields([
      { name: 'common_names', type: 'string[]', defaultValue: [] },
      { name: 'delta_rules', type: 'json', jsonShape: 'delta_rules' },
      { name: 'short_description', type: 'string' },
    ]),
  },
  {
    key: 'torsoAngles',
    file: 'torsoAngles.json',
    label: 'Torso Angles',
    group: 'Trajectory & Posture',
    idField: 'id',
    labelField: 'label',
    fields: baseFields([
      { name: 'common_names', type: 'string[]', defaultValue: [] },
      { name: 'short_description', type: 'string' },
      { name: 'delta_rules', type: 'json', jsonShape: 'delta_rules' },
      { name: 'angle_range', type: 'json', jsonShape: 'free' },
      { name: 'allow_torso_orientations', type: 'boolean', defaultValue: false },
    ]),
  },
  {
    key: 'torsoOrientations',
    file: 'torsoOrientations.json',
    label: 'Torso Orientations',
    group: 'Trajectory & Posture',
    idField: 'id',
    labelField: 'label',
    parentTableKey: 'torsoAngles',
    fields: baseFields([
      { name: 'common_names', type: 'string[]', defaultValue: [] },
      { name: 'short_description', type: 'string' },
      { name: 'delta_rules', type: 'json', jsonShape: 'delta_rules' },
    ]),
  },
  {
    key: 'resistanceOrigin',
    file: 'resistanceOrigin.json',
    label: 'Resistance Origin',
    group: 'Trajectory & Posture',
    idField: 'id',
    labelField: 'label',
    fields: baseFields([
      { name: 'common_names', type: 'string[]', defaultValue: [] },
      { name: 'delta_rules', type: 'json', jsonShape: 'delta_rules' },
      { name: 'short_description', type: 'string' },
    ]),
  },

  // ── Upper Body Mechanics ─────────────────────────────────────
  {
    key: 'grips',
    file: 'grips.json',
    label: 'Grips',
    group: 'Upper Body Mechanics',
    idField: 'id',
    labelField: 'label',
    fields: baseFields([
      { name: 'parent_id', type: 'fk', refTable: 'grips', refLabelField: 'label' },
      { name: 'is_dynamic', type: 'boolean', defaultValue: false },
      { name: 'grip_category', type: 'string' },
      { name: 'rotation_path', type: 'json', jsonShape: 'free' },
      { name: 'common_names', type: 'string[]', defaultValue: [] },
      { name: 'delta_rules', type: 'json', jsonShape: 'delta_rules' },
      { name: 'short_description', type: 'string' },
    ]),
  },
  {
    key: 'gripWidths',
    file: 'gripWidths.json',
    label: 'Grip Widths',
    group: 'Upper Body Mechanics',
    idField: 'id',
    labelField: 'label',
    fields: baseFields([
      { name: 'common_names', type: 'string[]', defaultValue: [] },
      { name: 'short_description', type: 'string' },
      { name: 'delta_rules', type: 'json', jsonShape: 'delta_rules' },
    ]),
  },
  {
    key: 'elbowRelationship',
    file: 'elbowRelationship.json',
    label: 'Elbow Relationship',
    group: 'Upper Body Mechanics',
    idField: 'id',
    labelField: 'label',
    fields: baseFields([
      { name: 'common_names', type: 'string[]', defaultValue: [] },
      { name: 'short_description', type: 'string' },
      { name: 'delta_rules', type: 'json', jsonShape: 'delta_rules' },
    ]),
  },
  {
    key: 'executionStyles',
    file: 'executionStyles.json',
    label: 'Execution Styles',
    group: 'Upper Body Mechanics',
    idField: 'id',
    labelField: 'label',
    fields: baseFields([
      { name: 'common_names', type: 'string[]', defaultValue: [] },
      { name: 'delta_rules', type: 'json', jsonShape: 'delta_rules' },
      { name: 'short_description', type: 'string' },
    ]),
  },

  // ── Lower Body Mechanics ──────────────────────────────────────
  {
    key: 'footPositions',
    file: 'footPositions.json',
    label: 'Foot Positions',
    group: 'Lower Body Mechanics',
    idField: 'id',
    labelField: 'label',
    fields: baseFields([
      { name: 'common_names', type: 'string[]', defaultValue: [] },
      { name: 'short_description', type: 'string' },
      { name: 'delta_rules', type: 'json', jsonShape: 'delta_rules' },
    ]),
  },
  {
    key: 'stanceWidths',
    file: 'stanceWidths.json',
    label: 'Stance Widths',
    group: 'Lower Body Mechanics',
    idField: 'id',
    labelField: 'label',
    fields: baseFields([
      { name: 'common_names', type: 'string[]', defaultValue: [] },
      { name: 'short_description', type: 'string' },
      { name: 'delta_rules', type: 'json', jsonShape: 'delta_rules' },
    ]),
  },
  {
    key: 'stanceTypes',
    file: 'stanceTypes.json',
    label: 'Stance Types',
    group: 'Lower Body Mechanics',
    idField: 'id',
    labelField: 'label',
    fields: baseFields([
      { name: 'common_names', type: 'string[]', defaultValue: [] },
      { name: 'short_description', type: 'string' },
      { name: 'delta_rules', type: 'json', jsonShape: 'delta_rules' },
    ]),
  },
  {
    key: 'loadPlacement',
    file: 'loadPlacement.json',
    label: 'Load Placement',
    group: 'Lower Body Mechanics',
    idField: 'id',
    labelField: 'label',
    fields: baseFields([
      { name: 'common_names', type: 'string[]', defaultValue: [] },
      { name: 'load_category', type: 'string' },
      { name: 'allows_secondary', type: 'boolean', defaultValue: false },
      { name: 'is_valid_secondary', type: 'boolean', defaultValue: false },
      { name: 'delta_rules', type: 'json', jsonShape: 'delta_rules' },
      { name: 'short_description', type: 'string' },
    ]),
  },

  // ── Execution Variables ──────────────────────────────────────────
  {
    key: 'supportStructures',
    file: 'supportStructures.json',
    label: 'Support Structures',
    group: 'Execution Variables',
    idField: 'id',
    labelField: 'label',
    fields: baseFields([
      { name: 'common_names', type: 'string[]', defaultValue: [] },
      { name: 'short_description', type: 'string' },
      { name: 'delta_rules', type: 'json', jsonShape: 'delta_rules' },
    ]),
  },
  {
    key: 'loadingAids',
    file: 'loadingAids.json',
    label: 'Loading Aids',
    group: 'Execution Variables',
    idField: 'id',
    labelField: 'label',
    fields: baseFields([
      { name: 'common_names', type: 'string[]', defaultValue: [] },
      { name: 'short_description', type: 'string' },
      { name: 'delta_rules', type: 'json', jsonShape: 'delta_rules' },
    ]),
  },
  {
    key: 'rangeOfMotion',
    file: 'rangeOfMotion.json',
    label: 'Range of Motion',
    group: 'Execution Variables',
    idField: 'id',
    labelField: 'label',
    fields: baseFields([
      { name: 'common_names', type: 'string[]', defaultValue: [] },
      { name: 'short_description', type: 'string' },
      { name: 'delta_rules', type: 'json', jsonShape: 'delta_rules' },
    ]),
  },

  // ── Equipment ────────────────────────────────────────────────────
  {
    key: 'equipmentCategories',
    file: 'equipmentCategories.json',
    label: 'Equipment Categories',
    group: 'Equipment',
    idField: 'id',
    labelField: 'label',
    fields: baseFields([
      { name: 'parent_id', type: 'fk', refTable: 'equipmentCategories', refLabelField: 'label' },
      { name: 'common_names', type: 'string[]', defaultValue: [] },
      { name: 'short_description', type: 'string' },
    ]),
  },
  {
    key: 'equipment',
    file: 'equipment.json',
    label: 'Equipment',
    group: 'Equipment',
    idField: 'id',
    labelField: 'label',
    fields: baseFields([
      { name: 'category_id', type: 'fk', refTable: 'equipmentCategories', refLabelField: 'label' },
      { name: 'common_names', type: 'string[]', defaultValue: [] },
      { name: 'short_description', type: 'string' },
      { name: 'is_attachment', type: 'boolean', defaultValue: false },
      { name: 'requires_attachment', type: 'boolean', defaultValue: false },
      { name: 'max_instances', type: 'number', defaultValue: 1 },
      { name: 'modifier_constraints', type: 'json', jsonShape: 'free' },
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
];

/** Registry with descriptions merged in for the admin UI */
export const TABLE_REGISTRY: TableSchema[] = TABLE_DEFINITIONS.map((t) => ({
  ...t,
  description: TABLE_DESCRIPTIONS[t.key],
}));

/** Lookup a schema by key */
export function getSchema(key: string): TableSchema | undefined {
  return TABLE_REGISTRY.find((t) => t.key === key);
}

/** Get all groups for sidebar (order = first appearance in TABLE_REGISTRY) */
export function getGroups(): string[] {
  const seen = new Set<string>();
  return TABLE_REGISTRY.filter((t) => {
    if (seen.has(t.group)) return false;
    seen.add(t.group);
    return true;
  }).map((t) => t.group);
}
