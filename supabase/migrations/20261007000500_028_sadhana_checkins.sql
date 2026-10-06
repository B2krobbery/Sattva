-- 028: Daily sadhana practice check-ins (streak tracking).
create table if not exists public.sadhana_checkins (
  user_id uuid not null references auth.users(id) on delete cascade,
  for_date date not null default current_date,
  practice text not null default 'mantra',
  created_at timestamptz not null default now(),
  primary key (user_id, for_date, practice)
);

alter table public.sadhana_checkins enable row level security;

create policy sadhana_own_select on public.sadhana_checkins
  for select to authenticated using (user_id = auth.uid());
create policy sadhana_own_insert on public.sadhana_checkins
  for insert to authenticated with check (user_id = auth.uid());
create policy sadhana_own_delete on public.sadhana_checkins
  for delete to authenticated using (user_id = auth.uid());
