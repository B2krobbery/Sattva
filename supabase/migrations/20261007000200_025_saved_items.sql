-- 025: Devotee-saved sacred items (My Journey bookmarks).
create table if not exists public.saved_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('temple','festival','event','puja')),
  entity_slug text not null,
  entity_title text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, entity_type, entity_slug)
);

alter table public.saved_items enable row level security;

create policy saved_own_select on public.saved_items
  for select to authenticated using (user_id = auth.uid());
create policy saved_own_insert on public.saved_items
  for insert to authenticated with check (user_id = auth.uid());
create policy saved_own_delete on public.saved_items
  for delete to authenticated using (user_id = auth.uid());
