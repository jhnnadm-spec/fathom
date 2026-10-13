-- Fathom's database. Paste all of this into Supabase → SQL Editor → Run.
-- Running it again is safe: it only creates what's missing.

-- Saved AI explanations, one row per company.
create table if not exists public.explanations (
  ticker text primary key,
  status text not null default 'none' check (status in ('none', 'working', 'ready', 'failed')),
  data jsonb,                       -- the checked explanation (kept while a newer one is written)
  filings_key text,                 -- which reports `data` was written from
  queued boolean not null default false, -- true = write (or rewrite) it when allowance is available
  attempts int not null default 0,
  last_error text,
  updated_at timestamptz not null default now()
);

-- Who asked for which company, for the per-visitor daily limit. Visitors are stored only as a one-way hash.
create table if not exists public.explain_requests (
  id bigint generated always as identity primary key,
  visitor text not null,
  ticker text not null,
  created_at timestamptz not null default now()
);
create index if not exists explain_requests_visitor_time on public.explain_requests (visitor, created_at);

-- How many explanations were written each day (UTC), to stay inside the free AI allowance.
create table if not exists public.explain_usage (
  day date primary key,
  reports int not null default 0
);

-- Only Fathom's server (using the secret key) may read or write these tables.
alter table public.explanations enable row level security;
alter table public.explain_requests enable row level security;
alter table public.explain_usage enable row level security;
revoke all on public.explanations, public.explain_requests, public.explain_usage from anon, authenticated;
grant select, insert, update, delete on public.explanations, public.explain_requests, public.explain_usage to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Decide, in one safe step, whether an explanation can be written now.
-- Returns one of:
--   'claimed'        go ahead and write it (today's count was increased)
--   'already-ready'  an up-to-date explanation already exists
--   'already-working' someone else's request is writing it right now
--   'visitor-limit'  this visitor has asked for too many new companies today
--   'queued'         today's allowance is used up; it will be written overnight
create or replace function public.claim_explanation(
  p_ticker text,
  p_filings_key text,
  p_daily_limit int,
  p_visitor text default null,
  p_visitor_limit int default 3
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.explanations%rowtype;
  used int;
  asked int;
begin
  insert into explanations (ticker) values (p_ticker) on conflict (ticker) do nothing;
  select * into row from explanations where ticker = p_ticker for update;

  if row.status = 'ready' and row.filings_key = p_filings_key then
    update explanations set queued = false where ticker = p_ticker;
    return 'already-ready';
  end if;
  if row.status = 'working' and row.updated_at > now() - interval '10 minutes' then
    return 'already-working';
  end if;

  if p_visitor is not null then
    select count(*) into asked from explain_requests
      where visitor = p_visitor and created_at > now() - interval '24 hours';
    if asked >= p_visitor_limit then
      return 'visitor-limit';
    end if;
    insert into explain_requests (visitor, ticker) values (p_visitor, p_ticker);
  end if;

  insert into explain_usage (day) values ((now() at time zone 'utc')::date) on conflict (day) do nothing;
  select reports into used from explain_usage where day = (now() at time zone 'utc')::date for update;
  if used >= p_daily_limit then
    update explanations set queued = true, updated_at = now() where ticker = p_ticker;
    return 'queued';
  end if;

  update explain_usage set reports = reports + 1 where day = (now() at time zone 'utc')::date;
  update explanations
    set status = 'working', queued = false, attempts = attempts + 1, last_error = null, updated_at = now()
    where ticker = p_ticker;
  return 'claimed';
end;
$$;

revoke all on function public.claim_explanation(text, text, int, text, int) from public, anon, authenticated;
grant execute on function public.claim_explanation(text, text, int, text, int) to service_role;
