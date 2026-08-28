-- Personal Hub Phase 4: authenticated, owner-scoped private modules.
-- Run in the Supabase SQL editor after enabling Email authentication.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  amount numeric(14,2) not null check (amount >= 0),
  category text not null default 'General',
  spent_on date not null default current_date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  limit_amount numeric(14,2) not null check (limit_amount >= 0),
  period text not null default 'monthly' check (period in ('weekly', 'monthly', 'yearly')),
  starts_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(14,2) not null check (amount >= 0),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('weekly', 'monthly', 'yearly')),
  next_billing_on date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  subject text not null default '',
  status text not null default 'planned' check (status in ('planned', 'active', 'review', 'complete')),
  progress integer not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  exam_date date,
  score numeric(6,2),
  target_score numeric(6,2),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  front text not null,
  back text not null,
  topic text not null default '',
  mastery integer not null default 0 check (mastery between 0 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hub_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  status text not null default 'planned' check (status in ('planned', 'active', 'paused', 'shipped', 'archived')),
  progress integer not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_name text not null default '',
  title text not null,
  status text not null default 'todo' check (status in ('todo', 'doing', 'blocked', 'done')),
  due_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_changelog (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_name text not null default '',
  title text not null,
  details text not null default '',
  logged_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_memory_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  kind text not null default 'context' check (kind in ('context', 'preference', 'decision', 'reference')),
  tags text[] not null default '{}',
  importance integer not null default 3 check (importance between 1 and 5),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users(id) on delete cascade,
  privacy_mode boolean not null default true,
  profile jsonb not null default '{}'::jsonb,
  integrations jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'expenses', 'budgets', 'subscriptions', 'study_topics', 'study_exams',
    'study_flashcards', 'hub_projects', 'project_tasks', 'project_changelog',
    'ai_memory_entries', 'user_settings'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists "owner select" on public.%I', table_name);
    execute format('drop policy if exists "owner insert" on public.%I', table_name);
    execute format('drop policy if exists "owner update" on public.%I', table_name);
    execute format('drop policy if exists "owner delete" on public.%I', table_name);
    execute format('create policy "owner select" on public.%I for select to authenticated using (auth.uid() = user_id)', table_name);
    execute format('create policy "owner insert" on public.%I for insert to authenticated with check (auth.uid() = user_id)', table_name);
    execute format('create policy "owner update" on public.%I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', table_name);
    execute format('create policy "owner delete" on public.%I for delete to authenticated using (auth.uid() = user_id)', table_name);
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

grant select, insert, update, delete on public.expenses to authenticated;
grant select, insert, update, delete on public.budgets to authenticated;
grant select, insert, update, delete on public.subscriptions to authenticated;
grant select, insert, update, delete on public.study_topics to authenticated;
grant select, insert, update, delete on public.study_exams to authenticated;
grant select, insert, update, delete on public.study_flashcards to authenticated;
grant select, insert, update, delete on public.hub_projects to authenticated;
grant select, insert, update, delete on public.project_tasks to authenticated;
grant select, insert, update, delete on public.project_changelog to authenticated;
grant select, insert, update, delete on public.ai_memory_entries to authenticated;
grant select, insert, update, delete on public.user_settings to authenticated;

-- Preserve the existing Portfolio storage shape and data while removing anon access.
-- This assumes the Personal Hub has a single authenticated owner account.
alter table public.portfolio_tracker_store enable row level security;
drop policy if exists "portfolio tracker public read" on public.portfolio_tracker_store;
drop policy if exists "portfolio tracker public insert" on public.portfolio_tracker_store;
drop policy if exists "portfolio tracker public update" on public.portfolio_tracker_store;
drop policy if exists "portfolio tracker public delete" on public.portfolio_tracker_store;
drop policy if exists "portfolio owner read" on public.portfolio_tracker_store;
drop policy if exists "portfolio owner insert" on public.portfolio_tracker_store;
drop policy if exists "portfolio owner update" on public.portfolio_tracker_store;
drop policy if exists "portfolio owner delete" on public.portfolio_tracker_store;
create policy "portfolio owner read" on public.portfolio_tracker_store for select to authenticated using (true);
create policy "portfolio owner insert" on public.portfolio_tracker_store for insert to authenticated with check (true);
create policy "portfolio owner update" on public.portfolio_tracker_store for update to authenticated using (true) with check (true);
create policy "portfolio owner delete" on public.portfolio_tracker_store for delete to authenticated using (true);
grant select, insert, update, delete on public.portfolio_tracker_store to authenticated;
revoke all on public.portfolio_tracker_store from anon;
