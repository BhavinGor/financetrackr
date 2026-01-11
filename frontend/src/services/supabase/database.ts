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
 * Includes metadata from fuel_transactions and investment_transactions
 * @returns Array of transactions with populated metadata, sorted by date (newest first)
 */

export const fetchTransactions = async () => {
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

    console.log('Fetched transactions from DB, sample:', data?.[0]);

    // Transform data to include metadata from extensions
    const transactions = (data || []).map(tx => {
        let metadata: any = null;

        // Check for fuel extension - it's an object, not an array
        if (tx.fuel_transactions && typeof tx.fuel_transactions === 'object') {
            const fuelData = tx.fuel_transactions;
            metadata = {
                vehicleId: fuelData.vehicle_id,
                liters: fuelData.liters,
                odometer: fuelData.mileage, // Map mileage to odometer for UI
                mileage: fuelData.mileage
            };
            console.log('Created fuel metadata:', metadata);
        }

        // Check for investment extension - it's an object, not an array
        if (tx.investment_transactions && typeof tx.investment_transactions === 'object') {
            const invData = tx.investment_transactions;
            console.log('Processing investment transaction:', {
                tx_id: tx.id,
                tx_category: tx.category,
                tx_description: tx.description,
                invData: invData
            });
            // Use the transaction's own ID as the investmentId
            // since investment_transactions uses transaction_id as the reference
            metadata = {
                investmentId: tx.id, // Use transaction ID to link back
                investmentType: invData.investment_type,
                assetName: invData.asset_name,
                quantity: invData.quantity,
                pricePerUnit: invData.price_per_unit,
                units: invData.quantity, // Alias for compatibility
                price: invData.price_per_unit // Alias for compatibility
            };
            console.log('Created investment metadata:', metadata);
        }

        // Convert to camelCase AFTER extracting metadata
        const baseTx = keysToCamelCase(tx);

        // Remove the joined tables from the transaction object
        const { fuelTransactions, investmentTransactions, ...cleanTx } = baseTx;

        const result = {
            ...cleanTx,
            ...(metadata && { metadata })
        };

        if (metadata) {
            console.log('Final transaction with metadata:', result.id, result);
        }

        return result;
    });

    return transactions as Transaction[];
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
// TRANSACTION EXTENSIONS (New system for fuel and investments)
// ============================================================================

/**
 * Add a transaction with optional fuel or investment extensions
 * @param transaction - Base transaction data
 * @param fuelData - Optional fuel metadata (vehicleId, liters, mileage)
 * @param investmentData - Optional investment metadata (type, assetName, quantity, pricePerUnit)
 * @returns Database-generated transaction UUID
 */
export const addTransactionWithExtensions = async (
    transaction: Transaction,
    fuelData?: { vehicleId: string; liters: number; mileage?: number },
    investmentData?: { investmentType: string; assetName: string; quantity?: number; pricePerUnit?: number }
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
        is_fuel: !!fuelData,
        is_investment: !!investmentData
    };

    // Remove unwanted fields
    const { id, ...baseData } = txData as any;

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

/**
 * Fetch fuel transactions for a specific vehicle
 * @param vehicleId - Vehicle UUID
 * @returns Array of fuel transaction data with joined transaction info
 */
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

/**
 * Fetch all fuel transactions for all vehicles
 * Returns data needed for Vehicles tab
 */
export const fetchAllFuelTransactions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('fuel_transactions')
        .select(`
            *,
            transaction:transactions(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(item => ({
        id: item.id,
        transactionId: item.transaction_id,
        vehicleId: item.vehicle_id,
        liters: item.liters,
        mileage: item.mileage,
        // From joined transaction
        date: item.transaction.date,
        cost: item.transaction.amount,
        createdAt: item.created_at
    }));
};

/**
 * Fetch all investment transactions
 * Returns data needed for Savings tab
 */
export const fetchAllInvestmentTransactions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('investment_transactions')
        .select(`
            *,
            transaction:transactions(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) throw error;

    // Map to Investment interface format expected by SavingsPage
    return (data || []).map(item => ({
        id: item.transaction_id, // Use transaction_id as the unique identifier
        name: item.asset_name,
        type: item.investment_type,
        investedAmount: item.transaction.amount,
        currentValue: item.transaction.amount, // TODO: Track current value separately
        quantity: item.quantity,
        date: item.transaction.date
    }));
};

/**
 * Update a transaction with optional fuel or investment extensions
 * - Updates the base transaction
 * - Creates/updates/deletes fuel_transactions based on metadata
 * - Creates/updates/deletes investment_transactions based on metadata
 */
export const updateTransactionWithExtensions = async (
    transaction: Transaction & { metadata?: any }
): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    // Extract metadata
    const { metadata, ...txData } = transaction;

    // Determine if this is fuel or investment based on category and metadata
    const isFuel = transaction.category === 'Fuel' && metadata?.vehicleId;
    const isInvestment = (transaction.category === 'Investment' || transaction.category === 'Savings') && metadata?.investmentId;

    // Update base transaction with flags
    const updateData = {
        ...txData,
        is_fuel: isFuel,
        is_investment: isInvestment
    };

    const { id, ...dataToUpdate } = updateData as any;

    const { error: txError } = await supabase
        .from('transactions')
        .update(keysToSnakeCase(dataToUpdate))
        .eq('id', id);

    if (txError) throw txError;

    // Handle fuel extension
    if (isFuel && metadata) {
        // Check if fuel_transaction exists
        const { data: existing } = await supabase
            .from('fuel_transactions')
            .select('id')
            .eq('transaction_id', id)
            .single();

        const fuelData = {
            transaction_id: id,
            user_id: user.id,
            vehicle_id: metadata.vehicleId,
            liters: metadata.liters || 0,
            mileage: metadata.odometer || metadata.mileage || 0
        };

        if (existing) {
            // Update existing
            await supabase
                .from('fuel_transactions')
                .update(fuelData)
                .eq('transaction_id', id);
        } else {
            // Insert new
            await supabase
                .from('fuel_transactions')
                .insert(fuelData);
        }
    } else {
        // Remove fuel extension if exists but no longer fuel
        await supabase
            .from('fuel_transactions')
            .delete()
            .eq('transaction_id', id);
    }

    // Handle investment extension
    if (isInvestment && metadata) {
        // Check if investment_transaction exists
        const { data: existing } = await supabase
            .from('investment_transactions')
            .select('id')
            .eq('transaction_id', id)
            .single();

        const invData = {
            transaction_id: id,
            user_id: user.id,
            investment_type: metadata.investmentType || 'Other',
            asset_name: metadata.assetName || 'Investment',
            quantity: metadata.quantity || metadata.units || 0,
            price_per_unit: metadata.pricePerUnit || metadata.price || 0
        };

        if (existing) {
            // Update existing
            await supabase
                .from('investment_transactions')
                .update(invData)
                .eq('transaction_id', id);
        } else {
            // Insert new
            await supabase
                .from('investment_transactions')
                .insert(invData);
        }
    } else {
        // Remove investment extension if exists but no longer investment
        await supabase
            .from('investment_transactions')
            .delete()
            .eq('transaction_id', id);
    }
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
// FUEL LOG OPERATIONS (DEPRECATED - Now using transaction extensions)
// ============================================================================

/**
 * @deprecated Use transaction extensions instead
 * Fetch fuel data from fuel_transactions joined with transactions
 */
export const fetchFuelLogs = async () => {
    // Return empty array - fuel data now comes from transactions with fuel_transactions join
    console.warn('fetchFuelLogs is deprecated. Fuel data is now part of transaction extensions.');
    return [];
};

/**
 * @deprecated Use addTransactionWithExtensions instead
 */
export const addFuelLogToDb = async (fuelLog: FuelLog): Promise<string> => {
    console.warn('addFuelLogToDb is deprecated. Use addTransactionWithExtensions instead.');
    return '';
};

// ============================================================================
// INVESTMENT OPERATIONS (DEPRECATED - Now using transaction extensions)
// ============================================================================

/**
 * @deprecated Use transaction extensions instead
 * Fetch investment data from investment_transactions joined with transactions
 */
export const fetchInvestments = async () => {
    // Return empty array - investment data now comes from transactions with investment_transactions join
    console.warn('fetchInvestments is deprecated. Investment data is now part of transaction extensions.');
    return [];
};

/**
 * @deprecated Use addTransactionWithExtensions instead
 */
export const addInvestmentToDb = async (investment: Investment): Promise<string> => {
    console.warn('addInvestmentToDb is deprecated. Use addTransactionWithExtensions instead.');
    return '';
};

/**
 * @deprecated Use updateTransactionWithExtensions instead
 */
export const updateInvestmentInDb = async (investment: Investment) => {
    console.warn('updateInvestmentInDb is deprecated.');
};

/**
 * @deprecated Delete the associated transaction instead
 */
export const deleteInvestmentFromDb = async (id: string) => {
    console.warn('deleteInvestmentFromDb is deprecated. Delete the transaction instead.');
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
