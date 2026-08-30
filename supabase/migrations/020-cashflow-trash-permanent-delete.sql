-- Phase 20: a record already refunded on soft delete must not affect its
-- linked balance again when Trash permanently removes the row.

create or replace function public.sync_bank_balance_from_cashflow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'expenses' then
    if tg_op = 'INSERT' then
      perform public.apply_cashflow_to_bank_balance(new.user_id, new.bank_account_id, new.bank_account_name, -new.amount);
    elsif tg_op = 'DELETE' and old.deleted_at is null then
      -- Direct physical deletion of an active expense: restore its amount.
      perform public.apply_cashflow_to_bank_balance(old.user_id, old.bank_account_id, old.bank_account_name, old.amount);
    elsif old.deleted_at is null and new.deleted_at is not null then
      -- Soft delete: restore the money once before the record enters Trash.
      perform public.apply_cashflow_to_bank_balance(old.user_id, old.bank_account_id, old.bank_account_name, old.amount);
    elsif old.deleted_at is not null and new.deleted_at is null then
      -- Recovery from Trash: apply the expense once again.
      perform public.apply_cashflow_to_bank_balance(new.user_id, new.bank_account_id, new.bank_account_name, -new.amount);
    elsif old.deleted_at is null and new.deleted_at is null then
      -- Normal edit: undo the old entry, then apply the replacement.
      perform public.apply_cashflow_to_bank_balance(old.user_id, old.bank_account_id, old.bank_account_name, old.amount);
      perform public.apply_cashflow_to_bank_balance(new.user_id, new.bank_account_id, new.bank_account_name, -new.amount);
    end if;
  elsif tg_table_name = 'income_entries' then
    if tg_op = 'INSERT' then
      perform public.apply_cashflow_to_bank_balance(new.user_id, null, new.bank_account_name, new.amount);
    elsif tg_op = 'DELETE' and old.deleted_at is null then
      -- Direct physical deletion of active income: reverse its amount.
      perform public.apply_cashflow_to_bank_balance(old.user_id, null, old.bank_account_name, -old.amount);
    elsif old.deleted_at is null and new.deleted_at is not null then
      perform public.apply_cashflow_to_bank_balance(old.user_id, null, old.bank_account_name, -old.amount);
    elsif old.deleted_at is not null and new.deleted_at is null then
      perform public.apply_cashflow_to_bank_balance(new.user_id, null, new.bank_account_name, new.amount);
    elsif old.deleted_at is null and new.deleted_at is null then
      perform public.apply_cashflow_to_bank_balance(old.user_id, null, old.bank_account_name, -old.amount);
      perform public.apply_cashflow_to_bank_balance(new.user_id, null, new.bank_account_name, new.amount);
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
