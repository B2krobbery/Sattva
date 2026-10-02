-- 018: FCM push tokens. The app registers its FCM token post-auth; the
-- notify-send edge function reads them (service_role) to deliver pushes.

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  platform text not null default 'android',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_tokens_user_id_idx on public.push_tokens(user_id);

alter table public.push_tokens enable row level security;

-- Users upsert only their own tokens.
create policy push_tokens_select_own on public.push_tokens
  for select to authenticated using (user_id = auth.uid());
create policy push_tokens_insert_own on public.push_tokens
  for insert to authenticated with check (user_id = auth.uid());
create policy push_tokens_update_own on public.push_tokens
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_tokens_delete_own on public.push_tokens
  for delete to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.push_tokens to authenticated;
grant all on public.push_tokens to service_role;
