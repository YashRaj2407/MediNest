import pool from '../config/db.js';

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

    const doctors = rows.map(row => ({
      id: row.id,
      name: row.name || row.full_name,
      gender: row.gender,
      photo: row.photo || row.avatar_url,
      specialty: row.specialty,
      specialtyId: row.specialty_id,
      qualifications: row.qualifications,
      experienceYears: row.experience_years,
      clinicName: row.clinic_name,
      address: row.clinic_address,
      city: row.city,
      languages: typeof row.languages === 'string' ? JSON.parse(row.languages) : (row.languages || ['English', 'Hindi']),
      rating: Number(row.rating),
      reviewCount: row.review_count,
      nextAvailableSlot: 'Today',
      feeINR: row.fee_inr,
      consultationModes: typeof row.consultation_types === 'string' ? JSON.parse(row.consultation_types) : (row.consultation_types || ['video', 'clinic']),
      about: row.about || '',
      registrationNumber: row.registration_number,
      availableToday: Boolean(row.accepting_appointments),
    })).filter(doc => doc.name && doc.name !== 'Unknown Doctor' && doc.photo);

    return res.json({ success: true, count: doctors.length, data: doctors });
  } catch (error) {
    console.error('[Express Doctors API Error]:', error);
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

    const row = rows[0];
    const doctor = {
      id: row.id,
      name: row.name || row.full_name,
      gender: row.gender,
      photo: row.photo || row.avatar_url,
      specialty: row.specialty,
      specialtyId: row.specialty_id,
      qualifications: row.qualifications,
      experienceYears: row.experience_years,
      clinicName: row.clinic_name,
      address: row.clinic_address,
      city: row.city,
      languages: typeof row.languages === 'string' ? JSON.parse(row.languages) : (row.languages || ['English', 'Hindi']),
      rating: Number(row.rating),
      reviewCount: row.review_count,
      nextAvailableSlot: 'Today',
      feeINR: row.fee_inr,
      consultationModes: typeof row.consultation_types === 'string' ? JSON.parse(row.consultation_types) : (row.consultation_types || ['video', 'clinic']),
      about: row.about || '',
      registrationNumber: row.registration_number,
      availableToday: Boolean(row.accepting_appointments),
    };

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
