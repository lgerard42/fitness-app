/**
 * Database initialization for exercise configuration tables
 * Creates all tables and seeds initial data
 */
import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'workout.db';
const DATABASE_VERSION = 1;

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
    await seedData(db);
    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  }
  
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
      cardio_types_allowed TEXT,
      muscle_groups_allowed TEXT,
      training_focus_allowed TEXT
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
      short_description TEXT
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
      short_description TEXT
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
      short_description TEXT
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
      primary_muscle_ids TEXT
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
      secondary_muscle_ids TEXT
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
      short_description TEXT
    );
  `);
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
  for (const row of exerciseCategories) {
    await db.runAsync(
      `INSERT INTO exercise_categories (id, label, technical_name, common_names, icon, short_description, cardio_types_allowed, muscle_groups_allowed, training_focus_allowed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      str(row.id),
      str(row.label),
      str(row.technical_name),
      Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
      str(row.icon),
      str(row.short_description),
      row.cardio_types_allowed ? JSON.stringify(row.cardio_types_allowed) : '',
      row.muscle_groups_allowed ? JSON.stringify(row.muscle_groups_allowed) : '',
      row.training_focus_allowed ? JSON.stringify(row.training_focus_allowed) : ''
    );
  }

  for (const row of cardioTypes) {
    await db.runAsync(
      `INSERT INTO cardio_types (id, label, technical_name, common_names, icon, short_description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      str(row.id),
      str(row.label),
      str(row.technical_name),
      Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
      str(row.icon),
      str(row.short_description)
    );
  }

  for (const row of muscleGroups) {
    await db.runAsync(
      `INSERT INTO muscle_groups (id, label, values_table, common_names, icon, short_description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      str(row.id),
      str(row.label),
      str(row.values_table),
      Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
      str(row.icon),
      str(row.short_description)
    );
  }

  for (const row of primaryMuscles) {
    await db.runAsync(
      `INSERT INTO primary_muscles (id, label, technical_name, common_names, icon, short_description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      str(row.id),
      str(row.label),
      str(row.technical_name),
      Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
      str(row.icon),
      str(row.short_description)
    );
  }

  for (const row of secondaryMuscles) {
    await db.runAsync(
      `INSERT INTO secondary_muscles (id, label, technical_name, common_names, icon, short_description, primary_muscle_ids)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      str(row.id),
      str(row.label),
      str(row.technical_name),
      Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
      str(row.icon),
      str(row.short_description),
      Array.isArray(row.primary_muscle_ids) ? JSON.stringify(row.primary_muscle_ids) : '[]'
    );
  }

  for (const row of tertiaryMuscles) {
    await db.runAsync(
      `INSERT INTO tertiary_muscles (id, label, technical_name, common_names, icon, short_description, secondary_muscle_ids)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      str(row.id),
      str(row.label),
      str(row.technical_name),
      Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
      str(row.icon),
      str(row.short_description),
      Array.isArray(row.secondary_muscle_ids) ? JSON.stringify(row.secondary_muscle_ids) : '[]'
    );
  }

  for (const row of trainingFocus) {
    await db.runAsync(
      `INSERT INTO training_focus (id, label, technical_name, common_names, icon, short_description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      str(row.id),
      str(row.label),
      str(row.technical_name),
      Array.isArray(row.common_names) ? JSON.stringify(row.common_names) : str(row.common_names),
      str(row.icon),
      str(row.short_description)
    );
  }
}
