do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'users' and policyname = 'users_self_insert'
  ) then
    create policy "users_self_insert"
    on public.users for insert
    with check (auth.uid() = id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'users' and policyname = 'users_self_update'
  ) then
    create policy "users_self_update"
    on public.users for update
    using (auth.uid() = id)
    with check (auth.uid() = id);
  end if;
end $$;
