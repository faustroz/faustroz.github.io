-- Phase 15: exact expense-to-account links plus atomic, replay-safe Quick Expense writes.
-- Apply after 011-finance-balance-sync.sql, 012-academic-goals-trash.sql, and 014-quick-expense-api.sql.

-- Legacy entries retain bank_account_name. New manual and Quick Expense rows use
-- the immutable account id, removing ambiguity when multiple accounts share a holder name.
alter table public.expenses
  add column if not exists bank_account_id uuid references public.bank_accounts(id) on delete set null;
create index if not exists expenses_user_bank_account_idx on public.expenses (user_id, bank_account_id);

create or replace function public.resolve_expense_bank_account()
returns trigger language plpgsql security definer set search_path = public as $$
declare matched_name text;
begin
  if new.bank_account_id is null then return new; end if;
  select name into matched_name
  from public.bank_accounts
  where id = new.bank_account_id and user_id = new.user_id and deleted_at is null;
  if not found then raise exception 'Invalid bank account for expense'; end if;
  new.bank_account_name := matched_name;
  return new;
end;
$$;

drop trigger if exists resolve_expense_bank_account on public.expenses;
create trigger resolve_expense_bank_account
before insert or update of bank_account_id, user_id on public.expenses
for each row execute function public.resolve_expense_bank_account();

-- Prefer the immutable id. The name fallback keeps historical/manual rows made
-- before this migration compatible with the existing ledger.
create or replace function public.apply_cashflow_to_bank_balance(
  p_user_id uuid,
  p_account_id uuid,
  p_account_name text,
  p_delta numeric
) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_account_id is not null then
    update public.bank_accounts set balance = balance + p_delta
    where id = p_account_id and user_id = p_user_id and deleted_at is null;
  elsif coalesce(trim(p_account_name), '') <> '' then
    update public.bank_accounts set balance = balance + p_delta
    where user_id = p_user_id and name = p_account_name and deleted_at is null;
  end if;
end;
$$;

create or replace function public.sync_bank_balance_from_cashflow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'expenses' then
    if tg_op in ('UPDATE', 'DELETE') then
      perform public.apply_cashflow_to_bank_balance(old.user_id, old.bank_account_id, old.bank_account_name, old.amount);
    end if;
    if tg_op in ('INSERT', 'UPDATE') then
      perform public.apply_cashflow_to_bank_balance(new.user_id, new.bank_account_id, new.bank_account_name, -new.amount);
    end if;
  elsif tg_table_name = 'income_entries' then
    if tg_op in ('UPDATE', 'DELETE') then
      perform public.apply_cashflow_to_bank_balance(old.user_id, null, old.bank_account_name, -old.amount);
    end if;
    if tg_op in ('INSERT', 'UPDATE') then
      perform public.apply_cashflow_to_bank_balance(new.user_id, null, new.bank_account_name, new.amount);
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

create table if not exists public.quick_expense_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_key_id uuid not null references public.quick_expense_api_keys(id) on delete cascade,
  request_hash text not null check (char_length(request_hash) = 64),
  expense_id uuid references public.expenses(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, request_hash)
);

alter table public.quick_expense_requests enable row level security;
drop policy if exists "owner select" on public.quick_expense_requests;
create policy "owner select" on public.quick_expense_requests for select to authenticated using (auth.uid() = user_id);
revoke all on public.quick_expense_requests from anon, authenticated;

create or replace function public.create_quick_expense(
  p_user_id uuid,
  p_device_key_id uuid,
  p_request_hash text,
  p_title text,
  p_amount numeric,
  p_category text,
  p_bank_account_id uuid,
  p_spent_on date,
  p_notes text
) returns public.expenses language plpgsql security definer set search_path = public as $$
declare
  resolved_account public.bank_accounts%rowtype;
  result public.expenses%rowtype;
  request_id uuid;
begin
  select * into resolved_account from public.bank_accounts
  where id = p_bank_account_id and user_id = p_user_id and deleted_at is null;
  if not found then raise exception 'Invalid bank account'; end if;

  insert into public.quick_expense_requests (user_id, device_key_id, request_hash)
  values (p_user_id, p_device_key_id, p_request_hash)
  on conflict (user_id, request_hash) do nothing
  returning id into request_id;

  if request_id is null then
    select expenses.* into result
    from public.quick_expense_requests requests
    join public.expenses on expenses.id = requests.expense_id
    where requests.user_id = p_user_id and requests.request_hash = p_request_hash;
    if found then return result; end if;
    raise exception 'Quick Expense request is already being processed';
  end if;

  insert into public.expenses (user_id, title, amount, category, bank_account_id, spent_on, notes)
  values (p_user_id, p_title, p_amount, p_category, resolved_account.id, p_spent_on, p_notes)
  returning * into result;

  update public.quick_expense_requests set expense_id = result.id where id = request_id;
  return result;
end;
$$;

revoke all on function public.create_quick_expense(uuid, uuid, text, text, numeric, text, uuid, date, text) from public, anon, authenticated;
grant execute on function public.create_quick_expense(uuid, uuid, text, text, numeric, text, uuid, date, text) to service_role;
