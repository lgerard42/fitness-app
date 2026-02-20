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

/**
 * Blocking sleep for use in sync contexts.
 * Uses a simple busy-wait loop (acceptable for short delays < 200ms).
 */
function sleepSync(ms: number): void {
  const start = Date.now();
  while (Date.now() - start < ms) {
    // Busy wait - acceptable for short delays in sync code
  }
}

/** Write data to a JSON table file atomically (temp + rename). */
export function writeTable(filename: string, data: unknown): void {
  const filePath = tablePath(filename);
  const tmpPath = filePath + '.tmp';
  const json = JSON.stringify(data, null, 2) + '\n';
  fs.writeFileSync(tmpPath, json, 'utf-8');
  
  // Retry rename operation on Windows to handle file locking issues
  // (e.g., file watchers, antivirus, IDE keeping file open)
  const maxRetries = 5;
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      fs.renameSync(tmpPath, filePath);
      return; // Success
    } catch (err) {
      const nodeErr = err as NodeJS.ErrnoException;
      lastError = err as Error;
      
      // Only retry on EPERM or EBUSY errors (Windows file locking)
      if (attempt < maxRetries - 1 && (nodeErr.code === 'EPERM' || nodeErr.code === 'EBUSY')) {
        // Exponential backoff: 10ms, 20ms, 40ms, 80ms, 160ms
        const delay = Math.min(10 * Math.pow(2, attempt), 200);
        sleepSync(delay);
        continue;
      }
      
      // If it's not a retryable error or we've exhausted retries, throw
      throw err;
    }
  }
  
  // Should never reach here, but TypeScript needs this
  throw lastError || new Error('Failed to rename file after retries');
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
