import { Router } from "express";
import pg from "pg";
import { ReferenceService } from "../services/referenceService";
import { TABLE_KEY_TO_PG } from "../drizzle/schema/referenceTables";

const router = Router();

let service: ReferenceService | null = null;

function getService(): ReferenceService {
  if (!service) {
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    service = new ReferenceService(pool);
  }
  return service;
}

router.get("/version", async (_req, res, next) => {
  try {
    const version = await getService().getVersion();
    res.json(version);
  } catch (err) {
    next(err);
  }
});

router.get("/bootstrap", async (_req, res, next) => {
  try {
    const data = await getService().getBootstrap();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/:table", async (req, res, next) => {
  try {
    const tableKey = req.params.table as string;
    if (!TABLE_KEY_TO_PG[tableKey]) {
      res.status(404).json({ error: `Unknown table: ${tableKey}` });
      return;
    }
    const data = await getService().getTable(tableKey);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
