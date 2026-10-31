-- Allow Image Occlusion sets to be created as visual masks without text answers.
-- Existing sets remain answer-enabled and all existing answer text is preserved.

alter table public.academic_image_occlusion_sets
  add column if not exists answer_mode text not null default 'answer';

alter table public.academic_image_occlusion_sets
  drop constraint if exists academic_image_occlusion_sets_answer_mode_check;
alter table public.academic_image_occlusion_sets
  add constraint academic_image_occlusion_sets_answer_mode_check
  check (answer_mode in ('answer', 'mask_only'));

alter table public.academic_image_occlusion_cards
  alter column answer drop not null;
alter table public.academic_image_occlusion_cards
  drop constraint if exists academic_image_occlusion_cards_answer_check;
alter table public.academic_image_occlusion_cards
  add constraint academic_image_occlusion_cards_answer_check
  check (answer is null or length(trim(answer)) between 1 and 2000);
