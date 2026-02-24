import { Router, Request, Response, NextFunction } from "express";
import { config } from "../config";
import { JsonFileRepository } from "../reference/jsonRepository";
import type { ReferenceDataRepository } from "../reference/repository";
import { paramKey } from "../middleware/paramId";

const router = Router();

function getRepo(): ReferenceDataRepository {
  if (config.referenceDataSource === "postgres") {
    console.warn(
      "Postgres reference data not yet implemented, falling back to JSON"
    );
  }
  return new JsonFileRepository();
}

function wrap(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);
}

router.get(
  "/",
  wrap(async (_req, res) => {
    const repo = getRepo();
    const tables = await repo.listTables();
    res.json(tables);
  })
);

router.get(
  "/:key",
  wrap(async (req, res) => {
    const key = paramKey(req);
    const repo = getRepo();
    try {
      const data = await repo.getTable(key);
      res.json(data);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  })
);

router.put(
  "/:key",
  wrap(async (req, res) => {
    const key = paramKey(req);
    const repo = getRepo();
    try {
      await repo.putTable(key, req.body);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  })
);

router.get("/config/source", (_req, res) => {
  res.json({ source: config.referenceDataSource });
});

export default router;
