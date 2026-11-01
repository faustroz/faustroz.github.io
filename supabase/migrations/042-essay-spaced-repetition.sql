-- Re-enable the existing SM-2 inspired review schedule for Essay only.
-- MCQ attempts and schedule rows remain untouched; all access stays owner-scoped.

create or replace function public.track_academic_question_attempt()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_question_type text;
  v_failed boolean := coalesce(new.self_assessed = false, false);
begin
  select q.question_type into v_question_type
  from public.academic_questions q
  where q.id = new.question_id and q.user_id = new.user_id;

  if v_question_type is distinct from 'essay' then return new; end if;

  insert into public.academic_question_review_state (
    user_id, question_id, latest_attempt_id, due_at, lapse_count, attempts_count,
    mastered, latest_attempt_failure_counted, rating_applied, last_reviewed_at
  ) values (
    new.user_id, new.question_id, new.id,
    now() + case when v_failed then interval '15 minutes' else interval '1 day' end,
    case when v_failed then 1 else 0 end, 1, false, v_failed, false, new.created_at
  )
  on conflict (user_id, question_id) do update set
    latest_attempt_id = excluded.latest_attempt_id,
    due_at = case when v_failed then excluded.due_at else least(public.academic_question_review_state.due_at, excluded.due_at) end,
    lapse_count = public.academic_question_review_state.lapse_count + case when v_failed then 1 else 0 end,
    attempts_count = public.academic_question_review_state.attempts_count + 1,
    mastered = case when v_failed then false else public.academic_question_review_state.mastered end,
    latest_attempt_failure_counted = v_failed,
    rating_applied = false,
    last_reviewed_at = excluded.last_reviewed_at;
  return new;
end;
$$;

drop trigger if exists track_academic_question_attempt on public.academic_question_attempts;
create trigger track_academic_question_attempt
  after insert on public.academic_question_attempts
  for each row execute function public.track_academic_question_attempt();

-- Allow review-rating changes only from the trusted Essay rating RPC.
create or replace function public.reject_question_bank_review_rating()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_question_type text;
begin
  if tg_op = 'INSERT' then
    if new.review_rating is not null then raise exception 'Essay review ratings must be saved through the Essay review action'; end if;
    return new;
  end if;
  if new.review_rating is not distinct from old.review_rating then return new; end if;
  if coalesce(current_setting('app.allow_essay_review_rating', true), '') <> 'on' then
    raise exception 'Essay review ratings must be saved through the Essay review action';
  end if;

  select q.question_type into v_question_type
  from public.academic_questions q
  where q.id = new.question_id and q.user_id = new.user_id;
  if v_question_type is distinct from 'essay' then
    raise exception 'Spaced repetition is available only for Essay questions';
  end if;
  return new;
end;
$$;

create or replace function public.rate_academic_essay_attempt_review(
  p_attempt_id uuid,
  p_rating text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.academic_question_attempts%rowtype;
  v_state public.academic_question_review_state%rowtype;
  v_quality integer;
  v_ease numeric(4,2);
  v_interval numeric(10,3);
  v_repetitions integer;
  v_streak integer;
  v_failed boolean;
  v_success boolean;
  v_mastered boolean;
  v_prior_lapses integer;
  v_lapses integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_rating is null or p_rating not in ('again', 'hard', 'good', 'easy') then raise exception 'Invalid review rating'; end if;

  select a.* into v_attempt
  from public.academic_question_attempts a
  join public.academic_questions q on q.id = a.question_id and q.user_id = a.user_id
  where a.id = p_attempt_id and a.user_id = auth.uid() and q.question_type = 'essay'
  for update of a;
  if not found then raise exception 'Essay attempt not found'; end if;

  select * into v_state from public.academic_question_review_state
  where user_id = auth.uid() and question_id = v_attempt.question_id for update;
  if found and v_state.latest_attempt_id = v_attempt.id and v_state.rating_applied then
    if v_state.last_rating = p_rating then return to_jsonb(v_attempt); end if;
    raise exception 'A rating has already been saved for this attempt';
  end if;

  v_quality := case p_rating when 'again' then 0 when 'hard' then 3 when 'good' then 4 else 5 end;
  v_failed := p_rating = 'again' or coalesce(v_attempt.self_assessed = false, false);
  if v_failed then v_quality := least(v_quality, 1); end if;
  v_ease := greatest(1.30, coalesce(v_state.ease_factor, 2.50) + (0.1 - (5 - v_quality) * (0.08 + (5 - v_quality) * 0.02)));
  if v_quality < 3 then
    v_interval := case when p_rating = 'again' then 0.010 else 1 end;
    v_repetitions := 0;
  elsif coalesce(v_state.repetitions, 0) = 0 then
    v_interval := case when v_quality = 5 then 4 else 1 end;
    v_repetitions := 1;
  elsif v_state.repetitions = 1 then
    v_interval := 6;
    v_repetitions := 2;
  else
    v_interval := greatest(1, round(coalesce(v_state.interval_days, 1) * case when v_quality = 3 then 1.2 else v_ease * case when v_quality = 5 then 1.3 else 1 end end));
    v_repetitions := v_state.repetitions + 1;
  end if;

  v_success := not v_failed and v_quality >= 4;
  v_streak := case when v_success then coalesce(v_state.correct_streak, 0) + 1 else 0 end;
  v_prior_lapses := coalesce(v_state.lapse_count, 0);
  if v_state.latest_attempt_id = v_attempt.id and not v_state.rating_applied and v_state.latest_attempt_failure_counted then
    v_prior_lapses := greatest(0, v_prior_lapses - 1);
  end if;
  v_lapses := v_prior_lapses + case when v_failed then 1 else 0 end;

  perform set_config('app.allow_essay_review_rating', 'on', true);
  update public.academic_question_attempts
    set review_rating = p_rating,
        self_assessed = case when p_rating = 'again' then false else coalesce(v_attempt.self_assessed, true) end
    where id = v_attempt.id returning * into v_attempt;

  v_mastered := not v_failed and p_rating in ('good', 'easy') and (coalesce(v_state.mastered, false) or v_streak >= 2);
  insert into public.academic_question_review_state (
    user_id, question_id, latest_attempt_id, due_at, interval_days, ease_factor,
    repetitions, correct_streak, lapse_count, attempts_count, mastered,
    latest_attempt_failure_counted, rating_applied, last_rating, last_reviewed_at
  ) values (
    auth.uid(), v_attempt.question_id, v_attempt.id, now() + v_interval * interval '1 day', v_interval, v_ease,
    v_repetitions, v_streak, v_lapses, greatest(1, coalesce(v_state.attempts_count, 1)),
    v_mastered, v_failed, true, p_rating, now()
  ) on conflict (user_id, question_id) do update set
    latest_attempt_id = excluded.latest_attempt_id,
    due_at = excluded.due_at,
    interval_days = excluded.interval_days,
    ease_factor = excluded.ease_factor,
    repetitions = excluded.repetitions,
    correct_streak = excluded.correct_streak,
    lapse_count = excluded.lapse_count,
    attempts_count = excluded.attempts_count,
    mastered = excluded.mastered,
    latest_attempt_failure_counted = excluded.latest_attempt_failure_counted,
    rating_applied = true,
    last_rating = p_rating,
    last_reviewed_at = now();
  return to_jsonb(v_attempt);
end;
$$;

revoke all on function public.rate_academic_essay_attempt_review(uuid, text) from public, anon;
grant execute on function public.rate_academic_essay_attempt_review(uuid, text) to authenticated;

-- Make attempts recorded while the feature was disabled available for a first review,
-- without deleting or rewriting their attempt history or any existing schedule.
with latest_attempts as (
  select distinct on (a.user_id, a.question_id)
    a.user_id, a.question_id, a.id, a.created_at,
    coalesce(a.self_assessed = false, false) as failed
  from public.academic_question_attempts a
  join public.academic_questions q on q.id = a.question_id and q.user_id = a.user_id
  where q.question_type = 'essay'
  order by a.user_id, a.question_id, a.created_at desc, a.id desc
), attempt_totals as (
  select a.user_id, a.question_id, count(*)::integer as attempts_count,
    count(*) filter (where a.review_rating = 'again' or a.self_assessed = false)::integer as lapse_count
  from public.academic_question_attempts a
  join public.academic_questions q on q.id = a.question_id and q.user_id = a.user_id
  where q.question_type = 'essay'
  group by a.user_id, a.question_id
)
insert into public.academic_question_review_state (
  user_id, question_id, latest_attempt_id, due_at, lapse_count, attempts_count,
  mastered, latest_attempt_failure_counted, rating_applied, last_reviewed_at
)
select latest.user_id, latest.question_id, latest.id, now(), totals.lapse_count, totals.attempts_count,
  false, latest.failed, false, latest.created_at
from latest_attempts latest
join attempt_totals totals using (user_id, question_id)
on conflict (user_id, question_id) do nothing;

with latest_attempts as (
  select distinct on (a.user_id, a.question_id)
    a.user_id, a.question_id, a.id, a.created_at,
    coalesce(a.self_assessed = false, false) as failed,
    a.review_rating
  from public.academic_question_attempts a
  join public.academic_questions q on q.id = a.question_id and q.user_id = a.user_id
  where q.question_type = 'essay'
  order by a.user_id, a.question_id, a.created_at desc, a.id desc
), attempt_totals as (
  select a.user_id, a.question_id, count(*)::integer as attempts_count
  from public.academic_question_attempts a
  join public.academic_questions q on q.id = a.question_id and q.user_id = a.user_id
  where q.question_type = 'essay'
  group by a.user_id, a.question_id
)
update public.academic_question_review_state s
set latest_attempt_id = latest.id,
    due_at = now(),
    lapse_count = s.lapse_count + case when latest.failed then 1 else 0 end,
    attempts_count = totals.attempts_count,
    mastered = false,
    latest_attempt_failure_counted = latest.failed,
    rating_applied = false,
    last_reviewed_at = latest.created_at
from latest_attempts latest
join attempt_totals totals using (user_id, question_id)
where s.user_id = latest.user_id
  and s.question_id = latest.question_id
  and s.latest_attempt_id is distinct from latest.id
  and latest.review_rating is null;

comment on table public.academic_question_review_state is
  'Owner-private SM-2-inspired schedules for Essay questions; MCQ attempt history is preserved but MCQ spaced repetition remains disabled.';
