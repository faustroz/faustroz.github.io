-- Phase 28: owner-private account transfers and balance reconciliation.
-- Apply after 026-exact-cashflow-account-balances.sql.

create table if not exists public.bank_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  from_account_id uuid not null references public.bank_accounts(id) on delete restrict,
  to_account_id uuid not null references public.bank_accounts(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  transferred_on date not null default current_date,
  notes text not null default '',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bank_transfers_distinct_accounts check (from_account_id <> to_account_id)
);

create table if not exists public.bank_account_reconciliations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  bank_account_id uuid not null references public.bank_accounts(id) on delete restrict,
  statement_balance numeric(14,2) not null,
  ledger_balance numeric(14,2) not null,
  difference numeric(14,2) generated always as (statement_balance - ledger_balance) stored,
  reconciled_on date not null default current_date,
  notes text not null default '',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bank_transfers enable row level security;
alter table public.bank_account_reconciliations enable row level security;

do $$ declare table_name text; begin
  foreach table_name in array array['bank_transfers','bank_account_reconciliations'] loop
    execute format('drop policy if exists "owner select" on public.%I', table_name);
    execute format('drop policy if exists "owner insert" on public.%I', table_name);
    execute format('drop policy if exists "owner update" on public.%I', table_name);
    execute format('drop policy if exists "owner delete" on public.%I', table_name);
    execute format('create policy "owner select" on public.%I for select to authenticated using (auth.uid() = user_id)', table_name);
    execute format('create policy "owner insert" on public.%I for insert to authenticated with check (auth.uid() = user_id)', table_name);
    execute format('create policy "owner update" on public.%I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', table_name);
    execute format('create policy "owner delete" on public.%I for delete to authenticated using (auth.uid() = user_id)', table_name);
  end loop;
end $$;

create or replace function public.apply_bank_transfer_balance(
  p_user_id uuid,
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount numeric,
  p_direction integer
) returns void language plpgsql security definer set search_path = public as $$
declare matched_accounts integer;
begin
  if p_amount <= 0 or p_direction not in (-1, 1) or p_from_account_id = p_to_account_id then
    raise exception 'Invalid bank transfer';
  end if;

  select count(*) into matched_accounts
  from public.bank_accounts account
  where account.user_id = p_user_id
    and account.id in (p_from_account_id, p_to_account_id)
    and account.deleted_at is null;

  if matched_accounts <> 2 then
    raise exception 'Transfer accounts must belong to the authenticated owner';
  end if;

  update public.bank_accounts account
  set balance = account.balance + case
    when account.id = p_from_account_id then -p_amount * p_direction
    when account.id = p_to_account_id then p_amount * p_direction
    else 0
  end
  where account.user_id = p_user_id
    and account.id in (p_from_account_id, p_to_account_id)
    and account.deleted_at is null
    and (p_direction = -1 or account.id <> p_from_account_id or account.balance >= p_amount);
  get diagnostics matched_accounts = row_count;
  if matched_accounts <> 2 then raise exception 'Insufficient transfer balance'; end if;
end;
$$;

create or replace function public.sync_bank_balance_from_transfer()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.deleted_at is null then
    perform public.apply_bank_transfer_balance(new.user_id, new.from_account_id, new.to_account_id, new.amount, 1);
  elsif tg_op = 'DELETE' and old.deleted_at is null then
    perform public.apply_bank_transfer_balance(old.user_id, old.from_account_id, old.to_account_id, old.amount, -1);
  elsif tg_op = 'UPDATE' then
    if old.deleted_at is null then
      perform public.apply_bank_transfer_balance(old.user_id, old.from_account_id, old.to_account_id, old.amount, -1);
    end if;
    if new.deleted_at is null then
      perform public.apply_bank_transfer_balance(new.user_id, new.from_account_id, new.to_account_id, new.amount, 1);
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.snapshot_reconciliation_balance()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT'
     or new.bank_account_id is distinct from old.bank_account_id
     or new.statement_balance is distinct from old.statement_balance then
    select account.balance into new.ledger_balance
    from public.bank_accounts account
    where account.id = new.bank_account_id
      and account.user_id = new.user_id
      and account.deleted_at is null;
    if not found then raise exception 'Reconciliation account must belong to the authenticated owner'; end if;
  else
    new.ledger_balance := old.ledger_balance;
  end if;
  return new;
end;
$$;

drop trigger if exists set_bank_transfers_updated_at on public.bank_transfers;
create trigger set_bank_transfers_updated_at before update on public.bank_transfers for each row execute function public.set_updated_at();
drop trigger if exists sync_bank_transfer_balance on public.bank_transfers;
create trigger sync_bank_transfer_balance after insert or update or delete on public.bank_transfers for each row execute function public.sync_bank_balance_from_transfer();

drop trigger if exists snapshot_bank_reconciliation_balance on public.bank_account_reconciliations;
create trigger snapshot_bank_reconciliation_balance before insert or update on public.bank_account_reconciliations for each row execute function public.snapshot_reconciliation_balance();
drop trigger if exists set_bank_account_reconciliations_updated_at on public.bank_account_reconciliations;
create trigger set_bank_account_reconciliations_updated_at before update on public.bank_account_reconciliations for each row execute function public.set_updated_at();

create index if not exists bank_transfers_owner_date_idx on public.bank_transfers (user_id, transferred_on desc);
create index if not exists bank_transfers_owner_trash_idx on public.bank_transfers (user_id, deleted_at);
create index if not exists bank_account_reconciliations_owner_date_idx on public.bank_account_reconciliations (user_id, reconciled_on desc);
create index if not exists bank_account_reconciliations_owner_trash_idx on public.bank_account_reconciliations (user_id, deleted_at);

grant select, insert, update, delete on public.bank_transfers, public.bank_account_reconciliations to authenticated;
revoke all on function public.apply_bank_transfer_balance(uuid, uuid, uuid, numeric, integer) from public, anon, authenticated;
revoke all on function public.sync_bank_balance_from_transfer() from public, anon, authenticated;
revoke all on function public.snapshot_reconciliation_balance() from public, anon, authenticated;

create or replace function public.purge_expired_hub_trash() returns void language plpgsql security definer set search_path = public as $$
declare table_name text; begin
  foreach table_name in array array['expenses','budgets','subscriptions','study_topics','study_exams','study_flashcards','hub_projects','project_tasks','project_changelog','ai_memory_entries','vault_documents','bank_accounts','finance_categories','income_entries','academic_records','academic_mku_records','financial_goals','bank_transfers','bank_account_reconciliations'] loop
    execute format('delete from public.%I where deleted_at < now() - interval ''30 days''', table_name);
  end loop;
end $$;
