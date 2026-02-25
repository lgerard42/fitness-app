/**
 * Unified database setup script.
 *
 * Creates all tables (Prisma schema), applies triggers/indexes,
 * seeds reference data, and seeds user data.
 *
 * Usage: npx tsx src/setup/dbSetup.ts
 */
import { execSync } from "child_process";
import path from "node:path";
import fs from "node:fs";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const BACKEND_ROOT = path.resolve(__dirname, "../..");

async function tableCount(pool: pg.Pool): Promise<number> {
  const res = await pool.query(
    `SELECT count(*)::int as cnt FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r'`
  );
  return res.rows[0].cnt;
}

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const existing = await tableCount(pool);
    console.log(`Found ${existing} existing table(s) in public schema.\n`);

    // Step 1: Create tables via Prisma
    if (existing < 35) {
      console.log("=== Step 1: Creating tables (prisma db push) ===");
      execSync("npx prisma db push --skip-generate", {
        cwd: BACKEND_ROOT,
        stdio: "inherit",
        env: { ...process.env },
      });

      const after = await tableCount(pool);
      if (after < 35) {
        console.log(
          `\nPrisma db push reported success but only ${after} tables exist.`
        );
        console.log("Applying schema SQL directly...");
        const sql = execSync(
          "npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script",
          { cwd: BACKEND_ROOT, encoding: "utf-8", env: { ...process.env } }
        );
        const cleanSql = sql
          .split("\n")
          .filter((line) => !line.startsWith("npx ") && !line.startsWith("At ") && !line.startsWith("+ ") && !line.startsWith("    +") && !line.startsWith("For more") && !line.trim().startsWith("+ CategoryInfo"))
          .join("\n");
        await pool.query(cleanSql);
        const final = await tableCount(pool);
        console.log(`Tables after direct SQL: ${final}`);
      } else {
        console.log(`Tables created: ${after}`);
      }

      execSync("npx prisma generate", {
        cwd: BACKEND_ROOT,
        stdio: "inherit",
        env: { ...process.env },
      });
    } else {
      console.log("Tables already exist, skipping schema push.");
    }

    // Step 2: Apply triggers and indexes
    console.log("\n=== Step 2: Applying triggers and indexes ===");
    const migrationsDir = path.resolve(
      BACKEND_ROOT,
      "src/drizzle/migrations"
    );
    if (fs.existsSync(migrationsDir)) {
      const files = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith(".sql"))
        .sort();
      for (const file of files) {
        const fileSql = fs.readFileSync(
          path.join(migrationsDir, file),
          "utf-8"
        );
        console.log(`  Running: ${file}`);
        await pool.query(fileSql);
        console.log(`  ✓ ${file}`);
      }
    }

    // Step 3: Seed reference data
    console.log("\n=== Step 3: Seeding reference data ===");
    execSync("npx tsx src/seed/seedPipeline.ts", {
      cwd: BACKEND_ROOT,
      stdio: "inherit",
      env: { ...process.env },
    });

    // Step 4: Seed user data
    console.log("\n=== Step 4: Seeding user data ===");
    execSync("npx tsx prisma/seed.ts", {
      cwd: BACKEND_ROOT,
      stdio: "inherit",
      env: { ...process.env },
    });

    const finalCount = await tableCount(pool);
    console.log(`\n✓ Setup complete. ${finalCount} tables in database.`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
