DROP TRIGGER IF EXISTS trg_ref_version_combo_rules ON combo_rules;
CREATE TRIGGER trg_ref_version_combo_rules AFTER INSERT OR UPDATE OR DELETE ON combo_rules FOR EACH STATEMENT EXECUTE PROCEDURE bump_reference_version();
