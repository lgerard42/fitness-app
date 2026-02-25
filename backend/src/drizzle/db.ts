/**
 * Shared Postgres connection pool.
 * Used by admin CRUD, reference service, and scoring routes
 * for raw SQL queries.
 */
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export { pool };
