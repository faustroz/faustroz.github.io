-- Persist a rotation angle per Image Occlusion card/mask.
-- Existing cards remain unchanged and receive the neutral 0-degree angle.

alter table public.academic_image_occlusion_cards
  add column if not exists rotation_degrees smallint not null default 0;

alter table public.academic_image_occlusion_cards
  drop constraint if exists academic_image_occlusion_cards_rotation_degrees_check;
alter table public.academic_image_occlusion_cards
  add constraint academic_image_occlusion_cards_rotation_degrees_check
  check (rotation_degrees between -180 and 180);

comment on column public.academic_image_occlusion_cards.rotation_degrees is
  'Owner-defined clockwise/counterclockwise rotation in degrees for the normalized Image Occlusion mask.';
