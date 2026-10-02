-- 017: Transactional engagement emails via Resend.
-- notification_log dedupes sends; a referrals trigger calls the
-- notify-send edge function through pg_net so referrers get credited
-- emails even when they aren't online.

create extension if not exists pg_net with schema extensions;

create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  meta jsonb not null default '{}'::jsonb,
  sent_at timestamptz not null default now(),
  unique (user_id, type)
);

alter table public.notification_log enable row level security;

-- Users may read their own notification history; writes go through the
-- notify-send edge function (service role).
create policy notification_log_select_own on public.notification_log
  for select to authenticated
  using (user_id = auth.uid());

grant select on public.notification_log to authenticated;
revoke insert, update, delete on public.notification_log from authenticated;
grant all on public.notification_log to service_role;

-- AFTER INSERT trigger on referrals → POST to notify-send edge function.
-- The edge function URL and shared secret live in vault (never in code).
create or replace function public.notify_referral_credit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_secret text;
  v_apikey text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'notify_function_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'notify_hook_secret';
  select decrypted_secret into v_apikey from vault.decrypted_secrets where name = 'supabase_publishable_key';
  if v_url is null or v_secret is null then
    return new;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notify-secret', v_secret,
      'apikey', coalesce(v_apikey, '')
    ),
    body := jsonb_build_object(
      'type', 'referral_credited',
      'referral_id', new.id::text
    )
  );
  return new;
end;
$$;

-- Trigger fn is invoked by the trigger only — not callable via RPC.
revoke all on function public.notify_referral_credit() from public, anon, authenticated;

drop trigger if exists referrals_notify_credit on public.referrals;
create trigger referrals_notify_credit
  after insert on public.referrals
  for each row execute function public.notify_referral_credit();
