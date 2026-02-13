#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const envRegistry = process.env.NPM_REGISTRY_URL?.trim();
const registries = [
  envRegistry,
  'https://registry.npmjs.org',
  'https://registry.npmmirror.com',
  'https://registry.yarnpkg.com'
].filter(Boolean);

function run(cmd, args) {
  return spawnSync(cmd, args, { stdio: 'pipe', encoding: 'utf8' });
}

for (const registry of registries) {
  process.stdout.write(`\nTrying registry: ${registry}\n`);

  const probe = run('npm', ['view', 'eslint', 'version', '--registry', registry]);
  if (probe.status !== 0) {
    process.stdout.write(`Probe failed (${probe.status ?? 'unknown'}).\n`);
    process.stdout.write((probe.stderr || probe.stdout).trim() + '\n');
    continue;
  }

  process.stdout.write(`Probe succeeded (eslint@${probe.stdout.trim()}). Installing dependencies...\n`);
  const install = run('npm', ['install', '--registry', registry]);
  process.stdout.write(install.stdout);
  process.stderr.write(install.stderr);

  if (install.status === 0) {
    process.stdout.write(`\nDependency installation succeeded using ${registry}.\n`);
    process.exit(0);
  }

  process.stdout.write(`Install failed for ${registry}, trying next registry.\n`);
}

process.stderr.write('\nUnable to install dependencies from the attempted registries.\n');
process.stderr.write('Set NPM_REGISTRY_URL to your organization\'s internal npm proxy (Artifactory/Nexus/GitHub Packages) and run this script again.\n');
process.exit(1);
