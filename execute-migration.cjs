const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

async function runMigration() {
  try {
    console.log('Running migration: Add cancelled_reason and cancelled_at fields to appointments table');
    
    // Add cancelled_reason and cancelled_at fields to appointments table
    await pool.query(`
      ALTER TABLE appointments 
      ADD COLUMN cancelled_reason TEXT,
      ADD COLUMN cancelled_at TIMESTAMP;
    `);
    
    // Add comments
    await pool.query(`
      COMMENT ON COLUMN appointments.cancelled_reason IS 'Reason why the appointment was cancelled';
    `);
    
    await pool.query(`
      COMMENT ON COLUMN appointments.cancelled_at IS 'Timestamp when the appointment was cancelled';
    `);
    
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();