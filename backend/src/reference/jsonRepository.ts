import fs from "node:fs";
import path from "node:path";
import { config } from "../config";
import type { ReferenceDataRepository, TableInfo } from "./repository";

interface TableRegistryEntry {
  key: string;
  file: string;
  label: string;
  group: string;
  isKeyValueMap?: boolean;
}

let registry: TableRegistryEntry[] | null = null;

function getRegistry(): TableRegistryEntry[] {
  if (registry) return registry;

  const registryPath = path.resolve(
    __dirname,
    "../../../admin/server/tableRegistry.ts"
  );

  if (!fs.existsSync(registryPath)) {
    console.warn(
      "Admin tableRegistry not found, using fallback directory scan"
    );
    return scanTablesDir();
  }

  const raw = fs.readFileSync(registryPath, "utf-8");
  const entries: TableRegistryEntry[] = [];
  const regex = /key:\s*'(\w+)',\s*\n\s*file:\s*'([^']+)',\s*\n\s*label:\s*'([^']+)',\s*\n\s*group:\s*'([^']+)'/g;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    entries.push({
      key: match[1],
      file: match[2],
      label: match[3],
      group: match[4],
    });
  }

  if (entries.length === 0) {
    return scanTablesDir();
  }

  registry = entries;
  return entries;
}

function scanTablesDir(): TableRegistryEntry[] {
  const dir = config.tablesDir;
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  return files.map((file) => {
    const key = file.replace(".json", "");
    return {
      key,
      file,
      label: key.replace(/([A-Z])/g, " $1").trim(),
      group: "Reference",
    };
  });
}

function tablePath(filename: string): string {
  const resolved = path.resolve(config.tablesDir, filename);
  if (!resolved.startsWith(path.resolve(config.tablesDir))) {
    throw new Error("Path traversal detected");
  }
  return resolved;
}

function readTable(filename: string): unknown {
  const filePath = tablePath(filename);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

function writeTable(filename: string, data: unknown): void {
  const filePath = tablePath(filename);
  const tmpPath = filePath + ".tmp";
  const json = JSON.stringify(data, null, 2) + "\n";
  fs.writeFileSync(tmpPath, json, "utf-8");
  fs.renameSync(tmpPath, filePath);
}

export class JsonFileRepository implements ReferenceDataRepository {
  async listTables(): Promise<TableInfo[]> {
    const entries = getRegistry();
    return entries.map((entry) => {
      let rowCount = 0;
      try {
        const data = readTable(entry.file);
        if (Array.isArray(data)) {
          rowCount = data.length;
        } else if (data && typeof data === "object") {
          rowCount = Object.keys(data).length;
        }
      } catch {
        // file may not exist
      }
      return {
        key: entry.key,
        label: entry.label,
        group: entry.group,
        file: entry.file,
        rowCount,
      };
    });
  }

  async getTable(key: string): Promise<unknown> {
    const entry = getRegistry().find((e) => e.key === key);
    if (!entry) throw new Error(`Table "${key}" not found`);
    return readTable(entry.file);
  }

  async putTable(key: string, data: unknown): Promise<void> {
    const entry = getRegistry().find((e) => e.key === key);
    if (!entry) throw new Error(`Table "${key}" not found`);
    writeTable(entry.file, data);
  }
}
