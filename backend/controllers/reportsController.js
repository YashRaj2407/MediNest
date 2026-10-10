import pool from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/v1/reports
 * Submit a doctor report. Patient identity is taken from authenticated Clerk session.
 */
export async function submitReport(req, res) {
  const conn = await pool.getConnection();
  try {
    const patientId = req.user?.id;
    if (!patientId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { doctorId, category, description, evidenceUrl } = req.body;
    if (!doctorId || !category || !description?.trim()) {
      return res.status(400).json({ success: false, error: 'doctorId, category, and description are required' });
    }

    const validCategories = [
      'unprofessional_behaviour', 'missed_appointment', 'false_credentials',
      'billing_issue', 'inappropriate_conduct', 'other'
    ];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ success: false, error: 'Invalid report category' });
    }

    // Verify reporter is a patient
    const [[patient]] = await conn.query(
      `SELECT id, role, account_status FROM profiles WHERE id = ?`, [patientId]
    );
    if (!patient || patient.role !== 'patient') {
      return res.status(403).json({ success: false, error: 'Only patients can submit doctor reports' });
    }

    // Verify doctor exists
    const [[doctor]] = await conn.query(`SELECT id FROM doctor_profiles WHERE id = ?`, [doctorId]);
    if (!doctor) return res.status(404).json({ success: false, error: 'Doctor not found' });

    // Prevent duplicate open reports (same patient + doctor in last 24h)
    const [[{ dupCount }]] = await conn.query(
      `SELECT COUNT(*) AS dupCount FROM doctor_reports
       WHERE patient_id = ? AND doctor_id = ? AND status IN ('open','under_review')
         AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
      [patientId, doctorId]
    );
    if (dupCount > 0) {
      return res.status(409).json({
        success: false,
        error: 'You already have a pending report for this doctor. Please wait for it to be reviewed.'
      });
    }

    await conn.beginTransaction();
    const reportId = uuidv4();
    await conn.query(
      `INSERT INTO doctor_reports (id, patient_id, doctor_id, category, description, evidence_url, status)
       VALUES (?, ?, ?, ?, ?, ?, 'open')`,
      [reportId, patientId, doctorId, category, description.trim(), evidenceUrl || null]
    );
    await conn.commit();

    return res.status(201).json({
      success: true,
      message: 'Report submitted successfully. Our team will review it shortly.',
      reportId
    });
  } catch (err) {
    await conn.rollback();
    console.error('[submitReport]', err);
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
}

/**
 * GET /api/v1/reports/my
 * Patient's own submitted reports (status only, no internal notes).
 */
export async function getMyReports(req, res) {
  try {
    const patientId = req.user?.id;
    if (!patientId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const [rows] = await pool.query(
      `SELECT r.id, r.doctor_id, dp.name AS doctor_name, dp.specialty,
              r.category, r.description, r.status, r.created_at, r.updated_at
       FROM doctor_reports r
       JOIN doctor_profiles dp ON r.doctor_id = dp.id
       WHERE r.patient_id = ?
       ORDER BY r.created_at DESC`,
      [patientId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[getMyReports]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
