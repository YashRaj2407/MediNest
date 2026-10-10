import pool from '../config/db.js';
import { clerkClient, ADMIN_SECRET_TOKEN } from '../middleware/auth.js';


/**
 * POST /api/v1/auth/sync-profile
 * Syncs a Clerk user profile into the MySQL `profiles` table.
 * Automatically detects if email belongs to a Doctor and assigns role = 'doctor'.
 */
export async function syncUserProfile(req, res) {
  try {
    let { userId, email, fullName, role, phone, avatarUrl, sessionId } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // ── 1. Resolve Verified Clerk User ID (Never use a session ID as user identity) ──
    if (userId && userId.startsWith('sess_')) {
      sessionId = userId;
      userId = null;
    }

    // If session ID is provided, resolve real Clerk User ID via Clerk SDK
    if (!userId && sessionId) {
      try {
        if (clerkClient) {
          const session = await clerkClient.sessions.getSession(sessionId);
          if (session?.userId) {
            userId = session.userId;
            console.log(`[Auth Sync] Resolved session ${sessionId} to verified Clerk User ID: ${userId}`);
          }
        }
      } catch (sessErr) {
        console.warn(`[Auth Sync] Session resolution warning for ${sessionId}:`, sessErr.message);
      }
    }

    // If still missing or not a user_ ID, resolve active Clerk User ID by email
    if (!userId || userId.startsWith('sess_')) {
      try {
        if (clerkClient) {
          const clerkUsers = await clerkClient.users.getUserList({ emailAddress: [cleanEmail] });
          if (clerkUsers?.data?.length > 0) {
            userId = clerkUsers.data[0].id;
            console.log(`[Auth Sync] Resolved email ${cleanEmail} to active Clerk User ID: ${userId}`);
          }
        }
      } catch (userErr) {
        console.warn(`[Auth Sync] User lookup warning for ${cleanEmail}:`, userErr.message);
      }
    }

    // Reject any unverified or session-level identifier
    if (!userId || userId.startsWith('sess_')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid userId: session IDs (sess_*) cannot be used as permanent user identities. A verified Clerk User ID (user_*) is required.'
      });
    }

    // ── 2. Determine Authoritative Role ─────────────────────────────────────────────
    let assignedRole = role && ['patient', 'doctor', 'admin'].includes(role) ? role : 'patient';

    // Check if a profile already exists for this exact user ID
    const [existingRows] = await pool.query('SELECT * FROM profiles WHERE id = ?', [userId]);

    // Check if this user ID is already linked to a doctor profile
    const [[existingDocByUserId]] = await pool.query(
      'SELECT id, name FROM doctor_profiles WHERE user_id = ?',
      [userId]
    );

    if (existingDocByUserId) {
      assignedRole = 'doctor';
    } else if (existingRows.length > 0 && existingRows[0].role) {
      assignedRole = existingRows[0].role;
    }

    // ── 3. Guarantee `profiles` row exists BEFORE any doctor relationship ───────────
    if (existingRows.length > 0) {
      // Existing profile for this user ID: update details safely
      await pool.query(
        `UPDATE profiles SET
           email = ?,
           full_name = COALESCE(?, full_name),
           role = ?,
           phone = COALESCE(?, phone),
           avatar_url = COALESCE(?, avatar_url),
           account_status = 'active'
         WHERE id = ?`,
        [cleanEmail, fullName || null, assignedRole, phone || null, avatarUrl || null, userId]
      );
    } else {
      // Brand new profile for this user ID.
      // Check if an OLDER profile with a DIFFERENT ID holds this email address:
      const [conflictingProfiles] = await pool.query(
        `SELECT id, full_name, account_status FROM profiles WHERE LOWER(email) = ? AND id != ?`,
        [cleanEmail, userId]
      );

      // If an older profile exists with this email, isolate it by archiving its email address.
      // This preserves all of the older patient's historical appointments and medical records,
      // while allowing the new patient identity to have its own clean profile.
      for (const oldP of conflictingProfiles) {
        if (oldP.id.startsWith('sess_')) {
          await pool.query('DELETE FROM profiles WHERE id = ?', [oldP.id]);
          continue;
        }

        // IMPORTANT: Never archive a profile that belongs to a doctor.
        // Doctors have a stable verified identity linked via doctor_profiles.
        // Archiving their email would break the public doctor list JOIN and remove them from bookable doctors.
        const [[linkedDoc]] = await pool.query(
          'SELECT id FROM doctor_profiles WHERE user_id = ?',
          [oldP.id]
        );
        if (linkedDoc) {
          console.warn(
            `[Identity Isolation] Skipping archive of profile ${oldP.id} — it is a doctor identity (linked to doctor_profiles ${linkedDoc.id}). Doctor identities are protected from displacement.`
          );
          continue;
        }

        const safeSuffix = oldP.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8) || 'prev';
        const archiveEmail = `archived_${safeSuffix}_${Date.now()}@medinest.archived`;
        await pool.query(
          `UPDATE profiles SET
             email = ?,
             account_status = CASE WHEN account_status = 'active' THEN 'deactivated' ELSE account_status END
           WHERE id = ?`,
          [archiveEmail, oldP.id]
        );
        console.log(`[Identity Isolation] Archived email for previous patient identity ${oldP.id} (${oldP.full_name}) to preserve data isolation.`);
      }

      // Insert fresh profile for this new user identity
      await pool.query(
        `INSERT INTO profiles (id, email, full_name, role, phone, avatar_url, account_status)
         VALUES (?, ?, ?, ?, ?, ?, 'active')`,
        [userId, cleanEmail, fullName || cleanEmail, assignedRole, phone || null, avatarUrl || null]
      );
    }

    // ── 4. Doctor Profile Association (Executed strictly AFTER profiles row exists) ─
    // Critical: Preserve existing doctor-to-user mappings. Never overwrite an existing doctor's user_id!
    try {
      if (!existingDocByUserId) {
        // Check if an existing doctor profile is associated with this email
        const [[docByEmail]] = await pool.query(
          `SELECT dp.id, dp.user_id, dp.name
           FROM doctor_profiles dp
           JOIN profiles p ON dp.user_id = p.id
           WHERE LOWER(p.email) = ?`,
          [cleanEmail]
        );

        if (docByEmail) {
          if (docByEmail.user_id === userId) {
            assignedRole = 'doctor';
          } else {
            // Already mapped to another user ID: PRESERVE EXISTING MAPPING! DO NOT OVERWRITE!
            console.warn(
              `[Doctor Profile Sync] Doctor ${docByEmail.id} (${docByEmail.name}) is already linked to user ${docByEmail.user_id}. Preserving mapping; refusing overwrite with user ${userId}.`
            );
          }
        }
      }
    } catch (docSyncErr) {
      console.error('[Doctor Profile Sync Error]: Failed to verify doctor profile mapping:', docSyncErr.message);
    }

    // Check final account status
    const [[profileRow]] = await pool.query(`SELECT account_status, role FROM profiles WHERE id = ?`, [userId]);
    const accountStatus = profileRow?.account_status || 'active';
    const finalRole = profileRow?.role || assignedRole;

    return res.json({
      success: true,
      message: 'User profile synced successfully',
      data: { userId, email: cleanEmail, role: finalRole, accountStatus }
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
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User profile not found' });
    }

    const userProfile = rows[0];

    // If user is a doctor, attach doctor profile strictly by user_id
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

/**
 * POST /api/v1/auth/admin-login
 * Authenticate administrator and issue valid session token.
 */
export async function adminLogin(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Verify against profiles table where role = 'admin'
    const [[adminProfile]] = await pool.query(
      `SELECT * FROM profiles WHERE LOWER(email) = ? AND role = 'admin'`,
      [cleanEmail]
    );

    if (!adminProfile) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: not an authorized administrator account.'
      });
    }

    if (adminProfile.account_status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Administrator account has been deactivated.'
      });
    }

    return res.json({
      success: true,
      token: ADMIN_SECRET_TOKEN,
      admin: {
        id: adminProfile.id,
        name: adminProfile.full_name,
        email: adminProfile.email,
        role: 'admin',
        isLoggedIn: true
      }
    });
  } catch (err) {
    console.error('[adminLogin Error]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/v1/auth/check-email-status
 * Inspects whether an email exists in Clerk, MySQL, or both.
 */
export async function checkEmailStatus(req, res) {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const [[p]] = await pool.query(
      `SELECT id, role, account_status, full_name, email FROM profiles WHERE LOWER(email) = ?`,
      [cleanEmail]
    );

    let inClerk = false;
    let clerkUserCount = 0;
    try {
      const resp = await clerkClient.users.getUserList({ emailAddress: [cleanEmail] });
      const list = resp.data || resp;
      clerkUserCount = list.length;
      inClerk = clerkUserCount > 0;
    } catch (e) {
      console.warn('[checkEmailStatus] Clerk lookup warning:', e.message);
    }

    return res.json({
      success: true,
      data: {
        email: cleanEmail,
        inDatabase: !!p,
        accountStatus: p ? p.account_status : null,
        role: p ? p.role : null,
        inClerk,
        clerkUserCount,
        canRegister: !inClerk && (!p || p.account_status === 'deleted')
      }
    });
  } catch (err) {
    console.error('[checkEmailStatus Error]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/v1/auth/reconcile-deleted-account
 * If an account was deleted by admin or removed, but is still lingering in Clerk,
 * this releases the Clerk record so the user can register again.
 */
export async function reconcileDeletedAccount(req, res) {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if an ACTIVE profile exists in MySQL
    const [profiles] = await pool.query(
      `SELECT id, role, account_status FROM profiles WHERE LOWER(email) = ?`,
      [cleanEmail]
    );

    const activeProfile = profiles.find(p => p.account_status === 'active');
    if (activeProfile) {
      return res.status(409).json({
        success: false,
        error: 'An active account already exists for this email address. Please sign in instead.'
      });
    }

    // Clean up from Clerk
    let deletedCount = 0;
    try {
      const resp = await clerkClient.users.getUserList({ emailAddress: [cleanEmail] });
      const users = resp.data || resp;
      for (const u of users) {
        await clerkClient.users.deleteUser(u.id);
        deletedCount++;
      }
    } catch (e) {
      console.warn('[reconcileDeletedAccount] Clerk error:', e.message);
    }

    // Anonymize any deleted profiles in DB holding this email
    for (const p of profiles) {
      const anon = `deleted_${p.id}_${Date.now()}@medinest.deleted`;
      await pool.query(`UPDATE profiles SET email = ? WHERE id = ?`, [anon, p.id]);
    }

    return res.json({
      success: true,
      message: 'Account authentication has been reconciled. You can now register with this email.',
      deletedFromClerkCount: deletedCount
    });
  } catch (err) {
    console.error('[reconcileDeletedAccount Error]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

