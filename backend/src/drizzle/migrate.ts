/**
 * Runs Drizzle schema push + custom SQL migrations (triggers, indexes).
 * Usage: npx tsx src/drizzle/migrate.ts
 */
import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import pg from "pg";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function migrate() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const client = await pool.connect();
  console.log("Connected to PostgreSQL");

  try {
    const migrationsDir = path.resolve(__dirname, "migrations");
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
      console.log(`Running migration: ${file}`);
      await client.query(sql);
      console.log(`  ✓ ${file}`);
    }

    console.log("\nAll custom migrations applied successfully.");
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
