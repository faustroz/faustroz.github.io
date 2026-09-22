-- Phase 29: keep active bank reconciliations aligned with the current account
-- balance. Apply after 028-finance-transfers-reconciliation.sql.

create or replace function public.snapshot_reconciliation_balance()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select account.balance into new.ledger_balance
  from public.bank_accounts account
  where account.id = new.bank_account_id
    and account.user_id = new.user_id
    and account.deleted_at is null;
  if not found then raise exception 'Reconciliation account must belong to the authenticated owner'; end if;
  return new;
end;
$$;

-- Limit snapshotting to input changes. Internal live-balance updates must be
-- allowed to write ledger_balance without the former trigger restoring OLD.
drop trigger if exists snapshot_bank_reconciliation_balance on public.bank_account_reconciliations;
drop trigger if exists snapshot_bank_reconciliation_insert on public.bank_account_reconciliations;
drop trigger if exists snapshot_bank_reconciliation_input_update on public.bank_account_reconciliations;
create trigger snapshot_bank_reconciliation_insert
before insert on public.bank_account_reconciliations
for each row execute function public.snapshot_reconciliation_balance();
create trigger snapshot_bank_reconciliation_input_update
before update of bank_account_id, statement_balance, deleted_at on public.bank_account_reconciliations
for each row
when (
  old.bank_account_id is distinct from new.bank_account_id
  or old.statement_balance is distinct from new.statement_balance
  or (old.deleted_at is not null and new.deleted_at is null)
)
execute function public.snapshot_reconciliation_balance();

create or replace function public.sync_reconciliation_from_account_balance()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.balance is distinct from old.balance then
    update public.bank_account_reconciliations as reconciliation
    set ledger_balance = new.balance
    where reconciliation.user_id = new.user_id
      and reconciliation.bank_account_id = new.id
      and reconciliation.deleted_at is null
      and reconciliation.ledger_balance is distinct from new.balance;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_bank_reconciliation_balance on public.bank_accounts;
create trigger sync_bank_reconciliation_balance
after update of balance on public.bank_accounts
for each row execute function public.sync_reconciliation_from_account_balance();

-- Bring reconciliations created before this migration up to date immediately.
update public.bank_account_reconciliations as reconciliation
set ledger_balance = account.balance
from public.bank_accounts as account
where reconciliation.bank_account_id = account.id
  and reconciliation.user_id = account.user_id
  and reconciliation.deleted_at is null
  and account.deleted_at is null
  and reconciliation.ledger_balance is distinct from account.balance;

-- Let authenticated clients receive bounded row changes through their existing
-- RLS policies. Adding a publication member is guarded so this stays rerunnable.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'bank_account_reconciliations'
     ) then
    alter publication supabase_realtime add table public.bank_account_reconciliations;
  end if;
end $$;

revoke all on function public.snapshot_reconciliation_balance() from public, anon, authenticated;
revoke all on function public.sync_reconciliation_from_account_balance() from public, anon, authenticated;
