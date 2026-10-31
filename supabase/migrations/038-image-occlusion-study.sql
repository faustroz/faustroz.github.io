-- Phase 38: owner-private Image Occlusion cards with independent SM-2 schedules.
-- Existing Question Bank attempts and review state are retained as history;
-- MCQ/Essay attempts no longer create or update spaced-repetition schedules.

drop trigger if exists track_academic_question_attempt on public.academic_question_attempts;
revoke all on function public.rate_academic_question_attempt(uuid, text) from public, anon, authenticated;

create or replace function public.reject_question_bank_review_rating()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.review_rating is not null then
    raise exception 'Question Bank MCQ and Essay do not use spaced repetition';
  end if;
  if tg_op = 'UPDATE' then
    if new.review_rating is distinct from old.review_rating then
      raise exception 'Question Bank MCQ and Essay do not use spaced repetition';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists restrict_academic_mcq_spaced_repetition on public.academic_question_attempts;
drop trigger if exists restrict_academic_question_bank_spaced_repetition on public.academic_question_attempts;
create trigger restrict_academic_question_bank_spaced_repetition
  before update of review_rating on public.academic_question_attempts
  for each row execute function public.reject_question_bank_review_rating();
drop trigger if exists reject_question_bank_insert_rating on public.academic_question_attempts;
create trigger reject_question_bank_insert_rating
  before insert on public.academic_question_attempts
  for each row execute function public.reject_question_bank_review_rating();

create table if not exists public.academic_image_occlusion_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 120),
  image_path text not null,
  mode text not null default 'hide_one' check (mode in ('hide_one', 'hide_all')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create table if not exists public.academic_image_occlusion_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  set_id uuid not null,
  position integer not null default 0 check (position >= 0),
  x numeric(10,8) not null check (x >= 0 and x < 1),
  y numeric(10,8) not null check (y >= 0 and y < 1),
  width numeric(10,8) not null check (width > 0 and width <= 1),
  height numeric(10,8) not null check (height > 0 and height <= 1),
  answer text not null check (length(trim(answer)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  foreign key (user_id, set_id) references public.academic_image_occlusion_sets(user_id, id) on delete cascade,
  check (x + width <= 1 and y + height <= 1)
);

create index if not exists academic_image_occlusion_cards_set_idx
  on public.academic_image_occlusion_cards (user_id, set_id, position);

create table if not exists public.academic_image_occlusion_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  card_id uuid not null,
  rating text not null check (rating in ('again', 'hard', 'good', 'easy')),
  interval_days numeric(10,3) not null check (interval_days >= 0),
  ease_factor numeric(4,2) not null check (ease_factor >= 1.30),
  repetitions integer not null check (repetitions >= 0),
  correct_streak integer not null check (correct_streak >= 0),
  lapse_count integer not null check (lapse_count >= 0),
  mastered boolean not null default false,
  due_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, id),
  foreign key (user_id, card_id) references public.academic_image_occlusion_cards(user_id, id) on delete cascade
);

create table if not exists public.academic_image_occlusion_review_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  card_id uuid not null,
  latest_attempt_id uuid,
  due_at timestamptz not null default now(),
  interval_days numeric(10,3) not null default 0 check (interval_days >= 0),
  ease_factor numeric(4,2) not null default 2.50 check (ease_factor >= 1.30),
  repetitions integer not null default 0 check (repetitions >= 0),
  correct_streak integer not null default 0 check (correct_streak >= 0),
  lapse_count integer not null default 0 check (lapse_count >= 0),
  attempts_count integer not null default 0 check (attempts_count >= 0),
  mastered boolean not null default false,
  last_rating text check (last_rating is null or last_rating in ('again', 'hard', 'good', 'easy')),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, card_id),
  foreign key (user_id, card_id) references public.academic_image_occlusion_cards(user_id, id) on delete cascade
);

alter table public.academic_image_occlusion_sets enable row level security;
alter table public.academic_image_occlusion_cards enable row level security;
alter table public.academic_image_occlusion_attempts enable row level security;
alter table public.academic_image_occlusion_review_state enable row level security;

drop policy if exists "owner access academic_image_occlusion_sets" on public.academic_image_occlusion_sets;
create policy "owner access academic_image_occlusion_sets" on public.academic_image_occlusion_sets for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "owner access academic_image_occlusion_cards" on public.academic_image_occlusion_cards;
create policy "owner access academic_image_occlusion_cards" on public.academic_image_occlusion_cards for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "owner select academic_image_occlusion_attempts" on public.academic_image_occlusion_attempts;
create policy "owner select academic_image_occlusion_attempts" on public.academic_image_occlusion_attempts for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "owner select academic_image_occlusion_review_state" on public.academic_image_occlusion_review_state;
create policy "owner select academic_image_occlusion_review_state" on public.academic_image_occlusion_review_state for select to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.academic_image_occlusion_sets, public.academic_image_occlusion_cards to authenticated;
grant select on public.academic_image_occlusion_attempts, public.academic_image_occlusion_review_state to authenticated;
revoke all on public.academic_image_occlusion_sets, public.academic_image_occlusion_cards,
  public.academic_image_occlusion_attempts, public.academic_image_occlusion_review_state from anon;

drop trigger if exists set_academic_image_occlusion_sets_updated_at on public.academic_image_occlusion_sets;
create trigger set_academic_image_occlusion_sets_updated_at before update on public.academic_image_occlusion_sets
  for each row execute function public.set_updated_at();
drop trigger if exists set_academic_image_occlusion_cards_updated_at on public.academic_image_occlusion_cards;
create trigger set_academic_image_occlusion_cards_updated_at before update on public.academic_image_occlusion_cards
  for each row execute function public.set_updated_at();
drop trigger if exists set_academic_image_occlusion_review_state_updated_at on public.academic_image_occlusion_review_state;
create trigger set_academic_image_occlusion_review_state_updated_at before update on public.academic_image_occlusion_review_state
  for each row execute function public.set_updated_at();

create index if not exists academic_image_occlusion_review_due_idx
  on public.academic_image_occlusion_review_state (user_id, due_at) where mastered = false;
create index if not exists academic_image_occlusion_attempt_card_idx
  on public.academic_image_occlusion_attempts (user_id, card_id, created_at desc);

create or replace function public.rate_academic_image_occlusion_card(p_card_id uuid, p_rating text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state public.academic_image_occlusion_review_state%rowtype;
  v_attempt public.academic_image_occlusion_attempts%rowtype;
  v_quality integer;
  v_ease numeric(4,2);
  v_interval numeric(10,3);
  v_repetitions integer;
  v_streak integer;
  v_lapses integer;
  v_mastered boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_rating is null or p_rating not in ('again', 'hard', 'good', 'easy') then raise exception 'Invalid review rating'; end if;
  perform 1 from public.academic_image_occlusion_cards
   where id = p_card_id and user_id = auth.uid();
  if not found then raise exception 'Image Occlusion card not found'; end if;

  select * into v_state from public.academic_image_occlusion_review_state
   where card_id = p_card_id and user_id = auth.uid() for update;
  v_quality := case p_rating when 'again' then 0 when 'hard' then 3 when 'good' then 4 else 5 end;
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
  v_streak := case when v_quality >= 4 then coalesce(v_state.correct_streak, 0) + 1 else 0 end;
  v_lapses := coalesce(v_state.lapse_count, 0) + case when p_rating = 'again' then 1 else 0 end;
  v_mastered := p_rating in ('good', 'easy') and (coalesce(v_state.mastered, false) or v_streak >= 2);

  insert into public.academic_image_occlusion_attempts (
    user_id, card_id, rating, interval_days, ease_factor, repetitions,
    correct_streak, lapse_count, mastered, due_at
  ) values (
    auth.uid(), p_card_id, p_rating, v_interval, v_ease, v_repetitions,
    v_streak, v_lapses, v_mastered, now() + v_interval * interval '1 day'
  ) returning * into v_attempt;

  insert into public.academic_image_occlusion_review_state (
    user_id, card_id, latest_attempt_id, due_at, interval_days, ease_factor,
    repetitions, correct_streak, lapse_count, attempts_count, mastered, last_rating, last_reviewed_at
  ) values (
    auth.uid(), p_card_id, v_attempt.id, v_attempt.due_at, v_interval, v_ease,
    v_repetitions, v_streak, v_lapses, 1, v_mastered, p_rating, now()
  ) on conflict (user_id, card_id) do update set
    latest_attempt_id = excluded.latest_attempt_id,
    due_at = excluded.due_at,
    interval_days = excluded.interval_days,
    ease_factor = excluded.ease_factor,
    repetitions = excluded.repetitions,
    correct_streak = excluded.correct_streak,
    lapse_count = excluded.lapse_count,
    attempts_count = public.academic_image_occlusion_review_state.attempts_count + 1,
    mastered = excluded.mastered,
    last_rating = excluded.last_rating,
    last_reviewed_at = excluded.last_reviewed_at
  returning * into v_state;

  return jsonb_build_object('attempt', to_jsonb(v_attempt), 'state', to_jsonb(v_state));
end;
$$;

revoke all on function public.rate_academic_image_occlusion_card(uuid, text) from public, anon;
grant execute on function public.rate_academic_image_occlusion_card(uuid, text) to authenticated;

comment on table public.academic_image_occlusion_review_state is
  'Current owner-private SM-2-inspired schedule, independently keyed to each Image Occlusion card.';
comment on table public.academic_image_occlusion_attempts is
  'Append-only owner-private rating history for Image Occlusion cards; MCQ and Essay do not use this schedule.';
