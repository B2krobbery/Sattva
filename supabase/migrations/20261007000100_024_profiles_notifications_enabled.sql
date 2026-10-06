-- 024: User-controlled switch for engagement/non-transactional notifications.
-- marketing_opt_in stays for marketing email; this gates daily nudges + broadcasts.
alter table public.profiles
  add column if not exists notifications_enabled boolean not null default true;
