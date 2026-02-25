/**
 * Deep comparison engine for parity testing.
 */
import type { NormalizedRow } from "./normalize";

export interface FieldDiff {
  field: string;
  expected: unknown;
  actual: unknown;
}

export interface RowDiff {
  id: string;
  status: "missing_in_pg" | "extra_in_pg" | "field_mismatch";
  fields?: FieldDiff[];
}

export interface TableDiff {
  table: string;
  match: boolean;
  expectedCount: number;
  actualCount: number;
  diffs: RowDiff[];
}

export function compareTables(
  table: string,
  expected: NormalizedRow[],
  actual: NormalizedRow[]
): TableDiff {
  const diffs: RowDiff[] = [];

  const expectedMap = new Map<string, NormalizedRow>();
  for (const row of expected) expectedMap.set(row.id, row);

  const actualMap = new Map<string, NormalizedRow>();
  for (const row of actual) actualMap.set(row.id, row);

  for (const [id, expRow] of expectedMap) {
    const actRow = actualMap.get(id);
    if (!actRow) {
      diffs.push({ id, status: "missing_in_pg" });
      continue;
    }
    const fieldDiffs = compareRows(expRow, actRow);
    if (fieldDiffs.length > 0) {
      diffs.push({ id, status: "field_mismatch", fields: fieldDiffs });
    }
  }

  for (const id of actualMap.keys()) {
    if (!expectedMap.has(id)) {
      diffs.push({ id, status: "extra_in_pg" });
    }
  }

  return {
    table,
    match: diffs.length === 0,
    expectedCount: expected.length,
    actualCount: actual.length,
    diffs,
  };
}

function compareRows(
  expected: NormalizedRow,
  actual: NormalizedRow
): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  const allKeys = new Set([
    ...Object.keys(expected),
    ...Object.keys(actual),
  ]);
  allKeys.delete("source_type");

  for (const key of allKeys) {
    const exp = expected[key];
    const act = actual[key];
    if (!deepEqual(exp, act)) {
      diffs.push({ field: key, expected: exp, actual: act });
    }
  }
  return diffs;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if ((a === null || a === undefined) && (b === null || b === undefined))
    return true;
  if (a === null || b === null || a === undefined || b === undefined)
    return false;
  if (typeof a !== typeof b) return false;

  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) < 0.0001;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }

  if (typeof a === "object" && typeof b === "object") {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const keys = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);
    for (const key of keys) {
      if (!deepEqual(aObj[key], bObj[key])) return false;
    }
    return true;
  }

  return false;
}

export function formatTableDiff(diff: TableDiff): string {
  if (diff.match) {
    return `  PASS  ${diff.table} (${diff.expectedCount} rows)`;
  }

  const lines: string[] = [
    `  FAIL  ${diff.table} (expected=${diff.expectedCount}, actual=${diff.actualCount}, diffs=${diff.diffs.length})`,
  ];

  const maxShow = 5;
  for (const d of diff.diffs.slice(0, maxShow)) {
    if (d.status === "missing_in_pg") {
      lines.push(`    - [missing] id="${d.id}"`);
    } else if (d.status === "extra_in_pg") {
      lines.push(`    - [extra]   id="${d.id}"`);
    } else if (d.fields) {
      lines.push(`    - [diff]    id="${d.id}"`);
      for (const f of d.fields.slice(0, 3)) {
        const expStr = JSON.stringify(f.expected);
        const actStr = JSON.stringify(f.actual);
        lines.push(`                ${f.field}: expected=${expStr}  actual=${actStr}`);
      }
      if (d.fields.length > 3) {
        lines.push(`                ... and ${d.fields.length - 3} more`);
      }
    }
  }

  if (diff.diffs.length > maxShow) {
    lines.push(`    ... and ${diff.diffs.length - maxShow} more diffs`);
  }

  return lines.join("\n");
}
