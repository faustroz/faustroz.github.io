create table if not exists public.portfolio_tracker_store (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
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

create policy "portfolio tracker public read"
on public.portfolio_tracker_store for select
to anon
using (true);

create policy "portfolio tracker public insert"
on public.portfolio_tracker_store for insert
to anon
with check (true);

create policy "portfolio tracker public update"
on public.portfolio_tracker_store for update
to anon
using (true)
with check (true);

create policy "portfolio tracker public delete"
on public.portfolio_tracker_store for delete
to anon
using (true);
