/**
 * Atomic JSON file read/write helpers.
 * All writes go through a temp file + rename for safety.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const TABLES_DIR = path.resolve(__dirname, '../../src/database/tables');

/** Resolve a table filename to its absolute path */
export function tablePath(filename: string): string {
  const resolved = path.resolve(TABLES_DIR, filename);
  if (!resolved.startsWith(TABLES_DIR)) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}

/** Read and parse a JSON table file. Returns the parsed data. */
export function readTable(filename: string): unknown {
  const filePath = tablePath(filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

/** Write data to a JSON table file atomically (temp + rename). */
export function writeTable(filename: string, data: unknown): void {
  const filePath = tablePath(filename);
  const tmpPath = filePath + '.tmp';
  const json = JSON.stringify(data, null, 2) + '\n';
  fs.writeFileSync(tmpPath, json, 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

/** Get file stats (for last modified time, size) */
export function tableStats(filename: string): { mtime: Date; size: number } | null {
  try {
    const filePath = tablePath(filename);
    const stat = fs.statSync(filePath);
    return { mtime: stat.mtime, size: stat.size };
  } catch {
    return null;
  }
}
