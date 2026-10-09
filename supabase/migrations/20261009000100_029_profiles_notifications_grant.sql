-- 029: notifications_enabled missing from the column-level UPDATE grant.
-- 024 added the column but 005/023-style grants never included it, so the
-- Settings "Devotional Notifications" toggle PATCH 403s and silently reverts.
grant update (notifications_enabled) on public.profiles to authenticated;
