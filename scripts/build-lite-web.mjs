#!/usr/bin/env node
import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const sourceDir = resolve(process.cwd(), 'apps/web-lite');
const outputDir = resolve(sourceDir, 'dist');

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

await cp(resolve(sourceDir, 'index.html'), resolve(outputDir, 'index.html'));
await cp(resolve(sourceDir, 'index.html'), resolve(outputDir, '404.html'));

console.log(`Lite web build complete: ${outputDir}`);
