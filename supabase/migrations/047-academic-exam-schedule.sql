-- Phase 47: owner-private exam schedule per block. The app derives the daily
-- question target from the exam date and the owner's own question attempts;
-- nothing is stored besides the date itself.

create table if not exists public.academic_exam_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  block text not null check (length(trim(block)) between 1 and 120),
  exam_type text check (exam_type is null or length(exam_type) <= 60),
  exam_date date not null,
  notes text check (notes is null or length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists academic_exam_schedule_owner_date_idx on public.academic_exam_schedule (user_id, exam_date);

alter table public.academic_exam_schedule enable row level security;

drop policy if exists "owner select" on public.academic_exam_schedule;
drop policy if exists "owner insert" on public.academic_exam_schedule;
drop policy if exists "owner update" on public.academic_exam_schedule;
drop policy if exists "owner delete" on public.academic_exam_schedule;
create policy "owner select" on public.academic_exam_schedule for select to authenticated using (auth.uid() = user_id);
create policy "owner insert" on public.academic_exam_schedule for insert to authenticated with check (auth.uid() = user_id);
create policy "owner update" on public.academic_exam_schedule for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner delete" on public.academic_exam_schedule for delete to authenticated using (auth.uid() = user_id);

drop trigger if exists set_academic_exam_schedule_updated_at on public.academic_exam_schedule;
create trigger set_academic_exam_schedule_updated_at before update on public.academic_exam_schedule
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.academic_exam_schedule to authenticated;
