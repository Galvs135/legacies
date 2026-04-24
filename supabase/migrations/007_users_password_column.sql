alter table public.users
  add column if not exists password text;

update public.users
set password = coalesce(password, '123456')
where password is null;

alter table public.users
  alter column password set not null;
