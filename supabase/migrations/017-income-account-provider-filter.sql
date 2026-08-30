-- Phase 17: exact Income account links for provider-level Finance filters.
-- Apply after 015-expense-account-linking.sql and 016-cashflow-soft-delete-balance.sql.

alter table public.income_entries
  add column if not exists bank_account_id uuid references public.bank_accounts(id) on delete set null;
create index if not exists income_entries_user_bank_account_idx on public.income_entries (user_id, bank_account_id);

-- Backfill only unambiguous historical rows. Rows where one holder name is used
-- by multiple providers remain unchanged and can be corrected from Edit Entry.
update public.income_entries income
set bank_account_id = account.id
from public.bank_accounts account
where income.bank_account_id is null
  and income.user_id = account.user_id
  and income.bank_account_name = account.name
  and account.deleted_at is null
  and (
    select count(*) from public.bank_accounts candidates
    where candidates.user_id = account.user_id
      and candidates.name = account.name
      and candidates.deleted_at is null
  ) = 1;

create or replace function public.resolve_income_bank_account()
returns trigger language plpgsql security definer set search_path = public as $$
declare matched_name text;
begin
  if new.bank_account_id is null then return new; end if;
  select name into matched_name
  from public.bank_accounts
  where id = new.bank_account_id and user_id = new.user_id and deleted_at is null;
  if not found then raise exception 'Invalid bank account for income'; end if;
  new.bank_account_name := matched_name;
  return new;
end;
$$;

drop trigger if exists resolve_income_bank_account on public.income_entries;
create trigger resolve_income_bank_account
before insert or update of bank_account_id, user_id on public.income_entries
for each row execute function public.resolve_income_bank_account();

create or replace function public.sync_bank_balance_from_cashflow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'expenses' then
    if tg_op = 'INSERT' then
      perform public.apply_cashflow_to_bank_balance(new.user_id, new.bank_account_id, new.bank_account_name, -new.amount);
    elsif tg_op = 'DELETE' then
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
    elsif tg_op = 'DELETE' then
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
create trigger sync_expense_bank_balance after insert or update or delete on public.expenses
for each row execute function public.sync_bank_balance_from_cashflow();
drop trigger if exists sync_income_bank_balance on public.income_entries;
create trigger sync_income_bank_balance after insert or update or delete on public.income_entries
for each row execute function public.sync_bank_balance_from_cashflow();
