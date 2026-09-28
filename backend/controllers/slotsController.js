import pool from '../config/db.js';
import crypto from 'crypto';

/**
 * GET /api/v1/slots
 * Query params: doctorId, date (YYYY-MM-DD)
 * Generates slot availability for a given doctor on a specific date.
 */
export async function getSlots(req, res) {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) {
      return res.status(400).json({ success: false, error: 'doctorId and date query params required' });
    }

    const targetDate = new Date(date);
    const weekday = targetDate.toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' });

    // 1. Fetch doctor availability rules
    const [rules] = await pool.query(
      `SELECT * FROM doctor_availability_rules WHERE doctor_id = ? AND weekday = ?`,
      [doctorId, weekday]
    );

    let startH = 9, startM = 0, endH = 18, endM = 0, slotDuration = 30;
    if (rules.length > 0) {
      const rule = rules[0];
      const [sh, sm] = rule.start_time.split(':').map(Number);
      const [eh, em] = rule.end_time.split(':').map(Number);
      startH = sh; startM = sm; endH = eh; endM = em;
      slotDuration = rule.slot_duration_minutes;
    }

    // 2. Build time slots
    const slots = [];
    const cursor = new Date(targetDate);
    cursor.setHours(startH, startM, 0, 0);
    const endTime = new Date(targetDate);
    endTime.setHours(endH, endM, 0, 0);

    while (cursor < endTime) {
      const slotStart = new Date(cursor);
      cursor.setMinutes(cursor.getMinutes() + slotDuration);
      const slotEnd = new Date(cursor);

      const formatIST = (d) => d.toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
      }).replace(/\bam\b/, 'AM').replace(/\bpm\b/, 'PM');

      slots.push({
        time: formatIST(slotStart),
        timeEnd: formatIST(slotEnd),
        startISO: slotStart.toISOString(),
        endISO: slotEnd.toISOString(),
        status: 'available',
      });
    }

    // 3. Fetch schedule blocks for the date
    const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999);

    const [blocks] = await pool.query(
      `SELECT * FROM doctor_schedule_blocks 
       WHERE doctor_id = ? AND start_datetime >= ? AND end_datetime <= ?`,
      [doctorId, dayStart, dayEnd]
    );

    // 4. Fetch booked appointments for the date
    const [bookedAppts] = await pool.query(
      `SELECT start_datetime, end_datetime FROM appointments 
       WHERE doctor_id = ? AND start_datetime >= ? AND start_datetime <= ? AND status IN ('upcoming', 'completed')`,
      [doctorId, dayStart, dayEnd]
    );

    // 5. Fetch active payment holds
    const [activeHolds] = await pool.query(
      `SELECT slot_datetime FROM slot_holds 
       WHERE doctor_id = ? AND expires_at > NOW() AND confirmed = FALSE`,
      [doctorId]
    );

    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

    for (const slot of slots) {
      const slotDate = new Date(slot.startISO);

      // Expired in past
      if (slotDate < nowIST) {
        slot.status = 'expired';
        continue;
      }

      // Check blocks
      for (const block of blocks) {
        const blockStart = new Date(block.start_datetime);
        const blockEnd = new Date(block.end_datetime);
        if (slotDate >= blockStart && slotDate < blockEnd) {
          slot.status = block.type === 'break' ? 'break' : 'blocked';
          slot.label = block.type === 'break' ? 'Doctor on Break' : (block.reason || 'Unavailable');
          break;
        }
      }
      if (slot.status !== 'available') continue;

      // Check payment holds
      for (const hold of activeHolds) {
        const holdDate = new Date(hold.slot_datetime);
        if (slotDate.getTime() === holdDate.getTime()) {
          slot.status = 'blocked';
          slot.label = 'Payment Pending';
          break;
        }
      }
      if (slot.status !== 'available') continue;

      // Check booked appts
      for (const appt of bookedAppts) {
        const apptStart = new Date(appt.start_datetime);
        if (slotDate.getTime() === apptStart.getTime()) {
          slot.status = 'booked';
          break;
        }
      }
    }

    return res.json({ success: true, count: slots.length, data: slots });
  } catch (error) {
    console.error('[Express Get Slots Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/v1/slots/blocks/check-conflicts
 * Checks if adding a break/block conflicts with existing appointments.
 */
export async function checkBreakConflicts(req, res) {
  try {
    const { doctorId, startDatetime, endDatetime } = req.body;

    const [rows] = await pool.query(
      `SELECT a.id AS appointment_id, a.patient_name, a.patient_email, 
              a.start_datetime AS old_start_datetime, a.end_datetime AS old_end_datetime
       FROM appointments a
       WHERE a.doctor_id = ?
         AND a.start_datetime < ?
         AND a.end_datetime > ?
         AND a.status = 'upcoming'`,
      [doctorId, endDatetime, startDatetime]
    );

    const conflicts = rows.map(r => ({
      appointment_id: r.appointment_id,
      patient_name: r.patient_name,
      patient_email: r.patient_email,
      old_start_datetime: r.old_start_datetime,
      old_end_datetime: r.old_end_datetime,
      proposed_start_datetime: null,
      proposed_end_datetime: null,
      status: 'CAN_RESCHEDULE',
    }));

    return res.json({ success: true, conflicts });
  } catch (error) {
    console.error('[Express Check Break Conflicts Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/v1/slots/blocks
 * Create a doctor schedule block (break/leave) with atomic rescheduling.
 */
export async function createScheduleBlock(req, res) {
  const connection = await pool.getConnection();
  try {
    const { doctorId, startDatetime, endDatetime, type, reason } = req.body;

    await connection.beginTransaction();

    // 1. Fetch conflicting appointments with row locking
    const [conflicts] = await connection.query(
      `SELECT * FROM appointments
       WHERE doctor_id = ?
         AND start_datetime < ?
         AND end_datetime > ?
         AND status = 'upcoming'
       FOR UPDATE`,
      [doctorId, endDatetime, startDatetime]
    );

    let rescheduledCount = 0;
    let rescheduleRequiredCount = 0;

    for (const appt of conflicts) {
      await connection.query(
        `UPDATE appointments SET status = 'RESCHEDULE_REQUIRED' WHERE id = ?`,
        [appt.id]
      );
      rescheduleRequiredCount++;
    }

    // 2. Insert schedule block
    const blockId = crypto.randomUUID();
    await connection.query(
      `INSERT INTO doctor_schedule_blocks (id, doctor_id, start_datetime, end_datetime, type, reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [blockId, doctorId, startDatetime, endDatetime, type || 'break', reason || 'Doctor Break']
    );

    await connection.commit();

    return res.json({
      success: true,
      data: {
        affected_count: conflicts.length,
        rescheduled_count: rescheduledCount,
        reschedule_required_count: rescheduleRequiredCount,
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('[Express Create Schedule Block Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  } finally {
    connection.release();
  }
}

/**
 * DELETE /api/v1/slots/blocks/:id
 * Remove a doctor schedule block.
 */
export async function deleteScheduleBlock(req, res) {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM doctor_schedule_blocks WHERE id = ?`, [id]);
    return res.json({ success: true, message: 'Schedule block deleted' });
  } catch (error) {
    console.error('[Express Delete Schedule Block Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
