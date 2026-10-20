import pool from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';
import { clerkClient } from '../middleware/auth.js';

// ── Clerk Safe Deletion Helper ────────────────────────────────────────────────
async function deleteClerkUserSafely(userId, email) {
  let deletedFromClerk = false;
  let clerkError = null;

  try {
    // 1. Try deleting by userId if it's a Clerk User ID
    if (userId && typeof userId === 'string' && userId.startsWith('user_')) {
      try {
        await clerkClient.users.deleteUser(userId);
        deletedFromClerk = true;
        return { deletedFromClerk, clerkError: null };
      } catch (err) {
        if (err.status !== 404) clerkError = err.message;
      }
    }

    // 2. Fallback: Search Clerk by email
    if (email && !deletedFromClerk) {
      try {
        const clerkUsers = await clerkClient.users.getUserList({ emailAddress: [email] });
        const list = clerkUsers.data || clerkUsers;
        if (list && list.length > 0) {
          for (const u of list) {
            await clerkClient.users.deleteUser(u.id);
            deletedFromClerk = true;
          }
        }
      } catch (err) {
        clerkError = err.message;
      }
    }
  } catch (err) {
    clerkError = err.message;
  }

  return { deletedFromClerk, clerkError };
}

// ── Audit Helper ──────────────────────────────────────────────────────────────
async function writeAudit(conn, { adminId, action, targetType, targetId, prevStatus, newStatus, reason, metadata }) {

  await conn.query(
    `INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, prev_status, new_status, reason, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [uuidv4(), adminId, action, targetType, targetId, prevStatus || null, newStatus || null, reason || null,
     metadata ? JSON.stringify(metadata) : null]
  );
}

// ── GET /api/v1/admin/patients ─────────────────────────────────────────────
export async function getPatients(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT id, role, account_status, full_name, email, phone, created_at
       FROM profiles
       WHERE role = 'patient'
       ORDER BY created_at DESC`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[Admin getPatients]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ── GET /api/v1/admin/doctors ─────────────────────────────────────────────
export async function getAdminDoctors(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT dp.id, dp.user_id, dp.name, p.email, p.phone, p.account_status,
              dp.registration_number, dp.specialty, dp.qualifications,
              dp.city, dp.clinic_name, dp.fee_inr, dp.verification_status,
              dp.approval_reason, dp.approved_by, dp.approved_at,
              dp.suspension_reason, dp.accepting_appointments,
              dp.created_at,
              (SELECT COUNT(*) FROM appointments a WHERE a.doctor_id = dp.id) AS appointment_count
       FROM doctor_profiles dp
       JOIN profiles p ON dp.user_id = p.id
       ORDER BY dp.created_at DESC`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[Admin getAdminDoctors]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ── GET /api/v1/admin/appointments ────────────────────────────────────────
export async function getAdminAppointments(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.patient_id, a.patient_name, a.doctor_id,
              dp.name AS doctor_name, dp.specialty AS doctor_specialty,
              a.consultation_type, a.start_datetime, a.end_datetime,
              a.status, a.payment_status, a.total_inr, a.created_at
       FROM appointments a
       JOIN doctor_profiles dp ON a.doctor_id = dp.id
       ORDER BY a.start_datetime DESC
       LIMIT 500`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[Admin getAdminAppointments]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ── GET /api/v1/admin/stats ───────────────────────────────────────────────
export async function getAdminStats(req, res) {
  try {
    const [[{ patientCount }]] = await pool.query(
      `SELECT COUNT(*) AS patientCount FROM profiles WHERE role = 'patient'`
    );
    const [[{ doctorCount }]] = await pool.query(
      `SELECT COUNT(*) AS doctorCount FROM doctor_profiles`
    );
    const [[{ verifiedDoctors }]] = await pool.query(
      `SELECT COUNT(*) AS verifiedDoctors FROM doctor_profiles WHERE verification_status IN ('verified','approved')`
    );
    const [[{ pendingDoctors }]] = await pool.query(
      `SELECT COUNT(*) AS pendingDoctors FROM doctor_profiles WHERE verification_status = 'pending'`
    );
    const [[{ apptCount }]] = await pool.query(
      `SELECT COUNT(*) AS apptCount FROM appointments`
    );
    const [[{ revenue }]] = await pool.query(
      `SELECT COALESCE(SUM(amount_inr),0) AS revenue FROM payments WHERE status = 'paid'`
    );
    const [[{ openReports }]] = await pool.query(
      `SELECT COUNT(*) AS openReports FROM doctor_reports WHERE status IN ('open','under_review')`
    );
    return res.json({
      success: true,
      data: { patientCount, doctorCount, verifiedDoctors, pendingDoctors, apptCount, revenue, openReports }
    });
  } catch (err) {
    console.error('[Admin getAdminStats]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ── PATCH /api/v1/admin/patients/:id/status ───────────────────────────────
export async function updatePatientStatus(req, res) {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const adminId = req.user?.id || 'admin';

    const allowed = ['active', 'deactivated'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, error: `Invalid status. Use: ${allowed.join(', ')}` });
    }

    const [[prev]] = await conn.query(`SELECT account_status FROM profiles WHERE id = ? AND role = 'patient'`, [id]);
    if (!prev) return res.status(404).json({ success: false, error: 'Patient not found' });

    await conn.beginTransaction();
    await conn.query(`UPDATE profiles SET account_status = ? WHERE id = ?`, [status, id]);
    await writeAudit(conn, {
      adminId, action: `patient_${status}`, targetType: 'patient', targetId: id,
      prevStatus: prev.account_status, newStatus: status, reason
    });
    await conn.commit();

    return res.json({ success: true, message: `Patient account ${status}` });
  } catch (err) {
    await conn.rollback();
    console.error('[Admin updatePatientStatus]', err);
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
}

// ── DELETE /api/v1/admin/patients/:id ─────────────────────────────────────
export async function deletePatient(req, res) {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user?.id || 'admin';

    const [[patient]] = await conn.query(`SELECT * FROM profiles WHERE id = ? AND role = 'patient'`, [id]);
    if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });

    // Check for active (upcoming) appointments — warn but allow
    const [[{ upcomingCount }]] = await conn.query(
      `SELECT COUNT(*) AS upcomingCount FROM appointments WHERE patient_id = ? AND status = 'upcoming'`,
      [id]
    );

    // Check total appointments
    const [[{ totalAppointments }]] = await conn.query(
      `SELECT COUNT(*) AS totalAppointments FROM appointments WHERE patient_id = ?`,
      [id]
    );

    await conn.beginTransaction();

    if (totalAppointments === 0) {
      // No historical appointments: cleanly purge profile and dependent records
      await conn.query(`DELETE FROM notifications WHERE user_id = ?`, [id]).catch(() => {});
      await conn.query(`DELETE FROM saved_doctors WHERE patient_id = ?`, [id]).catch(() => {});
      await conn.query(`DELETE FROM profiles WHERE id = ?`, [id]);
    } else {
      // Soft-delete in MySQL: preserve appointments for legal retention, anonymize email to free unique constraint
      const anonEmail = `deleted_${id}_${Date.now()}@medinest.deleted`;
      await conn.query(
        `UPDATE profiles SET account_status = 'deleted', email = ?, full_name = '[Deleted Patient]', phone = NULL WHERE id = ?`,
        [anonEmail, id]
      );

      // Cancel upcoming appointments
      if (upcomingCount > 0) {
        await conn.query(
          `UPDATE appointments SET status = 'cancelled', cancellation_reason = 'Patient account deleted by admin'
           WHERE patient_id = ? AND status = 'upcoming'`,
          [id]
        );
      }
    }

    // Attempt Clerk deletion
    const { deletedFromClerk, clerkError } = await deleteClerkUserSafely(id, patient.email);

    await writeAudit(conn, {
      adminId, action: 'patient_deleted', targetType: 'patient', targetId: id,
      prevStatus: patient.account_status, newStatus: 'deleted', reason,
      metadata: {
        originalEmail: patient.email,
        deletedFromClerk,
        clerkError,
        upcomingAppointmentsCancelled: upcomingCount,
        hardDeleted: totalAppointments === 0
      }
    });
    await conn.commit();

    return res.json({
      success: true,
      message: deletedFromClerk
        ? 'Patient account deleted from database and Clerk. Email is now freed for reuse.'
        : `Patient account deleted from database. (Clerk sync: ${clerkError || 'Not found in Clerk'}).`,
      deletedFromClerk,
      clerkError,
      upcomingAppointmentsCancelled: upcomingCount
    });
  } catch (err) {
    await conn.rollback();
    console.error('[Admin deletePatient]', err);
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
}


// ── PATCH /api/v1/admin/doctors/:id/approval ─────────────────────────────
export async function updateDoctorApproval(req, res) {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const adminId = req.user?.id || 'admin';

    const validStatuses = ['approved', 'rejected', 'suspended', 'pending', 'verified'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `Invalid status. Use: ${validStatuses.join(', ')}` });
    }

    // Require reason for reject/suspend
    if (['rejected', 'suspended'].includes(status) && !reason?.trim()) {
      return res.status(400).json({ success: false, error: 'A reason is required when rejecting or suspending a doctor.' });
    }

    const [[prev]] = await conn.query(`SELECT verification_status, name FROM doctor_profiles WHERE id = ?`, [id]);
    if (!prev) return res.status(404).json({ success: false, error: 'Doctor not found' });

    await conn.beginTransaction();

    const now = new Date();
    const isApproval = ['approved', 'verified'].includes(status);
    const isSuspension = status === 'suspended';
    const isRejection = status === 'rejected';

    await conn.query(
      `UPDATE doctor_profiles SET
         verification_status = ?,
         approval_reason = ?,
         approved_by = ?,
         approved_at = ?,
         suspension_reason = ?,
         accepting_appointments = ?
       WHERE id = ?`,
      [
        status,
        isRejection ? (reason || null) : (isApproval ? null : (prev.approval_reason || null)),
        isApproval ? adminId : (prev.approved_by || null),
        isApproval ? now : (prev.approved_at || null),
        isSuspension ? reason : null,
        isApproval ? 1 : 0,
        id
      ]
    );

    await writeAudit(conn, {
      adminId, action: `doctor_${status}`, targetType: 'doctor', targetId: id,
      prevStatus: prev.verification_status, newStatus: status,
      reason, metadata: { doctorName: prev.name }
    });

    // Insert notification for the doctor
    const [[docUser]] = await conn.query(`SELECT user_id FROM doctor_profiles WHERE id = ?`, [id]);
    if (docUser?.user_id) {
      const notifMessage = isApproval
        ? `Your doctor profile has been approved. You are now visible to patients.`
        : isRejection
        ? `Your doctor profile was rejected. Reason: ${reason}`
        : isSuspension
        ? `Your doctor account has been suspended. Reason: ${reason}`
        : `Your doctor profile status has been updated to: ${status}`;

      await conn.query(
        `INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)`,
        [uuidv4(), docUser.user_id,
         `Profile ${status.charAt(0).toUpperCase() + status.slice(1)}`,
         notifMessage,
         isApproval ? 'success' : 'warning']
      );
    }

    await conn.commit();
    return res.json({ success: true, message: `Doctor status updated to '${status}'` });
  } catch (err) {
    await conn.rollback();
    console.error('[Admin updateDoctorApproval]', err);
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
}

// ── DELETE /api/v1/admin/doctors/:id ─────────────────────────────────────
export async function deleteDoctor(req, res) {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user?.id || 'admin';

    const [[doc]] = await conn.query(
      `SELECT dp.*, p.email, p.account_status FROM doctor_profiles dp
       JOIN profiles p ON dp.user_id = p.id WHERE dp.id = ?`,
      [id]
    );
    if (!doc) return res.status(404).json({ success: false, error: 'Doctor not found' });

    const [[{ upcomingCount }]] = await conn.query(
      `SELECT COUNT(*) AS upcomingCount FROM appointments WHERE doctor_id = ? AND status = 'upcoming'`,
      [id]
    );

    await conn.beginTransaction();

    // Suspend + deactivate doctor (soft delete — preserve historical records)
    await conn.query(
      `UPDATE doctor_profiles SET verification_status = 'suspended', accepting_appointments = 0,
       suspension_reason = ? WHERE id = ?`,
      [reason || 'Account deleted by admin', id]
    );
    // Anonymize doctor's user email in MySQL to free unique constraint
    const anonEmail = `deleted_doc_${doc.user_id}_${Date.now()}@medinest.deleted`;
    await conn.query(
      `UPDATE profiles SET email = ?, account_status = 'deleted' WHERE id = ?`,
      [anonEmail, doc.user_id]
    );

    // Attempt Clerk deletion for doctor
    const { deletedFromClerk, clerkError } = await deleteClerkUserSafely(doc.user_id, doc.email);

    // Mark upcoming appointments as RESCHEDULE_REQUIRED
    if (upcomingCount > 0) {
      await conn.query(
        `UPDATE appointments SET status = 'RESCHEDULE_REQUIRED',
         cancellation_reason = 'Doctor account deactivated by admin. Please reschedule.'
         WHERE doctor_id = ? AND status = 'upcoming'`,
        [id]
      );
    }

    await writeAudit(conn, {
      adminId, action: 'doctor_deleted', targetType: 'doctor', targetId: id,
      prevStatus: doc.verification_status, newStatus: 'suspended',
      reason, metadata: {
        doctorName: doc.name,
        originalEmail: doc.email,
        deletedFromClerk,
        clerkError,
        upcomingCount
      }
    });
    await conn.commit();

    return res.json({
      success: true,
      message: deletedFromClerk
        ? 'Doctor account deactivated and Clerk credentials removed. Historical records preserved.'
        : `Doctor account deactivated in database. (Clerk sync: ${clerkError || 'Not found in Clerk'}). Historical records preserved.`,
      deletedFromClerk,
      clerkError,
      upcomingAppointmentsAffected: upcomingCount
    });
  } catch (err) {
    await conn.rollback();
    console.error('[Admin deleteDoctor]', err);
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
}

// ── POST /api/v1/admin/reconcile-clerk-user ───────────────────────────────
export async function reconcileClerkUser(req, res) {
  const { email, userId } = req.body;
  if (!email && !userId) {
    return res.status(400).json({ success: false, error: 'email or userId is required' });
  }

  const adminId = req.user?.id || 'admin';

  try {
    const cleanEmail = email ? email.trim().toLowerCase() : null;

    // Check MySQL profiles
    const [mysqlProfiles] = await pool.query(
      `SELECT id, role, account_status, email FROM profiles WHERE LOWER(email) = ? OR id = ?`,
      [cleanEmail || '', userId || '']
    );

    // Check Clerk
    let clerkUsers = [];
    if (cleanEmail) {
      try {
        const resp = await clerkClient.users.getUserList({ emailAddress: [cleanEmail] });
        clerkUsers = resp.data || resp;
      } catch (e) {
        console.warn('[reconcileClerkUser] Clerk search warning:', e.message);
      }
    } else if (userId) {
      try {
        const u = await clerkClient.users.getUser(userId);
        if (u) clerkUsers = [u];
      } catch (_) {}
    }

    const hasActiveMysql = mysqlProfiles.some(p => p.account_status === 'active');

    let deletedCount = 0;
    const errors = [];
    for (const cu of clerkUsers) {
      try {
        await clerkClient.users.deleteUser(cu.id);
        deletedCount++;
      } catch (delErr) {
        errors.push(delErr.message);
      }
    }

    // Free any stale/deleted MySQL profiles holding this email
    for (const p of mysqlProfiles) {
      if (p.account_status === 'deleted') {
        const anon = `deleted_${p.id}_${Date.now()}@medinest.deleted`;
        await pool.query(`UPDATE profiles SET email = ? WHERE id = ?`, [anon, p.id]);
      }
    }

    await pool.query(
      `INSERT INTO admin_audit_log (id, admin_id, action, target_type, target_id, reason, metadata)
       VALUES (?, ?, 'clerk_reconcile', 'clerk_user', ?, 'Admin manual email release & Clerk reconciliation', ?)`,
      [uuidv4(), adminId, cleanEmail || userId, JSON.stringify({ deletedCount, clerkFound: clerkUsers.length, errors })]
    );

    return res.json({
      success: true,
      message: deletedCount > 0
        ? `Reconciled! Removed ${deletedCount} user(s) from Clerk. Email '${cleanEmail || userId}' is now free for new registrations.`
        : `No active Clerk users found for '${cleanEmail || userId}'. Email is clean.`,
      deletedCount,
      hasActiveMysql
    });
  } catch (err) {
    console.error('[Admin reconcileClerkUser]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}


// ── GET /api/v1/admin/reports ─────────────────────────────────────────────
export async function getReports(req, res) {
  try {
    const { status, from, to } = req.query;
    let sql = `
      SELECT r.*, 
        p.full_name AS patient_name, p.email AS patient_email,
        dp.name AS doctor_name, dp.specialty AS doctor_specialty
      FROM doctor_reports r
      JOIN profiles p ON r.patient_id = p.id
      JOIN doctor_profiles dp ON r.doctor_id = dp.id
      WHERE 1=1
    `;
    const params = [];
    if (status && status !== 'all') { sql += ` AND r.status = ?`; params.push(status); }
    if (from) { sql += ` AND r.created_at >= ?`; params.push(from); }
    if (to) { sql += ` AND r.created_at <= ?`; params.push(to); }
    sql += ` ORDER BY r.created_at DESC`;

    const [rows] = await pool.query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[Admin getReports]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ── PATCH /api/v1/admin/reports/:id ──────────────────────────────────────
export async function updateReport(req, res) {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const { status, adminNotes, resolvedReason } = req.body;
    const adminId = req.user?.id || 'admin';

    const validStatuses = ['open', 'under_review', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid report status' });
    }

    const [[report]] = await conn.query(`SELECT * FROM doctor_reports WHERE id = ?`, [id]);
    if (!report) return res.status(404).json({ success: false, error: 'Report not found' });

    const isClosing = ['resolved', 'dismissed'].includes(status);
    if (isClosing && !resolvedReason?.trim()) {
      return res.status(400).json({ success: false, error: 'A reason is required when resolving or dismissing a report.' });
    }

    await conn.beginTransaction();
    await conn.query(
      `UPDATE doctor_reports SET
         status = ?,
         admin_notes = COALESCE(?, admin_notes),
         resolved_reason = ?,
         resolved_by = ?,
         resolved_at = ?
       WHERE id = ?`,
      [
        status,
        adminNotes || null,
        isClosing ? resolvedReason : null,
        isClosing ? adminId : null,
        isClosing ? new Date() : null,
        id
      ]
    );

    await writeAudit(conn, {
      adminId, action: `report_${status}`, targetType: 'report', targetId: id,
      prevStatus: report.status, newStatus: status,
      reason: resolvedReason, metadata: { doctorId: report.doctor_id, patientId: report.patient_id }
    });
    await conn.commit();

    return res.json({ success: true, message: `Report status updated to '${status}'` });
  } catch (err) {
    await conn.rollback();
    console.error('[Admin updateReport]', err);
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
}

// ── GET /api/v1/admin/audit-log ───────────────────────────────────────────
export async function getAuditLog(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT 200`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[Admin getAuditLog]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
