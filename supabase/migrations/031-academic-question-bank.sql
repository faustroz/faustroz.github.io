-- Phase 31: Question Bank module inside Academic workspace.
-- Provides owner-private questions, options (A-E), attempts, and exam sessions.

create table if not exists public.academic_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject text not null default 'Kedokteran' check (length(trim(subject)) > 0),
  block text check (block is null or length(trim(block)) > 0),
  topic text check (topic is null or length(trim(topic)) > 0),
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  question_text text not null check (length(trim(question_text)) > 0),
  options jsonb not null,
  correct_answer text not null check (correct_answer in ('A', 'B', 'C', 'D', 'E')),
  explanation text,
  image_path text,
  tags text[] not null default '{}'::text[],
  is_bookmarked boolean not null default false,
  source_filename text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.academic_question_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  question_id uuid not null references public.academic_questions(id) on delete cascade,
  exam_session_id uuid,
  selected_answer text not null check (selected_answer in ('A', 'B', 'C', 'D', 'E')),
  is_correct boolean not null,
  time_spent_seconds integer not null default 0 check (time_spent_seconds >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.academic_exam_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default 'Exam Simulation' check (length(trim(title)) > 0),
  total_questions integer not null check (total_questions > 0),
  duration_minutes integer not null check (duration_minutes > 0),
  filters jsonb not null default '{}'::jsonb,
  question_ids uuid[] not null default '{}'::uuid[],
  answers jsonb not null default '{}'::jsonb,
  flagged_question_ids uuid[] not null default '{}'::uuid[],
  score integer check (score is null or score >= 0),
  accuracy_percent numeric(5,2) check (accuracy_percent is null or (accuracy_percent >= 0 and accuracy_percent <= 100)),
  time_taken_seconds integer not null default 0 check (time_taken_seconds >= 0),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Row Level Security
alter table public.academic_questions enable row level security;
alter table public.academic_question_attempts enable row level security;
alter table public.academic_exam_sessions enable row level security;

-- Policies for academic_questions
drop policy if exists "owner select academic_questions" on public.academic_questions;
drop policy if exists "owner insert academic_questions" on public.academic_questions;
drop policy if exists "owner update academic_questions" on public.academic_questions;
drop policy if exists "owner delete academic_questions" on public.academic_questions;
create policy "owner select academic_questions" on public.academic_questions for select to authenticated using (auth.uid() = user_id);
create policy "owner insert academic_questions" on public.academic_questions for insert to authenticated with check (auth.uid() = user_id);
create policy "owner update academic_questions" on public.academic_questions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner delete academic_questions" on public.academic_questions for delete to authenticated using (auth.uid() = user_id);

-- Policies for academic_question_attempts
drop policy if exists "owner select academic_question_attempts" on public.academic_question_attempts;
drop policy if exists "owner insert academic_question_attempts" on public.academic_question_attempts;
drop policy if exists "owner update academic_question_attempts" on public.academic_question_attempts;
drop policy if exists "owner delete academic_question_attempts" on public.academic_question_attempts;
create policy "owner select academic_question_attempts" on public.academic_question_attempts for select to authenticated using (auth.uid() = user_id);
create policy "owner insert academic_question_attempts" on public.academic_question_attempts for insert to authenticated with check (auth.uid() = user_id);
create policy "owner update academic_question_attempts" on public.academic_question_attempts for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner delete academic_question_attempts" on public.academic_question_attempts for delete to authenticated using (auth.uid() = user_id);

-- Policies for academic_exam_sessions
drop policy if exists "owner select academic_exam_sessions" on public.academic_exam_sessions;
drop policy if exists "owner insert academic_exam_sessions" on public.academic_exam_sessions;
drop policy if exists "owner update academic_exam_sessions" on public.academic_exam_sessions;
drop policy if exists "owner delete academic_exam_sessions" on public.academic_exam_sessions;
create policy "owner select academic_exam_sessions" on public.academic_exam_sessions for select to authenticated using (auth.uid() = user_id);
create policy "owner insert academic_exam_sessions" on public.academic_exam_sessions for insert to authenticated with check (auth.uid() = user_id);
create policy "owner update academic_exam_sessions" on public.academic_exam_sessions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner delete academic_exam_sessions" on public.academic_exam_sessions for delete to authenticated using (auth.uid() = user_id);

-- Auto-update timestamps
drop trigger if exists set_academic_questions_updated_at on public.academic_questions;
create trigger set_academic_questions_updated_at before update on public.academic_questions for each row execute function public.set_updated_at();

drop trigger if exists set_academic_exam_sessions_updated_at on public.academic_exam_sessions;
create trigger set_academic_exam_sessions_updated_at before update on public.academic_exam_sessions for each row execute function public.set_updated_at();

-- Indexes for performance & trash cleanup
create index if not exists academic_questions_owner_trash_idx on public.academic_questions (user_id, deleted_at);
create index if not exists academic_questions_filter_idx on public.academic_questions (user_id, subject, block, topic, difficulty);
create index if not exists academic_questions_bookmark_idx on public.academic_questions (user_id, is_bookmarked) where deleted_at is null;
create index if not exists academic_question_attempts_question_idx on public.academic_question_attempts (user_id, question_id, created_at desc);
create index if not exists academic_exam_sessions_owner_idx on public.academic_exam_sessions (user_id, status, created_at desc);

-- Grants & revokes
grant select, insert, update, delete on public.academic_questions to authenticated;
grant select, insert, update, delete on public.academic_question_attempts to authenticated;
grant select, insert, update, delete on public.academic_exam_sessions to authenticated;

revoke all on public.academic_questions from anon;
revoke all on public.academic_question_attempts from anon;
revoke all on public.academic_exam_sessions from anon;

-- Update 30-day trash cleanup function to include academic_questions and academic_exam_sessions
create or replace function public.purge_expired_hub_trash() returns void language plpgsql security definer set search_path = public as $$
declare table_name text; begin
  foreach table_name in array array['expenses','budgets','subscriptions','study_topics','study_exams','study_flashcards','hub_projects','project_tasks','project_changelog','ai_memory_entries','vault_documents','bank_accounts','finance_categories','income_entries','academic_records','academic_mku_records','financial_goals','academic_questions','academic_exam_sessions'] loop
    execute format('delete from public.%I where deleted_at < now() - interval ''30 days''', table_name);
  end loop;
end $$;

