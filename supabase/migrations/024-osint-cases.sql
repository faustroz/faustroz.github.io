-- Phase 24: owner-private OSINT cases. Lookup results remain ephemeral unless
-- the authenticated owner explicitly inserts a selected finding here.

create table if not exists public.osint_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  notes text not null default '' check (char_length(notes) <= 4000),
  status text not null default 'active' check (status in ('active', 'paused', 'closed')),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create table if not exists public.osint_case_findings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  case_id uuid not null,
  finding_type text not null check (finding_type in ('identifier', 'username', 'platform', 'profile', 'domain', 'email', 'phone', 'other')),
  label text not null check (char_length(btrim(label)) between 1 and 160),
  value text not null default '' check (char_length(value) <= 1000),
  source text not null default 'manual' check (char_length(btrim(source)) between 1 and 80),
  confidence text not null default 'uncertain' check (confidence in ('confirmed', 'possible', 'uncertain')),
  url text not null default '' check (char_length(url) <= 1000),
  notes text not null default '' check (char_length(notes) <= 2000),
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint osint_case_findings_owner_case_fk foreign key (user_id, case_id)
    references public.osint_cases (user_id, id) on delete cascade
);

create index if not exists osint_cases_owner_updated_idx on public.osint_cases (user_id, updated_at desc);
create index if not exists osint_findings_owner_case_observed_idx on public.osint_case_findings (user_id, case_id, observed_at desc);

alter table public.osint_cases enable row level security;
alter table public.osint_case_findings enable row level security;

drop policy if exists "owner select" on public.osint_cases;
drop policy if exists "owner insert" on public.osint_cases;
drop policy if exists "owner update" on public.osint_cases;
drop policy if exists "owner delete" on public.osint_cases;
create policy "owner select" on public.osint_cases for select to authenticated using (auth.uid() = user_id);
create policy "owner insert" on public.osint_cases for insert to authenticated with check (auth.uid() = user_id);
create policy "owner update" on public.osint_cases for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner delete" on public.osint_cases for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "owner select" on public.osint_case_findings;
drop policy if exists "owner insert" on public.osint_case_findings;
drop policy if exists "owner update" on public.osint_case_findings;
drop policy if exists "owner delete" on public.osint_case_findings;
create policy "owner select" on public.osint_case_findings for select to authenticated using (auth.uid() = user_id);
create policy "owner insert" on public.osint_case_findings for insert to authenticated with check (auth.uid() = user_id);
create policy "owner update" on public.osint_case_findings for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner delete" on public.osint_case_findings for delete to authenticated using (auth.uid() = user_id);

drop trigger if exists set_osint_cases_updated_at on public.osint_cases;
create trigger set_osint_cases_updated_at before update on public.osint_cases for each row execute function public.set_updated_at();
drop trigger if exists set_osint_findings_updated_at on public.osint_case_findings;
create trigger set_osint_findings_updated_at before update on public.osint_case_findings for each row execute function public.set_updated_at();

revoke all on public.osint_cases, public.osint_case_findings from anon;
grant select, insert, update, delete on public.osint_cases, public.osint_case_findings to authenticated;
