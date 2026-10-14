-- Scan limits and the scan cache, written and read only by the ITER backend.
-- Already applied to the "iter" Supabase project. Kept here as the record of the database's shape.

-- How many AI scans each device has used each day (UTC), per kind. Protects the Anthropic bill.
create table if not exists public.scan_usage (
  device_id text not null,
  day date not null,
  kind text not null check (kind in ('receipt', 'menu')),
  count integer not null default 0 check (count >= 0),
  primary key (device_id, day, kind)
);

comment on table public.scan_usage is 'AI scans used per device per UTC day. Written by the ITER backend.';

-- What the AI read from an image, keyed by a hash of the image and the prompt version,
-- so scanning the same photo again costs nothing and is instant.
create table if not exists public.scan_cache (
  cache_key text primary key,
  kind text not null check (kind in ('receipt', 'menu')),
  result jsonb not null,
  model_used text not null,
  created_at timestamptz not null default now()
);

comment on table public.scan_cache is 'AI scan results by image hash. Written by the ITER backend.';

-- Row level security on with no policies: the public (browser) key can read or write nothing.
alter table public.scan_usage enable row level security;
alter table public.scan_cache enable row level security;

-- Takes one scan from a device's daily allowance, all in one step so two scans at once cannot
-- both slip under the limit. Returns whether the scan is allowed and how many are left.
create or replace function public.claim_scan(
  p_device_id text,
  p_kind text,
  p_day date,
  p_device_limit integer,
  p_global_limit integer
) returns table (allowed boolean, device_used integer, global_used integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_global integer;
  v_device integer;
begin
  select coalesce(sum(u.count), 0) into v_global from public.scan_usage u where u.day = p_day;
  if v_global >= p_global_limit then
    select coalesce(max(u.count), 0) into v_device
      from public.scan_usage u where u.device_id = p_device_id and u.day = p_day and u.kind = p_kind;
    return query select false, v_device, v_global;
    return;
  end if;

  insert into public.scan_usage as u (device_id, day, kind, count)
  values (p_device_id, p_day, p_kind, 1)
  on conflict (device_id, day, kind) do update set count = u.count + 1
    where u.count < p_device_limit
  returning u.count into v_device;

  if v_device is null then
    -- The device has already used its allowance today.
    select u.count into v_device
      from public.scan_usage u where u.device_id = p_device_id and u.day = p_day and u.kind = p_kind;
    return query select false, v_device, v_global;
  else
    return query select true, v_device, v_global + 1;
  end if;
end;
$$;

-- Gives a scan back when the AI could not read the image, so a failed scan is not counted.
create or replace function public.release_scan(p_device_id text, p_kind text, p_day date)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.scan_usage set count = greatest(count - 1, 0)
  where device_id = p_device_id and day = p_day and kind = p_kind;
$$;

-- Only the backend (secret key) may call these.
revoke all on function public.claim_scan(text, text, date, integer, integer) from public, anon, authenticated;
revoke all on function public.release_scan(text, text, date) from public, anon, authenticated;
grant execute on function public.claim_scan(text, text, date, integer, integer) to service_role;
grant execute on function public.release_scan(text, text, date) to service_role;
