/**
 * Supabase Client Configuration
 * 
 * Initializes and exports the Supabase client instance.
 * This client is used throughout the application for authentication
 * and database operations.
 * 
 * Environment Variables Required:
 * - VITE_SUPABASE_URL: Your Supabase project URL
 * - VITE_SUPABASE_ANON_KEY: Your Supabase anonymous key
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isDev = import.meta.env.DEV;

// Validate configuration in development
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

/**
 * Supabase client instance
 * 
 * Use this client for:
 * - Authentication: supabase.auth.*
 * - Database queries: supabase.from('table_name').*
 * - Real-time subscriptions: supabase.from('table_name').on().*
 */
export const supabase = createClient(SUPABASE_URL || '', SUPABASE_KEY || '');
