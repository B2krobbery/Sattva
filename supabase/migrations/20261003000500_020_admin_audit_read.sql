-- 020: Let admins read audit_log for the Sanctum Control activity surface.
create policy audit_log_admin on public.audit_log
  for select to authenticated
  using (public.is_admin());
