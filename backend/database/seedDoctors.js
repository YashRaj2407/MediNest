/**
 * backend/database/seedDoctors.js
 * Seeds the initial MediNest verified doctors into MySQL.
 */
import pool from '../config/db.js';

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
    about: 'Dr. Ananya Sharma is a board-certified dermatologist with over 11 years of experience specializing in clinical dermatology, stubborn acne treatments, eczema, chemical peels, and hair-loss therapies. She completed her post-graduation from Maulana Azad Medical College, New Delhi.',
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

async function seed() {
  const connection = await pool.getConnection();
  try {
    console.log('[Seed] Starting MediNest doctor seed...');
    await connection.beginTransaction();

    for (const doc of INITIAL_DOCTORS) {
      // 1. Ensure Profile exists
      await connection.query(
        `INSERT INTO profiles (id, role, full_name, email, phone, avatar_url)
         VALUES (?, 'doctor', ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           full_name = VALUES(full_name),
           phone = VALUES(phone),
           avatar_url = VALUES(avatar_url)`,
        [doc.user_id, doc.name, doc.email, doc.phone, doc.photo]
      );

      // 2. Ensure Doctor Profile exists
      await connection.query(
        `INSERT INTO doctor_profiles (
          id, user_id, registration_number, name, gender, photo,
          specialty, specialty_id, qualifications, experience_years,
          clinic_name, clinic_address, city, fee_inr, consultation_types,
          about, languages, rating, review_count, verification_status, accepting_appointments
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           photo = VALUES(photo),
           specialty = VALUES(specialty),
           fee_inr = VALUES(fee_inr),
           accepting_appointments = VALUES(accepting_appointments)`,
        [
          doc.id,
          doc.user_id,
          doc.registration_number,
          doc.name,
          doc.gender,
          doc.photo,
          doc.specialty,
          doc.specialty_id,
          doc.qualifications,
          doc.experience_years,
          doc.clinic_name,
          doc.clinic_address,
          doc.city,
          doc.fee_inr,
          doc.consultation_types,
          doc.about,
          doc.languages,
          doc.rating,
          doc.review_count,
          doc.accepting_appointments,
        ]
      );
    }

    await connection.commit();
    console.log(`[Seed] Successfully seeded ${INITIAL_DOCTORS.length} doctors into MySQL!`);
  } catch (err) {
    await connection.rollback();
    console.error('[Seed Error]:', err);
    throw err;
  } finally {
    connection.release();
    process.exit(0);
  }
}

seed();
