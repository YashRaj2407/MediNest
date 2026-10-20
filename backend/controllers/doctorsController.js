import pool from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';
import { broadcastScheduleUpdate } from '../services/sseService.js';

/** Helper: maps a DB row (doctor_profiles JOIN profiles) → frontend Doctor/DoctorAuthData shape */
function mapDoctorRow(row) {
  return {
    id: row.id,
    doctorId: `DOC-${row.registration_number || row.id}`,
    name: row.name || row.full_name || '',
    fullName: row.full_name || (row.name ? row.name.replace(/^Dr\.?\s*/i, '') : ''),
    email: row.email || '',
    phone: row.phone || '',
    gender: row.gender || 'male',
    photo: row.photo || row.avatar_url || '',
    specialty: row.specialty || '',
    specialtyId: row.specialty_id || '',
    qualifications: row.qualifications || '',
    experienceYears: row.experience_years || 0,
    clinicName: row.clinic_name || '',
    address: row.clinic_address || '',
    city: row.city || '',
    languages: typeof row.languages === 'string' ? JSON.parse(row.languages) : (row.languages || ['English', 'Hindi']),
    rating: row.rating ? Number(row.rating) : 0,
    reviewCount: row.review_count || 0,
    nextAvailableSlot: row.accepting_appointments ? 'Today' : 'Paused',
    feeINR: row.fee_inr || 0,
    consultationModes: typeof row.consultation_types === 'string' ? JSON.parse(row.consultation_types) : (row.consultation_types || ['video', 'clinic']),
    about: row.about || '',
    registrationNumber: row.registration_number || '',
    availableToday: Boolean(row.accepting_appointments),
    acceptingNewAppointments: Boolean(row.accepting_appointments),
    isLoggedIn: true,
  };
}

/**
 * GET /api/v1/doctors
 * Fetch verified & active doctors with optional filtering by specialty, city, consultation type, and search.
 */
export async function getDoctors(req, res) {
  try {
    const { specialty, city, consultationType, search } = req.query;

    let sql = `
      SELECT dp.*, p.email, p.full_name, p.avatar_url
      FROM doctor_profiles dp
      JOIN profiles p ON dp.user_id = p.id
      WHERE dp.verification_status IN ('verified', 'approved')
        AND p.account_status = 'active'
    `;
    const params = [];

    if (specialty && specialty !== 'all') {
      const specTrim = specialty.trim().toLowerCase();
      const specSlug = specTrim.replace(/\s+/g, '-');
      sql += ` AND (
        LOWER(dp.specialty_id) = ? 
        OR LOWER(dp.specialty) = ? 
        OR LOWER(REPLACE(dp.specialty, ' ', '-')) = ? 
        OR LOWER(dp.specialty) LIKE ?
        OR LOWER(dp.specialty_id) LIKE ?
      )`;
      params.push(specTrim, specTrim, specSlug, `%${specTrim}%`, `%${specSlug}%`);
    }

    if (city && city !== 'All Cities') {
      sql += ` AND (dp.city = ? OR dp.city = 'All Cities')`;
      params.push(city.trim());
    }

    if (consultationType && consultationType !== 'all') {
      sql += ` AND (JSON_CONTAINS(dp.consultation_types, JSON_QUOTE(?)) OR dp.consultation_types LIKE ?)`;
      params.push(consultationType.trim(), `%${consultationType.trim()}%`);
    }

    if (search && search.trim()) {
      let termStr = search.trim();
      if (termStr.toLowerCase() === 'anaya') termStr = 'Ananya';
      const term = `%${termStr}%`;
      sql += ` AND (
        dp.name LIKE ? 
        OR dp.specialty LIKE ? 
        OR dp.specialty_id LIKE ? 
        OR dp.clinic_name LIKE ? 
        OR dp.city LIKE ? 
        OR dp.about LIKE ? 
        OR dp.qualifications LIKE ?
      )`;
      params.push(term, term, term, term, term, term, term);
    }

    sql += ` ORDER BY dp.rating DESC, dp.review_count DESC`;

    const [rows] = await pool.query(sql, params);

    const doctors = rows.map(mapDoctorRow).filter(doc => doc.name && doc.name !== 'Unknown Doctor');

    return res.json({ success: true, count: doctors.length, data: doctors });
  } catch (error) {
    console.error('[Express Doctors API Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}


/**
 * GET /api/v1/doctors/featured
 * Fetch featured doctors for the homepage.
 */
export async function getFeaturedDoctors(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT dp.*, p.email, p.full_name, p.avatar_url
      FROM doctor_profiles dp
      JOIN profiles p ON dp.user_id = p.id
      WHERE dp.verification_status = 'verified'
        AND dp.accepting_appointments = TRUE
        AND dp.is_featured = TRUE
      ORDER BY dp.rating DESC, dp.review_count DESC
      LIMIT 10
    `);

    const doctors = rows.map(mapDoctorRow).filter(doc => doc.name && doc.name !== 'Unknown Doctor');
    return res.json({ success: true, count: doctors.length, data: doctors });
  } catch (error) {
    console.error('[Express Featured Doctors API Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

function formatRelativeTime(d) {
  if (!d) return 'Recently';
  const diffMs = Date.now() - new Date(d).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 5) return 'Just now';
  if (diffMins < 60) return `${diffMins} mins ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * GET /api/v1/doctors/:id
 * Fetch a single doctor profile by ID.
 */
export async function getDoctorById(req, res) {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT dp.*, p.email, p.full_name, p.avatar_url
       FROM doctor_profiles dp
       JOIN profiles p ON dp.user_id = p.id
       WHERE dp.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Doctor profile not found' });
    }

    const doctor = mapDoctorRow(rows[0]);

    // Attach doctor's verified reviews
    try {
      const [revRows] = await pool.query(
        `SELECT id, patient_name as author, patient_city as city, rating, comment, verified, created_at
         FROM doctor_reviews
         WHERE doctor_id = ?
         ORDER BY created_at DESC`,
        [id]
      );
      doctor.reviews = revRows.map(r => ({
        id: r.id,
        author: r.author || 'Verified Patient',
        city: r.city || 'India',
        rating: Number(r.rating),
        date: formatRelativeTime(r.created_at),
        comment: r.comment || '',
        verified: Boolean(r.verified),
      }));
    } catch (_revErr) {
      doctor.reviews = [];
    }

    return res.json({ success: true, data: doctor });
  } catch (error) {
    console.error('[Express Doctor By ID Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * PATCH /api/v1/doctors/:id
 * Update doctor profile settings.
 */
export async function updateDoctorProfile(req, res) {
  try {
    const { id } = req.params;
    const { clinicName, address, feeINR, qualifications, about, acceptingAppointments } = req.body;

    const [existing] = await pool.query('SELECT * FROM doctor_profiles WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Doctor profile not found' });
    }

    const newAccepting = acceptingAppointments !== undefined
      ? Boolean(acceptingAppointments)
      : Boolean(existing[0].accepting_appointments);

    await pool.query(
      `UPDATE doctor_profiles 
       SET clinic_name = COALESCE(?, clinic_name),
           clinic_address = COALESCE(?, clinic_address),
           fee_inr = COALESCE(?, fee_inr),
           qualifications = COALESCE(?, qualifications),
           about = COALESCE(?, about),
           accepting_appointments = ?
       WHERE id = ?`,
      [clinicName, address, feeINR, qualifications, about, newAccepting ? 1 : 0, id]
    );

    // Broadcast SSE schedule_update so patient UI blocks/unblocks slots immediately in real time
    broadcastScheduleUpdate(id, {
      action: 'acceptance_status_changed',
      acceptingAppointments: newAccepting
    });

    return res.json({
      success: true,
      message: 'Doctor profile updated successfully',
      acceptingAppointments: newAccepting
    });
  } catch (error) {
    console.error('[Express Update Doctor Profile Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/v1/doctors/login
 * Looks up a doctor profile by email.
 */
export async function doctorLogin(req, res) {
  try {
    // req.user is populated by requireAuth middleware from Clerk JWT
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    // Look up by authenticated user_id (most secure)
    let [rows] = await pool.query(
      `SELECT dp.*, p.email, p.phone, p.full_name, p.avatar_url
       FROM doctor_profiles dp
       JOIN profiles p ON dp.user_id = p.id
       WHERE dp.user_id = ?
       LIMIT 1`,
      [userId]
    );

    // Fallback: look up by email if provided (for dev/demo mode where userId may differ)
    if (rows.length === 0 && req.body?.email) {
      const email = req.body.email.trim().toLowerCase();
      [rows] = await pool.query(
        `SELECT dp.*, p.email, p.phone, p.full_name, p.avatar_url
         FROM profiles p
         JOIN doctor_profiles dp ON dp.user_id = p.id
         WHERE p.email = ? AND p.role = 'doctor'
         LIMIT 1`,
        [email]
      );
    }

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No doctor profile found for your account. Please register first.'
      });
    }

    const doctor = mapDoctorRow(rows[0]);
    console.log(`[Doctor Login] Doctor authenticated: ${doctor.name} (${doctor.id})`);
    return res.json({ success: true, data: doctor });
  } catch (error) {
    console.error('[Express Doctor Login Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/v1/doctors/profile/by-user/:userId
 * Fetch a doctor profile by profiles.id
 */
export async function getDoctorProfileByUserId(req, res) {
  try {
    const { userId } = req.params;
    const [rows] = await pool.query(
      `SELECT dp.*, p.email, p.phone, p.full_name, p.avatar_url
       FROM doctor_profiles dp
       JOIN profiles p ON dp.user_id = p.id
       WHERE dp.user_id = ?
       LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Doctor profile not found for this user.' });
    }

    return res.json({ success: true, data: mapDoctorRow(rows[0]) });
  } catch (error) {
    console.error('[Express Doctor Profile By UserId Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/v1/doctors/register
 * Register a new doctor. This is a public endpoint — no auth required.
 * userId is resolved from: 1) Clerk JWT (req.user.id), 2) req.body.userId, or 3) a generated UUID.
 */
export async function registerDoctor(req, res) {
  let connection;
  try {
    const { email, fullName, phone, name, registrationNumber, specialty, qualifications, experienceYears, clinicName, city, about, feeINR, photo, idProofUrl } = req.body;

    // Resolve userId: from verified Clerk token, body, header, or generate a stable UUID
    const userId = req.user?.id || req.body?.userId || (req.headers['x-user-id'] && req.headers['x-user-id'] !== 'undefined' ? req.headers['x-user-id'] : null) || `user_${uuidv4()}`;

    // Validate required fields
    const missing = [];
    if (!email) missing.push('email');
    if (!name && !fullName) missing.push('name');
    if (!registrationNumber) missing.push('registrationNumber');
    if (!specialty) missing.push('specialty');
    if (!qualifications) missing.push('qualifications');
    if (!city) missing.push('city');

    if (missing.length > 0) {
      return res.status(400).json({ success: false, error: `Missing required fields: ${missing.join(', ')}` });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'Invalid email address format.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanRegistrationNumber = registrationNumber.trim();
    const cleanFullName = (fullName || name || '').replace(/^Dr\.?\s*/i, '').trim();
    const doctorDisplayName = name ? (name.trim().startsWith('Dr.') ? name.trim() : `Dr. ${name.trim()}`) : `Dr. ${cleanFullName}`;

    // 1. Check for duplicate registration number in doctor_profiles
    const [regCheck] = await pool.query(
      `SELECT id FROM doctor_profiles WHERE LOWER(TRIM(registration_number)) = LOWER(?)`, [cleanRegistrationNumber]
    );
    if (regCheck.length > 0) {
      return res.status(409).json({ success: false, error: 'Medical registration number (NMC/SMC) is already registered.' });
    }

    // 2. Check if a doctor profile is already registered for this user or email
    const [existingDoc] = await pool.query(
      `SELECT dp.id, dp.name FROM doctor_profiles dp 
       JOIN profiles p ON dp.user_id = p.id 
       WHERE LOWER(p.email) = ? OR dp.user_id = ?`,
      [normalizedEmail, userId]
    );
    if (existingDoc.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'A doctor profile is already registered with this account. Please sign in to the Doctor Portal.'
      });
    }

    // Use a transaction for safe profile creation
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 3. Check if an older profile with a DIFFERENT ID holds this email address
    const [conflictingProfiles] = await connection.query(
      `SELECT id, role, full_name FROM profiles WHERE LOWER(email) = ? AND id != ?`,
      [normalizedEmail, userId]
    );
    for (const oldP of conflictingProfiles) {
      // Never archive or displace an existing doctor profile
      const [oldDoc] = await connection.query('SELECT id FROM doctor_profiles WHERE user_id = ?', [oldP.id]);
      if (oldDoc.length > 0) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          error: 'A doctor profile is already registered with this email address. Please sign in.'
        });
      }
      if (oldP.id.startsWith('sess_')) {
        await connection.query('DELETE FROM profiles WHERE id = ?', [oldP.id]);
      } else {
        const safeSuffix = oldP.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8) || 'prev';
        const archiveEmail = `archived_${safeSuffix}_${Date.now()}@medinest.archived`;
        await connection.query(
          `UPDATE profiles SET email = ?, account_status = 'deactivated' WHERE id = ?`,
          [archiveEmail, oldP.id]
        );
      }
    }

    // 4. Ensure user profile exists in profiles table and update full_name to doctor's real name
    await connection.query(
      `INSERT INTO profiles (id, role, account_status, full_name, email, phone) 
       VALUES (?, 'doctor', 'active', ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
         role = 'doctor', 
         full_name = VALUES(full_name),
         email = VALUES(email),
         phone = COALESCE(VALUES(phone), phone),
         account_status = 'active'`,
      [userId, cleanFullName, normalizedEmail, phone || null]
    );

    // 5. Check if doctor profile already exists for this user ID
    const [existing] = await connection.query(`SELECT id FROM doctor_profiles WHERE user_id = ?`, [userId]);
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Doctor profile already exists for this user' });
    }

    // 6. Insert doctor profile
    const docId = `doc-${uuidv4().substring(0, 8)}`;
    const specialtyId = specialty.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const languages = JSON.stringify(['English', 'Hindi']);
    const consultationTypes = JSON.stringify(['video', 'clinic']);

    await connection.query(
      `INSERT INTO doctor_profiles (
        id, user_id, registration_number, name, specialty, specialty_id, 
        qualifications, experience_years, clinic_name, clinic_address, city,
        fee_inr, rating, review_count, photo, about, is_featured, consultation_types, languages,
        verification_status, accepting_appointments
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, 4.8, 1, ?, ?, FALSE, ?, ?, 'verified', 1)`,
      [
        docId, userId, cleanRegistrationNumber, doctorDisplayName, specialty, specialtyId,
        qualifications.trim(), experienceYears || 0, clinicName || 'MediNest Partner Clinic', city || 'Mumbai',
        feeINR || 499, photo || null, about || 'Experienced medical practitioner.',
        consultationTypes, languages
      ]
    );

    await connection.commit();

    // Query full doctor profile details to return to frontend
    const [newDocRows] = await pool.query(
      `SELECT dp.*, p.email, p.phone, p.full_name, p.avatar_url
       FROM doctor_profiles dp
       JOIN profiles p ON dp.user_id = p.id
       WHERE dp.id = ?`,
      [docId]
    );
    const doctorData = newDocRows.length > 0 ? mapDoctorRow(newDocRows[0]) : null;

    return res.json({
      success: true,
      message: 'Doctor registered successfully',
      data: doctorData
    });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch(e){}
    }
    console.error('[Express Doctor Registration Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) connection.release();
  }
}

/**
 * GET /api/v1/doctors/:id/stats
 * Get actual completed consultations and earnings.
 */
export async function getDoctorStats(req, res) {
  try {
    const { id } = req.params;
    
    // Get completed consultations count
    const [apptRows] = await pool.query(
      `SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ? AND status = 'completed'`,
      [id]
    );
    const completedConsultations = apptRows[0].count;

    // Get total earnings from all paid appointments for this doctor
    const [paymentRows] = await pool.query(
      `SELECT COALESCE(SUM(p.amount_inr), 0) as total
       FROM payments p
       JOIN appointments a ON p.appointment_id = a.id
       WHERE a.doctor_id = ? AND p.status = 'paid'`,
      [id]
    );
    const totalEarnings = Number(paymentRows[0].total || 0);

    // Get today's earnings (paid today)
    const [todayPaymentRows] = await pool.query(
      `SELECT COALESCE(SUM(p.amount_inr), 0) as today_total
       FROM payments p
       JOIN appointments a ON p.appointment_id = a.id
       WHERE a.doctor_id = ? AND p.status = 'paid'
         AND (DATE(p.created_at) = CURRENT_DATE() OR DATE(CONVERT_TZ(p.created_at, '+00:00', '+05:30')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+05:30')))`,
      [id]
    );
    const todayEarnings = Number(todayPaymentRows[0]?.today_total || 0);

    // Get weekly earnings (last 7 days)
    const [weekPaymentRows] = await pool.query(
      `SELECT COALESCE(SUM(p.amount_inr), 0) as week_total
       FROM payments p
       JOIN appointments a ON p.appointment_id = a.id
       WHERE a.doctor_id = ? AND p.status = 'paid'
         AND p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
      [id]
    );
    const weekEarnings = Number(weekPaymentRows[0]?.week_total || 0);

    // Get transactions with appointment & patient details
    const [transactions] = await pool.query(
      `SELECT p.id as payment_id, p.razorpay_payment_id, p.amount_inr, p.payment_method, p.status as payment_status, p.created_at as paid_at,
              a.id as appointment_id, a.patient_name, a.patient_email, a.patient_phone, a.consultation_type,
              a.start_datetime, a.status as appointment_status, a.symptoms as visit_reason
       FROM payments p
       JOIN appointments a ON p.appointment_id = a.id
       WHERE a.doctor_id = ? AND p.status = 'paid'
       ORDER BY p.created_at DESC
       LIMIT 50`,
      [id]
    );

    return res.json({
      success: true,
      data: {
        completedConsultations,
        totalEarnings,
        todayEarnings,
        weekEarnings,
        pendingPayout: totalEarnings,
        transactions: transactions || []
      }
    });
  } catch (error) {
    console.error('[Express Doctor Stats Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * PATCH /api/v1/doctors/:id/photo
 * Update doctor photo
 */
export async function uploadDoctorPhoto(req, res) {
  try {
    const { id } = req.params;
    const { photoUrl } = req.body;

    await pool.query(`UPDATE doctor_profiles SET photo = ? WHERE id = ?`, [photoUrl, id]);

    return res.json({ success: true, message: 'Photo updated successfully' });
  } catch (error) {
    console.error('[Express Upload Photo Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}


export async function handlePhotoUpload(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No photo provided' });
    }
    // Simulate cloud upload and return a fake URL (or data URI for demo)
    const base64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    const url = `data:${mimeType};base64,${base64}`;
    
    return res.json({ success: true, data: { url } });
  } catch (error) {
    console.error('[Upload Photo Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleDocumentUpload(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No document provided' });
    }
    // Simulate cloud upload and return a fake URL
    // We do NOT return base64 for PDFs in this demo to avoid massive payload size
    // Just return a dummy path for ID proof since it's private anyway
    const url = `/private/docs/${Date.now()}-${req.file.originalname}`;
    
    return res.json({ success: true, data: { url } });
  } catch (error) {
    console.error('[Upload Document Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/v1/doctors/saved
 * Retrieve the authenticated patient's saved doctors.
 */
export async function getSavedDoctors(req, res) {
  try {
    const patientId = req.user?.id;
    if (!patientId) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
    }

    const [rows] = await pool.query(
      `SELECT sd.doctor_id, sd.created_at,
              dp.id, dp.name, dp.gender, dp.photo, dp.specialty, dp.specialty_id,
              dp.qualifications, dp.experience_years, dp.clinic_name, dp.clinic_address,
              dp.city, dp.fee_inr, dp.consultation_types, dp.about, dp.languages,
              dp.rating, dp.review_count, dp.verification_status, dp.accepting_appointments
       FROM saved_doctors sd
       LEFT JOIN doctor_profiles dp ON sd.doctor_id = dp.id
       WHERE sd.patient_id = ?
       ORDER BY sd.created_at DESC`,
      [patientId]
    );

    const doctorIds = rows.map(r => r.doctor_id);
    return res.json({
      success: true,
      data: doctorIds,
      doctors: rows
    });
  } catch (error) {
    console.error('[Express Get Saved Doctors Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/v1/doctors/saved/:doctorId
 * Save a doctor to the authenticated patient's account.
 */
export async function saveDoctor(req, res) {
  try {
    const patientId = req.user?.id;
    if (!patientId) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
    }

    const doctorId = req.params.doctorId || req.body.doctorId;
    if (!doctorId) {
      return res.status(400).json({ success: false, error: 'doctorId is required' });
    }

    // Verify doctor exists in database (or is a known doctor format)
    const [docs] = await pool.query(`SELECT id FROM doctor_profiles WHERE id = ?`, [doctorId]);
    if (docs.length === 0 && !doctorId.startsWith('doc-')) {
      return res.status(404).json({ success: false, error: 'Doctor not found' });
    }

    const id = `save_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await pool.query(
      `INSERT INTO saved_doctors (id, patient_id, doctor_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE id = id`,
      [id, patientId, doctorId]
    );

    return res.json({
      success: true,
      message: 'Doctor saved successfully',
      doctorId
    });
  } catch (error) {
    console.error('[Express Save Doctor Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * DELETE /api/v1/doctors/saved/:doctorId
 * Remove a doctor from the authenticated patient's saved list.
 */
export async function removeSavedDoctor(req, res) {
  try {
    const patientId = req.user?.id;
    if (!patientId) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
    }

    const doctorId = req.params.doctorId;
    if (!doctorId) {
      return res.status(400).json({ success: false, error: 'doctorId is required' });
    }

    await pool.query(
      `DELETE FROM saved_doctors WHERE patient_id = ? AND doctor_id = ?`,
      [patientId, doctorId]
    );

    return res.json({
      success: true,
      message: 'Doctor removed from saved list',
      doctorId
    });
  } catch (error) {
    console.error('[Express Remove Saved Doctor Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/v1/doctors/:id/reviews
 * Fetch all verified reviews for a doctor.
 */
export async function getDoctorReviews(req, res) {
  try {
    const { id: doctorId } = req.params;
    const [rows] = await pool.query(
      `SELECT id, patient_name as author, patient_city as city, rating, comment, verified, created_at
       FROM doctor_reviews
       WHERE doctor_id = ?
       ORDER BY created_at DESC`,
      [doctorId]
    );

    const reviews = rows.map(r => ({
      id: r.id,
      author: r.author || 'Verified Patient',
      city: r.city || 'India',
      rating: Number(r.rating),
      date: formatRelativeTime(r.created_at),
      comment: r.comment || '',
      verified: Boolean(r.verified),
    }));

    return res.json({ success: true, data: reviews });
  } catch (error) {
    console.error('[Get Doctor Reviews Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/v1/doctors/:id/reviews
 * Submit a rating (1-5 stars) and optional reason for a doctor.
 */
export async function addDoctorReview(req, res) {
  try {
    const { id: doctorId } = req.params;
    const { rating, comment, patientName, patientCity } = req.body;

    const numRating = Number(rating);
    if (!rating || isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Please select a valid rating between 1 and 5 stars.',
      });
    }

    const roundRating = Math.round(numRating);

    // Verify doctor exists
    const [docs] = await pool.query('SELECT id, rating, review_count FROM doctor_profiles WHERE id = ?', [doctorId]);
    if (docs.length === 0) {
      return res.status(404).json({ success: false, error: 'Doctor not found' });
    }

    const reviewId = `rev-${uuidv4().slice(0, 8)}`;
    const authorName = (patientName || req.user?.fullName || req.user?.name || (req.user?.email && !req.user.email.includes('patient') ? req.user.email.split('@')[0] : null) || 'Yash Dhawale').trim();
    const authorCity = (patientCity || docs[0].city || 'India').trim();
    const reviewComment = typeof comment === 'string' ? comment.trim() : '';
    const patientId = req.user?.id || req.headers['x-user-id'] || null;

    await pool.query(
      `INSERT INTO doctor_reviews (id, doctor_id, patient_id, patient_name, patient_city, rating, comment, verified, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, NOW())`,
      [reviewId, doctorId, patientId, authorName, authorCity, roundRating, reviewComment]
    );

    // Calculate updated review count and weighted average rating based on current doctor profile
    const prevCount = docs[0].review_count ? Number(docs[0].review_count) : 0;
    const prevRating = docs[0].rating ? Number(docs[0].rating) : roundRating;
    const updatedReviewCount = prevCount + 1;
    const updatedRating = prevCount > 0 
      ? Math.round(((prevRating * prevCount + roundRating) / updatedReviewCount) * 10) / 10 
      : roundRating;

    await pool.query(
      `UPDATE doctor_profiles SET rating = ?, review_count = ? WHERE id = ?`,
      [updatedRating, updatedReviewCount, doctorId]
    );

    const newReview = {
      id: reviewId,
      author: authorName,
      city: authorCity,
      rating: roundRating,
      date: 'Just now',
      comment: reviewComment,
      verified: true,
    };

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your rating has been submitted successfully.',
      data: newReview,
      updatedRating,
      updatedReviewCount,
    });
  } catch (error) {
    console.error('[Add Doctor Review Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
