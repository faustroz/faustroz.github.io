-- Phase 30: retire the Bank Reconciliation feature without deleting its data.
-- Apply after 029-live-bank-reconciliation.sql.

-- Stop account balance writes from maintaining a retired feature.
drop trigger if exists sync_bank_reconciliation_balance on public.bank_accounts;

-- Preserve the table and its owner-scoped rows for backup compatibility, but
-- remove its active write helpers and realtime stream.
drop trigger if exists snapshot_bank_reconciliation_balance on public.bank_account_reconciliations;
drop trigger if exists snapshot_bank_reconciliation_insert on public.bank_account_reconciliations;
drop trigger if exists snapshot_bank_reconciliation_input_update on public.bank_account_reconciliations;

drop function if exists public.sync_reconciliation_from_account_balance();
drop function if exists public.snapshot_reconciliation_balance();

do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bank_account_reconciliations'
  ) then
    alter publication supabase_realtime drop table public.bank_account_reconciliations;
  end if;
end $$;
