-- 021: Broadcast push notifications.
--
-- 1. notify_content_published() trigger — when an event/festival/live stream
--    transitions to 'published', POST {type:'broadcast'} to notify-send, which
--    pushes to FCM topic 'all' and drops an in-app inbox row for every user.
--    i18n titles are flattened to english at publish time.
--
-- 2. engagement-weekly cron — Sunday 08:30 IST (03:00 UTC) broadcast inviting
--    devotees back for the week. Text is static; content publishes cover the
--    dynamic nudges.

create or replace function public.notify_content_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_secret text;
  v_apikey text;
  v_title text;
  v_verb text;
begin
  -- fire only on draft/archived → published transition
  if new.status <> 'published' or (tg_op = 'UPDATE' and old.status = 'published') then
    return new;
  end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'notify_function_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'notify_hook_secret';
  select decrypted_secret into v_apikey from vault.decrypted_secrets where name = 'supabase_publishable_key';
  if v_url is null or v_secret is null then
    return new;
  end if;

  v_title := coalesce(
    to_jsonb(new)->'title_i18n'->>'en',
    to_jsonb(new)->'name_i18n'->>'en',
    to_jsonb(new)->>'title',
    to_jsonb(new)->>'name',
    'New on Pratha');
  v_verb := case tg_table_name
    when 'live_streams' then 'Live darshan is starting'
    when 'events' then 'New temple event announced'
    when 'festivals' then 'A sacred festival is coming'
    when 'puja_offerings' then 'New puja offering available'
    else 'New on Pratha'
  end;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notify-secret', v_secret,
      'apikey', coalesce(v_apikey, '')
    ),
    body := jsonb_build_object(
      'type', 'broadcast',
      'title', v_verb,
      'body', v_title,
      'route', case tg_table_name
        when 'live_streams' then '/darshan'
        when 'events' then '/discover'
        when 'festivals' then '/discover'
        else '/pujas'
      end
    )
  );
  return new;
end;
$$;

revoke all on function public.notify_content_published() from public, anon, authenticated;

drop trigger if exists streams_notify_publish on public.live_streams;
create trigger streams_notify_publish
  after insert or update of status on public.live_streams
  for each row execute function public.notify_content_published();

drop trigger if exists events_notify_publish on public.events;
create trigger events_notify_publish
  after insert or update of status on public.events
  for each row execute function public.notify_content_published();

drop trigger if exists festivals_notify_publish on public.festivals;
create trigger festivals_notify_publish
  after insert or update of status on public.festivals
  for each row execute function public.notify_content_published();

drop trigger if exists offerings_notify_publish on public.puja_offerings;
create trigger offerings_notify_publish
  after insert or update of status on public.puja_offerings
  for each row execute function public.notify_content_published();

-- Weekly return-visit nudge: Sundays 08:30 IST = 03:00 UTC
select cron.schedule(
  'engagement-weekly',
  '0 3 * * 0',
  $$select net.http_post(
    'https://yxwwgynxgihrktwndhep.supabase.co/functions/v1/notify-send',
    headers := jsonb_build_object(
      'x-notify-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'notify_hook_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{"type":"broadcast","title":"Begin your week with blessings 🙏","body":"New pujas, live darshan and seva await — plan your sacred week.","route":"/"}'::jsonb
  )$$
);
