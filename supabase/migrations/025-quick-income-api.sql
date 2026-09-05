-- Phase 25: extend the replay-safe iPhone transaction API with Quick Income.
-- Existing Quick Expense rows and RPC behavior remain unchanged.
-- Apply after 015-expense-account-linking.sql and 017-income-account-provider-filter.sql.

alter table public.quick_expense_requests
  add column if not exists transaction_type text not null default 'expense'
    check (transaction_type in ('expense', 'income'));

alter table public.quick_expense_requests
  add column if not exists income_id uuid references public.income_entries(id) on delete set null;

create index if not exists quick_expense_requests_income_idx
  on public.quick_expense_requests (user_id, income_id)
  where income_id is not null;

create or replace function public.create_quick_income(
  p_user_id uuid,
  p_device_key_id uuid,
  p_request_hash text,
  p_title text,
  p_amount numeric,
  p_category text,
  p_bank_account_id uuid,
  p_received_on date,
  p_notes text
) returns public.income_entries language plpgsql security definer set search_path = public as $$
declare
  resolved_account public.bank_accounts%rowtype;
  result public.income_entries%rowtype;
  request_id uuid;
begin
  select * into resolved_account
  from public.bank_accounts
  where id = p_bank_account_id
    and user_id = p_user_id
    and deleted_at is null;
  if not found then raise exception 'Invalid bank account'; end if;

  insert into public.quick_expense_requests (
    user_id, device_key_id, request_hash, transaction_type
  ) values (
    p_user_id, p_device_key_id, p_request_hash, 'income'
  )
  on conflict (user_id, request_hash) do nothing
  returning id into request_id;

  if request_id is null then
    select income.* into result
    from public.quick_expense_requests requests
    join public.income_entries income on income.id = requests.income_id
    where requests.user_id = p_user_id
      and requests.request_hash = p_request_hash
      and requests.transaction_type = 'income';
    if found then return result; end if;
    raise exception 'Quick Income request is already being processed';
  end if;

  -- The existing income trigger applies the positive balance delta in this
  -- same database transaction, keeping entry creation and balance atomic.
  insert into public.income_entries (
    user_id, title, amount, category, bank_account_id, received_on, notes
  ) values (
    p_user_id, p_title, p_amount, p_category, resolved_account.id, p_received_on, p_notes
  ) returning * into result;

  update public.quick_expense_requests set income_id = result.id where id = request_id;
  return result;
end;
$$;

revoke all on function public.create_quick_income(uuid, uuid, text, text, numeric, text, uuid, date, text)
  from public, anon, authenticated;
grant execute on function public.create_quick_income(uuid, uuid, text, text, numeric, text, uuid, date, text)
  to service_role;
