#!/usr/bin/env node
/**
 * Runs Maestro E2E tests using the local installation.
 * Works without Maestro in PATH.
 */
const { execSync } = require('child_process');
const path = require('path');

const isWindows = process.platform === 'win32';
const userProfile = process.env.USERPROFILE || process.env.HOME;
const maestroBin = path.join(userProfile, 'maestro', 'maestro', 'bin');
const maestroCmd = isWindows ? path.join(maestroBin, 'maestro.bat') : path.join(maestroBin, 'maestro');

const args = process.argv.slice(2);
const fullCmd = args.length > 0 ? [maestroCmd, ...args].join(' ') : `${maestroCmd} test .maestro`;

try {
  execSync(fullCmd, { stdio: 'inherit' });
} catch (e) {
  if (e.status === 1 && e.message?.includes('ENOENT')) {
    console.error('Maestro not found at:', maestroCmd);
    console.error('Install Maestro or add it to your PATH.');
    process.exit(1);
  }
  process.exit(e.status || 1);
}
