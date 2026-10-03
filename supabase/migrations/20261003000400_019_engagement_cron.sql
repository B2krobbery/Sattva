-- 019: Daily AI engagement orchestration schedule (pg_cron).
--
-- Two jobs, IST morning (03:30 / 03:38 UTC):
--   engagement-plan — Gemini picks each devotee's next-best action into
--                     notification_outbox
--   engagement-send — drains outbox to in-app inbox + Resend + FCM
--
-- Auth: x-notify-secret read from vault at call time; nothing secret in SQL.
-- To disable: select cron.unschedule('engagement-plan'), cron.unschedule('engagement-send');

select cron.schedule(
  'engagement-plan',
  '30 3 * * *',
  $$select net.http_post(
    'https://yxwwgynxgihrktwndhep.supabase.co/functions/v1/engagement-orchestrator',
    headers := jsonb_build_object(
      'x-notify-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'notify_hook_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{"action":"plan"}'::jsonb
  )$$
);

select cron.schedule(
  'engagement-send',
  '38 3 * * *',
  $$select net.http_post(
    'https://yxwwgynxgihrktwndhep.supabase.co/functions/v1/engagement-orchestrator',
    headers := jsonb_build_object(
      'x-notify-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'notify_hook_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{"action":"send"}'::jsonb
  )$$
);
