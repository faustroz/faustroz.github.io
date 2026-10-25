-- Allow owners to maintain reusable block options for the Question Bank.
-- Existing question metadata remains unchanged and visible as legacy options.

alter table public.academic_question_categories
  drop constraint if exists academic_question_categories_kind_check;

alter table public.academic_question_categories
  add constraint academic_question_categories_kind_check
  check (kind in ('exam_type', 'subject', 'block'));
