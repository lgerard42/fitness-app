-- Motion Matrix V2 config storage: scoped matrix configs with draft/active lifecycle

CREATE TABLE IF NOT EXISTS motion_matrix_configs (
  id              TEXT PRIMARY KEY,
  scope_type      TEXT NOT NULL CHECK (scope_type IN ('motion', 'motion_group')),
  scope_id        TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active')),
  schema_version  TEXT NOT NULL DEFAULT '1.0',
  config_version  INTEGER NOT NULL DEFAULT 1,
  config_json     JSONB NOT NULL DEFAULT '{}',
  notes           TEXT,
  validation_status TEXT CHECK (validation_status IN ('valid', 'warning', 'error')),
  validation_summary JSONB,
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at    TIMESTAMPTZ,
  created_by      TEXT,
  updated_by      TEXT
);

CREATE INDEX idx_mmc_scope ON motion_matrix_configs (scope_type, scope_id, status)
  WHERE is_deleted = FALSE;

CREATE INDEX idx_mmc_scope_updated ON motion_matrix_configs (scope_type, scope_id, updated_at)
  WHERE is_deleted = FALSE;

CREATE INDEX idx_mmc_active_lookup ON motion_matrix_configs (scope_type, scope_id)
  WHERE status = 'active' AND is_deleted = FALSE;
