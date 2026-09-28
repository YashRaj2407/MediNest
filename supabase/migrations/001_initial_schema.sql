-- ============================================================
-- Aarogya Care — Initial Schema
-- Run this in Supabase SQL Editor or via supabase db push
-- ============================================================

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ────────────────────────────────────────────────────────────
-- 1. PROFILES (extends auth.users)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'doctor', 'admin')),
  full_name     TEXT,
  email         TEXT,
  phone         TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 2. DOCTOR PROFILES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.doctor_profiles (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  registration_number     TEXT NOT NULL,
  specialty               TEXT NOT NULL,
  specialty_id            TEXT NOT NULL,
  qualifications          TEXT,
  experience_years        INT DEFAULT 0,
  clinic_name             TEXT,
  clinic_address          TEXT,
  city                    TEXT,
  fee_inr                 INT NOT NULL DEFAULT 499,
  consultation_types      TEXT[] DEFAULT ARRAY['video'],
  about                   TEXT,
  languages               TEXT[] DEFAULT ARRAY['Hindi', 'English'],
  rating                  NUMERIC(3,1) DEFAULT 4.5,
  review_count            INT DEFAULT 0,
  gender                  TEXT DEFAULT 'male' CHECK (gender IN ('male', 'female')),
  verification_status     TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  accepting_appointments  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 3. DOCTOR AVAILABILITY RULES (weekly recurring schedule)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.doctor_availability_rules (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id             UUID NOT NULL REFERENCES public.doctor_profiles(id) ON DELETE CASCADE,
  weekday               TEXT NOT NULL CHECK (weekday IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  start_time            TIME NOT NULL DEFAULT '09:00',
  end_time              TIME NOT NULL DEFAULT '18:00',
  slot_duration_minutes INT NOT NULL DEFAULT 30 CHECK (slot_duration_minutes IN (15, 20, 30, 45)),
  UNIQUE (doctor_id, weekday)
);

-- ────────────────────────────────────────────────────────────
-- 4. DOCTOR SCHEDULE BLOCKS (breaks, leaves, holidays, blocked)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.doctor_schedule_blocks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id      UUID NOT NULL REFERENCES public.doctor_profiles(id) ON DELETE CASCADE,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime   TIMESTAMPTZ NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('break', 'leave', 'holiday', 'blocked', 'reserved')),
  reason         TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 5. APPOINTMENTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id           UUID NOT NULL REFERENCES public.profiles(id),
  doctor_id            UUID NOT NULL REFERENCES public.doctor_profiles(id),
  consultation_type    TEXT NOT NULL CHECK (consultation_type IN ('video', 'clinic')),
  start_datetime       TIMESTAMPTZ NOT NULL,
  end_datetime         TIMESTAMPTZ NOT NULL,
  symptoms             TEXT,
  status               TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled', 'rescheduled')),
  payment_status       TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  total_inr            INT NOT NULL,
  fee_inr              INT NOT NULL,
  platform_fee_inr     INT NOT NULL DEFAULT 0,
  taxes_inr            INT NOT NULL DEFAULT 0,
  patient_name         TEXT,
  patient_age          INT,
  patient_gender       TEXT,
  patient_phone        TEXT,
  patient_email        TEXT,
  video_link           TEXT,
  consultation_notes   TEXT,
  cancellation_reason  TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 6. PAYMENTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id        UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  razorpay_order_id     TEXT,
  razorpay_payment_id   TEXT,
  payment_method        TEXT CHECK (payment_method IN ('UPI', 'Card', 'Net Banking', 'Wallet', 'Demo')),
  amount_inr            INT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  paid_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 7. RECEIPTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.receipts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL UNIQUE,
  storage_path   TEXT,
  issued_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 8. NOTIFICATIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  type       TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- INDEXES for performance
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_appointments_patient    ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor     ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start      ON public.appointments(start_datetime);
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_doctor  ON public.doctor_schedule_blocks(doctor_id);
CREATE INDEX IF NOT EXISTS idx_availability_doctor     ON public.doctor_availability_rules(doctor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user      ON public.notifications(user_id);

-- ────────────────────────────────────────────────────────────
-- TRIGGER: Auto-create profile row after user signs up
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
