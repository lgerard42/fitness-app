import { SEED_ORDER, type SeedTableEntry } from "./topologicalOrder";

export interface ValidationError {
  table: string;
  row?: number;
  field?: string;
  message: string;
  severity: "error" | "warning";
}

/**
 * Pre-validates all JSON data before any database writes.
 * Checks: duplicate PKs, missing required 'id' field, FK ref integrity.
 */
export function validateSeedData(
  tableData: Map<string, unknown[]>
): ValidationError[] {
  const errors: ValidationError[] = [];

  const allIds = new Map<string, Set<string>>();
  for (const [key, rows] of tableData) {
    allIds.set(key, new Set(rows.map((r: any) => r.id)));
  }

  for (const entry of SEED_ORDER) {
    const rows = tableData.get(entry.key);
    if (!rows || rows.length === 0) continue;

    validateTable(entry, rows, allIds, errors);
  }

  return errors;
}

function validateTable(
  entry: SeedTableEntry,
  rows: unknown[],
  allIds: Map<string, Set<string>>,
  errors: ValidationError[]
): void {
  const { key, pgTable } = entry;
  const seenIds = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as Record<string, unknown>;

    if (entry.isKeyValueMap) {
      if (!row.id || typeof row.id !== "string") {
        errors.push({
          table: key,
          row: i,
          field: "id",
          message: `Missing or invalid 'id' in key-value map row`,
          severity: "error",
        });
      }
      continue;
    }

    if (!row.id || typeof row.id !== "string") {
      errors.push({
        table: key,
        row: i,
        field: "id",
        message: `Missing or non-string 'id'`,
        severity: "error",
      });
      continue;
    }

    if (seenIds.has(row.id)) {
      errors.push({
        table: key,
        row: i,
        field: "id",
        message: `Duplicate PK: "${row.id}"`,
        severity: "error",
      });
    }
    seenIds.add(row.id);

    if (entry.selfRefColumn) {
      const parentVal = row[entry.selfRefColumn];
      if (parentVal && typeof parentVal === "string" && parentVal !== "null") {
        const tableIds = allIds.get(key);
        if (tableIds && !tableIds.has(parentVal)) {
          errors.push({
            table: key,
            row: i,
            field: entry.selfRefColumn,
            message: `Self-ref FK "${parentVal}" not found in ${key}`,
            severity: "error",
          });
        }
      }
    }

    if (entry.foreignKeys) {
      for (const fk of entry.foreignKeys) {
        const fkVal = row[fk.column];
        if (fkVal && typeof fkVal === "string") {
          const refTableKey = findKeyByPgTable(fk.refTable);
          if (refTableKey) {
            const refIds = allIds.get(refTableKey);
            if (refIds && !refIds.has(fkVal)) {
              errors.push({
                table: key,
                row: i,
                field: fk.column,
                message: `FK "${fkVal}" references missing row in ${fk.refTable}`,
                severity: "error",
              });
            }
          }
        }
      }
    }
  }
}

function findKeyByPgTable(pgTable: string): string | undefined {
  return SEED_ORDER.find((e) => e.pgTable === pgTable)?.key;
}

export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return "✓ All seed data valid.";

  const lines = [`✗ ${errors.length} validation issue(s):\n`];
  for (const e of errors) {
    const loc = e.row !== undefined ? ` row ${e.row}` : "";
    const field = e.field ? `.${e.field}` : "";
    lines.push(`  [${e.severity}] ${e.table}${field}${loc}: ${e.message}`);
  }
  return lines.join("\n");
}
