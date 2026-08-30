-- Phase 19: owner-private, persistent Vault folders.
-- Documents keep their existing text folder field for backwards compatibility.

create table if not exists public.vault_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.vault_folders enable row level security;
drop policy if exists "vault folders owner select" on public.vault_folders;
drop policy if exists "vault folders owner insert" on public.vault_folders;
drop policy if exists "vault folders owner update" on public.vault_folders;
drop policy if exists "vault folders owner delete" on public.vault_folders;
create policy "vault folders owner select" on public.vault_folders for select to authenticated using (auth.uid() = user_id);
create policy "vault folders owner insert" on public.vault_folders for insert to authenticated with check (auth.uid() = user_id);
create policy "vault folders owner update" on public.vault_folders for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "vault folders owner delete" on public.vault_folders for delete to authenticated using (auth.uid() = user_id);
grant select, insert, update, delete on public.vault_folders to authenticated;
