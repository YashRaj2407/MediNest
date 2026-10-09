/**
 * backend/database/seedScheduleBlocks.js
 * Seeds authoritative schedule blocks for Dr. Ananya (doc-1):
 * - 01:00 PM - 01:30 PM: Blocked slot
 * - 02:00 PM - 03:00 PM: Afternoon Break & Ward Rounds
 * - 03:00 PM - 05:00 PM: Doctor on Break (separate distinct record)
 */
import pool from '../config/db.js';
import crypto from 'crypto';

async function seedBlocks() {
  const connection = await pool.getConnection();
  try {
    console.log('[Seed Blocks] Starting schedule blocks seeding...');
    await connection.beginTransaction();

    const [doctors] = await connection.query(`SELECT id FROM doctor_profiles WHERE id = 'doc-1'`);
    if (doctors.length === 0) {
      console.error('[Seed Blocks Error] Doctor doc-1 not found');
      return;
    }
    const doctorId = 'doc-1';

    // Calculate Today's date in IST
    const now = new Date();
    const todayISTStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD

    const blocksToSeed = [
      {
        start: `${todayISTStr} 13:00:00`,
        end: `${todayISTStr} 13:30:00`,
        type: 'blocked',
        reason: 'Blocked Slot',
      },
      {
        start: `${todayISTStr} 14:00:00`,
        end: `${todayISTStr} 15:00:00`,
        type: 'break',
        reason: 'Afternoon Break & Ward Rounds',
      },
      {
        start: `${todayISTStr} 15:00:00`,
        end: `${todayISTStr} 17:00:00`,
        type: 'break',
        reason: 'Doctor on Break',
      },
    ];

    for (const b of blocksToSeed) {
      // Check if overlapping block already exists
      const [existing] = await connection.query(
        `SELECT id FROM doctor_schedule_blocks 
         WHERE doctor_id = ? AND start_datetime = ? AND end_datetime = ?`,
        [doctorId, b.start, b.end]
      );

      if (existing.length === 0) {
        const id = crypto.randomUUID();
        await connection.query(
          `INSERT INTO doctor_schedule_blocks (id, doctor_id, start_datetime, end_datetime, type, reason)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, doctorId, b.start, b.end, b.type, b.reason]
        );
        console.log(`[Seed Blocks] Inserted block: ${b.start} to ${b.end} (${b.type}: ${b.reason})`);
      } else {
        console.log(`[Seed Blocks] Already exists: ${b.start} to ${b.end}`);
      }
    }

    await connection.commit();
    console.log('[Seed Blocks] Seeding completed successfully!');
  } catch (err) {
    await connection.rollback();
    console.error('[Seed Blocks Error]:', err);
  } finally {
    connection.release();
    process.exit(0);
  }
}

seedBlocks();
