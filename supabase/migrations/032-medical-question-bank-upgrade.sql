-- Phase 32: extensible exam metadata, essay questions, and private question images.
-- Existing MCQ rows are retained and classified as MCQ.

alter table public.academic_questions
  add column if not exists exam_type text not null default 'MCQ',
  add column if not exists question_type text not null default 'mcq',
  add column if not exists subtopic text,
  add column if not exists reference_answer text;

alter table public.academic_questions alter column options set default '{}'::jsonb;
alter table public.academic_questions alter column correct_answer drop not null;
update public.academic_questions set question_type = 'mcq' where question_type is null or question_type not in ('mcq', 'essay');
update public.academic_questions set exam_type = 'MCQ' where exam_type is null or length(trim(exam_type)) = 0;
alter table public.academic_questions drop constraint if exists academic_questions_correct_answer_check;
alter table public.academic_questions drop constraint if exists academic_questions_question_type_check;
alter table public.academic_questions add constraint academic_questions_question_type_check check (question_type in ('mcq', 'essay'));
alter table public.academic_questions add constraint academic_questions_format_content_check check (
  (question_type = 'mcq' and correct_answer in ('A','B','C','D','E') and jsonb_typeof(options) = 'object')
  or (question_type = 'essay' and correct_answer is null and length(trim(coalesce(reference_answer, ''))) > 0)
);

alter table public.academic_question_attempts add column if not exists response_text text;
alter table public.academic_question_attempts add column if not exists self_assessed boolean;
alter table public.academic_question_attempts alter column selected_answer drop not null;
alter table public.academic_question_attempts alter column is_correct drop not null;
alter table public.academic_question_attempts drop constraint if exists academic_question_attempts_selected_answer_check;
alter table public.academic_question_attempts add constraint academic_question_attempts_answer_shape_check check (
  (selected_answer is not null and selected_answer in ('A','B','C','D','E') and is_correct is not null and response_text is null)
  or (selected_answer is null and is_correct is null and response_text is not null)
);

create table if not exists public.academic_question_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('exam_type', 'subject')),
  name text not null check (length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (user_id, kind, name)
);
alter table public.academic_question_categories enable row level security;
drop policy if exists "owner select academic_question_categories" on public.academic_question_categories;
drop policy if exists "owner insert academic_question_categories" on public.academic_question_categories;
drop policy if exists "owner update academic_question_categories" on public.academic_question_categories;
drop policy if exists "owner delete academic_question_categories" on public.academic_question_categories;
create policy "owner select academic_question_categories" on public.academic_question_categories for select to authenticated using (auth.uid() = user_id);
create policy "owner insert academic_question_categories" on public.academic_question_categories for insert to authenticated with check (auth.uid() = user_id);
create policy "owner update academic_question_categories" on public.academic_question_categories for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner delete academic_question_categories" on public.academic_question_categories for delete to authenticated using (auth.uid() = user_id);
grant select, insert, update, delete on public.academic_question_categories to authenticated;
revoke all on public.academic_question_categories from anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('academic-question-images', 'academic-question-images', false, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "academic question images owner select" on storage.objects;
drop policy if exists "academic question images owner insert" on storage.objects;
drop policy if exists "academic question images owner update" on storage.objects;
drop policy if exists "academic question images owner delete" on storage.objects;
create policy "academic question images owner select" on storage.objects for select to authenticated using (bucket_id = 'academic-question-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "academic question images owner insert" on storage.objects for insert to authenticated with check (bucket_id = 'academic-question-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "academic question images owner update" on storage.objects for update to authenticated using (bucket_id = 'academic-question-images' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'academic-question-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "academic question images owner delete" on storage.objects for delete to authenticated using (bucket_id = 'academic-question-images' and (storage.foldername(name))[1] = auth.uid()::text);

create index if not exists academic_questions_exam_type_idx on public.academic_questions (user_id, exam_type, question_type) where deleted_at is null;
create index if not exists academic_questions_tags_idx on public.academic_questions using gin (tags) where deleted_at is null;
