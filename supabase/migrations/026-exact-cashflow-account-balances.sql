-- Phase 26: restore exact account-id balance updates after migration 020
-- accidentally regressed Income to the legacy name-only fallback.
-- Apply after 020-cashflow-trash-permanent-delete.sql and 025-quick-income-api.sql.

-- Exact ids always win. Historical rows without an id may use their legacy
-- holder name only when it identifies exactly one active account for the owner.
-- Ambiguous legacy names intentionally update nothing instead of every account.
create or replace function public.apply_cashflow_to_bank_balance(
  p_user_id uuid,
  p_account_id uuid,
  p_account_name text,
  p_delta numeric
) returns void language plpgsql security definer set search_path = public as $$
declare
  matched_account_id uuid;
  matched_account_count integer;
begin
  if p_account_id is not null then
    update public.bank_accounts
    set balance = balance + p_delta
    where id = p_account_id
      and user_id = p_user_id
      and deleted_at is null;
    return;
  end if;

  if coalesce(trim(p_account_name), '') = '' then return; end if;

  select min(account.id::text)::uuid, count(*)
  into matched_account_id, matched_account_count
  from public.bank_accounts account
  where account.user_id = p_user_id
    and account.name = p_account_name
    and account.deleted_at is null;

  if matched_account_count = 1 then
    update public.bank_accounts
    set balance = balance + p_delta
    where id = matched_account_id
      and user_id = p_user_id
      and deleted_at is null;
  end if;
end;
$$;

create or replace function public.sync_bank_balance_from_cashflow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'expenses' then
    if tg_op = 'INSERT' then
      perform public.apply_cashflow_to_bank_balance(new.user_id, new.bank_account_id, new.bank_account_name, -new.amount);
    elsif tg_op = 'DELETE' and old.deleted_at is null then
      perform public.apply_cashflow_to_bank_balance(old.user_id, old.bank_account_id, old.bank_account_name, old.amount);
    elsif old.deleted_at is null and new.deleted_at is not null then
      perform public.apply_cashflow_to_bank_balance(old.user_id, old.bank_account_id, old.bank_account_name, old.amount);
    elsif old.deleted_at is not null and new.deleted_at is null then
      perform public.apply_cashflow_to_bank_balance(new.user_id, new.bank_account_id, new.bank_account_name, -new.amount);
    elsif old.deleted_at is null and new.deleted_at is null then
      perform public.apply_cashflow_to_bank_balance(old.user_id, old.bank_account_id, old.bank_account_name, old.amount);
      perform public.apply_cashflow_to_bank_balance(new.user_id, new.bank_account_id, new.bank_account_name, -new.amount);
    end if;
  elsif tg_table_name = 'income_entries' then
    if tg_op = 'INSERT' then
      perform public.apply_cashflow_to_bank_balance(new.user_id, new.bank_account_id, new.bank_account_name, new.amount);
    elsif tg_op = 'DELETE' and old.deleted_at is null then
      perform public.apply_cashflow_to_bank_balance(old.user_id, old.bank_account_id, old.bank_account_name, -old.amount);
    elsif old.deleted_at is null and new.deleted_at is not null then
      perform public.apply_cashflow_to_bank_balance(old.user_id, old.bank_account_id, old.bank_account_name, -old.amount);
    elsif old.deleted_at is not null and new.deleted_at is null then
      perform public.apply_cashflow_to_bank_balance(new.user_id, new.bank_account_id, new.bank_account_name, new.amount);
    elsif old.deleted_at is null and new.deleted_at is null then
      perform public.apply_cashflow_to_bank_balance(old.user_id, old.bank_account_id, old.bank_account_name, -old.amount);
      perform public.apply_cashflow_to_bank_balance(new.user_id, new.bank_account_id, new.bank_account_name, new.amount);
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists sync_expense_bank_balance on public.expenses;
create trigger sync_expense_bank_balance
after insert or update or delete on public.expenses
for each row execute function public.sync_bank_balance_from_cashflow();

drop trigger if exists sync_income_bank_balance on public.income_entries;
create trigger sync_income_bank_balance
after insert or update or delete on public.income_entries
for each row execute function public.sync_bank_balance_from_cashflow();
