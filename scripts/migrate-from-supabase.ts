#!/usr/bin/env npx ts-node

/**
 * Data Migration Script: Supabase to Local PostgreSQL
 * This script migrates data from Supabase to the local PostgreSQL database
 */

import { createClient } from '@supabase/supabase-js';
import { query, transaction } from '../src/db/connection';
import { getRedisClient } from '../src/db/connection';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Supabase configuration missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Migration statistics
interface MigrationStats {
  table: string;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ record: any; error: string }>;
}

const stats: MigrationStats[] = [];

// Utility functions
function log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📝',
    success: '✅',
    error: '❌',
    warning: '⚠️',
  }[type];

  console.log(`${prefix} [${timestamp}] ${message}`);
}

async function exportTableData(tableName: string): Promise<any[]> {
  log(`Exporting data from ${tableName}...`);

  try {
    const { data, error } = await supabase.from(tableName).select('*');

    if (error) {
      throw new Error(`Supabase export error: ${error.message}`);
    }

    log(`Exported ${data?.length || 0} records from ${tableName}`, 'success');
    return data || [];
  } catch (error) {
    log(`Failed to export ${tableName}: ${error}`, 'error');
    throw error;
  }
}

async function importTableData(tableName: string, data: any[]): Promise<MigrationStats> {
  log(`Importing ${data.length} records to ${tableName}...`);

  const tableStats: MigrationStats = {
    table: tableName,
    totalRecords: data.length,
    successCount: 0,
    errorCount: 0,
    errors: [],
  };

  if (data.length === 0) {
    log(`No data to import for ${tableName}`, 'warning');
    return tableStats;
  }

  try {
    // Get column information for the table
    const tableInfo = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    const columns = tableInfo.rows.map(row => row.column_name);

    for (const record of data) {
      try {
        // Filter record data to match table columns
        const filteredRecord: any = {};
        for (const column of columns) {
          if (record.hasOwnProperty(column)) {
            filteredRecord[column] = record[column];
          }
        }

        // Handle special cases for different tables
        let processedRecord = filteredRecord;

        // Handle timestamps
        if (filteredRecord.created_at) {
          processedRecord.created_at = new Date(filteredRecord.created_at).toISOString();
        }
        if (filteredRecord.updated_at) {
          processedRecord.updated_at = new Date(filteredRecord.updated_at).toISOString();
        }

        // Handle array fields
        if (tableName === 'appointments' && filteredRecord.companion_names) {
          processedRecord.companion_names = Array.isArray(filteredRecord.companion_names)
            ? filteredRecord.companion_names
            : [];
        }

        // Build INSERT query
        const columnNames = Object.keys(processedRecord);
        const values = Object.values(processedRecord);
        const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

        const insertQuery = `
          INSERT INTO ${tableName} (${columnNames.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT (id) DO NOTHING
        `;

        await query(insertQuery, values);
        tableStats.successCount++;

      } catch (error) {
        tableStats.errorCount++;
        tableStats.errors.push({
          record: record.id || 'unknown',
          error: error instanceof Error ? error.message : String(error),
        });

        // Log error but continue with next record
        log(`Error importing record ${record.id} to ${tableName}: ${error}`, 'error');
      }
    }

    log(`Imported ${tableStats.successCount}/${tableStats.totalRecords} records to ${tableName}`, 'success');

    if (tableStats.errorCount > 0) {
      log(`${tableStats.errorCount} records failed for ${tableName}`, 'warning');
    }

  } catch (error) {
    log(`Failed to import ${tableName}: ${error}`, 'error');
    throw error;
  }

  return tableStats;
}

async function migrateTable(tableName: string): Promise<void> {
  log(`Starting migration for ${tableName}...`);

  try {
    // Export data from Supabase
    const data = await exportTableData(tableName);

    // Import data to local PostgreSQL
    const tableStats = await importTableData(tableName, data);
    stats.push(tableStats);

  } catch (error) {
    log(`Migration failed for ${tableName}: ${error}`, 'error');
    throw error;
  }
}

async function verifyMigration(): Promise<void> {
  log('Verifying migration...');

  const tables = [
    'profiles',
    'services',
    'resources',
    'appointments',
    'schedules',
    'task_executions',
    'dingtalk_users',
    'dingtalk_departments',
    'dingtalk_sync_logs',
    'dingtalk_notifications',
  ];

  for (const tableName of tables) {
    try {
      // Count records in local database
      const localResult = await query(`SELECT COUNT(*) as count FROM ${tableName}`);
      const localCount = parseInt(localResult.rows[0].count);

      // Count records in Supabase
      const { count: supabaseCount } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      log(`${tableName}: Local=${localCount}, Supabase=${supabaseCount || 0}`,
        localCount === supabaseCount ? 'success' : 'warning');

    } catch (error) {
      log(`Verification failed for ${tableName}: ${error}`, 'error');
    }
  }
}

async function createBackup(): Promise<string> {
  log('Creating backup before migration...');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups');
  const backupFile = path.join(backupDir, `migration-backup-${timestamp}.sql`);

  // Create backup directory
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Export local database
  try {
    const { exec } = require('child_process');
    const pgDumpCommand = `pg_dump -h localhost -p 5437 -U app_user -d bio_appointment > "${backupFile}"`;

    await new Promise((resolve, reject) => {
      exec(pgDumpCommand, (error: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(backupFile);
        }
      });
    });

    log(`Backup created: ${backupFile}`, 'success');
    return backupFile;
  } catch (error) {
    log(`Failed to create backup: ${error}`, 'error');
    throw error;
  }
}

async function cleanupRedis(): Promise<void> {
  log('Cleaning up Redis cache...');

  try {
    const redisClient = getRedisClient();
    if (redisClient) {
      await redisClient.flushDb();
      log('Redis cache cleared', 'success');
    }
  } catch (error) {
    log(`Failed to clear Redis cache: ${error}`, 'error');
  }
}

function generateMigrationReport(): void {
  log('Generating migration report...');

  const reportFile = path.join(process.cwd(), 'migration-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    totalTables: stats.length,
    totalRecords: stats.reduce((sum, stat) => sum + stat.totalRecords, 0),
    totalSuccess: stats.reduce((sum, stat) => sum + stat.successCount, 0),
    totalErrors: stats.reduce((sum, stat) => sum + stat.errorCount, 0),
    tables: stats,
  };

  try {
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    log(`Migration report saved: ${reportFile}`, 'success');

    // Print summary
    log('\n=== Migration Summary ===', 'info');
    log(`Total Tables: ${report.totalTables}`, 'info');
    log(`Total Records: ${report.totalRecords}`, 'info');
    log(`Successfully Migrated: ${report.totalSuccess}`, 'success');
    log(`Failed Records: ${report.totalErrors}`, report.totalErrors > 0 ? 'error' : 'success');

    if (report.totalErrors > 0) {
      log('\n=== Errors ===', 'error');
      for (const tableStat of stats.filter(s => s.errorCount > 0)) {
        log(`${tableStat.table}: ${tableStat.errorCount} errors`, 'error');
        for (const error of tableStat.errors.slice(0, 5)) { // Show first 5 errors
          log(`  Record ${error.record}: ${error.error}`, 'error');
        }
        if (tableStat.errors.length > 5) {
          log(`  ... and ${tableStat.errors.length - 5} more errors`, 'error');
        }
      }
    }

  } catch (error) {
    log(`Failed to save report: ${error}`, 'error');
  }
}

async function main() {
  log('Starting data migration from Supabase to local PostgreSQL...', 'info');

  try {
    // Step 1: Create backup
    await createBackup();

    // Step 2: Clean up Redis
    await cleanupRedis();

    // Step 3: Migrate tables in order
    const tables = [
      'profiles',
      'services',
      'resources',
      'appointments',
      'schedules',
      'task_executions',
      'dingtalk_departments',
      'dingtalk_users',
      'dingtalk_sync_logs',
      'dingtalk_notifications',
    ];

    for (const tableName of tables) {
      await migrateTable(tableName);
    }

    // Step 4: Verify migration
    await verifyMigration();

    // Step 5: Generate report
    generateMigrationReport();

    log('Data migration completed successfully!', 'success');

  } catch (error) {
    log(`Migration failed: ${error}`, 'error');
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}