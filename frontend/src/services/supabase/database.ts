/**
 * Database Operations Service
 * 
 * Provides CRUD operations for all database entities using Supabase.
 * This service layer handles:
 * - Data transformation between frontend (camelCase) and database (snake_case)
 * - User authentication checks
 * - Database queries and mutations
 * - Error handling
 * 
 * Architecture:
 * - All functions are async and return Promises
 * - User authentication is checked for all operations
 * - Database-generated UUIDs are returned for create operations
 * - Errors are thrown and should be handled by the calling code
 * 
 * Database Tables:
 * - transactions: Financial transactions
 * - accounts: Bank accounts and wallets
 * - budgets: Budget limits by category
 * - vehicles: Vehicle information
 * - fuel_logs: Fuel consumption logs
 * - investments: Investment portfolio
 * - custom_categories: User-defined transaction categories
 */
import { supabase } from './client';
import { Account, Transaction, Vehicle, FuelLog, Budget, Investment } from '../../types';

/**
 * Helper Functions for Case Conversion
 * 
 * The database uses snake_case (e.g., user_id, account_id)
 * The frontend uses camelCase (e.g., userId, accountId)
 * These functions handle automatic conversion between the two.
 */

/**
 * Convert camelCase string to snake_case
 * Example: "userId" -> "user_id"
 */
const toSnakeCase = (str: string): string => {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

/**
 * Recursively convert all object keys from camelCase to snake_case
 * Handles nested objects and arrays
 */
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

/**
 * Recursively convert all object keys from snake_case to camelCase
 * Handles nested objects and arrays
 */
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

// ============================================================================
// TRANSACTION OPERATIONS
// ============================================================================

/**
 * Fetch all transactions for the current user
 * @returns Array of transactions, sorted by date (newest first)
 */

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

/**
 * Add a new transaction to the database
 * @param transaction - Transaction object (id will be ignored, database generates UUID)
 * @returns Database-generated UUID for the new transaction
 * @throws Error if user is not authenticated or accountId is missing
 */
export const addTransactionToDb = async (transaction: Transaction): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    // Validate account ID
    if (!transaction.accountId) {
        throw new Error('Account ID is required');
    }

    // Remove id, accountName, and metadata - metadata is not in schema
    const { id, accountName, metadata, ...transactionData } = transaction as any;

    const { data, error } = await supabase
        .from('transactions')
        .insert(keysToSnakeCase({ ...transactionData, user_id: user.id }))
        .select()
        .single();

    if (error) throw error;

    // Return the database-generated UUID
    return data.id;
};

/**
 * Update an existing transaction
 * @param transaction - Transaction object with updated values
 * @throws Error if update fails
 */
export const updateTransactionInDb = async (transaction: Transaction) => {
    // metadata is not in schema
    const { metadata, ...rest } = transaction as any;
    const { error } = await supabase
        .from('transactions')
        .update(keysToSnakeCase(rest))
        .eq('id', transaction.id);

    if (error) throw error;
};

/**
 * Delete a transaction from the database
 * @param id - Transaction UUID
 * @throws Error if deletion fails
 */
export const deleteTransactionFromDb = async (id: string) => {
    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// ============================================================================
// ACCOUNT OPERATIONS
// ============================================================================

/**
 * Fetch all accounts for the current user
 * @returns Array of accounts, sorted by name
 */
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

/**
 * Add a new account to the database
 * @param account - Account object (id will be ignored, database generates UUID)
 * @returns Database-generated UUID for the new account
 * @throws Error if user is not authenticated
 */
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

/**
 * Update an existing account
 * @param account - Account object with updated values
 * @throws Error if update fails
 */
export const updateAccountInDb = async (account: Account) => {
    const { error } = await supabase
        .from('accounts')
        .update(keysToSnakeCase(account))
        .eq('id', account.id);

    if (error) throw error;
};

/**
 * Delete an account from the database
 * @param id - Account UUID
 * @throws Error if deletion fails
 */
export const deleteAccountFromDb = async (id: string) => {
    const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// ============================================================================
// BUDGET OPERATIONS
// ============================================================================

/**
 * Fetch all budgets for the current user
 * @returns Array of budgets
 */
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

/**
 * Save budgets to the database (replaces all existing budgets)
 * This is a full replace operation - all existing budgets are deleted first
 * @param budgets - Array of budget objects
 * @throws Error if user is not authenticated or save fails
 */
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

// ============================================================================
// VEHICLE OPERATIONS
// ============================================================================

/**
 * Fetch all vehicles for the current user
 * @returns Array of vehicles, sorted by name
 */
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

/**
 * Add a new vehicle to the database
 * @param vehicle - Vehicle object (id will be ignored, database generates UUID)
 * @returns Database-generated UUID for the new vehicle
 * @throws Error if user is not authenticated
 */
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

/**
 * Update an existing vehicle
 * @param vehicle - Vehicle object with updated values
 * @throws Error if update fails
 */
export const updateVehicleInDb = async (vehicle: Vehicle) => {
    const { error } = await supabase
        .from('vehicles')
        .update(keysToSnakeCase(vehicle))
        .eq('id', vehicle.id);

    if (error) throw error;
};

/**
 * Delete a vehicle from the database
 * @param id - Vehicle UUID
 * @throws Error if deletion fails
 */
export const deleteVehicleFromDb = async (id: string) => {
    const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// ============================================================================
// FUEL LOG OPERATIONS
// ============================================================================

/**
 * Fetch all fuel logs for the current user
 * @returns Array of fuel logs, sorted by date (newest first)
 */
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

/**
 * Add a new fuel log to the database
 * @param fuelLog - Fuel log object (id will be ignored, database generates UUID)
 * @returns Database-generated UUID for the new fuel log
 * @throws Error if user is not authenticated
 */
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

/**
 * Update an existing fuel log
 * @param fuelLog - Fuel log object with updated values
 * @throws Error if update fails
 */
export const updateFuelLogInDb = async (fuelLog: FuelLog) => {
    const { error } = await supabase
        .from('fuel_logs')
        .update(keysToSnakeCase(fuelLog))
        .eq('id', fuelLog.id);

    if (error) throw error;
};

/**
 * Delete a fuel log from the database
 * @param id - Fuel log UUID
 * @throws Error if deletion fails
 */
export const deleteFuelLogFromDb = async (id: string) => {
    const { error } = await supabase
        .from('fuel_logs')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// ============================================================================
// INVESTMENT OPERATIONS
// ============================================================================

/**
 * Fetch all investments for the current user
 * @returns Array of investments, sorted by date (newest first)
 */
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

/**
 * Add a new investment to the database
 * @param investment - Investment object (id will be ignored, database generates UUID)
 * @returns Database-generated UUID for the new investment
 * @throws Error if user is not authenticated
 */
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

/**
 * Update an existing investment
 * @param investment - Investment object with updated values
 * @throws Error if update fails
 */
export const updateInvestmentInDb = async (investment: Investment) => {
    const { error } = await supabase
        .from('investments')
        .update(keysToSnakeCase(investment))
        .eq('id', investment.id);

    if (error) throw error;
};

/**
 * Delete an investment from the database
 * @param id - Investment UUID
 * @throws Error if deletion fails
 */
export const deleteInvestmentFromDb = async (id: string) => {
    const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// ============================================================================
// CUSTOM CATEGORY OPERATIONS
// ============================================================================

/**
 * Fetch all custom categories for the current user
 * @returns Array of category names, sorted alphabetically
 */
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

/**
 * Add a new custom category
 * @param categoryName - Name of the category to add
 * @throws Error if user is not authenticated
 * @note Silently ignores duplicate category names (unique constraint)
 */
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

/**
 * Delete a custom category
 * @param categoryName - Name of the category to delete
 * @throws Error if user is not authenticated or deletion fails
 */
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
