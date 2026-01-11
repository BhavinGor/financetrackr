/**
 * Authentication Service
 * 
 * Provides authentication-related functions using Supabase Auth.
 * Handles login, signup, logout, password reset, and session management.
 */
import { supabase } from './client';

/**
 * Get the currently authenticated user
 * @returns User object if authenticated, null otherwise
 */
export const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};

/**
 * Get the current session
 * @returns Session object if active, null otherwise
 */
export const getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
};

/**
 * Sign in with email and password
 * @param email - User email
 * @param password - User password
 * @returns User and session data
 */
export const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) throw error;
    return data;
};

/**
 * Sign up a new user
 * @param email - User email
 * @param password - User password
 * @returns User and session data
 */
export const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) throw error;
    return data;
};

/**
 * Sign out the current user
 */
export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

/**
 * Send password reset email
 * @param email - User email
 */
export const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
};

/**
 * Update user password
 * @param newPassword - New password
 */
export const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
        password: newPassword,
    });
    if (error) throw error;
};

/**
 * Listen for authentication state changes
 * @param callback - Function to call when auth state changes
 * @returns Unsubscribe function
 */
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return () => subscription.unsubscribe();
};
