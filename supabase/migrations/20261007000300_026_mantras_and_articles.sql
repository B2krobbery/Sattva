-- 026: Mantra library + Dharma knowledge articles (Learn section).

create table if not exists public.mantras (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  name_devanagari text,
  deity text,
  transliteration text,
  meaning_i18n jsonb not null default '{}'::jsonb,
  audio_url text,
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_i18n jsonb not null default '{}'::jsonb,
  excerpt_i18n jsonb not null default '{}'::jsonb,
  body_i18n jsonb not null default '{}'::jsonb,
  level text not null default 'beginner' check (level in ('beginner','intermediate','advanced')),
  source_type text check (source_type in ('purana','itihasa','agama','temple_tradition','acharya','modern')),
  claim_type text not null default 'tradition' check (claim_type in ('scriptural','traditional','historical','interpretation')),
  category text,
  cover_image_url text,
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mantras enable row level security;
alter table public.articles enable row level security;

create policy mantras_public_read on public.mantras
  for select using (status = 'published');
create policy mantras_admin_write on public.mantras
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy articles_public_read on public.articles
  for select using (status = 'published');
create policy articles_admin_write on public.articles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create index if not exists mantras_status_idx on public.mantras (status, featured);
create index if not exists articles_status_idx on public.articles (status, published_at);

-- Seed content is applied in 027_seed_mantras_articles.sql for editability.
