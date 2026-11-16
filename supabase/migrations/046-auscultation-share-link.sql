-- Phase 46: unlisted share link for the Auscultation Lab.
-- kind auscultation_lab: target_id null. The lab content is the public HLS-CMDS
-- clip library bundled with the site; the link only gates the shared page.
-- Run after 045.

alter table public.academic_share_links drop constraint if exists academic_share_links_kind_check;
alter table public.academic_share_links add constraint academic_share_links_kind_check
  check (kind in ('image_occlusion_set', 'question_bank', 'auscultation_lab'));

drop policy if exists "owner insert" on public.academic_share_links;
create policy "owner insert" on public.academic_share_links for insert to authenticated
  with check (
    auth.uid() = user_id
    and (
      (kind = 'image_occlusion_set' and exists (select 1 from public.academic_image_occlusion_sets s where s.id = target_id and s.user_id = auth.uid()))
      or (kind in ('question_bank', 'auscultation_lab') and target_id is null)
    )
  );

-- Same behaviour as 045, plus the auscultation_lab branch.
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
  elsif v_link.kind = 'auscultation_lab' then
    v_payload := jsonb_build_object('title', 'Auscultation Lab');
  end if;

  return jsonb_build_object('kind', v_link.kind, 'payload', v_payload);
end;
$$;

revoke all on function public.get_shared_content(text) from public;
grant execute on function public.get_shared_content(text) to anon, authenticated;
