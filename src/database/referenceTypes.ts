export interface ExerciseCategory {
  id: string;
  label: string;
  technical_name?: string;
  common_names?: string;
  icon?: string;
  short_description?: string;
  exercise_input_permissions?: string;
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
  parent_ids?: string;
  label: string;
  common_names?: string;
  technical_name?: string;
  short_description?: string;
  function?: string;
  location?: string;
  triggers?: string;
  upper_lower?: string;
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
  modifier_constraints?: string;
  sort_order?: number;
}

export interface Grip {
  id: string;
  parent_id?: string;
  label: string;
  is_dynamic: number;
  grip_category?: string;
  rotation_path?: string;
  common_names?: string;
  delta_rules?: string;
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

export type EquipmentPickerItem = { label: string; icon?: string };
