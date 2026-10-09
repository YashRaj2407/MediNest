import pool from '../config/db.js';

/**
 * POST /api/v1/auth/sync-profile
 * Syncs a Clerk user profile into the MySQL `profiles` table.
 * Automatically detects if email belongs to a Doctor and assigns role = 'doctor'.
 */
export async function syncUserProfile(req, res) {
  try {
    const { userId, email, fullName, role, phone, avatarUrl } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ success: false, error: 'userId and email are required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if this email or user_id belongs to a doctor profile
    const [docMatch] = await pool.query(
      `SELECT dp.id, dp.user_id FROM doctor_profiles dp
       LEFT JOIN profiles p ON dp.user_id = p.id
       WHERE LOWER(p.email) = ? OR LOWER(dp.name) LIKE ? OR dp.user_id = ?`,
      [cleanEmail, `%${cleanEmail.split('@')[0]}%`, userId]
    );

    let assignedRole = role && ['patient', 'doctor', 'admin'].includes(role) ? role : 'patient';

    if (docMatch.length > 0) {
      assignedRole = 'doctor';
      // Link doctor_profiles record to this userId
      await pool.query(`UPDATE doctor_profiles SET user_id = ? WHERE id = ?`, [userId, docMatch[0].id]);
    } else {
      // Check existing role in profiles
      const [existing] = await pool.query('SELECT role FROM profiles WHERE id = ?', [userId]);
      if (existing.length > 0 && existing[0].role) {
        assignedRole = existing[0].role;
      }
    }

    await pool.query(
      `INSERT INTO profiles (id, email, full_name, role, phone, avatar_url)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         email = VALUES(email),
         full_name = VALUES(full_name),
         role = ?,
         phone = COALESCE(VALUES(phone), phone),
         avatar_url = COALESCE(VALUES(avatar_url), avatar_url)`,
      [userId, cleanEmail, fullName || email, assignedRole, phone || null, avatarUrl || null, assignedRole]
    );

    return res.json({
      success: true,
      message: 'User profile synced successfully',
      data: { userId, email: cleanEmail, role: assignedRole }
    });
  } catch (error) {
    console.error('[Express Sync Auth Profile Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/v1/auth/profile/:userId
 * Fetch profile details for a Clerk user ID, including doctor info if user is a doctor.
 */
export async function getUserProfile(req, res) {
  try {
    const { userId } = req.params;

    let [rows] = await pool.query(`SELECT * FROM profiles WHERE id = ?`, [userId]);
    
    if (rows.length > 0) {
      const userEmail = (rows[0].email || '').trim().toLowerCase();
      // Check if userEmail belongs to a doctor_profiles record
      const [docCheck] = await pool.query(
        `SELECT dp.id FROM doctor_profiles dp
         LEFT JOIN profiles p ON dp.user_id = p.id
         WHERE LOWER(p.email) = ? OR dp.user_id = ?`,
        [userEmail, userId]
      );
      if (docCheck.length > 0 && rows[0].role !== 'doctor') {
        await pool.query(`UPDATE profiles SET role = 'doctor' WHERE id = ?`, [userId]);
        await pool.query(`UPDATE doctor_profiles SET user_id = ? WHERE id = ?`, [userId, docCheck[0].id]);
        rows[0].role = 'doctor';
      }
    }

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User profile not found' });
    }

    const userProfile = rows[0];

    // If doctor, also attach doctor profile
    if (userProfile.role === 'doctor') {
      const [docRows] = await pool.query(`SELECT * FROM doctor_profiles WHERE user_id = ? OR LOWER(name) LIKE ?`, [userId, `%${(userProfile.email || '').split('@')[0]}%`]);
      if (docRows.length > 0) {
        userProfile.doctorProfile = docRows[0];
      }
    }

    return res.json({ success: true, data: userProfile });
  } catch (error) {
    console.error('[Express Get Auth Profile Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
