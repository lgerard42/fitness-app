/**
 * CRUD routes for JSON tables.
 */
import { Router, Request, Response } from 'express';
import { TABLE_REGISTRY, getSchema } from '../tableRegistry.js';
import { readTable, writeTable, tableStats } from '../fileOps.js';

const router = Router();

/* ──────── Motion ↔ Motion Planes bidirectional sync ──────── */

interface MotionPlanesValue { default: string; options: string[] }

function parseMotionPlanes(raw: unknown): MotionPlanesValue {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    return {
      default: typeof obj.default === 'string' ? obj.default : '',
      options: Array.isArray(obj.options) ? (obj.options as string[]) : [],
    };
  }
  return { default: '', options: [] };
}

/**
 * After any mutation to the motions table, reconcile motionPlanes delta_rules.
 * For each plane: its delta_rules keys should exactly match the set of motions
 * that list that plane in their motion_planes.options.
 * - Adds empty {} entries for motions that reference the plane but have no delta
 * - Removes entries for motions that no longer reference the plane
 */
function syncMotionPlanesToMatchMotions() {
  try {
    const motions = readTable('motions.json') as Record<string, unknown>[];
    const planes = readTable('motionPlanes.json') as Record<string, unknown>[];
    if (!Array.isArray(motions) || !Array.isArray(planes)) return;

    const planeToMotions = new Map<string, Set<string>>();
    for (const p of planes) planeToMotions.set(p.id as string, new Set());

    for (const m of motions) {
      const mp = parseMotionPlanes(m.motion_planes);
      for (const pid of mp.options) {
        planeToMotions.get(pid)?.add(m.id as string);
      }
    }

    let changed = false;
    for (const plane of planes) {
      const pid = plane.id as string;
      const expected = planeToMotions.get(pid) || new Set();
      const rules = (plane.delta_rules && typeof plane.delta_rules === 'object')
        ? { ...(plane.delta_rules as Record<string, unknown>) } : {};

      let planeChanged = false;
      // Remove orphan keys
      for (const key of Object.keys(rules)) {
        if (!expected.has(key)) { delete rules[key]; planeChanged = true; }
      }
      // Add missing keys
      for (const mid of expected) {
        if (!(mid in rules)) { rules[mid] = {}; planeChanged = true; }
      }
      if (planeChanged) { plane.delta_rules = rules; changed = true; }
    }
    if (changed) writeTable('motionPlanes.json', planes);
  } catch { /* ignore if files don't exist */ }
}

/**
 * After any mutation to the motionPlanes table, reconcile motions' motion_planes.
 * For each motion: its motion_planes.options should exactly match the set of planes
 * that have that motion in their delta_rules.
 */
function syncMotionsToMatchPlanes() {
  try {
    const motions = readTable('motions.json') as Record<string, unknown>[];
    const planes = readTable('motionPlanes.json') as Record<string, unknown>[];
    if (!Array.isArray(motions) || !Array.isArray(planes)) return;

    const planesSorted = [...planes].sort((a, b) =>
      ((a.sort_order as number) || 0) - ((b.sort_order as number) || 0)
    );

    const motionToPlanes = new Map<string, string[]>();
    for (const plane of planesSorted) {
      const pid = plane.id as string;
      const rules = plane.delta_rules as Record<string, unknown> | undefined;
      if (!rules || typeof rules !== 'object') continue;
      for (const motionId of Object.keys(rules)) {
        if (!motionToPlanes.has(motionId)) motionToPlanes.set(motionId, []);
        motionToPlanes.get(motionId)!.push(pid);
      }
    }

    let changed = false;
    for (const motion of motions) {
      const mid = motion.id as string;
      const expectedPlanes = motionToPlanes.get(mid) || [];
      const current = parseMotionPlanes(motion.motion_planes);

      const expectedSet = new Set(expectedPlanes);
      const currentSet = new Set(current.options);
      const same = expectedSet.size === currentSet.size && [...expectedSet].every(p => currentSet.has(p));

      if (!same) {
        if (expectedPlanes.length > 0) {
          const def = expectedPlanes.includes(current.default) ? current.default : expectedPlanes[0];
          motion.motion_planes = { default: def, options: expectedPlanes };
        } else {
          delete motion.motion_planes;
        }
        changed = true;
      }
    }
    if (changed) writeTable('motions.json', motions);
  } catch { /* ignore */ }
}

function postWriteSync(tableKey: string) {
  if (tableKey === 'motions') syncMotionPlanesToMatchMotions();
  else if (tableKey === 'motionPlanes') syncMotionsToMatchPlanes();
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

    const idx = data.findIndex((row: Record<string, unknown>) => row.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: `Row "${req.params.id}" not found` });
      return;
    }
    data[idx] = { ...data[idx], ...req.body };
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

    const idx = data.findIndex((row: Record<string, unknown>) => row.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: `Row "${req.params.id}" not found` });
      return;
    }
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

/** POST /api/tables/:key/sync — trigger bidirectional sync for motion/motionPlanes */
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
