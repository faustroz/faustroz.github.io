-- Phase 14: per-user, revocable API keys for iPhone Quick Expense shortcuts.
-- Apply after 009-finance-accounts.sql and 010-finance-income-categories.sql.
-- Raw API keys are never stored here: only a SHA-256 hash is persisted.

create table if not exists public.quick_expense_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  token_hash text not null unique check (char_length(token_hash) = 64),
  label text not null default 'iPhone Shortcut' check (char_length(label) between 1 and 80),
  expires_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.quick_expense_api_keys enable row level security;
drop policy if exists "owner select" on public.quick_expense_api_keys;
drop policy if exists "owner insert" on public.quick_expense_api_keys;
drop policy if exists "owner update" on public.quick_expense_api_keys;
drop policy if exists "owner delete" on public.quick_expense_api_keys;
create policy "owner select" on public.quick_expense_api_keys for select to authenticated using (auth.uid() = user_id);
create policy "owner insert" on public.quick_expense_api_keys for insert to authenticated with check (auth.uid() = user_id);
create policy "owner update" on public.quick_expense_api_keys for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner delete" on public.quick_expense_api_keys for delete to authenticated using (auth.uid() = user_id);
grant select, insert, update, delete on public.quick_expense_api_keys to authenticated;
