/**
 * backend/database/seedAvailabilityRules.js
 * Seeds default Mon-Sat availability rules for all 8 verified doctors.
 * Idempotent: uses ON DUPLICATE KEY UPDATE.
 */
import pool from '../config/db.js';
import crypto from 'crypto';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

async function seedRules() {
  const connection = await pool.getConnection();
  try {
    console.log('[Seed Rules] Starting doctor availability rules seed...');
    await connection.beginTransaction();

    const [doctors] = await connection.query('SELECT id, name FROM doctor_profiles');
    console.log(`[Seed Rules] Found ${doctors.length} doctors.`);

    let inserted = 0;
    for (const doc of doctors) {
      for (const day of WEEKDAYS) {
        const ruleId = crypto.randomUUID();
        await connection.query(
          `INSERT INTO doctor_availability_rules 
             (id, doctor_id, weekday, start_time, end_time, slot_duration_minutes)
             VALUES (?, ?, ?, '09:00:00', '18:00:00', 30)
             ON DUPLICATE KEY UPDATE
               start_time = VALUES(start_time),
               end_time = VALUES(end_time),
               slot_duration_minutes = VALUES(slot_duration_minutes)`,
          [ruleId, doc.id, day]
        );
        inserted++;
      }
    }

    await connection.commit();
    console.log(`[Seed Rules] Successfully seeded/verified ${inserted} availability rules!`);
  } catch (err) {
    await connection.rollback();
    console.error('[Seed Rules Error]:', err);
    throw err;
  } finally {
    connection.release();
    process.exit(0);
  }
}

seedRules();
