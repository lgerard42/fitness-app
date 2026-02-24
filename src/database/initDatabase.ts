/**
 * Database initialization for exercise configuration tables
 * Creates all tables and seeds initial data
 */
import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'workout.db';
const DATABASE_VERSION = 24;

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  // Enable WAL mode for better performance
  await db.execAsync('PRAGMA journal_mode = WAL');
  await db.execAsync('PRAGMA foreign_keys = ON');

  // Check if database is already initialized
  const versionResult = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  const currentVersion = versionResult?.user_version || 0;

  if (currentVersion < DATABASE_VERSION) {
    await createTables(db);
    if (currentVersion === 0) {
      await seedData(db);
    }
    if (currentVersion < 3) {
      await seedEquipmentData(db);
    }
    if (currentVersion < 4) {
      await migrateToV4(db);
    }
    if (currentVersion < 5) {
      await seedMotionData(db);
    }
    if (currentVersion < 6) {
      // Previously re-seeded secondary_muscles; no longer needed after V19 merge.
    }
    if (currentVersion < 7) {
      await migrateToV7(db);
    }
    if (currentVersion < 8) {
      await migrateToV8(db);
    }
    if (currentVersion < 9) {
      await migrateToV9(db);
    }
    if (currentVersion < 10) {
      await migrateToV10(db);
    }
    if (currentVersion < 11) {
      await migrateToV11(db);
    }
    if (currentVersion < 12) {
      await migrateToV12(db);
    }
    if (currentVersion < 13) {
      await migrateToV13(db);
    }
    if (currentVersion < 14) {
      await migrateToV14(db);
    }
    if (currentVersion < 15) {
      await migrateToV15(db);
    }
    if (currentVersion < 16) {
      await migrateToV16(db);
    }
    if (currentVersion < 17) {
      await migrateToV17(db);
    }
    if (currentVersion < 18) {
      await migrateToV18(db);
    }
    if (currentVersion < 19) {
      await migrateToV19(db);
    }
    if (currentVersion < 20) {
      await migrateToV20(db);
    }
    if (currentVersion < 21) {
      await migrateToV21(db);
    }
    if (currentVersion < 22) {
      await migrateToV22(db);
    }
    if (currentVersion < 23) {
      await migrateToV23(db);
    }
    if (currentVersion < 24) {
      await migrateToV24(db);
    }
    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  }

  // Re-seed equipment data from JSON on every app load (same idea as motion options
  // being loaded fresh in ExerciseEditor) so gym equipment picker stays in sync.
  await seedEquipmentData(db);

  // Re-seed muscles on every app load
  await seedMuscleData(db);

  // Re-seed grip data (grips) on every app load so grip pickers stay in sync.
  await seedGripData(db);

  return db;
}

async function createTables(db: SQLite.SQLiteDatabase) {
  // EXERCISE_CATEGORIES table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS exercise_categories (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      technical_name TEXT,
      common_names TEXT,
      icon TEXT,
      short_description TEXT,
      exercise_input_permissions TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );
  `);

  // CARDIO_TYPES table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS cardio_types (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      technical_name TEXT,
      common_names TEXT,
      icon TEXT,
      short_description TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );
  `);

  // MUSCLES table (unified hierarchy)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS muscles (
      id TEXT PRIMARY KEY,
      parent_ids TEXT DEFAULT '[]',
      label TEXT NOT NULL,
      common_names TEXT,
      technical_name TEXT,
      short_description TEXT,
      "function" TEXT,
      location TEXT,
      triggers TEXT,
      upper_lower TEXT DEFAULT '[]',
      sort_order INTEGER DEFAULT 0,
      icon TEXT,
      is_active INTEGER DEFAULT 1
    );
  `);

  // TRAINING_FOCUS table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS training_focus (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      technical_name TEXT,
      common_names TEXT,
      icon TEXT,
      short_description TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );
  `);

  // EQUIPMENT_CATEGORIES table (merged hierarchical structure)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS equipment_categories (
      id TEXT PRIMARY KEY,
      parent_id TEXT,
      label TEXT NOT NULL,
      common_names TEXT,
      short_description TEXT,
      sort_order INTEGER DEFAULT 0,
      icon TEXT,
      is_active INTEGER DEFAULT 1
    );
  `);

  // EQUIPMENT table (unified gym equipment + cable attachments)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS equipment (
      id TEXT PRIMARY KEY,
      category_id TEXT,
      label TEXT NOT NULL,
      common_names TEXT,
      short_description TEXT,
      is_attachment INTEGER DEFAULT 0,
      requires_attachment INTEGER DEFAULT 0,
      max_instances INTEGER DEFAULT 1,
      modifier_constraints TEXT DEFAULT '{}',
      sort_order INTEGER DEFAULT 0,
      icon TEXT,
      is_active INTEGER DEFAULT 1
    );
  `);

  // MOTION_PATHS table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS motion_paths (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      common_names TEXT,
      delta_rules TEXT DEFAULT '{}',
      short_description TEXT,
      sort_order INTEGER DEFAULT 0,
      icon TEXT,
      is_active INTEGER DEFAULT 1
    );
  `);

  // MOTIONS table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS motions (
      id TEXT PRIMARY KEY,
      parent_id TEXT,
      label TEXT NOT NULL,
      upper_lower_body TEXT,
      muscle_targets TEXT DEFAULT '{}',
      motion_paths TEXT DEFAULT '{}',
      common_names TEXT,
      short_description TEXT,
      sort_order INTEGER DEFAULT 0,
      icon TEXT,
      is_active INTEGER DEFAULT 1
    );
  `);


  // GRIPS table (unified grip types, widths, and rotating variations)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS grips (
      id TEXT PRIMARY KEY,
      parent_id TEXT,
      label TEXT NOT NULL,
      is_dynamic INTEGER DEFAULT 0,
      grip_category TEXT,
      rotation_path TEXT,
      common_names TEXT,
      delta_rules TEXT DEFAULT '{}',
      short_description TEXT,
      sort_order INTEGER DEFAULT 0,
      icon TEXT,
      is_active INTEGER DEFAULT 1
    );
  `);

  // GRIP_WIDTHS table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS grip_widths (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      common_names TEXT,
      icon TEXT,
      short_description TEXT,
      delta_rules TEXT DEFAULT '{}',
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );
  `);

  // FOOT_POSITIONS table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS foot_positions (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      common_names TEXT,
      icon TEXT,
      short_description TEXT,
      delta_rules TEXT DEFAULT '{}',
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );
  `);

  // STANCE_TYPES table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS stance_types (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      common_names TEXT,
      icon TEXT,
      short_description TEXT,
      delta_rules TEXT DEFAULT '{}',
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );
  `);

  // STANCE_WIDTHS table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS stance_widths (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      common_names TEXT,
      icon TEXT,
      short_description TEXT,
      delta_rules TEXT DEFAULT '{}',
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );
  `);

  // TORSO_ANGLES table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS torso_angles (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      common_names TEXT,
      icon TEXT,
      short_description TEXT,
      delta_rules TEXT DEFAULT '{}',
      angle_range TEXT DEFAULT '{}',
      allow_torso_orientations INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );
  `);

  // TORSO_ORIENTATIONS table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS torso_orientations (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      common_names TEXT,
      icon TEXT,
      short_description TEXT,
      delta_rules TEXT DEFAULT '{}',
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );
  `);

  // SUPPORT_STRUCTURES table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS support_structures (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      common_names TEXT,
      icon TEXT,
      short_description TEXT,
      delta_rules TEXT DEFAULT '{}',
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );
  `);

  // ELBOW_RELATIONSHIP table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS elbow_relationship (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      common_names TEXT,
      icon TEXT,
      short_description TEXT,
      delta_rules TEXT DEFAULT '{}',
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );
  `);

  // LOADING_AIDS table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS loading_aids (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      common_names TEXT,
      icon TEXT,
      short_description TEXT,
      delta_rules TEXT DEFAULT '{}',
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );
  `);

  // RANGE_OF_MOTION table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS range_of_motion (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      common_names TEXT,
      icon TEXT,
      short_description TEXT,
      delta_rules TEXT DEFAULT '{}',
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );
  `);
}

async function migrateToV4(db: SQLite.SQLiteDatabase) {
  const tables = [
    'exercise_categories', 'cardio_types', 'muscle_groups', 'primary_muscles',
    'secondary_muscles', 'tertiary_muscles', 'training_focus',
    'equipment_categories',
    'cable_attachments', 'gym_equipment',
  ];
  for (const table of tables) {
    try {
      await db.execAsync(`ALTER TABLE ${table} ADD COLUMN sort_order INTEGER DEFAULT 0`);
    } catch { /* column may already exist */ }
    try {
      await db.execAsync(`ALTER TABLE ${table} ADD COLUMN is_active INTEGER DEFAULT 1`);
    } catch { /* column may already exist */ }
  }
}

async function migrateToV7(db: SQLite.SQLiteDatabase) {
  try {
    // Check if column exists by trying to query it
    const tableInfo = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(primary_muscles)"
    );
    const hasColumn = tableInfo.some(col => col.name === 'upper_lower');

    if (!hasColumn) {
      await db.execAsync(`ALTER TABLE primary_muscles ADD COLUMN upper_lower TEXT`);
    }
  } catch (error) {
    // If table doesn't exist yet, createTables will handle it
    console.warn('Migration V7 warning:', error);
  }
}

async function migrateToV8(db: SQLite.SQLiteDatabase) {
  // V8 adds grip_types, grip_widths, and rotating_grip_variations tables
  // Tables are created in createTables(), so this migration is mainly for
  // ensuring tables exist if upgrading from older versions
  // The seedGripData function will populate them
}

async function migrateToV9(db: SQLite.SQLiteDatabase) {
  // V9 adds denormalized FK columns across all muscle tables
  // Old JSON files no longer exist after V19 merge; skip if tables are gone
  let secondaryMuscles: Record<string, unknown>[];
  let tertiaryMuscles: Record<string, unknown>[];
  try {
    secondaryMuscles = require('./tables/secondaryMuscles.json') as Record<string, unknown>[];
    tertiaryMuscles = require('./tables/tertiaryMuscles.json') as Record<string, unknown>[];
  } catch {
    return;
  }

  try {
    // Add tertiary_muscle_ids to secondary_muscles
    const secInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(secondary_muscles)`);
    if (!secInfo.some(col => col.name === 'tertiary_muscle_ids')) {
      await db.execAsync(`ALTER TABLE secondary_muscles ADD COLUMN tertiary_muscle_ids TEXT DEFAULT '[]'`);
    }

    // Add secondary_muscle_ids and tertiary_muscle_ids to primary_muscles
    const priInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(primary_muscles)`);
    if (!priInfo.some(col => col.name === 'secondary_muscle_ids')) {
      await db.execAsync(`ALTER TABLE primary_muscles ADD COLUMN secondary_muscle_ids TEXT DEFAULT '[]'`);
    }
    if (!priInfo.some(col => col.name === 'tertiary_muscle_ids')) {
      await db.execAsync(`ALTER TABLE primary_muscles ADD COLUMN tertiary_muscle_ids TEXT DEFAULT '[]'`);
    }

    // Add primary_muscle_ids to tertiary_muscles
    const terInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(tertiary_muscles)`);
    if (!terInfo.some(col => col.name === 'primary_muscle_ids')) {
      await db.execAsync(`ALTER TABLE tertiary_muscles ADD COLUMN primary_muscle_ids TEXT DEFAULT '[]'`);
    }

    // Populate secondary_muscles.tertiary_muscle_ids
    const secTertiaryMap: Record<string, string[]> = {};
    for (const t of tertiaryMuscles) {
      const sids = Array.isArray(t.secondary_muscle_ids) ? (t.secondary_muscle_ids as string[]) : [];
      for (const sid of sids) {
        if (!secTertiaryMap[sid]) secTertiaryMap[sid] = [];
        secTertiaryMap[sid].push(String(t.id));
      }
    }
    for (const [sid, tids] of Object.entries(secTertiaryMap)) {
      await db.runAsync(`UPDATE secondary_muscles SET tertiary_muscle_ids = ? WHERE id = ?`, JSON.stringify(tids), sid);
    }

    // Populate primary_muscles.secondary_muscle_ids and tertiary_muscle_ids
    const priSecMap: Record<string, string[]> = {};
    for (const s of secondaryMuscles) {
      const pids = Array.isArray(s.primary_muscle_ids) ? (s.primary_muscle_ids as string[]) : [];
      for (const pid of pids) {
        if (!priSecMap[pid]) priSecMap[pid] = [];
        priSecMap[pid].push(String(s.id));
      }
    }
    for (const [pid, sids] of Object.entries(priSecMap)) {
      const tids = tertiaryMuscles
        .filter(t => {
          const tsids = Array.isArray(t.secondary_muscle_ids) ? (t.secondary_muscle_ids as string[]) : [];
          return tsids.some(sid => sids.includes(sid));
        })
        .map(t => String(t.id));
      await db.runAsync(`UPDATE primary_muscles SET secondary_muscle_ids = ?, tertiary_muscle_ids = ? WHERE id = ?`,
        JSON.stringify(sids), JSON.stringify(tids), pid);
    }

    // Populate tertiary_muscles.primary_muscle_ids
    for (const t of tertiaryMuscles) {
      const tsids = Array.isArray(t.secondary_muscle_ids) ? (t.secondary_muscle_ids as string[]) : [];
      const pids = new Set<string>();
      for (const s of secondaryMuscles) {
        if (tsids.includes(String(s.id))) {
          const spids = Array.isArray(s.primary_muscle_ids) ? (s.primary_muscle_ids as string[]) : [];
          spids.forEach(pid => pids.add(pid));
        }
      }
      if (pids.size > 0) {
        await db.runAsync(`UPDATE tertiary_muscles SET primary_muscle_ids = ? WHERE id = ?`,
          JSON.stringify([...pids]), String(t.id));
      }
    }
  } catch (e) {
    console.warn('migrateToV9: failed to add denormalized muscle columns', e);
  }
}

async function migrateToV10(db: SQLite.SQLiteDatabase) {
  // V10 adds denormalized FK columns across motion tables
  let primaryMotionVariations: Record<string, unknown>[];
  try {
    primaryMotionVariations = require('./tables/primaryMotionVariations.json') as Record<string, unknown>[];
  } catch {
    return;
  }

  try {
    // Add motion_variation_ids and motion_path_ids to primary_motions
    const pmInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(primary_motions)`);
    if (!pmInfo.some(col => col.name === 'motion_variation_ids')) {
      await db.execAsync(`ALTER TABLE primary_motions ADD COLUMN motion_variation_ids TEXT DEFAULT '[]'`);
    }
    if (!pmInfo.some(col => col.name === 'motion_path_ids')) {
      await db.execAsync(`ALTER TABLE primary_motions ADD COLUMN motion_path_ids TEXT DEFAULT '[]'`);
    }

    // Add motion_variation_ids and primary_motion_ids to motion_paths
    const mpInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(motion_paths)`);
    if (!mpInfo.some(col => col.name === 'motion_variation_ids')) {
      await db.execAsync(`ALTER TABLE motion_paths ADD COLUMN motion_variation_ids TEXT DEFAULT '[]'`);
    }
    if (!mpInfo.some(col => col.name === 'primary_motion_ids')) {
      await db.execAsync(`ALTER TABLE motion_paths ADD COLUMN primary_motion_ids TEXT DEFAULT '[]'`);
    }

    // Populate primary_motions.motion_variation_ids and motion_path_ids
    const pmVarMap: Record<string, string[]> = {};
    const pmPlaneMap: Record<string, Set<string>> = {};
    for (const v of primaryMotionVariations) {
      const pmKey = String(v.primary_motion_ids);
      if (!pmVarMap[pmKey]) pmVarMap[pmKey] = [];
      pmVarMap[pmKey].push(String(v.id));
      if (!pmPlaneMap[pmKey]) pmPlaneMap[pmKey] = new Set();
      const planes = Array.isArray(v.motion_path_ids) ? (v.motion_path_ids as string[]) : [];
      planes.forEach(p => pmPlaneMap[pmKey].add(p));
    }
    for (const [pmKey, varIds] of Object.entries(pmVarMap)) {
      const planeIds = [...(pmPlaneMap[pmKey] || [])];
      await db.runAsync(
        `UPDATE primary_motions SET motion_variation_ids = ?, motion_path_ids = ? WHERE id = ?`,
        JSON.stringify(varIds), JSON.stringify(planeIds), pmKey
      );
    }

    // Populate motion_paths.motion_variation_ids and primary_motion_ids
    const mpVarMap: Record<string, string[]> = {};
    const mpPmMap: Record<string, Set<string>> = {};
    for (const v of primaryMotionVariations) {
      const planes = Array.isArray(v.motion_path_ids) ? (v.motion_path_ids as string[]) : [];
      for (const planeId of planes) {
        if (!mpVarMap[planeId]) mpVarMap[planeId] = [];
        mpVarMap[planeId].push(String(v.id));
        if (!mpPmMap[planeId]) mpPmMap[planeId] = new Set();
        mpPmMap[planeId].add(String(v.primary_motion_ids));
      }
    }
    for (const [planeId, varIds] of Object.entries(mpVarMap)) {
      const pmIds = [...(mpPmMap[planeId] || [])];
      await db.runAsync(
        `UPDATE motion_paths SET motion_variation_ids = ?, primary_motion_ids = ? WHERE id = ?`,
        JSON.stringify(varIds), JSON.stringify(pmIds), planeId
      );
    }
  } catch (e) {
    console.warn('migrateToV10: failed to add denormalized motion columns', e);
  }
}

async function migrateToV11(db: SQLite.SQLiteDatabase) {
  // V11 adds muscle_targets column to motion_paths
  try {
    const mpInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(motion_paths)`);
    if (!mpInfo.some(col => col.name === 'muscle_targets')) {
      await db.execAsync(`ALTER TABLE motion_paths ADD COLUMN muscle_targets TEXT DEFAULT '{}'`);
    }
  } catch (e) {
    console.warn('migrateToV11: failed to add muscle_targets to motion_paths', e);
  }
}

async function migrateToV12(db: SQLite.SQLiteDatabase) {
  // V12 adds grip_type_ids and grip_type_configs columns to primary_motions
  try {
    const pmInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(primary_motions)`);
    if (!pmInfo.some(col => col.name === 'grip_type_ids')) {
      await db.execAsync(`ALTER TABLE primary_motions ADD COLUMN grip_type_ids TEXT DEFAULT '[]'`);
    }
    if (!pmInfo.some(col => col.name === 'grip_type_configs')) {
      await db.execAsync(`ALTER TABLE primary_motions ADD COLUMN grip_type_configs TEXT DEFAULT '{}'`);
    }
  } catch (e) {
    console.warn('migrateToV12: failed to add grip columns to primary_motions', e);
  }
}

async function migrateToV13(db: SQLite.SQLiteDatabase) {
  // V13: grip_types.variations -> variation_ids; rotating_grip_variations.grip_type_id
  try {
    const gtInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(grip_types)`);
    if (!gtInfo.some(col => col.name === 'variation_ids')) {
      await db.execAsync(`ALTER TABLE grip_types ADD COLUMN variation_ids TEXT DEFAULT '[]'`);
    }
    const rgInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(rotating_grip_variations)`);
    if (!rgInfo.some(col => col.name === 'grip_type_id')) {
      await db.execAsync(`ALTER TABLE rotating_grip_variations ADD COLUMN grip_type_id TEXT`);
    }
  } catch (e) {
    console.warn('migrateToV13: failed to add grip variation columns', e);
  }
}

async function migrateToV14(db: SQLite.SQLiteDatabase) {
  // V14: grip_types.variation_ids -> grip_type_variation_ids (column rename / new column)
  try {
    const gtInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(grip_types)`);
    if (!gtInfo.some(col => col.name === 'grip_type_variation_ids')) {
      await db.execAsync(`ALTER TABLE grip_types ADD COLUMN grip_type_variation_ids TEXT DEFAULT '[]'`);
      const hasOld = gtInfo.some(col => col.name === 'variation_ids');
      if (hasOld) {
        await db.execAsync(`UPDATE grip_types SET grip_type_variation_ids = variation_ids WHERE variation_ids IS NOT NULL AND variation_ids != ''`);
      }
    }
  } catch (e) {
    console.warn('migrateToV14: failed to add grip_type_variation_ids', e);
  }
}

async function migrateToV15(db: SQLite.SQLiteDatabase) {
  try {
    const addCol = async (table: string, col: string) => {
      const info = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
      if (!info.some(c => c.name === col)) {
        const quotedCol = col === 'function' ? `"function"` : col;
        await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${quotedCol} TEXT`);
      }
    };
    for (const table of ['primary_muscles', 'secondary_muscles', 'tertiary_muscles']) {
      await addCol(table, 'function');
      await addCol(table, 'location');
      await addCol(table, 'triggers');
    }
  } catch (e) {
    console.warn('migrateToV15: failed to add function/location/triggers columns', e);
  }
}

async function migrateToV16(db: SQLite.SQLiteDatabase) {
  try {
    const addCol = async (table: string, col: string, defaultVal = '') => {
      const info = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
      if (!info.some(c => c.name === col)) {
        const def = defaultVal ? ` DEFAULT '${defaultVal}'` : '';
        await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${col} TEXT${def}`);
      }
    };

    await addCol('primary_motions', 'motion_paths', '{}');
    await addCol('primary_motions', 'icon');
    await addCol('motion_paths', 'icon');
    await addCol('grip_types', 'grip_category');
    await addCol('grip_types', 'delta_rules', '{}');
    await addCol('grip_types', 'default_variation');
    await addCol('grip_widths', 'delta_rules', '{}');

    const newTables = [
      'foot_positions', 'stance_types', 'stance_widths',
      'torso_angles', 'support_structures', 'elbow_relationship', 'loading_aids'
    ];
    for (const table of newTables) {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS ${table} (
          id TEXT PRIMARY KEY,
          label TEXT NOT NULL,
          common_names TEXT,
          icon TEXT,
          short_description TEXT,
          delta_rules TEXT DEFAULT '{}',
          sort_order INTEGER DEFAULT 0,
          is_active INTEGER DEFAULT 1
        );
      `);
    }

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS grip_type_variations (
        id TEXT PRIMARY KEY,
        parent_grip_id TEXT,
        label TEXT NOT NULL,
        common_names TEXT,
        icon TEXT,
        short_description TEXT,
        delta_rules TEXT DEFAULT '{}',
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1
      );
    `);

    await seedMotionData(db);
  } catch (e) {
    console.warn('migrateToV16: failed', e);
  }
}

async function migrateToV17(db: SQLite.SQLiteDatabase) {
  try {
    const addCol = async (table: string, col: string, def = '') => {
      try {
        await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${col} TEXT DEFAULT '${def}'`);
      } catch { /* column already exists */ }
    };

    await addCol('torso_angles', 'angle_range', '{}');
    await addCol('torso_angles', 'allow_torso_orientations', '0');

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS torso_orientations (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        common_names TEXT,
        icon TEXT,
        short_description TEXT,
        delta_rules TEXT DEFAULT '{}',
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1
      );
    `);
  } catch (e) {
    console.warn('migrateToV17: failed', e);
  }
}

async function migrateToV18(db: SQLite.SQLiteDatabase) {
  try {
    // Add parent_id column to equipment_categories if it doesn't exist
    const addCol = async (table: string, col: string, def = '') => {
      try {
        await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${col} TEXT DEFAULT '${def}'`);
      } catch { /* column already exists */ }
    };

    await addCol('equipment_categories', 'parent_id');

    // Migrate data from old tables to new merged structure
    // First, get all existing data
    const mainCats = await db.getAllAsync<{ id: string; label: string; common_names: string; short_description: string; sort_order: number; is_active: number; icon?: string }>(
      'SELECT id, label, common_names, short_description, sort_order, is_active, icon FROM equipment_categories'
    );
    const supportCats = await db.getAllAsync<{ id: string; label: string; common_names: string; short_description: string; sort_order: number; is_active: number; icon?: string }>(
      'SELECT id, label, common_names, short_description, sort_order, is_active, icon FROM support_equipment_categories'
    );
    const weightsCats = await db.getAllAsync<{ id: string; label: string; common_names: string; short_description: string; sort_order: number; is_active: number; icon?: string }>(
      'SELECT id, label, common_names, short_description, sort_order, is_active, icon FROM weights_equipment_categories'
    );

    // Map old IDs to new IDs
    const supportIdMapping: Record<string, string> = {
      'OTHER': 'OTHER_SUPPORT',
      'GENERAL': 'GENERAL_SUPPORT',
    };
    const weightsIdMapping: Record<string, string> = {
      'OTHER': 'OTHER_WEIGHTS',
      'BODYWEIGHT': 'BODYWEIGHT_CAT',
      'CABLE': 'CABLE_CAT',
    };

    // Clear and rebuild equipment_categories table
    await db.execAsync('DELETE FROM equipment_categories');

    // Insert top-level categories (SUPPORT and WEIGHTS)
    for (const cat of mainCats) {
      await db.runAsync(
        `INSERT INTO equipment_categories (id, parent_id, label, common_names, short_description, sort_order, icon, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        cat.id,
        null,
        cat.label,
        cat.common_names || '[]',
        cat.short_description || '',
        cat.sort_order || 0,
        cat.icon || '',
        cat.is_active !== 0 ? 1 : 0
      );
    }

    // Insert support subcategories
    for (const cat of supportCats) {
      const newId = supportIdMapping[cat.id] || cat.id;
      await db.runAsync(
        `INSERT INTO equipment_categories (id, parent_id, label, common_names, short_description, sort_order, icon, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        newId,
        'SUPPORT',
        cat.label,
        cat.common_names || '[]',
        cat.short_description || '',
        cat.sort_order || 0,
        cat.icon || '',
        cat.is_active !== 0 ? 1 : 0
      );
    }

    // Insert weights subcategories
    for (const cat of weightsCats) {
      const newId = weightsIdMapping[cat.id] || cat.id;
      await db.runAsync(
        `INSERT INTO equipment_categories (id, parent_id, label, common_names, short_description, sort_order, icon, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        newId,
        'WEIGHTS',
        cat.label,
        cat.common_names || '[]',
        cat.short_description || '',
        cat.sort_order || 0,
        cat.icon || '',
        cat.is_active !== 0 ? 1 : 0
      );
    }

    // Drop old tables (they will be recreated empty if needed, but data is migrated)
    try {
      await db.execAsync('DROP TABLE IF EXISTS support_equipment_categories');
      await db.execAsync('DROP TABLE IF EXISTS weights_equipment_categories');
    } catch (e) {
      console.warn('migrateToV18: failed to drop old tables', e);
    }
  } catch (e) {
    console.warn('migrateToV18: failed', e);
  }
}

async function migrateToV19(db: SQLite.SQLiteDatabase) {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS muscles (
        id TEXT PRIMARY KEY,
        parent_ids TEXT DEFAULT '[]',
        label TEXT NOT NULL,
        common_names TEXT,
        technical_name TEXT,
        short_description TEXT,
        "function" TEXT,
        location TEXT,
        triggers TEXT,
        upper_lower TEXT DEFAULT '[]',
        sort_order INTEGER DEFAULT 0,
        icon TEXT,
        is_active INTEGER DEFAULT 1
      );
    `);

    const str = (v: unknown) => (v == null ? '' : String(v));

    // Migrate primary_muscles (parent_ids = [])
    try {
      const primaries = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM primary_muscles');
      for (const row of primaries) {
        await db.runAsync(
          `INSERT OR REPLACE INTO muscles (id, parent_ids, label, common_names, technical_name, short_description, "function", location, triggers, upper_lower, sort_order, icon, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          str(row.id), '[]', str(row.label), str(row.common_names), str(row.technical_name),
          str(row.short_description), str(row.function), str(row.location), str(row.triggers),
          str(row.upper_lower) || '[]', Number(row.sort_order) || 0, str(row.icon),
          row.is_active !== 0 ? 1 : 0
        );
      }
    } catch { /* table may not exist */ }

    // Migrate secondary_muscles (parent_ids = primary_muscle_ids)
    try {
      const secondaries = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM secondary_muscles');
      for (const row of secondaries) {
        const parentIds = str(row.primary_muscle_ids) || '[]';
        await db.runAsync(
          `INSERT OR REPLACE INTO muscles (id, parent_ids, label, common_names, technical_name, short_description, "function", location, triggers, upper_lower, sort_order, icon, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          str(row.id), parentIds, str(row.label), str(row.common_names), str(row.technical_name),
          str(row.short_description), str(row.function), str(row.location), str(row.triggers),
          '[]', Number(row.sort_order) || 0, str(row.icon),
          row.is_active !== 0 ? 1 : 0
        );
      }
    } catch { /* table may not exist */ }

    // Migrate tertiary_muscles (parent_ids = secondary_muscle_ids)
    try {
      const tertiaries = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM tertiary_muscles');
      for (const row of tertiaries) {
        const parentIds = str(row.secondary_muscle_ids) || '[]';
        await db.runAsync(
          `INSERT OR REPLACE INTO muscles (id, parent_ids, label, common_names, technical_name, short_description, "function", location, triggers, upper_lower, sort_order, icon, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          str(row.id), parentIds, str(row.label), str(row.common_names), str(row.technical_name),
          str(row.short_description), str(row.function), str(row.location), str(row.triggers),
          '[]', Number(row.sort_order) || 0, str(row.icon),
          row.is_active !== 0 ? 1 : 0
        );
      }
    } catch { /* table may not exist */ }

    // Drop old tables
    await db.execAsync('DROP TABLE IF EXISTS muscle_groups');
    await db.execAsync('DROP TABLE IF EXISTS primary_muscles');
    await db.execAsync('DROP TABLE IF EXISTS secondary_muscles');
    await db.execAsync('DROP TABLE IF EXISTS tertiary_muscles');
  } catch (e) {
    console.warn('migrateToV19: failed', e);
  }
}

async function migrateToV20(db: SQLite.SQLiteDatabase) {
  try {
    const str = (v: unknown) => (v == null ? '' : String(v));
    const num = (v: unknown, def: number) => (v == null ? def : Number(v));

    // Recreate motion_paths with new schema (drop muscle_targets, add delta_rules and icon)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS motion_paths_new (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        common_names TEXT,
        delta_rules TEXT DEFAULT '{}',
        short_description TEXT,
        sort_order INTEGER DEFAULT 0,
        icon TEXT,
        is_active INTEGER DEFAULT 1
      );
    `);
    try {
      await db.execAsync(`
        INSERT INTO motion_paths_new (id, label, common_names, delta_rules, short_description, sort_order, icon, is_active)
        SELECT id, label, common_names, '{}', short_description, sort_order, COALESCE(icon, ''), is_active FROM motion_paths
      `);
    } catch { /* old table may not exist */ }
    await db.execAsync('DROP TABLE IF EXISTS motion_paths');
    await db.execAsync('ALTER TABLE motion_paths_new RENAME TO motion_paths');

    // Create new motions table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS motions (
        id TEXT PRIMARY KEY,
        parent_id TEXT,
        label TEXT NOT NULL,
        upper_lower_body TEXT,
        muscle_targets TEXT DEFAULT '{}',
        motion_paths TEXT DEFAULT '{}',
        common_names TEXT,
        short_description TEXT,
        sort_order INTEGER DEFAULT 0,
        icon TEXT,
        is_active INTEGER DEFAULT 1
      );
    `);

    // Migrate primary_motions rows (parent_id = NULL)
    try {
      const primaries = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM primary_motions');
      for (const row of primaries) {
        await db.runAsync(
          `INSERT OR REPLACE INTO motions (id, parent_id, label, upper_lower_body, muscle_targets, motion_paths, common_names, short_description, sort_order, icon, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          str(row.id), null, str(row.label), '',
          str(row.muscle_targets) || '{}',
          '{}',
          str(row.common_names),
          str(row.short_description),
          num(row.sort_order, 0),
          str(row.icon),
          row.is_active !== 0 ? 1 : 0
        );
      }
    } catch { /* table may not exist */ }

    // Migrate  rows (parent_id = primary_motion_key)
    try {
      const variations = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM primary_motion_variations');
      for (const row of variations) {
        await db.runAsync(
          `INSERT OR REPLACE INTO motions (id, parent_id, label, upper_lower_body, muscle_targets, motion_paths, common_names, short_description, sort_order, icon, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          str(row.id), str(row.primary_motion_key), str(row.label), '',
          str(row.muscle_targets) || '{}',
          '{}',
          str(row.common_names),
          str(row.short_description),
          num(row.sort_order, 0),
          str(row.icon),
          row.is_active !== 0 ? 1 : 0
        );
      }
    } catch { /* table may not exist */ }

    // Drop old tables
    await db.execAsync('DROP TABLE IF EXISTS primary_motions');
    await db.execAsync('DROP TABLE IF EXISTS primary_motion_variations');

    // Re-seed from JSON so data is up-to-date with new format
    await seedMotionData(db);
  } catch (e) {
    console.warn('migrateToV20: failed', e);
  }
}

async function migrateToV21(db: SQLite.SQLiteDatabase) {
  try {
    const str = (v: unknown) => (v == null ? '' : String(v));
    const num = (v: unknown, def: number) => (v == null ? def : Number(v));
    const json = (v: unknown, fallback = '{}') => (v != null ? JSON.stringify(v) : fallback);

    // ── Merge grip_types + grip_type_variations + grip_widths → grips ──
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS grips (
        id TEXT PRIMARY KEY,
        parent_id TEXT,
        label TEXT NOT NULL,
        is_dynamic INTEGER DEFAULT 0,
        grip_category TEXT,
        rotation_path TEXT,
        common_names TEXT,
        delta_rules TEXT DEFAULT '{}',
        short_description TEXT,
        sort_order INTEGER DEFAULT 0,
        icon TEXT,
        is_active INTEGER DEFAULT 1
      );
    `);

    // Migrate grip_types (parent_id = NULL)
    try {
      const gripTypes = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM grip_types');
      for (const row of gripTypes) {
        await db.runAsync(
          `INSERT OR REPLACE INTO grips (id, parent_id, label, is_dynamic, grip_category, rotation_path, common_names, delta_rules, short_description, sort_order, icon, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          str(row.id), null, str(row.label), 0,
          str(row.grip_category), null,
          str(row.common_names), str(row.delta_rules) || '{}',
          str(row.short_description), num(row.sort_order, 0),
          str(row.icon), row.is_active !== 0 ? 1 : 0
        );
      }
    } catch { /* table may not exist */ }

    // Migrate grip_type_variations (parent_id = parent_grip_id)
    try {
      const variations = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM grip_type_variations');
      for (const row of variations) {
        await db.runAsync(
          `INSERT OR REPLACE INTO grips (id, parent_id, label, is_dynamic, grip_category, rotation_path, common_names, delta_rules, short_description, sort_order, icon, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          str(row.id), str(row.parent_grip_id), str(row.label), 1,
          'Dynamic', null,
          str(row.common_names), str(row.delta_rules) || '{}',
          str(row.short_description), num(row.sort_order, 0),
          str(row.icon), row.is_active !== 0 ? 1 : 0
        );
      }
    } catch { /* table may not exist */ }

    // Migrate grip_widths (parent_id = NULL, grip_category = 'Width')
    try {
      const widths = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM grip_widths');
      for (const row of widths) {
        await db.runAsync(
          `INSERT OR REPLACE INTO grips (id, parent_id, label, is_dynamic, grip_category, rotation_path, common_names, delta_rules, short_description, sort_order, icon, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          str(row.id), null, str(row.label), 0,
          'Width', null,
          str(row.common_names), str(row.delta_rules) || '{}',
          str(row.short_description), num(row.sort_order, 0),
          str(row.icon), row.is_active !== 0 ? 1 : 0
        );
      }
    } catch { /* table may not exist */ }

    // Drop old grip tables
    await db.execAsync('DROP TABLE IF EXISTS grip_types');
    await db.execAsync('DROP TABLE IF EXISTS grip_type_variations');
    await db.execAsync('DROP TABLE IF EXISTS grip_widths');

    // ── Merge gym_equipment + cable_attachments → equipment ──
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS equipment (
        id TEXT PRIMARY KEY,
        category_id TEXT,
        label TEXT NOT NULL,
        common_names TEXT,
        short_description TEXT,
        is_attachment INTEGER DEFAULT 0,
        requires_attachment INTEGER DEFAULT 0,
        max_instances INTEGER DEFAULT 1,
        modifier_constraints TEXT DEFAULT '{}',
        sort_order INTEGER DEFAULT 0,
        icon TEXT,
        is_active INTEGER DEFAULT 1
      );
    `);

    // Migrate gym_equipment
    try {
      const gymEquip = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM gym_equipment');
      for (const row of gymEquip) {
        await db.runAsync(
          `INSERT OR REPLACE INTO equipment (id, category_id, label, common_names, short_description, is_attachment, requires_attachment, max_instances, modifier_constraints, sort_order, icon, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          str(row.id), null, str(row.label),
          str(row.common_names), str(row.short_description),
          0, row.cable_attachments ? 1 : 0,
          Number(row.max_instances) || 1, '{}',
          num(row.sort_order, 0), str(row.icon || ''), row.is_active !== 0 ? 1 : 0
        );
      }
    } catch { /* table may not exist */ }

    // Migrate cable_attachments
    try {
      const cableAtt = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM cable_attachments');
      for (const row of cableAtt) {
        await db.runAsync(
          `INSERT OR REPLACE INTO equipment (id, category_id, label, common_names, short_description, is_attachment, requires_attachment, max_instances, modifier_constraints, sort_order, icon, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          str(row.id), 'CABLE_ATTACHMENTS', str(row.label),
          str(row.common_names), str(row.short_description),
          1, 0, 1, '{}',
          num(row.sort_order, 0), str(row.icon || ''), row.is_active !== 0 ? 1 : 0
        );
      }
    } catch { /* table may not exist */ }

    // Drop old equipment tables
    await db.execAsync('DROP TABLE IF EXISTS gym_equipment');
    await db.execAsync('DROP TABLE IF EXISTS cable_attachments');

    // Add CABLE_ATTACHMENTS category if not present
    await db.runAsync(
      `INSERT OR IGNORE INTO equipment_categories (id, parent_id, label, common_names, short_description, sort_order, icon, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      'CABLE_ATTACHMENTS', 'WEIGHTS', 'Cable Attachments',
      '["Attachments", "Cable Accessories"]',
      'Accessories that attach to cable machines.',
      7, '', 1
    );

    // Re-seed from JSON so data is up-to-date
    await seedEquipmentData(db);
    await seedGripData(db);
  } catch (e) {
    console.warn('migrateToV21: failed', e);
  }
}

async function migrateToV22(db: SQLite.SQLiteDatabase) {
  try {
    // Replace default_plane_id with upper_lower_body + motion_paths on motions table
    const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(motions)');
    const colNames = cols.map(c => c.name);

    if (!colNames.includes('upper_lower_body')) {
      await db.execAsync(`ALTER TABLE motions ADD COLUMN upper_lower_body TEXT DEFAULT ''`);
    }
    if (!colNames.includes('motion_paths')) {
      await db.execAsync(`ALTER TABLE motions ADD COLUMN motion_paths TEXT DEFAULT '{}'`);
    }

    // Create range_of_motion table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS range_of_motion (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        common_names TEXT,
        icon TEXT,
        short_description TEXT,
        delta_rules TEXT DEFAULT '{}',
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1
      );
    `);

    // Re-seed motions from the updated JSON to populate new columns
    await seedMotionData(db);
  } catch (e) {
    console.warn('migrateToV22: failed', e);
  }
}

async function migrateToV23(db: SQLite.SQLiteDatabase) {
  try {
    // Add icon column to tables that don't have it (between sort_order and is_active)
    const addIconColumn = async (tableName: string) => {
      const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName})`);
      const colNames = cols.map(c => c.name);
      if (!colNames.includes('icon')) {
        await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN icon TEXT DEFAULT ''`);
      }
    };

    await addIconColumn('motion_paths');
    await addIconColumn('equipment_categories');
    await addIconColumn('equipment');
  } catch (e) {
    console.warn('migrateToV23: failed', e);
  }
}

async function migrateToV24(db: SQLite.SQLiteDatabase) {
  try {
    const str = (v: unknown) => (v == null ? '' : String(v));
    const num = (v: unknown, def: number) => (v == null ? def : Number(v));
    const json = (v: unknown, fallback = '{}') => (v != null ? JSON.stringify(v) : fallback);

    // Re-add grip_widths table (was merged into grips in V21, now separate again)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS grip_widths (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        common_names TEXT,
        icon TEXT,
        short_description TEXT,
        delta_rules TEXT DEFAULT '{}',
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1
      );
    `);

    // Seed grip_widths from JSON
    const gripWidths = require('./tables/gripWidths.json') as Record<string, unknown>[];
    await db.execAsync('DELETE FROM grip_widths');
    for (const row of gripWidths) {
      await db.runAsync(
        `INSERT OR REPLACE INTO grip_widths (id, label, common_names, icon, short_description, delta_rules, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        str(row.id),
        str(row.label),
        Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
        str(row.icon),
        str(row.short_description),
        json(row.delta_rules),
        num(row.sort_order, 0),
        row.is_active !== false ? 1 : 0
      );
    }
  } catch (e) {
    console.warn('migrateToV24: failed', e);
  }
}

async function seedData(db: SQLite.SQLiteDatabase) {
  const exerciseCategories = require('./tables/exerciseCategories.json') as Record<string, unknown>[];
  const cardioTypes = require('./tables/cardioTypes.json') as Record<string, unknown>[];
  const muscles = require('./tables/muscles.json') as Record<string, unknown>[];
  const trainingFocus = require('./tables/trainingFocus.json') as Record<string, unknown>[];

  const str = (v: unknown) => (v == null ? '' : String(v));
  const num = (v: unknown, def: number) => (v == null ? def : Number(v));
  for (const row of exerciseCategories) {
    await db.runAsync(
      `INSERT INTO exercise_categories (id, label, technical_name, common_names, icon, short_description, exercise_input_permissions, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      str(row.id),
      str(row.label),
      str(row.technical_name),
      Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
      str(row.icon),
      str(row.short_description),
      row.exercise_input_permissions ? JSON.stringify(row.exercise_input_permissions) : '',
      num(row.sort_order, 0),
      row.is_active !== false ? 1 : 0
    );
  }

  for (const row of cardioTypes) {
    await db.runAsync(
      `INSERT INTO cardio_types (id, label, technical_name, common_names, icon, short_description, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      str(row.id),
      str(row.label),
      str(row.technical_name),
      Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
      str(row.icon),
      str(row.short_description),
      num(row.sort_order, 0),
      row.is_active !== false ? 1 : 0
    );
  }

  for (const row of muscles) {
    await db.runAsync(
      `INSERT INTO muscles (id, parent_ids, label, common_names, technical_name, short_description, "function", location, triggers, upper_lower, sort_order, icon, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      str(row.id),
      Array.isArray(row.parent_ids) ? JSON.stringify(row.parent_ids) : '[]',
      str(row.label),
      Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
      str(row.technical_name),
      str(row.short_description),
      str(row.function),
      str(row.location),
      str(row.triggers),
      Array.isArray(row.upper_lower) ? JSON.stringify(row.upper_lower) : '[]',
      num(row.sort_order, 0),
      str(row.icon),
      row.is_active !== false ? 1 : 0
    );
  }

  for (const row of trainingFocus) {
    await db.runAsync(
      `INSERT INTO training_focus (id, label, technical_name, common_names, icon, short_description, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      str(row.id),
      str(row.label),
      str(row.technical_name),
      Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
      str(row.icon),
      str(row.short_description),
      num(row.sort_order, 0),
      row.is_active !== false ? 1 : 0
    );
  }
}

/** Re-seed muscle data from JSON on every app load so muscle pickers stay in sync. */
async function seedMuscleData(db: SQLite.SQLiteDatabase) {
  try {
    const str = (v: unknown) => (v == null ? '' : String(v));
    const num = (v: unknown, def: number) => (v == null ? def : Number(v));
    const muscles = require('./tables/muscles.json') as Record<string, unknown>[];

    await db.execAsync('DELETE FROM muscles');

    for (const row of muscles) {
      await db.runAsync(
        `INSERT OR REPLACE INTO muscles (id, parent_ids, label, common_names, technical_name, short_description, "function", location, triggers, upper_lower, sort_order, icon, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        str(row.id),
        Array.isArray(row.parent_ids) ? JSON.stringify(row.parent_ids) : '[]',
        str(row.label),
        Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
        str(row.technical_name),
        str(row.short_description),
        str(row.function),
        str(row.location),
        str(row.triggers),
        Array.isArray(row.upper_lower) ? JSON.stringify(row.upper_lower) : '[]',
        num(row.sort_order, 0),
        str(row.icon),
        row.is_active !== false ? 1 : 0
      );
    }
  } catch (error) {
    console.error('Failed to seed muscle data:', error);
    throw error;
  }
}

async function seedEquipmentData(db: SQLite.SQLiteDatabase) {
  const str = (v: unknown) => (v == null ? '' : String(v));
  const num = (v: unknown, def: number) => (v == null ? def : Number(v));
  const json = (v: unknown, fallback = '{}') => (v != null ? JSON.stringify(v) : fallback);
  const equipmentCategories = require('./tables/equipmentCategories.json') as Record<string, unknown>[];
  const equipmentItems = require('./tables/equipment.json') as Record<string, unknown>[];

  await db.execAsync('DELETE FROM equipment_categories');
  for (const row of equipmentCategories) {
    await db.runAsync(
      `INSERT OR REPLACE INTO equipment_categories (id, parent_id, label, common_names, short_description, sort_order, icon, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      str(row.id),
      row.parent_id ? str(row.parent_id) : null,
      str(row.label),
      Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
      str(row.short_description),
      num(row.sort_order, 0),
      str(row.icon),
      row.is_active !== false ? 1 : 0
    );
  }

  await db.execAsync('DELETE FROM equipment');
  for (const row of equipmentItems) {
    await db.runAsync(
      `INSERT OR REPLACE INTO equipment (id, category_id, label, common_names, short_description, is_attachment, requires_attachment, max_instances, modifier_constraints, sort_order, icon, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      str(row.id),
      row.category_id ? str(row.category_id) : null,
      str(row.label),
      Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
      str(row.short_description),
      row.is_attachment ? 1 : 0,
      row.requires_attachment ? 1 : 0,
      Number(row.max_instances) || 1,
      json(row.modifier_constraints),
      num(row.sort_order, 0),
      str(row.icon),
      row.is_active !== false ? 1 : 0
    );
  }
}

async function seedMotionData(db: SQLite.SQLiteDatabase) {
  const str = (v: unknown) => (v == null ? '' : String(v));
  const num = (v: unknown, def: number) => (v == null ? def : Number(v));
  const json = (v: unknown, fallback = '{}') => (v != null ? JSON.stringify(v) : fallback);
  const motionPaths = require('./tables/motionPaths.json') as Record<string, unknown>[];
  const motions = require('./tables/motions.json') as Record<string, unknown>[];

  await db.execAsync('DELETE FROM motion_paths');
  for (const row of motionPaths) {
    await db.runAsync(
      `INSERT OR REPLACE INTO motion_paths (id, label, common_names, delta_rules, short_description, sort_order, icon, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      str(row.id),
      str(row.label),
      Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
      json(row.delta_rules),
      str(row.short_description),
      num(row.sort_order, 0),
      str(row.icon),
      row.is_active !== false ? 1 : 0
    );
  }

  await db.execAsync('DELETE FROM motions');
  for (const row of motions) {
    await db.runAsync(
      `INSERT OR REPLACE INTO motions (id, parent_id, label, upper_lower_body, muscle_targets, motion_paths, common_names, short_description, sort_order, icon, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      str(row.id),
      row.parent_id ? str(row.parent_id) : null,
      str(row.label),
      str(row.upper_lower_body),
      json(row.muscle_targets),
      json(row.default_delta_configs ?? row.motion_paths),
      Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
      str(row.short_description),
      num(row.sort_order, 0),
      str(row.icon),
      row.is_active !== false ? 1 : 0
    );
  }
}

/** Re-seed grip/stance/delta data from JSON on every app load so pickers stay in sync. */
async function seedGripData(db: SQLite.SQLiteDatabase) {
  try {
    const str = (v: unknown) => (v == null ? '' : String(v));
    const num = (v: unknown, def: number) => (v == null ? def : Number(v));
    const json = (v: unknown, fallback = '{}') => (v != null ? JSON.stringify(v) : fallback);
    const grips = require('./tables/grips.json') as Record<string, unknown>[];
    const gripWidths = require('./tables/gripWidths.json') as Record<string, unknown>[];
    const footPositions = require('./tables/footPositions.json') as Record<string, unknown>[];
    const stanceTypes = require('./tables/stanceTypes.json') as Record<string, unknown>[];
    const stanceWidths = require('./tables/stanceWidths.json') as Record<string, unknown>[];
    const torsoAngles = require('./tables/torsoAngles.json') as Record<string, unknown>[];
    const torsoOrientations = require('./tables/torsoOrientations.json') as Record<string, unknown>[];
    const supportStructures = require('./tables/supportStructures.json') as Record<string, unknown>[];
    const elbowRelationship = require('./tables/elbowRelationship.json') as Record<string, unknown>[];
    const loadingAids = require('./tables/loadingAids.json') as Record<string, unknown>[];
    const rangeOfMotion = require('./tables/rangeOfMotion.json') as Record<string, unknown>[];

    await db.execAsync('DELETE FROM grips');
    await db.execAsync('DELETE FROM grip_widths');
    await db.execAsync('DELETE FROM foot_positions');
    await db.execAsync('DELETE FROM stance_types');
    await db.execAsync('DELETE FROM stance_widths');
    await db.execAsync('DELETE FROM torso_orientations');
    await db.execAsync('DELETE FROM torso_angles');
    await db.execAsync('DELETE FROM support_structures');
    await db.execAsync('DELETE FROM elbow_relationship');
    await db.execAsync('DELETE FROM loading_aids');
    await db.execAsync('DELETE FROM range_of_motion');

    for (const row of grips) {
      await db.runAsync(
        `INSERT OR REPLACE INTO grips (id, parent_id, label, is_dynamic, grip_category, rotation_path, common_names, delta_rules, short_description, sort_order, icon, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        str(row.id),
        row.parent_id ? str(row.parent_id) : null,
        str(row.label),
        row.is_dynamic ? 1 : 0,
        str(row.grip_category),
        row.rotation_path ? json(row.rotation_path) : null,
        Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
        json(row.delta_rules),
        str(row.short_description),
        num(row.sort_order, 0),
        str(row.icon),
        row.is_active !== false ? 1 : 0
      );
    }

    const seedDeltaTable = async (tableName: string, rows: Record<string, unknown>[]) => {
      for (const row of rows) {
        await db.runAsync(
          `INSERT OR REPLACE INTO ${tableName} (id, label, common_names, icon, short_description, delta_rules, sort_order, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          str(row.id),
          str(row.label),
          Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
          str(row.icon),
          str(row.short_description),
          json(row.delta_rules),
          num(row.sort_order, 0),
          row.is_active !== false ? 1 : 0
        );
      }
    };

    await seedDeltaTable('grip_widths', gripWidths);
    await seedDeltaTable('foot_positions', footPositions);
    await seedDeltaTable('stance_types', stanceTypes);
    await seedDeltaTable('stance_widths', stanceWidths);
    for (const row of torsoAngles) {
      await db.runAsync(
        `INSERT OR REPLACE INTO torso_angles (id, label, common_names, icon, short_description, delta_rules, angle_range, allow_torso_orientations, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        str(row.id),
        str(row.label),
        Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
        str(row.icon),
        str(row.short_description),
        json(row.delta_rules),
        json(row.angle_range),
        row.allow_torso_orientations ? 1 : 0,
        num(row.sort_order, 0),
        row.is_active !== false ? 1 : 0
      );
    }

    await seedDeltaTable('torso_orientations', torsoOrientations);
    await seedDeltaTable('support_structures', supportStructures);
    await seedDeltaTable('elbow_relationship', elbowRelationship);
    await seedDeltaTable('loading_aids', loadingAids);
    await seedDeltaTable('range_of_motion', rangeOfMotion);
  } catch (error) {
    console.error('Failed to seed grip/delta data:', error);
    throw error;
  }
}
