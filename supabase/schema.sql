-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (linked to auth.users)
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone
);

-- Accounts table
create table accounts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  type text not null, -- Checking, Savings, etc.
  bank_name text,
  balance numeric default 0,
  currency text default 'INR',
  credit_limit numeric,
  due_date date,
  created_at timestamp with time zone default now()
);

-- Transactions table
create table transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  account_id uuid references accounts(id) on delete cascade,
  date date not null,
  amount numeric not null,
  type text not null, -- Income, Expense
  category text not null,
  description text,
  source text default 'manual', -- manual, gmail, csv
  is_fuel boolean default false,
  is_investment boolean default false,
  created_at timestamp with time zone default now()
);

-- Budgets table
create table budgets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  category text not null,
  "limit" numeric not null,
  created_at timestamp with time zone default now()
);

-- Fuel Transactions extension table
create table fuel_transactions (
  transaction_id uuid primary key
    references transactions(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade not null,
  vehicle_id uuid references vehicles(id) on delete restrict,
  liters numeric not null,
  mileage numeric,
  created_at timestamp with time zone default now()
);

-- Vehicles table
create table vehicles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  make text not null,
  model text not null,
  year integer not null,
  license_plate text not null,
  mileage numeric default 0,
  type text, -- SUV, Sedan, etc.
  created_at timestamp with time zone default now()
);

-- Investment Transactions extension table
create table investment_transactions (
  transaction_id uuid primary key
    references transactions(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade not null,
  investment_type text not null,
  asset_name text not null,
  quantity numeric,
  price_per_unit numeric,
  created_at timestamp with time zone default now()
);

-- RLS Policies (Row Level Security)
alter table profiles enable row level security;
alter table accounts enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;
alter table fuel_transactions enable row level security;
alter table vehicles enable row level security;
alter table investment_transactions enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone." on profiles for select using ( true );
create policy "Users can insert their own profile." on profiles for insert with check ( auth.uid() = id );
create policy "Users can update own profile." on profiles for update using ( auth.uid() = id );

-- Accounts policies
create policy "Users can view own accounts." on accounts for select using ( auth.uid() = user_id );
create policy "Users can insert own accounts." on accounts for insert with check ( auth.uid() = user_id );
create policy "Users can update own accounts." on accounts for update using ( auth.uid() = user_id );
create policy "Users can delete own accounts." on accounts for delete using ( auth.uid() = user_id );

-- Transactions policies
create policy "Users can view own transactions." on transactions for select using ( auth.uid() = user_id );
create policy "Users can insert own transactions." on transactions for insert with check ( auth.uid() = user_id );
create policy "Users can update own transactions." on transactions for update using ( auth.uid() = user_id );
create policy "Users can delete own transactions." on transactions for delete using ( auth.uid() = user_id );

-- Budgets policies
create policy "Users can view own budgets." on budgets for select using ( auth.uid() = user_id );
create policy "Users can insert own budgets." on budgets for insert with check ( auth.uid() = user_id );
create policy "Users can update own budgets." on budgets for update using ( auth.uid() = user_id );
create policy "Users can delete own budgets." on budgets for delete using ( auth.uid() = user_id );

-- Fuel Transactions policies
create policy "Users manage own fuel transactions" on fuel_transactions for all using ( auth.uid() = user_id ) with check ( auth.uid() = user_id );

-- Vehicles policies
create policy "Users can view own vehicles." on vehicles for select using ( auth.uid() = user_id );
create policy "Users can insert own vehicles." on vehicles for insert with check ( auth.uid() = user_id );
create policy "Users can update own vehicles." on vehicles for update using ( auth.uid() = user_id );
create policy "Users can delete own vehicles." on vehicles for delete using ( auth.uid() = user_id );

-- Investment Transactions policies
create policy "Users manage own investment transactions" on investment_transactions for all using ( auth.uid() = user_id ) with check ( auth.uid() = user_id );

-- Custom Categories table
create table custom_categories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  created_at timestamp with time zone default now(),
  unique(user_id, name)
);

-- Custom Categories policies
alter table custom_categories enable row level security;

create policy "Users can view own categories." on custom_categories for select using ( auth.uid() = user_id );
create policy "Users can insert own categories." on custom_categories for insert with check ( auth.uid() = user_id );
create policy "Users can delete own categories." on custom_categories for delete using ( auth.uid() = user_id );

-- Validation Triggers for Transaction Extensions
create or replace function validate_fuel_transaction()
returns trigger as $$
begin
  if not exists (
    select 1
    from transactions
    where id = new.transaction_id
      and is_fuel = true
  ) then
    raise exception 'Transaction % is not marked as fuel', new.transaction_id;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger fuel_transaction_validation
before insert or update on fuel_transactions
for each row
execute procedure validate_fuel_transaction();

create or replace function validate_investment_transaction()
returns trigger as $$
begin
  if not exists (
    select 1
    from transactions
    where id = new.transaction_id
      and is_investment = true
  ) then
    raise exception 'Transaction % is not marked as investment', new.transaction_id;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger investment_transaction_validation
before insert or update on investment_transactions
for each row
execute procedure validate_investment_transaction();

-- Performance Indexes
create index on transactions (user_id, date desc);
create index on transactions (account_id);
create index on fuel_transactions (vehicle_id);
create index on investment_transactions (asset_name);

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
