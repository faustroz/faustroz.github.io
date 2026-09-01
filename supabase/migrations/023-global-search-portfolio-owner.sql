-- Active Hub search indexing and owner-scoped Portfolio storage.
-- Apply after 022-vault-drive-structure.sql.

-- Searchable content is populated only for supported text documents during
-- authenticated Vault upload. Existing files and unsupported binary formats
-- remain searchable by their private metadata.
alter table public.vault_documents
  add column if not exists search_text text not null default '';

alter table public.vault_documents
  drop constraint if exists vault_documents_search_text_size_check;
alter table public.vault_documents
  add constraint vault_documents_search_text_size_check
  check (char_length(search_text) <= 32768);

-- Older Portfolio installations used a globally unique key. Add ownership
-- first, then claim existing rows only when there is exactly one Auth account.
-- If multiple Auth accounts exist, this migration aborts before changing the
-- primary key so an explicit owner can be assigned safely.
alter table public.portfolio_tracker_store
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

do $$
declare
  auth_user_count integer;
  existing_owner uuid;
begin
  if exists (select 1 from public.portfolio_tracker_store where user_id is null) then
    select count(*) into auth_user_count from auth.users;
    if auth_user_count <> 1 then
      raise exception 'Portfolio migration requires exactly one Auth user for automatic ownership; found %', auth_user_count;
    end if;
    select id into existing_owner from auth.users order by created_at, id limit 1;
    update public.portfolio_tracker_store set user_id = existing_owner where user_id is null;
  end if;
end;
$$;

alter table public.portfolio_tracker_store alter column user_id set default auth.uid();
alter table public.portfolio_tracker_store alter column user_id set not null;

alter table public.portfolio_tracker_store drop constraint if exists portfolio_tracker_store_pkey;
alter table public.portfolio_tracker_store
  add constraint portfolio_tracker_store_pkey primary key (user_id, key);

alter table public.portfolio_tracker_store enable row level security;
drop policy if exists "portfolio tracker public read" on public.portfolio_tracker_store;
drop policy if exists "portfolio tracker public insert" on public.portfolio_tracker_store;
drop policy if exists "portfolio tracker public update" on public.portfolio_tracker_store;
drop policy if exists "portfolio tracker public delete" on public.portfolio_tracker_store;
drop policy if exists "portfolio owner read" on public.portfolio_tracker_store;
drop policy if exists "portfolio owner insert" on public.portfolio_tracker_store;
drop policy if exists "portfolio owner update" on public.portfolio_tracker_store;
drop policy if exists "portfolio owner delete" on public.portfolio_tracker_store;
create policy "portfolio owner read" on public.portfolio_tracker_store for select to authenticated using (auth.uid() = user_id);
create policy "portfolio owner insert" on public.portfolio_tracker_store for insert to authenticated with check (auth.uid() = user_id);
create policy "portfolio owner update" on public.portfolio_tracker_store for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "portfolio owner delete" on public.portfolio_tracker_store for delete to authenticated using (auth.uid() = user_id);
grant select, insert, update, delete on public.portfolio_tracker_store to authenticated;
revoke all on public.portfolio_tracker_store from anon;

-- Reassert the private Vault boundary after adding the content projection.
alter table public.vault_documents enable row level security;
revoke all on public.vault_documents from anon;

notify pgrst, 'reload schema';
