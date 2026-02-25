/**
 * Normalization contract for parity comparison.
 *
 * Codified rules applied to both JSON truth and Postgres output
 * so that superficial differences (whitespace, null vs undefined,
 * number vs string) don't cause false parity failures.
 */

export interface NormalizedRow {
  id: string;
  [key: string]: unknown;
}

export function normalizeTable(
  rows: unknown[],
  isKeyValueMap = false
): NormalizedRow[] {
  const normalized = rows.map((row) =>
    normalizeRow(row as Record<string, unknown>)
  );

  return normalized.sort((a, b) => {
    const aSort = Number(a.sort_order ?? 0);
    const bSort = Number(b.sort_order ?? 0);
    if (aSort !== bSort) return aSort - bSort;
    return String(a.id).localeCompare(String(b.id));
  });
}

export function normalizeRow(
  row: Record<string, unknown>
): NormalizedRow {
  const result: NormalizedRow = { id: "" };

  const infraColumns = new Set(["source_type", "is_active"]);

  for (const [key, value] of Object.entries(row)) {
    if (infraColumns.has(key)) continue;
    if (key.startsWith("_")) continue;

    result[key] = normalizeValue(value, key);
  }

  return result;
}

function normalizeValue(value: unknown, key?: string): unknown {
  if (value === undefined || value === null) return null;
  if (value === "") return null;

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed === "" || trimmed === "null") return null;
    if (trimmed === "[]") return [];
    if (trimmed === "{}") return {};

    if (isJsonString(trimmed)) {
      try {
        return normalizeValue(JSON.parse(trimmed), key);
      } catch {
        return trimmed;
      }
    }

    if (trimmed === "true") return true;
    if (trimmed === "false") return false;

    return trimmed;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    const normalized = value.map((v) => normalizeValue(v));
    if (isNonSemanticOrder(key)) {
      return [...normalized].sort((a, b) =>
        String(a).localeCompare(String(b))
      );
    }
    return normalized;
  }

  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj).sort(([a], [b]) =>
      a.localeCompare(b)
    )) {
      normalized[k] = normalizeValue(v, k);
    }
    return normalized;
  }

  return value;
}

function isJsonString(s: string): boolean {
  return (
    (s.startsWith("{") && s.endsWith("}")) ||
    (s.startsWith("[") && s.endsWith("]"))
  );
}

/**
 * Array fields where order is not semantic (can be sorted for comparison).
 */
function isNonSemanticOrder(key?: string): boolean {
  if (!key) return false;
  return ["common_names", "parent_ids", "upper_lower"].includes(key);
}
