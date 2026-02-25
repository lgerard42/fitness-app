import { Router, Request, Response } from "express";
import { TABLE_REGISTRY, getSchema, getPgColumns } from "../tableRegistry";
import {
  listRows,
  countRows,
  insertRow,
  updateRow,
  softDeleteRow,
  reorderRows,
  upsertFullTable,
  bulkUpdateRows,
  rowExists,
  getRow,
  handleFKCleanupPg,
  cleanMotionDeltaRules,
} from "../pgCrud";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const tables = await Promise.all(
      TABLE_REGISTRY.map(async (schema) => {
        let rowCount = 0;
        try {
          rowCount = await countRows(schema.pgTable);
        } catch { /* table might not exist yet */ }
        return {
          key: schema.key,
          label: schema.label,
          group: schema.group,
          file: schema.file,
          rowCount,
          lastModified: null,
          parentTableKey: schema.parentTableKey,
        };
      })
    );
    res.json(tables);
  } catch (err) {
    res.status(500).json({ error: `Failed to list tables: ${err}` });
  }
});

router.get("/:key", async (req: Request, res: Response) => {
  const key = req.params.key as string;
  const schema = getSchema(key);
  if (!schema) { res.status(404).json({ error: `Table "${key}" not found in registry` }); return; }
  try {
    const rows = await listRows(schema.pgTable);
    if (schema.isKeyValueMap) {
      const map: Record<string, unknown> = {};
      for (const row of rows) map[row.id as string] = row.value;
      res.json(map);
      return;
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: `Failed to read ${schema.key}: ${err}` });
  }
});

router.put("/:key", async (req: Request, res: Response) => {
  const key = req.params.key as string;
  const schema = getSchema(key);
  if (!schema) { res.status(404).json({ error: `Table "${key}" not found in registry` }); return; }
  try {
    const columns = getPgColumns(schema);
    let rows: Record<string, unknown>[];
    if (schema.isKeyValueMap && req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
      rows = Object.entries(req.body).map(([k, v]) => ({ id: k, value: v, is_active: true }));
    } else {
      rows = req.body;
    }
    await upsertFullTable(schema.pgTable, columns, rows);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: `Failed to write ${schema.key}: ${err}` });
  }
});

router.post("/:key/rows", async (req: Request, res: Response) => {
  const key = req.params.key as string;
  const schema = getSchema(key);
  if (!schema) { res.status(404).json({ error: `Table "${key}" not found in registry` }); return; }
  try {
    const columns = getPgColumns(schema);
    if (schema.isKeyValueMap) {
      const { id, value } = req.body;
      if (!id) { res.status(400).json({ error: "Missing id for key-value entry" }); return; }
      await insertRow(schema.pgTable, columns, { id, value, is_active: true });
      res.json({ ok: true });
      return;
    }
    const newRow = req.body;
    if (!newRow.id) { res.status(400).json({ error: "Row must have an id field" }); return; }
    if (await rowExists(schema.pgTable, newRow.id)) {
      res.status(409).json({ error: `Row with id "${newRow.id}" already exists` }); return;
    }
    const inserted = await insertRow(schema.pgTable, columns, newRow);
    res.json({ ok: true, row: inserted });
  } catch (err) {
    res.status(500).json({ error: `Failed to add row: ${err}` });
  }
});

router.put("/:key/rows/:id", async (req: Request, res: Response) => {
  const key = req.params.key as string;
  const rowId = req.params.id as string;
  const schema = getSchema(key);
  if (!schema) { res.status(404).json({ error: `Table "${key}" not found in registry` }); return; }
  try {
    const columns = getPgColumns(schema);
    if (schema.isKeyValueMap) {
      await updateRow(schema.pgTable, columns, rowId, { value: req.body.value });
      res.json({ ok: true });
      return;
    }
    const updated = await updateRow(schema.pgTable, columns, rowId, req.body);
    if (!updated) { res.status(404).json({ error: `Row "${rowId}" not found` }); return; }
    res.json({ ok: true, row: updated });
  } catch (err) {
    res.status(500).json({ error: `Failed to update row: ${err}` });
  }
});

router.delete("/:key/rows/:id", async (req: Request, res: Response) => {
  const key = req.params.key as string;
  const rowId = req.params.id as string;
  const schema = getSchema(key);
  if (!schema) { res.status(404).json({ error: `Table "${key}" not found in registry` }); return; }
  const breakLinks = req.query.breakLinks === "true";
  const reassignTo = req.query.reassignTo as string | undefined;
  try {
    if (reassignTo || breakLinks) {
      const mode = reassignTo ? "reassign" : "break";
      for (const s of TABLE_REGISTRY) {
        const fkFields = s.fields.filter(
          (f) => (f.type === "fk" || f.type === "fk[]") && f.refTable === key
        );
        for (const f of fkFields) {
          await handleFKCleanupPg(s.pgTable, f.name, f.type as "fk" | "fk[]", rowId, mode, reassignTo);
        }
      }
    }

    if (schema.key === "motions") {
      await cleanMotionDeltaRules(rowId);
    }

    const deleted = await softDeleteRow(schema.pgTable, rowId);
    if (!deleted) { res.status(404).json({ error: `Row "${rowId}" not found` }); return; }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: `Failed to delete row: ${err}` });
  }
});

router.post("/:key/reorder", async (req: Request, res: Response) => {
  const key = req.params.key as string;
  const schema = getSchema(key);
  if (!schema) { res.status(404).json({ error: `Table "${key}" not found in registry` }); return; }
  try {
    const orderedIds: string[] = req.body.ids;
    if (!Array.isArray(orderedIds)) { res.status(400).json({ error: 'Body must have an "ids" array' }); return; }

    const allRows = await listRows(schema.pgTable);
    const inOrder = new Set(orderedIds);
    const pairs: Array<{ id: string; sortOrder: number }> = [];
    let idx = 0;
    for (const id of orderedIds) {
      if (allRows.some((r) => r.id === id)) {
        pairs.push({ id, sortOrder: idx++ });
      }
    }
    for (const row of allRows) {
      if (!inOrder.has(row.id as string)) {
        pairs.push({ id: row.id as string, sortOrder: idx++ });
      }
    }
    await reorderRows(schema.pgTable, pairs);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: `Failed to reorder: ${err}` });
  }
});

router.post("/bulk-matrix", async (req: Request, res: Response) => {
  const { sourceTable, updates } = req.body as {
    sourceTable: string;
    updates: Record<string, Record<string, unknown>>;
  };
  const schema = getSchema(sourceTable);
  if (!schema) { res.status(404).json({ error: `Table "${sourceTable}" not found in registry` }); return; }
  try {
    const columns = getPgColumns(schema);
    await bulkUpdateRows(schema.pgTable, columns, updates);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: `Bulk update failed: ${err}` });
  }
});

router.post("/:key/sync", async (_req: Request, res: Response) => {
  res.json({ ok: true, message: "No-op: data is already in Postgres" });
});

export default router;
