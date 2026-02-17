/**
 * Schema and relationship routes.
 */
import { Router, Request, Response } from 'express';
import { TABLE_REGISTRY, getSchema, getGroups } from '../tableRegistry.js';
import { readTable } from '../fileOps.js';

const router = Router();

/** GET /api/schema — all schemas + groups */
router.get('/', (_req: Request, res: Response) => {
  res.json({
    groups: getGroups(),
    tables: TABLE_REGISTRY,
  });
});

/** GET /api/schema/:key — single table schema */
router.get('/:key', (req: Request, res: Response) => {
  const schema = getSchema(req.params.key);
  if (!schema) {
    res.status(404).json({ error: `Schema "${req.params.key}" not found` });
    return;
  }
  res.json(schema);
});

/** GET /api/relationships — compute FK graph */
router.get('/meta/relationships', (_req: Request, res: Response) => {
  const edges: Array<{ from: string; to: string; field: string; type: 'fk' | 'fk[]' }> = [];
  for (const schema of TABLE_REGISTRY) {
    for (const field of schema.fields) {
      if ((field.type === 'fk' || field.type === 'fk[]') && field.refTable) {
        edges.push({
          from: schema.key,
          to: field.refTable,
          field: field.name,
          type: field.type,
        });
      }
    }
  }
  res.json({ edges });
});

/** POST /api/validate/:key — validate a row and check FK integrity */
router.post('/:key/validate', (req: Request, res: Response) => {
  const schema = getSchema(req.params.key);
  if (!schema) {
    res.status(404).json({ error: `Schema "${req.params.key}" not found` });
    return;
  }

  const row = req.body;
  const errors: string[] = [];

  for (const field of schema.fields) {
    if (field.required && (row[field.name] === undefined || row[field.name] === null || row[field.name] === '')) {
      errors.push(`Field "${field.name}" is required`);
    }
    if (field.refTable && row[field.name] != null) {
      const refSchema = getSchema(field.refTable);
      if (refSchema) {
        try {
          const refData = readTable(refSchema.file) as Record<string, unknown>[];
          const refIds = new Set(refData.map((r) => r.id));
          if (field.type === 'fk') {
            if (row[field.name] && !refIds.has(row[field.name])) {
              errors.push(`FK "${field.name}": id "${row[field.name]}" not found in ${field.refTable}`);
            }
          } else if (field.type === 'fk[]' && Array.isArray(row[field.name])) {
            for (const id of row[field.name]) {
              if (!refIds.has(id)) {
                errors.push(`FK "${field.name}": id "${id}" not found in ${field.refTable}`);
              }
            }
          }
        } catch {
          // Reference table might not exist yet
        }
      }
    }
  }

  if (errors.length > 0) {
    res.status(400).json({ valid: false, errors });
  } else {
    res.json({ valid: true });
  }
});

/** GET /api/schema/meta/fk-refs/:key/:id — find all references to a specific row */
router.get('/meta/fk-refs/:key/:id', (req: Request, res: Response) => {
  const targetKey = req.params.key;
  const targetId = req.params.id;
  const refs: Array<{ table: string; field: string; rowId: string; rowLabel: string }> = [];

  for (const schema of TABLE_REGISTRY) {
    const fkFields = schema.fields.filter(
      (f) => (f.type === 'fk' || f.type === 'fk[]') && f.refTable === targetKey
    );
    if (fkFields.length === 0) continue;

    try {
      const data = readTable(schema.file);
      if (!Array.isArray(data)) continue;
      for (const row of data as Record<string, unknown>[]) {
        for (const f of fkFields) {
          const val = row[f.name];
          const matches =
            f.type === 'fk'
              ? val === targetId
              : Array.isArray(val) && val.includes(targetId);
          if (matches) {
            refs.push({
              table: schema.key,
              field: f.name,
              rowId: row[schema.idField] as string,
              rowLabel: row[schema.labelField] as string,
            });
          }
        }
      }
    } catch {
      // skip if table file is missing
    }
  }

  res.json({ refs });
});

export default router;
