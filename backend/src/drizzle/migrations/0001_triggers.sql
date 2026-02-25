CREATE OR REPLACE FUNCTION bump_reference_version()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO reference_metadata (table_name, version_seq, last_updated)
  VALUES (TG_TABLE_NAME, 1, NOW())
  ON CONFLICT (table_name) DO UPDATE
    SET version_seq  = reference_metadata.version_seq + 1,
        last_updated = NOW();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ref_version_exercise_categories ON exercise_categories;
CREATE TRIGGER trg_ref_version_exercise_categories AFTER INSERT OR UPDATE OR DELETE ON exercise_categories FOR EACH STATEMENT EXECUTE PROCEDURE bump_reference_version();

DROP TRIGGER IF EXISTS trg_ref_version_cardio_types ON cardio_types;
CREATE TRIGGER trg_ref_version_cardio_types AFTER INSERT OR UPDATE OR DELETE ON cardio_types FOR EACH STATEMENT EXECUTE PROCEDURE bump_reference_version();

DROP TRIGGER IF EXISTS trg_ref_version_training_focus ON training_focus;
CREATE TRIGGER trg_ref_version_training_focus AFTER INSERT OR UPDATE OR DELETE ON training_focus FOR EACH STATEMENT EXECUTE PROCEDURE bump_reference_version();

DROP TRIGGER IF EXISTS trg_ref_version_muscles ON muscles;
CREATE TRIGGER trg_ref_version_muscles AFTER INSERT OR UPDATE OR DELETE ON muscles FOR EACH STATEMENT EXECUTE PROCEDURE bump_reference_version();

DROP TRIGGER IF EXISTS trg_ref_version_motions ON motions;
CREATE TRIGGER trg_ref_version_motions AFTER INSERT OR UPDATE OR DELETE ON motions FOR EACH STATEMENT EXECUTE PROCEDURE bump_reference_version();

DROP TRIGGER IF EXISTS trg_ref_version_grips ON grips;
CREATE TRIGGER trg_ref_version_grips AFTER INSERT OR UPDATE OR DELETE ON grips FOR EACH STATEMENT EXECUTE PROCEDURE bump_reference_version();

DROP TRIGGER IF EXISTS trg_ref_version_equipment_categories ON equipment_categories;
CREATE TRIGGER trg_ref_version_equipment_categories AFTER INSERT OR UPDATE OR DELETE ON equipment_categories FOR EACH STATEMENT EXECUTE PROCEDURE bump_reference_version();

DROP TRIGGER IF EXISTS trg_ref_version_motion_paths ON motion_paths;
CREATE TRIGGER trg_ref_version_motion_paths AFTER INSERT OR UPDATE OR DELETE ON motion_paths FOR EACH STATEMENT EXECUTE PROCEDURE bump_reference_version();

DROP TRIGGER IF EXISTS trg_ref_version_torso_angles ON torso_angles;
CREATE TRIGGER trg_ref_version_torso_angles AFTER INSERT OR UPDATE OR DELETE ON torso_angles FOR EACH STATEMENT EXECUTE PROCEDURE bump_reference_version();

DROP TRIGGER IF EXISTS trg_ref_version_torso_orientations ON torso_orientations;
CREATE TRIGGER trg_ref_version_torso_orientations AFTER INSERT OR UPDATE OR DELETE ON torso_orientations FOR EACH STATEMENT EXECUTE PROCEDURE bump_reference_version();

DROP TRIGGER IF EXISTS trg_ref_version_resistance_origin ON resistance_origin;
CREATE TRIGGER trg_ref_version_resistance_origin AFTER INSERT OR UPDATE OR DELETE ON resistance_origin FOR EACH STATEMENT EXECUTE PROCEDURE bump_reference_version();

DROP TRIGGER IF EXISTS trg_ref_version_grip_widths ON grip_widths;
CREATE TRIGGER trg_ref_version_grip_widths AFTER INSERT OR UPDATE OR DELETE ON grip_widths FOR EACH STATEMENT EXECUTE PROCEDURE bump_reference_version();

DROP TRIGGER IF EXISTS trg_ref_version_elbow_relationship ON elbow_relationship;
CREATE TRIGGER trg_ref_version_elbow_relationship AFTER INSERT OR UPDATE OR DELETE ON elbow_relationship FOR EACH STATEMENT EXECUTE PROCEDURE bump_reference_version();

DROP TRIGGER IF EXISTS trg_ref_version_execution_styles ON execution_styles;
CREATE TRIGGER trg_ref_version_execution_styles AFTER INSERT OR UPDATE OR DELETE ON execution_styles FOR EACH STATEMENT EXECUTE PROCEDURE bump_reference_version();

DROP TRIGGER IF EXISTS trg_ref_version_foot_positions ON foot_positions;
CREATE TRIGGER trg_ref_version_foot_positions AFTER INSERT OR UPDATE OR DELETE ON foot_positions FOR EACH STATEMENT EXECUTE PROCEDURE bump_reference_version();

DROP TRIGGER IF EXISTS trg_ref_version_stance_widths ON stance_widths;
CREATE TRIGGER trg_ref_version_stance_widths AFTER INSERT OR UPDATE OR DELETE ON stance_widths FOR EACH STATEMENT EXECUTE PROCEDURE bump_reference_version();

DROP TRIGGER IF EXISTS trg_ref_version_stance_types ON stance_types;
CREATE TRIGGER trg_ref_version_stance_types AFTER INSERT OR UPDATE OR DELETE ON stance_types FOR EACH STATEMENT EXECUTE PROCEDURE bump_reference_version();

DROP TRIGGER IF EXISTS trg_ref_version_load_placement ON load_placement;
CREATE TRIGGER trg_ref_version_load_placement AFTER INSERT OR UPDATE OR DELETE ON load_placement FOR EACH STATEMENT EXECUTE PROCEDURE bump_reference_version();

DROP TRIGGER IF EXISTS trg_ref_version_support_structures ON support_structures;
CREATE TRIGGER trg_ref_version_support_structures AFTER INSERT OR UPDATE OR DELETE ON support_structures FOR EACH STATEMENT EXECUTE PROCEDURE bump_reference_version();

DROP TRIGGER IF EXISTS trg_ref_version_loading_aids ON loading_aids;
CREATE TRIGGER trg_ref_version_loading_aids AFTER INSERT OR UPDATE OR DELETE ON loading_aids FOR EACH STATEMENT EXECUTE PROCEDURE bump_reference_version();

DROP TRIGGER IF EXISTS trg_ref_version_range_of_motion ON range_of_motion;
CREATE TRIGGER trg_ref_version_range_of_motion AFTER INSERT OR UPDATE OR DELETE ON range_of_motion FOR EACH STATEMENT EXECUTE PROCEDURE bump_reference_version();

DROP TRIGGER IF EXISTS trg_ref_version_equipment ON equipment;
CREATE TRIGGER trg_ref_version_equipment AFTER INSERT OR UPDATE OR DELETE ON equipment FOR EACH STATEMENT EXECUTE PROCEDURE bump_reference_version();

DROP TRIGGER IF EXISTS trg_ref_version_equipment_icons ON equipment_icons;
CREATE TRIGGER trg_ref_version_equipment_icons AFTER INSERT OR UPDATE OR DELETE ON equipment_icons FOR EACH STATEMENT EXECUTE PROCEDURE bump_reference_version();
