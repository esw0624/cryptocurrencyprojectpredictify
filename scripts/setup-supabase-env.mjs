#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const force = process.argv.includes('--force');

const files = [
  {
    path: '.env',
    content: `# Supabase backend/server variables\nSUPABASE_URL=https://pietlhvbfihcgfxmoysn.supabase.co\nSUPABASE_SERVICE_ROLE_KEY=your-service-role-key\n\n# Connection pooling (transaction mode)\nDATABASE_URL=\"postgresql://postgres.pietlhvbfihcgfxmoysn:[YOUR-PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true\"\n\n# Direct connection (migrations)\nDIRECT_URL=\"postgresql://postgres:[YOUR-PASSWORD]@db.pietlhvbfihcgfxmoysn.supabase.co:5432/postgres\"\n`
  },
  {
    path: 'apps/web/.env.local',
    content: `VITE_SUPABASE_URL=https://pietlhvbfihcgfxmoysn.supabase.co\nVITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpZXRsaHZiZmloY2dmeG1veXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MTk0NTMsImV4cCI6MjA4NjQ5NTQ1M30.UaXACKWyUR8vYJQT9Fd-eXXnIK4s2mkF7Dk0V694Qg8\n# Optional backward-compatible alias\nVITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpZXRsaHZiZmloY2dmeG1veXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MTk0NTMsImV4cCI6MjA4NjQ5NTQ1M30.UaXACKWyUR8vYJQT9Fd-eXXnIK4s2mkF7Dk0V694Qg8\n# Set this to your admin email(s), comma-separated\nVITE_ADMIN_EMAIL_ALLOWLIST=you@example.com\n# Optional if API runs on a different host\nVITE_API_BASE_URL=http://localhost:4000/api\n`
  }
];

for (const file of files) {
  await mkdir(dirname(file.path), { recursive: true });

  if (existsSync(file.path) && !force) {
    const current = await readFile(file.path, 'utf8');
    if (current.trim().length > 0) {
      console.log(`Skipped ${file.path} (already exists). Use --force to overwrite.`);
      continue;
    }
  }

  await writeFile(file.path, file.content, 'utf8');
  console.log(`Created ${file.path}`);
}

console.log('\nNext: update SUPABASE_SERVICE_ROLE_KEY and DB password placeholders before running the API.');
