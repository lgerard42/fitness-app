/**
 * Run a single migration file. Usage: npx tsx src/drizzle/run-one.ts 0007_add_scorable_default_advanced.sql
 */
import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import pg from "pg";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const file = process.argv[2];
if (!file) {
  console.error("Usage: npx tsx src/drizzle/run-one.ts <migration.sql>");
  process.exit(1);
}

async function run() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  const sqlPath = path.resolve(__dirname, "migrations", file);
  if (!fs.existsSync(sqlPath)) {
    console.error("File not found:", sqlPath);
    process.exit(1);
  }
  const sql = fs.readFileSync(sqlPath, "utf-8");
  console.log("Running:", file);
  await client.query(sql);
  console.log("  Done.");
  client.release();
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
