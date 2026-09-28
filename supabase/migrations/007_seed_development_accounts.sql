-- ============================================================
-- Aarogya Care — Seed Development Test Accounts (5 Doctors, 2 Patients, 1 Admin)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ────────────────────────────────────────────────────────────
-- 1. AUTH USERS (Supabase Auth)
-- ────────────────────────────────────────────────────────────

-- Doctor 1: Dr. Aditi Nair
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, aud, role
) VALUES (
  'd1111111-1111-4111-a111-111111111111', '00000000-0000-0000-0000-000000000000',
  'dr.aditi.nair@aarogyacare.in', crypt('DrAditiNair#2026', gen_salt('bf')), NOW(),
  '{"provider":"email","providers":["email"]}', '{"full_name":"Dr. Aditi Nair","role":"doctor"}',
  NOW(), NOW(), '', '', '', '', 'authenticated', 'authenticated'
) ON CONFLICT (id) DO UPDATE SET encrypted_password = crypt('DrAditiNair#2026', gen_salt('bf')), email_confirmed_at = NOW();

-- Doctor 2: Dr. Karthik Menon
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, aud, role
) VALUES (
  'd2222222-2222-4222-a222-222222222222', '00000000-0000-0000-0000-000000000000',
  'dr.karthik.menon@aarogyacare.in', crypt('DrKarthikMenon#2026', gen_salt('bf')), NOW(),
  '{"provider":"email","providers":["email"]}', '{"full_name":"Dr. Karthik Menon","role":"doctor"}',
  NOW(), NOW(), '', '', '', '', 'authenticated', 'authenticated'
) ON CONFLICT (id) DO UPDATE SET encrypted_password = crypt('DrKarthikMenon#2026', gen_salt('bf')), email_confirmed_at = NOW();

-- Doctor 3: Dr. Sana Qureshi
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, aud, role
) VALUES (
  'd3333333-3333-4333-a333-333333333333', '00000000-0000-0000-0000-000000000000',
  'dr.sana.qureshi@aarogyacare.in', crypt('DrSanaQureshi#2026', gen_salt('bf')), NOW(),
  '{"provider":"email","providers":["email"]}', '{"full_name":"Dr. Sana Qureshi","role":"doctor"}',
  NOW(), NOW(), '', '', '', '', 'authenticated', 'authenticated'
) ON CONFLICT (id) DO UPDATE SET encrypted_password = crypt('DrSanaQureshi#2026', gen_salt('bf')), email_confirmed_at = NOW();

-- Doctor 4: Dr. Vivek Bansal
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, aud, role
) VALUES (
  'd4444444-4444-4444-a444-444444444444', '00000000-0000-0000-0000-000000000000',
  'dr.vivek.bansal@aarogyacare.in', crypt('DrVivekBansal#2026', gen_salt('bf')), NOW(),
  '{"provider":"email","providers":["email"]}', '{"full_name":"Dr. Vivek Bansal","role":"doctor"}',
  NOW(), NOW(), '', '', '', '', 'authenticated', 'authenticated'
) ON CONFLICT (id) DO UPDATE SET encrypted_password = crypt('DrVivekBansal#2026', gen_salt('bf')), email_confirmed_at = NOW();

-- Doctor 5: Dr. Priyanka Rao
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, aud, role
) VALUES (
  'd5555555-5555-4555-a555-555555555555', '00000000-0000-0000-0000-000000000000',
  'dr.priyanka.rao@aarogyacare.in', crypt('DrPriyankaRao#2026', gen_salt('bf')), NOW(),
  '{"provider":"email","providers":["email"]}', '{"full_name":"Dr. Priyanka Rao","role":"doctor"}',
  NOW(), NOW(), '', '', '', '', 'authenticated', 'authenticated'
) ON CONFLICT (id) DO UPDATE SET encrypted_password = crypt('DrPriyankaRao#2026', gen_salt('bf')), email_confirmed_at = NOW();

-- Patient 1: Meera Joshi
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, aud, role
) VALUES (
  'p1111111-1111-4111-a111-111111111111', '00000000-0000-0000-0000-000000000000',
  'meera.joshi@aarogyacare.in', crypt('MeeraJoshi#2026', gen_salt('bf')), NOW(),
  '{"provider":"email","providers":["email"]}', '{"full_name":"Meera Joshi","role":"patient"}',
  NOW(), NOW(), '', '', '', '', 'authenticated', 'authenticated'
) ON CONFLICT (id) DO UPDATE SET encrypted_password = crypt('MeeraJoshi#2026', gen_salt('bf')), email_confirmed_at = NOW();

-- Patient 2: Arnav Kapoor
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, aud, role
) VALUES (
  'p2222222-2222-4222-a222-222222222222', '00000000-0000-0000-0000-000000000000',
  'arnav.kapoor@aarogyacare.in', crypt('ArnavKapoor#2026', gen_salt('bf')), NOW(),
  '{"provider":"email","providers":["email"]}', '{"full_name":"Arnav Kapoor","role":"patient"}',
  NOW(), NOW(), '', '', '', '', 'authenticated', 'authenticated'
) ON CONFLICT (id) DO UPDATE SET encrypted_password = crypt('ArnavKapoor#2026', gen_salt('bf')), email_confirmed_at = NOW();

-- Administrator: Aarogya Care Admin
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, aud, role
) VALUES (
  'a1111111-1111-4111-a111-111111111111', '00000000-0000-0000-0000-000000000000',
  'admin@aarogyacare.in', crypt('AarogyaAdmin#2026', gen_salt('bf')), NOW(),
  '{"provider":"email","providers":["email"]}', '{"full_name":"Aarogya Care Admin","role":"admin"}',
  NOW(), NOW(), '', '', '', '', 'authenticated', 'authenticated'
) ON CONFLICT (id) DO UPDATE SET encrypted_password = crypt('AarogyaAdmin#2026', gen_salt('bf')), email_confirmed_at = NOW();


-- ────────────────────────────────────────────────────────────
-- 2. PUBLIC PROFILES
-- ────────────────────────────────────────────────────────────

INSERT INTO public.profiles (id, full_name, email, phone, role) VALUES
  ('d1111111-1111-4111-a111-111111111111', 'Dr. Aditi Nair', 'dr.aditi.nair@aarogyacare.in', '+91 9845112233', 'doctor'),
  ('d2222222-2222-4222-a222-222222222222', 'Dr. Karthik Menon', 'dr.karthik.menon@aarogyacare.in', '+91 9820445566', 'doctor'),
  ('d3333333-3333-4333-a333-333333333333', 'Dr. Sana Qureshi', 'dr.sana.qureshi@aarogyacare.in', '+91 9910778899', 'doctor'),
  ('d4444444-4444-4444-a444-444444444444', 'Dr. Vivek Bansal', 'dr.vivek.bansal@aarogyacare.in', '+91 9742334455', 'doctor'),
  ('d5555555-5555-4555-a555-555555555555', 'Dr. Priyanka Rao', 'dr.priyanka.rao@aarogyacare.in', '+91 9890667788', 'doctor'),
  ('p1111111-1111-4111-a111-111111111111', 'Meera Joshi', 'meera.joshi@aarogyacare.in', '+91 9820112233', 'patient'),
  ('p2222222-2222-4222-a222-222222222222', 'Arnav Kapoor', 'arnav.kapoor@aarogyacare.in', '+91 9845998877', 'patient'),
  ('a1111111-1111-4111-a111-111111111111', 'Aarogya Care Admin', 'admin@aarogyacare.in', '+91 9999000000', 'admin')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, phone = EXCLUDED.phone;


-- ────────────────────────────────────────────────────────────
-- 3. DOCTOR PROFILES
-- ────────────────────────────────────────────────────────────

INSERT INTO public.doctor_profiles (
  id, profile_id, registration_number, specialty, specialty_id, qualifications,
  experience_years, clinic_name, clinic_address, city, fee_inr, consultation_types,
  about, languages, rating, review_count, gender, verification_status, accepting_appointments
) VALUES
(
  'd1111111-1111-4111-a111-111111111111', 'd1111111-1111-4111-a111-111111111111',
  'KMC-2018-77123', 'Dermatologist', 'dermatologist', 'MBBS, MD (Dermatology, Venereology & Leprosy)',
  8, 'Aura Skin & Hair Clinic', 'B-14, Greater Kailash 1, New Delhi', 'Delhi NCR',
  799, ARRAY['video', 'clinic'],
  'Specialist in clinical dermatology, acne, psoriasis, and laser skin treatments with 8 years of clinical experience.',
  ARRAY['English', 'Hindi'], 4.9, 142, 'female', 'verified', true
),
(
  'd2222222-2222-4222-a222-222222222222', 'd2222222-2222-4222-a222-222222222222',
  'MMC-2012-44589', 'Cardiologist', 'cardiologist', 'MBBS, MD, DM (Cardiology), FACC',
  14, 'Apex Heart & Vascular Institute', 'Dr. E Moses Road, Worli, Mumbai - 400018', 'Mumbai',
  1200, ARRAY['video', 'clinic'],
  'Senior consultant interventional cardiologist specializing in preventive cardiology, hypertension, and heart failure management.',
  ARRAY['English', 'Hindi', 'Marathi'], 4.9, 218, 'male', 'verified', true
),
(
  'd3333333-3333-4333-a333-333333333333', 'd3333333-3333-4333-a333-333333333333',
  'DMC-2016-99341', 'General Physician', 'general-physician', 'MBBS, MD (General Medicine)',
  9, 'CareFirst Family Health Clinic', '100ft Road, Indiranagar, Bengaluru - 560038', 'Bengaluru',
  499, ARRAY['video', 'clinic'],
  'Experienced general practitioner focusing on primary health, diabetes control, thyroid disorders, and acute infection care.',
  ARRAY['English', 'Hindi', 'Kannada'], 4.8, 310, 'female', 'verified', true
),
(
  'd4444444-4444-4444-a444-444444444444', 'd4444444-4444-4444-a444-444444444444',
  'TSMC-2014-55102', 'Orthopedic Surgeon', 'orthopedic-surgeon', 'MBBS, MS (Orthopedics), MCh (Joint Replacement)',
  11, 'Joint Care & Trauma Center', 'Road No. 36, Jubilee Hills, Hyderabad - 500033', 'Hyderabad',
  899, ARRAY['video', 'clinic'],
  'Consultant orthopedic and arthroscopy surgeon specializing in knee/hip joint replacement, sports injuries, and spine care.',
  ARRAY['English', 'Hindi', 'Telugu'], 4.7, 185, 'male', 'verified', true
),
(
  'd5555555-5555-4555-a555-555555555555', 'd5555555-5555-4555-a555-555555555555',
  'MMC-2017-33891', 'Psychiatrist', 'psychiatrist', 'MBBS, MD (Psychiatry), DPM',
  7, 'MindCare Mental Health Clinic', 'FC Road, Shivaji Nagar, Pune - 411005', 'Pune',
  999, ARRAY['video', 'clinic'],
  'Consultant psychiatrist and psychotherapist providing compassionate care for anxiety, depression, insomnia, and stress management.',
  ARRAY['English', 'Hindi', 'Marathi'], 4.9, 96, 'female', 'verified', true
)
ON CONFLICT (id) DO UPDATE SET
  specialty = EXCLUDED.specialty,
  qualifications = EXCLUDED.qualifications,
  fee_inr = EXCLUDED.fee_inr,
  clinic_name = EXCLUDED.clinic_name,
  city = EXCLUDED.city,
  verification_status = EXCLUDED.verification_status;


-- ────────────────────────────────────────────────────────────
-- 4. DOCTOR AVAILABILITY RULES (Weekly recurring hours)
-- ────────────────────────────────────────────────────────────

INSERT INTO public.doctor_availability_rules (doctor_id, weekday, start_time, end_time, slot_duration_minutes)
VALUES
  ('d1111111-1111-4111-a111-111111111111', 'Monday', '09:00', '17:00', 30),
  ('d1111111-1111-4111-a111-111111111111', 'Tuesday', '09:00', '17:00', 30),
  ('d1111111-1111-4111-a111-111111111111', 'Wednesday', '09:00', '17:00', 30),
  ('d1111111-1111-4111-a111-111111111111', 'Thursday', '09:00', '17:00', 30),
  ('d1111111-1111-4111-a111-111111111111', 'Friday', '09:00', '17:00', 30),
  ('d1111111-1111-4111-a111-111111111111', 'Saturday', '09:00', '13:00', 30),

  ('d2222222-2222-4222-a222-222222222222', 'Monday', '10:00', '18:00', 30),
  ('d2222222-2222-4222-a222-222222222222', 'Tuesday', '10:00', '18:00', 30),
  ('d2222222-2222-4222-a222-222222222222', 'Wednesday', '10:00', '18:00', 30),
  ('d2222222-2222-4222-a222-222222222222', 'Thursday', '10:00', '18:00', 30),
  ('d2222222-2222-4222-a222-222222222222', 'Friday', '10:00', '18:00', 30),

  ('d3333333-3333-4333-a333-333333333333', 'Monday', '08:00', '18:00', 30),
  ('d3333333-3333-4333-a333-333333333333', 'Tuesday', '08:00', '18:00', 30),
  ('d3333333-3333-4333-a333-333333333333', 'Wednesday', '08:00', '18:00', 30),
  ('d3333333-3333-4333-a333-333333333333', 'Thursday', '08:00', '18:00', 30),
  ('d3333333-3333-4333-a333-333333333333', 'Friday', '08:00', '18:00', 30),
  ('d3333333-3333-4333-a333-333333333333', 'Saturday', '08:00', '14:00', 30)
ON CONFLICT (doctor_id, weekday) DO UPDATE SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time;


-- ────────────────────────────────────────────────────────────
-- 5. DOCTOR SCHEDULE BREAKS
-- ────────────────────────────────────────────────────────────

INSERT INTO public.doctor_schedule_blocks (id, doctor_id, start_datetime, end_datetime, type, reason)
VALUES
  ('b1111111-1111-4111-a111-111111111111', 'd3333333-3333-4333-a333-333333333333', NOW()::date + TIME '15:00', NOW()::date + TIME '17:00', 'break', 'Doctor Afternoon Break & Hospital Rounds'),
  ('b2222222-2222-4222-a222-222222222222', 'd1111111-1111-4111-a111-111111111111', NOW()::date + TIME '13:00', NOW()::date + TIME '14:00', 'break', 'Lunch & OPD Administrative Review')
ON CONFLICT (id) DO UPDATE SET reason = EXCLUDED.reason;


-- ────────────────────────────────────────────────────────────
-- 6. REALISTIC TEST APPOINTMENTS
-- ────────────────────────────────────────────────────────────

INSERT INTO public.appointments (
  id, patient_id, doctor_id, consultation_type, start_datetime, end_datetime,
  symptoms, status, payment_status, total_inr, fee_inr, platform_fee_inr, taxes_inr,
  patient_name, patient_age, patient_gender, patient_phone, patient_email, video_link, consultation_notes
) VALUES
(
  'a8888888-8888-4888-a888-888888888881',
  'p1111111-1111-4111-a111-111111111111',
  'd1111111-1111-4111-a111-111111111111',
  'video', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day' + INTERVAL '30 minutes',
  'Persistent skin redness & allergic rash on forearm', 'upcoming', 'paid', 799, 799, 0, 0,
  'Meera Joshi', 31, 'Female', '+91 9820112233', 'meera.joshi@aarogyacare.in',
  'https://meet.google.com/aarogya-skin-test', 'Patient advised to stop local cosmetic application before video call.'
),
(
  'a8888888-8888-4888-a888-888888888882',
  'p2222222-2222-4222-a222-222222222222',
  'd3333333-3333-4333-a333-333333333333',
  'clinic', NOW() + INTERVAL '2 hours', NOW() + INTERVAL '2 hours 30 minutes',
  'Mild fever, body ache, dry cough for 2 days', 'upcoming', 'paid', 499, 499, 0, 0,
  'Arnav Kapoor', 42, 'Male', '+91 9845998877', 'arnav.kapoor@aarogyacare.in',
  NULL, 'Check vitals and complete blood count on arrival.'
)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
