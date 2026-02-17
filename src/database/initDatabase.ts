/**
 * Database initialization for exercise configuration tables
 * Creates all tables and seeds initial data
 */
import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'workout.db';
const DATABASE_VERSION = 9;

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
      await reseedSecondaryMuscles(db);
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
    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  }

  // Ensure upper_lower column exists (in case migration didn't run or failed)
  // This is a safety check before seedMuscleData runs
  try {
    const tableInfo = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(primary_muscles)"
    );
    const hasColumn = tableInfo.some(col => col.name === 'upper_lower');
    if (!hasColumn) {
      await db.execAsync(`ALTER TABLE primary_muscles ADD COLUMN upper_lower TEXT`);
    }
  } catch (error) {
    console.warn('Safety check for upper_lower column failed:', error);
  }

  // Re-seed equipment data from JSON on every app load (same idea as motion options
  // being loaded fresh in ExerciseEditor) so gym equipment picker stays in sync.
  await seedEquipmentData(db);

  // Re-seed muscle data (muscle_groups, primary/secondary/tertiary muscles) on every
  // app load so muscle pickers stay in sync with JSON tables.
  await seedMuscleData(db);

  // Re-seed grip data (grip_types, grip_widths) on every app load so grip pickers stay in sync.
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

  // MUSCLE_GROUPS table (metadata table)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS muscle_groups (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      values_table TEXT NOT NULL,
      common_names TEXT,
      icon TEXT,
      short_description TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );
  `);

  // PRIMARY_MUSCLES table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS primary_muscles (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      technical_name TEXT,
      common_names TEXT,
      icon TEXT,
      short_description TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      upper_lower TEXT,
      secondary_muscle_ids TEXT,
      tertiary_muscle_ids TEXT
    );
  `);

  // SECONDARY_MUSCLES table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS secondary_muscles (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      technical_name TEXT,
      common_names TEXT,
      icon TEXT,
      short_description TEXT,
      primary_muscle_ids TEXT,
      tertiary_muscle_ids TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );
  `);

  // TERTIARY_MUSCLES table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS tertiary_muscles (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      technical_name TEXT,
      common_names TEXT,
      icon TEXT,
      short_description TEXT,
      secondary_muscle_ids TEXT,
      primary_muscle_ids TEXT,
      sort_order INTEGER DEFAULT 0,
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

  // EQUIPMENT_CATEGORIES table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS equipment_categories (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      sub_label TEXT,
      common_names TEXT,
      icon TEXT,
      short_description TEXT,
      sub_categories_table TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );
  `);

  // SUPPORT_EQUIPMENT_CATEGORIES table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS support_equipment_categories (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      sub_label TEXT,
      common_names TEXT,
      icon TEXT,
      short_description TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );
  `);

  // WEIGHTS_EQUIPMENT_CATEGORIES table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS weights_equipment_categories (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      sub_label TEXT,
      common_names TEXT,
      icon TEXT,
      short_description TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );
  `);

  // CABLE_ATTACHMENTS table (exercise equipment)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS cable_attachments (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      sub_label TEXT,
      common_names TEXT,
      icon TEXT,
      short_description TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );
  `);

  // MOTION_PLANES table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS motion_planes (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      sub_label TEXT,
      common_names TEXT,
      short_description TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );
  `);

  // PRIMARY_MOTIONS table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS primary_motions (
      id TEXT PRIMARY KEY,
      upper_lower_body TEXT NOT NULL,
      label TEXT NOT NULL,
      sub_label TEXT,
      common_names TEXT,
      short_description TEXT,
      muscle_targets TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );
  `);

  // PRIMARY_MOTION_VARIATIONS table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS primary_motion_variations (
      id TEXT PRIMARY KEY,
      primary_motion_key TEXT NOT NULL,
      label TEXT NOT NULL,
      common_names TEXT,
      short_description TEXT,
      muscle_targets TEXT,
      motion_planes TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );
  `);

  // GYM_EQUIPMENT table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS gym_equipment (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      sub_label TEXT,
      common_names TEXT,
      icon TEXT,
      short_description TEXT,
      equipment_categories TEXT,
      max_instances INTEGER DEFAULT 1,
      cable_attachments INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );
  `);

  // GRIP_TYPES table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS grip_types (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      sub_label TEXT,
      common_names TEXT,
      icon TEXT,
      short_description TEXT,
      variations TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );
  `);

  // GRIP_WIDTHS table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS grip_widths (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      sub_label TEXT,
      common_names TEXT,
      icon TEXT,
      short_description TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );
  `);

  // ROTATING_GRIP_VARIATIONS table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS rotating_grip_variations (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      sub_label TEXT,
      common_names TEXT,
      icon TEXT,
      short_description TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );
  `);
}

async function migrateToV4(db: SQLite.SQLiteDatabase) {
  const tables = [
    'exercise_categories', 'cardio_types', 'muscle_groups', 'primary_muscles',
    'secondary_muscles', 'tertiary_muscles', 'training_focus',
    'equipment_categories', 'support_equipment_categories', 'weights_equipment_categories',
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
  const secondaryMuscles = require('./tables/secondaryMuscles.json') as Record<string, unknown>[];
  const tertiaryMuscles = require('./tables/tertiaryMuscles.json') as Record<string, unknown>[];

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

async function seedData(db: SQLite.SQLiteDatabase) {
  const exerciseCategories = require('./tables/exerciseCategories.json') as Record<string, unknown>[];
  const cardioTypes = require('./tables/cardioTypes.json') as Record<string, unknown>[];
  const muscleGroups = require('./tables/muscleGroups.json') as Record<string, unknown>[];
  const primaryMuscles = require('./tables/primaryMuscles.json') as Record<string, unknown>[];
  const secondaryMuscles = require('./tables/secondaryMuscles.json') as Record<string, unknown>[];
  const tertiaryMuscles = require('./tables/tertiaryMuscles.json') as Record<string, unknown>[];
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

  for (const row of muscleGroups) {
    await db.runAsync(
      `INSERT INTO muscle_groups (id, label, values_table, common_names, icon, short_description, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      str(row.id),
      str(row.label),
      str(row.values_table),
      Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
      str(row.icon),
      str(row.short_description),
      num(row.sort_order, 0),
      row.is_active !== false ? 1 : 0
    );
  }

  for (const row of primaryMuscles) {
    await db.runAsync(
      `INSERT INTO primary_muscles (id, label, technical_name, common_names, icon, short_description, sort_order, is_active, upper_lower, secondary_muscle_ids, tertiary_muscle_ids)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      str(row.id),
      str(row.label),
      str(row.technical_name),
      Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
      str(row.icon),
      str(row.short_description),
      num(row.sort_order, 0),
      row.is_active !== false ? 1 : 0,
      Array.isArray(row.upper_lower) ? JSON.stringify(row.upper_lower) : (row.upper_lower != null ? str(row.upper_lower) : '[]'),
      Array.isArray(row.secondary_muscle_ids) ? JSON.stringify(row.secondary_muscle_ids) : '[]',
      Array.isArray(row.tertiary_muscle_ids) ? JSON.stringify(row.tertiary_muscle_ids) : '[]'
    );
  }

  for (const row of secondaryMuscles) {
    await db.runAsync(
      `INSERT INTO secondary_muscles (id, label, technical_name, common_names, icon, short_description, primary_muscle_ids, tertiary_muscle_ids, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      str(row.id),
      str(row.label),
      str(row.technical_name),
      Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
      str(row.icon),
      str(row.short_description),
      Array.isArray(row.primary_muscle_ids) ? JSON.stringify(row.primary_muscle_ids) : '[]',
      Array.isArray(row.tertiary_muscle_ids) ? JSON.stringify(row.tertiary_muscle_ids) : '[]',
      num(row.sort_order, 0),
      row.is_active !== false ? 1 : 0
    );
  }

  for (const row of tertiaryMuscles) {
    await db.runAsync(
      `INSERT INTO tertiary_muscles (id, label, technical_name, common_names, icon, short_description, secondary_muscle_ids, primary_muscle_ids, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      str(row.id),
      str(row.label),
      str(row.technical_name),
      Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
      str(row.icon),
      str(row.short_description),
      Array.isArray(row.secondary_muscle_ids) ? JSON.stringify(row.secondary_muscle_ids) : '[]',
      Array.isArray(row.primary_muscle_ids) ? JSON.stringify(row.primary_muscle_ids) : '[]',
      num(row.sort_order, 0),
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
    const muscleGroups = require('./tables/muscleGroups.json') as Record<string, unknown>[];
    const primaryMuscles = require('./tables/primaryMuscles.json') as Record<string, unknown>[];
    const secondaryMuscles = require('./tables/secondaryMuscles.json') as Record<string, unknown>[];
    const tertiaryMuscles = require('./tables/tertiaryMuscles.json') as Record<string, unknown>[];

    // Check if upper_lower column exists in primary_muscles table
    const tableInfo = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(primary_muscles)"
    );
    const hasUpperLowerColumn = tableInfo.some(col => col.name === 'upper_lower');

    // Clear tables so rows removed from JSON (e.g. Olympic) are removed from DB; then re-insert from JSON.
    await db.execAsync('DELETE FROM tertiary_muscles');
    await db.execAsync('DELETE FROM secondary_muscles');
    await db.execAsync('DELETE FROM primary_muscles');
    await db.execAsync('DELETE FROM muscle_groups');

  for (const row of muscleGroups) {
    await db.runAsync(
      `INSERT OR REPLACE INTO muscle_groups (id, label, values_table, common_names, icon, short_description, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      str(row.id),
      str(row.label),
      str(row.values_table),
      Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
      str(row.icon),
      str(row.short_description),
      num(row.sort_order, 0),
      row.is_active !== false ? 1 : 0
    );
  }

  for (const row of primaryMuscles) {
    if (hasUpperLowerColumn) {
      await db.runAsync(
        `INSERT OR REPLACE INTO primary_muscles (id, label, technical_name, common_names, icon, short_description, sort_order, is_active, upper_lower, secondary_muscle_ids, tertiary_muscle_ids)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        str(row.id),
        str(row.label),
        str(row.technical_name),
        Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
        str(row.icon),
        str(row.short_description),
        num(row.sort_order, 0),
        row.is_active !== false ? 1 : 0,
        Array.isArray(row.upper_lower) ? JSON.stringify(row.upper_lower) : (row.upper_lower != null ? str(row.upper_lower) : '[]'),
        Array.isArray(row.secondary_muscle_ids) ? JSON.stringify(row.secondary_muscle_ids) : '[]',
        Array.isArray(row.tertiary_muscle_ids) ? JSON.stringify(row.tertiary_muscle_ids) : '[]'
      );
    } else {
      await db.runAsync(
        `INSERT OR REPLACE INTO primary_muscles (id, label, technical_name, common_names, icon, short_description, sort_order, is_active)
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

  for (const row of secondaryMuscles) {
    await db.runAsync(
      `INSERT OR REPLACE INTO secondary_muscles (id, label, technical_name, common_names, icon, short_description, primary_muscle_ids, tertiary_muscle_ids, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      str(row.id),
      str(row.label),
      str(row.technical_name),
      Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
      str(row.icon),
      str(row.short_description),
      Array.isArray(row.primary_muscle_ids) ? JSON.stringify(row.primary_muscle_ids) : '[]',
      Array.isArray(row.tertiary_muscle_ids) ? JSON.stringify(row.tertiary_muscle_ids) : '[]',
      num(row.sort_order, 0),
      row.is_active !== false ? 1 : 0
    );
  }

  for (const row of tertiaryMuscles) {
    await db.runAsync(
      `INSERT OR REPLACE INTO tertiary_muscles (id, label, technical_name, common_names, icon, short_description, secondary_muscle_ids, primary_muscle_ids, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      str(row.id),
      str(row.label),
      str(row.technical_name),
      Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
      str(row.icon),
      str(row.short_description),
      Array.isArray(row.secondary_muscle_ids) ? JSON.stringify(row.secondary_muscle_ids) : '[]',
      Array.isArray(row.primary_muscle_ids) ? JSON.stringify(row.primary_muscle_ids) : '[]',
      num(row.sort_order, 0),
      row.is_active !== false ? 1 : 0
    );
  }
  } catch (error) {
    console.error('Failed to seed muscle data:', error);
    throw error; // Re-throw to prevent silent failures
  }
}

/** Re-seed secondary_muscles from JSON (e.g. to remove deprecated rows like "Grip") */
async function reseedSecondaryMuscles(db: SQLite.SQLiteDatabase) {
  await db.execAsync('DELETE FROM secondary_muscles');
  const str = (v: unknown) => (v == null ? '' : String(v));
  const num = (v: unknown, def: number) => (v == null ? def : Number(v));
  const secondaryMuscles = require('./tables/secondaryMuscles.json') as Record<string, unknown>[];
  for (const row of secondaryMuscles) {
    await db.runAsync(
      `INSERT INTO secondary_muscles (id, label, technical_name, common_names, icon, short_description, primary_muscle_ids, tertiary_muscle_ids, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      str(row.id),
      str(row.label),
      str(row.technical_name),
      Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
      str(row.icon),
      str(row.short_description),
      Array.isArray(row.primary_muscle_ids) ? JSON.stringify(row.primary_muscle_ids) : '[]',
      Array.isArray(row.tertiary_muscle_ids) ? JSON.stringify(row.tertiary_muscle_ids) : '[]',
      num(row.sort_order, 0),
      row.is_active !== false ? 1 : 0
    );
  }
}

async function seedEquipmentData(db: SQLite.SQLiteDatabase) {
  const str = (v: unknown) => (v == null ? '' : String(v));
  const num = (v: unknown, def: number) => (v == null ? def : Number(v));
  const equipmentCategories = require('./tables/equipmentCategories.json') as Record<string, unknown>[];
  const supportCategories = require('./tables/supportEquipmentCategories.json') as Record<string, unknown>[];
  const weightsCategories = require('./tables/weightsEquipmentCategories.json') as Record<string, unknown>[];
  const cableAttachments = require('./tables/cableAttachments.json') as Record<string, unknown>[];
  const gymEquipment = require('./tables/gymEquipment.json') as Record<string, unknown>[];
  const equipmentIcons = require('./tables/equipmentIcons.json') as Record<string, string>;

  for (const row of equipmentCategories) {
    await db.runAsync(
      `INSERT OR REPLACE INTO equipment_categories (id, label, sub_label, common_names, icon, short_description, sub_categories_table, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      str(row.id),
      str(row.label),
      str(row.sub_label),
      Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
      str(row.icon),
      str(row.short_description),
      str(row.sub_categories_table),
      num(row.sort_order, 0),
      row.is_active !== false ? 1 : 0
    );
  }

  for (const row of supportCategories) {
    await db.runAsync(
      `INSERT OR REPLACE INTO support_equipment_categories (id, label, sub_label, common_names, icon, short_description, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      str(row.id),
      str(row.label),
      str(row.sub_label),
      Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
      str(row.icon),
      str(row.short_description),
      num(row.sort_order, 0),
      row.is_active !== false ? 1 : 0
    );
  }

  for (const row of weightsCategories) {
    await db.runAsync(
      `INSERT OR REPLACE INTO weights_equipment_categories (id, label, sub_label, common_names, icon, short_description, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      str(row.id),
      str(row.label),
      str(row.sub_label),
      Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
      str(row.icon),
      str(row.short_description),
      num(row.sort_order, 0),
      row.is_active !== false ? 1 : 0
    );
  }

  for (const row of cableAttachments) {
    await db.runAsync(
      `INSERT OR REPLACE INTO cable_attachments (id, label, sub_label, common_names, icon, short_description, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      str(row.id),
      str(row.label),
      str(row.sub_label),
      Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
      str(row.icon),
      str(row.short_description),
      num(row.sort_order, 0),
      row.is_active !== false ? 1 : 0
    );
  }

  for (const row of gymEquipment) {
    const eqCats = row.equipment_categories;
    const cableAtt = row.cable_attachments === true || row.cable_attachments === 1;
    // Icon only from equipmentIcons.json (id -> base64). gymEquipment.json "icon" is legacy filename; display uses table only.
    const iconBase64 = equipmentIcons[str(row.id)] ?? '';
    await db.runAsync(
      `INSERT OR REPLACE INTO gym_equipment (id, label, sub_label, common_names, icon, short_description, equipment_categories, max_instances, cable_attachments, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      str(row.id),
      str(row.label),
      str(row.sub_label),
      Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
      iconBase64,
      str(row.short_description),
      Array.isArray(eqCats) ? JSON.stringify(eqCats) : (typeof eqCats === 'object' && eqCats !== null ? JSON.stringify(eqCats) : '[]'),
      Number(row.max_instances) || 1,
      cableAtt ? 1 : 0,
      num(row.sort_order, 0),
      row.is_active !== false ? 1 : 0
    );
  }
}

async function seedMotionData(db: SQLite.SQLiteDatabase) {
  const str = (v: unknown) => (v == null ? '' : String(v));
  const num = (v: unknown, def: number) => (v == null ? def : Number(v));
  const motionPlanes = require('./tables/motionPlanes.json') as Record<string, unknown>[];
  const primaryMotions = require('./tables/primaryMotions.json') as Record<string, unknown>[];
  const primaryMotionVariations = require('./tables/primaryMotionVariations.json') as Record<string, unknown>[];

  for (const row of motionPlanes) {
    await db.runAsync(
      `INSERT OR REPLACE INTO motion_planes (id, label, sub_label, common_names, short_description, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      str(row.id),
      str(row.label),
      str(row.sub_label),
      Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
      str(row.short_description),
      num(row.sort_order, 0),
      row.is_active !== false ? 1 : 0
    );
  }

  for (const row of primaryMotions) {
    const upperLowerBody = str(row.upperLowerBody ?? row.upper_lower_body);
    await db.runAsync(
      `INSERT OR REPLACE INTO primary_motions (id, upper_lower_body, label, sub_label, common_names, short_description, muscle_targets, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      str(row.id),
      upperLowerBody,
      str(row.label),
      str(row.sub_label),
      Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
      str(row.short_description),
      row.muscle_targets ? JSON.stringify(row.muscle_targets) : '{}',
      num(row.sort_order, 0),
      row.is_active !== false ? 1 : 0
    );
  }

  for (const row of primaryMotionVariations) {
    const motionPlanesVal = row.motion_planes;
    const motionPlanesStr = Array.isArray(motionPlanesVal) ? JSON.stringify(motionPlanesVal) : '[]';
    await db.runAsync(
      `INSERT OR REPLACE INTO primary_motion_variations (id, primary_motion_key, label, common_names, short_description, muscle_targets, motion_planes, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      str(row.id),
      str(row.primary_motion_key),
      str(row.label),
      Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
      str(row.short_description),
      row.muscle_targets ? JSON.stringify(row.muscle_targets) : '{}',
      motionPlanesStr,
      num(row.sort_order, 0),
      row.is_active !== false ? 1 : 0
    );
  }
}

/** Re-seed grip data from JSON on every app load so grip pickers stay in sync. */
async function seedGripData(db: SQLite.SQLiteDatabase) {
  try {
    const str = (v: unknown) => (v == null ? '' : String(v));
    const num = (v: unknown, def: number) => (v == null ? def : Number(v));
    const gripTypes = require('./tables/gripTypes.json') as Record<string, unknown>[];
    const gripWidths = require('./tables/gripWidths.json') as Record<string, unknown>[];
    const rotatingGripVariations = require('./tables/rotatingGripVariations.json') as Record<string, unknown>[];

    // Clear tables so rows removed from JSON are removed from DB; then re-insert from JSON.
    await db.execAsync('DELETE FROM rotating_grip_variations');
    await db.execAsync('DELETE FROM grip_widths');
    await db.execAsync('DELETE FROM grip_types');

    for (const row of gripTypes) {
      await db.runAsync(
        `INSERT OR REPLACE INTO grip_types (id, label, sub_label, common_names, icon, short_description, variations, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        str(row.id),
        str(row.label),
        str(row.subLabel ?? row.sub_label),
        Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
        str(row.icon),
        str(row.short_description),
        str(row.variations),
        num(row.sort_order, 0),
        row.is_active !== false ? 1 : 0
      );
    }

    for (const row of gripWidths) {
      await db.runAsync(
        `INSERT OR REPLACE INTO grip_widths (id, label, sub_label, common_names, icon, short_description, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        str(row.id),
        str(row.label),
        str(row.subLabel ?? row.sub_label),
        Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
        str(row.icon),
        str(row.short_description),
        num(row.sort_order, 0),
        row.is_active !== false ? 1 : 0
      );
    }

    for (const row of rotatingGripVariations) {
      await db.runAsync(
        `INSERT OR REPLACE INTO rotating_grip_variations (id, label, sub_label, common_names, icon, short_description, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        str(row.id),
        str(row.label),
        str(row.subLabel ?? row.sub_label),
        Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
        str(row.icon),
        str(row.short_description),
        num(row.sort_order, 0),
        row.is_active !== false ? 1 : 0
      );
    }
  } catch (error) {
    console.error('Failed to seed grip data:', error);
    throw error; // Re-throw to prevent silent failures
  }
}
