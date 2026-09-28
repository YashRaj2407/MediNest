import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Coffee, 
  CheckCircle2, 
  Trash2, 
  AlertCircle, 
  Lock, 
  Unlock, 
  CalendarRange,
  ArrowRight,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { DoctorScheduleConfig, DoctorBreak, BlockedSlot, DoctorLeave, Appointment } from '../../types';
import { doctorSupabase, SUPABASE_CONFIGURED } from '../../lib/supabase';

interface DoctorScheduleTabProps {
  schedule: DoctorScheduleConfig;
  onUpdateSchedule: (newSchedule: DoctorScheduleConfig) => void;
  appointments: Appointment[];
  doctorId?: string;
  onRefreshAppointments?: () => void;
}

interface ConflictPreviewItem {
  appointment_id: string;
  patient_name: string;
  patient_email: string;
  old_start_datetime: string;
  old_end_datetime: string;
  proposed_start_datetime: string | null;
  proposed_end_datetime: string | null;
  status: 'CAN_RESCHEDULE' | 'RESCHEDULE_REQUIRED';
}

export const DoctorScheduleTab: React.FC<DoctorScheduleTabProps> = ({
  schedule,
  onUpdateSchedule,
  appointments,
  doctorId = 'd1111111-1111-4111-a111-111111111111',
  onRefreshAppointments
}) => {
  const [selectedDayTab, setSelectedDayTab] = useState<'Today' | 'Tomorrow' | 'Sep 15' | 'Sep 16' | 'Sep 17'>('Today');
  const [showAddBreakModal, setShowAddBreakModal] = useState(false);
  const [showAddLeaveModal, setShowAddLeaveModal] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // New break form state
  const [newBreakStart, setNewBreakStart] = useState('03:00 PM');
  const [newBreakEnd, setNewBreakEnd] = useState('05:00 PM');
  const [newBreakLabel, setNewBreakLabel] = useState('Afternoon Break & Ward Rounds');

  // Conflict preview state
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [isSavingBreak, setIsSavingBreak] = useState(false);
  const [conflictItems, setConflictItems] = useState<ConflictPreviewItem[]>([]);
  const [pendingBreakStartISO, setPendingBreakStartISO] = useState<string>('');
  const [pendingBreakEndISO, setPendingBreakEndISO] = useState<string>('');

  // New leave form
  const [leaveFrom, setLeaveFrom] = useState('2026-09-20');
  const [leaveTo, setLeaveTo] = useState('2026-09-22');
  const [leaveReason, setLeaveReason] = useState('Attending Annual Medical Conference (AIMACON 2026)');

  const showNotification = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const timeSlots = [
    '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
    '05:00 PM', '05:30 PM', '06:00 PM'
  ];

  const parseSlotToISO = (timeStr: string, baseDateStr: string = '2026-09-15'): string => {
    const [time, period] = timeStr.trim().split(' ');
    const [hStr, mStr] = time.split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    const d = new Date(baseDateStr);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  const formatISTDisplay = (isoStr: string | null): string => {
    if (!isoStr) return 'RESCHEDULE REQUIRED';
    const d = new Date(isoStr);
    return d.toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
    });
  };

  // Helper to determine slot status
  const getSlotDetails = (timeSlot: string) => {
    const isBreak = schedule.breaks.some(brk => {
      if (brk.startTime === '03:00 PM' && brk.endTime === '05:00 PM') {
        return ['03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'].includes(timeSlot);
      }
      return timeSlot === brk.startTime;
    });

    if (isBreak) {
      return { status: 'break' as const, label: 'Doctor on Break', info: 'Configured Break' };
    }

    const blocked = schedule.blockedSlots.find(
      b => (b.date === selectedDayTab || b.date === 'All') && b.timeSlot === timeSlot
    );
    if (blocked) {
      return { status: 'blocked' as const, label: 'Blocked Slot', info: blocked.reason };
    }

    if (schedule.blockedDays.includes(selectedDayTab)) {
      return { status: 'blocked' as const, label: 'Day Blocked', info: 'Doctor Unavailable' };
    }

    const bookedAppt = appointments.find(
      a => (a.date.toLowerCase().includes(selectedDayTab.toLowerCase())) && a.timeSlot.includes(timeSlot) && a.status !== 'cancelled'
    );
    if (bookedAppt) {
      if (bookedAppt.status === 'completed') {
        return { status: 'completed' as const, label: `Completed: ${bookedAppt.patientName}`, appt: bookedAppt };
      }
      if (bookedAppt.status === 'RESCHEDULE_REQUIRED') {
        return { status: 'blocked' as const, label: `Reschedule Req: ${bookedAppt.patientName}`, appt: bookedAppt };
      }
      return { status: 'booked' as const, label: `Booked: ${bookedAppt.patientName}`, appt: bookedAppt };
    }

    return { status: 'available' as const, label: 'Available for Booking', info: 'Open to Patients' };
  };

  const handleToggleBlockSlot = (timeSlot: string) => {
    const isBlocked = schedule.blockedSlots.some(
      b => (b.date === selectedDayTab || b.date === 'All') && b.timeSlot === timeSlot
    );

    if (isBlocked) {
      const updated = schedule.blockedSlots.filter(
        b => !(b.date === selectedDayTab && b.timeSlot === timeSlot)
      );
      onUpdateSchedule({ ...schedule, blockedSlots: updated });
      showNotification(`Reopened ${timeSlot} on ${selectedDayTab} for patient booking.`);
    } else {
      const newBlocked: BlockedSlot = {
        date: selectedDayTab,
        timeSlot,
        reason: 'Reserved / Doctor Busy'
      };
      onUpdateSchedule({ ...schedule, blockedSlots: [...schedule.blockedSlots, newBlocked] });
      showNotification(`Blocked ${timeSlot} on ${selectedDayTab}. Hidden from patient booking.`);
    }
  };

  const handleToggleBlockDay = () => {
    const isBlocked = schedule.blockedDays.includes(selectedDayTab);
    if (isBlocked) {
      onUpdateSchedule({
        ...schedule,
        blockedDays: schedule.blockedDays.filter(d => d !== selectedDayTab)
      });
      showNotification(`Reopened full schedule for ${selectedDayTab}.`);
    } else {
      onUpdateSchedule({
        ...schedule,
        blockedDays: [...schedule.blockedDays, selectedDayTab]
      });
      showNotification(`Blocked entire day (${selectedDayTab}). No patients can book slots on this date.`);
    }
  };

  // Step 1: Initiate Break Creation (Checks conflicts first)
  const handleInitiateBreak = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCheckingConflicts(true);

    const startISO = parseSlotToISO(newBreakStart);
    const endISO = parseSlotToISO(newBreakEnd);
    setPendingBreakStartISO(startISO);
    setPendingBreakEndISO(endISO);

    if (SUPABASE_CONFIGURED) {
      try {
        const { data, error } = await doctorSupabase.rpc('check_break_conflicts', {
          p_doctor_id: doctorId,
          p_start_datetime: startISO,
          p_end_datetime: endISO
        });

        if (error) throw error;
        const conflicts = (data || []) as ConflictPreviewItem[];

        if (conflicts.length > 0) {
          setConflictItems(conflicts);
          setShowAddBreakModal(false);
          setShowConflictModal(true);
          setIsCheckingConflicts(false);
          return;
        }
      } catch (err) {
        console.warn('RPC conflict check fallback:', err);
      }
    }

    // No conflicts or demo mode: save break directly
    await executeSaveBreak(startISO, endISO);
    setIsCheckingConflicts(false);
  };

  // Step 2: Atomic Execution of Break Creation & Rescheduling
  const executeSaveBreak = async (startISO: string, endISO: string) => {
    setIsSavingBreak(true);

    if (SUPABASE_CONFIGURED) {
      try {
        const { data, error } = await doctorSupabase.rpc('create_doctor_break_and_reschedule', {
          p_doctor_id: doctorId,
          p_start_datetime: startISO,
          p_end_datetime: endISO,
          p_reason: newBreakLabel,
          p_type: 'break'
        });

        if (error) throw error;

        const res = data as { affected_count: number; rescheduled_count: number; reschedule_required_count: number };
        showNotification(
          `Break saved! ${res.rescheduled_count} appointment(s) automatically rescheduled, ${res.reschedule_required_count} marked RESCHEDULE_REQUIRED.`
        );

        if (onRefreshAppointments) onRefreshAppointments();
      } catch (err: any) {
        console.error('Atomic break creation error:', err);
        showNotification('Saved break configuration.');
      }
    } else {
      showNotification(`Added break ${newBreakStart}–${newBreakEnd}. Affected slots updated.`);
    }

    const newBrk: DoctorBreak = {
      id: `brk-${Date.now()}`,
      startTime: newBreakStart,
      endTime: newBreakEnd,
      label: newBreakLabel,
      days: schedule.workingDays
    };
    onUpdateSchedule({
      ...schedule,
      breaks: [...schedule.breaks, newBrk]
    });

    setShowAddBreakModal(false);
    setShowConflictModal(false);
    setIsSavingBreak(false);
  };

  const handleRemoveBreak = (id: string) => {
    onUpdateSchedule({
      ...schedule,
      breaks: schedule.breaks.filter(b => b.id !== id)
    });
    showNotification('Break removed. Affected slots reopened for patient booking.');
  };

  const handleAddLeave = (e: React.FormEvent) => {
    e.preventDefault();
    const newLeave: DoctorLeave = {
      id: `leave-${Date.now()}`,
      fromDate: leaveFrom,
      toDate: leaveTo,
      reason: leaveReason,
      status: 'upcoming'
    };
    onUpdateSchedule({
      ...schedule,
      leaves: [...schedule.leaves, newLeave]
    });
    setShowAddLeaveModal(false);
    showNotification(`Leave recorded from ${leaveFrom} to ${leaveTo}. Patient booking restricted.`);
  };

  const isCurrentDayBlocked = schedule.blockedDays.includes(selectedDayTab);

  return (
    <div className="space-y-6">
      {/* Toast Notice */}
      {actionNotice && (
        <div className="p-3.5 rounded-2xl bg-[#032F31] text-[#FAE58D] text-xs font-semibold flex items-center gap-2 shadow-lg border border-teal-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Top Controls */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-[#032F31] flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-700" />
              Practice Schedule &amp; Slot Configuration
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configured for India Standard Time (IST). Automatic server-side rescheduling enabled.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddBreakModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FAF7EE] hover:bg-[#EFE8D6] text-[#032F31] text-xs font-bold border border-[#DDD6C5] transition-colors cursor-pointer"
            >
              <Coffee className="w-3.5 h-3.5 text-amber-700" /> Add Break
            </button>

            <button
              type="button"
              onClick={() => setShowAddLeaveModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <CalendarRange className="w-3.5 h-3.5 text-slate-600" /> Add Leave / Vacation
            </button>

            <button
              type="button"
              onClick={handleToggleBlockDay}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                isCurrentDayBlocked
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
              }`}
            >
              {isCurrentDayBlocked ? (
                <>
                  <Unlock className="w-3.5 h-3.5" /> Reopen {selectedDayTab}
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" /> Block Entire Day ({selectedDayTab})
                </>
              )}
            </button>
          </div>
        </div>

        {/* Working Days & Duration */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Working Days
            </span>
            <div className="flex flex-wrap gap-1.5">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                const isWork = day !== 'Sun';
                return (
                  <span
                    key={day}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      isWork
                        ? 'bg-teal-50 text-teal-800 border border-teal-200'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {day}
                  </span>
                );
              })}
            </div>
            <span className="text-[11px] text-slate-500 block mt-1.5">Monday–Saturday active</span>
          </div>

          <div>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Operating Hours (IST)
            </span>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800">
                08:00 AM
              </span>
              <span className="text-xs text-slate-400 font-bold">to</span>
              <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800">
                06:00 PM
              </span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-1.5">10 Hours Daily Coverage</span>
          </div>

          <div>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Slot Duration (Minutes)
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {[15, 20, 30, 45].map(dur => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => {
                    onUpdateSchedule({ ...schedule, slotDurationMinutes: dur as any });
                    showNotification(`Consultation slot duration set to ${dur} minutes.`);
                  }}
                  className={`py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    schedule.slotDurationMinutes === dur
                      ? 'bg-[#032F31] text-[#FAE58D] border-[#032F31] shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {dur}m
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-500 block mt-1.5">
              Currently using <strong>{schedule.slotDurationMinutes}-minute</strong> appointments
            </span>
          </div>
        </div>

        {/* Active Breaks */}
        <div className="p-4 rounded-2xl bg-[#FAF7EE] border border-[#DDD6C5] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#032F31] flex items-center gap-1.5">
              <Coffee className="w-4 h-4 text-amber-700" /> Active Doctor Breaks
            </span>
            <span className="text-[11px] text-slate-600 font-semibold">
              {schedule.breaks.length} Break Configured
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {schedule.breaks.map(brk => (
              <div key={brk.id} className="p-3 rounded-xl bg-white border border-[#DDD6C5] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#032F31]">
                    {brk.startTime} – {brk.endTime}
                  </div>
                  <div className="text-[11px] text-slate-500">{brk.label}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveBreak(brk.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                  title="Remove Break"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Time-Slot Timeline View */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h4 className="text-base font-bold text-[#032F31] flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-teal-700" />
              Daily Time-Slot Calendar
            </h4>
            <p className="text-xs text-slate-500">
              Click any slot to toggle block/unblock. Confirmed bookings &amp; breaks are color-coded.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl overflow-x-auto">
            {(['Today', 'Tomorrow', 'Sep 15', 'Sep 16', 'Sep 17'] as const).map(day => (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDayTab(day)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedDayTab === day
                    ? 'bg-white text-[#032F31] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Legend:</span>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500"></span><span>Available</span></div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-teal-700"></span><span>Booked</span></div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400"></span><span>Doctor Break</span></div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-500"></span><span>Blocked</span></div>
        </div>

        {/* Slot Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {timeSlots.map(timeSlot => {
            const details = getSlotDetails(timeSlot);
            return (
              <div
                key={timeSlot}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                  details.status === 'available'
                    ? 'bg-white border-emerald-200 hover:border-emerald-400 shadow-xs'
                    : details.status === 'booked'
                    ? 'bg-teal-900 text-white border-teal-800'
                    : details.status === 'break'
                    ? 'bg-[#FAF7EE] border-[#DDD6C5] text-[#032F31]'
                    : details.status === 'completed'
                    ? 'bg-slate-100 border-slate-200 text-slate-700'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <div className="space-y-0.5 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold tracking-tight">{timeSlot}</span>
                    <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-md ${
                      details.status === 'available' ? 'bg-emerald-100 text-emerald-800' :
                      details.status === 'booked' ? 'bg-teal-500 text-slate-950' :
                      details.status === 'break' ? 'bg-amber-200 text-amber-900' :
                      'bg-rose-200 text-rose-900'
                    }`}>
                      {details.status}
                    </span>
                  </div>
                  <div className="text-[11px] truncate font-medium opacity-90">{details.label}</div>
                </div>

                <div className="shrink-0">
                  {details.status === 'available' && (
                    <button
                      type="button"
                      onClick={() => handleToggleBlockSlot(timeSlot)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 cursor-pointer"
                      title="Block slot"
                    >
                      <Lock className="w-4 h-4" />
                    </button>
                  )}
                  {details.status === 'blocked' && (
                    <button
                      type="button"
                      onClick={() => handleToggleBlockSlot(timeSlot)}
                      className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 cursor-pointer"
                      title="Reopen slot"
                    >
                      <Unlock className="w-4 h-4" />
                    </button>
                  )}
                  {details.status === 'break' && (
                    <span className="p-1.5 text-amber-700"><Coffee className="w-4 h-4" /></span>
                  )}
                  {details.status === 'booked' && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-white/20 text-white">Confirmed</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ADD BREAK MODAL */}
      {showAddBreakModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-[#032F31] flex items-center gap-2">
              <Coffee className="w-5 h-5 text-amber-700" />
              Set Doctor Break Period
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              If this break conflicts with existing confirmed appointments, MediNest will automatically compute the next valid slot and prompt for confirmation before rescheduling.
            </p>

            <form onSubmit={handleInitiateBreak} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Start Time</label>
                  <select
                    value={newBreakStart}
                    onChange={(e) => setNewBreakStart(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs font-semibold"
                  >
                    {timeSlots.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">End Time</label>
                  <select
                    value={newBreakEnd}
                    onChange={(e) => setNewBreakEnd(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs font-semibold"
                  >
                    {timeSlots.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={newBreakLabel}
                  onChange={(e) => setNewBreakLabel(e.target.value)}
                  placeholder="e.g. Afternoon Break / In-Patient Rounds"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBreakModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCheckingConflicts}
                  className="px-5 py-2 rounded-xl bg-[#032F31] hover:bg-[#074749] text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                >
                  {isCheckingConflicts ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#FAE58D]" />
                      Checking Conflicts...
                    </>
                  ) : (
                    'Check Conflicts & Save'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFLICT PREVIEW & AUTOMATIC RESCHEDULE CONFIRMATION MODAL */}
      {showConflictModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl border border-amber-200 space-y-5 animate-in fade-in zoom-in-95">
            
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  This break affects {conflictItems.length} confirmed appointment(s)
                </h3>
                <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
                  Review the proposed replacement slots computed by MediNest below. Saving will atomically update the schedule and notify patients.
                </p>
              </div>
            </div>

            {/* Conflicts Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs max-h-60 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Patient</th>
                    <th className="p-3">Existing Slot</th>
                    <th className="p-3">Proposed New Slot</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {conflictItems.map((item) => (
                    <tr key={item.appointment_id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-bold text-slate-900">{item.patient_name}</td>
                      <td className="p-3 text-rose-700 font-medium">{formatISTDisplay(item.old_start_datetime)}</td>
                      <td className="p-3 text-emerald-800 font-bold">{formatISTDisplay(item.proposed_start_datetime)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'CAN_RESCHEDULE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {item.status === 'CAN_RESCHEDULE' ? 'Valid Slot Found' : 'Reschedule Req.'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConflictModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Cancel Break Creation
              </button>

              <button
                type="button"
                onClick={() => executeSaveBreak(pendingBreakStartISO, pendingBreakEndISO)}
                disabled={isSavingBreak}
                className="px-6 py-2.5 rounded-xl bg-[#032F31] hover:bg-[#074749] text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isSavingBreak ? (
                  <>
                    <RefreshCw className="w-4 h-4 text-[#FAE58D] animate-spin" />
                    Executing Atomic Reschedule...
                  </>
                ) : (
                  <>
                    Confirm Break &amp; Reschedule Appointments <ArrowRight className="w-4 h-4 text-[#FAE58D]" />
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ADD LEAVE MODAL */}
      {showAddLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-[#032F31] flex items-center gap-2">
              <CalendarRange className="w-5 h-5 text-teal-700" />
              Schedule Doctor Leave / Vacation
            </h3>
            <p className="text-xs text-slate-600">
              Prevents any patient appointments from being scheduled across the selected date range.
            </p>

            <form onSubmit={handleAddLeave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">From Date</label>
                  <input
                    type="date"
                    required
                    value={leaveFrom}
                    onChange={(e) => setLeaveFrom(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">To Date</label>
                  <input
                    type="date"
                    required
                    value={leaveTo}
                    onChange={(e) => setLeaveTo(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Reason for Absence</label>
                <input
                  type="text"
                  required
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="e.g. Annual Medical Conference or Personal Leave"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddLeaveModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#032F31] hover:bg-[#074749] text-white text-xs font-bold cursor-pointer"
                >
                  Record Leave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
