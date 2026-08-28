-- Personal Hub Phase 10: private income ledger and custom finance categories.
-- Apply after supabase-phase9-finance-accounts.sql.

create table if not exists public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  kind text not null default 'expense' check (kind in ('income', 'expense', 'both')),
  color text not null default '#a1a1aa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name, kind)
);

create table if not exists public.income_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  amount numeric(14,2) not null check (amount >= 0),
  category text not null default 'General',
  bank_account_name text not null default '',
  received_on date not null default current_date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare table_name text;
begin
  foreach table_name in array array['finance_categories', 'income_entries'] loop
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
end $$;
grant select, insert, update, delete on public.finance_categories, public.income_entries to authenticated;
