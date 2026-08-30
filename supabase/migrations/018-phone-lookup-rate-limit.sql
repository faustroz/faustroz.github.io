-- Phase 18: private Phone Lookup request quotas. No phone numbers or lookup
-- responses are stored—only a per-user action counter for abuse protection.

create table if not exists public.phone_lookup_rate_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('profile', 'tags', 'quota')),
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count between 0 and 5),
  unique (user_id, action, window_start)
);

alter table public.phone_lookup_rate_limits enable row level security;
revoke all on public.phone_lookup_rate_limits from anon, authenticated;

create or replace function public.consume_phone_lookup_rate_limit(
  p_user_id uuid,
  p_action text
) returns boolean language plpgsql security definer set search_path = public as $$
declare window_start timestamptz; current_count integer;
begin
  if p_action not in ('profile', 'tags', 'quota') then raise exception 'Invalid lookup action'; end if;
  window_start := date_trunc('hour', now()) + floor(extract(minute from now()) / 15) * interval '15 minutes';
  insert into public.phone_lookup_rate_limits (user_id, action, window_start, request_count)
  values (p_user_id, p_action, window_start, 1)
  on conflict (user_id, action, window_start) do update
    set request_count = public.phone_lookup_rate_limits.request_count + 1
    where public.phone_lookup_rate_limits.request_count < 5
  returning request_count into current_count;
  return found;
exception when no_data_found then
  return false;
end;
$$;

revoke all on function public.consume_phone_lookup_rate_limit(uuid, text) from public, anon, authenticated;
grant execute on function public.consume_phone_lookup_rate_limit(uuid, text) to service_role;
