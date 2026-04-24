do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'users' and policyname = 'users_admin_manage_all'
  ) then
    create policy "users_admin_manage_all"
    on public.users for all
    using (
      coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    )
    with check (
      coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    );
  end if;
end $$;
