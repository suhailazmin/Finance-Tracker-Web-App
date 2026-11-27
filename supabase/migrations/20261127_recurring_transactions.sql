-- Recurring transactions (salary, rent, bills). Run once in Supabase:
-- Dashboard -> SQL Editor -> New query -> paste this file -> Run.

create table if not exists recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  type text not null check (type in ('income','expense')),
  category_id uuid references categories on delete set null,
  day_of_month int not null check (day_of_month between 1 and 31),  -- 29-31 fall back to the month's last day
  start_month date not null,              -- first month it applies (always the 1st)
  last_month date,                        -- last month it was added or skipped (always the 1st)
  auto_add boolean not null default true, -- false = ask first on the dashboard
  active boolean not null default true,   -- false = paused
  created_at timestamptz default now()
);

alter table recurring_transactions enable row level security;

drop policy if exists "own rows" on recurring_transactions;
create policy "own rows" on recurring_transactions for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Transactions it creates have source = 'recurring' and import_hash = 'recurring:<id>:<yyyy-MM>',
-- so the existing unique (user_id, import_hash) constraint stops a month being added twice.
