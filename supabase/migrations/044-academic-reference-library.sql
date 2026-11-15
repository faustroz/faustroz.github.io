-- Phase 44: owner-private drug cards and reference values (normal lab ranges,
-- doses, formulas) for the Academic reference library. Both use the same
-- soft-delete and 30-day Trash retention as the other Academic records.

create table if not exists public.academic_drug_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  drug_class text,
  mechanism text,
  indications text,
  adverse_effects text,
  contraindications text,
  interactions text,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.academic_reference_values (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  topic text not null check (length(trim(topic)) > 0),
  parameter text not null check (length(trim(parameter)) > 0),
  value text not null check (length(trim(value)) > 0),
  unit text,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.academic_drug_cards enable row level security;
alter table public.academic_reference_values enable row level security;

do $$
declare t text;
begin
  foreach t in array array['academic_drug_cards', 'academic_reference_values'] loop
    execute format('drop policy if exists "owner select" on public.%I', t);
    execute format('drop policy if exists "owner insert" on public.%I', t);
    execute format('drop policy if exists "owner update" on public.%I', t);
    execute format('drop policy if exists "owner delete" on public.%I', t);
    execute format('create policy "owner select" on public.%I for select to authenticated using (auth.uid() = user_id)', t);
    execute format('create policy "owner insert" on public.%I for insert to authenticated with check (auth.uid() = user_id)', t);
    execute format('create policy "owner update" on public.%I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format('create policy "owner delete" on public.%I for delete to authenticated using (auth.uid() = user_id)', t);
    execute format('drop trigger if exists set_%I_updated_at on public.%I', t, t);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
    execute format('create index if not exists %I on public.%I (user_id, deleted_at)', t || '_owner_trash_idx', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Extend the Trash purge list with the two new tables; the rest of the list is unchanged.
create or replace function public.purge_expired_hub_trash() returns void language plpgsql security definer set search_path = public as $$
declare table_name text; begin
  foreach table_name in array array['expenses','budgets','subscriptions','study_topics','study_exams','study_flashcards','hub_projects','project_tasks','project_changelog','ai_memory_entries','vault_documents','bank_accounts','finance_categories','income_entries','academic_records','academic_mku_records','financial_goals','academic_questions','academic_exam_sessions','academic_drug_cards','academic_reference_values'] loop
    execute format('delete from public.%I where deleted_at < now() - interval ''30 days''', table_name);
  end loop;
end $$;
