create table if not exists public.users (
  id uuid primary key,
  email text unique not null,
  full_name text not null,
  role text not null check (role in ('admin', 'advogado')),
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id),
  name text not null,
  document text,
  type text not null check (type in ('pf', 'pj')),
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id),
  client_id uuid references public.clients(id),
  source text not null,
  status text not null default 'novo',
  interest_level int not null default 1 check (interest_level between 1 and 5),
  created_at timestamptz not null default now()
);

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id),
  client_id uuid not null references public.clients(id),
  title text not null,
  pipeline_stage text not null default 'prospeccao',
  close_probability numeric(5,2) default 0.00,
  estimated_value numeric(12,2) default 0.00,
  created_at timestamptz not null default now()
);

create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  interaction_type text not null,
  content text not null,
  sentiment text,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  file_path text not null,
  version int not null default 1,
  uploaded_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.leads enable row level security;
alter table public.cases enable row level security;
alter table public.interactions enable row level security;
alter table public.documents enable row level security;

create policy "users_self_read"
on public.users for select
using (auth.uid() = id);

create policy "owner_clients_rw"
on public.clients for all
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

create policy "owner_leads_rw"
on public.leads for all
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

create policy "owner_cases_rw"
on public.cases for all
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);
