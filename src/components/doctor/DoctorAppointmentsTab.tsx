import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Search, 
  Filter, 
  Video, 
  Building2, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Edit3, 
  MessageSquare, 
  Phone, 
  Mail, 
  AlertCircle,
  CalendarCheck,
  User,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { Appointment, Prescription } from '../../types';

interface DoctorAppointmentsTabProps {
  appointments: Appointment[];
  onStartVideoRoom: (appointment: Appointment) => void;
  onOpenPrescription: (appointment: Appointment) => void;
  onMarkCompleted: (appointmentId: string) => void;
  onRescheduleAppointment: (appointmentId: string, newDate: string, newTime: string) => void;
  onCancelAppointment: (appointmentId: string, reason: string) => void;
  onUpdateNotes: (appointmentId: string, notes: string) => void;
}

export const DoctorAppointmentsTab: React.FC<DoctorAppointmentsTabProps> = ({
  appointments,
  onStartVideoRoom,
  onOpenPrescription,
  onMarkCompleted,
  onRescheduleAppointment,
  onCancelAppointment,
  onUpdateNotes
}) => {
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'completed' | 'cancelled'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'video' | 'clinic'>('all');

  // Interactive Modal States
  const [rescheduleModalAppt, setRescheduleModalAppt] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState('Tomorrow, Sep 12');
  const [newTime, setNewTime] = useState('02:30 PM');

  const [cancelModalAppt, setCancelModalAppt] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('Emergency hospital admission / surgery duty');

  const [notesModalAppt, setNotesModalAppt] = useState<Appointment | null>(null);
  const [currentNotes, setCurrentNotes] = useState('');

  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 4500);
  };

  // Filter appointments
  const filteredAppointments = appointments.filter(appt => {
    // 1. Tab check
    if (activeTab === 'today') {
      if (appt.status === 'cancelled') return false;
      const isToday = (appt.date || '').toLowerCase().includes('today') || (appt.date || '').toLowerCase().includes('sep 11');
      if (!isToday && appt.status !== 'upcoming') return false;
      if (!isToday) return false;
    } else if (activeTab === 'upcoming') {
      if (appt.status !== 'upcoming') return false;
      const isToday = (appt.date || '').toLowerCase().includes('today') || (appt.date || '').toLowerCase().includes('sep 11');
      if (isToday) return false;
    } else if (activeTab === 'completed') {
      if (appt.status !== 'completed') return false;
    } else if (activeTab === 'cancelled') {
      if (appt.status !== 'cancelled') return false;
    }

    // 2. Mode check
    if (filterMode !== 'all' && appt.appointmentType !== filterMode) return false;

    // 3. Search check
    if (searchQuery.trim()) {
      const q = (searchQuery || '').toLowerCase();
      return (
        (appt.patientName || '').toLowerCase().includes(q) ||
        (appt.id || '').toLowerCase().includes(q) ||
        (appt.patientPhone || '').toLowerCase().includes(q) ||
        (appt.visitReason || '').toLowerCase().includes(q)
      );
    }

    return true;
  });

  const handleConfirmReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleModalAppt) return;
    onRescheduleAppointment(rescheduleModalAppt.id, newDate, newTime);
    showNotification(
      `Patient ${rescheduleModalAppt.patientName} has been notified via SMS (+91 ${rescheduleModalAppt.patientPhone}) and Email of the rescheduled slot on ${newDate} at ${newTime}.`
    );
    setRescheduleModalAppt(null);
  };

  const handleConfirmCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalAppt) return;
    onCancelAppointment(cancelModalAppt.id, cancelReason);
    showNotification(
      `Appointment cancelled. Patient ${cancelModalAppt.patientName} notified via SMS & WhatsApp. Full refund of ₹${cancelModalAppt.totalINR} processed to original payment method.`
    );
    setCancelModalAppt(null);
  };

  const handleSaveNotes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notesModalAppt) return;
    onUpdateNotes(notesModalAppt.id, currentNotes);
    showNotification(`Consultation notes saved for ${notesModalAppt.patientName}.`);
    setNotesModalAppt(null);
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {actionFeedback && (
        <div className="p-4 rounded-2xl bg-[#032F31] text-[#FAE58D] text-xs font-semibold flex items-start gap-3 shadow-xl border border-teal-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-white block mb-0.5">Patient Notification Dispatched:</span>
            {actionFeedback}
          </div>
        </div>
      )}

      {/* Top Filter & Search Bar */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        {/* Status Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('today')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'today'
                  ? 'bg-[#032F31] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today ({appointments.filter(a => ((a.date || '').toLowerCase().includes('today') || (a.date || '').toLowerCase().includes('sep 11')) && a.status !== 'cancelled').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upcoming')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'upcoming'
                  ? 'bg-[#032F31] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Upcoming ({appointments.filter(a => a.status === 'upcoming' && !(a.date || '').toLowerCase().includes('today') && !(a.date || '').toLowerCase().includes('sep 11')).length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('completed')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'completed'
                  ? 'bg-[#032F31] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Completed ({appointments.filter(a => a.status === 'completed').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cancelled')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'cancelled'
                  ? 'bg-[#032F31] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cancelled ({appointments.filter(a => a.status === 'cancelled').length})
            </button>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mode:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                  filterMode === 'all' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('video')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                  filterMode === 'video' ? 'bg-white text-teal-800 font-bold shadow-xs' : 'text-slate-600'
                }`}
              >
                Video
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('clinic')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                  filterMode === 'clinic' ? 'bg-white text-teal-800 font-bold shadow-xs' : 'text-slate-600'
                }`}
              >
                In-Clinic
              </button>
            </div>
          </div>
        </div>

        {/* Search Field */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by patient name, mobile number, appointment ID, or symptoms..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
          />
        </div>
      </div>

      {/* Appointment Cards List */}
      <div className="space-y-4">
        {filteredAppointments.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 space-y-2">
            <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">No appointments found</h4>
            <p className="text-xs text-slate-500">There are no consultations matching your selected criteria.</p>
          </div>
        ) : (
          filteredAppointments.map(appt => {
            const isVideo = appt.appointmentType === 'video';
            const isUpcoming = appt.status === 'upcoming';
            const isCompleted = appt.status === 'completed';
            const isCancelled = appt.status === 'cancelled';

            return (
              <div
                key={appt.id}
                className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#032F31] text-[#FAE58D] flex items-center justify-center font-bold text-sm shrink-0">
                      {appt.patientName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-[#032F31]">
                          {appt.patientName}
                        </h4>
                        <span className="text-[11px] font-semibold text-slate-500">
                          ({appt.patientAge}y, {appt.patientGender})
                        </span>
                        <span
                          className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                            isUpcoming
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : isCompleted
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-rose-100 text-rose-900 border border-rose-300'
                          }`}
                        >
                          {appt.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>ID: {appt.id}</span>
                        <span>•</span>
                        <span>Booked: {appt.createdAt}</span>
                      </div>
                    </div>
                  </div>

                  {/* Date & Time Slot Badge */}
                  <div className="flex items-center gap-2 sm:text-right">
                    <div className="px-3 py-1.5 rounded-xl bg-[#FAF7EE] border border-[#DDD6C5] flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-teal-800 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-[#032F31]">{appt.timeSlot}</div>
                        <div className="text-[10px] text-slate-500">{appt.date} (IST)</div>
                      </div>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-1.5">
                      {isVideo ? (
                        <Video className="w-3.5 h-3.5 text-teal-600" />
                      ) : (
                        <Building2 className="w-3.5 h-3.5 text-teal-600" />
                      )}
                      <span className="text-xs font-bold text-slate-800">
                        {isVideo ? 'Video' : 'Clinic'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Patient Complaint & Details */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                  <div className="md:col-span-8 p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Chief Complaint / Reason for Visit
                    </span>
                    <p className="font-semibold text-slate-800 leading-relaxed">
                      {appt.visitReason}
                    </p>
                    {appt.consultationNotes && (
                      <div className="pt-2 mt-2 border-t border-slate-200">
                        <span className="text-[10px] font-bold text-teal-800 uppercase block mb-0.5">
                          Doctor's Clinical Notes:
                        </span>
                        <p className="text-slate-600 text-[11px] italic">
                          {appt.consultationNotes}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-4 p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Contact & Payment Info
                    </span>
                    <div className="space-y-1 text-[11px] text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{appt.patientPhone}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{appt.patientEmail}</span>
                      </div>
                      <div className="pt-1 flex items-center justify-between font-semibold">
                        <span className="text-slate-500">Paid Amount:</span>
                        <span className="text-emerald-700 font-bold">₹{appt.totalINR} ({appt.paymentMethod})</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons Bar */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* Clinical Notes */}
                    <button
                      type="button"
                      onClick={() => {
                        setNotesModalAppt(appt);
                        setCurrentNotes(appt.consultationNotes || '');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      {appt.consultationNotes ? 'Edit Notes' : 'Add Notes'}
                    </button>

                    {/* Prescription */}
                    <button
                      type="button"
                      onClick={() => onOpenPrescription(appt)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-200 bg-teal-50/60 hover:bg-teal-100 text-teal-800 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-teal-700" />
                      {appt.prescription ? 'View e-Prescription (Rx)' : 'Upload / Issue Rx'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {isUpcoming && isVideo && (
                      <button
                        type="button"
                        onClick={() => onStartVideoRoom(appt)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                      >
                        <Video className="w-3.5 h-3.5 text-[#FAE58D]" />
                        Start Video Consultation
                      </button>
                    )}

                    {isUpcoming && (
                      <>
                        <button
                          type="button"
                          onClick={() => onMarkCompleted(appt.id)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#032F31] hover:bg-[#074749] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Mark Completed
                        </button>

                        <button
                          type="button"
                          onClick={() => setRescheduleModalAppt(appt)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-slate-500" /> Reschedule
                        </button>

                        <button
                          type="button"
                          onClick={() => setCancelModalAppt(appt)}
                          className="p-2 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
                          title="Cancel Appointment"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {isCompleted && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Consultation Done
                      </span>
                    )}

                    {isCancelled && (
                      <span className="text-xs text-rose-600 font-semibold italic">
                        Cancelled ({appt.cancellationReason || 'Doctor unavailable'})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* RESCHEDULE MODAL */}
      {rescheduleModalAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-[#032F31] flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-teal-700" />
              Reschedule Appointment
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Rescheduling for <strong className="text-slate-800">{rescheduleModalAppt.patientName}</strong>. The patient will immediately receive an automated confirmation SMS and email with their new slot.
            </p>

            <form onSubmit={handleConfirmReschedule} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Select New Date
                </label>
                <select
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                >
                  <option value="Today">Today (Sep 11)</option>
                  <option value="Tomorrow, Sep 12">Tomorrow, Sep 12</option>
                  <option value="Sep 13, 2026">Sunday, Sep 13, 2026</option>
                  <option value="Sep 14, 2026">Monday, Sep 14, 2026</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Select New Available Slot (IST)
                </label>
                <select
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                >
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="10:30 AM">10:30 AM</option>
                  <option value="11:30 AM">11:30 AM</option>
                  <option value="02:30 PM">02:30 PM</option>
                  <option value="05:30 PM">05:30 PM</option>
                </select>
                <p className="text-[10px] text-amber-700 mt-1">
                  Note: Slots between 03:00 PM – 05:00 PM are excluded due to your configured afternoon break.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRescheduleModalAppt(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#032F31] hover:bg-[#074749] text-white text-xs font-bold cursor-pointer"
                >
                  Notify Patient & Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {cancelModalAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-rose-700 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              Cancel Patient Appointment
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cancelling appointment for <strong className="text-slate-800">{cancelModalAppt.patientName}</strong>. A 100% full refund of ₹{cancelModalAppt.totalINR} will be initiated, and the patient will receive an instant SMS notification.
            </p>

            <form onSubmit={handleConfirmCancel} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Reason for Cancellation
                </label>
                <input
                  type="text"
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Unforeseen clinical emergency / Hospital duty"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCancelModalAppt(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                >
                  Confirm Cancellation & Refund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NOTES MODAL */}
      {notesModalAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-[#032F31] flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-teal-700" />
              Clinical Consultation Notes
            </h3>
            <p className="text-xs text-slate-600">
              Patient: <strong className="text-slate-800">{notesModalAppt.patientName}</strong> ({notesModalAppt.patientAge}y, {notesModalAppt.patientGender})
            </p>

            <form onSubmit={handleSaveNotes} className="space-y-3">
              <textarea
                rows={6}
                value={currentNotes}
                onChange={(e) => setCurrentNotes(e.target.value)}
                placeholder="Enter clinical examination notes, vitals, history of present illness, advice..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-teal-700"
              />

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNotesModalAppt(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#032F31] hover:bg-[#074749] text-white text-xs font-bold cursor-pointer"
                >
                  Save Notes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
