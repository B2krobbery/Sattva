-- 014: birth details for janma-based puja recommendations.
-- dob/tob/pob feed the kundali-ask edge function (nakshatra, rashi, tithi, lagna).
alter table public.profiles
  add column if not exists birth_date date,
  add column if not exists birth_time time,
  add column if not exists birth_place text,
  add column if not exists birth_lat numeric,
  add column if not exists birth_lon numeric;

-- profiles uses column-scoped UPDATE grants; new columns need explicit grants.
grant update (birth_date, birth_time, birth_place, birth_lat, birth_lon)
  on public.profiles to authenticated;
