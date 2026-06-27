"""Tests for database store operations."""
import os
import sys
import pytest

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from db_store import (
    init_db,
    get_accounts, add_account, update_account, delete_account,
    get_transactions, add_transaction, delete_transaction,
    get_vehicles, add_vehicle, delete_vehicle,
    get_budgets, save_budgets,
    get_custom_categories, add_custom_category, delete_custom_category,
)


@pytest.fixture(autouse=True)
def setup_db(tmp_path):
    """Use a temporary database for each test."""
    import config
    config.Config.SQLITE_DB_PATH = str(tmp_path / 'test.db')
    init_db()
    yield


def test_add_and_get_account():
    user_id = 'user_test_1'
    account = {'name': 'HDFC Savings', 'type': 'Savings', 'bankName': 'HDFC', 'balance': 50000}
    account_id = add_account(user_id, account)
    assert account_id.startswith('acc_')

    accounts = get_accounts(user_id)
    assert len(accounts) == 1
    assert accounts[0]['name'] == 'HDFC Savings'
    assert accounts[0]['balance'] == 50000


def test_update_account():
    user_id = 'user_test_2'
    account = {'name': 'SBI Account', 'type': 'Savings', 'bankName': 'SBI', 'balance': 10000}
    account_id = add_account(user_id, account)

    update_account(user_id, {'id': account_id, 'name': 'SBI Updated', 'balance': 15000})
    accounts = get_accounts(user_id)
    assert accounts[0]['name'] == 'SBI Updated'
    assert accounts[0]['balance'] == 15000


def test_delete_account():
    user_id = 'user_test_3'
    account = {'name': 'To Delete', 'type': 'Savings', 'bankName': 'Bank', 'balance': 0}
    account_id = add_account(user_id, account)
    delete_account(user_id, account_id)
    assert len(get_accounts(user_id)) == 0


def test_add_transaction():
    user_id = 'user_test_4'
    # First add an account
    account = {'name': 'Test Account', 'type': 'Savings', 'bankName': 'Bank', 'balance': 10000}
    account_id = add_account(user_id, account)

    tx = {'date': '2024-03-25', 'amount': 500, 'type': 'Expense', 'category': 'Food', 'description': 'Lunch', 'accountId': account_id}
    tx_id = add_transaction(user_id, tx)
    assert tx_id.startswith('tx_')

    transactions = get_transactions(user_id)
    assert len(transactions) == 1
    assert transactions[0]['amount'] == 500


def test_add_and_get_vehicles():
    user_id = 'user_test_5'
    vehicle = {'name': 'My Car', 'make': 'Maruti', 'model': 'Swift', 'year': 2024, 'licensePlate': 'MH12AB1234', 'mileage': 5000}
    vehicle_id = add_vehicle(user_id, vehicle)
    assert vehicle_id.startswith('veh_')

    vehicles = get_vehicles(user_id)
    assert len(vehicles) == 1
    assert vehicles[0]['name'] == 'My Car'


def test_save_and_get_budgets():
    user_id = 'user_test_6'
    budgets = [
        {'category': 'Food', 'limit': 5000, 'period': 'monthly'},
        {'category': 'Transport', 'limit': 2000, 'period': 'monthly'},
    ]
    save_budgets(user_id, budgets)

    result = get_budgets(user_id)
    assert len(result) == 2
    assert result[0]['limit_amount'] == 5000


def test_custom_categories():
    user_id = 'user_test_7'
    add_custom_category(user_id, 'Gym')
    add_custom_category(user_id, 'Pet')

    categories = get_custom_categories(user_id)
    assert 'Gym' in categories
    assert 'Pet' in categories

    delete_custom_category(user_id, 'Gym')
    categories = get_custom_categories(user_id)
    assert 'Gym' not in categories
    assert 'Pet' in categories
