/**
 * CRUD routes for JSON tables.
 */
import { Router, Request, Response } from 'express';
import { TABLE_REGISTRY, getSchema } from '../tableRegistry.js';
import { readTable, writeTable, tableStats } from '../fileOps.js';

const router = Router();

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
    const data = readTable(schema.file);
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

    const newRow = req.body;
    if (!newRow.id) {
      res.status(400).json({ error: 'Row must have an id field' });
      return;
    }
    if (data.some((row: Record<string, unknown>) => row.id === newRow.id)) {
      res.status(409).json({ error: `Row with id "${newRow.id}" already exists` });
      return;
    }
    data.push(newRow);
    writeTable(schema.file, data);
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

    const idx = data.findIndex((row: Record<string, unknown>) => row.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: `Row "${req.params.id}" not found` });
      return;
    }
    data[idx] = { ...data[idx], ...req.body };
    writeTable(schema.file, data);
    res.json({ ok: true, row: data[idx] });
  } catch (err) {
    res.status(500).json({ error: `Failed to update row: ${err}` });
  }
});

/** DELETE /api/tables/:key/rows/:id — delete a row */
router.delete('/:key/rows/:id', (req: Request, res: Response) => {
  const schema = getSchema(req.params.key);
  if (!schema) {
    res.status(404).json({ error: `Table "${req.params.key}" not found in registry` });
    return;
  }
  try {
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

    const idx = data.findIndex((row: Record<string, unknown>) => row.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: `Row "${req.params.id}" not found` });
      return;
    }
    data.splice(idx, 1);
    writeTable(schema.file, data);
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
    const orderedIds: string[] = req.body.ids;
    if (!Array.isArray(orderedIds)) {
      res.status(400).json({ error: 'Body must have an "ids" array' });
      return;
    }
    const byId = new Map(data.map((row: Record<string, unknown>) => [row.id as string, row]));
    const reordered = orderedIds
      .filter((id) => byId.has(id))
      .map((id, i) => ({ ...byId.get(id)!, sort_order: i }));
    // Append any rows not in the orderedIds list at the end
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

export default router;
