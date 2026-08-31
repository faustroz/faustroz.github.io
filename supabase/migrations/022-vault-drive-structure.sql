-- Vault Drive: private folder hierarchy and stable document-to-folder links.
-- Apply after 019-vault-folders.sql. Existing text folder labels are migrated
-- into owner-scoped root folders and retained for search/backward compatibility.

alter table public.vault_folders
  add column if not exists parent_id uuid references public.vault_folders(id) on delete restrict;

alter table public.vault_documents
  add column if not exists folder_id uuid references public.vault_folders(id) on delete set null;

-- The early Vault schema allowed one name per owner. Drive-style nesting
-- permits a matching name in different parents while preserving case-insensitive
-- uniqueness within each folder.
alter table public.vault_folders drop constraint if exists vault_folders_user_id_name_key;
create unique index if not exists vault_folders_owner_parent_name_key
  on public.vault_folders (user_id, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));
create index if not exists vault_folders_owner_parent_idx on public.vault_folders (user_id, parent_id, name);
create index if not exists vault_documents_owner_folder_idx on public.vault_documents (user_id, folder_id, created_at desc);

-- A foreign key alone cannot prove the referenced folder belongs to the same
-- owner. Enforce ownership and prevent recursive folder loops server-side.
create or replace function public.validate_vault_folder_parent()
returns trigger language plpgsql security definer set search_path = public as $$
declare parent_owner uuid; has_cycle boolean;
begin
  if new.parent_id is null then return new; end if;
  if new.parent_id = new.id then raise exception 'A folder cannot contain itself'; end if;
  select user_id into parent_owner from public.vault_folders where id = new.parent_id;
  if parent_owner is distinct from new.user_id then raise exception 'Parent folder must belong to the same owner'; end if;
  with recursive ancestors as (
    select id, parent_id from public.vault_folders where id = new.parent_id
    union all
    select folder.id, folder.parent_id from public.vault_folders as folder join ancestors on folder.id = ancestors.parent_id
  ) select exists(select 1 from ancestors where id = new.id) into has_cycle;
  if has_cycle then raise exception 'Folder hierarchy cannot contain a cycle'; end if;
  return new;
end;
$$;

create or replace function public.validate_vault_document_folder()
returns trigger language plpgsql security definer set search_path = public as $$
declare folder_owner uuid;
begin
  if new.folder_id is null then return new; end if;
  select user_id into folder_owner from public.vault_folders where id = new.folder_id;
  if folder_owner is distinct from new.user_id then raise exception 'Document folder must belong to the same owner'; end if;
  return new;
end;
$$;

drop trigger if exists validate_vault_folder_parent on public.vault_folders;
create trigger validate_vault_folder_parent before insert or update of parent_id, user_id on public.vault_folders
for each row execute function public.validate_vault_folder_parent();
drop trigger if exists validate_vault_document_folder on public.vault_documents;
create trigger validate_vault_document_folder before insert or update of folder_id, user_id on public.vault_documents
for each row execute function public.validate_vault_document_folder();

-- Make folders for any legacy document label, then link those documents.
insert into public.vault_folders (user_id, name)
select distinct document.user_id, trim(document.folder)
from public.vault_documents as document
where document.deleted_at is null
  and trim(document.folder) <> ''
  and not exists (
    select 1 from public.vault_folders as folder
    where folder.user_id = document.user_id
      and folder.parent_id is null
      and lower(folder.name) = lower(trim(document.folder))
  );

update public.vault_documents as document
set folder_id = folder.id
from public.vault_folders as folder
where document.folder_id is null
  and document.user_id = folder.user_id
  and folder.parent_id is null
  and lower(folder.name) = lower(trim(document.folder))
  and trim(document.folder) <> '';

-- Reassert owner access because both new references remain entirely within the
-- existing owner-scoped tables and their RLS policies.
alter table public.vault_folders enable row level security;
alter table public.vault_documents enable row level security;
