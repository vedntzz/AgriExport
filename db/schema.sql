create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (audience in ('Delegate', 'Sponsor')),
  prefix text,
  full_name text,
  designation text,
  mobile text,
  email text,
  organisation text,
  category text,
  package text,
  message text,
  consent boolean,
  created_at timestamptz default now()
);

alter table public.registrations enable row level security;
