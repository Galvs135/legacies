insert into public.users (id, email, full_name, role, password)
values (
  gen_random_uuid(),
  'lg_franca@hotmail.com',
  'LG Franca',
  'admin',
  '123456'
)
on conflict (email) do update
set full_name = excluded.full_name,
    role = excluded.role,
    password = excluded.password;
