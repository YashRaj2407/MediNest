const fs = require('fs');
let content = fs.readFileSync('backend/controllers/doctorsController.js', 'utf8');

const oldRegister = `export async function registerDoctor(req, res) {
  try {
    const { userId, email, fullName, phone, name, registrationNumber, specialty, qualifications, experienceYears, clinicName, address, city } = req.body;

    if (!userId || !email || !name || !registrationNumber || !specialty) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // 1. Ensure user profile exists
    await pool.query(
      \`INSERT INTO profiles (id, role, full_name, email, phone) 
       VALUES (?, 'doctor', ?, ?, ?) 
       ON DUPLICATE KEY UPDATE role = 'doctor', phone = COALESCE(?, phone)\`,
      [userId, fullName || name, email, phone || null, phone || null]
    );

    // 2. Check if doctor profile already exists for this user
    const [existing] = await pool.query(\`SELECT id FROM doctor_profiles WHERE user_id = ?\`, [userId]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'Doctor profile already exists for this user' });
    }

    // 3. Insert doctor profile
    const docId = \`doc-\${uuidv4().substring(0, 8)}\`;
    
    // Provide defaults for specialty_id based on specialty string for simplicity (if needed)
    const specialtyId = specialty.toLowerCase().replace(/\\s+/g, '-');
    const languages = JSON.stringify(['English']);
    const consultationTypes = JSON.stringify(['video', 'clinic']);

    await pool.query(
      \`INSERT INTO doctor_profiles (
        id, user_id, registration_number, name, specialty, specialty_id, 
        qualifications, experience_years, clinic_name, clinic_address, city,
        fee_inr, rating, review_count, photo, is_featured, consultation_types, languages
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 0, NULL, FALSE, ?, ?)\`,
      [
        docId, userId, registrationNumber, name, specialty, specialtyId,
        qualifications, experienceYears, clinicName, address, city,
        consultationTypes, languages
      ]
    );

    return res.json({ success: true, message: 'Doctor registered successfully' });
  } catch (error) {
    console.error('[Express Doctor Registration Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}`;

const newRegister = `export async function registerDoctor(req, res) {
  const connection = await pool.getConnection();
  try {
    const { email, fullName, phone, name, registrationNumber, specialty, qualifications, experienceYears, clinicName, address, city } = req.body;
    
    const userId = req.user?.id; // from requireAuth middleware
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized. No valid Clerk session.' });
    }

    if (!email || !name || !registrationNumber || !specialty) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    await connection.beginTransaction();

    // 1. Ensure user profile exists with correct ID
    await connection.query(
      \`INSERT INTO profiles (id, role, full_name, email, phone) 
       VALUES (?, 'doctor', ?, ?, ?) 
       ON DUPLICATE KEY UPDATE role = 'doctor', phone = COALESCE(?, phone)\`,
      [userId, fullName || name, email, phone || null, phone || null]
    );

    // 2. Check if doctor profile already exists for this user
    const [existing] = await connection.query(\`SELECT id FROM doctor_profiles WHERE user_id = ?\`, [userId]);
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Doctor profile already exists for this user' });
    }

    // 3. Insert doctor profile
    const docId = \`doc-\${uuidv4().substring(0, 8)}\`;
    const specialtyId = specialty.toLowerCase().replace(/\\s+/g, '-');
    const languages = JSON.stringify(['English']);
    const consultationTypes = JSON.stringify(['video', 'clinic']);

    await connection.query(
      \`INSERT INTO doctor_profiles (
        id, user_id, registration_number, name, specialty, specialty_id, 
        qualifications, experience_years, clinic_name, clinic_address, city,
        fee_inr, rating, review_count, photo, is_featured, consultation_types, languages
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 0, NULL, FALSE, ?, ?)\`,
      [
        docId, userId, registrationNumber, name, specialty, specialtyId,
        qualifications, experienceYears, clinicName, address, city,
        consultationTypes, languages
      ]
    );

    await connection.commit();
    return res.json({ success: true, message: 'Doctor registered successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('[Express Doctor Registration Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  } finally {
    connection.release();
  }
}`;

content = content.replace(oldRegister, newRegister);
fs.writeFileSync('backend/controllers/doctorsController.js', content);
console.log('Fixed doctorsController.js');
