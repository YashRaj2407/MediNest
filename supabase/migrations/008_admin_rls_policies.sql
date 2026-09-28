-- ============================================================
-- Aarogya Care — Admin Role Level Security (RLS) Policies
-- Grant full system administration access to users with role = 'admin'
-- ============================================================

-- 1. Profiles Table
CREATE POLICY "Admins have full access to profiles"
  ON public.profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 2. Doctor Profiles Table
CREATE POLICY "Admins have full access to doctor profiles"
  ON public.doctor_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 3. Appointments Table
CREATE POLICY "Admins have full access to appointments"
  ON public.appointments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Payments Table
CREATE POLICY "Admins have full access to payments"
  ON public.payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. Receipts Table
CREATE POLICY "Admins have full access to receipts"
  ON public.receipts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6. Availability Rules Table
CREATE POLICY "Admins have full access to availability rules"
  ON public.doctor_availability_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 7. Doctor Schedule Blocks Table
CREATE POLICY "Admins have full access to schedule blocks"
  ON public.doctor_schedule_blocks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
