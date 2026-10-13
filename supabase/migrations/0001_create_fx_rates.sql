-- Daily exchange-rate snapshots, written and read only by the ITER backend.
-- Already applied to the "iter" Supabase project. Kept here as the record of the database's shape.
create table if not exists public.fx_rates (
  rate_date date not null,
  base text not null default 'MYR',
  quote text not null,
  -- Units of the quote currency per 1 unit of base.
  rate numeric not null check (rate > 0),
  fetched_at timestamptz not null default now(),
  primary key (rate_date, base, quote)
);

comment on table public.fx_rates is 'Daily FX snapshots from Frankfurter, cached by the ITER backend.';

-- Row level security on with no policies: the public (browser) key can read or write nothing.
-- Only the backend, using the secret key, can access this table.
alter table public.fx_rates enable row level security;
