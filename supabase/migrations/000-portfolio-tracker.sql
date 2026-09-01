create table if not exists public.portfolio_tracker_store (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create or replace function public.set_portfolio_tracker_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists portfolio_tracker_store_updated_at on public.portfolio_tracker_store;

create trigger portfolio_tracker_store_updated_at
before update on public.portfolio_tracker_store
for each row
execute function public.set_portfolio_tracker_updated_at();

alter table public.portfolio_tracker_store enable row level security;

drop policy if exists "portfolio tracker public read" on public.portfolio_tracker_store;
drop policy if exists "portfolio tracker public insert" on public.portfolio_tracker_store;
drop policy if exists "portfolio tracker public update" on public.portfolio_tracker_store;
drop policy if exists "portfolio tracker public delete" on public.portfolio_tracker_store;
drop policy if exists "portfolio owner read" on public.portfolio_tracker_store;
drop policy if exists "portfolio owner insert" on public.portfolio_tracker_store;
drop policy if exists "portfolio owner update" on public.portfolio_tracker_store;
drop policy if exists "portfolio owner delete" on public.portfolio_tracker_store;

-- Values retain the existing key/value shape while every key belongs to one
-- authenticated owner. Migration 023 safely upgrades older shared-key tables.
create policy "portfolio owner read"
on public.portfolio_tracker_store for select
to authenticated
using (auth.uid() = user_id);

create policy "portfolio owner insert"
on public.portfolio_tracker_store for insert
to authenticated
with check (auth.uid() = user_id);

create policy "portfolio owner update"
on public.portfolio_tracker_store for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "portfolio owner delete"
on public.portfolio_tracker_store for delete
to authenticated
using (auth.uid() = user_id);

grant select, insert, update, delete on public.portfolio_tracker_store to authenticated;
revoke all on public.portfolio_tracker_store from anon;

-- The obsolete client-side password gate has been removed. Supabase Auth + RLS
-- are the only access controls; clear any legacy password hash if it exists.
delete from public.portfolio_tracker_store where key = 'pt_password';
