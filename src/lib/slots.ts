import { supabase, SUPABASE_CONFIGURED } from './supabase';
import { Appointment } from '../types';

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
 * Generate time slots for a given doctor + date.
 *
 * In demo mode (no Supabase), generates 30-min slots 9 AM – 6 PM
 * with deterministic booked/break patterns from static appointment data.
 *
 * In Supabase mode, uses real availability rules, blocks, and booked appointments.
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

  const weekday = targetDate.toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' });

  // Default working hours and slot duration
  let startH = 9, startM = 0, endH = 18, endM = 0, slotDuration = 30;

  if (SUPABASE_CONFIGURED) {
    // Fetch availability rules from Supabase
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
  }

  // Generate raw slot times
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

  // Mark expired slots (in the past)
  const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

  if (SUPABASE_CONFIGURED) {
    // Fetch blocks (breaks, leaves) from Supabase
    const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd   = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999);

    const { data: blocks } = await supabase
      .from('doctor_schedule_blocks')
      .select('*')
      .eq('doctor_id', doctorId)
      .gte('start_datetime', dayStart.toISOString())
      .lte('end_datetime', dayEnd.toISOString());

    // Fetch booked appointments
    const { data: bookedAppts } = await supabase
      .from('appointments')
      .select('start_datetime, end_datetime')
      .eq('doctor_id', doctorId)
      .gte('start_datetime', dayStart.toISOString())
      .lte('start_datetime', dayEnd.toISOString())
      .in('status', ['upcoming', 'completed']);

    // Fetch active payment holds
    const { data: activeHolds } = await supabase
      .from('slot_holds')
      .select('slot_datetime')
      .eq('doctor_id', doctorId)
      .gt('expires_at', new Date().toISOString())
      .eq('confirmed', false);

    for (const slot of slots) {
      const { h, m } = parseTime(slot.time);
      const slotDate = new Date(targetDate);
      slotDate.setHours(h, m, 0, 0);

      if (slotDate < nowIST) {
        slot.status = 'expired';
        continue;
      }

      // Check against blocks
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

      // Check against active payment holds
      for (const hold of (activeHolds || [])) {
        const holdDate = new Date(hold.slot_datetime as string);
        if (
          slotDate.getHours() === holdDate.getHours() &&
          slotDate.getMinutes() === holdDate.getMinutes() &&
          slotDate.getDate() === holdDate.getDate()
        ) {
          slot.status = 'blocked';
          slot.label = 'Payment Pending';
          break;
        }
      }
      if (slot.status !== 'available') continue;

      // Check against booked appointments
      for (const appt of (bookedAppts || [])) {
        const apptStart = new Date(appt.start_datetime as string);
        if (
          slotDate.getHours() === apptStart.getHours() &&
          slotDate.getMinutes() === apptStart.getMinutes()
        ) {
          slot.status = 'booked';
          break;
        }
      }
    }
  } else {
    // Demo mode: mark some slots as booked/break deterministically
    const bookedTimes = existingAppointments
      .filter(a => a.doctorId === doctorId && a.status === 'upcoming')
      .map(a => a.timeSlot);

    for (const slot of slots) {
      const { h, m } = parseTime(slot.time);
      const slotDate = new Date(targetDate);
      slotDate.setHours(h, m, 0, 0);

      if (slotDate < nowIST) {
        slot.status = 'expired';
      } else if (bookedTimes.includes(slot.time)) {
        slot.status = 'booked';
      } else if (h >= 13 && h < 14) {
        // 1 PM – 2 PM: Lunch break
        slot.status = 'break';
        slot.label = 'Doctor on Break';
      }
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
