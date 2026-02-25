/**
 * Schema and relationship routes -- queries Postgres directly.
 */
import { Router, Request, Response } from "express";
import { TABLE_REGISTRY, getSchema, getGroups } from "../tableRegistry";
import { countRows, queryFKIds, findFKReferences } from "../pgCrud";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.json({
    groups: getGroups(),
    tables: TABLE_REGISTRY,
  });
});

router.get("/:key", (req: Request, res: Response) => {
  const schema = getSchema(req.params.key as string);
  if (!schema) {
    res.status(404).json({ error: `Schema "${req.params.key}" not found` });
    return;
  }
  res.json(schema);
});

router.get("/meta/relationships", async (_req: Request, res: Response) => {
  try {
    const nodes: Array<{
      key: string;
      label: string;
      group: string;
      rowCount: number;
    }> = [];
    const edges: Array<{
      from: string;
      to: string;
      field: string;
      type: "fk" | "fk[]";
    }> = [];

    for (const schema of TABLE_REGISTRY) {
      let rowCount = 0;
      try {
        rowCount = await countRows(schema.pgTable);
      } catch { /* table might not exist yet */ }

      nodes.push({
        key: schema.key,
        label: schema.label,
        group: schema.group,
        rowCount,
      });

      for (const field of schema.fields) {
        if ((field.type === "fk" || field.type === "fk[]") && field.refTable) {
          edges.push({
            from: schema.key,
            to: field.refTable,
            field: field.name,
            type: field.type,
          });
        }
      }
    }

    res.json({ nodes, edges });
  } catch (err) {
    res.status(500).json({ error: `Failed to load relationships: ${err}` });
  }
});

router.post("/:key/validate", async (req: Request, res: Response) => {
  const schema = getSchema(req.params.key as string);
  if (!schema) {
    res.status(404).json({ error: `Schema "${req.params.key}" not found` });
    return;
  }

  const row = req.body;
  const errors: string[] = [];

  for (const field of schema.fields) {
    if (
      field.required &&
      (row[field.name] === undefined ||
        row[field.name] === null ||
        row[field.name] === "")
    ) {
      errors.push(`Field "${field.name}" is required`);
    }
  }

  const fkFields = schema.fields.filter(
    (f) => (f.type === "fk" || f.type === "fk[]") && f.refTable && row[f.name] != null
  );

  try {
    for (const field of fkFields) {
      const refSchema = getSchema(field.refTable!);
      if (!refSchema) continue;

      if (field.type === "fk") {
        const val = row[field.name];
        if (val) {
          const existing = await queryFKIds(refSchema.pgTable, [val]);
          if (!existing.has(val)) {
            errors.push(`FK "${field.name}": id "${val}" not found in ${field.refTable}`);
          }
        }
      } else if (field.type === "fk[]" && Array.isArray(row[field.name])) {
        const ids = row[field.name] as string[];
        if (ids.length > 0) {
          const existing = await queryFKIds(refSchema.pgTable, ids);
          for (const id of ids) {
            if (!existing.has(id)) {
              errors.push(`FK "${field.name}": id "${id}" not found in ${field.refTable}`);
            }
          }
        }
      }
    }
  } catch { /* validation best-effort */ }

  if (errors.length > 0) {
    res.status(400).json({ valid: false, errors });
  } else {
    res.json({ valid: true });
  }
});

router.get("/meta/fk-refs/:key/:id", async (req: Request, res: Response) => {
  const targetKey = req.params.key as string;
  const targetId = req.params.id as string;
  const refs: Array<{
    table: string;
    field: string;
    rowId: string;
    rowLabel: string;
  }> = [];

  try {
    for (const schema of TABLE_REGISTRY) {
      const fkFields = schema.fields.filter(
        (f) =>
          (f.type === "fk" || f.type === "fk[]") && f.refTable === targetKey
      );
      if (fkFields.length === 0) continue;

      for (const f of fkFields) {
        const matches = await findFKReferences(
          schema.pgTable,
          f.name,
          f.type as "fk" | "fk[]",
          targetId,
          schema.idField,
          schema.labelField,
        );
        for (const m of matches) {
          refs.push({
            table: schema.key,
            field: f.name,
            rowId: m.rowId,
            rowLabel: m.rowLabel,
          });
        }
      }
    }
  } catch { /* best-effort */ }

  res.json({ refs });
});

export default router;
