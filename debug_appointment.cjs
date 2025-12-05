
const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5437,
  database: 'bio_appointment',
  user: 'app_user',
  password: 'secure_password_123',
});

(async () => {
  try {
    // 1. Find a pending consultation appointment
    const res = await pool.query(`
      SELECT a.id, a.customer_name, s.category 
      FROM appointments a 
      JOIN services s ON a.service_id = s.id 
      WHERE s.category = 'consultation' AND a.doctor_status = 'pending'
      LIMIT 1
    `);
    
    if (res.rows.length > 0) {
      const appt = res.rows[0];
      console.log(`Found appointment: ${appt.id} (${appt.customer_name})`);
      
      // 2. Find doctor user
      const docRes = await pool.query("SELECT id FROM profiles WHERE role = 'doctor' LIMIT 1");
      const docId = docRes.rows[0].id;
      console.log(`Found doctor: ${docId}`);
      
      // 3. Print curl command
      console.log('\nTry this curl command:');
      console.log(`curl -X PUT http://localhost:3001/api/appointments/${appt.id} \\
  -H "Content-Type: application/json" \\
  -d '{"doctor_id":"${docId}", "doctor_status":"accepted", "status":"confirmed"}'`);
    } else {
      console.log('No pending consultation appointments found.');
    }
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
})();
