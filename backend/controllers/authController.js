import pool from '../config/db.js';

/**
 * POST /api/v1/auth/sync-profile
 * Syncs a Clerk user profile into the MySQL `profiles` table.
 * Preserves existing role ('doctor', 'admin') if set in database.
 */
export async function syncUserProfile(req, res) {
  try {
    const { userId, email, fullName, role, phone, avatarUrl } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ success: false, error: 'userId and email are required' });
    }

    // Check if user already exists in profiles
    const [existing] = await pool.query('SELECT role FROM profiles WHERE id = ?', [userId]);
    
    let assignedRole = role && ['patient', 'doctor', 'admin'].includes(role) ? role : 'patient';
    if (existing.length > 0 && existing[0].role) {
      // Preserve existing database role
      assignedRole = existing[0].role;
    }

    await pool.query(
      `INSERT INTO profiles (id, email, full_name, role, phone, avatar_url)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         email = VALUES(email),
         full_name = VALUES(full_name),
         role = COALESCE(profiles.role, VALUES(role)),
         phone = COALESCE(VALUES(phone), phone),
         avatar_url = COALESCE(VALUES(avatar_url), avatar_url)`,
      [userId, email, fullName || email, assignedRole, phone || null, avatarUrl || null]
    );

    return res.json({
      success: true,
      message: 'User profile synced successfully',
      data: { userId, email, role: assignedRole }
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

    const [rows] = await pool.query(`SELECT * FROM profiles WHERE id = ?`, [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User profile not found' });
    }

    const userProfile = rows[0];

    // If doctor, also attach doctor profile
    if (userProfile.role === 'doctor') {
      const [docRows] = await pool.query(`SELECT * FROM doctor_profiles WHERE user_id = ?`, [userId]);
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
