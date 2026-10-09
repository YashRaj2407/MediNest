const fs = require('fs');
let c = fs.readFileSync('backend/controllers/doctorsController.js', 'utf8');

const oldLogin = `export async function doctorLogin(req, res) {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email is required.' });
    }

    const [rows] = await pool.query(
      \`SELECT dp.*, p.email, p.phone, p.full_name, p.avatar_url
       FROM profiles p
       JOIN doctor_profiles dp ON dp.user_id = p.id
       WHERE p.email = ? AND p.role = 'doctor'
       LIMIT 1\`,
      [email.trim().toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: \`No verified doctor profile found for email: \${email}. Please register or check your email address.\`
      });
    }

    const doctor = mapDoctorRow(rows[0]);
    console.log(\`[Doctor Login] Doctor found: \${doctor.name} (\${doctor.id})\`);
    return res.json({ success: true, data: doctor });
  } catch (error) {
    console.error('[Express Doctor Login Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}`;

const newLogin = `export async function doctorLogin(req, res) {
  try {
    // req.user is populated by requireAuth middleware from Clerk JWT
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    // Look up by authenticated user_id (most secure)
    let [rows] = await pool.query(
      \`SELECT dp.*, p.email, p.phone, p.full_name, p.avatar_url
       FROM doctor_profiles dp
       JOIN profiles p ON dp.user_id = p.id
       WHERE dp.user_id = ?
       LIMIT 1\`,
      [userId]
    );

    // Fallback: look up by email if provided (for dev/demo mode where userId may differ)
    if (rows.length === 0 && req.body?.email) {
      const email = req.body.email.trim().toLowerCase();
      [rows] = await pool.query(
        \`SELECT dp.*, p.email, p.phone, p.full_name, p.avatar_url
         FROM profiles p
         JOIN doctor_profiles dp ON dp.user_id = p.id
         WHERE p.email = ? AND p.role = 'doctor'
         LIMIT 1\`,
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
    console.log(\`[Doctor Login] Doctor authenticated: \${doctor.name} (\${doctor.id})\`);
    return res.json({ success: true, data: doctor });
  } catch (error) {
    console.error('[Express Doctor Login Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}`;

c = c.replace(oldLogin, newLogin);
fs.writeFileSync('backend/controllers/doctorsController.js', c);
console.log('Fixed doctorLogin');
