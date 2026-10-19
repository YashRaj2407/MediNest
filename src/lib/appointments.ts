import { Appointment } from '../types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

/** Generate a receipt number like AGC-2026-89421 */
function genReceiptNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 89999);
  return `AGC-${year}-${rand}`;
}

/** Generate appointment ID like AGC-APT-2026-XXXXX */
function genAppointmentId(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 89999);
  return `AGC-APT-${year}-${rand}`;
}

export function computeSlotEndTime(startTimeStr: string, durationMinutes = 30): string {
  if (!startTimeStr) return '';
  const clean = startTimeStr.trim().replace(/\s*–\s*.*$/, '').replace(/\s*-\s*.*$/, '');
  const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return startTimeStr;

  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();

  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;

  const totalMinutes = h * 60 + m + durationMinutes;
  const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  const newH = Math.floor(normalizedMinutes / 60);
  const newM = normalizedMinutes % 60;

  const newPeriod = newH >= 12 ? 'PM' : 'AM';
  const displayH = newH % 12 === 0 ? 12 : newH % 12;
  const pad = (n: number) => n.toString().padStart(2, '0');

  return `${pad(displayH)}:${pad(newM)} ${newPeriod}`;
}

/**
 * Normalizes any time slot into a clean 30-minute range: "HH:MM AM – HH:MM AM"
 * e.g. "06:00 AM" -> "06:00 AM – 06:30 AM"
 * e.g. "06:00 AM – 01:00 AM" -> "06:00 AM – 06:30 AM"
 */
export function formatTimeSlotRange(slotStr: string, durationMinutes = 30): string {
  if (!slotStr) return '';
  const cleanStart = slotStr.trim().split(/\s*[–-]\s*/)[0].trim();
  const endTime = computeSlotEndTime(cleanStart, durationMinutes);
  return `${cleanStart} – ${endTime}`;
}

export interface CreateAppointmentPayload {
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorPhoto: string;
  clinicName: string;
  clinicAddress: string;
  city: string;
  consultationType: 'video' | 'clinic';
  date: string;
  timeSlot: string;
  timeSlotEnd: string;
  patientId?: string;
  patientName: string;
  patientAge: number;
  patientGender: 'Male' | 'Female' | 'Other';
  patientPhone: string;
  patientEmail: string;
  visitReason: string;
  feeINR: number;
  platformFeeINR: number;
  taxesINR: number;
  totalINR: number;
  paymentMethod: 'UPI' | 'Card' | 'Net Banking' | 'Wallet' | 'Razorpay';
  paymentTransactionId: string;
  videoLink?: string;
}

/**
 * Creates an appointment (returns local Appointment model object).
 */
export async function createAppointment(
  payload: CreateAppointmentPayload
): Promise<Appointment> {
  const id = genAppointmentId();
  const createdAt = new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata'
  });

  const formattedTimeSlot = formatTimeSlotRange(payload.timeSlot, 30);

  const localAppt: Appointment = {
    id,
    doctorId: payload.doctorId,
    doctorName: payload.doctorName,
    doctorSpecialty: payload.doctorSpecialty,
    doctorPhoto: payload.doctorPhoto,
    clinicName: payload.clinicName,
    clinicAddress: payload.clinicAddress,
    city: payload.city,
    appointmentType: payload.consultationType,
    date: payload.date,
    timeSlot: formattedTimeSlot,
    patientName: payload.patientName,
    patientAge: payload.patientAge,
    patientGender: payload.patientGender,
    patientPhone: payload.patientPhone,
    patientEmail: payload.patientEmail,
    visitReason: payload.visitReason,
    feeINR: payload.feeINR,
    platformFeeINR: payload.platformFeeINR,
    taxesINR: payload.taxesINR,
    totalINR: payload.totalINR,
    status: 'upcoming',
    paymentMethod: payload.paymentMethod,
    paymentTransactionId: payload.paymentTransactionId,
    createdAt,
    videoLink: payload.videoLink,
  };

  return localAppt;
}

/**
 * Fetches all appointments for the logged-in patient from Express REST API.
 * Uses authenticated identity (Authorization Bearer token / verified user ID).
 * Never passes or queries by email to prevent cross-account consultation leaks.
 */
export async function fetchPatientAppointments(patientId?: string, token?: string): Promise<Appointment[]> {
  try {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (patientId) headers['x-user-id'] = patientId;

    const res = await fetch(`${API_BASE_URL}/appointments/patient`, { headers });
    if (res.ok) {
      const body = await res.json();
      if (body.success && Array.isArray(body.data)) {
        return body.data;
      }
    }
  } catch (_err) {}

  return [];
}

/**
 * Fetches all appointments for a specific doctor from Express REST API.
 */
export async function fetchDoctorAppointments(doctorId: string): Promise<Appointment[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/appointments/doctor/${encodeURIComponent(doctorId)}`);
    if (res.ok) {
      const body = await res.json();
      if (body.success && Array.isArray(body.data)) {
        return body.data;
      }
    }
  } catch (_err) {}

  return [];
}

/**
 * Cancels an appointment via Express REST API with caller authorization.
 */
export async function cancelAppointmentInDB(
  id: string,
  reason?: string,
  token?: string,
  userId?: string
): Promise<void> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (userId) headers['x-user-id'] = userId;

    await fetch(`${API_BASE_URL}/appointments/${id}/cancel`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ reason }),
    });
  } catch (_err) {}
}

/**
 * Reschedules an appointment via Express REST API with caller authorization.
 */
export async function rescheduleAppointmentInDB(
  id: string,
  newDate: string,
  newTimeSlot: string,
  token?: string,
  userId?: string
): Promise<Appointment> {
  const dateObj = resolveDate(newDate);
  const { h, m } = parseTime(newTimeSlot);
  dateObj.setHours(h, m, 0, 0);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (userId) headers['x-user-id'] = userId;

  const res = await fetch(`${API_BASE_URL}/appointments/${encodeURIComponent(id)}/reschedule`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      newDate,
      newTimeSlot,
      startDatetime: dateObj.toISOString(),
    }),
  });

  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(body?.error || 'Failed to reschedule appointment');
  }
  return body.data;
}

/**
 * Deletes an obsolete cancelled appointment record from database with authorization.
 */
export async function deleteCancelledAppointmentInDB(
  id: string,
  token?: string,
  userId?: string
): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (userId) headers['x-user-id'] = userId;

  const res = await fetch(`${API_BASE_URL}/appointments/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers,
  });

  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(body?.error || 'Failed to delete cancelled appointment record');
  }
}

/**
 * Marks an appointment as completed via Express REST API with doctor authorization.
 */
export async function completeAppointmentInDB(
  id: string,
  token?: string,
  doctorUserId?: string
): Promise<{ success: boolean; message?: string; data?: Appointment }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (doctorUserId) {
    headers['x-user-id'] = doctorUserId;
    headers['x-user-role'] = 'doctor';
  }

  const res = await fetch(`${API_BASE_URL}/appointments/${encodeURIComponent(id)}/complete`, {
    method: 'PATCH',
    headers,
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(body?.error || 'Failed to complete appointment');
  }
  return body;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveDate(dateStr: string): Date {
  const now = new Date();
  if (!dateStr) return new Date();
  if (dateStr.startsWith('Today')) return new Date(now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  if (dateStr.startsWith('Tomorrow')) {
    const d = new Date(now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
    d.setDate(d.getDate() + 1);
    return d;
  }
  // If YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date();
    dt.setFullYear(y, m - 1, d);
    return dt;
  }
  // Check if string has a 4-digit year
  const hasYear = /\b(20\d\d)\b/.test(dateStr);
  let parsed = new Date(dateStr);
  if (!hasYear || isNaN(parsed.getTime()) || parsed.getFullYear() < 2025) {
    const currentYear = now.getFullYear();
    const withYear = `${dateStr} ${currentYear}`;
    const retry = new Date(withYear);
    if (!isNaN(retry.getTime())) {
      parsed = retry;
    }
  }
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function parseTime(timeStr: string): { h: number; m: number } {
  const clean = timeStr.trim().replace(/\s*–\s*.*$/, '');
  const [time, period] = clean.trim().split(' ');
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (period?.toUpperCase() === 'PM' && h !== 12) h += 12;
  if (period?.toUpperCase() === 'AM' && h === 12) h = 0;
  return { h, m };
}

export { genReceiptNumber };
