-- Spaced-repetition ratings are reserved for essay questions. Keep historical
-- attempts and mistake state intact; this only prevents MCQ schedule ratings.
create or replace function public.reject_mcq_spaced_repetition_rating()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_question_type text;
begin
  if new.review_rating is null or new.review_rating is not distinct from old.review_rating then
    return new;
  end if;

  select coalesce(q.question_type, 'mcq') into v_question_type
  from public.academic_questions q
  where q.id = new.question_id and q.user_id = new.user_id;

  if v_question_type is distinct from 'essay' then
    raise exception 'Spaced repetition is available only for essay questions';
  end if;

  return new;
end;
$$;

drop trigger if exists restrict_academic_mcq_spaced_repetition on public.academic_question_attempts;
create trigger restrict_academic_mcq_spaced_repetition
  before update of review_rating on public.academic_question_attempts
  for each row execute function public.reject_mcq_spaced_repetition_rating();
