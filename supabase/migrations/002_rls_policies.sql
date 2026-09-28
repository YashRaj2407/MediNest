-- ============================================================
-- Aarogya Care — Row Level Security Policies
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_schedule_blocks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications             ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- PROFILES
-- ────────────────────────────────────────────────────────────
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ────────────────────────────────────────────────────────────
-- DOCTOR PROFILES (public read of safe fields)
-- ────────────────────────────────────────────────────────────
CREATE POLICY "Public can view verified doctor profiles"
  ON public.doctor_profiles FOR SELECT
  USING (verification_status = 'verified');

CREATE POLICY "Doctors can update their own profile"
  ON public.doctor_profiles FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "Doctors can insert their profile"
  ON public.doctor_profiles FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- DOCTOR AVAILABILITY RULES
-- ────────────────────────────────────────────────────────────
CREATE POLICY "Public can view availability rules"
  ON public.doctor_availability_rules FOR SELECT USING (TRUE);

CREATE POLICY "Doctors manage their own availability"
  ON public.doctor_availability_rules FOR ALL
  USING (
    doctor_id IN (
      SELECT id FROM public.doctor_profiles WHERE profile_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- DOCTOR SCHEDULE BLOCKS
-- ────────────────────────────────────────────────────────────
CREATE POLICY "Public can view schedule blocks"
  ON public.doctor_schedule_blocks FOR SELECT USING (TRUE);

CREATE POLICY "Doctors manage their own schedule blocks"
  ON public.doctor_schedule_blocks FOR ALL
  USING (
    doctor_id IN (
      SELECT id FROM public.doctor_profiles WHERE profile_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- APPOINTMENTS
-- ────────────────────────────────────────────────────────────
CREATE POLICY "Patients see their own appointments"
  ON public.appointments FOR SELECT
  USING (patient_id = auth.uid());

CREATE POLICY "Doctors see appointments assigned to them"
  ON public.appointments FOR SELECT
  USING (
    doctor_id IN (
      SELECT id FROM public.doctor_profiles WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Patients can create appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients can update their own appointments"
  ON public.appointments FOR UPDATE
  USING (patient_id = auth.uid());

CREATE POLICY "Doctors can update appointments assigned to them"
  ON public.appointments FOR UPDATE
  USING (
    doctor_id IN (
      SELECT id FROM public.doctor_profiles WHERE profile_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- PAYMENTS
-- ────────────────────────────────────────────────────────────
CREATE POLICY "Patients can view their own payments"
  ON public.payments FOR SELECT
  USING (
    appointment_id IN (
      SELECT id FROM public.appointments WHERE patient_id = auth.uid()
    )
  );

CREATE POLICY "Patients can insert payments"
  ON public.payments FOR INSERT
  WITH CHECK (
    appointment_id IN (
      SELECT id FROM public.appointments WHERE patient_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- RECEIPTS
-- ────────────────────────────────────────────────────────────
CREATE POLICY "Patients can view their own receipts"
  ON public.receipts FOR SELECT
  USING (
    appointment_id IN (
      SELECT id FROM public.appointments WHERE patient_id = auth.uid()
    )
  );

CREATE POLICY "Patients can insert receipts"
  ON public.receipts FOR INSERT
  WITH CHECK (
    appointment_id IN (
      SELECT id FROM public.appointments WHERE patient_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ────────────────────────────────────────────────────────────
CREATE POLICY "Users see their own notifications"
  ON public.notifications FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can mark their notifications read"
  ON public.notifications FOR UPDATE USING (user_id = auth.uid());
