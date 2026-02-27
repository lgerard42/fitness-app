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
  getParentMuscleIds,
} from "../pgCrud";
import { matrixConfigService } from "../../services/matrixConfigService";
import { stripParentZerosFromFlatScores } from "../../../../shared/scoring/stripParentZeros";

function isFlatScoreRecord(val: unknown): val is Record<string, number> {
  if (!val || typeof val !== "object" || Array.isArray(val)) return false;
  return Object.values(val as Record<string, unknown>).every((v) => typeof v === "number");
}

/** Normalize delta_rules in place: remove parent muscle IDs with score 0. */
function normalizeDeltaRules(dr: Record<string, unknown>, parentIds: Set<string>): void {
  for (const [motionId, val] of Object.entries(dr)) {
    if (val === "inherit" || !isFlatScoreRecord(val)) continue;
    dr[motionId] = stripParentZerosFromFlatScores(val, parentIds);
  }
}

/** Normalize muscle_targets in place: remove parent muscle IDs with score 0. */
function normalizeMuscleTargets(body: Record<string, unknown>, parentIds: Set<string>): void {
  if (!body.muscle_targets || !isFlatScoreRecord(body.muscle_targets)) return;
  body.muscle_targets = stripParentZerosFromFlatScores(body.muscle_targets, parentIds);
}

/**
 * After a row with delta_rules is saved, sync each referenced motion
 * so it has an active Matrix V2 config with up-to-date allowed_row_ids.
 */
async function syncDeltaRulesIfPresent(body: Record<string, unknown>): Promise<void> {
  const dr = body.delta_rules;
  if (!dr || typeof dr !== "object" || Array.isArray(dr)) return;
  const motionIds = Object.keys(dr as Record<string, unknown>);
  for (const mid of motionIds) {
    try {
      await matrixConfigService.syncDeltasForMotion(mid);
    } catch (err) {
      console.warn(`[tables] syncDeltasForMotion(${mid}) failed:`, err);
    }
  }
}

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
    const hasDeltaRules = rows.some((r) => r.delta_rules && typeof r.delta_rules === "object" && !Array.isArray(r.delta_rules));
    if (hasDeltaRules) {
      const parentIds = await getParentMuscleIds();
      for (const row of rows) {
        if (row.delta_rules && typeof row.delta_rules === "object" && !Array.isArray(row.delta_rules)) {
          normalizeDeltaRules(row.delta_rules as Record<string, unknown>, parentIds);
        }
      }
    }
    await upsertFullTable(schema.pgTable, columns, rows);

    // Post-save: sync delta_rules from upserted rows
    for (const row of rows) {
      syncDeltaRulesIfPresent(row).catch(() => {});
    }

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
    const newRow = req.body as Record<string, unknown>;
    if (!newRow.id) { res.status(400).json({ error: "Row must have an id field" }); return; }
    if (newRow.delta_rules && typeof newRow.delta_rules === "object" && !Array.isArray(newRow.delta_rules)) {
      const parentIds = await getParentMuscleIds();
      normalizeDeltaRules(newRow.delta_rules as Record<string, unknown>, parentIds);
    }
    if (schema.key === "motions" && newRow.muscle_targets) {
      const parentIds = await getParentMuscleIds();
      normalizeMuscleTargets(newRow, parentIds);
    }
    if (await rowExists(schema.pgTable, newRow.id as string)) {
      res.status(409).json({ error: `Row with id "${newRow.id}" already exists` }); return;
    }
    const inserted = await insertRow(schema.pgTable, columns, newRow);

    // Post-insert: sync delta_rules if present on new row
    syncDeltaRulesIfPresent(newRow).catch(() => {});

    // Auto-create a placeholder draft config when a new motion is added
    if (schema.key === "motions" && newRow.id) {
      matrixConfigService.ensureDraftForMotion(newRow.id).catch(() => {});
    }

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
    const body = req.body as Record<string, unknown>;
    if (body.delta_rules && typeof body.delta_rules === "object" && !Array.isArray(body.delta_rules)) {
      const parentIds = await getParentMuscleIds();
      normalizeDeltaRules(body.delta_rules as Record<string, unknown>, parentIds);
    }
    if (schema.key === "motions" && body.muscle_targets) {
      const parentIds = await getParentMuscleIds();
      normalizeMuscleTargets(body, parentIds);
    }
    const updated = await updateRow(schema.pgTable, columns, rowId, body);
    if (!updated) { res.status(404).json({ error: `Row "${rowId}" not found` }); return; }

    // Post-save: sync delta_rules → Matrix V2 configs (fire-and-forget)
    syncDeltaRulesIfPresent(body).catch(() => {});

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
      await matrixConfigService.deleteConfigsForMotion(rowId);
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
    const rowDataList = Object.values(updates);
    const hasDeltaRules = rowDataList.some((r) => r.delta_rules && typeof r.delta_rules === "object" && !Array.isArray(r.delta_rules));
    if (hasDeltaRules) {
      const parentIds = await getParentMuscleIds();
      for (const rowData of rowDataList) {
        if (rowData.delta_rules && typeof rowData.delta_rules === "object" && !Array.isArray(rowData.delta_rules)) {
          normalizeDeltaRules(rowData.delta_rules as Record<string, unknown>, parentIds);
        }
      }
    }
    await bulkUpdateRows(schema.pgTable, columns, updates);

    // Post-save: sync delta_rules from any updated rows
    for (const rowData of rowDataList) {
      syncDeltaRulesIfPresent(rowData).catch(() => {});
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: `Bulk update failed: ${err}` });
  }
});

router.post("/:key/sync", async (_req: Request, res: Response) => {
  res.json({ ok: true, message: "No-op: data is already in Postgres" });
});

export default router;
