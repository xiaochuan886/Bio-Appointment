import { Pool, PoolClient, QueryResult } from 'pg';
import { createClient } from 'redis';

// Database configuration
const dbConfig = {
  host: import.meta.env.VITE_POSTGRES_HOST || import.meta.env.POSTGRES_HOST || 'localhost',
  port: parseInt(import.meta.env.VITE_POSTGRES_PORT || import.meta.env.POSTGRES_PORT || '5437'),
  database: import.meta.env.VITE_POSTGRES_DB || import.meta.env.POSTGRES_DB || 'bio_appointment',
  user: import.meta.env.VITE_POSTGRES_USER || import.meta.env.POSTGRES_USER || 'app_user',
  password: import.meta.env.VITE_POSTGRES_PASSWORD || import.meta.env.POSTGRES_PASSWORD || 'secure_password_123',
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // how long to wait when connecting a new client
};

// Redis configuration for sessions and caching
const redisConfig = {
  host: import.meta.env.VITE_REDIS_HOST || import.meta.env.REDIS_HOST || 'localhost',
  port: parseInt(import.meta.env.VITE_REDIS_PORT || import.meta.env.REDIS_PORT || '6379'),
  password: import.meta.env.VITE_REDIS_PASSWORD || import.meta.env.REDIS_PASSWORD,
};

// Create PostgreSQL connection pool
let pool: Pool;

// Create Redis client
let redisClient: ReturnType<typeof createClient> | null = null;

/**
 * Initialize database connections
 */
export async function initializeConnections() {
  try {
    // Initialize PostgreSQL pool
    pool = new Pool(dbConfig);

    // Test the connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    console.log('PostgreSQL connection pool initialized successfully');

    // Initialize Redis connection
    try {
      redisClient = createClient(redisConfig);
      await redisClient.connect();
      console.log('Redis connection initialized successfully');
    } catch (redisError) {
      console.warn('Redis connection failed, running without caching:', redisError);
      redisClient = null;
    }

  } catch (error) {
    console.error('Failed to initialize database connections:', error);
    throw error;
  }
}

/**
 * Get PostgreSQL connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializeConnections() first.');
  }
  return pool;
}

/**
 * Get Redis client
 */
export function getRedisClient() {
  return redisClient;
}

/**
 * Execute a database query with automatic connection management
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Database query error:', { text, params, error });
    throw error;
  }
}

/**
 * Execute a transaction
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Health check for database connections
 */
export async function healthCheck() {
  const results = {
    postgresql: false,
    redis: false,
  };

  try {
    // Check PostgreSQL
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    results.postgresql = true;
  } catch (error) {
    console.error('PostgreSQL health check failed:', error);
  }

  try {
    // Check Redis
    if (redisClient) {
      await redisClient.ping();
      results.redis = true;
    }
  } catch (error) {
    console.error('Redis health check failed:', error);
  }

  return results;
}

/**
 * Close database connections
 */
export async function closeConnections() {
  try {
    if (pool) {
      await pool.end();
      console.log('PostgreSQL connection pool closed');
    }

    if (redisClient) {
      await redisClient.quit();
      console.log('Redis connection closed');
    }
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
}

/**
 * Database helper functions
 */
export class DatabaseHelper {
  /**
   * Find a single record by ID
   */
  static async findById<T>(
    table: string,
    id: string,
    columns: string = '*'
  ): Promise<T | null> {
    const query = `SELECT ${columns} FROM ${table} WHERE id = $1`;
    const result = await query<T>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find multiple records with optional conditions
   */
  static async findMany<T>(
    table: string,
    conditions: Record<string, any> = {},
    options: {
      columns?: string;
      orderBy?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<T[]> {
    const { columns = '*', orderBy, limit, offset } = options;

    let query = `SELECT ${columns} FROM ${table}`;
    const params: any[] = [];
    let paramIndex = 1;

    // Build WHERE clause
    const whereClauses: string[] = [];
    for (const [key, value] of Object.entries(conditions)) {
      if (value !== undefined && value !== null) {
        whereClauses.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    // Add ORDER BY
    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }

    // Add LIMIT and OFFSET
    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(limit);
      paramIndex++;
    }

    if (offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(offset);
    }

    const result = await query<T>(query, params);
    return result.rows;
  }

  /**
   * Create a new record
   */
  static async create<T>(
    table: string,
    data: Record<string, any>
  ): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');

    const query = `
      INSERT INTO ${table} (${keys.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await query<T>(query, values);
    return result.rows[0];
  }

  /**
   * Update a record by ID
   */
  static async update<T>(
    table: string,
    id: string,
    data: Record<string, any>
  ): Promise<T | null> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');

    const query = `
      UPDATE ${table}
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await query<T>(query, [id, ...values]);
    return result.rows[0] || null;
  }

  /**
   * Delete a record by ID
   */
  static async delete<T>(
    table: string,
    id: string
  ): Promise<T | null> {
    const query = `DELETE FROM ${table} WHERE id = $1 RETURNING *`;
    const result = await query<T>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Count records with optional conditions
   */
  static async count(
    table: string,
    conditions: Record<string, any> = {}
  ): Promise<number> {
    let query = `SELECT COUNT(*) FROM ${table}`;
    const params: any[] = [];
    let paramIndex = 1;

    const whereClauses: string[] = [];
    for (const [key, value] of Object.entries(conditions)) {
      if (value !== undefined && value !== null) {
        whereClauses.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    const result = await query<{ count: string }>(query, params);
    return parseInt(result.rows[0].count, 10);
  }
}

// Export types for database operations
export type { PoolClient, QueryResult };