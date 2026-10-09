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
  const clean = startTimeStr.trim().replace(/\s*–\s*.*$/, '');
  const parts = clean.trim().split(' ');
  if (parts.length < 2) return startTimeStr;
  const [time, period] = parts;
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr, 10);
  let m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return startTimeStr;
  if (period?.toUpperCase() === 'PM' && h !== 12) h += 12;
  if (period?.toUpperCase() === 'AM' && h === 12) h = 0;
  
  const d = new Date();
  d.setHours(h, m + durationMinutes, 0, 0);
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  }).replace(/\bam\b/, 'AM').replace(/\bpm\b/, 'PM');
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

  const slotEndTime = payload.timeSlotEnd && payload.timeSlotEnd !== '05:00 PM'
    ? payload.timeSlotEnd
    : computeSlotEndTime(payload.timeSlot, 30);

  const formattedTimeSlot = payload.timeSlot.includes('–')
    ? payload.timeSlot
    : `${payload.timeSlot} – ${slotEndTime}`;

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
 */
export async function fetchPatientAppointments(): Promise<Appointment[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/appointments/patient`);
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
 * Cancels an appointment via Express REST API.
 */
export async function cancelAppointmentInDB(id: string, reason?: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/appointments/${id}/cancel`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
  } catch (_err) {}
}

/**
 * Reschedules an appointment via Express REST API.
 */
export async function rescheduleAppointmentInDB(
  id: string,
  newDate: string,
  newTimeSlot: string
): Promise<void> {
  const dateObj = resolveDate(newDate);
  const { h, m } = parseTime(newTimeSlot);
  dateObj.setHours(h, m, 0, 0);

  try {
    await fetch(`${API_BASE_URL}/appointments/${id}/reschedule`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDatetime: dateObj.toISOString() }),
    });
  } catch (_err) {}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveDate(dateStr: string): Date {
  const now = new Date();
  if (dateStr.startsWith('Today')) return new Date(now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  if (dateStr.startsWith('Tomorrow')) {
    const d = new Date(now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
    d.setDate(d.getDate() + 1);
    return d;
  }
  return new Date(dateStr);
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
