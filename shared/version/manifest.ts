import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export interface VersionManifest {
  version: string;
  generatedAt: string;
  tableHashes: Record<string, string>;
  engineVersion: string;
}

const ENGINE_VERSION = "1.0.0";

/**
 * Compute a SHA-256 hash of a file's contents.
 */
function hashFile(filePath: string): string {
  const content = fs.readFileSync(filePath, "utf-8");
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 12);
}

/**
 * Generate a version manifest from the current state of all JSON table files.
 * Used for cache invalidation and mobile reseed triggers.
 */
export function generateManifest(tablesDir: string): VersionManifest {
  const files = fs
    .readdirSync(tablesDir)
    .filter((f) => f.endsWith(".json"));

  const tableHashes: Record<string, string> = {};
  for (const file of files) {
    const key = file.replace(".json", "");
    tableHashes[key] = hashFile(path.join(tablesDir, file));
  }

  const combinedHash = crypto
    .createHash("sha256")
    .update(
      Object.entries(tableHashes)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${v}`)
        .join("|")
    )
    .digest("hex")
    .slice(0, 16);

  return {
    version: combinedHash,
    generatedAt: new Date().toISOString(),
    tableHashes,
    engineVersion: ENGINE_VERSION,
  };
}

/**
 * Check if the manifest has changed since a previous version.
 */
export function hasChanged(
  current: VersionManifest,
  previous: VersionManifest | null
): boolean {
  if (!previous) return true;
  return current.version !== previous.version;
}

/**
 * Get list of tables that changed between two manifests.
 */
export function changedTables(
  current: VersionManifest,
  previous: VersionManifest
): string[] {
  const changed: string[] = [];
  for (const [key, hash] of Object.entries(current.tableHashes)) {
    if (previous.tableHashes[key] !== hash) {
      changed.push(key);
    }
  }
  for (const key of Object.keys(previous.tableHashes)) {
    if (!(key in current.tableHashes)) {
      changed.push(key);
    }
  }
  return changed;
}
