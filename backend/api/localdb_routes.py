"""Routes for local SQLite-backed data.

Provides both entity-specific endpoints (new) and legacy /state endpoint
for backward compatibility during migration.
"""

from flask import Blueprint, jsonify, request
from db_store import (
    get_state, save_state,
    get_accounts, add_account, update_account, delete_account,
    get_transactions, add_transaction, update_transaction, delete_transaction,
    add_transaction_with_extensions,
    get_fuel_transactions, get_fuel_transactions_for_vehicle,
    get_investment_transactions,
    get_budgets, save_budgets,
    get_vehicles, add_vehicle, update_vehicle, delete_vehicle,
    get_custom_categories, add_custom_category, delete_custom_category,
)

localdb_bp = Blueprint('localdb', __name__)


# ─── Legacy State Endpoint (kept for migration) ───────────────────

@localdb_bp.route('/state', methods=['GET'])
def read_state():
    user_id = request.args.get('user_id', '').strip()
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    state = get_state(user_id)
    return jsonify({'success': True, 'data': state}), 200


@localdb_bp.route('/state', methods=['PUT'])
def write_state():
    payload = request.get_json(silent=True) or {}
    user_id = (payload.get('user_id') or '').strip()
    state = payload.get('state')
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    if not isinstance(state, dict):
        return jsonify({'error': 'state must be an object'}), 400
    saved = save_state(user_id, state)
    return jsonify({'success': True, 'data': saved}), 200


# ─── Account Endpoints ────────────────────────────────────────────

@localdb_bp.route('/accounts', methods=['GET'])
def api_get_accounts():
    user_id = request.args.get('user_id', '').strip()
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    return jsonify({'success': True, 'data': get_accounts(user_id)}), 200


@localdb_bp.route('/accounts', methods=['POST'])
def api_add_account():
    payload = request.get_json(silent=True) or {}
    user_id = (payload.get('user_id') or '').strip()
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    account = payload.get('account', {})
    account_id = add_account(user_id, account)
    return jsonify({'success': True, 'id': account_id}), 201


@localdb_bp.route('/accounts/<account_id>', methods=['PUT'])
def api_update_account(account_id):
    payload = request.get_json(silent=True) or {}
    user_id = (payload.get('user_id') or '').strip()
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    account = payload.get('account', {})
    account['id'] = account_id
    update_account(user_id, account)
    return jsonify({'success': True}), 200


@localdb_bp.route('/accounts/<account_id>', methods=['DELETE'])
def api_delete_account(account_id):
    user_id = request.args.get('user_id', '').strip()
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    delete_account(user_id, account_id)
    return jsonify({'success': True}), 200


# ─── Transaction Endpoints ────────────────────────────────────────

@localdb_bp.route('/transactions', methods=['GET'])
def api_get_transactions():
    user_id = request.args.get('user_id', '').strip()
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    return jsonify({'success': True, 'data': get_transactions(user_id)}), 200


@localdb_bp.route('/transactions', methods=['POST'])
def api_add_transaction():
    payload = request.get_json(silent=True) or {}
    user_id = (payload.get('user_id') or '').strip()
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    transaction = payload.get('transaction', {})
    fuel_data = payload.get('fuelData')
    investment_data = payload.get('investmentData')
    tx_id = add_transaction_with_extensions(user_id, transaction, fuel_data, investment_data)
    return jsonify({'success': True, 'id': tx_id}), 201


@localdb_bp.route('/transactions/<tx_id>', methods=['PUT'])
def api_update_transaction(tx_id):
    payload = request.get_json(silent=True) or {}
    user_id = (payload.get('user_id') or '').strip()
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    transaction = payload.get('transaction', {})
    transaction['id'] = tx_id
    fuel_data = payload.get('fuelData')
    investment_data = payload.get('investmentData')
    if fuel_data:
        transaction.setdefault('metadata', {}).update({
            'vehicleId': fuel_data.get('vehicleId', ''),
            'liters': fuel_data.get('liters', 0),
            'mileage': fuel_data.get('mileage', 0),
            'odometer': fuel_data.get('mileage', 0),
        })
    if investment_data:
        transaction.setdefault('metadata', {}).update({
            'investmentType': investment_data.get('investmentType', 'Other'),
            'assetName': investment_data.get('assetName', ''),
            'quantity': investment_data.get('quantity'),
            'pricePerUnit': investment_data.get('pricePerUnit'),
        })
    rows = update_transaction(user_id, transaction)
    if rows == 0:
        return jsonify({'error': 'Transaction not found'}), 404
    return jsonify({'success': True}), 200


@localdb_bp.route('/transactions/<tx_id>', methods=['DELETE'])
def api_delete_transaction(tx_id):
    user_id = request.args.get('user_id', '').strip()
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    delete_transaction(user_id, tx_id)
    return jsonify({'success': True}), 200


# ─── Fuel Endpoints ───────────────────────────────────────────────

@localdb_bp.route('/fuel', methods=['GET'])
def api_get_fuel():
    user_id = request.args.get('user_id', '').strip()
    vehicle_id = request.args.get('vehicle_id')
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    if vehicle_id:
        data = get_fuel_transactions_for_vehicle(user_id, vehicle_id)
    else:
        data = get_fuel_transactions(user_id)
    return jsonify({'success': True, 'data': data}), 200


# ─── Investment Endpoints ─────────────────────────────────────────

@localdb_bp.route('/investments', methods=['GET'])
def api_get_investments():
    user_id = request.args.get('user_id', '').strip()
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    return jsonify({'success': True, 'data': get_investment_transactions(user_id)}), 200


# ─── Budget Endpoints ─────────────────────────────────────────────

@localdb_bp.route('/budgets', methods=['GET'])
def api_get_budgets():
    user_id = request.args.get('user_id', '').strip()
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    return jsonify({'success': True, 'data': get_budgets(user_id)}), 200


@localdb_bp.route('/budgets', methods=['PUT'])
def api_save_budgets():
    payload = request.get_json(silent=True) or {}
    user_id = (payload.get('user_id') or '').strip()
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    budgets = payload.get('budgets', [])
    save_budgets(user_id, budgets)
    return jsonify({'success': True}), 200


# ─── Vehicle Endpoints ────────────────────────────────────────────

@localdb_bp.route('/vehicles', methods=['GET'])
def api_get_vehicles():
    user_id = request.args.get('user_id', '').strip()
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    return jsonify({'success': True, 'data': get_vehicles(user_id)}), 200


@localdb_bp.route('/vehicles', methods=['POST'])
def api_add_vehicle():
    payload = request.get_json(silent=True) or {}
    user_id = (payload.get('user_id') or '').strip()
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    vehicle = payload.get('vehicle', {})
    vehicle_id = add_vehicle(user_id, vehicle)
    return jsonify({'success': True, 'id': vehicle_id}), 201


@localdb_bp.route('/vehicles/<vehicle_id>', methods=['PUT'])
def api_update_vehicle(vehicle_id):
    payload = request.get_json(silent=True) or {}
    user_id = (payload.get('user_id') or '').strip()
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    vehicle = payload.get('vehicle', {})
    vehicle['id'] = vehicle_id
    update_vehicle(user_id, vehicle)
    return jsonify({'success': True}), 200


@localdb_bp.route('/vehicles/<vehicle_id>', methods=['DELETE'])
def api_delete_vehicle(vehicle_id):
    user_id = request.args.get('user_id', '').strip()
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    delete_vehicle(user_id, vehicle_id)
    return jsonify({'success': True}), 200


# ─── Custom Category Endpoints ────────────────────────────────────

@localdb_bp.route('/categories', methods=['GET'])
def api_get_categories():
    user_id = request.args.get('user_id', '').strip()
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    return jsonify({'success': True, 'data': get_custom_categories(user_id)}), 200


@localdb_bp.route('/categories', methods=['POST'])
def api_add_category():
    payload = request.get_json(silent=True) or {}
    user_id = (payload.get('user_id') or '').strip()
    name = (payload.get('name') or '').strip()
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    if not name:
        return jsonify({'error': 'name is required'}), 400
    add_custom_category(user_id, name)
    return jsonify({'success': True}), 201


@localdb_bp.route('/categories/<name>', methods=['DELETE'])
def api_delete_category(name):
    user_id = request.args.get('user_id', '').strip()
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    delete_custom_category(user_id, name)
    return jsonify({'success': True}), 200


# ─── Health ───────────────────────────────────────────────────────

@localdb_bp.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'localdb'}), 200
