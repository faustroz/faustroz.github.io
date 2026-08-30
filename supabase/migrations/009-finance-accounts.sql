-- Personal Hub Phase 9: owner-scoped bank balances and expense account attribution.
-- Apply after 004-private-modules.sql.

create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  bank_name text not null,
  account_type text not null default 'bank' check (account_type in ('bank', 'e-wallet', 'cash', 'other')),
  balance numeric(14,2) not null default 0,
  currency text not null default 'IDR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.expenses add column if not exists bank_account_name text not null default '';
alter table public.bank_accounts enable row level security;
drop policy if exists "owner select" on public.bank_accounts;
drop policy if exists "owner insert" on public.bank_accounts;
drop policy if exists "owner update" on public.bank_accounts;
drop policy if exists "owner delete" on public.bank_accounts;
create policy "owner select" on public.bank_accounts for select to authenticated using (auth.uid() = user_id);
create policy "owner insert" on public.bank_accounts for insert to authenticated with check (auth.uid() = user_id);
create policy "owner update" on public.bank_accounts for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner delete" on public.bank_accounts for delete to authenticated using (auth.uid() = user_id);
drop trigger if exists set_bank_accounts_updated_at on public.bank_accounts;
create trigger set_bank_accounts_updated_at before update on public.bank_accounts for each row execute function public.set_updated_at();
grant select, insert, update, delete on public.bank_accounts to authenticated;
