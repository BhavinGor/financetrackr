import { supabase } from './client';
import { Account, Budget, FuelLog, Investment, Transaction, TransactionType, Vehicle } from '../../types';
import { generateId } from '../../utils/id';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getCurrentUserId = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('No authenticated user');
  }
  return user.id;
};

const api = async (path: string, options: RequestInit = {}): Promise<any> => {
  const response = await fetch(`${API_BASE}/api/localdb${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
};

// ─── Transactions ─────────────────────────────────────────────────

export const fetchTransactions = async (): Promise<Transaction[]> => {
  const userId = await getCurrentUserId();
  const { data } = await api(`/transactions?user_id=${encodeURIComponent(userId)}`);
  return (data || []).sort((a: Transaction, b: Transaction) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
};

export const addTransactionToDb = async (transaction: Transaction): Promise<string> => {
  const userId = await getCurrentUserId();
  const id = transaction.id?.startsWith('tx_') ? transaction.id : generateId('tx');
  const { id: savedId } = await api('/transactions', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, transaction: { ...transaction, id } }),
  });
  return savedId || id;
};

export const updateTransactionInDb = async (transaction: Transaction) => {
  const userId = await getCurrentUserId();
  await api(`/transactions/${transaction.id}`, {
    method: 'PUT',
    body: JSON.stringify({ user_id: userId, transaction }),
  });
};

export const deleteTransactionFromDb = async (id: string) => {
  const userId = await getCurrentUserId();
  await api(`/transactions/${id}?user_id=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
};

export const addTransactionWithExtensions = async (
  transaction: Transaction,
  fuelData?: { vehicleId: string; liters: number; mileage?: number },
  investmentData?: { investmentType: string; assetName: string; quantity?: number; pricePerUnit?: number }
): Promise<string> => {
  const userId = await getCurrentUserId();
  const id = transaction.id?.startsWith('tx_') ? transaction.id : generateId('tx');
  const { id: savedId } = await api('/transactions', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      transaction: { ...transaction, id },
      fuelData,
      investmentData,
    }),
  });
  return savedId || id;
};

export const updateTransactionWithExtensions = async (transaction: Transaction): Promise<void> => {
  const userId = await getCurrentUserId();
  await api(`/transactions/${transaction.id}`, {
    method: 'PUT',
    body: JSON.stringify({ user_id: userId, transaction }),
  });
};

// ─── Fuel Transactions ────────────────────────────────────────────

export const fetchAllFuelTransactions = async (): Promise<FuelLog[]> => {
  const userId = await getCurrentUserId();
  const { data } = await api(`/fuel?user_id=${encodeURIComponent(userId)}`);
  return (data || []).map((f: any) => ({
    id: f.transaction_id,
    vehicleId: f.vehicle_id,
    date: f.date,
    liters: f.liters,
    cost: f.amount,
    mileage: f.mileage || 0,
  }));
};

export const fetchFuelTransactionsForVehicle = async (vehicleId: string) => {
  const userId = await getCurrentUserId();
  const { data } = await api(`/fuel?user_id=${encodeURIComponent(userId)}&vehicle_id=${encodeURIComponent(vehicleId)}`);
  return data || [];
};

// ─── Investment Transactions ──────────────────────────────────────

export const fetchAllInvestmentTransactions = async (): Promise<Investment[]> => {
  const userId = await getCurrentUserId();
  const { data } = await api(`/investments?user_id=${encodeURIComponent(userId)}`);
  return (data || []).map((inv: any) => ({
    id: inv.transaction_id,
    name: inv.asset_name,
    type: inv.investment_type,
    investedAmount: inv.amount,
    currentValue: inv.amount,
    quantity: inv.quantity,
    date: inv.date,
  }));
};

// ─── Accounts ─────────────────────────────────────────────────────

export const fetchAccounts = async (): Promise<Account[]> => {
  const userId = await getCurrentUserId();
  const { data } = await api(`/accounts?user_id=${encodeURIComponent(userId)}`);
  return (data || []).map((a: any) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    bankName: a.bank_name,
    balance: a.balance,
    currency: a.currency,
    limit: a.limit_amount,
    dueDate: a.due_date,
  }));
};

export const addAccountToDb = async (account: Account): Promise<string> => {
  const userId = await getCurrentUserId();
  const id = account.id?.startsWith('acc_') ? account.id : generateId('acc');
  const { id: savedId } = await api('/accounts', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, account: { ...account, id } }),
  });
  return savedId || id;
};

export const updateAccountInDb = async (account: Account) => {
  const userId = await getCurrentUserId();
  await api(`/accounts/${account.id}`, {
    method: 'PUT',
    body: JSON.stringify({ user_id: userId, account }),
  });
};

export const deleteAccountFromDb = async (id: string) => {
  const userId = await getCurrentUserId();
  await api(`/accounts/${id}?user_id=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
};

// ─── Budgets ──────────────────────────────────────────────────────

export const fetchBudgets = async (): Promise<Budget[]> => {
  const userId = await getCurrentUserId();
  const { data } = await api(`/budgets?user_id=${encodeURIComponent(userId)}`);
  return (data || []).map((b: any) => ({
    id: b.id,
    category: b.category,
    limit: b.limit_amount,
    spent: 0,
    period: b.period,
  }));
};

export const saveBudgetsToDb = async (budgets: Budget[]) => {
  const userId = await getCurrentUserId();
  await api('/budgets', {
    method: 'PUT',
    body: JSON.stringify({
      user_id: userId,
      budgets: budgets.map(b => ({
        id: b.id || generateId('bud'),
        category: b.category,
        limit: b.limit,
        period: b.period,
      })),
    }),
  });
};

// ─── Vehicles ─────────────────────────────────────────────────────

export const fetchVehicles = async (): Promise<Vehicle[]> => {
  const userId = await getCurrentUserId();
  const { data } = await api(`/vehicles?user_id=${encodeURIComponent(userId)}`);
  return (data || []).map((v: any) => ({
    id: v.id,
    name: v.name,
    make: v.make,
    model: v.model,
    year: v.year,
    licensePlate: v.license_plate,
    mileage: v.mileage,
    type: v.type,
  }));
};

export const addVehicleToDb = async (vehicle: Vehicle): Promise<string> => {
  const userId = await getCurrentUserId();
  const id = vehicle.id?.startsWith('veh_') ? vehicle.id : generateId('veh');
  const { id: savedId } = await api('/vehicles', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, vehicle: { ...vehicle, id } }),
  });
  return savedId || id;
};

export const updateVehicleInDb = async (vehicle: Vehicle) => {
  const userId = await getCurrentUserId();
  await api(`/vehicles/${vehicle.id}`, {
    method: 'PUT',
    body: JSON.stringify({ user_id: userId, vehicle }),
  });
};

export const deleteVehicleFromDb = async (id: string) => {
  const userId = await getCurrentUserId();
  await api(`/vehicles/${id}?user_id=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
};

// ─── Legacy Helpers (kept for backward compat) ────────────────────

export const fetchFuelLogs = async () => fetchAllFuelTransactions();
export const fetchInvestments = async () => fetchAllInvestmentTransactions();

export const addFuelLogToDb = async (fuelLog: FuelLog): Promise<string> => {
  const transaction: Transaction = {
    id: generateId('tx'),
    date: fuelLog.date,
    amount: fuelLog.cost,
    type: TransactionType.EXPENSE,
    category: 'Fuel',
    description: 'Fuel entry',
    accountId: '',
    source: 'manual',
  };
  return addTransactionWithExtensions(transaction, {
    vehicleId: fuelLog.vehicleId,
    liters: fuelLog.liters,
    mileage: fuelLog.mileage,
  });
};

export const addInvestmentToDb = async (investment: Investment): Promise<string> => {
  const transaction: Transaction = {
    id: generateId('tx'),
    date: investment.date,
    amount: investment.investedAmount,
    type: TransactionType.EXPENSE,
    category: 'Investment',
    description: `Investment in ${investment.name}`,
    accountId: '',
    source: 'manual',
  };
  return addTransactionWithExtensions(transaction, undefined, {
    investmentType: investment.type,
    assetName: investment.name,
    quantity: investment.quantity,
    pricePerUnit: investment.quantity ? investment.investedAmount / investment.quantity : undefined,
  });
};

export const updateInvestmentInDb = async (investment: Investment) => {
  const userId = await getCurrentUserId();
  await api(`/transactions/${investment.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      user_id: userId,
      transaction: {
        id: investment.id,
        date: investment.date,
        amount: investment.investedAmount,
        type: 'Expense',
        category: 'Investment',
        description: `Investment in ${investment.name}`,
        accountId: '',
        metadata: {
          investmentType: investment.type,
          assetName: investment.name,
          quantity: investment.quantity,
          pricePerUnit: investment.quantity ? investment.investedAmount / investment.quantity : undefined,
        },
      },
    }),
  });
};

export const deleteInvestmentFromDb = async (id: string) => {
  await deleteTransactionFromDb(id);
};

// ─── Custom Categories ────────────────────────────────────────────

export const fetchCustomCategories = async (): Promise<string[]> => {
  const userId = await getCurrentUserId();
  const { data } = await api(`/categories?user_id=${encodeURIComponent(userId)}`);
  return data || [];
};

export const addCustomCategoryToDb = async (categoryName: string): Promise<void> => {
  const userId = await getCurrentUserId();
  const trimmed = categoryName.trim();
  if (!trimmed) return;
  await api('/categories', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, name: trimmed }),
  });
};

export const deleteCustomCategoryFromDb = async (categoryName: string): Promise<void> => {
  const userId = await getCurrentUserId();
  await api(`/categories/${encodeURIComponent(categoryName)}?user_id=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
};
