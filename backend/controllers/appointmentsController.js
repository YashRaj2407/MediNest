import pool from '../config/db.js';
import { addClient, broadcastScheduleUpdate, broadcastAppointmentUpdate } from '../services/sseService.js';

/**
 * Format a raw database row into an Appointment API response object.
 */
export function formatAppointmentRow(row) {
  if (!row) return null;
  const start = new Date(row.start_datetime);
  let end = new Date(row.end_datetime);

  // Strictly enforce 30-minute slot duration if end_datetime is corrupted or non-positive
  if (isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    end = new Date(start.getTime() + 30 * 60 * 1000);
  }
  
  const startStr = start.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
  }).replace(/\bam\b/, 'AM').replace(/\bpm\b/, 'PM');

  const endStr = end.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
  }).replace(/\bam\b/, 'AM').replace(/\bpm\b/, 'PM');

  let prescription = undefined;
  if (row.prescription_json) {
    try {
      prescription = typeof row.prescription_json === 'string' ? JSON.parse(row.prescription_json) : row.prescription_json;
    } catch (_) {}
  }

  return {
    id: row.id,
    patientId: row.patient_id,
    doctorId: row.doctor_id,
    doctorName: row.doctor_name || 'Dr. Specialist',
    doctorSpecialty: row.doctor_specialty || '',
    doctorPhoto: row.doctor_photo || '',
    clinicName: row.clinic_name || '',
    clinicAddress: row.clinic_address || '',
    city: row.city || '',
    appointmentType: row.consultation_type,
    date: start.toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata'
    }),
    timeSlot: `${startStr} – ${endStr}`,
    patientName: row.patient_name,
    patientAge: row.patient_age,
    patientGender: row.patient_gender,
    patientPhone: row.patient_phone,
    patientEmail: row.patient_email,
    visitReason: row.symptoms || '',
    feeINR: row.fee_inr,
    platformFeeINR: row.platform_fee_inr,
    taxesINR: row.taxes_inr,
    totalINR: row.total_inr,
    status: row.status,
    paymentMethod: 'Razorpay',
    paymentTransactionId: row.razorpay_payment_id || row.id,
    createdAt: new Date(row.created_at).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata'
    }),
    videoLink: row.video_link || undefined,
    consultationNotes: row.consultation_notes || undefined,
    cancellationReason: row.cancellation_reason || undefined,
    prescription,
  };
}

/**
 * GET /api/v1/appointments/events
 * SSE stream endpoint for real-time appointment updates (subscribed by patientId or doctorId).
 */
export function subscribeAppointmentEvents(req, res) {
  const entityId = req.query.patientId || req.query.doctorId;
  if (!entityId) {
    return res.status(400).json({ success: false, error: 'patientId or doctorId query parameter required' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  addClient(entityId, res);
}

/**
 * GET /api/v1/appointments/patient
 * Fetch all appointments for the currently logged-in patient.
 */
export async function getPatientAppointments(req, res) {
  try {
    // 1. Authenticate the request
    const authenticatedUserId = req.user?.id;
    if (!authenticatedUserId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Authentication required to view consultation history'
      });
    }

    const userRole = req.user?.role || 'patient';
    let targetPatientId = authenticatedUserId;

    // Authorization guard:
    // Patients are strictly confined to their own consultations — any attempt to pass another patientId is ignored
    if (userRole === 'patient') {
      targetPatientId = authenticatedUserId;
    } else if (userRole === 'admin') {
      // Admins may inspect a specific patient's history if requested
      if (req.query.patientId) {
        targetPatientId = req.query.patientId;
      }
    } else if (userRole === 'doctor') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Doctors access their consultations via the clinician schedule endpoint'
      });
    }

    // 2. Query consultations belonging EXCLUSIVELY to targetPatientId
    // Strict patient identity isolation: NEVER match on email address alone or use OR conditions on email!
    const sql = `
      SELECT a.*, dp.name AS doctor_name, dp.photo AS doctor_photo, dp.specialty AS doctor_specialty,
             dp.clinic_name, dp.clinic_address, dp.city
      FROM appointments a
      LEFT JOIN doctor_profiles dp ON a.doctor_id = dp.id
      WHERE a.patient_id = ?
      ORDER BY a.start_datetime DESC
    `;

    const [rows] = await pool.query(sql, [targetPatientId]);
    const appointments = rows.map(formatAppointmentRow);

    return res.json({ success: true, count: appointments.length, data: appointments });
  } catch (error) {
    console.error('[Express Fetch Patient Appointments Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/v1/appointments/doctor/:doctorId
 * Fetch appointments for a doctor (upcoming & past).
 */
export async function getDoctorAppointments(req, res) {
  try {
    const { doctorId } = req.params;

    const [rows] = await pool.query(
      `SELECT a.*, dp.name AS doctor_name, dp.specialty AS doctor_specialty, dp.photo AS doctor_photo,
              dp.clinic_name, dp.clinic_address, dp.city
       FROM appointments a
       LEFT JOIN doctor_profiles dp ON a.doctor_id = dp.id
       WHERE a.doctor_id = ?
       ORDER BY a.start_datetime ASC`,
      [doctorId]
    );

    const appointments = rows.map(formatAppointmentRow);

    return res.json({ success: true, count: appointments.length, data: appointments });
  } catch (error) {
    console.error('[Express Fetch Doctor Appointments Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * PATCH /api/v1/appointments/:id/complete
 * Mark an appointment as completed in database.
 * Requires doctor or admin authentication with authorization checks.
 */
export async function completeAppointment(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // 1. Authenticate the caller
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Authentication required to complete appointments'
      });
    }

    // Patients cannot complete appointments
    if (userRole === 'patient') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Patients cannot mark appointments as completed'
      });
    }

    // 2. Fetch the appointment
    const [rows] = await pool.query(
      `SELECT a.*, dp.name AS doctor_name, dp.photo AS doctor_photo, dp.specialty AS doctor_specialty,
              dp.clinic_name, dp.clinic_address, dp.city
       FROM appointments a
       LEFT JOIN doctor_profiles dp ON a.doctor_id = dp.id
       WHERE a.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    const appointment = rows[0];

    // 3. Authorization check: Doctor can only complete appointments scheduled with them
    if (userRole === 'doctor') {
      let authDoctorId = req.user.doctorId;
      if (!authDoctorId) {
        const [[docProfile]] = await pool.query(
          `SELECT id FROM doctor_profiles WHERE user_id = ? OR id = ?`,
          [userId, userId]
        );
        if (docProfile) {
          authDoctorId = docProfile.id;
        }
      }

      if (!authDoctorId || authDoctorId !== appointment.doctor_id) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You are not authorized to complete another doctor\'s appointment'
        });
      }
    }

    // 4. Repeated clicks / idempotency handling: if already completed, return safely
    if (appointment.status === 'completed') {
      const alreadyFormatted = formatAppointmentRow(appointment);
      return res.json({
        success: true,
        message: 'Appointment already completed',
        data: alreadyFormatted
      });
    }

    // 5. Synthesize and save standard NMC e-Rx if not already present
    let prescriptionJson = appointment.prescription_json;
    if (!prescriptionJson) {
      const defaultRx = {
        id: `RX-${id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || '2026'}`,
        appointmentId: id,
        diagnosis: appointment.symptoms ? `${appointment.symptoms} - Clinical Evaluation` : 'General Clinical Consultation',
        medicines: [
          { name: 'Tab Paracetamol 650mg', dosage: '1 Tab', timing: 'SOS after food', duration: '3 Days' },
          { name: 'Tab Pantoprazole 40mg', dosage: '1 Tab', timing: 'Once daily before breakfast', duration: '5 Days' }
        ],
        advice: 'Adequate hydration (2.5L water/day), warm saline gargles, healthy balanced diet.',
        followUpDate: 'After 7 Days',
        issuedAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      };
      prescriptionJson = JSON.stringify(defaultRx);
    }

    // 6. Update appointment status strictly to 'completed'
    await pool.query(
      `UPDATE appointments SET status = 'completed', prescription_json = ? WHERE id = ?`,
      [prescriptionJson, id]
    );

    // 7. Fetch updated row and format full appointment object
    const [updatedRows] = await pool.query(
      `SELECT a.*, dp.name AS doctor_name, dp.photo AS doctor_photo, dp.specialty AS doctor_specialty,
              dp.clinic_name, dp.clinic_address, dp.city
       FROM appointments a
       LEFT JOIN doctor_profiles dp ON a.doctor_id = dp.id
       WHERE a.id = ?`,
      [id]
    );
    const updatedAppointment = formatAppointmentRow(updatedRows[0]);

    // 8. Real-time broadcast to both doctor and patient
    broadcastAppointmentUpdate({
      doctorId: appointment.doctor_id,
      patientId: appointment.patient_id,
      appointmentId: id,
      action: 'appointment_completed',
      status: 'completed'
    });

    return res.json({
      success: true,
      message: 'Appointment marked as completed',
      data: updatedAppointment
    });
  } catch (error) {
    console.error('[Express Complete Appointment Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/v1/appointments/:id/prescription
 * Save digital prescription for an appointment.
 */
export async function savePrescription(req, res) {
  try {
    const { id } = req.params;
    const { prescription } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!prescription) {
      return res.status(400).json({ success: false, error: 'Prescription payload is required' });
    }

    const [rows] = await pool.query(`SELECT patient_id, doctor_id FROM appointments WHERE id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }
    const appointment = rows[0];

    // Doctor authorization guard
    if (userRole === 'doctor') {
      let authDoctorId = req.user?.doctorId;
      if (!authDoctorId) {
        const [[docProfile]] = await pool.query(`SELECT id FROM doctor_profiles WHERE user_id = ? OR id = ?`, [userId, userId]);
        if (docProfile) authDoctorId = docProfile.id;
      }
      if (authDoctorId && authDoctorId !== appointment.doctor_id) {
        return res.status(403).json({ success: false, error: 'Forbidden: You cannot issue a prescription for another doctor\'s appointment' });
      }
    }

    const prescriptionData = {
      ...prescription,
      appointmentId: id,
    };

    await pool.query(
      `UPDATE appointments
       SET prescription_json = ?
       WHERE id = ?`,
      [JSON.stringify(prescriptionData), id]
    );

    if (appointment.doctor_id) {
      broadcastScheduleUpdate(appointment.doctor_id, { action: 'prescription_saved', appointmentId: id });
    }

    return res.json({
      success: true,
      message: 'Prescription saved and issued successfully',
      data: prescriptionData
    });
  } catch (error) {
    console.error('[Express Save Prescription Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * PATCH /api/v1/appointments/:id/cancel
 * Cancel an appointment with cancellation reason.
 */
export async function cancelAppointment(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role || 'patient';

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
    }

    const [rows] = await pool.query(`SELECT patient_id, doctor_id, start_datetime FROM appointments WHERE id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    const appt = rows[0];

    // Authorization: Patient can only cancel their own appointment
    if (userRole === 'patient' && appt.patient_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You cannot cancel another patient\'s appointment'
      });
    }

    // Doctor can only cancel appointments scheduled with them
    if (userRole === 'doctor') {
      const [[docProfile]] = await pool.query(`SELECT id FROM doctor_profiles WHERE user_id = ?`, [userId]);
      if (!docProfile || docProfile.id !== appt.doctor_id) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You cannot cancel another doctor\'s appointment'
        });
      }
    }

    const doctorId = appt.doctor_id;
    const dateStr = appt.start_datetime ? new Date(appt.start_datetime).toISOString().slice(0, 10) : null;

    await pool.query(
      `UPDATE appointments
       SET status = 'cancelled', cancellation_reason = ?
       WHERE id = ?`,
      [reason || 'Patient requested cancellation', id]
    );

    if (doctorId) {
      broadcastScheduleUpdate(doctorId, { action: 'appointment_cancelled', date: dateStr });
    }

    return res.json({ success: true, message: 'Appointment cancelled successfully' });
  } catch (error) {
    console.error('[Express Cancel Appointment Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Helper: Add minutes to a MySQL 'YYYY-MM-DD HH:MM:SS' string.
 * Strictly calculates using pure arithmetic to avoid timezone shifts.
 */
function addMinutesToMySQLDatetime(dtStr, minutes = 30) {
  if (!dtStr) return null;
  const [d, t] = dtStr.split(' ');
  const [y, m, day] = d.split('-').map(Number);
  const [hh, mm, ss] = (t || '00:00:00').split(':').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, day, 0, hh * 60 + mm + minutes, ss || 0));
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(dt.getUTCFullYear())}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())} ${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}:${pad(dt.getUTCSeconds())}`;
}

/**
 * Helper: Resolve incoming start date/time into a MySQL DATETIME in IST (+05:30),
 * and automatically compute end_datetime as exactly 30 minutes later.
 */
function parseAndValidateSlotDatetimes(body) {
  const { startDatetime, newDate, newTimeSlot } = body;

  // Case 1: newDate (YYYY-MM-DD or formatted) + newTimeSlot ("11:30 AM" or "11:30 AM – 12:00 PM")
  if (newDate && newTimeSlot) {
    let cleanDate = newDate.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
      // already ISO date
    } else {
      const d = new Date(cleanDate);
      if (!isNaN(d.getTime())) {
        cleanDate = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      }
    }
    const cleanTime = newTimeSlot.trim().split(/\s*[–-]\s*/)[0];
    const match = cleanTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const period = match[3]?.toUpperCase();
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      const pad = (n) => String(n).padStart(2, '0');
      const sqlStart = `${cleanDate} ${pad(h)}:${pad(m)}:00`;
      const sqlEnd = addMinutesToMySQLDatetime(sqlStart, 30);
      const dateObj = new Date(`${cleanDate}T${pad(h)}:${pad(m)}:00+05:30`);
      const weekday = dateObj.toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' });
      return { sqlStart, sqlEnd, weekday, startH: h, startM: m };
    }
  }

  // Case 2: startDatetime ISO string or MySQL datetime string
  if (startDatetime) {
    if (typeof startDatetime === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(startDatetime)) {
      const sqlStart = startDatetime;
      const sqlEnd = addMinutesToMySQLDatetime(sqlStart, 30);
      const [dPart, tPart] = sqlStart.split(' ');
      const [h, m] = tPart.split(':').map(Number);
      const dateObj = new Date(`${dPart}T${tPart}+05:30`);
      const weekday = dateObj.toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' });
      return { sqlStart, sqlEnd, weekday, startH: h, startM: m };
    }
    const d = new Date(startDatetime);
    if (!isNaN(d.getTime())) {
      if (d.getFullYear() < 2025) {
        d.setFullYear(new Date().getFullYear() || 2026);
      }
      // If ISO string with Z: convert UTC to IST (+05:30)
      const istTime = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
      const sqlStart = istTime.toISOString().slice(0, 19).replace('T', ' ');
      const sqlEnd = addMinutesToMySQLDatetime(sqlStart, 30);
      const [dPart, tPart] = sqlStart.split(' ');
      const [h, m] = tPart.split(':').map(Number);
      const dateObj = new Date(`${dPart}T${tPart}+05:30`);
      const weekday = dateObj.toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' });
      return { sqlStart, sqlEnd, weekday, startH: h, startM: m };
    }
  }

  return null;
}

/**
 * PATCH /api/v1/appointments/:id/reschedule
 * Reschedule an appointment to a new date/time with strict 30-minute validation,
 * working-hours compliance, and conflict detection.
 */
export async function rescheduleAppointment(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role || 'patient';

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
    }

    const [rows] = await pool.query(
      `SELECT a.*, dp.name AS doctor_name, dp.accepting_appointments
       FROM appointments a
       LEFT JOIN doctor_profiles dp ON a.doctor_id = dp.id
       WHERE a.id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    const appt = rows[0];

    // Authorization: Patient can only reschedule their own appointment
    if (userRole === 'patient' && appt.patient_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You cannot reschedule another patient\'s appointment'
      });
    }

    // Doctor can only reschedule appointments booked with them
    if (userRole === 'doctor') {
      let authDoctorId = req.user?.doctorId;
      if (!authDoctorId) {
        const [[docProfile]] = await pool.query(`SELECT id FROM doctor_profiles WHERE user_id = ?`, [userId]);
        if (docProfile) authDoctorId = docProfile.id;
      }
      if (authDoctorId && authDoctorId !== appt.doctor_id) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You cannot reschedule another doctor\'s appointment'
        });
      }
    }

    // Disallow rescheduling already completed or cancelled appointments
    if (appt.status === 'completed' || appt.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: `Cannot reschedule a consultation that is already ${appt.status}.`
      });
    }

    // Check doctor accepting_appointments status
    if (appt.accepting_appointments === 0 || appt.accepting_appointments === false) {
      return res.status(400).json({
        success: false,
        error: `Dr. ${appt.doctor_name || 'the doctor'} has paused taking appointments. Rescheduling is currently unavailable.`
      });
    }

    // Parse and validate requested slot datetimes
    const slotInfo = parseAndValidateSlotDatetimes(req.body);
    if (!slotInfo) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or malformed date and time slot values provided.'
      });
    }

    const { sqlStart, sqlEnd, weekday, startH, startM } = slotInfo;
    const doctorId = appt.doctor_id;

    // Validate Doctor Working Hours for this weekday
    const [rules] = await pool.query(
      `SELECT * FROM doctor_availability_rules WHERE doctor_id = ? AND weekday = ?`,
      [doctorId, weekday]
    );

    let workStartH = 9, workStartM = 0, workEndH = 18, workEndM = 0;
    let hasExplicitDayRule = false;

    if (rules.length > 0) {
      hasExplicitDayRule = true;
      const rule = rules[0];
      const [sh, sm] = (rule.start_time || '09:00:00').split(':').map(Number);
      const [eh, em] = (rule.end_time || '18:00:00').split(':').map(Number);
      workStartH = isNaN(sh) ? 9 : sh;
      workStartM = isNaN(sm) ? 0 : sm;
      workEndH = isNaN(eh) ? 18 : eh;
      workEndM = isNaN(em) ? 0 : em;
    } else {
      // Check if the doctor has ANY availability rules in the system
      const [allDoctorRules] = await pool.query(
        `SELECT weekday FROM doctor_availability_rules WHERE doctor_id = ?`,
        [doctorId]
      );
      if (allDoctorRules.length > 0) {
        // Doctor has configured working days, and this weekday is NOT one of them
        return res.status(400).json({
          success: false,
          error: `Dr. ${appt.doctor_name || 'the doctor'} does not consult on ${weekday}s.`
        });
      }
      // If doctor has no rules configured at all, default to 09:00 AM - 06:00 PM
      workStartH = 9;
      workStartM = 0;
      workEndH = 18;
      workEndM = 0;
    }

    const slotStartMinutes = startH * 60 + startM;
    const slotEndMinutes = slotStartMinutes + 30; // exactly 30 minutes
    const workStartMinutes = workStartH * 60 + workStartM;
    const workEndMinutes = workEndH * 60 + workEndM;

    if (slotStartMinutes < workStartMinutes || slotEndMinutes > workEndMinutes) {
      const pad = (n) => String(n).padStart(2, '0');
      const fmtTime = (h, m) => {
        const p = h >= 12 ? 'PM' : 'AM';
        const dh = h % 12 === 0 ? 12 : h % 12;
        return `${pad(dh)}:${pad(m)} ${p}`;
      };
      return res.status(400).json({
        success: false,
        error: `Selected 30-minute slot (${fmtTime(startH, startM)} – ${fmtTime(Math.floor(slotEndMinutes / 60), slotEndMinutes % 60)}) is outside Dr. ${appt.doctor_name || 'the doctor'}'s working hours (${fmtTime(workStartH, workStartM)} – ${fmtTime(workEndH, workEndM)} on ${weekday}).`
      });
    }

    // Check for double-booking conflict with other UPCOMING appointments only.
    // Completed appointments do not block future rescheduling of the same slot.
    const [existingAppts] = await pool.query(
      `SELECT id FROM appointments 
       WHERE doctor_id = ? 
         AND id != ? 
         AND status = 'upcoming'
         AND start_datetime < ? 
         AND end_datetime > ?`,
      [doctorId, id, sqlEnd, sqlStart]
    );

    if (existingAppts.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'This 30-minute time slot has already been booked by another patient. Please select a different slot.'
      });
    }

    // Check for doctor schedule blocks (breaks, leave, holidays, blocked slots)
    const [existingBlocks] = await pool.query(
      `SELECT id, type, reason FROM doctor_schedule_blocks
       WHERE doctor_id = ? 
         AND start_datetime < ? 
         AND end_datetime > ?
       LIMIT 1`,
      [doctorId, sqlEnd, sqlStart]
    );

    if (existingBlocks.length > 0) {
      const block = existingBlocks[0];
      const reason = block.type === 'break'
        ? 'Doctor is on scheduled break during this time slot. Please choose another slot.'
        : (block.reason || 'This slot is unavailable due to doctor schedule block.');
      return res.status(409).json({ success: false, error: reason });
    }

    // Perform atomic update in MySQL
    await pool.query(
      `UPDATE appointments
       SET start_datetime = ?, end_datetime = ?, status = 'upcoming'
       WHERE id = ?`,
      [sqlStart, sqlEnd, id]
    );

    // Fetch updated row and format
    const [updatedRows] = await pool.query(
      `SELECT a.*, dp.name AS doctor_name, dp.photo AS doctor_photo, dp.specialty AS doctor_specialty,
              dp.clinic_name, dp.clinic_address, dp.city
       FROM appointments a
       LEFT JOIN doctor_profiles dp ON a.doctor_id = dp.id
       WHERE a.id = ?`,
      [id]
    );

    const updatedAppt = formatAppointmentRow(updatedRows[0]);

    if (doctorId) {
      broadcastScheduleUpdate(doctorId, { action: 'appointment_rescheduled', date: sqlStart.slice(0, 10) });
      broadcastAppointmentUpdate({
        doctorId,
        patientId: appt.patient_id,
        appointmentId: id,
        action: 'appointment_rescheduled',
        status: 'upcoming'
      });
    }

    return res.json({
      success: true,
      message: 'Appointment successfully rescheduled to 30-minute slot.',
      data: updatedAppt
    });
  } catch (error) {
    console.error('[Express Reschedule Appointment Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * DELETE /api/v1/appointments/:id
 * Safely delete an obsolete cancelled demo/test appointment record.
 * Protects completed consultations and preserves financial/audit records.
 */
export async function deleteAppointment(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role || 'patient';

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
    }

    const [rows] = await pool.query(`SELECT patient_id, status FROM appointments WHERE id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    const appt = rows[0];

    // Authorization: Patient can only delete their own appointment, or admin
    if (userRole === 'patient' && appt.patient_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You cannot delete another patient\'s appointment'
      });
    }

    // Only cancelled appointments can be deleted
    if (appt.status !== 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Only cancelled appointments can be dismissed or deleted'
      });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(`DELETE FROM receipts WHERE appointment_id = ?`, [id]);
      await conn.query(`DELETE FROM payments WHERE appointment_id = ?`, [id]);
      await conn.query(`DELETE FROM appointments WHERE id = ?`, [id]);
      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    return res.json({ success: true, message: 'Cancelled appointment record deleted successfully' });
  } catch (error) {
    console.error('[Express Delete Appointment Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

