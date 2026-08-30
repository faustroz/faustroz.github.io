-- Phase 21: practical private-user Phone Lookup limits.
-- Each action remains isolated by the existing (user_id, action, window_start)
-- unique key, so quota checks never consume Profile or Tags allowance.

alter table public.phone_lookup_rate_limits
  drop constraint if exists phone_lookup_rate_limits_request_count_check;

alter table public.phone_lookup_rate_limits
  add constraint phone_lookup_rate_limits_request_count_check
  check (request_count between 0 and 10);

-- Expired windows cannot affect a new bucket, but remove them while refreshing
-- the function so stale counters do not accumulate indefinitely.
delete from public.phone_lookup_rate_limits
where window_start < date_trunc('hour', now()) - interval '1 hour';

create or replace function public.consume_phone_lookup_rate_limit(
  p_user_id uuid,
  p_action text
) returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_window_start timestamptz;
  v_current_count integer;
  v_limit integer;
begin
  if p_action not in ('profile', 'tags', 'quota') then
    raise exception 'Invalid lookup action';
  end if;

  -- Profile and Tags: 10 each; Quota: a separate, lower 6-request allowance.
  v_limit := case p_action when 'quota' then 6 else 10 end;
  v_window_start := date_trunc('hour', now())
    + floor(extract(minute from now()) / 15) * interval '15 minutes';

  insert into public.phone_lookup_rate_limits as rate_limits
    (user_id, action, window_start, request_count)
  values (p_user_id, p_action, v_window_start, 1)
  on conflict (user_id, action, window_start) do update
    set request_count = rate_limits.request_count + 1
    where rate_limits.request_count < v_limit
  returning rate_limits.request_count into v_current_count;

  return found;
exception when no_data_found then
  return false;
end;
$$;

revoke all on function public.consume_phone_lookup_rate_limit(uuid, text) from public, anon, authenticated;
grant execute on function public.consume_phone_lookup_rate_limit(uuid, text) to service_role;
