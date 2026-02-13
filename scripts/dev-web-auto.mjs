#!/usr/bin/env node
import { spawn } from 'node:child_process';

const shouldForceLite = process.env.FORCE_WEB_LITE === 'true';

if (shouldForceLite) {
  console.log('FORCE_WEB_LITE=true detected. Starting lite dashboard...');
  const lite = spawn('node', ['scripts/run-lite-web.mjs'], { stdio: 'inherit' });
  lite.on('exit', (code) => process.exit(code ?? 1));
} else {
  console.log('Trying full web workspace first (npm run dev -w @crypto/web)...');

  const full = spawn('npm', ['run', 'dev', '-w', '@crypto/web'], { stdio: 'inherit' });

  full.on('exit', (code) => {
    if (code === 0) {
      process.exit(0);
      return;
    }

    console.log('\nFull web workspace failed. Falling back to lite dashboard (no dependencies).');
    const lite = spawn('node', ['scripts/run-lite-web.mjs'], { stdio: 'inherit' });
    lite.on('exit', (liteCode) => process.exit(liteCode ?? 1));
  });
}
