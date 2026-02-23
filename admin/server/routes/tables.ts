/**
 * CRUD routes for JSON tables.
 */
import { Router, Request, Response } from 'express';
import { TABLE_REGISTRY, getSchema } from '../tableRegistry.js';
import { readTable, writeTable, tableStats } from '../fileOps.js';

const router = Router();

/* ──────── Motions: migrate motion_paths → default_delta_configs ──────── */

/** Migrate a single motion row: motion_paths → default_delta_configs, remove motion_paths */
function migrateMotionsRow(row: Record<string, unknown>): void {
  if (!row || typeof row !== 'object') return;
  const mp = row.motion_paths;
  if (mp && typeof mp === 'object' && !Array.isArray(mp) && 'default' in mp) {
    const def = (mp as Record<string, unknown>).default;
    const ddc = (row.default_delta_configs && typeof row.default_delta_configs === 'object' && !Array.isArray(row.default_delta_configs))
      ? { ...(row.default_delta_configs as Record<string, unknown>) } : {};
    if (typeof def === 'string') ddc.motionPaths = def;
    row.default_delta_configs = ddc;
    delete row.motion_paths;
  }
}

/** Apply migration to motions table data (in-place). Used on read and before write. */
function migrateMotionsTable(data: unknown): Record<string, unknown>[] {
  if (!Array.isArray(data)) return [];
  for (const row of data as Record<string, unknown>[]) migrateMotionsRow(row);
  return data as Record<string, unknown>[];
}

/** When a motion is deleted, remove its id from all motion paths' delta_rules */
function onMotionDeleted(motionId: string) {
  try {
    const planes = readTable('motionPaths.json') as Record<string, unknown>[];
    if (!Array.isArray(planes)) return;
    let changed = false;
    for (const plane of planes) {
      const rules = plane.delta_rules as Record<string, unknown> | undefined;
      if (rules && typeof rules === 'object' && motionId in rules) {
        delete rules[motionId];
        plane.delta_rules = { ...rules };
        changed = true;
      }
    }
    if (changed) writeTable('motionPaths.json', planes);
  } catch { /* ignore */ }
}

function postWriteSync(_tableKey: string) {
  /* Motion/plane relationship is now defined only by motionPaths.delta_rules; no bidirectional sync */
}

/** GET /api/tables — list all registered tables with metadata */
router.get('/', (_req: Request, res: Response) => {
  const tables = TABLE_REGISTRY.map((schema) => {
    const stats = tableStats(schema.file);
    let rowCount = 0;
    try {
      const data = readTable(schema.file);
      if (schema.isKeyValueMap && data && typeof data === 'object' && !Array.isArray(data)) {
        rowCount = Object.keys(data).length;
      } else if (Array.isArray(data)) {
        rowCount = data.length;
      }
    } catch {
      // file might not exist yet
    }
    return {
      key: schema.key,
      label: schema.label,
      group: schema.group,
      file: schema.file,
      rowCount,
      lastModified: stats?.mtime ?? null,
      parentTableKey: schema.parentTableKey,
    };
  });
  res.json(tables);
});

/** GET /api/tables/:key — read full table data */
router.get('/:key', (req: Request, res: Response) => {
  const schema = getSchema(req.params.key);
  if (!schema) {
    res.status(404).json({ error: `Table "${req.params.key}" not found in registry` });
    return;
  }
  try {
    let data = readTable(schema.file);
    if (schema.key === 'motions' && Array.isArray(data)) {
      migrateMotionsTable(data);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: `Failed to read ${schema.file}: ${err}` });
  }
});

/** PUT /api/tables/:key — overwrite full table data */
router.put('/:key', (req: Request, res: Response) => {
  const schema = getSchema(req.params.key);
  if (!schema) {
    res.status(404).json({ error: `Table "${req.params.key}" not found in registry` });
    return;
  }
  try {
    writeTable(schema.file, req.body);
    postWriteSync(schema.key);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: `Failed to write ${schema.file}: ${err}` });
  }
});

/** POST /api/tables/:key/rows — add a row */
router.post('/:key/rows', (req: Request, res: Response) => {
  const schema = getSchema(req.params.key);
  if (!schema) {
    res.status(404).json({ error: `Table "${req.params.key}" not found in registry` });
    return;
  }
  try {
    const data = readTable(schema.file);

    if (schema.isKeyValueMap && data && typeof data === 'object' && !Array.isArray(data)) {
      const { id, value } = req.body;
      if (!id) {
        res.status(400).json({ error: 'Missing id for key-value entry' });
        return;
      }
      (data as Record<string, unknown>)[id] = value;
      writeTable(schema.file, data);
      res.json({ ok: true });
      return;
    }

    if (!Array.isArray(data)) {
      res.status(500).json({ error: 'Table data is not an array' });
      return;
    }
    if (schema.key === 'motions') migrateMotionsTable(data);

    const newRow = req.body;
    if (!newRow.id) {
      res.status(400).json({ error: 'Row must have an id field' });
      return;
    }
    if (data.some((row: Record<string, unknown>) => row.id === newRow.id)) {
      res.status(409).json({ error: `Row with id "${newRow.id}" already exists` });
      return;
    }
    if (schema.key === 'motions') migrateMotionsRow(newRow);
    data.push(newRow);
    writeTable(schema.file, data);
    if (req.query.skipSync !== 'true') postWriteSync(schema.key);
    res.json({ ok: true, row: newRow });
  } catch (err) {
    res.status(500).json({ error: `Failed to add row: ${err}` });
  }
});

/** PUT /api/tables/:key/rows/:id — update a row */
router.put('/:key/rows/:id', (req: Request, res: Response) => {
  const schema = getSchema(req.params.key);
  if (!schema) {
    res.status(404).json({ error: `Table "${req.params.key}" not found in registry` });
    return;
  }
  try {
    const data = readTable(schema.file);

    if (schema.isKeyValueMap && data && typeof data === 'object' && !Array.isArray(data)) {
      const map = data as Record<string, unknown>;
      map[req.params.id] = req.body.value;
      writeTable(schema.file, map);
      res.json({ ok: true });
      return;
    }

    if (!Array.isArray(data)) {
      res.status(500).json({ error: 'Table data is not an array' });
      return;
    }
    if (schema.key === 'motions') migrateMotionsTable(data);

    const idx = data.findIndex((row: Record<string, unknown>) => row.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: `Row "${req.params.id}" not found` });
      return;
    }
    data[idx] = { ...data[idx], ...req.body };
    if (schema.key === 'motions') {
      migrateMotionsRow(data[idx]);
      migrateMotionsTable(data);
    }
    writeTable(schema.file, data);
    if (req.query.skipSync !== 'true') postWriteSync(schema.key);
    res.json({ ok: true, row: data[idx] });
  } catch (err) {
    res.status(500).json({ error: `Failed to update row: ${err}` });
  }
});

/**
 * Helper: remove or reassign FK references across all tables when deleting a row.
 * breakLinks  = set the FK to '' (for fk) or remove from array (for fk[])
 * reassignTo  = replace old ID with new ID in all FK fields
 */
function handleFKCleanup(targetKey: string, targetId: string, mode: 'break' | 'reassign', reassignTo?: string) {
  for (const schema of TABLE_REGISTRY) {
    const fkFields = schema.fields.filter(
      (f) => (f.type === 'fk' || f.type === 'fk[]') && f.refTable === targetKey
    );
    if (fkFields.length === 0) continue;

    try {
      const data = readTable(schema.file);
      if (!Array.isArray(data)) continue;

      let changed = false;
      for (const row of data as Record<string, unknown>[]) {
        for (const f of fkFields) {
          const val = row[f.name];
          if (f.type === 'fk') {
            if (val === targetId) {
              row[f.name] = mode === 'reassign' && reassignTo ? reassignTo : '';
              changed = true;
            }
          } else if (f.type === 'fk[]' && Array.isArray(val)) {
            if (val.includes(targetId)) {
              if (mode === 'reassign' && reassignTo) {
                row[f.name] = val.map((v: string) => v === targetId ? reassignTo : v);
              } else {
                row[f.name] = val.filter((v: string) => v !== targetId);
              }
              changed = true;
            }
          }
        }
      }
      if (changed) writeTable(schema.file, data);
    } catch {
      // skip if table file is missing
    }
  }
}

/** DELETE /api/tables/:key/rows/:id — delete a row, with optional FK cleanup */
router.delete('/:key/rows/:id', (req: Request, res: Response) => {
  const schema = getSchema(req.params.key);
  if (!schema) {
    res.status(404).json({ error: `Table "${req.params.key}" not found in registry` });
    return;
  }

  const breakLinks = req.query.breakLinks === 'true';
  const reassignTo = req.query.reassignTo as string | undefined;

  try {
    // Handle FK cleanup before deleting
    if (reassignTo) {
      handleFKCleanup(req.params.key, req.params.id, 'reassign', reassignTo);
    } else if (breakLinks) {
      handleFKCleanup(req.params.key, req.params.id, 'break');
    }

    const data = readTable(schema.file);

    if (schema.isKeyValueMap && data && typeof data === 'object' && !Array.isArray(data)) {
      const map = data as Record<string, unknown>;
      delete map[req.params.id];
      writeTable(schema.file, map);
      res.json({ ok: true });
      return;
    }

    if (!Array.isArray(data)) {
      res.status(500).json({ error: 'Table data is not an array' });
      return;
    }
    if (schema.key === 'motions') migrateMotionsTable(data);

    const idx = data.findIndex((row: Record<string, unknown>) => row.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: `Row "${req.params.id}" not found` });
      return;
    }
    if (schema.key === 'motions') onMotionDeleted(req.params.id);
    data.splice(idx, 1);
    writeTable(schema.file, data);
    if (req.query.skipSync !== 'true') postWriteSync(schema.key);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: `Failed to delete row: ${err}` });
  }
});

/** POST /api/tables/:key/reorder — update sort_order for all rows */
router.post('/:key/reorder', (req: Request, res: Response) => {
  const schema = getSchema(req.params.key);
  if (!schema) {
    res.status(404).json({ error: `Table "${req.params.key}" not found in registry` });
    return;
  }
  try {
    const data = readTable(schema.file);
    if (!Array.isArray(data)) {
      res.status(500).json({ error: 'Table data is not an array' });
      return;
    }
    if (schema.key === 'motions') migrateMotionsTable(data);
    const orderedIds: string[] = req.body.ids;
    if (!Array.isArray(orderedIds)) {
      res.status(400).json({ error: 'Body must have an "ids" array' });
      return;
    }
    const byId = new Map(data.map((row: Record<string, unknown>) => [row.id as string, row]));
    const reordered = orderedIds
      .filter((id) => byId.has(id))
      .map((id, i) => ({ ...byId.get(id)!, sort_order: i }));
    for (const row of data) {
      if (!orderedIds.includes(row.id as string)) {
        reordered.push({ ...row, sort_order: reordered.length });
      }
    }
    writeTable(schema.file, reordered);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: `Failed to reorder: ${err}` });
  }
});

/** POST /api/tables/bulk-matrix — bulk update allowed_* columns for filter matrix */
router.post('/bulk-matrix', (req: Request, res: Response) => {
  const { sourceTable, updates } = req.body as {
    sourceTable: string;
    updates: Record<string, Record<string, unknown>>;
  };
  const schema = getSchema(sourceTable);
  if (!schema) {
    res.status(404).json({ error: `Table "${sourceTable}" not found in registry` });
    return;
  }
  try {
    const data = readTable(schema.file);
    if (!Array.isArray(data)) {
      res.status(500).json({ error: 'Table data is not an array' });
      return;
    }
    for (const row of data as Record<string, unknown>[]) {
      const id = row.id as string;
      if (updates[id]) {
        Object.assign(row, updates[id]);
      }
    }
    writeTable(schema.file, data);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: `Bulk update failed: ${err}` });
  }
});

/** POST /api/tables/:key/sync — trigger bidirectional sync for motion/motionPaths */
router.post('/:key/sync', (req: Request, res: Response) => {
  const schema = getSchema(req.params.key);
  if (!schema) {
    res.status(404).json({ error: `Table "${req.params.key}" not found in registry` });
    return;
  }
  try {
    postWriteSync(schema.key);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: `Sync failed: ${err}` });
  }
});

export default router;
