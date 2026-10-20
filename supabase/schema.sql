-- Finance Tracker database schema
-- Run once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

-- Categories (Groceries, Petrol, Food, Bills, Transport, Salary...)
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  type text not null check (type in ('income','expense')),
  color text default '#64748b',
  unique (user_id, name)
);

-- Transactions (all amounts in RM, always positive; type says direction)
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  type text not null check (type in ('income','expense')),
  category_id uuid references categories on delete set null,
  source text default 'manual',          -- manual | maybank | cimb | tng | generic
  import_hash text,                       -- for skipping duplicate imports
  created_at timestamptz default now(),
  unique (user_id, import_hash)
);

-- Auto-categorization rules (keyword -> category)
create table category_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  keyword text not null,                  -- e.g. 'PETRONAS'
  category_id uuid not null references categories on delete cascade,
  priority int default 0                  -- higher wins (GRABFOOD before GRAB)
);

-- Monthly budgets
create table budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  category_id uuid not null references categories on delete cascade,
  month date not null,                    -- always the 1st, e.g. 2026-10-01
  limit_amount numeric(12,2) not null check (limit_amount > 0),
  unique (user_id, category_id, month)
);

-- Savings goals (e.g. Emergency Fund)
create table savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  target_amount numeric(12,2) not null check (target_amount > 0),
  current_amount numeric(12,2) not null default 0,
  target_date date
);

create index on transactions (user_id, date);

-- Row Level Security: each user only sees their own rows
do $$
declare t text;
begin
  foreach t in array array['categories','transactions','category_rules','budgets','savings_goals']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "own rows" on %I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

-- Give every new user default categories and Malaysian merchant rules
create or replace function public.seed_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into categories (user_id, name, type, color) values
    (new.id, 'Groceries', 'expense', '#16a34a'),
    (new.id, 'Petrol',    'expense', '#ea580c'),
    (new.id, 'Food',      'expense', '#dc2626'),
    (new.id, 'Bills',     'expense', '#2563eb'),
    (new.id, 'Transport', 'expense', '#7c3aed'),
    (new.id, 'Shopping',  'expense', '#db2777'),
    (new.id, 'Others',    'expense', '#64748b'),
    (new.id, 'Salary',    'income',  '#059669'),
    (new.id, 'Other Income', 'income', '#0d9488');

  insert into category_rules (user_id, keyword, category_id, priority)
  select new.id, r.keyword, c.id, r.priority
  from (values
    ('PETRONAS', 'Petrol', 0), ('SHELL', 'Petrol', 0), ('PETRON', 'Petrol', 0),
    ('BHP', 'Petrol', 0), ('CALTEX', 'Petrol', 0),
    ('JAYA GROCER', 'Groceries', 0), ('LOTUS', 'Groceries', 0), ('MYDIN', 'Groceries', 0),
    ('AEON', 'Groceries', 0), ('99 SPEEDMART', 'Groceries', 0), ('NSK', 'Groceries', 0),
    ('GIANT', 'Groceries', 0), ('VILLAGE GROCER', 'Groceries', 0),
    ('GRABFOOD', 'Food', 10), ('FOODPANDA', 'Food', 0), ('SHOPEEFOOD', 'Food', 0),
    ('MCDONALD', 'Food', 0), ('KFC', 'Food', 0), ('MAMAK', 'Food', 0),
    ('TNB', 'Bills', 0), ('AIR SELANGOR', 'Bills', 0), ('UNIFI', 'Bills', 0),
    ('MAXIS', 'Bills', 0), ('CELCOM', 'Bills', 0), ('DIGI', 'Bills', 0),
    ('U MOBILE', 'Bills', 0), ('ASTRO', 'Bills', 0), ('IWK', 'Bills', 0),
    ('GRAB', 'Transport', 1), ('RAPID KL', 'Transport', 0), ('MRT', 'Transport', 0),
    ('LRT', 'Transport', 0), ('PLUS', 'Transport', 0), ('SMARTTAG', 'Transport', 0),
    ('PARKING', 'Transport', 0)
  ) as r(keyword, category, priority)
  join categories c on c.user_id = new.id and c.name = r.category;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.seed_new_user();
