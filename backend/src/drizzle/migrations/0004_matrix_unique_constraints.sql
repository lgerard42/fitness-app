-- Step 1: Demote duplicate active configs — keep most-recently-updated per scope
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY scope_type, scope_id
           ORDER BY updated_at DESC
         ) AS rn
  FROM motion_matrix_configs
  WHERE status = 'active' AND is_deleted = FALSE
)
UPDATE motion_matrix_configs
SET status = 'draft', updated_at = NOW()
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Step 2: Re-number duplicate config_versions within each scope
DO $$
DECLARE
  rec RECORD;
  next_ver INTEGER;
  dup_id TEXT;
BEGIN
  FOR rec IN
    SELECT scope_type, scope_id, config_version
    FROM motion_matrix_configs
    WHERE is_deleted = FALSE
    GROUP BY scope_type, scope_id, config_version
    HAVING COUNT(*) > 1
  LOOP
    SELECT COALESCE(MAX(config_version), 0) + 1
    INTO next_ver
    FROM motion_matrix_configs
    WHERE scope_type = rec.scope_type AND scope_id = rec.scope_id AND is_deleted = FALSE;

    FOR dup_id IN
      SELECT id FROM motion_matrix_configs
      WHERE scope_type = rec.scope_type
        AND scope_id = rec.scope_id
        AND config_version = rec.config_version
        AND is_deleted = FALSE
      ORDER BY status DESC, updated_at DESC
      OFFSET 1
    LOOP
      UPDATE motion_matrix_configs
      SET config_version = next_ver, updated_at = NOW()
      WHERE id = dup_id;
      next_ver := next_ver + 1;
    END LOOP;
  END LOOP;
END $$;

-- Step 3: Enforce at most 1 active config per (scope_type, scope_id)
CREATE UNIQUE INDEX IF NOT EXISTS uq_mmc_one_active_per_scope
  ON motion_matrix_configs (scope_type, scope_id)
  WHERE status = 'active' AND is_deleted = FALSE;

-- Step 4: Enforce unique config_version per (scope_type, scope_id) among non-deleted rows
CREATE UNIQUE INDEX IF NOT EXISTS uq_mmc_version_per_scope
  ON motion_matrix_configs (scope_type, scope_id, config_version)
  WHERE is_deleted = FALSE;
