-- FinanceTrackr Database Schema
-- Proper relational tables replacing the JSON blob pattern

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Savings',
    bank_name TEXT NOT NULL DEFAULT '',
    balance REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'INR',
    limit_amount REAL,
    due_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Other',
    description TEXT NOT NULL DEFAULT '',
    account_id TEXT,
    source TEXT DEFAULT 'manual',
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    category TEXT NOT NULL,
    limit_amount REAL NOT NULL DEFAULT 0,
    period TEXT NOT NULL DEFAULT 'monthly',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, category)
);

CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    make TEXT NOT NULL DEFAULT '',
    model TEXT NOT NULL DEFAULT '',
    year INTEGER NOT NULL DEFAULT 2024,
    license_plate TEXT NOT NULL DEFAULT '',
    mileage REAL NOT NULL DEFAULT 0,
    type TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS fuel_extensions (
    transaction_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    vehicle_id TEXT NOT NULL,
    liters REAL NOT NULL DEFAULT 0,
    mileage REAL,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS investment_extensions (
    transaction_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    investment_type TEXT NOT NULL DEFAULT 'Other',
    asset_name TEXT NOT NULL DEFAULT '',
    quantity REAL,
    price_per_unit REAL,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS custom_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_fuel_extensions_vehicle_id ON fuel_extensions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_custom_categories_user_id ON custom_categories(user_id);
