-- Phase 12: Academic Record, Financial Goals, and 30-day soft-delete recovery.
create table if not exists public.academic_records (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course_name text not null, credits numeric(5,2) not null check (credits > 0), grade text not null check (grade in ('A','A-','B+','B','B-','C+','C','D','E')),
  semester text not null, block text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.financial_goals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null, target_amount numeric(14,2) not null check (target_amount > 0), current_amount numeric(14,2) not null default 0 check (current_amount >= 0),
  deadline date, notes text not null default '', progress numeric(5,2) generated always as (least(100, round((current_amount / target_amount) * 100, 2))) stored,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
do $$ declare table_name text; begin
  foreach table_name in array array['academic_records','financial_goals'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy "owner select" on public.%I for select to authenticated using (auth.uid() = user_id)', table_name);
    execute format('create policy "owner insert" on public.%I for insert to authenticated with check (auth.uid() = user_id)', table_name);
    execute format('create policy "owner update" on public.%I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', table_name);
    execute format('create policy "owner delete" on public.%I for delete to authenticated using (auth.uid() = user_id)', table_name);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end $$;
grant select, insert, update, delete on public.academic_records, public.financial_goals to authenticated;

-- Soft delete applies to every Hub-owned operational table. Portfolio Tracker stays isolated.
do $$ declare table_name text; begin
  foreach table_name in array array['expenses','budgets','subscriptions','study_topics','study_exams','study_flashcards','hub_projects','project_tasks','project_changelog','ai_memory_entries','vault_documents','bank_accounts','finance_categories','income_entries','academic_records','financial_goals'] loop
    execute format('alter table public.%I add column if not exists deleted_at timestamptz', table_name);
    execute format('create index if not exists %I on public.%I (user_id, deleted_at)', table_name || '_trash_idx', table_name);
  end loop;
end $$;

create or replace function public.purge_expired_hub_trash() returns void language plpgsql security definer set search_path = public as $$
declare table_name text; begin
  foreach table_name in array array['expenses','budgets','subscriptions','study_topics','study_exams','study_flashcards','hub_projects','project_tasks','project_changelog','ai_memory_entries','vault_documents','bank_accounts','finance_categories','income_entries','academic_records','financial_goals'] loop
    execute format('delete from public.%I where deleted_at < now() - interval ''30 days''', table_name);
  end loop;
end $$;
