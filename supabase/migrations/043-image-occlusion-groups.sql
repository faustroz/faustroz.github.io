-- Add an owner-editable group label to Image Occlusion collections.
-- Existing collections stay intact and start in the neutral default group.
alter table public.academic_image_occlusion_sets
  add column if not exists group_name text not null default 'Tanpa grup';

alter table public.academic_image_occlusion_sets
  drop constraint if exists academic_image_occlusion_sets_group_name_length_check;
alter table public.academic_image_occlusion_sets
  add constraint academic_image_occlusion_sets_group_name_length_check
  check (length(trim(group_name)) between 1 and 80);

create index if not exists academic_image_occlusion_sets_group_idx
  on public.academic_image_occlusion_sets (user_id, lower(group_name));

-- Group records let users create and organize groups before assigning a collection.
create table if not exists public.academic_image_occlusion_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists academic_image_occlusion_groups_owner_name_idx
  on public.academic_image_occlusion_groups (user_id, lower(name));

insert into public.academic_image_occlusion_groups (user_id, name)
select distinct user_id, trim(group_name)
from public.academic_image_occlusion_sets
where length(trim(group_name)) between 1 and 80
on conflict do nothing;

alter table public.academic_image_occlusion_groups enable row level security;
drop policy if exists "owner access academic_image_occlusion_groups" on public.academic_image_occlusion_groups;
create policy "owner access academic_image_occlusion_groups" on public.academic_image_occlusion_groups
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.academic_image_occlusion_groups to authenticated;
drop trigger if exists set_academic_image_occlusion_groups_updated_at on public.academic_image_occlusion_groups;
create trigger set_academic_image_occlusion_groups_updated_at before update on public.academic_image_occlusion_groups
  for each row execute function public.set_updated_at();
