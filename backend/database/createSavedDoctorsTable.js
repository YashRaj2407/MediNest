import pool from '../config/db.js';

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS saved_doctors (
      id VARCHAR(36) NOT NULL,
      patient_id VARCHAR(255) NOT NULL,
      doctor_id VARCHAR(36) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_patient_doctor (patient_id, doctor_id),
      INDEX idx_saved_patient (patient_id),
      INDEX idx_saved_doctor (doctor_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('saved_doctors table successfully created/verified');
  const [cols] = await pool.query('DESCRIBE saved_doctors');
  console.log(cols);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
