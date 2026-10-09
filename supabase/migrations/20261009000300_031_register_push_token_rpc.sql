-- 031: push token upsert fails when the device token already belongs to a
-- different account (upsert onConflict:'token' becomes an UPDATE that fails the
-- own-row RLS check). Devices that switch accounts silently lose push delivery.
-- SECURITY DEFINER RPC claims the token for the current user: delete any stale
-- row for the same token, then upsert owned by auth.uid().
create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from public.push_tokens where token = p_token and user_id <> auth.uid();
  insert into public.push_tokens (user_id, token, platform, last_seen)
  values (auth.uid(), p_token, p_platform, now())
  on conflict (token) do update
    set user_id = auth.uid(), platform = excluded.platform, last_seen = now();
end;
$$;

revoke all on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;
