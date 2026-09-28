-- ============================================================
-- Aarogya Care — Database Seed SQL
-- Seeds demo patient and doctor accounts into auth.users and public tables
-- ============================================================

-- 1. Create Patient User in auth.users
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'patient@aarogyacare.in',
  crypt('PatientPass123!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Vikram Malhotra"}',
  NOW(),
  NOW(),
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- 2. Create Doctor User in auth.users
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000000',
  'dr.rohan.gupta@aarogyacare.in',
  crypt('DoctorPass123!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Dr. Rohan Gupta"}',
  NOW(),
  NOW(),
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- 3. Upsert patient profile
INSERT INTO public.profiles (id, role, full_name, email, phone)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'patient',
  'Vikram Malhotra',
  'patient@aarogyacare.in',
  '+91 9820145890'
) ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;

-- 4. Upsert doctor profile
INSERT INTO public.profiles (id, role, full_name, email, phone)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'doctor',
  'Dr. Rohan Gupta',
  'dr.rohan.gupta@aarogyacare.in',
  '+91 9845012345'
) ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;

-- 5. Upsert doctor details
INSERT INTO public.doctor_profiles (
  id,
  profile_id,
  registration_number,
  specialty,
  specialty_id,
  qualifications,
  experience_years,
  clinic_name,
  clinic_address,
  city,
  fee_inr,
  consultation_types,
  about,
  languages,
  rating,
  review_count,
  gender,
  verification_status,
  accepting_appointments
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  'KMC-2015-88241',
  'General Physician',
  'general-physician',
  'MBBS, MD (General Medicine)',
  9,
  'Aarogya Care Clinic',
  'Indiranagar 100ft Road, Bengaluru - 560038',
  'Bengaluru',
  499,
  ARRAY['video', 'clinic'],
  'Dr. Rohan Gupta is a compassionate general physician with 9 years of clinical experience specializing in preventive care, fever management, diabetes, and lifestyle health.',
  ARRAY['English', 'Hindi', 'Kannada'],
  4.8,
  310,
  'male',
  'verified',
  TRUE
) ON CONFLICT (id) DO UPDATE SET verification_status = 'verified';

-- 6. Insert default availability rules for Dr. Rohan Gupta
INSERT INTO public.doctor_availability_rules (doctor_id, weekday, start_time, end_time, slot_duration_minutes)
VALUES
  ('33333333-3333-3333-3333-333333333333', 'Monday', '08:00', '18:00', 30),
  ('33333333-3333-3333-3333-333333333333', 'Tuesday', '08:00', '18:00', 30),
  ('33333333-3333-3333-3333-333333333333', 'Wednesday', '08:00', '18:00', 30),
  ('33333333-3333-3333-3333-333333333333', 'Thursday', '08:00', '18:00', 30),
  ('33333333-3333-3333-3333-333333333333', 'Friday', '08:00', '18:00', 30),
  ('33333333-3333-3333-3333-333333333333', 'Saturday', '08:00', '16:00', 30)
ON CONFLICT (doctor_id, weekday) DO NOTHING;
