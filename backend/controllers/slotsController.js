import pool from '../config/db.js';
import crypto from 'crypto';
import { addClient, broadcastScheduleUpdate } from '../services/sseService.js';

/**
 * Helper: Format Date or ISO string to MySQL 'YYYY-MM-DD HH:MM:SS' in IST (+05:30)
 */
function toMySQLDatetime(dateVal) {
  if (!dateVal) return null;
  if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateVal)) {
    return dateVal;
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  // Convert UTC to IST (+05:30)
  const istTime = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
  return istTime.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Format a Date to "09:30 AM" in IST
 */
function formatISTTime(d) {
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).replace(/\bam\b/, 'AM').replace(/\bpm\b/, 'PM');
}

/**
 * GET /api/v1/slots
 * Query params: doctorId, date (YYYY-MM-DD or 'Today' / 'Tomorrow')
 * Generates slot availability for a given doctor on a specific date.
 */
export async function getSlots(req, res) {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) {
      return res.status(400).json({ success: false, error: 'doctorId and date query params required' });
    }

    // Resolve date to targetDate in IST
    const now = new Date();
    let targetDate;
    if (date === 'Today' || (typeof date === 'string' && date.startsWith('Today'))) {
      targetDate = new Date(now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
    } else if (date === 'Tomorrow' || (typeof date === 'string' && date.startsWith('Tomorrow'))) {
      targetDate = new Date(now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
      targetDate.setDate(targetDate.getDate() + 1);
    } else {
      targetDate = new Date(date);
      if (isNaN(targetDate.getTime())) {
        targetDate = new Date(now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
      }
    }

    const weekday = targetDate.toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' });

    // 0. Check doctor accepting_appointments status
    const [docProfiles] = await pool.query(
      `SELECT id, name, accepting_appointments FROM doctor_profiles WHERE id = ?`,
      [doctorId]
    );
    const isAccepting = docProfiles.length > 0
      ? Boolean(docProfiles[0].accepting_appointments)
      : true;

    // 1. Fetch doctor availability rules for this weekday
    const [rules] = await pool.query(
      `SELECT * FROM doctor_availability_rules WHERE doctor_id = ? AND weekday = ?`,
      [doctorId, weekday]
    );

    let startH = 9, startM = 0, endH = 18, endM = 0, slotDuration = 30;
    if (rules.length > 0) {
      const rule = rules[0];
      const [sh, sm] = (rule.start_time || '09:00:00').split(':').map(Number);
      const [eh, em] = (rule.end_time || '18:00:00').split(':').map(Number);
      startH = isNaN(sh) ? 9 : sh;
      startM = isNaN(sm) ? 0 : sm;
      endH = isNaN(eh) ? 18 : eh;
      endM = isNaN(em) ? 0 : em;
      slotDuration = rule.slot_duration_minutes || 30;
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

      slots.push({
        time: formatISTTime(slotStart),
        timeEnd: formatISTTime(slotEnd),
        startISO: slotStart.toISOString(),
        endISO: slotEnd.toISOString(),
        status: 'available',
      });
    }

    // If doctor has paused new appointments, block ALL slots immediately
    if (!isAccepting) {
      for (const slot of slots) {
        slot.status = 'blocked';
        slot.label = 'Appointments Paused';
      }
      return res.json({
        success: true,
        count: slots.length,
        data: slots,
        acceptingAppointments: false,
        message: 'Doctor has paused new appointments. All booking slots are blocked.'
      });
    }

    // 3. Date window covering full day in IST
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    const datePrefix = `${year}-${month}-${day}`;
    const dayStartStr = `${datePrefix} 00:00:00`;
    const dayEndStr = `${datePrefix} 23:59:59`;

    // 4. Fetch schedule blocks overlapping this day
    const [blocks] = await pool.query(
      `SELECT * FROM doctor_schedule_blocks 
       WHERE doctor_id = ? 
         AND start_datetime <= ? 
         AND end_datetime >= ?`,
      [doctorId, dayEndStr, dayStartStr]
    );

    // 5. Fetch booked appointments for this day
    const [bookedAppts] = await pool.query(
      `SELECT start_datetime, end_datetime FROM appointments 
       WHERE doctor_id = ? 
         AND start_datetime <= ? 
         AND end_datetime >= ? 
         AND status IN ('upcoming', 'completed')`,
      [doctorId, dayEndStr, dayStartStr]
    );

    // 6. Fetch active payment holds
    const [activeHolds] = await pool.query(
      `SELECT slot_datetime FROM slot_holds 
       WHERE doctor_id = ? AND expires_at > NOW() AND confirmed = FALSE`,
      [doctorId]
    );

    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

    for (const slot of slots) {
      const slotStart = new Date(slot.startISO);
      const slotEnd = new Date(slot.endISO);

      // Check blocks FIRST (breaks, leaves, blocked slots) — these take priority over expired
      // so patients can see WHY a slot is unavailable even if time has passed
      let matchedBlock = null;
      for (const block of blocks) {
        const blockStart = new Date(block.start_datetime);
        const blockEnd = new Date(block.end_datetime);
        // Overlap: slotStart < blockEnd && slotEnd > blockStart
        if (slotStart < blockEnd && slotEnd > blockStart) {
          if (block.type === 'break') {
            matchedBlock = block;
            break; // Break has highest priority, stop search
          } else if (!matchedBlock) {
            matchedBlock = block;
          }
        }
      }

      if (matchedBlock) {
        slot.status = matchedBlock.type === 'break' ? 'break' : 'blocked';
        slot.label = matchedBlock.type === 'break' ? (matchedBlock.reason || 'Doctor on Break') : (matchedBlock.reason || 'Unavailable');
        continue;
      }

      // Mark as expired only if no block covers this slot
      if (slotStart < nowIST) {
        slot.status = 'expired';
        continue;
      }

      // Check payment holds
      for (const hold of activeHolds) {
        const holdDate = new Date(hold.slot_datetime);
        if (Math.abs(slotStart.getTime() - holdDate.getTime()) < 60000) {
          slot.status = 'blocked';
          slot.label = 'Payment Pending';
          break;
        }
      }
      if (slot.status !== 'available') continue;

      // Check booked appointments
      for (const appt of bookedAppts) {
        const apptStart = new Date(appt.start_datetime);
        const apptEnd = new Date(appt.end_datetime);
        if (slotStart < apptEnd && slotEnd > apptStart) {
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
 * GET /api/v1/slots/blocks
 * Fetch schedule blocks for a doctor.
 */
export async function getScheduleBlocks(req, res) {
  try {
    const { doctorId } = req.query;
    if (!doctorId) {
      return res.status(400).json({ success: false, error: 'doctorId query param is required.' });
    }

    const [blocks] = await pool.query(
      `SELECT id, doctor_id, start_datetime, end_datetime, type, reason, created_at
       FROM doctor_schedule_blocks 
       WHERE doctor_id = ?
       ORDER BY start_datetime ASC`,
      [doctorId]
    );

    return res.json({ success: true, count: blocks.length, data: blocks });
  } catch (error) {
    console.error('[Express Get Schedule Blocks Error]:', error);
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
    if (!doctorId || !startDatetime || !endDatetime) {
      return res.status(400).json({ success: false, error: 'doctorId, startDatetime, and endDatetime are required' });
    }

    const startMySQL = toMySQLDatetime(startDatetime);
    const endMySQL = toMySQLDatetime(endDatetime);

    const [rows] = await pool.query(
      `SELECT a.id AS appointment_id, a.patient_name, a.patient_email, 
              a.start_datetime AS old_start_datetime, a.end_datetime AS old_end_datetime
       FROM appointments a
       WHERE a.doctor_id = ?
         AND a.start_datetime < ?
         AND a.end_datetime > ?
         AND a.status = 'upcoming'`,
      [doctorId, endMySQL, startMySQL]
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
    if (!doctorId || !startDatetime || !endDatetime) {
      return res.status(400).json({ success: false, error: 'doctorId, startDatetime, and endDatetime are required.' });
    }

    // Verify doctor profile exists
    const [docCheck] = await connection.query(
      `SELECT id FROM doctor_profiles WHERE id = ?`,
      [doctorId]
    );
    if (docCheck.length === 0) {
      return res.status(404).json({ success: false, error: `Doctor not found with ID ${doctorId}` });
    }

    const startMySQL = toMySQLDatetime(startDatetime);
    const endMySQL = toMySQLDatetime(endDatetime);

    if (!startMySQL || !endMySQL) {
      return res.status(400).json({ success: false, error: 'Invalid startDatetime or endDatetime format.' });
    }

    await connection.beginTransaction();

    // 1. Fetch conflicting appointments with row locking
    const [conflicts] = await connection.query(
      `SELECT id FROM appointments
       WHERE doctor_id = ?
         AND start_datetime < ?
         AND end_datetime > ?
         AND status = 'upcoming'
       FOR UPDATE`,
      [doctorId, endMySQL, startMySQL]
    );

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
      [blockId, doctorId, startMySQL, endMySQL, type || 'break', reason || 'Doctor Break']
    );

    await connection.commit();

    // Broadcast schedule update via SSE
    broadcastScheduleUpdate(doctorId, { action: 'block_created', date: startMySQL?.slice(0, 10) });

    return res.json({
      success: true,
      blockId,
      data: {
        id: blockId,
        doctorId,
        startDatetime: startMySQL,
        endDatetime: endMySQL,
        type: type || 'break',
        reason: reason || 'Doctor Break',
        affected_count: conflicts.length,
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
 * PUT /api/v1/slots/blocks/:id
 * Update an existing doctor schedule block (break/leave/blocked).
 */
export async function updateScheduleBlock(req, res) {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { startDatetime, endDatetime, type, reason } = req.body;

    const [existing] = await connection.query(`SELECT * FROM doctor_schedule_blocks WHERE id = ?`, [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Schedule block not found' });
    }

    const currentBlock = existing[0];
    const doctorId = currentBlock.doctor_id;

    const startMySQL = startDatetime ? toMySQLDatetime(startDatetime) : currentBlock.start_datetime;
    const endMySQL = endDatetime ? toMySQLDatetime(endDatetime) : currentBlock.end_datetime;
    const blockType = type || currentBlock.type;
    const blockReason = reason !== undefined ? reason : currentBlock.reason;

    await connection.beginTransaction();

    await connection.query(
      `UPDATE doctor_schedule_blocks 
       SET start_datetime = ?, end_datetime = ?, type = ?, reason = ?
       WHERE id = ?`,
      [startMySQL, endMySQL, blockType, blockReason, id]
    );

    await connection.commit();

    // Broadcast SSE update
    broadcastScheduleUpdate(doctorId, { action: 'block_updated', date: startMySQL?.slice(0, 10) });

    return res.json({
      success: true,
      data: {
        id,
        doctorId,
        startDatetime: startMySQL,
        endDatetime: endMySQL,
        type: blockType,
        reason: blockReason,
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('[Express Update Schedule Block Error]:', error);
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

    const [existing] = await pool.query(`SELECT doctor_id, start_datetime FROM doctor_schedule_blocks WHERE id = ?`, [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Schedule block not found' });
    }
    const doctorId = existing[0].doctor_id;
    const startStr = existing[0].start_datetime ? new Date(existing[0].start_datetime).toISOString().slice(0, 10) : null;

    const [result] = await pool.query(`DELETE FROM doctor_schedule_blocks WHERE id = ?`, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Schedule block not found' });
    }

    // Broadcast SSE update
    broadcastScheduleUpdate(doctorId, { action: 'block_deleted', date: startStr });

    return res.json({ success: true, message: 'Schedule block deleted' });
  } catch (error) {
    console.error('[Express Delete Schedule Block Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/v1/slots/events
 * SSE stream endpoint for real-time schedule updates.
 */
export function subscribeSlotsEvents(req, res) {
  const { doctorId } = req.query;
  if (!doctorId) {
    return res.status(400).json({ success: false, error: 'doctorId query parameter is required for SSE connection.' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  addClient(doctorId, res);
}

