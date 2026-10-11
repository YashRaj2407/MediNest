import { Appointment } from '../types';

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
 * Generate time slots for a given doctor + date via Express API (or static fallback).
 */
export async function generateSlots(
  doctorId: string,
  dateStr: string, // "Today", "Tomorrow", or "YYYY-MM-DD"
  existingAppointments: Appointment[] = [],
  acceptingAppointments: boolean = true
): Promise<TimeSlot[]> {

  // Resolve date to a real Date object (IST)
  const now = new Date();
  let targetDate: Date;
  let isoDate: string;
  if (dateStr === 'Today' || dateStr.startsWith('Today')) {
    targetDate = new Date(now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
    isoDate = targetDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  } else if (dateStr === 'Tomorrow' || dateStr.startsWith('Tomorrow')) {
    targetDate = new Date(now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
    targetDate.setDate(targetDate.getDate() + 1);
    isoDate = targetDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    isoDate = dateStr;
    targetDate = new Date(`${dateStr}T12:00:00+05:30`);
  } else {
    targetDate = new Date(dateStr);
    isoDate = targetDate.toISOString().slice(0, 10);
  }

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

  // 2. Generate slots locally
  const weekday = targetDate.toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' });
  let startH = 9, startM = 0, endH = 18, endM = 0, slotDuration = 30;

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

  if (acceptingAppointments === false) {
    for (const slot of slots) {
      slot.status = 'blocked';
      slot.label = 'Appointments Paused';
    }
    return slots;
  }

  const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

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
