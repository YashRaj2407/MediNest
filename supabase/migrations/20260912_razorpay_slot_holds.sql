-- Migration: Add slot_holds table for Razorpay payment flow
-- Applied: 2026-09-12

-- Temporary slot lock held while a user completes Razorpay checkout (10 min TTL).
-- The Edge Function creates a hold on order creation and confirms it on verified payment.
CREATE TABLE IF NOT EXISTS public.slot_holds (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id     uuid        NOT NULL,
  slot_datetime timestamptz NOT NULL,
  order_id      text        UNIQUE NOT NULL,   -- Razorpay order ID
  expires_at    timestamptz NOT NULL,           -- hold expires after 10 min if unpaid
  confirmed     boolean     DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.slot_holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.slot_holds
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS slot_holds_expires_idx
  ON public.slot_holds(expires_at) WHERE confirmed = false;

CREATE INDEX IF NOT EXISTS slot_holds_doctor_slot_idx
  ON public.slot_holds(doctor_id, slot_datetime) WHERE confirmed = true;

-- Razorpay traceability columns on existing tables
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS razorpay_order_id   text,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS razorpay_order_id   text,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text;
