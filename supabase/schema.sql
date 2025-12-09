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

-- Fuel Logs table
create table fuel_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  vehicle_id uuid, -- Link to a vehicles table if needed, or just store metadata
  date date not null,
  liters numeric not null,
  cost numeric not null,
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

-- Investments table
create table investments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  type text not null, -- Indian Stock, Mutual Fund, etc.
  invested_amount numeric not null,
  current_value numeric not null,
  quantity numeric,
  date date not null,
  created_at timestamp with time zone default now()
);

-- RLS Policies (Row Level Security)
alter table profiles enable row level security;
alter table accounts enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;
alter table fuel_logs enable row level security;
alter table vehicles enable row level security;
alter table investments enable row level security;

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

-- Fuel Logs policies
create policy "Users can view own fuel logs." on fuel_logs for select using ( auth.uid() = user_id );
create policy "Users can insert own fuel logs." on fuel_logs for insert with check ( auth.uid() = user_id );
create policy "Users can update own fuel logs." on fuel_logs for update using ( auth.uid() = user_id );
create policy "Users can delete own fuel logs." on fuel_logs for delete using ( auth.uid() = user_id );

-- Vehicles policies
create policy "Users can view own vehicles." on vehicles for select using ( auth.uid() = user_id );
create policy "Users can insert own vehicles." on vehicles for insert with check ( auth.uid() = user_id );
create policy "Users can update own vehicles." on vehicles for update using ( auth.uid() = user_id );
create policy "Users can delete own vehicles." on vehicles for delete using ( auth.uid() = user_id );

-- Investments policies
create policy "Users can view own investments." on investments for select using ( auth.uid() = user_id );
create policy "Users can insert own investments." on investments for insert with check ( auth.uid() = user_id );
create policy "Users can update own investments." on investments for update using ( auth.uid() = user_id );
create policy "Users can delete own investments." on investments for delete using ( auth.uid() = user_id );

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
