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


## Supabase Auth Setup (Client + Admin UI)

The web app now includes two sign-in experiences:

- **Client Sign In**: passwordless email magic link (`signInWithOtp`) with email verification.
- **Admin Sign In**: email + password (`signInWithPassword`) and admin-role checks.

Create `apps/web/.env.local`:

```bash
VITE_SUPABASE_URL=https://pietlhvbfihcgfxmoysn.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_<your-publishable-key>
# Backward-compatible alias (optional)
VITE_SUPABASE_ANON_KEY=sb_publishable_<your-publishable-key>
# Optional: comma-separated admin email allowlist
VITE_ADMIN_EMAIL_ALLOWLIST=admin@yourcompany.com
# Optional if API runs on a different host
VITE_API_BASE_URL=http://localhost:4000/api
```

For backend/database environment (root `.env` or `apps/api/.env`):

```bash
SUPABASE_URL=https://pietlhvbfihcgfxmoysn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Connection pooling (app/runtime)
DATABASE_URL="postgresql://postgres.pietlhvbfihcgfxmoysn:[YOUR-PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection (migrations)
DIRECT_URL="postgresql://postgres.pietlhvbfihcgfxmoysn:[YOUR-PASSWORD]@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
```

In Supabase dashboard:

1. Enable **Email** provider in Auth settings.
2. Configure your redirect URL to include your app origin (e.g. `http://localhost:5173`).
3. For admins, either:
   - set `app_metadata.role = "admin"`, or
   - add their email to `VITE_ADMIN_EMAIL_ALLOWLIST`.

With this setup, clients are verified via email before signing in, while admins get a separate UI and access to the admin console.

## Architecture Playbook

For a practical implementation plan for date-based ML predictions and near real-time price updates (BTC/ETH/XRP), see `docs/CRYPTO_PREDICTION_SYSTEM_GUIDE.md`.

## Platform Expansion Roadmap

After the API reliability foundation is stable, the next implementation phases are:

1. **Auth** — Supabase Auth integration with JWT-backed sessions.
2. **Alerts + Notifications** — User-defined alert rules and scheduled notification jobs (email, push, webhook).
3. **User Portfolio Features** — Portfolio tracking and watchlists.
4. **Billing + Tiering** — Subscription plans, usage tiers, and rate limits.
5. **Audit/Admin Controls** — Audit logs, admin visibility, and control surfaces.

## Platform Feature Foundations (Implemented)

The API now includes foundational authenticated endpoints for core platform capabilities:

- `GET /api/me` — current authenticated user context
- Alerts: `GET/POST/DELETE /api/alerts/rules`
- Portfolio: `GET/POST /api/portfolio/positions`
- Watchlists: `GET/POST/DELETE /api/watchlists/items`
- Billing tier profile: `GET /api/billing/profile`, `POST /api/billing/profile/tier`
- Admin audit logs: `GET /api/admin/audit-logs` (admin role only)

For local development, use `Authorization: Bearer dev_<userId>` (e.g. `dev_demo` or `dev_admin`) to authenticate requests against these new endpoints.

## Public Hosting + Custom Domain

If you want a production URL for anyone to open (and a custom domain), follow `DEPLOYMENT_GUIDE.md`.

- Fastest path: **Vercel**
- Also supported: **Netlify**

## Disclaimer

This project and its model outputs are for educational and research purposes only and **do not constitute financial advice**.
