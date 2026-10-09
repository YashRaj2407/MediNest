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
      sql += ` AND (dp.name LIKE ? OR dp.specialty LIKE ? OR dp.clinic_name LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
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
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email is required.' });
    }

    const [rows] = await pool.query(
      `SELECT dp.*, p.email, p.phone, p.full_name, p.avatar_url
       FROM profiles p
       JOIN doctor_profiles dp ON dp.user_id = p.id
       WHERE p.email = ? AND p.role = 'doctor'
       LIMIT 1`,
      [email.trim().toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No verified doctor profile found for email: ${email}. Please register or check your email address.`
      });
    }

    const doctor = mapDoctorRow(rows[0]);
    console.log(`[Doctor Login] Doctor found: ${doctor.name} (${doctor.id})`);
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
  try {
    const { userId, email, fullName, phone, name, registrationNumber, specialty, qualifications, experienceYears, clinicName, address, city } = req.body;

    if (!userId || !email || !name || !registrationNumber || !specialty) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // 1. Ensure user profile exists
    await pool.query(
      `INSERT INTO profiles (id, role, full_name, email, phone) 
       VALUES (?, 'doctor', ?, ?, ?) 
       ON DUPLICATE KEY UPDATE role = 'doctor', phone = COALESCE(?, phone)`,
      [userId, fullName || name, email, phone || null, phone || null]
    );

    // 2. Check if doctor profile already exists for this user
    const [existing] = await pool.query(`SELECT id FROM doctor_profiles WHERE user_id = ?`, [userId]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'Doctor profile already exists for this user' });
    }

    // 3. Insert doctor profile
    const docId = `doc-${uuidv4().substring(0, 8)}`;
    
    // Provide defaults for specialty_id based on specialty string for simplicity (if needed)
    const specialtyId = specialty.toLowerCase().replace(/\s+/g, '-');
    const languages = JSON.stringify(['English']);
    const consultationTypes = JSON.stringify(['video', 'clinic']);

    await pool.query(
      `INSERT INTO doctor_profiles (
        id, user_id, registration_number, name, specialty, specialty_id, 
        qualifications, experience_years, clinic_name, clinic_address, city,
        fee_inr, rating, review_count, photo, is_featured, consultation_types, languages
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 0, NULL, FALSE, ?, ?)`,
      [
        docId, userId, registrationNumber, name, specialty, specialtyId,
        qualifications, experienceYears || 0, clinicName || '', address || '', city || '',
        consultationTypes, languages
      ]
    );

    return res.json({ success: true, message: 'Doctor registered successfully' });
  } catch (error) {
    console.error('[Express Doctor Registration Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
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
