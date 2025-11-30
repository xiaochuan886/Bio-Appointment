import { initializeConnections, query, DatabaseHelper } from './connection';
import { createClient } from "@supabase/supabase-js";

// Database type configuration
const DATABASE_TYPE = import.meta.env.VITE_DATABASE_TYPE || import.meta.env.DATABASE_TYPE || 'local';

// Supabase configuration (legacy support)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Initialize Supabase client for legacy support
let supabaseClient: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseAnonKey && DATABASE_TYPE === 'supabase') {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
  console.log('Using Supabase database');
} else {
  console.log('Using local PostgreSQL database');
}

/**
 * Initialize database based on configuration
 */
export async function initializeDatabase() {
  if (DATABASE_TYPE === 'local') {
    await initializeConnections();
  } else if (DATABASE_TYPE === 'supabase' && supabaseClient) {
    // Supabase client is already initialized
    console.log('Supabase client initialized');
  } else {
    throw new Error('Invalid database configuration');
  }
}

/**
 * Get database client based on configuration
 */
export function getDatabase() {
  if (DATABASE_TYPE === 'supabase' && supabaseClient) {
    return supabaseClient;
  } else {
    return {
      query,
      DatabaseHelper,
    };
  }
}

/**
 * Check which database type is being used
 */
export function isUsingSupabase(): boolean {
  return DATABASE_TYPE === 'supabase' && supabaseClient !== null;
}

/**
 * Check which database type is being used
 */
export function isUsingLocal(): boolean {
  return DATABASE_TYPE === 'local';
}

// Export for backward compatibility
export const supabase = supabaseClient;

// Export types
export type DatabaseClient = ReturnType<typeof getDatabase>;