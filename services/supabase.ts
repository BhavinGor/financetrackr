import { createClient } from '@supabase/supabase-js';
import { Account, Transaction, Vehicle, FuelLog, Budget, Investment } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isDev = import.meta.env.DEV;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Supabase Config Error: Missing URL or Anon Key. Please check your .env.local file.");
} else if (isDev) {
    // Debug logging in development only
    console.log("✅ Supabase Config Status:");
    console.log(`   - URL Present: ${!!SUPABASE_URL}`);
    console.log(`   - Key Present: ${!!SUPABASE_KEY}`);
    console.log(`   - URL Value: ${SUPABASE_URL.substring(0, 15)}...`);

    if (!SUPABASE_URL.startsWith('https://')) {
        console.error("❌ Supabase URL Error: URL must start with 'https://'");
        console.warn("   Current URL value:", SUPABASE_URL);
    }
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_KEY || '');

// Helper functions to convert between camelCase and snake_case
const toSnakeCase = (str: string): string => {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

const keysToSnakeCase = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(keysToSnakeCase);
    }
    if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            acc[toSnakeCase(key)] = keysToSnakeCase(obj[key]);
            return acc;
        }, {} as any);
    }
    return obj;
};

const keysToCamelCase = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(keysToCamelCase);
    }
    if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            acc[camelKey] = keysToCamelCase(obj[key]);
            return acc;
        }, {} as any);
    }
    return obj;
};

// Database Helper Functions

export const fetchTransactions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

    if (error) throw error;
    return keysToCamelCase(data) as Transaction[];
};

export const addTransactionToDb = async (transaction: Transaction): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    // Validate account ID
    if (!transaction.accountId) {
        throw new Error('Account ID is required');
    }

    // Remove id and accountName - let database generate UUID, accountName is not in schema
    const { id, accountName, ...transactionData } = transaction as any;

    const { data, error } = await supabase
        .from('transactions')
        .insert(keysToSnakeCase({ ...transactionData, user_id: user.id }))
        .select()
        .single();

    if (error) throw error;

    // Return the database-generated UUID
    return data.id;
};

export const updateTransactionInDb = async (transaction: Transaction) => {
    const { error } = await supabase
        .from('transactions')
        .update(keysToSnakeCase(transaction))
        .eq('id', transaction.id);

    if (error) throw error;
};

export const deleteTransactionFromDb = async (id: string) => {
    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// Accounts
export const fetchAccounts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

    if (error) throw error;
    return keysToCamelCase(data) as Account[];
};

export const addAccountToDb = async (account: Account): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    // Remove id - let database generate UUID
    const { id, ...accountData } = account;

    const { data, error } = await supabase
        .from('accounts')
        .insert(keysToSnakeCase({ ...accountData, user_id: user.id }))
        .select()
        .single();

    if (error) throw error;

    // Return the database-generated UUID
    return data.id;
};

export const updateAccountInDb = async (account: Account) => {
    const { error } = await supabase
        .from('accounts')
        .update(keysToSnakeCase(account))
        .eq('id', account.id);

    if (error) throw error;
};

export const deleteAccountFromDb = async (id: string) => {
    const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// Budgets
export const fetchBudgets = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id);

    if (error) throw error;
    return keysToCamelCase(data) as Budget[];
};

export const saveBudgetsToDb = async (budgets: Budget[]) => {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    // Delete all existing budgets for this user
    const { error: deleteError } = await supabase
        .from('budgets')
        .delete()
        .eq('user_id', user.id);

    if (deleteError) throw deleteError;

    if (budgets.length > 0) {
        // Add user_id and convert to snake_case
        const budgetsWithUserId = budgets.map(b => {
            // Remove id - let database generate UUID
            const { id, ...budgetData } = b;
            return keysToSnakeCase({
                ...budgetData,
                user_id: user.id
            });
        });

        const { error: insertError } = await supabase
            .from('budgets')
            .insert(budgetsWithUserId);

        if (insertError) throw insertError;
    }
};

// Vehicles
export const fetchVehicles = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

    if (error) throw error;
    return keysToCamelCase(data) as Vehicle[];
};

export const addVehicleToDb = async (vehicle: Vehicle) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    // Remove id - let database generate UUID
    const { id, ...vehicleData } = vehicle;

    const { error } = await supabase
        .from('vehicles')
        .insert(keysToSnakeCase({ ...vehicleData, user_id: user.id }));

    if (error) throw error;
};

export const updateVehicleInDb = async (vehicle: Vehicle) => {
    const { error } = await supabase
        .from('vehicles')
        .update(keysToSnakeCase(vehicle))
        .eq('id', vehicle.id);

    if (error) throw error;
};

export const deleteVehicleFromDb = async (id: string) => {
    const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// Fuel Logs
export const fetchFuelLogs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('fuel_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

    if (error) throw error;
    return keysToCamelCase(data) as FuelLog[];
};

export const addFuelLogToDb = async (fuelLog: FuelLog) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    // Remove id - let database generate UUID
    const { id, ...fuelLogData } = fuelLog;

    const { error } = await supabase
        .from('fuel_logs')
        .insert(keysToSnakeCase({ ...fuelLogData, user_id: user.id }));

    if (error) throw error;
};

export const updateFuelLogInDb = async (fuelLog: FuelLog) => {
    const { error } = await supabase
        .from('fuel_logs')
        .update(keysToSnakeCase(fuelLog))
        .eq('id', fuelLog.id);

    if (error) throw error;
};

export const deleteFuelLogFromDb = async (id: string) => {
    const { error } = await supabase
        .from('fuel_logs')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// Investments
export const fetchInvestments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

    if (error) throw error;
    return keysToCamelCase(data) as Investment[];
};

export const addInvestmentToDb = async (investment: Investment) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    // Remove id - let database generate UUID
    const { id, ...investmentData } = investment;

    const { error } = await supabase
        .from('investments')
        .insert(keysToSnakeCase({ ...investmentData, user_id: user.id }));

    if (error) throw error;
};

export const updateInvestmentInDb = async (investment: Investment) => {
    const { error } = await supabase
        .from('investments')
        .update(keysToSnakeCase(investment))
        .eq('id', investment.id);

    if (error) throw error;
};

export const deleteInvestmentFromDb = async (id: string) => {
    const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// Custom Categories
export const fetchCustomCategories = async (): Promise<string[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('custom_categories')
        .select('name')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

    if (error) throw error;
    return data?.map(c => c.name) || [];
};

export const addCustomCategoryToDb = async (categoryName: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const trimmedName = categoryName.trim();
    if (!trimmedName) return;

    const { error } = await supabase
        .from('custom_categories')
        .insert({ name: trimmedName, user_id: user.id });

    if (error) {
        // Ignore duplicate errors (unique constraint violation)
        if (error.code !== '23505') {
            throw error;
        }
    }
};

export const deleteCustomCategoryFromDb = async (categoryName: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { error } = await supabase
        .from('custom_categories')
        .delete()
        .eq('user_id', user.id)
        .eq('name', categoryName);

    if (error) throw error;
};
