create extension if not exists "pgcrypto";

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  symbol text not null unique,
  name text not null,
  coingecko_id text unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.candles (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  source text not null,
  granularity text not null,
  timestamp timestamptz not null,
  open numeric(20, 8) not null,
  high numeric(20, 8) not null,
  low numeric(20, 8) not null,
  close numeric(20, 8) not null,
  volume numeric(28, 8) not null,
  created_at timestamptz not null default now(),
  unique (asset_id, source, granularity, timestamp)
);

create table if not exists public.model_runs (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  model_version text not null,
  training_window_start timestamptz not null,
  training_window_end timestamptz not null,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  model_run_id uuid references public.model_runs(id) on delete set null,
  horizon integer not null check (horizon > 0),
  predicted_price numeric(20, 8) not null,
  confidence numeric(5, 4),
  prediction_timestamp timestamptz not null,
  created_at timestamptz not null default now(),
  unique (asset_id, model_run_id, horizon, prediction_timestamp)
);

create index if not exists candles_asset_id_timestamp_idx
  on public.candles(asset_id, timestamp);

create index if not exists predictions_asset_id_horizon_created_at_idx
  on public.predictions(asset_id, horizon, created_at);
