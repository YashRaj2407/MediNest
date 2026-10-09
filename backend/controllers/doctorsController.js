import pool from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

/** Helper: maps a DB row (doctor_profiles JOIN profiles) → frontend Doctor/DoctorAuthData shape */
function mapDoctorRow(row) {
  return {
    id: row.id,
    doctorId: `DOC-${row.registration_number || row.id}`,
    name: row.name || row.full_name || '',
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
    nextAvailableSlot: 'Today',
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
      WHERE dp.verification_status = 'verified'
        AND dp.accepting_appointments = TRUE
    `;
    const params = [];

    if (specialty && specialty !== 'all') {
      sql += ` AND dp.specialty_id = ?`;
      params.push(specialty);
    }
    if (city && city !== 'All Cities') {
      sql += ` AND dp.city = ?`;
      params.push(city);
    }
    if (search && search.trim()) {
      let termStr = search.trim();
      if (termStr.toLowerCase() === 'anaya') termStr = 'Ananya';
      sql += ` AND (dp.name LIKE ? OR dp.specialty LIKE ? OR dp.clinic_name LIKE ? OR dp.city LIKE ?)`;
      const term = `%${termStr}%`;
      params.push(term, term, term, term);
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

    await pool.query(
      `UPDATE doctor_profiles 
       SET clinic_name = COALESCE(?, clinic_name),
           clinic_address = COALESCE(?, clinic_address),
           fee_inr = COALESCE(?, fee_inr),
           qualifications = COALESCE(?, qualifications),
           about = COALESCE(?, about),
           accepting_appointments = COALESCE(?, accepting_appointments)
       WHERE id = ?`,
      [clinicName, address, feeINR, qualifications, about, acceptingAppointments, id]
    );

    return res.json({ success: true, message: 'Doctor profile updated successfully' });
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
 * Register a new doctor.
 */
export async function registerDoctor(req, res) {
  let connection;
  try {
    const userId = req.user?.id;
    const { email, fullName, phone, name, registrationNumber, specialty, qualifications, experienceYears, clinicName, city, about, feeINR, photo, idProofUrl } = req.body;

    // Build specific error array
    const missing = [];
    if (!userId) missing.push('userId (from auth token)');
    if (!email) missing.push('email');
    if (!name) missing.push('name');
    if (!registrationNumber) missing.push('registrationNumber');
    if (!specialty) missing.push('specialty');
    if (!qualifications) missing.push('qualifications');
    if (!city) missing.push('city');

    if (missing.length > 0) {
      return res.status(400).json({ success: false, error: `Missing required fields: ${missing.join(', ')}` });
    }

    // Use a transaction for safe profile creation
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Ensure user profile exists
    await connection.query(
      `INSERT INTO profiles (id, role, full_name, email, phone) 
       VALUES (?, 'doctor', ?, ?, ?) 
       ON DUPLICATE KEY UPDATE role = 'doctor', phone = COALESCE(?, phone)`,
      [userId, fullName || name, email, phone || null, phone || null]
    );

    // 2. Check if doctor profile already exists for this user
    const [existing] = await connection.query(`SELECT id FROM doctor_profiles WHERE user_id = ?`, [userId]);
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Doctor profile already exists for this user' });
    }

    // 3. Insert doctor profile
    const docId = `doc-${uuidv4().substring(0, 8)}`;
    const specialtyId = specialty.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const languages = JSON.stringify(['English']);
    const consultationTypes = JSON.stringify(['video', 'clinic']);

    await connection.query(
      `INSERT INTO doctor_profiles (
        id, user_id, registration_number, name, specialty, specialty_id, 
        qualifications, experience_years, clinic_name, clinic_address, city,
        fee_inr, rating, review_count, photo, about, is_featured, consultation_types, languages
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, NULL, 0, ?, ?, FALSE, ?, ?)`,
      [
        docId, userId, registrationNumber, name, specialty, specialtyId,
        qualifications, experienceYears || 0, clinicName || '', city || '',
        feeINR || null, photo || null, about || '',
        consultationTypes, languages
      ]
    );

    await connection.commit();
    return res.json({ success: true, message: 'Doctor registered successfully' });
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

    // Get total earnings
    const [paymentRows] = await pool.query(
      `SELECT SUM(p.amount_inr) as total
       FROM payments p
       JOIN appointments a ON p.appointment_id = a.id
       WHERE a.doctor_id = ? AND p.status = 'paid'`,
      [id]
    );
    const totalEarnings = paymentRows[0].total || 0;

    return res.json({
      success: true,
      data: {
        completedConsultations,
        totalEarnings
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
