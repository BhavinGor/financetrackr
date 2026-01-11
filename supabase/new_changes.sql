alter table transactions
add column is_fuel boolean default false,
add column is_investment boolean default false;


drop table if exists fuel_logs cascade;
drop table if exists investments cascade;


create table fuel_transactions (
  transaction_id uuid primary key
    references transactions(id) on delete cascade,

  user_id uuid references profiles(id) on delete cascade not null,
  vehicle_id uuid references vehicles(id) on delete restrict,

  liters numeric not null,
  mileage numeric,

  created_at timestamp with time zone default now()
);


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


alter table fuel_transactions enable row level security;
alter table investment_transactions enable row level security;

create policy "Users manage own fuel transactions"
on fuel_transactions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users manage own investment transactions"
on investment_transactions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


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

create index on transactions (user_id, date desc);
create index on transactions (account_id);
create index on fuel_transactions (vehicle_id);







