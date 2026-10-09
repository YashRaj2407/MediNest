import pool from '../config/db.js';

async function migrate() {
  const stmts = [
    'ALTER TABLE doctor_profiles MODIFY COLUMN fee_inr INT NULL',
    'ALTER TABLE doctor_profiles MODIFY COLUMN rating DECIMAL(3,1) NULL',
    'ALTER TABLE doctor_profiles MODIFY COLUMN review_count INT NOT NULL DEFAULT 0',
    'ALTER TABLE doctor_profiles ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT FALSE',
    "UPDATE doctor_profiles SET is_featured = TRUE WHERE id IN ('doc-1','doc-2','doc-3','doc-4','doc-5','doc-6')",
    'SELECT id, name, fee_inr, rating, review_count, is_featured FROM doctor_profiles ORDER BY created_at ASC'
  ];
  for (const s of stmts) {
    try {
      const [res] = await pool.query(s);
      if (Array.isArray(res)) { res.forEach(r => console.log(JSON.stringify(r))); }
      else { console.log('OK:', s.substring(0,60)); }
    } catch(e) {
      if (e.code === 'ER_DUP_FIELDNAME') { console.log('Column already exists, skipping.'); }
      else { console.error('ERR:', e.message, '|', s.substring(0,60)); }
    }
  }
  await pool.end();
  console.log('Migration complete.');
}
migrate();
