-- 016: Server-side referral attribution for the Dharma Mitra program.
-- Previously referred_by was only written to auth user_metadata and the
-- punya counter read a localStorage key nothing populated — the reward
-- step of the loop never fired. This adds a real ledger.

-- 1. Canonical referral code lives on the profile (resolvable server-side).
alter table public.profiles
  add column if not exists referral_code text;

-- Deterministic, human-friendly code: PRATHA-<NAME>-<hash>
-- Name part comes from display_name/email where available.
create unique index if not exists profiles_referral_code_key
  on public.profiles (referral_code)
  where referral_code is not null;

-- 2. The referral ledger. One row per referred user (unique) — prevents
-- double-crediting and is the basis for punya/tier stats.
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references public.profiles(id) on delete cascade,
  referred_user_id uuid not null references public.profiles(id) on delete cascade,
  code text not null,
  created_at timestamptz not null default now(),
  unique (referred_user_id),
  check (referrer_user_id <> referred_user_id)
);

alter table public.referrals enable row level security;

-- Referrers can read their own referral rows (for counts/tiers).
create policy referrals_select_own on public.referrals
  for select to authenticated
  using (referrer_user_id = auth.uid() or referred_user_id = auth.uid());

-- Inserts go through the RPC only (no direct client writes).
revoke insert, update, delete on public.referrals from authenticated;
grant select on public.referrals to authenticated;

-- 3. ensure_referral_code(): idempotent — generates and stores the caller's
-- code on first call. Mirrors the client-side format.
create or replace function public.ensure_referral_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_name text;
begin
  select referral_code into v_code from profiles where id = auth.uid();
  if v_code is not null then
    return v_code;
  end if;

  select upper(regexp_replace(
      coalesce(nullif(display_name, ''), split_part(coalesce(email, 'BHAKT'), '@', 1)),
      '[^A-Za-z0-9]', '', 'g'))
    into v_name
    from profiles where id = auth.uid();

  v_code := 'PRATHA-' || left(coalesce(nullif(v_name, ''), 'BHAKT'), 8) || '-' ||
            upper(left(replace(auth.uid()::text, '-', ''), 4));

  update profiles set referral_code = v_code where id = auth.uid();
  return v_code;
end;
$$;

grant execute on function public.ensure_referral_code() to authenticated;
revoke execute on function public.ensure_referral_code() from public, anon;

-- 4. record_referral(code): called once by a newly-signed-up user who has a
-- stored inbound code. Resolves the code → referrer, guards self-referral
-- and double-credit (unique referred_user_id).
create or replace function public.record_referral(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer uuid;
begin
  if p_code is null or length(trim(p_code)) = 0 then
    return false;
  end if;

  select id into v_referrer from profiles
   where referral_code = upper(trim(p_code));

  if v_referrer is null or v_referrer = auth.uid() then
    return false;
  end if;

  insert into referrals (referrer_user_id, referred_user_id, code)
  values (v_referrer, auth.uid(), upper(trim(p_code)))
  on conflict (referred_user_id) do nothing;

  return true;
end;
$$;

grant execute on function public.record_referral(text) to authenticated;
revoke execute on function public.record_referral(text) from public, anon;

-- 5. Backfill codes for existing profiles so early users can share today.
update profiles p
set referral_code = 'PRATHA-' ||
  left(coalesce(nullif(upper(regexp_replace(coalesce(nullif(p.display_name, ''), split_part(coalesce(p.email, 'BHAKT'), '@', 1)), '[^A-Za-z0-9]', '', 'g')), ''), 'BHAKT'), 8) ||
  '-' || upper(left(replace(p.id::text, '-', ''), 4))
where p.referral_code is null;
