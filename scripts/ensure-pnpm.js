#!/usr/bin/env node
// Ensure corepack & pnpm are available for teammates who run npm_install
const { spawnSync } = require('child_process');

function run(cmd, args) {
  try {
    const res = spawnSync(cmd, args, { stdio: 'inherit' });
    return res.status === 0;
  } catch (e) {
    return false;
  }
}

// Try enabling corepack (no-op on older Node where corepack isn't available)
run('corepack', ['enable']);
// Prepare a pinned pnpm version
run('corepack', ['prepare', 'pnpm@8.8.0', '--activate']);

// If corepack isn't available, try to use npm to install pnpm globally as a best-effort fallback
const hasCorepack = run('corepack', ['--version']);
if (!hasCorepack) {
  console.warn('corepack not available; attempting to install pnpm via npm');
  run('npm', ['install', '-g', 'pnpm@8.8.0']);
}

process.exit(0);
