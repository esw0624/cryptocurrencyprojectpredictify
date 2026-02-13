# Predictify Monorepo

This repository is organized as an npm workspaces monorepo for a crypto market + prediction platform.

## Current Scope

The platform is currently configured for these assets:

- **Bitcoin (BTC)**
- **Ethereum (ETH)**
- **XRP**

The dashboard now runs as a static web app and fetches market data directly from the Binance public market data API, which makes it deployable to GitHub Pages without running a backend server.

## Repository Structure

- `apps/web` — React + TypeScript frontend (Vite), GitHub Pages ready.
- `apps/api` — TypeScript backend (optional for future server-side features).
- `packages/shared` — Shared TypeScript interfaces and DTOs.
- `src` + `tests` — Baseline data pipeline utilities and tests.

## Local Development

### 1) Install dependencies

```bash
npm install
```

If install fails with `403 Forbidden`, try the smart installer script that checks multiple registries and falls back automatically:

```bash
npm run install:deps
```

If your company uses an internal npm proxy, set it explicitly:

```bash
NPM_REGISTRY_URL=https://<your-internal-registry> npm run install:deps
```

### 2) Run the web app

```bash
npm run dev:web
```

- Web default: `http://localhost:5173`

If your environment can't install workspace dependencies, use an automatic fallback command:

```bash
npm run dev:web:auto
```

- Tries full React/Vite app first
- Automatically falls back to lite dashboard if dependencies are unavailable

### Troubleshooting restricted environments

If `npm install` cannot access the npm registry in your environment, you can still run a lightweight dashboard that requires **no external dependencies**:

```bash
npm run dev:web:lite
```

- Runs at `http://localhost:5173`
- Uses Binance public market API directly
- Intended as a fallback when workspace dependencies cannot be installed

You can also build a GitHub Pages compatible lite artifact locally without workspace dependencies:

```bash
npm run build:web:lite
```

- Outputs static files to `apps/web-lite/dist`

### 3) Run checks

```bash
npm run lint
npm run typecheck
npm test
```

## GitHub Pages Deployment

A workflow is included at `.github/workflows/deploy-pages.yml`.

### One-time GitHub setup

1. Push this repository to GitHub.
2. In your repository settings, go to **Pages**.
3. Set **Source** to **GitHub Actions**.

### Deploy

- Push to `main` or `master` to auto-deploy, or manually run the **Deploy Web to GitHub Pages** workflow.
- The workflow now auto-falls back to deploying the lite dashboard if dependency install/build fails in CI.


If your GitHub Pages URL still shows the repository README instead of the app:

1. Open **Settings → Pages** for the repository.
2. Confirm **Source** is set to **GitHub Actions** (not branch deployment).
3. In **Actions**, make sure the `Deploy Web to GitHub Pages` workflow is the one deploying.
4. Keep the `Deploy static content to Pages` and Jekyll workflows manual-only (or disabled), then re-run `Deploy Web to GitHub Pages` after your latest push.

Expected URL format:

- `https://<your-github-username>.github.io/cryptocurrencyproject/`


## Public Hosting + Custom Domain

If you want a production URL for anyone to open (and a custom domain), follow `DEPLOYMENT_GUIDE.md`.

- Fastest path: **Vercel**
- Also supported: **Netlify**
- Existing option: **GitHub Pages**

## Disclaimer

This project and its model outputs are for educational and research purposes only and **do not constitute financial advice**.
