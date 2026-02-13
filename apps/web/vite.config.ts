import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'cryptocurrencyproject';
const githubPagesBase = process.env.GITHUB_PAGES === 'true' ? `/${repositoryName}/` : '/';

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? githubPagesBase,
  plugins: [react()],
  server: {
    port: 5173,
  },
});
