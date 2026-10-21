-- Remove implicit academic category values while preserving all existing
-- Question Bank rows and their current metadata.

alter table public.academic_questions
  alter column exam_type drop default,
  alter column exam_type drop not null,
  alter column subject drop default,
  alter column subject drop not null;

alter table public.academic_questions
  drop constraint if exists academic_questions_subject_check,
  drop constraint if exists academic_questions_exam_type_nonempty_check;

alter table public.academic_questions
  add constraint academic_questions_subject_check
    check (subject is null or length(trim(subject)) > 0),
  add constraint academic_questions_exam_type_nonempty_check
    check (exam_type is null or length(trim(exam_type)) > 0);
