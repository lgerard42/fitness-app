-- FK indexes for self-referencing and cross-table foreign keys
CREATE INDEX IF NOT EXISTS idx_motions_parent_id ON motions (parent_id);
CREATE INDEX IF NOT EXISTS idx_grips_parent_id ON grips (parent_id);
CREATE INDEX IF NOT EXISTS idx_equipment_categories_parent_id ON equipment_categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_equipment_category_id ON equipment (category_id);

-- Active-row read optimization indexes (covering index for bootstrap queries)
CREATE INDEX IF NOT EXISTS idx_exercise_categories_active ON exercise_categories (sort_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_cardio_types_active ON cardio_types (sort_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_training_focus_active ON training_focus (sort_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_muscles_active ON muscles (sort_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_motions_active ON motions (sort_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_grips_active ON grips (sort_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_equipment_categories_active ON equipment_categories (sort_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_motion_paths_active ON motion_paths (sort_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_torso_angles_active ON torso_angles (sort_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_torso_orientations_active ON torso_orientations (sort_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_resistance_origin_active ON resistance_origin (sort_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_grip_widths_active ON grip_widths (sort_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_elbow_relationship_active ON elbow_relationship (sort_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_execution_styles_active ON execution_styles (sort_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_foot_positions_active ON foot_positions (sort_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_stance_widths_active ON stance_widths (sort_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_stance_types_active ON stance_types (sort_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_load_placement_active ON load_placement (sort_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_support_structures_active ON support_structures (sort_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_loading_aids_active ON loading_aids (sort_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_range_of_motion_active ON range_of_motion (sort_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_equipment_active ON equipment (sort_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_equipment_icons_active ON equipment_icons (id) WHERE is_active = true;
