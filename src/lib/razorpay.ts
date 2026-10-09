/**
 * src/lib/razorpay.ts
 *
 * Client-side Razorpay helper.
 * Calls Express backend (/api/v1/payments) for order creation and verification.
 */

import { CreateAppointmentPayload, computeSlotEndTime } from './appointments';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

const RAZORPAY_KEY_ID: string =
  (import.meta as any).env?.VITE_RAZORPAY_KEY_ID ?? '';

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
  receipt_number?: string;
}

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
    script.onload = () => { scriptLoaded = true; resolve(true); };
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

/** Step 1: Create Razorpay Order */
export async function createRazorpayOrder(
  amountINR: number,
  appointmentRef: string,
  doctorId?: string,
  slotDatetime?: string,
): Promise<RazorpayOrderResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/payments/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount_inr: amountINR,
        appointment_ref: appointmentRef,
        doctor_id: doctorId,
        slot_datetime: slotDatetime,
      }),
    });
  } catch (networkErr: any) {
    throw new Error(`Network error connecting to payment service: ${networkErr?.message || 'Unable to reach server'}`);
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch (_parseErr) {
    // Non-JSON response
  }

  if (!res.ok) {
    const errorMsg = data?.error || data?.message || `Server returned status ${res.status}`;
    throw new Error(`Unable to create payment order: ${errorMsg}`);
  }

  if (!data?.order_id || !data?.key_id) {
    throw new Error('Invalid order response received from payment server.');
  }

  return data as RazorpayOrderResult;
}

/** Step 2: Open Razorpay Checkout Popup */
export async function openRazorpayCheckout(
  order: RazorpayOrderResult,
  prefill: { name: string; email: string; contact: string },
  appointmentRef: string,
  onSuccess: (result: RazorpayPaymentResult) => void,
  onFailure: (error: string) => void,
): Promise<void> {
  if (!order || !order.order_id) {
    onFailure('Invalid order: missing Razorpay order ID.');
    return;
  }
  const keyId = order.key_id || RAZORPAY_KEY_ID;
  if (!keyId) {
    onFailure('Razorpay Key ID is not configured. Please ensure VITE_RAZORPAY_KEY_ID is set.');
    return;
  }
  if (!order.amount || order.amount <= 0) {
    onFailure('Invalid order amount.');
    return;
  }

  const loaded = await loadRazorpayScript();
  if (!loaded || !(window as any).Razorpay) {
    onFailure('Failed to load Razorpay Checkout SDK. Please check your internet connection.');
    return;
  }

  const options = {
    key: keyId,
    amount: order.amount,
    currency: 'INR',
    name: 'MediNest',
    description: `Medical Appointment — ${appointmentRef}`,
    order_id: order.order_id,
    prefill: {
      name: prefill.name,
      email: prefill.email,
      contact: prefill.contact,
    },
    theme: { color: '#032F31' },
    modal: {
      ondismiss: () => onFailure('Payment was cancelled by user'),
    },
    handler: (response: RazorpayPaymentResult) => {
      onSuccess(response);
    },
  };

  try {
    const rzp = new (window as any).Razorpay(options);
    rzp.on('payment.failed', (response: any) => {
      onFailure(response?.error?.description ?? 'Payment failed');
    });
    rzp.open();
  } catch (err: any) {
    onFailure(`Could not initialize Razorpay checkout: ${err?.message || 'Unknown error'}`);
  }
}

/** Step 3: Verify Payment */
export async function verifyRazorpayPayment(
  paymentResult: RazorpayPaymentResult,
  appointmentPayload: Record<string, unknown>,
): Promise<RazorpayVerifyResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_order_id: paymentResult.razorpay_order_id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature,
        appointment: appointmentPayload,
      }),
    });
  } catch (networkErr: any) {
    throw new Error(`Network error verifying payment: ${networkErr?.message || 'Unable to reach server'}`);
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch (_parseErr) {}

  if (!res.ok) {
    const errorMsg = data?.error || data?.message || `Payment verification failed (${res.status})`;
    throw new Error(`Payment verification failed: ${errorMsg}`);
  }

  return data as RazorpayVerifyResult;
}

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
    id: appointmentId,
    patient_id: payload.patientId ?? null,
    doctor_id: payload.doctorId,
    consultation_type: payload.consultationType,
    start_datetime: startDT.toISOString(),
    end_datetime: endDT.toISOString(),
    symptoms: payload.visitReason || 'Routine consultation',
    total_inr: payload.totalINR,
    fee_inr: payload.feeINR,
    platform_fee_inr: payload.platformFeeINR,
    taxes_inr: payload.taxesINR,
    patient_name: payload.patientName,
    patient_age: payload.patientAge,
    patient_gender: payload.patientGender,
    patient_phone: payload.patientPhone.startsWith('+91') ? payload.patientPhone : `+91 ${payload.patientPhone}`,
    patient_email: payload.patientEmail,
    video_link: payload.videoLink ?? null,
    payment_method: 'Razorpay',
  };
}

export function resolveDate(dateStr: string): Date {
  const now = new Date();
  if (dateStr.startsWith('Today')) return new Date(now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  if (dateStr.startsWith('Tomorrow')) {
    const d = new Date(now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
    d.setDate(d.getDate() + 1);
    return d;
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? now : parsed;
}

export function parseTimeStr(timeStr: string): { h: number; m: number } {
  const clean = timeStr.trim().replace(/\s*–\s*.*$/, '');
  const [time, period] = clean.trim().split(' ');
  const [hStr, mStr] = (time || '10:00').split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (period?.toUpperCase() === 'PM' && h !== 12) h += 12;
  if (period?.toUpperCase() === 'AM' && h === 12) h = 0;
  return { h: isNaN(h) ? 10 : h, m: isNaN(m) ? 0 : m };
}
