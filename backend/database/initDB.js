import pool from '../config/db.js';
import crypto from 'crypto';

const INITIAL_DOCTORS = [
  {
    id: 'doc-1',
    user_id: 'user_doc_1',
    name: 'Dr. Ananya Sharma',
    email: 'dr.ananya.sharma@medinest.in',
    phone: '+91 9811122334',
    gender: 'female',
    photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=600',
    specialty: 'Dermatologist',
    specialty_id: 'dermatologist',
    qualifications: 'MBBS, MD (Dermatology, Venereology & Leprosy)',
    experience_years: 11,
    clinic_name: 'Aura Skin & Hair Clinic (Affiliated with Max Healthcare)',
    clinic_address: 'B-14, Ground Floor, Greater Kailash 1, New Delhi - 110048',
    city: 'Delhi NCR',
    languages: JSON.stringify(['English', 'Hindi', 'Punjabi']),
    rating: 4.9,
    review_count: 382,
    fee_inr: 799,
    consultation_types: JSON.stringify(['video', 'clinic']),
    about: 'Dr. Ananya Sharma is a board-certified dermatologist with over 11 years of experience specializing in clinical dermatology, stubborn acne treatments, eczema, chemical peels, and hair-loss therapies.',
    registration_number: 'DMC-2013-58421',
    accepting_appointments: true,
  },
  {
    id: 'doc-2',
    user_id: 'user_doc_2',
    name: 'Dr. Arjun Mehta',
    email: 'dr.arjun.mehta@medinest.in',
    phone: '+91 9822233445',
    gender: 'male',
    photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=600',
    specialty: 'Cardiologist',
    specialty_id: 'cardiologist',
    qualifications: 'MBBS, MD (Medicine), DM (Cardiology), FACC',
    experience_years: 16,
    clinic_name: 'Apollo Hospitals Cardiac Centre',
    clinic_address: '154/11, Bannerghatta Road, Opp. IIM-B, Bengaluru - 560076',
    city: 'Bengaluru',
    languages: JSON.stringify(['English', 'Hindi', 'Kannada', 'Gujarati']),
    rating: 4.9,
    review_count: 512,
    fee_inr: 1200,
    consultation_types: JSON.stringify(['video', 'clinic']),
    about: 'Dr. Arjun Mehta is a Senior Interventional Cardiologist with 16+ years of clinical excellence. Trained at AIIMS New Delhi and fellowship trained at Mount Sinai.',
    registration_number: 'KMC-2008-39210',
    accepting_appointments: true,
  },
  {
    id: 'doc-3',
    user_id: 'user_doc_3',
    name: 'Dr. Kavya Iyer',
    email: 'dr.kavya.iyer@medinest.in',
    phone: '+91 9833344556',
    gender: 'female',
    photo: 'https://images.unsplash.com/photo-1594824813576-a4c330df30b3?auto=format&fit=crop&q=80&w=600',
    specialty: 'Gynecologist',
    specialty_id: 'gynecologist',
    qualifications: 'MBBS, MS (Obstetrics & Gynaecology), DNB, MRCOG (UK)',
    experience_years: 13,
    clinic_name: 'Motherhood Women & Child Hospital',
    clinic_address: 'Plot 4, Sarjapur Main Road, Bellandur, Bengaluru - 560103',
    city: 'Bengaluru',
    languages: JSON.stringify(['English', 'Tamil', 'Kannada', 'Hindi']),
    rating: 4.8,
    review_count: 428,
    fee_inr: 899,
    consultation_types: JSON.stringify(['video', 'clinic']),
    about: 'Dr. Kavya Iyer is an obstetrician and gynaecologist specializing in high-risk pregnancies, PCOS/PCOD hormonal reversals, and reproductive health.',
    registration_number: 'TMC-2011-47109',
    accepting_appointments: true,
  },
  {
    id: 'doc-4',
    user_id: 'user_doc_4',
    name: 'Dr. Rohan Gupta',
    email: 'dr.rohan.gupta@medinest.in',
    phone: '+91 9844455667',
    gender: 'male',
    photo: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=600',
    specialty: 'General Physician',
    specialty_id: 'general-physician',
    qualifications: 'MBBS, MD (General Medicine)',
    experience_years: 9,
    clinic_name: 'MediNest Clinic',
    clinic_address: 'Indiranagar 100ft Road, Bengaluru - 560038',
    city: 'Bengaluru',
    languages: JSON.stringify(['English', 'Hindi', 'Kannada']),
    rating: 4.8,
    review_count: 310,
    fee_inr: 499,
    consultation_types: JSON.stringify(['video', 'clinic']),
    about: 'Dr. Rohan Gupta provides primary care, treatment for seasonal flu, viral fever, diabetic sugar management, and digestive complaints.',
    registration_number: 'MMC-2015-88241',
    accepting_appointments: true,
  },
  {
    id: 'doc-5',
    user_id: 'user_doc_5',
    name: 'Dr. Priya Nambiar',
    email: 'dr.priya.nambiar@medinest.in',
    phone: '+91 9855566778',
    gender: 'female',
    photo: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&q=80&w=600',
    specialty: 'Pediatrician',
    specialty_id: 'pediatrician',
    qualifications: 'MBBS, DCH, MD (Pediatrics), IAP Fellow',
    experience_years: 14,
    clinic_name: 'Rainbow Children’s Clinic & Vaccine Care',
    clinic_address: 'Road No. 2, Banjara Hills, Hyderabad - 500034',
    city: 'Hyderabad',
    languages: JSON.stringify(['English', 'Telugu', 'Hindi', 'Malayalam']),
    rating: 4.9,
    review_count: 460,
    fee_inr: 699,
    consultation_types: JSON.stringify(['video', 'clinic']),
    about: 'Dr. Priya Nambiar is a beloved child specialist known for newborn care, childhood respiratory allergies, and developmental milestones.',
    registration_number: 'APMC-2010-19482',
    accepting_appointments: true,
  },
  {
    id: 'doc-6',
    user_id: 'user_doc_6',
    name: 'Dr. Rajesh Singhal',
    email: 'dr.rajesh.singhal@medinest.in',
    phone: '+91 9866677889',
    gender: 'male',
    photo: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=600',
    specialty: 'Orthopedic',
    specialty_id: 'orthopedic',
    qualifications: 'MBBS, MS (Orthopaedics), MCh (Joint Replacement)',
    experience_years: 18,
    clinic_name: 'Medanta Bone & Joint Care',
    clinic_address: 'CH Bakhtawar Singh Road, Sector 38, Gurugram, Delhi NCR - 122001',
    city: 'Delhi NCR',
    languages: JSON.stringify(['English', 'Hindi']),
    rating: 4.9,
    review_count: 590,
    fee_inr: 1100,
    consultation_types: JSON.stringify(['video', 'clinic']),
    about: 'Dr. Rajesh Singhal is a renowned orthopedic surgeon specializing in knee arthritis, back pain, shoulder arthroscopy, and sports trauma.',
    registration_number: 'DMC-2006-28104',
    accepting_appointments: true,
  },
  {
    id: 'doc-7',
    user_id: 'user_doc_7',
    name: 'Dr. Neha Deshmukh',
    email: 'dr.neha.deshmukh@medinest.in',
    phone: '+91 9877788990',
    gender: 'female',
    photo: 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&q=80&w=600',
    specialty: 'Psychiatrist',
    specialty_id: 'psychiatrist',
    qualifications: 'MBBS, MD (Psychiatry), Fellowship in Clinical Neuropsychiatry',
    experience_years: 10,
    clinic_name: 'MindCare Neuro-Psychiatry Centre',
    clinic_address: 'FC Road, Shivaji Nagar, Pune - 411005',
    city: 'Pune',
    languages: JSON.stringify(['English', 'Marathi', 'Hindi']),
    rating: 4.9,
    review_count: 275,
    fee_inr: 1200,
    consultation_types: JSON.stringify(['video', 'clinic']),
    about: 'Dr. Neha Deshmukh is a compassionate psychiatrist dedicated to treating clinical anxiety, burnout, depression, and adult insomnia.',
    registration_number: 'MMC-2014-91024',
    accepting_appointments: true,
  },
  {
    id: 'doc-8',
    user_id: 'user_doc_8',
    name: 'Dr. Vikramaditya Rao',
    email: 'dr.vikramaditya.rao@medinest.in',
    phone: '+91 9888899001',
    gender: 'male',
    photo: 'https://images.unsplash.com/photo-1622902046580-2b47f47f5471?auto=format&fit=crop&q=80&w=600',
    specialty: 'ENT Specialist',
    specialty_id: 'ent',
    qualifications: 'MBBS, MS (ENT), DOHNS (Royal College of Surgeons, Edinburgh)',
    experience_years: 15,
    clinic_name: 'SIMS Hospital ENT & Sinus Centre',
    clinic_address: 'No 1, Jawaharlal Nehru Salai, Vadapalani, Chennai - 600026',
    city: 'Chennai',
    languages: JSON.stringify(['English', 'Tamil', 'Hindi']),
    rating: 4.8,
    review_count: 390,
    fee_inr: 699,
    consultation_types: JSON.stringify(['video', 'clinic']),
    about: 'Dr. Vikramaditya Rao is a senior ENT specialist and endoscopic sinus surgeon with expertise in chronic rhinosinusitis and tinnitus.',
    registration_number: 'TMC-2009-32819',
    accepting_appointments: true,
  },
];

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export async function initDatabase() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('[DB Auto-Init] Connected to MySQL. Verifying schema...');

    // 1. Create tables if not exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id            VARCHAR(255)  NOT NULL,
        role          ENUM('patient', 'doctor', 'admin') NOT NULL DEFAULT 'patient',
        account_status ENUM('active','deactivated','deleted') NOT NULL DEFAULT 'active',
        full_name     VARCHAR(255)  NOT NULL,
        email         VARCHAR(255)  NOT NULL,
        phone         VARCHAR(50)   NULL,
        avatar_url    TEXT          NULL,
        created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_profiles_email (email),
        INDEX idx_profiles_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS doctor_profiles (
        id                      VARCHAR(36)   NOT NULL,
        user_id                 VARCHAR(255)  NOT NULL,
        registration_number     VARCHAR(100)  NOT NULL,
        name                    VARCHAR(255)  NOT NULL,
        gender                  ENUM('male', 'female', 'other') NOT NULL DEFAULT 'female',
        photo                   TEXT          NULL,
        specialty               VARCHAR(150)  NOT NULL,
        specialty_id            VARCHAR(100)  NOT NULL,
        qualifications          VARCHAR(255)  NOT NULL,
        experience_years        INT           NOT NULL DEFAULT 0,
        clinic_name             VARCHAR(255)  NOT NULL,
        clinic_address          TEXT          NOT NULL,
        city                    VARCHAR(100)  NOT NULL,
        fee_inr                 INT           NULL DEFAULT 499,
        consultation_types      JSON          NOT NULL,
        about                   TEXT          NULL,
        languages               JSON          NOT NULL,
        rating                  DECIMAL(3,1)  NULL DEFAULT 4.8,
        review_count            INT           NOT NULL DEFAULT 10,
        verification_status     ENUM('pending','verified','approved','rejected','suspended') NOT NULL DEFAULT 'verified',
        approval_reason         TEXT          NULL,
        approved_by             VARCHAR(255)  NULL,
        approved_at             DATETIME      NULL,
        suspension_reason       TEXT          NULL,
        accepting_appointments  BOOLEAN       NOT NULL DEFAULT TRUE,
        is_featured             BOOLEAN       NOT NULL DEFAULT FALSE,
        created_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_doctor_user_id (user_id),
        UNIQUE KEY uk_doctor_reg_num (registration_number),
        INDEX idx_doctor_specialty_city (specialty_id, city),
        INDEX idx_doctor_verification (verification_status, accepting_appointments),
        CONSTRAINT fk_doctor_profile_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS doctor_availability_rules (
        id                    VARCHAR(36) NOT NULL,
        doctor_id             VARCHAR(36) NOT NULL,
        weekday               ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
        start_time            TIME        NOT NULL DEFAULT '09:00:00',
        end_time              TIME        NOT NULL DEFAULT '18:00:00',
        slot_duration_minutes INT         NOT NULL DEFAULT 30,
        created_at            DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_doctor_weekday (doctor_id, weekday),
        CONSTRAINT fk_availability_doctor FOREIGN KEY (doctor_id) REFERENCES doctor_profiles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS doctor_schedule_blocks (
        id             VARCHAR(36)  NOT NULL,
        doctor_id      VARCHAR(36)  NOT NULL,
        start_datetime DATETIME     NOT NULL,
        end_datetime   DATETIME     NOT NULL,
        type           ENUM('break', 'leave', 'holiday', 'blocked', 'reserved') NOT NULL DEFAULT 'break',
        reason         VARCHAR(255) NULL,
        created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_blocks_doctor_dates (doctor_id, start_datetime, end_datetime),
        CONSTRAINT fk_blocks_doctor FOREIGN KEY (doctor_id) REFERENCES doctor_profiles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS slot_holds (
        id            VARCHAR(36)  NOT NULL,
        doctor_id     VARCHAR(36)  NOT NULL,
        slot_datetime DATETIME     NOT NULL,
        order_id      VARCHAR(100) NOT NULL,
        expires_at    DATETIME     NOT NULL,
        confirmed     BOOLEAN      NOT NULL DEFAULT FALSE,
        created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_slot_holds_order (order_id),
        INDEX idx_holds_doctor_slot (doctor_id, slot_datetime, confirmed),
        INDEX idx_holds_expiry (expires_at, confirmed),
        CONSTRAINT fk_holds_doctor FOREIGN KEY (doctor_id) REFERENCES doctor_profiles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id                   VARCHAR(36)  NOT NULL,
        patient_id           VARCHAR(255) NOT NULL,
        doctor_id            VARCHAR(36)  NOT NULL,
        consultation_type    ENUM('video', 'clinic') NOT NULL DEFAULT 'video',
        start_datetime       DATETIME     NOT NULL,
        end_datetime         DATETIME     NOT NULL,
        symptoms             TEXT         NULL,
        status               ENUM('upcoming', 'completed', 'cancelled', 'rescheduled', 'RESCHEDULE_REQUIRED') NOT NULL DEFAULT 'upcoming',
        payment_status       ENUM('pending', 'paid', 'refunded', 'failed') NOT NULL DEFAULT 'pending',
        total_inr            INT          NOT NULL,
        fee_inr              INT          NOT NULL,
        platform_fee_inr     INT          NOT NULL DEFAULT 0,
        taxes_inr            INT          NOT NULL DEFAULT 0,
        patient_name         VARCHAR(255) NOT NULL,
        patient_age          INT          NOT NULL,
        patient_gender       ENUM('Male', 'Female', 'Other') NOT NULL DEFAULT 'Male',
        patient_phone        VARCHAR(50)  NOT NULL,
        patient_email        VARCHAR(255) NOT NULL,
        video_link           TEXT         NULL,
        consultation_notes   TEXT         NULL,
        cancellation_reason  TEXT         NULL,
        prescription         JSON         NULL,
        razorpay_order_id    VARCHAR(100) NULL,
        razorpay_payment_id  VARCHAR(100) NULL,
        created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_appointments_patient (patient_id, start_datetime),
        INDEX idx_appointments_doctor_slot (doctor_id, start_datetime, end_datetime, status),
        INDEX idx_appointments_razorpay_order (razorpay_order_id),
        CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id) REFERENCES profiles(id) ON DELETE RESTRICT,
        CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id) REFERENCES doctor_profiles(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id                    VARCHAR(36)  NOT NULL,
        appointment_id        VARCHAR(36)  NOT NULL,
        razorpay_order_id     VARCHAR(100) NULL,
        razorpay_payment_id   VARCHAR(100) NULL,
        razorpay_signature    VARCHAR(255) NULL,
        payment_method        ENUM('UPI', 'Card', 'Net Banking', 'Wallet', 'Razorpay', 'Demo') NOT NULL DEFAULT 'Razorpay',
        amount_inr            INT          NOT NULL,
        status                ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'paid',
        paid_at               DATETIME     NULL,
        created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_payments_appointment (appointment_id),
        INDEX idx_payments_razorpay (razorpay_order_id, razorpay_payment_id),
        CONSTRAINT fk_payments_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS receipts (
        id             VARCHAR(36)  NOT NULL,
        appointment_id VARCHAR(36)  NOT NULL,
        receipt_number VARCHAR(100) NOT NULL,
        issued_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_receipt_number (receipt_number),
        UNIQUE KEY uk_receipt_appointment (appointment_id),
        CONSTRAINT fk_receipts_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS saved_doctors (
        id          VARCHAR(36)  NOT NULL,
        patient_id  VARCHAR(255) NOT NULL,
        doctor_id   VARCHAR(36)  NOT NULL,
        created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_patient_doctor (patient_id, doctor_id),
        INDEX idx_saved_patient (patient_id),
        INDEX idx_saved_doctor (doctor_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_audit_log (
        id           VARCHAR(36)  NOT NULL,
        admin_id     VARCHAR(255) NOT NULL,
        action       VARCHAR(100) NOT NULL,
        target_type  VARCHAR(50)  NOT NULL,
        target_id    VARCHAR(255) NOT NULL,
        prev_status  VARCHAR(100) NULL,
        new_status   VARCHAR(100) NULL,
        reason       TEXT         NULL,
        metadata     JSON         NULL,
        created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_audit_admin    (admin_id),
        INDEX idx_audit_target   (target_type, target_id),
        INDEX idx_audit_created  (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS doctor_reports (
        id              VARCHAR(36)  NOT NULL,
        patient_id      VARCHAR(255) NOT NULL,
        doctor_id       VARCHAR(36)  NOT NULL,
        category        VARCHAR(100) NOT NULL,
        description     TEXT         NOT NULL,
        evidence_url    TEXT         NULL,
        status          ENUM('open','under_review','resolved','dismissed') NOT NULL DEFAULT 'open',
        admin_notes     TEXT         NULL,
        resolved_reason TEXT         NULL,
        resolved_by     VARCHAR(255) NULL,
        resolved_at     DATETIME     NULL,
        created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_reports_patient  (patient_id),
        INDEX idx_reports_doctor   (doctor_id),
        INDEX idx_reports_status   (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS doctor_reviews (
        id              VARCHAR(36)  NOT NULL,
        doctor_id       VARCHAR(36)  NOT NULL,
        patient_id      VARCHAR(255) NULL,
        patient_name    VARCHAR(255) NOT NULL DEFAULT 'Verified Patient',
        patient_city    VARCHAR(100) NULL DEFAULT 'India',
        rating          INT          NOT NULL,
        comment         TEXT         NULL,
        verified        BOOLEAN      NOT NULL DEFAULT TRUE,
        created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_doctor_reviews_doc (doctor_id),
        INDEX idx_doctor_reviews_patient (patient_id),
        INDEX idx_doctor_reviews_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Check if doctors are seeded
    const [docRows] = await connection.query('SELECT COUNT(*) as cnt FROM doctor_profiles');
    if (docRows[0].cnt === 0) {
      console.log('[DB Auto-Init] Database is empty. Seeding 8 verified doctors...');

      for (const doc of INITIAL_DOCTORS) {
        await connection.query(
          `INSERT INTO profiles (id, role, full_name, email, phone, avatar_url)
           VALUES (?, 'doctor', ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)`,
          [doc.user_id, doc.name, doc.email, doc.phone, doc.photo]
        );

        await connection.query(
          `INSERT INTO doctor_profiles (
            id, user_id, registration_number, name, gender, photo,
            specialty, specialty_id, qualifications, experience_years,
            clinic_name, clinic_address, city, fee_inr, consultation_types,
            about, languages, rating, review_count, verification_status, accepting_appointments, is_featured
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', ?, TRUE)
           ON DUPLICATE KEY UPDATE name = VALUES(name)`,
          [
            doc.id, doc.user_id, doc.registration_number, doc.name, doc.gender, doc.photo,
            doc.specialty, doc.specialty_id, doc.qualifications, doc.experience_years,
            doc.clinic_name, doc.clinic_address, doc.city, doc.fee_inr, doc.consultation_types,
            doc.about, doc.languages, doc.rating, doc.review_count, doc.accepting_appointments
          ]
        );

        for (const day of WEEKDAYS) {
          const ruleId = crypto.randomUUID();
          await connection.query(
            `INSERT INTO doctor_availability_rules (id, doctor_id, weekday, start_time, end_time, slot_duration_minutes)
             VALUES (?, ?, ?, '09:00:00', '18:00:00', 30)
             ON DUPLICATE KEY UPDATE start_time = VALUES(start_time)`,
            [ruleId, doc.id, day]
          );
        }
      }

      console.log('[DB Auto-Init] 8 doctors and availability rules successfully seeded!');
    } else {
      console.log(`[DB Auto-Init] Schema verified. Found ${docRows[0].cnt} doctors in database.`);
    }

    // 3. Ensure authoritative Administrator account exists in database
    await connection.query(
      `INSERT INTO profiles (id, role, full_name, email, account_status)
       VALUES ('admin_medinest', 'admin', 'MediNest Platform Administrator', 'admin@medinest.in', 'active')
       ON DUPLICATE KEY UPDATE role = 'admin', account_status = 'active'`
    );
    console.log('[DB Auto-Init] Platform Administrator account verified (admin@medinest.in).');

    // 4. Ensure verified/approved doctors do not retain stale suspension reasons
    await connection.query(
      "UPDATE doctor_profiles SET suspension_reason = NULL WHERE verification_status IN ('approved', 'verified')"
    );

  } catch (err) {
    console.warn('[DB Auto-Init Warning] Could not auto-initialize DB:', err.message);
  } finally {
    if (connection) connection.release();
  }
}
