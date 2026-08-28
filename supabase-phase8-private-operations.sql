-- Personal Hub Phase 8: document vault, integrations metadata, and notifications.
-- Apply after supabase-phase4-private-modules.sql in the Supabase SQL editor.

create table if not exists public.vault_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size >= 0 and byte_size <= 26214400),
  folder text not null default '',
  tags text[] not null default '{}',
  linked_type text check (linked_type in ('study_topic', 'project')),
  linked_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  provider text not null check (provider in ('github', 'google_calendar', 'ai')),
  status text not null default 'disconnected' check (status in ('disconnected', 'connected', 'error')),
  label text not null default '',
  scopes text[] not null default '{}',
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create table if not exists public.hub_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('exam', 'deadline', 'budget', 'subscription', 'system')),
  title text not null,
  body text not null default '',
  due_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

do $$
declare table_name text;
begin
  foreach table_name in array array['vault_documents', 'integration_connections', 'hub_notifications'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists "owner select" on public.%I', table_name);
    execute format('drop policy if exists "owner insert" on public.%I', table_name);
    execute format('drop policy if exists "owner update" on public.%I', table_name);
    execute format('drop policy if exists "owner delete" on public.%I', table_name);
    execute format('create policy "owner select" on public.%I for select to authenticated using (auth.uid() = user_id)', table_name);
    execute format('create policy "owner insert" on public.%I for insert to authenticated with check (auth.uid() = user_id)', table_name);
    execute format('create policy "owner update" on public.%I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', table_name);
    execute format('create policy "owner delete" on public.%I for delete to authenticated using (auth.uid() = user_id)', table_name);
  end loop;
end $$;

drop trigger if exists set_vault_documents_updated_at on public.vault_documents;
drop trigger if exists set_integration_connections_updated_at on public.integration_connections;
create trigger set_vault_documents_updated_at before update on public.vault_documents for each row execute function public.set_updated_at();
create trigger set_integration_connections_updated_at before update on public.integration_connections for each row execute function public.set_updated_at();
grant select, insert, update, delete on public.vault_documents, public.integration_connections, public.hub_notifications to authenticated;

-- Private bucket. Objects live under <auth.uid()>/<uuid>-<safe-filename>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('document-vault', 'document-vault', false, 26214400,
  array['application/pdf','image/png','image/jpeg','text/plain','text/markdown','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists "vault owner select" on storage.objects;
drop policy if exists "vault owner insert" on storage.objects;
drop policy if exists "vault owner update" on storage.objects;
drop policy if exists "vault owner delete" on storage.objects;
create policy "vault owner select" on storage.objects for select to authenticated using (bucket_id = 'document-vault' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "vault owner insert" on storage.objects for insert to authenticated with check (bucket_id = 'document-vault' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "vault owner update" on storage.objects for update to authenticated using (bucket_id = 'document-vault' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'document-vault' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "vault owner delete" on storage.objects for delete to authenticated using (bucket_id = 'document-vault' and (storage.foldername(name))[1] = auth.uid()::text);
