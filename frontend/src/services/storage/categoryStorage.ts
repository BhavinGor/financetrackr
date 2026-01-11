/**
 * Service for managing custom transaction categories
 * Uses Supabase database with localStorage fallback for offline mode
 */

import { fetchCustomCategories, addCustomCategoryToDb } from '../supabase/database';

const CUSTOM_CATEGORIES_KEY = 'financetrackr_custom_categories';
const MIGRATION_KEY = 'financetrackr_categories_migrated';

// Default transaction categories
export const DEFAULT_CATEGORIES = [
    'Income', 'Expense', 'Salary', 'Freelance', 'Food', 'Groceries', 'Rent',
    'Transport', 'Fuel', 'Utilities', 'Shopping', 'Entertainment',
    'Vehicle Maint.', 'Insurance', 'Savings', 'Savings Transfer', 'Self Transfer', 'Other'
];

/**
 * Get custom categories from localStorage (fallback/cache)
 * @returns Set of custom category names
 */
const getCustomCategoriesFromLocalStorage = (): Set<string> => {
    try {
        const stored = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
        if (stored) {
            const categories = JSON.parse(stored);
            return new Set(Array.isArray(categories) ? categories : []);
        }
    } catch (error) {
        console.error('Failed to load custom categories from localStorage:', error);
    }
    return new Set();
};

/**
 * Save custom categories to localStorage (cache)
 */
const saveCustomCategoriesToLocalStorage = (categories: Set<string>): void => {
    try {
        localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(Array.from(categories)));
    } catch (error) {
        console.error('Failed to save custom categories to localStorage:', error);
    }
};

/**
 * Migrate localStorage categories to database (one-time)
 */
const migrateLocalStorageToDatabase = async (): Promise<void> => {
    try {
        // Check if already migrated
        const migrated = localStorage.getItem(MIGRATION_KEY);
        if (migrated === 'true') {
            return;
        }

        const localCategories = getCustomCategoriesFromLocalStorage();
        if (localCategories.size > 0) {
            console.log('📦 Migrating custom categories from localStorage to database...');

            // Add each category to database
            for (const category of localCategories) {
                try {
                    await addCustomCategoryToDb(category);
                } catch (error) {
                    console.error(`Failed to migrate category "${category}":`, error);
                }
            }

            console.log('✅ Migration complete');
        }

        // Mark as migrated
        localStorage.setItem(MIGRATION_KEY, 'true');
    } catch (error) {
        console.error('Failed to migrate categories:', error);
    }
};

/**
 * Get custom categories from database
 * @returns Set of custom category names
 */
export const getCustomCategories = async (): Promise<Set<string>> => {
    try {
        // Migrate localStorage data on first load
        await migrateLocalStorageToDatabase();

        // Fetch from database
        const categories = await fetchCustomCategories();
        const categorySet = new Set(categories);

        // Update localStorage cache
        saveCustomCategoriesToLocalStorage(categorySet);

        return categorySet;
    } catch (error) {
        console.error('Failed to load custom categories from database, using localStorage fallback:', error);
        // Fallback to localStorage if database fails
        return getCustomCategoriesFromLocalStorage();
    }
};

/**
 * Get custom categories synchronously from localStorage cache
 * Use this for initial render, then update with async version
 * @returns Set of custom category names
 */
export const getCustomCategoriesSync = (): Set<string> => {
    return getCustomCategoriesFromLocalStorage();
};

/**
 * Save a new custom category to database
 * @param category - The category name to save
 * @returns true if saved successfully, false otherwise
 */
export const saveCustomCategory = async (category: string): Promise<boolean> => {
    try {
        const trimmedCategory = category.trim();
        if (!trimmedCategory) {
            return false;
        }

        // Don't save if it's already a default category
        if (DEFAULT_CATEGORIES.includes(trimmedCategory)) {
            return false;
        }

        // Save to database
        await addCustomCategoryToDb(trimmedCategory);

        // Update localStorage cache
        const localCategories = getCustomCategoriesFromLocalStorage();
        localCategories.add(trimmedCategory);
        saveCustomCategoriesToLocalStorage(localCategories);

        return true;
    } catch (error) {
        console.error('Failed to save custom category:', error);

        // Fallback: save to localStorage only
        try {
            const trimmedCategory = category.trim();
            if (!trimmedCategory || DEFAULT_CATEGORIES.includes(trimmedCategory)) {
                return false;
            }

            const localCategories = getCustomCategoriesFromLocalStorage();
            localCategories.add(trimmedCategory);
            saveCustomCategoriesToLocalStorage(localCategories);
            return true;
        } catch (fallbackError) {
            console.error('Failed to save to localStorage fallback:', fallbackError);
            return false;
        }
    }
};

/**
 * Get all categories (default + custom) sorted alphabetically
 * @returns Array of all category names
 */
export const getAllCategories = async (): Promise<string[]> => {
    const customCategories = await getCustomCategories();
    const allCategories = [...DEFAULT_CATEGORIES, ...Array.from(customCategories)];

    // Remove duplicates and sort
    return Array.from(new Set(allCategories)).sort((a, b) => a.localeCompare(b));
};

/**
 * Clear all custom categories from localStorage cache
 * Note: This doesn't delete from database
 */
export const clearCustomCategoriesCache = (): void => {
    try {
        localStorage.removeItem(CUSTOM_CATEGORIES_KEY);
        localStorage.removeItem(MIGRATION_KEY);
    } catch (error) {
        console.error('Failed to clear custom categories cache:', error);
    }
};
