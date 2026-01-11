import { createClient } from '@supabase/supabase-js';
import {
    Account,
    Transaction,
    TransactionWithMetadata,
    FuelTransaction,
    InvestmentTransaction,
    Vehicle,
    FuelLog,
    Budget,
    Investment
} from '../types';

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

export const fetchTransactions = async (): Promise<TransactionWithMetadata[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('transactions')
        .select(`
            *,
            fuel_transactions(*),
            investment_transactions(*)
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false });

    if (error) throw error;

    // Transform to include metadata
    return (data || []).map(tx => {
        const base = keysToCamelCase(tx) as Transaction;
        const result: TransactionWithMetadata = { ...base };

        // Add fuel data if exists
        if (tx.fuel_transactions && tx.fuel_transactions.length > 0) {
            result.fuelData = keysToCamelCase(tx.fuel_transactions[0]) as FuelTransaction;
        }

        // Add investment data if exists
        if (tx.investment_transactions && tx.investment_transactions.length > 0) {
            result.investmentData = keysToCamelCase(tx.investment_transactions[0]) as InvestmentTransaction;
        }

        return result;
    });
};

export const addTransactionToDb = async (transaction: Transaction): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    // Validate account ID
    if (!transaction.accountId) {
        throw new Error('Account ID is required');
    }

    // Remove id, accountName, metadata, and extension data - these are handled separately
    const { id, accountName, metadata, fuelData, investmentData, ...transactionData } = transaction as any;

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
    // metadata is not in schema
    const { metadata, ...rest } = transaction as any;
    const { error } = await supabase
        .from('transactions')
        .update(keysToSnakeCase(rest))
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

// New functions for transaction extensions

export const addTransactionWithExtensions = async (
    transaction: Transaction,
    fuelData?: Omit<FuelTransaction, 'transactionId'>,
    investmentData?: Omit<InvestmentTransaction, 'transactionId'>
): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    // Validate mutual exclusivity
    if (fuelData && investmentData) {
        throw new Error('Transaction cannot be both fuel and investment');
    }

    // Validate fuel requirements
    if (fuelData && !fuelData.vehicleId) {
        throw new Error('Fuel transactions require a vehicle');
    }

    // Validate investment requirements
    if (investmentData && !investmentData.assetName) {
        throw new Error('Investment transactions require asset name');
    }

    // Set flags based on extensions
    const txData = {
        ...transaction,
        isFuel: !!fuelData,
        isInvestment: !!investmentData
    };

    // Remove extension data and unwanted fields
    const { id, accountName, metadata, fuelData: _, investmentData: __, ...baseData } = txData as any;

    // Insert transaction
    const { data: txRecord, error: txError } = await supabase
        .from('transactions')
        .insert(keysToSnakeCase({ ...baseData, user_id: user.id }))
        .select()
        .single();

    if (txError) throw txError;

    try {
        // Insert fuel extension if needed
        if (fuelData) {
            const { error: fuelError } = await supabase
                .from('fuel_transactions')
                .insert(keysToSnakeCase({
                    transaction_id: txRecord.id,
                    user_id: user.id,
                    ...fuelData
                }));

            if (fuelError) {
                // Rollback transaction
                await supabase.from('transactions').delete().eq('id', txRecord.id);
                throw fuelError;
            }
        }

        // Insert investment extension if needed
        if (investmentData) {
            const { error: invError } = await supabase
                .from('investment_transactions')
                .insert(keysToSnakeCase({
                    transaction_id: txRecord.id,
                    user_id: user.id,
                    ...investmentData
                }));

            if (invError) {
                // Rollback transaction
                await supabase.from('transactions').delete().eq('id', txRecord.id);
                throw invError;
            }
        }

        return txRecord.id;
    } catch (error) {
        // Ensure transaction is cleaned up on any error
        await supabase.from('transactions').delete().eq('id', txRecord.id);
        throw error;
    }
};

export const updateTransactionWithExtensions = async (
    transaction: Transaction,
    fuelData?: FuelTransaction,
    investmentData?: InvestmentTransaction
): Promise<void> => {
    // Update base transaction
    await updateTransactionInDb(transaction);

    // Update fuel extension if present
    if (fuelData) {
        const { transactionId, ...fuelFields } = fuelData;
        const { error } = await supabase
            .from('fuel_transactions')
            .update(keysToSnakeCase(fuelFields))
            .eq('transaction_id', transaction.id);

        if (error) throw error;
    }

    // Update investment extension if present
    if (investmentData) {
        const { transactionId, ...investmentFields } = investmentData;
        const { error } = await supabase
            .from('investment_transactions')
            .update(keysToSnakeCase(investmentFields))
            .eq('transaction_id', transaction.id);

        if (error) throw error;
    }
};

export const fetchFuelTransactionsForVehicle = async (vehicleId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('fuel_transactions')
        .select(`
            *,
            transaction:transactions(*)
        `)
        .eq('vehicle_id', vehicleId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform the data to flatten transaction info
    return (data || []).map(item => ({
        ...keysToCamelCase(item),
        transaction: keysToCamelCase(item.transaction)
    }));
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

export const addVehicleToDb = async (vehicle: Vehicle): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    // Remove id - let database generate UUID
    const { id, ...vehicleData } = vehicle;

    const { data, error } = await supabase
        .from('vehicles')
        .insert(keysToSnakeCase({ ...vehicleData, user_id: user.id }))
        .select()
        .single();

    if (error) throw error;

    return data.id;
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

export const addFuelLogToDb = async (fuelLog: FuelLog): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    // Remove id - let database generate UUID
    const { id, ...fuelLogData } = fuelLog;

    const { data, error } = await supabase
        .from('fuel_logs')
        .insert(keysToSnakeCase({ ...fuelLogData, user_id: user.id }))
        .select()
        .single();

    if (error) throw error;

    return data.id;
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

export const addInvestmentToDb = async (investment: Investment): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    // Remove id - let database generate UUID. Also remove 'amount' if passed by accident
    const { id, amount, ...investmentData } = investment as any;

    const { data, error } = await supabase
        .from('investments')
        .insert(keysToSnakeCase({ ...investmentData, user_id: user.id }))
        .select()
        .single();

    if (error) throw error;

    return data.id;
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
