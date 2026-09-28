import pool from '../config/db.js';

/**
 * GET /api/v1/appointments/patient
 * Fetch all appointments for the currently logged-in patient.
 */
export async function getPatientAppointments(req, res) {
  try {
    const patientId = req.user?.id || req.query.patientId;
    if (!patientId) {
      return res.status(400).json({ success: false, error: 'Patient ID is required' });
    }

    const [rows] = await pool.query(
      `SELECT a.*, dp.name AS doctor_name, dp.photo AS doctor_photo, dp.specialty AS doctor_specialty,
              dp.clinic_name, dp.clinic_address, dp.city
       FROM appointments a
       JOIN doctor_profiles dp ON a.doctor_id = dp.id
       WHERE a.patient_id = ?
       ORDER BY a.start_datetime DESC`,
      [patientId]
    );

    const appointments = rows.map(row => {
      const start = new Date(row.start_datetime);
      const end = new Date(row.end_datetime);
      
      const startStr = start.toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
      }).replace(/\bam\b/, 'AM').replace(/\bpm\b/, 'PM');

      const endStr = end.toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
      }).replace(/\bam\b/, 'AM').replace(/\bpm\b/, 'PM');

      return {
        id: row.id,
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
      };
    });

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
      `SELECT * FROM appointments 
       WHERE doctor_id = ?
       ORDER BY start_datetime ASC`,
      [doctorId]
    );

    return res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('[Express Fetch Doctor Appointments Error]:', error);
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

    await pool.query(
      `UPDATE appointments
       SET status = 'cancelled', cancellation_reason = ?
       WHERE id = ?`,
      [reason || 'Patient requested cancellation', id]
    );

    return res.json({ success: true, message: 'Appointment cancelled successfully' });
  } catch (error) {
    console.error('[Express Cancel Appointment Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * PATCH /api/v1/appointments/:id/reschedule
 * Reschedule an appointment to a new date/time.
 */
export async function rescheduleAppointment(req, res) {
  try {
    const { id } = req.params;
    const { startDatetime, endDatetime } = req.body;

    await pool.query(
      `UPDATE appointments
       SET start_datetime = ?, end_datetime = ?, status = 'upcoming'
       WHERE id = ?`,
      [startDatetime, endDatetime, id]
    );

    return res.json({ success: true, message: 'Appointment rescheduled successfully' });
  } catch (error) {
    console.error('[Express Reschedule Appointment Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
