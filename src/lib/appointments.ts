import { patientSupabase, SUPABASE_CONFIGURED } from './supabase';
import { Appointment } from '../types';

/** Generate a receipt number like AGC-2026-89421 */
function genReceiptNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 89999);
  return `AGC-${year}-${rand}`;
}

/** Generate appointment ID like MCI-2026-XXXXX */
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
 * Creates an appointment in Supabase (or returns a local Appointment object in demo mode).
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

  if (!SUPABASE_CONFIGURED || !payload.patientId) {
    // Demo mode — return local appointment
    return localAppt;
  }

  try {
    // Build ISO datetime strings for the selected slot (IST)
    const dateObj = resolveDate(payload.date);
    const { h: sh, m: sm } = parseTime(payload.timeSlot);
    const { h: eh, m: em } = parseTime(payload.timeSlotEnd);

    const startDT = new Date(dateObj);
    startDT.setHours(sh, sm, 0, 0);
    const endDT = new Date(dateObj);
    endDT.setHours(eh, em, 0, 0);

    const { data, error } = await patientSupabase.from('appointments').insert({
      id,
      patient_id: payload.patientId,
      doctor_id: payload.doctorId,
      consultation_type: payload.consultationType,
      start_datetime: startDT.toISOString(),
      end_datetime: endDT.toISOString(),
      symptoms: payload.visitReason,
      status: 'upcoming',
      payment_status: 'paid',
      total_inr: payload.totalINR,
      fee_inr: payload.feeINR,
      platform_fee_inr: payload.platformFeeINR,
      taxes_inr: payload.taxesINR,
      patient_name: payload.patientName,
      patient_age: payload.patientAge,
      patient_gender: payload.patientGender,
      patient_phone: payload.patientPhone,
      patient_email: payload.patientEmail,
      video_link: payload.videoLink,
    }).select().single();

    if (error) throw error;

    // Also insert payment record
    await patientSupabase.from('payments').insert({
      appointment_id: data.id,
      payment_method: payload.paymentMethod,
      amount_inr: payload.totalINR,
      status: 'paid',
      paid_at: new Date().toISOString(),
    });

    return { ...localAppt, id: data.id };
  } catch (err) {
    console.warn('[MediNest] Supabase insert failed, using local:', err);
    return localAppt;
  }
}

/**
 * Fetches all appointments for the currently logged-in patient from Supabase.
 * Returns empty array in demo mode (caller uses localStorage).
 */
export async function fetchPatientAppointments(): Promise<Appointment[]> {
  if (!SUPABASE_CONFIGURED) return [];

  const { data: sessionData } = await patientSupabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return [];

  const { data, error } = await patientSupabase
    .from('appointments')
    .select(`
      *,
      doctor_profiles(name, photo, specialty, clinic_name, clinic_address, city)
    `)
    .eq('patient_id', userId)
    .order('start_datetime', { ascending: false });

  if (error || !data) return [];

  return data.map((row) => {
    const dp = row.doctor_profiles as Record<string, unknown> || {};
    const doctorName = (dp.name as string) || 'Dr. Specialist';
    const doctorPhoto = (dp.photo as string) || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=600';
    return {
      id: row.id as string,
      doctorId: row.doctor_id as string,
      doctorName,
      doctorSpecialty: (dp.specialty as string) || '',
      doctorPhoto,
      clinicName: (dp.clinic_name as string) || '',
      clinicAddress: (dp.clinic_address as string) || '',
      city: (dp.city as string) || '',
      appointmentType: row.consultation_type as 'video' | 'clinic',
      date: new Date(row.start_datetime as string).toLocaleDateString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata'
      }),
      timeSlot: (() => {
        const start = new Date(row.start_datetime as string);
        const startStr = start.toLocaleTimeString('en-IN', {
          hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
        }).replace(/\bam\b/, 'AM').replace(/\bpm\b/, 'PM');
        const endStr = row.end_datetime
          ? new Date(row.end_datetime as string).toLocaleTimeString('en-IN', {
              hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
            }).replace(/\bam\b/, 'AM').replace(/\bpm\b/, 'PM')
          : computeSlotEndTime(startStr, 30);
        return `${startStr} – ${endStr}`;
      })(),
      patientName: (row.patient_name as string) || '',
      patientAge: (row.patient_age as number) || 0,
      patientGender: (row.patient_gender as 'Male' | 'Female' | 'Other') || 'Male',
      patientPhone: (row.patient_phone as string) || '',
      patientEmail: (row.patient_email as string) || '',
      visitReason: (row.symptoms as string) || '',
      feeINR: (row.fee_inr as number) || 0,
      platformFeeINR: (row.platform_fee_inr as number) || 0,
      taxesINR: (row.taxes_inr as number) || 0,
      totalINR: (row.total_inr as number) || 0,
      status: row.status as 'upcoming' | 'completed' | 'cancelled',
      paymentMethod: 'UPI' as const,
      paymentTransactionId: row.id as string,
      createdAt: new Date(row.created_at as string).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata'
      }),
      videoLink: (row.video_link as string) || undefined,
      consultationNotes: (row.consultation_notes as string) || undefined,
    } as Appointment;
  });
}

/**
 * Cancels an appointment in Supabase (or no-op in demo mode).
 */
export async function cancelAppointmentInDB(id: string, reason?: string): Promise<void> {
  if (!SUPABASE_CONFIGURED) return;
  await patientSupabase
    .from('appointments')
    .update({ status: 'cancelled', cancellation_reason: reason || 'Patient requested cancellation' })
    .eq('id', id);
}

/**
 * Reschedules an appointment in Supabase (or no-op in demo mode).
 */
export async function rescheduleAppointmentInDB(
  id: string,
  newDate: string,
  newTimeSlot: string
): Promise<void> {
  if (!SUPABASE_CONFIGURED) return;
  const dateObj = resolveDate(newDate);
  const { h, m } = parseTime(newTimeSlot);
  dateObj.setHours(h, m, 0, 0);
  await patientSupabase
    .from('appointments')
    .update({ start_datetime: dateObj.toISOString(), status: 'upcoming' })
    .eq('id', id);
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
  const clean = timeStr.trim().replace(/\s*–\s*.*$/, ''); // strip " – end" if present
  const [time, period] = clean.trim().split(' ');
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (period?.toUpperCase() === 'PM' && h !== 12) h += 12;
  if (period?.toUpperCase() === 'AM' && h === 12) h = 0;
  return { h, m };
}

export { genReceiptNumber };
