-- Phase 27: owner-private Mata Kuliah Umum records. Kept separate from
-- academic_records because MKU does not use the medical block-grade trigger.
create table if not exists public.academic_mku_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course_name text not null check (length(trim(course_name)) > 0),
  credits numeric(5,2) not null check (credits > 0),
  grade text not null check (grade in ('A','A-','B+','B','B-','C+','C','D','E')),
  semester text not null check (length(trim(semester)) > 0),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.academic_mku_records enable row level security;
drop policy if exists "owner select" on public.academic_mku_records;
drop policy if exists "owner insert" on public.academic_mku_records;
drop policy if exists "owner update" on public.academic_mku_records;
drop policy if exists "owner delete" on public.academic_mku_records;
create policy "owner select" on public.academic_mku_records for select to authenticated using (auth.uid() = user_id);
create policy "owner insert" on public.academic_mku_records for insert to authenticated with check (auth.uid() = user_id);
create policy "owner update" on public.academic_mku_records for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner delete" on public.academic_mku_records for delete to authenticated using (auth.uid() = user_id);
drop trigger if exists set_academic_mku_records_updated_at on public.academic_mku_records;
create trigger set_academic_mku_records_updated_at before update on public.academic_mku_records for each row execute function public.set_updated_at();
create index if not exists academic_mku_records_owner_trash_idx on public.academic_mku_records (user_id, deleted_at);
grant select, insert, update, delete on public.academic_mku_records to authenticated;

create or replace function public.purge_expired_hub_trash() returns void language plpgsql security definer set search_path = public as $$
declare table_name text; begin
  foreach table_name in array array['expenses','budgets','subscriptions','study_topics','study_exams','study_flashcards','hub_projects','project_tasks','project_changelog','ai_memory_entries','vault_documents','bank_accounts','finance_categories','income_entries','academic_records','academic_mku_records','financial_goals'] loop
    execute format('delete from public.%I where deleted_at < now() - interval ''30 days''', table_name);
  end loop;
end $$;
