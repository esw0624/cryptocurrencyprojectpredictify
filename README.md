# Predictify Monorepo

This repository is organized as an npm workspaces monorepo for a crypto market + prediction platform.

## Current Scope

The platform is currently configured for these assets:

- **Bitcoin (BTC)**
- **Ethereum (ETH)**
- **XRP**

The dashboard runs as a Vite web app deployed on Vercel and fetches market data directly from public crypto market APIs.

## Repository Structure

- `apps/web` — React + TypeScript frontend (Vite), production app for Vercel.
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

### 3) Run checks

```bash
npm run lint
npm run typecheck
npm test
```

## Architecture Playbook

For a practical implementation plan for date-based ML predictions and near real-time price updates (BTC/ETH/XRP), see `docs/CRYPTO_PREDICTION_SYSTEM_GUIDE.md`.

## Public Hosting + Custom Domain

If you want a production URL for anyone to open (and a custom domain), follow `DEPLOYMENT_GUIDE.md`.

- Fastest path: **Vercel**
- Also supported: **Netlify**

## Disclaimer

This project and its model outputs are for educational and research purposes only and **do not constitute financial advice**.
