-- 023: profiles birth columns missing from the column-level UPDATE grant
-- (005 granted display_name/phone/gotra/nakshatra/city/… but not
-- birth_date/birth_time/birth_place). updateProfile always writes birth
-- fields → EVERY profile save failed with 42501 — phone, birth details,
-- everything. This is the root cause of the "phone won't save" +
-- "birth modal keeps appearing" device reports.
grant update (birth_date, birth_time, birth_place) on public.profiles to authenticated;
