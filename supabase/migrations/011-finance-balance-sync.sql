-- Personal Hub Phase 11: keep account balances in sync with Income and Expense.
-- Apply after Phase 9 and Phase 10. This affects future creates, edits, moves, and deletes.

create or replace function public.apply_cashflow_to_bank_balance(
  p_user_id uuid,
  p_account_name text,
  p_delta numeric
) returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(p_account_name), '') = '' then return; end if;
  update public.bank_accounts
  set balance = balance + p_delta
  where user_id = p_user_id and name = p_account_name;
end;
$$;

create or replace function public.sync_bank_balance_from_cashflow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'expenses' then
    if tg_op in ('UPDATE', 'DELETE') then
      perform public.apply_cashflow_to_bank_balance(old.user_id, old.bank_account_name, old.amount);
    end if;
    if tg_op in ('INSERT', 'UPDATE') then
      perform public.apply_cashflow_to_bank_balance(new.user_id, new.bank_account_name, -new.amount);
    end if;
  elsif tg_table_name = 'income_entries' then
    if tg_op in ('UPDATE', 'DELETE') then
      perform public.apply_cashflow_to_bank_balance(old.user_id, old.bank_account_name, -old.amount);
    end if;
    if tg_op in ('INSERT', 'UPDATE') then
      perform public.apply_cashflow_to_bank_balance(new.user_id, new.bank_account_name, new.amount);
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
