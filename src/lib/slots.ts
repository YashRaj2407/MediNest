import { Appointment } from '../types';
import { supabase, SUPABASE_CONFIGURED } from './supabase';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export type SlotStatus = 'available' | 'booked' | 'break' | 'blocked' | 'expired' | 'selected';

export interface TimeSlot {
  time: string;        // "09:00 AM"
  timeEnd: string;     // "09:30 AM"
  status: SlotStatus;
  label?: string;      // e.g. "Doctor on Break"
}

/** Format a Date to "09:30 AM" in IST */
function formatIST(date: Date): string {
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).replace(/\bam\b/, 'AM').replace(/\bpm\b/, 'PM');
}

/** Parse "09:30 AM" into hours + minutes */
function parseTime(timeStr: string): { h: number; m: number } {
  const [time, period] = timeStr.trim().split(' ');
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return { h, m };
}

/**
 * Generate time slots for a given doctor + date via Express API (or Supabase / static fallback).
 */
export async function generateSlots(
  doctorId: string,
  dateStr: string, // "Today", "Tomorrow", or "YYYY-MM-DD"
  existingAppointments: Appointment[] = []
): Promise<TimeSlot[]> {

  // Resolve date to a real Date object (IST)
  const now = new Date();
  let targetDate: Date;
  if (dateStr === 'Today' || dateStr.startsWith('Today')) {
    targetDate = new Date(now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  } else if (dateStr === 'Tomorrow' || dateStr.startsWith('Tomorrow')) {
    targetDate = new Date(now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
    targetDate.setDate(targetDate.getDate() + 1);
  } else {
    targetDate = new Date(dateStr);
  }

  const isoDate = targetDate.toISOString().slice(0, 10);

  // 1. Try Express API backend first
  try {
    const res = await fetch(`${API_BASE_URL}/slots?doctorId=${encodeURIComponent(doctorId)}&date=${encodeURIComponent(isoDate)}`);
    if (res.ok) {
      const body = await res.json();
      if (body.success && Array.isArray(body.data) && body.data.length > 0) {
        return body.data as TimeSlot[];
      }
    }
  } catch (_err) {}

  // 2. Fallback to Supabase mode if configured
  const weekday = targetDate.toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' });
  let startH = 9, startM = 0, endH = 18, endM = 0, slotDuration = 30;

  if (SUPABASE_CONFIGURED) {
    try {
      const { data: rules } = await supabase
        .from('doctor_availability_rules')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('weekday', weekday)
        .maybeSingle();

      if (rules) {
        const [sh, sm] = (rules.start_time as string).split(':').map(Number);
        const [eh, em] = (rules.end_time as string).split(':').map(Number);
        startH = sh; startM = sm; endH = eh; endM = em;
        slotDuration = rules.slot_duration_minutes as number;
      }
    } catch (_) {}
  }

  const slots: TimeSlot[] = [];
  const cursor = new Date(targetDate);
  cursor.setHours(startH, startM, 0, 0);
  const endTime = new Date(targetDate);
  endTime.setHours(endH, endM, 0, 0);

  while (cursor < endTime) {
    const slotStart = new Date(cursor);
    cursor.setMinutes(cursor.getMinutes() + slotDuration);
    const slotEnd = new Date(cursor);
    slots.push({
      time: formatIST(slotStart),
      timeEnd: formatIST(slotEnd),
      status: 'available',
    });
  }

  const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

  if (SUPABASE_CONFIGURED) {
    try {
      const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0);
      const dayEnd   = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999);

      const { data: blocks } = await supabase
        .from('doctor_schedule_blocks')
        .select('*')
        .eq('doctor_id', doctorId)
        .gte('start_datetime', dayStart.toISOString())
        .lte('end_datetime', dayEnd.toISOString());

      const { data: bookedAppts } = await supabase
        .from('appointments')
        .select('start_datetime, end_datetime')
        .eq('doctor_id', doctorId)
        .gte('start_datetime', dayStart.toISOString())
        .lte('start_datetime', dayEnd.toISOString())
        .in('status', ['upcoming', 'completed']);

      for (const slot of slots) {
        const { h, m } = parseTime(slot.time);
        const slotDate = new Date(targetDate);
        slotDate.setHours(h, m, 0, 0);

        if (slotDate < nowIST) {
          slot.status = 'expired';
          continue;
        }

        for (const block of (blocks || [])) {
          const blockStart = new Date(block.start_datetime as string);
          const blockEnd   = new Date(block.end_datetime as string);
          if (slotDate >= blockStart && slotDate < blockEnd) {
            slot.status = block.type === 'break' ? 'break' : 'blocked';
            slot.label  = block.type === 'break' ? 'Doctor on Break' : (block.reason as string || 'Unavailable');
            break;
          }
        }
        if (slot.status !== 'available') continue;

        for (const appt of (bookedAppts || [])) {
          const apptStart = new Date(appt.start_datetime as string);
          if (slotDate.getHours() === apptStart.getHours() && slotDate.getMinutes() === apptStart.getMinutes()) {
            slot.status = 'booked';
            break;
          }
        }
      }
      return slots;
    } catch (_) {}
  }

  // Demo fallback
  const bookedTimes = existingAppointments
    .filter(a => a.doctorId === doctorId && a.status === 'upcoming')
    .map(a => a.timeSlot);

  for (const slot of slots) {
    const { h } = parseTime(slot.time);
    const slotDate = new Date(targetDate);
    slotDate.setHours(h, 0, 0, 0);

    if (slotDate < nowIST) {
      slot.status = 'expired';
    } else if (bookedTimes.includes(slot.time)) {
      slot.status = 'booked';
    } else if (h >= 13 && h < 14) {
      slot.status = 'break';
      slot.label = 'Doctor on Break';
    }
  }

  return slots;
}

/** Format a readable date+time for summary display */
export function formatSlotSummary(dateStr: string, slotTime: string, slotTimeEnd: string): string {
  let displayDate = dateStr;
  if (dateStr === 'Today' || dateStr.startsWith('Today')) {
    displayDate = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata'
    });
  } else if (dateStr === 'Tomorrow' || dateStr.startsWith('Tomorrow')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    displayDate = tomorrow.toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata'
    });
  }
  return `${displayDate}, ${slotTime} – ${slotTimeEnd}`;
}
