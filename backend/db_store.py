"""SQLite-backed local state store for FinanceTrackr.

Uses proper relational tables instead of JSON blob pattern.
"""

import json
import os
import sqlite3
from typing import Any, Dict, List, Optional

from config import Config

SCHEMA_PATH = os.path.join(os.path.dirname(__file__), 'schema.sql')


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(Config.SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    """Initialize database with schema."""
    os.makedirs(os.path.dirname(Config.SQLITE_DB_PATH), exist_ok=True)
    with _connect() as conn:
        with open(SCHEMA_PATH, 'r') as f:
            conn.executescript(f.read())
        conn.commit()


def _ensure_user(user_id: str, conn: Optional[sqlite3.Connection] = None) -> None:
    """Ensure user exists in users table."""
    should_close = False
    if conn is None:
        conn = _connect()
        should_close = True
    try:
        conn.execute(
            "INSERT OR IGNORE INTO users (id, email) VALUES (?, ?)",
            (user_id, f"{user_id}@local")
        )
        conn.commit()
    finally:
        if should_close:
            conn.close()


# ─── Account Operations ───────────────────────────────────────────

def get_accounts(user_id: str) -> List[Dict[str, Any]]:
    _ensure_user(user_id)
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM accounts WHERE user_id = ?", (user_id,)
        ).fetchall()
    return [dict(r) for r in rows]


def add_account(user_id: str, account: Dict[str, Any]) -> str:
    _ensure_user(user_id)
    account_id = account.get('id', f"acc_{os.urandom(8).hex()}")
    with _connect() as conn:
        conn.execute(
            """INSERT INTO accounts (id, user_id, name, type, bank_name, balance, currency, limit_amount, due_date)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (account_id, user_id, account.get('name', ''), account.get('type', 'Savings'),
             account.get('bankName', ''), account.get('balance', 0),
             account.get('currency', 'INR'), account.get('limit'),
             account.get('dueDate'))
        )
        conn.commit()
    return account_id


def update_account(user_id: str, account: Dict[str, Any]) -> None:
    with _connect() as conn:
        conn.execute(
            """UPDATE accounts SET name=?, type=?, bank_name=?, balance=?, currency=?, limit_amount=?, due_date=?
               WHERE id=? AND user_id=?""",
            (account.get('name', ''), account.get('type', 'Savings'),
             account.get('bankName', ''), account.get('balance', 0),
             account.get('currency', 'INR'), account.get('limit'),
             account.get('dueDate'), account.get('id'), user_id)
        )
        conn.commit()


def delete_account(user_id: str, account_id: str) -> None:
    with _connect() as conn:
        conn.execute("DELETE FROM transactions WHERE account_id=? AND user_id=?", (account_id, user_id))
        conn.execute("DELETE FROM accounts WHERE id=? AND user_id=?", (account_id, user_id))
        conn.commit()


# ─── Transaction Operations ───────────────────────────────────────

def get_transactions(user_id: str) -> List[Dict[str, Any]]:
    _ensure_user(user_id)
    with _connect() as conn:
        rows = conn.execute(
            """SELECT t.*,
                      fe.vehicle_id, fe.liters, fe.mileage,
                      ie.investment_type, ie.asset_name, ie.quantity, ie.price_per_unit
               FROM transactions t
               LEFT JOIN fuel_extensions fe ON t.id = fe.transaction_id
               LEFT JOIN investment_extensions ie ON t.id = ie.transaction_id
               WHERE t.user_id = ? ORDER BY t.date DESC""",
            (user_id,)
        ).fetchall()

    transactions = []
    for r in rows:
        tx = dict(r)
        vehicle_id = tx.pop('vehicle_id', None)
        if vehicle_id:
            mileage = tx.pop('mileage', None)
            tx['metadata'] = {
                'vehicleId': vehicle_id,
                'liters': tx.pop('liters', None),
                'mileage': mileage,
                'odometer': mileage,
            }
        else:
            tx.pop('liters', None)
            tx.pop('mileage', None)

        asset_name = tx.pop('asset_name', None)
        if asset_name:
            quantity = tx.pop('quantity', None)
            price_per_unit = tx.pop('price_per_unit', None)
            tx['metadata'] = {
                'investmentId': tx['id'],
                'investmentType': tx.pop('investment_type', None),
                'assetName': asset_name,
                'quantity': quantity,
                'units': quantity,
                'pricePerUnit': price_per_unit,
                'price': price_per_unit,
            }
        else:
            tx.pop('investment_type', None)
            tx.pop('quantity', None)
            tx.pop('price_per_unit', None)

        transactions.append(tx)
    return transactions


def add_transaction(user_id: str, transaction: Dict[str, Any]) -> str:
    _ensure_user(user_id)
    tx_id = transaction.get('id', f"tx_{os.urandom(8).hex()}")
    with _connect() as conn:
        conn.execute(
            """INSERT INTO transactions (id, user_id, date, amount, type, category, description, account_id, source, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (tx_id, user_id, transaction.get('date', ''), transaction.get('amount', 0),
             transaction.get('type', 'Expense'), transaction.get('category', 'Other'),
             transaction.get('description', ''), transaction.get('accountId', ''),
             transaction.get('source', 'manual'), transaction.get('notes'))
        )
        conn.commit()
    return tx_id


def update_transaction(user_id: str, transaction: Dict[str, Any]) -> int:
    tx_id = transaction.get('id')
    with _connect() as conn:
        cursor = conn.execute(
            """UPDATE transactions SET date=?, amount=?, type=?, category=?, description=?, account_id=?, source=?, notes=?
               WHERE id=? AND user_id=?""",
            (transaction.get('date', ''), transaction.get('amount', 0),
             transaction.get('type', 'Expense'), transaction.get('category', 'Other'),
             transaction.get('description', ''), transaction.get('accountId', ''),
             transaction.get('source', 'manual'), transaction.get('notes'),
             tx_id, user_id)
        )
        rows_updated = cursor.rowcount
        # Handle metadata (fuel/investment extensions)
        metadata = transaction.get('metadata', {})
        is_fuel = transaction.get('category') == 'Fuel' and metadata.get('vehicleId')
        is_investment = transaction.get('category') in ('Investment', 'Savings') and (metadata.get('investmentId') or metadata.get('assetName'))

        # Clear existing extensions
        conn.execute("DELETE FROM fuel_extensions WHERE transaction_id=?", (tx_id,))
        conn.execute("DELETE FROM investment_extensions WHERE transaction_id=?", (tx_id,))

        if is_fuel:
            conn.execute(
                """INSERT INTO fuel_extensions (transaction_id, user_id, vehicle_id, liters, mileage)
                   VALUES (?, ?, ?, ?, ?)""",
                (tx_id, user_id, metadata['vehicleId'],
                 float(metadata.get('liters', 0)),
                 float(metadata.get('odometer') or metadata.get('mileage', 0)))
            )
        elif is_investment:
            conn.execute(
                """INSERT INTO investment_extensions (transaction_id, user_id, investment_type, asset_name, quantity, price_per_unit)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (tx_id, user_id, metadata.get('investmentType', 'Other'),
                 metadata.get('assetName', 'Investment'),
                 float(metadata.get('quantity') or metadata.get('units', 0)),
                 float(metadata.get('pricePerUnit') or metadata.get('price', 0)))
            )
        conn.commit()
    return rows_updated


def delete_transaction(user_id: str, tx_id: str) -> None:
    with _connect() as conn:
        conn.execute("DELETE FROM fuel_extensions WHERE transaction_id=?", (tx_id,))
        conn.execute("DELETE FROM investment_extensions WHERE transaction_id=?", (tx_id,))
        conn.execute("DELETE FROM transactions WHERE id=? AND user_id=?", (tx_id, user_id))
        conn.commit()


def add_transaction_with_extensions(
    user_id: str,
    transaction: Dict[str, Any],
    fuel_data: Optional[Dict[str, Any]] = None,
    investment_data: Optional[Dict[str, Any]] = None,
) -> str:
    """Add transaction with optional fuel or investment extension in one transaction."""
    _ensure_user(user_id)
    tx_id = transaction.get('id', f"tx_{os.urandom(8).hex()}")
    with _connect() as conn:
        conn.execute(
            """INSERT INTO transactions (id, user_id, date, amount, type, category, description, account_id, source, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (tx_id, user_id, transaction.get('date', ''), transaction.get('amount', 0),
             transaction.get('type', 'Expense'), transaction.get('category', 'Other'),
             transaction.get('description', ''), transaction.get('accountId', ''),
             transaction.get('source', 'manual'), transaction.get('notes'))
        )
        if fuel_data:
            conn.execute(
                """INSERT INTO fuel_extensions (transaction_id, user_id, vehicle_id, liters, mileage)
                   VALUES (?, ?, ?, ?, ?)""",
                (tx_id, user_id, fuel_data['vehicleId'],
                 float(fuel_data.get('liters', 0)),
                 float(fuel_data.get('mileage', 0)))
            )
        if investment_data:
            conn.execute(
                """INSERT INTO investment_extensions (transaction_id, user_id, investment_type, asset_name, quantity, price_per_unit)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (tx_id, user_id, investment_data.get('investmentType', 'Other'),
                 investment_data.get('assetName', 'Investment'),
                 float(investment_data.get('quantity', 0)),
                 float(investment_data.get('pricePerUnit', 0)))
            )
        conn.commit()
    return tx_id


# ─── Fuel Extension Helpers ───────────────────────────────────────


def get_fuel_transactions(user_id: str) -> List[Dict[str, Any]]:
    with _connect() as conn:
        rows = conn.execute(
            """SELECT fe.*, t.date, t.amount
               FROM fuel_extensions fe
               JOIN transactions t ON fe.transaction_id = t.id
               WHERE fe.user_id = ?
               ORDER BY t.date DESC""",
            (user_id,)
        ).fetchall()
    return [dict(r) for r in rows]


def get_fuel_transactions_for_vehicle(user_id: str, vehicle_id: str) -> List[Dict[str, Any]]:
    with _connect() as conn:
        rows = conn.execute(
            """SELECT fe.*, t.date, t.amount
               FROM fuel_extensions fe
               JOIN transactions t ON fe.transaction_id = t.id
               WHERE fe.user_id = ? AND fe.vehicle_id = ?
               ORDER BY t.date DESC""",
            (user_id, vehicle_id)
        ).fetchall()
    return [dict(r) for r in rows]



# ─── Investment Extension Helpers ─────────────────────────────────

def get_investment_transactions(user_id: str) -> List[Dict[str, Any]]:
    with _connect() as conn:
        rows = conn.execute(
            """SELECT ie.*, t.date, t.amount
               FROM investment_extensions ie
               JOIN transactions t ON ie.transaction_id = t.id
               WHERE ie.user_id = ?
               ORDER BY t.date DESC""",
            (user_id,)
        ).fetchall()
    return [dict(r) for r in rows]


# ─── Budget Operations ────────────────────────────────────────────

def get_budgets(user_id: str) -> List[Dict[str, Any]]:
    _ensure_user(user_id)
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM budgets WHERE user_id = ?", (user_id,)
        ).fetchall()
    return [dict(r) for r in rows]


def save_budgets(user_id: str, budgets: List[Dict[str, Any]]) -> None:
    _ensure_user(user_id)
    with _connect() as conn:
        conn.execute("DELETE FROM budgets WHERE user_id=?", (user_id,))
        for b in budgets:
            conn.execute(
                """INSERT INTO budgets (id, user_id, category, limit_amount, period)
                   VALUES (?, ?, ?, ?, ?)""",
                (b.get('id', f"bud_{os.urandom(8).hex()}"), user_id,
                 b.get('category', ''), b.get('limit', 0), b.get('period', 'monthly'))
            )
        conn.commit()


# ─── Vehicle Operations ───────────────────────────────────────────

def get_vehicles(user_id: str) -> List[Dict[str, Any]]:
    _ensure_user(user_id)
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM vehicles WHERE user_id = ?", (user_id,)
        ).fetchall()
    return [dict(r) for r in rows]


def add_vehicle(user_id: str, vehicle: Dict[str, Any]) -> str:
    _ensure_user(user_id)
    vehicle_id = vehicle.get('id', f"veh_{os.urandom(8).hex()}")
    with _connect() as conn:
        conn.execute(
            """INSERT INTO vehicles (id, user_id, name, make, model, year, license_plate, mileage, type)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (vehicle_id, user_id, vehicle.get('name', ''), vehicle.get('make', ''),
             vehicle.get('model', ''), vehicle.get('year', 2024),
             vehicle.get('licensePlate', ''), vehicle.get('mileage', 0),
             vehicle.get('type'))
        )
        conn.commit()
    return vehicle_id


def update_vehicle(user_id: str, vehicle: Dict[str, Any]) -> None:
    with _connect() as conn:
        conn.execute(
            """UPDATE vehicles SET name=?, make=?, model=?, year=?, license_plate=?, mileage=?, type=?
               WHERE id=? AND user_id=?""",
            (vehicle.get('name', ''), vehicle.get('make', ''),
             vehicle.get('model', ''), vehicle.get('year', 2024),
             vehicle.get('licensePlate', ''), vehicle.get('mileage', 0),
             vehicle.get('type'), vehicle.get('id'), user_id)
        )
        conn.commit()


def delete_vehicle(user_id: str, vehicle_id: str) -> None:
    with _connect() as conn:
        conn.execute(
            """DELETE FROM fuel_extensions WHERE vehicle_id=? AND user_id=?""",
            (vehicle_id, user_id)
        )
        conn.execute(
            """DELETE FROM vehicles WHERE id=? AND user_id=?""",
            (vehicle_id, user_id)
        )
        conn.commit()


# ─── Custom Category Operations ───────────────────────────────────

def get_custom_categories(user_id: str) -> List[str]:
    _ensure_user(user_id)
    with _connect() as conn:
        rows = conn.execute(
            "SELECT name FROM custom_categories WHERE user_id = ? ORDER BY name",
            (user_id,)
        ).fetchall()
    return [r['name'] for r in rows]


def add_custom_category(user_id: str, name: str) -> None:
    _ensure_user(user_id)
    trimmed = name.strip()
    if not trimmed:
        return
    with _connect() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO custom_categories (user_id, name) VALUES (?, ?)",
            (user_id, trimmed)
        )
        conn.commit()


def delete_custom_category(user_id: str, name: str) -> None:
    with _connect() as conn:
        conn.execute(
            "DELETE FROM custom_categories WHERE user_id=? AND name=?",
            (user_id, name)
        )
        conn.commit()


# ─── Legacy Compatibility ─────────────────────────────────────────
# Keep get_state/save_state for migration purposes

def get_state(user_id: str) -> Dict[str, Any]:
    """Legacy: Get all data as a single dict (for migration)."""
    return {
        'transactions': get_transactions(user_id),
        'accounts': get_accounts(user_id),
        'budgets': get_budgets(user_id),
        'vehicles': get_vehicles(user_id),
        'fuelTransactions': get_fuel_transactions(user_id),
        'investmentTransactions': get_investment_transactions(user_id),
        'customCategories': get_custom_categories(user_id),
    }


def save_state(user_id: str, state: Dict[str, Any]) -> Dict[str, Any]:
    """Legacy: Save all data from a single dict (for migration)."""
    for acc in state.get('accounts', []):
        add_account(user_id, acc)
    for tx in state.get('transactions', []):
        add_transaction(user_id, tx)
    save_budgets(user_id, state.get('budgets', []))
    for veh in state.get('vehicles', []):
        add_vehicle(user_id, veh)
    for cat in state.get('customCategories', []):
        add_custom_category(user_id, cat)
    return get_state(user_id)
