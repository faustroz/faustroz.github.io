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
