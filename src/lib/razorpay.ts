/**
 * src/lib/razorpay.ts
 *
 * Client-side Razorpay helper.
 *
 * Security contract:
 *  - VITE_RAZORPAY_KEY_ID (public) may appear here — it is also in Razorpay's own checkout.js
 *  - RAZORPAY_KEY_SECRET MUST NOT appear in this file or anywhere under src/
 *    It lives exclusively in Supabase Edge Function secrets (encrypted Deno env).
 */

import { CreateAppointmentPayload, computeSlotEndTime } from './appointments';

// Public Key ID — safe to expose in the browser bundle.
// Set VITE_RAZORPAY_KEY_ID in .env.local (file is git-ignored).
const RAZORPAY_KEY_ID: string =
  (import.meta as any).env?.VITE_RAZORPAY_KEY_ID ?? '';

// Supabase project URL for calling Edge Functions
const SUPABASE_URL = 'https://rjacrstbafbfcsovgehz.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqYWNyc3RiYWZiZmNzb3ZnZWh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMzkwOTcsImV4cCI6MjEwNDcxNTA5N30.KsHhHRMnC-aTEcMtOBeZ2n7rkXBGbWRnie0iCIfRRWs';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RazorpayOrderResult {
  order_id: string;
  key_id: string;
  amount: number; // paise
}

export interface RazorpayPaymentResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayVerifyResult {
  success: boolean;
  appointment_id: string;
  razorpay_payment_id: string;
}

// ─── Load Razorpay Checkout Script ──────────────────────────────────────────

let scriptLoaded = false;
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (scriptLoaded || (window as any).Razorpay) {
      scriptLoaded = true;
      return resolve(true);
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload  = () => { scriptLoaded = true; resolve(true); };
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

// ─── Step 1: Create Razorpay Order (via Edge Function) ──────────────────────

export async function createRazorpayOrder(
  amountINR: number,
  appointmentRef: string,
  doctorId?: string,
  slotDatetime?: string,
): Promise<RazorpayOrderResult> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-razorpay-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      amount_inr: amountINR,
      appointment_ref: appointmentRef,
      doctor_id: doctorId,
      slot_datetime: slotDatetime,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? 'Failed to create payment order');
  }
  return data as RazorpayOrderResult;
}

// ─── Step 2: Open Razorpay Checkout Popup ───────────────────────────────────

export function openRazorpayCheckout(
  order: RazorpayOrderResult,
  prefill: { name: string; email: string; contact: string },
  appointmentRef: string,
  onSuccess: (result: RazorpayPaymentResult) => void,
  onFailure: (error: string) => void,
): void {
  const keyId = order.key_id || RAZORPAY_KEY_ID;
  if (!keyId) {
    onFailure('Razorpay Key ID is not configured. Add VITE_RAZORPAY_KEY_ID to .env.local');
    return;
  }

  const options = {
    key: keyId,           // Public key ID — safe in browser
    amount: order.amount, // paise
    currency: 'INR',
    name: 'MediNest',
    description: `Medical Appointment — ${appointmentRef}`,
    image: 'https://rjacrstbafbfcsovgehz.supabase.co/storage/v1/object/public/assets/logo.png',
    order_id: order.order_id,
    prefill: {
      name:    prefill.name,
      email:   prefill.email,
      contact: prefill.contact,
    },
    theme: { color: '#032F31' },
    modal: {
      ondismiss: () => onFailure('Payment was cancelled by user'),
    },
    handler: (response: RazorpayPaymentResult) => {
      // Called by Razorpay on successful payment capture
      onSuccess(response);
    },
  };

  const rzp = new (window as any).Razorpay(options);
  rzp.on('payment.failed', (response: any) => {
    onFailure(response?.error?.description ?? 'Payment failed');
  });
  rzp.open();
}

// ─── Step 3: Verify Payment (via Edge Function) ──────────────────────────────

export async function verifyRazorpayPayment(
  paymentResult: RazorpayPaymentResult,
  appointmentPayload: Record<string, unknown>,
): Promise<RazorpayVerifyResult> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-razorpay-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      razorpay_order_id:   paymentResult.razorpay_order_id,
      razorpay_payment_id: paymentResult.razorpay_payment_id,
      razorpay_signature:  paymentResult.razorpay_signature,
      appointment:         appointmentPayload,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? 'Payment verification failed');
  }
  return data as RazorpayVerifyResult;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build the appointment DB payload from the booking form data */
export function buildAppointmentPayload(
  payload: CreateAppointmentPayload & { patientId?: string },
  appointmentId: string,
): Record<string, unknown> {
  const dateObj = resolveDate(payload.date);
  const { h: sh, m: sm } = parseTimeStr(payload.timeSlot);

  const slotEnd = payload.timeSlotEnd && payload.timeSlotEnd !== '05:00 PM'
    ? payload.timeSlotEnd
    : computeSlotEndTime(payload.timeSlot, 30);
  const { h: eh, m: em } = parseTimeStr(slotEnd);

  const startDT = new Date(dateObj);
  startDT.setHours(sh, sm, 0, 0);
  const endDT = new Date(dateObj);
  endDT.setHours(eh, em, 0, 0);

  return {
    id:                  appointmentId,
    patient_id:          payload.patientId ?? null,
    doctor_id:           payload.doctorId,
    consultation_type:   payload.consultationType,
    start_datetime:      startDT.toISOString(),
    end_datetime:        endDT.toISOString(),
    symptoms:            payload.visitReason || 'Routine consultation',
    total_inr:           payload.totalINR,
    fee_inr:             payload.feeINR,
    platform_fee_inr:    payload.platformFeeINR,
    taxes_inr:           payload.taxesINR,
    patient_name:        payload.patientName,
    patient_age:         payload.patientAge,
    patient_gender:      payload.patientGender,
    patient_phone:       payload.patientPhone.startsWith('+91')
                           ? payload.patientPhone
                           : `+91 ${payload.patientPhone}`,
    patient_email:       payload.patientEmail,
    video_link:          payload.videoLink ?? null,
    payment_method:      'Razorpay',
  };
}

function resolveDate(dateStr: string): Date {
  const now = new Date();
  if (dateStr.startsWith('Today'))    return new Date(now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  if (dateStr.startsWith('Tomorrow')) {
    const d = new Date(now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
    d.setDate(d.getDate() + 1);
    return d;
  }
  return new Date(dateStr);
}

function parseTimeStr(timeStr: string): { h: number; m: number } {
  const clean = timeStr.trim().replace(/\s*–\s*.*$/, '');
  const [time, period] = clean.trim().split(' ');
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (period?.toUpperCase() === 'PM' && h !== 12) h += 12;
  if (period?.toUpperCase() === 'AM' && h === 12) h = 0;
  return { h, m };
}
