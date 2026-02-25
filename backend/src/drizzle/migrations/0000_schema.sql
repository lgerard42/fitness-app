-- Reference data schema: all 23 tables + metadata

DO $$ BEGIN
  CREATE TYPE source_type AS ENUM ('seed', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS reference_metadata (
  table_name TEXT PRIMARY KEY,
  version_seq BIGINT NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exercise_categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  technical_name TEXT,
  common_names JSONB DEFAULT '[]',
  short_description TEXT,
  exercise_input_permissions JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  source_type source_type NOT NULL DEFAULT 'seed'
);

CREATE TABLE IF NOT EXISTS cardio_types (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  technical_name TEXT,
  common_names JSONB DEFAULT '[]',
  short_description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  source_type source_type NOT NULL DEFAULT 'seed'
);

CREATE TABLE IF NOT EXISTS training_focus (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  technical_name TEXT,
  common_names JSONB DEFAULT '[]',
  short_description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  source_type source_type NOT NULL DEFAULT 'seed'
);

CREATE TABLE IF NOT EXISTS muscles (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  parent_ids JSONB DEFAULT '[]',
  common_names JSONB DEFAULT '[]',
  technical_name TEXT,
  short_description TEXT,
  "function" TEXT,
  location TEXT,
  triggers TEXT,
  upper_lower JSONB DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  source_type source_type NOT NULL DEFAULT 'seed'
);

CREATE TABLE IF NOT EXISTS motions (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  parent_id TEXT REFERENCES motions(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  upper_lower JSONB DEFAULT '[]',
  muscle_targets JSONB,
  default_delta_configs JSONB,
  common_names JSONB DEFAULT '[]',
  short_description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  source_type source_type NOT NULL DEFAULT 'seed'
);

CREATE TABLE IF NOT EXISTS grips (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  parent_id TEXT REFERENCES grips(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  is_dynamic BOOLEAN NOT NULL DEFAULT FALSE,
  grip_category TEXT,
  rotation_path JSONB,
  common_names JSONB DEFAULT '[]',
  delta_rules JSONB,
  short_description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  source_type source_type NOT NULL DEFAULT 'seed'
);

CREATE TABLE IF NOT EXISTS equipment_categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  parent_id TEXT REFERENCES equipment_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  common_names JSONB DEFAULT '[]',
  short_description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  source_type source_type NOT NULL DEFAULT 'seed'
);

CREATE TABLE IF NOT EXISTS motion_paths (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  common_names JSONB DEFAULT '[]',
  delta_rules JSONB,
  short_description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  source_type source_type NOT NULL DEFAULT 'seed'
);

CREATE TABLE IF NOT EXISTS torso_angles (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  common_names JSONB DEFAULT '[]',
  short_description TEXT,
  delta_rules JSONB,
  angle_range JSONB,
  allow_torso_orientations BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  source_type source_type NOT NULL DEFAULT 'seed'
);

CREATE TABLE IF NOT EXISTS torso_orientations (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  common_names JSONB DEFAULT '[]',
  short_description TEXT,
  delta_rules JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  source_type source_type NOT NULL DEFAULT 'seed'
);

CREATE TABLE IF NOT EXISTS resistance_origin (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  common_names JSONB DEFAULT '[]',
  delta_rules JSONB,
  short_description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  source_type source_type NOT NULL DEFAULT 'seed'
);

CREATE TABLE IF NOT EXISTS grip_widths (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  common_names JSONB DEFAULT '[]',
  short_description TEXT,
  delta_rules JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  source_type source_type NOT NULL DEFAULT 'seed'
);

CREATE TABLE IF NOT EXISTS elbow_relationship (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  common_names JSONB DEFAULT '[]',
  short_description TEXT,
  delta_rules JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  source_type source_type NOT NULL DEFAULT 'seed'
);

CREATE TABLE IF NOT EXISTS execution_styles (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  common_names JSONB DEFAULT '[]',
  delta_rules JSONB,
  short_description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  source_type source_type NOT NULL DEFAULT 'seed'
);

CREATE TABLE IF NOT EXISTS foot_positions (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  common_names JSONB DEFAULT '[]',
  short_description TEXT,
  delta_rules JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  source_type source_type NOT NULL DEFAULT 'seed'
);

CREATE TABLE IF NOT EXISTS stance_widths (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  common_names JSONB DEFAULT '[]',
  short_description TEXT,
  delta_rules JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  source_type source_type NOT NULL DEFAULT 'seed'
);

CREATE TABLE IF NOT EXISTS stance_types (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  common_names JSONB DEFAULT '[]',
  short_description TEXT,
  delta_rules JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  source_type source_type NOT NULL DEFAULT 'seed'
);

CREATE TABLE IF NOT EXISTS load_placement (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  common_names JSONB DEFAULT '[]',
  load_category TEXT,
  allows_secondary BOOLEAN NOT NULL DEFAULT FALSE,
  is_valid_secondary BOOLEAN NOT NULL DEFAULT FALSE,
  delta_rules JSONB,
  short_description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  source_type source_type NOT NULL DEFAULT 'seed'
);

CREATE TABLE IF NOT EXISTS support_structures (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  common_names JSONB DEFAULT '[]',
  short_description TEXT,
  delta_rules JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  source_type source_type NOT NULL DEFAULT 'seed'
);

CREATE TABLE IF NOT EXISTS loading_aids (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  common_names JSONB DEFAULT '[]',
  short_description TEXT,
  delta_rules JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  source_type source_type NOT NULL DEFAULT 'seed'
);

CREATE TABLE IF NOT EXISTS range_of_motion (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  common_names JSONB DEFAULT '[]',
  short_description TEXT,
  delta_rules JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  source_type source_type NOT NULL DEFAULT 'seed'
);

CREATE TABLE IF NOT EXISTS equipment (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  category_id TEXT REFERENCES equipment_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  common_names JSONB DEFAULT '[]',
  short_description TEXT,
  is_attachment BOOLEAN NOT NULL DEFAULT FALSE,
  requires_attachment BOOLEAN NOT NULL DEFAULT FALSE,
  max_instances INTEGER NOT NULL DEFAULT 1,
  modifier_constraints JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  source_type source_type NOT NULL DEFAULT 'seed'
);

CREATE TABLE IF NOT EXISTS equipment_icons (
  id TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  source_type source_type NOT NULL DEFAULT 'seed'
);
