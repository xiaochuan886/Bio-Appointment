import { initializeConnections, query, DatabaseHelper } from './connection';

// Database configuration - using local PostgreSQL only
const DATABASE_TYPE = 'local';

/**
 * Initialize database based on configuration
 */
export async function initializeDatabase() {
  if (DATABASE_TYPE === 'local') {
    await initializeConnections();
    console.log('Using local PostgreSQL database');
  } else {
    throw new Error('Invalid database configuration');
  }
}

/**
 * Get database client based on configuration
 */
export function getDatabase() {
  return {
    query,
    DatabaseHelper,
  };
}

/**
 * Check which database type is being used
 */
export function isUsingSupabase(): boolean {
  return false;
}

/**
 * Check which database type is being used
 */
export function isUsingLocal(): boolean {
  return DATABASE_TYPE === 'local';
}

// Export types
export type DatabaseClient = ReturnType<typeof getDatabase>;