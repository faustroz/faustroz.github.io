-- Phase 45: unlisted share links for Academic content.
-- kinds:
--   image_occlusion_set  one Image Occlusion set (target_id = set id)
--   question_bank       all active MCQ and Essay questions of the owner (target_id null)
-- The 64-hex token is the only key. Anyone with the link reads that content
-- (answers included) without signing in. Owners still see only their own rows.

create table if not exists public.academic_share_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('image_occlusion_set', 'question_bank')),
  target_id uuid,
  token text not null unique default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')) check (token ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  constraint academic_share_links_target_shape_check check ((kind = 'image_occlusion_set') = (target_id is not null)),
  unique (user_id, kind, target_id)
);

-- Module-level links have target_id null; NULLs are distinct in the unique key above.
create unique index if not exists academic_share_links_module_owner_idx
  on public.academic_share_links (user_id, kind) where target_id is null;

alter table public.academic_share_links enable row level security;

drop policy if exists "owner select" on public.academic_share_links;
drop policy if exists "owner insert" on public.academic_share_links;
drop policy if exists "owner delete" on public.academic_share_links;
create policy "owner select" on public.academic_share_links for select to authenticated using (auth.uid() = user_id);
create policy "owner insert" on public.academic_share_links for insert to authenticated
  with check (
    auth.uid() = user_id
    and (
      (kind = 'image_occlusion_set' and exists (select 1 from public.academic_image_occlusion_sets s where s.id = target_id and s.user_id = auth.uid()))
      or (kind = 'question_bank' and target_id is null)
    )
  );
create policy "owner delete" on public.academic_share_links for delete to authenticated using (auth.uid() = user_id);
grant select, insert, delete on public.academic_share_links to authenticated;

-- Deleting an occlusion set removes its share link so the token stops working.
create or replace function public.drop_image_occlusion_share_links() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.academic_share_links where target_id = old.id and kind = 'image_occlusion_set';
  return old;
end;
$$;

drop trigger if exists drop_share_links_on_occlusion_set_delete on public.academic_image_occlusion_sets;
create trigger drop_share_links_on_occlusion_set_delete
  after delete on public.academic_image_occlusion_sets
  for each row execute function public.drop_image_occlusion_share_links();

-- One public entry point. Returns null for unknown or malformed tokens.
create or replace function public.get_shared_content(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_link public.academic_share_links%rowtype;
  v_payload jsonb;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return null; end if;
  select * into v_link from public.academic_share_links where token = p_token;
  if not found then return null; end if;

  if v_link.kind = 'image_occlusion_set' then
    v_payload := public.get_shared_image_occlusion_set(p_token);
  elsif v_link.kind = 'question_bank' then
    v_payload := jsonb_build_object(
      'title', 'Bank soal',
      'questions', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', q.id, 'exam_type', q.exam_type, 'subject', q.subject, 'block', q.block,
          'topic', q.topic, 'subtopic', q.subtopic, 'difficulty', q.difficulty,
          'question_type', q.question_type, 'question_text', q.question_text, 'options', q.options,
          'correct_answer', q.correct_answer, 'reference_answer', q.reference_answer,
          'explanation', q.explanation, 'image_path', q.image_path, 'tags', q.tags
        ) order by q.block nulls last, q.topic nulls last, q.created_at)
        from public.academic_questions q
        where q.user_id = v_link.user_id and q.deleted_at is null
      ), '[]'::jsonb)
    );
  end if;

  return jsonb_build_object('kind', v_link.kind, 'payload', v_payload);
end;
$$;

revoke all on function public.get_shared_content(text) from public;
grant execute on function public.get_shared_content(text) to anon, authenticated;

-- Occlusion set read used by get_shared_content.
create or replace function public.get_shared_image_occlusion_set(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_set public.academic_image_occlusion_sets%rowtype;
begin
  select s.* into v_set
  from public.academic_share_links l
  join public.academic_image_occlusion_sets s on s.id = l.target_id and s.user_id = l.user_id
  where l.token = p_token and l.kind = 'image_occlusion_set';
  if not found then return null; end if;
  return jsonb_build_object(
    'title', v_set.title,
    'answer_mode', v_set.answer_mode,
    'image_path', v_set.image_path,
    'images', coalesce((
      select jsonb_agg(jsonb_build_object('id', i.id, 'image_path', i.image_path, 'position', i.position) order by i.position)
      from public.academic_image_occlusion_images i where i.set_id = v_set.id
    ), '[]'::jsonb),
    'cards', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'image_id', c.image_id, 'position', c.position,
        'x', c.x, 'y', c.y, 'width', c.width, 'height', c.height,
        'rotation_degrees', c.rotation_degrees, 'answer', c.answer
      ) order by c.position)
      from public.academic_image_occlusion_cards c where c.set_id = v_set.id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_shared_image_occlusion_set(text) from public, anon, authenticated;

-- Lets anon clients sign URLs for images that belong to shared content only.
create or replace function public.is_shared_academic_image(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.academic_share_links l
    join public.academic_image_occlusion_sets s on s.id = l.target_id and s.user_id = l.user_id
    left join public.academic_image_occlusion_images i on i.set_id = s.id
    where l.kind = 'image_occlusion_set' and (s.image_path = p_name or i.image_path = p_name)
  ) or exists (
    select 1
    from public.academic_share_links l
    join public.academic_questions q on q.user_id = l.user_id and q.deleted_at is null
    where l.kind = 'question_bank' and q.image_path = p_name
  );
$$;

revoke all on function public.is_shared_academic_image(text) from public;
grant execute on function public.is_shared_academic_image(text) to anon, authenticated;

drop policy if exists "shared academic images select" on storage.objects;
create policy "shared academic images select" on storage.objects for select to anon
  using (bucket_id = 'academic-question-images' and public.is_shared_academic_image(name));
