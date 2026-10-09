-- 030: saved_items schema drift — the remote table predates the repo contract.
-- Live table had PK (user_id, entity_type, entity_id uuid); the client writes
-- entity_slug/entity_title → every save POST failed PGRST204 (silent in UI).
-- Table holds no rows, so re-shape it to the repo contract.
alter table public.saved_items drop constraint saved_items_pkey;
alter table public.saved_items drop column entity_id;
alter table public.saved_items add column entity_slug text not null;
alter table public.saved_items add column entity_title text not null;
alter table public.saved_items add primary key (user_id, entity_type, entity_slug);
