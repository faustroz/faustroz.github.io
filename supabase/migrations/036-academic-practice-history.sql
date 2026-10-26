-- Phase 36: reuse the existing owner-private exam session table for all Question Bank runs.
-- Existing exam records keep their values and retain the default `exam` kind.

alter table public.academic_exam_sessions
  alter column duration_minutes drop not null;

alter table public.academic_exam_sessions
  add column if not exists session_kind text not null default 'exam';

alter table public.academic_exam_sessions
  drop constraint if exists academic_exam_sessions_session_kind_check;
alter table public.academic_exam_sessions
  add constraint academic_exam_sessions_session_kind_check
  check (session_kind in ('exam', 'practice', 'mistakes', 'due'));

comment on column public.academic_exam_sessions.session_kind is
  'Practice/history classification. Existing exam sessions default to exam.';
comment on column public.academic_exam_sessions.duration_minutes is
  'Optional planned duration; NULL for untimed practice and review sessions.';

create index if not exists academic_exam_sessions_owner_recent_idx
  on public.academic_exam_sessions (user_id, started_at desc)
  where deleted_at is null;
