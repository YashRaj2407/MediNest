import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Video, 
  Building2, 
  Download, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle2, 
  Trash2, 
  Star, 
  CreditCard, 
  User, 
  Phone, 
  Mail,
  ShieldCheck
} from 'lucide-react';
import { Appointment, Doctor, UserProfile } from '../types';
import { DoctorAvatar } from './DoctorAvatar';

interface UserDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  appointments: Appointment[];
  savedDoctors: Doctor[];
  onCancelAppointment: (appointmentId: string) => void;
  onRescheduleAppointment: (appointmentId: string, newDate: string, newTime: string) => void;
  onViewReceipt: (appointment: Appointment) => void;
  onBookDoctorAgain: (doctor: Doctor) => void;
  onLogout: () => void;
}

export const UserDashboardModal: React.FC<UserDashboardModalProps> = ({
  isOpen,
  onClose,
  user,
  appointments,
  savedDoctors,
  onCancelAppointment,
  onRescheduleAppointment,
  onViewReceipt,
  onBookDoctorAgain,
  onLogout
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'payments' | 'saved'>('upcoming');
  const [reschedulingApptId, setReschedulingApptId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('Tomorrow, Sep 12');
  const [rescheduleSlot, setRescheduleSlot] = useState('11:00 AM');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const upcomingAppointments = appointments.filter(a => a.status === 'upcoming');
  const pastAppointments = appointments.filter(a => a.status === 'completed' || a.status === 'cancelled');

  const handleConfirmReschedule = (id: string) => {
    onRescheduleAppointment(id, rescheduleDate, rescheduleSlot);
    setReschedulingApptId(null);
    setActionNotice('Appointment successfully rescheduled! Updated details sent via SMS.');
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleCancel = (id: string) => {
    if (window.confirm('Are you sure you want to cancel? You will receive a 100% refund in INR to your original payment method.')) {
      onCancelAppointment(id);
      setActionNotice('Appointment cancelled. ₹ Refund initiated to your source account.');
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-[#0C182B] text-white p-6 sm:p-8 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
                {(user.name || 'P').charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-display font-medium text-white">
                    {user.name}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                    Verified Patient
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1">
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-teal-400" /> {user.phone}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-teal-400" /> {user.email}</span>
                </div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center gap-6 text-xs font-bold">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`py-3.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'upcoming'
                ? 'border-[#0C182B] text-[#0C182B]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Upcoming Appointments
            <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold">
              {upcomingAppointments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('past')}
            className={`py-3.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'past'
                ? 'border-[#0C182B] text-[#0C182B]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Past Consultations ({pastAppointments.length})
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`py-3.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'payments'
                ? 'border-[#0C182B] text-[#0C182B]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Payment History & Invoices
          </button>

          <button
            onClick={() => setActiveTab('saved')}
            className={`py-3.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'saved'
                ? 'border-[#0C182B] text-[#0C182B]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            Saved Doctors ({savedDoctors.length})
          </button>
        </div>

        {/* Notice Alert */}
        {actionNotice && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {actionNotice}
          </div>
        )}

        {/* Content Area */}
        <div className="p-6 sm:p-8 max-h-[65vh] overflow-y-auto">
          {/* TAB 1: UPCOMING APPOINTMENTS */}
          {activeTab === 'upcoming' && (
            <div className="space-y-4">
              {upcomingAppointments.length > 0 ? (
                upcomingAppointments.map((appt) => {
                  const isRescheduling = reschedulingApptId === appt.id;
                  return (
                    <div
                      key={appt.id}
                      className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-4 hover:border-slate-300 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <DoctorAvatar
                            photo={appt.doctorPhoto}
                            name={appt.doctorName}
                            className="w-12 h-12 rounded-xl border border-slate-200"
                            imgClassName="w-full h-full object-cover object-top"
                            theme="light"
                          />
                          <div>
                            <h3 className="text-sm font-bold text-[#0C182B]">{appt.doctorName}</h3>
                            <span className="text-xs text-teal-700 font-semibold">{appt.doctorSpecialty}</span>
                            <div className="text-[11px] text-slate-400">Booking ID: {appt.id}</div>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-end justify-between sm:text-right">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider border ${
                            appt.status === 'RESCHEDULE_REQUIRED'
                              ? 'bg-amber-100 text-amber-950 border-amber-300'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                          }`}>
                            {appt.status === 'RESCHEDULE_REQUIRED' ? 'Reschedule Required' : 'Upcoming'}
                          </span>
                          <span className="text-sm font-extrabold text-[#0C182B] mt-1">₹{appt.totalINR} Paid</span>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-slate-50">
                          <span className="text-[10px] font-bold text-slate-400 block mb-0.5 uppercase">Schedule</span>
                          <div className="font-bold text-slate-800">{appt.date}</div>
                          <div className="text-slate-600 font-medium">{appt.timeSlot}</div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50">
                          <span className="text-[10px] font-bold text-slate-400 block mb-0.5 uppercase">Consultation Mode</span>
                          <div className="font-bold text-slate-800 capitalize flex items-center gap-1">
                            {appt.appointmentType === 'video' ? <Video className="w-3.5 h-3.5 text-teal-600" /> : <Building2 className="w-3.5 h-3.5 text-teal-600" />}
                            {appt.appointmentType === 'video' ? 'HD Video Consultation' : 'In-Clinic Visit'}
                          </div>
                          <div className="text-slate-500 truncate">{appt.clinicName}</div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50">
                          <span className="text-[10px] font-bold text-slate-400 block mb-0.5 uppercase">Patient</span>
                          <div className="font-bold text-slate-800">{appt.patientName}</div>
                          <div className="text-slate-500">{appt.patientGender}, {appt.patientAge} Yrs</div>
                        </div>
                      </div>

                      {/* Reschedule Required Alert Banner */}
                      {appt.status === 'RESCHEDULE_REQUIRED' && (
                        <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between text-xs text-amber-950">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                            <span>Doctor schedule updated. Please select a replacement time slot.</span>
                          </div>
                          <button
                            onClick={() => setReschedulingApptId(appt.id)}
                            className="px-3 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                          >
                            Pick Slot
                          </button>
                        </div>
                      )}

                      {/* Video Link Bar if Video Appointment */}
                      {appt.appointmentType === 'video' && appt.videoLink && (
                        <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-teal-950 font-medium">
                            <Video className="w-4 h-4 text-teal-700" />
                            <span>Virtual Consultation Room ready 10 mins before slot</span>
                          </div>
                          <a
                            href={appt.videoLink}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold text-[11px]"
                          >
                            Join Video Call
                          </a>
                        </div>
                      )}

                      {/* In-Clinic Directions Bar */}
                      {appt.appointmentType === 'clinic' && (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-slate-700 font-medium truncate">
                            <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                            <span className="truncate">{appt.clinicAddress}</span>
                          </div>
                          <a
                            href={`https://maps.google.com/?q=${encodeURIComponent(appt.clinicName + ' ' + appt.clinicAddress)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold text-teal-700 hover:text-teal-900 underline shrink-0 ml-2"
                          >
                            Get Directions
                          </a>
                        </div>
                      )}

                      {/* Reschedule Inline Box */}
                      {isRescheduling ? (
                        <div className="p-4 rounded-xl bg-slate-100 border border-slate-300 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#0C182B]">Choose New Appointment Slot</span>
                            <button
                              onClick={() => setReschedulingApptId(null)}
                              className="text-xs text-slate-500 hover:text-slate-800"
                            >
                              Cancel
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <select
                              value={rescheduleDate}
                              onChange={(e) => setRescheduleDate(e.target.value)}
                              className="p-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white"
                            >
                              <option value="Tomorrow, Sep 12">Tomorrow, Sep 12</option>
                              <option value="Friday, Sep 13">Friday, Sep 13</option>
                              <option value="Saturday, Sep 14">Saturday, Sep 14</option>
                            </select>
                            <select
                              value={rescheduleSlot}
                              onChange={(e) => setRescheduleSlot(e.target.value)}
                              className="p-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white"
                            >
                              <option value="10:00 AM">10:00 AM</option>
                              <option value="11:30 AM">11:30 AM</option>
                              <option value="03:00 PM">03:00 PM</option>
                              <option value="05:30 PM">05:30 PM</option>
                            </select>
                          </div>
                          <button
                            onClick={() => handleConfirmReschedule(appt.id)}
                            className="w-full py-2 bg-[#0C182B] text-white text-xs font-bold rounded-lg hover:bg-[#152B4D]"
                          >
                            Confirm Reschedule (No Fee)
                          </button>
                        </div>
                      ) : (
                        /* Action Buttons */
                        <div className="flex flex-wrap items-center justify-between pt-2 gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setReschedulingApptId(appt.id)}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" /> Reschedule Slot
                            </button>
                            <button
                              onClick={() => handleCancel(appt.id)}
                              className="px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-xs font-bold text-rose-700 flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" /> Cancel (100% Refund)
                            </button>
                          </div>

                          <button
                            onClick={() => onViewReceipt(appt)}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" /> Download Receipt
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                  <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-800">No Upcoming Appointments</h4>
                  <p className="text-xs text-slate-500">
                    Book a consultation with India's top verified specialists today.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-2 px-4 py-2 rounded-xl bg-[#0C182B] text-white text-xs font-bold"
                  >
                    Find a Doctor Now
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PAST CONSULTATIONS */}
          {activeTab === 'past' && (
            <div className="space-y-4">
              {pastAppointments.length > 0 ? (
                pastAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <DoctorAvatar
                        photo={appt.doctorPhoto}
                        name={appt.doctorName}
                        className="w-10 h-10 rounded-xl border border-slate-200"
                        imgClassName="w-full h-full object-cover object-top"
                        theme="light"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">{appt.doctorName}</div>
                        <div className="text-[11px] text-slate-500">{appt.doctorSpecialty} • {appt.date}</div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          appt.status === 'cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {appt.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onViewReceipt(appt)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700"
                      >
                        Receipt (₹{appt.totalINR})
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 text-center py-8">
                  No past consultation history recorded.
                </p>
              )}
            </div>
          )}

          {/* TAB 3: PAYMENT HISTORY & INVOICES */}
          {activeTab === 'payments' && (
            <div className="space-y-3">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="py-2.5">Date & ID</th>
                    <th className="py-2.5">Doctor & Specialty</th>
                    <th className="py-2.5">Mode</th>
                    <th className="py-2.5">Amount (INR)</th>
                    <th className="py-2.5 text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appointments.map((appt) => (
                    <tr key={appt.id} className="hover:bg-slate-50">
                      <td className="py-3 font-mono font-bold text-[#0C182B]">
                        {appt.id}
                        <span className="block font-sans text-[10px] text-slate-400 font-normal">{appt.createdAt}</span>
                      </td>
                      <td className="py-3">
                        <span className="font-bold text-slate-800 block">{appt.doctorName}</span>
                        <span className="text-[11px] text-slate-500">{appt.doctorSpecialty}</span>
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-[10px] text-slate-700">
                          {appt.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 font-bold text-emerald-700">
                        ₹{appt.totalINR}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => onViewReceipt(appt)}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 font-bold text-[11px] text-slate-800"
                        >
                          Invoice PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: SAVED DOCTORS */}
          {activeTab === 'saved' && (
            <div className="space-y-3">
              {savedDoctors.length > 0 ? (
                savedDoctors.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <img src={doc.photo} alt={doc.name} className="w-12 h-12 rounded-xl object-cover" />
                      <div>
                        <h4 className="text-xs font-bold text-[#0C182B]">{doc.name}</h4>
                        <p className="text-[11px] text-teal-700 font-semibold">{doc.specialty}</p>
                        <p className="text-[11px] text-slate-500">{doc.clinicName}, {doc.city}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-800">₹{doc.feeINR}</span>
                      <button
                        onClick={() => {
                          onClose();
                          onBookDoctorAgain(doc);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#0C182B] text-white text-xs font-bold"
                      >
                        Book Slot
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-500">
                  You have not bookmarked any doctor profiles yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
