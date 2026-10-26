-- Phase 35: persistent, owner-private review state for Question Bank attempts.
-- Attempts remain the single immutable history; this table is only the current schedule.

alter table public.academic_question_attempts
  add column if not exists review_rating text;
alter table public.academic_question_attempts
  add column if not exists correct_answer text;
alter table public.academic_question_attempts
  add column if not exists correct_answer_text text;
alter table public.academic_question_attempts
  add column if not exists reference_answer text;

alter table public.academic_question_attempts
  drop constraint if exists academic_question_attempts_review_rating_check;
alter table public.academic_question_attempts
  add constraint academic_question_attempts_review_rating_check
  check (review_rating is null or review_rating in ('again', 'hard', 'good', 'easy'));

create table if not exists public.academic_question_review_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  question_id uuid not null references public.academic_questions(id) on delete cascade,
  latest_attempt_id uuid references public.academic_question_attempts(id) on delete set null,
  due_at timestamptz not null default now(),
  interval_days numeric(10,3) not null default 0 check (interval_days >= 0),
  ease_factor numeric(4,2) not null default 2.50 check (ease_factor >= 1.30),
  repetitions integer not null default 0 check (repetitions >= 0),
  correct_streak integer not null default 0 check (correct_streak >= 0),
  lapse_count integer not null default 0 check (lapse_count >= 0),
  latest_attempt_failure_counted boolean not null default false,
  attempts_count integer not null default 0 check (attempts_count >= 0),
  mastered boolean not null default false,
  rating_applied boolean not null default false,
  last_rating text check (last_rating is null or last_rating in ('again', 'hard', 'good', 'easy')),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, question_id)
);

alter table public.academic_question_review_state enable row level security;
drop policy if exists "owner select academic_question_review_state" on public.academic_question_review_state;
drop policy if exists "owner insert academic_question_review_state" on public.academic_question_review_state;
drop policy if exists "owner update academic_question_review_state" on public.academic_question_review_state;
drop policy if exists "owner delete academic_question_review_state" on public.academic_question_review_state;
create policy "owner select academic_question_review_state" on public.academic_question_review_state for select to authenticated using (auth.uid() = user_id);
create policy "owner insert academic_question_review_state" on public.academic_question_review_state for insert to authenticated with check (auth.uid() = user_id);
create policy "owner update academic_question_review_state" on public.academic_question_review_state for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner delete academic_question_review_state" on public.academic_question_review_state for delete to authenticated using (auth.uid() = user_id);
grant select, insert, update, delete on public.academic_question_review_state to authenticated;
revoke all on public.academic_question_review_state from anon;

create index if not exists academic_question_review_due_idx
  on public.academic_question_review_state (user_id, due_at) where mastered = false;
create index if not exists academic_question_review_mistakes_idx
  on public.academic_question_review_state (user_id, lapse_count desc) where mastered = false;

drop trigger if exists set_academic_question_review_state_updated_at on public.academic_question_review_state;
create trigger set_academic_question_review_state_updated_at
  before update on public.academic_question_review_state
  for each row execute function public.set_updated_at();

-- Backfill only actual historical failures. Existing attempt rows are never rewritten or removed.
insert into public.academic_question_review_state (
  user_id, question_id, latest_attempt_id, due_at, lapse_count, attempts_count,
  mastered, rating_applied, last_reviewed_at
)
select a.user_id, a.question_id,
       (array_agg(a.id order by a.created_at desc))[1], now(),
       (count(*) filter (where a.is_correct = false or a.self_assessed = false))::integer,
       count(*)::integer, false, false, max(a.created_at)
from public.academic_question_attempts a
join public.academic_questions q on q.id = a.question_id and q.user_id = a.user_id
group by a.user_id, a.question_id
having count(*) filter (where a.is_correct = false or a.self_assessed = false) > 0
on conflict (user_id, question_id) do nothing;

create or replace function public.track_academic_question_attempt()
returns trigger language plpgsql set search_path = public as $$
declare
  v_failed boolean := coalesce(new.is_correct = false, false) or coalesce(new.self_assessed = false, false);
begin
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

create or replace function public.rate_academic_question_attempt(
  p_attempt_id uuid,
  p_rating text
) returns jsonb language plpgsql set search_path = public as $$
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

  select * into v_attempt from public.academic_question_attempts
   where id = p_attempt_id and user_id = auth.uid() for update;
  if not found then raise exception 'Attempt not found'; end if;

  select * into v_state from public.academic_question_review_state
   where user_id = auth.uid() and question_id = v_attempt.question_id for update;

  if found and v_state.latest_attempt_id = v_attempt.id and v_state.rating_applied then
    if v_state.last_rating = p_rating then return to_jsonb(v_attempt); end if;
    raise exception 'A rating has already been saved for this attempt';
  end if;

  v_quality := case p_rating when 'again' then 0 when 'hard' then 3 when 'good' then 4 else 5 end;
  v_failed := coalesce(v_attempt.is_correct = false, false) or (v_attempt.response_text is not null and (p_rating = 'again' or coalesce(v_attempt.self_assessed = false, false)));
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
  -- The insert trigger already counted this attempt's failure; avoid counting it twice.
  if v_state.latest_attempt_id = v_attempt.id and not v_state.rating_applied and v_state.latest_attempt_failure_counted then
    v_prior_lapses := greatest(0, v_prior_lapses - 1);
  end if;
  v_lapses := v_prior_lapses + case when v_failed then 1 else 0 end;
  if v_attempt.response_text is not null then
    update public.academic_question_attempts
       set review_rating = p_rating,
           self_assessed = case when p_rating = 'again' then false else coalesce(v_attempt.self_assessed, true) end
     where id = v_attempt.id returning * into v_attempt;
  else
    update public.academic_question_attempts set review_rating = p_rating
     where id = v_attempt.id returning * into v_attempt;
  end if;
  v_mastered := not v_failed and p_rating in ('good', 'easy') and (coalesce(v_state.mastered, false) or v_streak >= 2);

  insert into public.academic_question_review_state (
    user_id, question_id, latest_attempt_id, due_at, interval_days, ease_factor,
    repetitions, correct_streak, lapse_count, attempts_count, mastered,
    latest_attempt_failure_counted, rating_applied, last_rating, last_reviewed_at
  ) values (
    auth.uid(), v_attempt.question_id, v_attempt.id,
    now() + v_interval * interval '1 day', v_interval, v_ease,
    v_repetitions, v_streak, v_lapses,
    greatest(1, coalesce(v_state.attempts_count, 1)), v_mastered, v_failed, true, p_rating, now()
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

revoke all on function public.rate_academic_question_attempt(uuid, text) from public, anon;
grant execute on function public.rate_academic_question_attempt(uuid, text) to authenticated;

comment on table public.academic_question_review_state is
  'Current per-owner Question Bank review schedule. Attempt history remains in academic_question_attempts. SM-2 inspired: Again/Hard/Good/Easy quality 0/3/4/5, ease floor 1.3, mastery after two consecutive Good/Easy recalls.';
