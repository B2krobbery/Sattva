-- 022: unique(token) on push_tokens — client upserts onConflict 'token';
-- without this the upsert fails "no unique constraint matching ON CONFLICT".
alter table public.push_tokens
  add constraint push_tokens_token_key unique (token);
