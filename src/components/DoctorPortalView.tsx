import React, { useState } from 'react';
import { 
  Stethoscope, 
  Calendar, 
  Clock, 
  CheckCircle, 
  IndianRupee, 
  Users, 
  TrendingUp, 
  Video, 
  Building2, 
  FileText, 
  LogOut, 
  ArrowLeft, 
  Bell, 
  ShieldCheck, 
  Coffee, 
  Lock, 
  Eye, 
  Sparkles,
  Settings,
  ChevronRight,
  Phone
} from 'lucide-react';
import { DoctorAuthData, DoctorScheduleConfig, Appointment, Prescription } from '../types';
import { DoctorScheduleTab } from './doctor/DoctorScheduleTab';
import { DoctorAppointmentsTab } from './doctor/DoctorAppointmentsTab';
import { DoctorPatientsTab } from './doctor/DoctorPatientsTab';
import { DoctorEarningsTab } from './doctor/DoctorEarningsTab';
import { DoctorProfileTab } from './doctor/DoctorProfileTab';
import { DoctorPrescriptionModal } from './doctor/DoctorPrescriptionModal';
import { DoctorVideoRoomModal } from './doctor/DoctorVideoRoomModal';

interface DoctorPortalViewProps {
  doctor: DoctorAuthData;
  schedule: DoctorScheduleConfig;
  appointments: Appointment[];
  onUpdateDoctor: (updatedDoctor: DoctorAuthData) => void;
  onUpdateSchedule: (newSchedule: DoctorScheduleConfig) => void;
  onUpdateAppointments: (updatedList: Appointment[]) => void;
  onBackToPatientSite: () => void;
  onDoctorLogout: () => void;
}

export const DoctorPortalView: React.FC<DoctorPortalViewProps> = ({
  doctor,
  schedule,
  appointments,
  onUpdateDoctor,
  onUpdateSchedule,
  onUpdateAppointments,
  onBackToPatientSite,
  onDoctorLogout
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'appointments' | 'patients' | 'earnings' | 'profile'>('overview');

  // Modals state
  const [activeVideoAppt, setActiveVideoAppt] = useState<Appointment | null>(null);
  const [activePrescriptionAppt, setActivePrescriptionAppt] = useState<Appointment | null>(null);

  // Filter calculations
  const todayAppts = appointments.filter(
    a => (a.date.toLowerCase().includes('today') || a.date.toLowerCase().includes('sep 11')) && a.status !== 'cancelled'
  );
  const upcomingAppts = appointments.filter(
    a => a.status === 'upcoming' && !a.date.toLowerCase().includes('today') && !a.date.toLowerCase().includes('sep 11')
  );
  const completedAppts = appointments.filter(a => a.status === 'completed');

  // Total Earnings in INR
  const totalEarningsINR = 48400 + (completedAppts.length * doctor.feeINR);

  // Next up appointment for prominent hero callout
  const nextUpAppointment = todayAppts.find(a => a.status === 'upcoming') || appointments.find(a => a.status === 'upcoming');

  // Handlers for Appointment updates
  const handleMarkCompleted = (appointmentId: string) => {
    const updated = appointments.map(a => 
      a.id === appointmentId ? { ...a, status: 'completed' as const } : a
    );
    onUpdateAppointments(updated);
  };

  const handleReschedule = (appointmentId: string, newDate: string, newTime: string) => {
    const updated = appointments.map(a => 
      a.id === appointmentId ? { ...a, date: newDate, timeSlot: newTime, status: 'upcoming' as const } : a
    );
    onUpdateAppointments(updated);
  };

  const handleCancel = (appointmentId: string, reason: string) => {
    const updated = appointments.map(a => 
      a.id === appointmentId ? { ...a, status: 'cancelled' as const, cancellationReason: reason } : a
    );
    onUpdateAppointments(updated);
  };

  const handleUpdateNotes = (appointmentId: string, notes: string) => {
    const updated = appointments.map(a => 
      a.id === appointmentId ? { ...a, consultationNotes: notes } : a
    );
    onUpdateAppointments(updated);
  };

  const handleSavePrescription = (prescription: Prescription) => {
    const updated = appointments.map(a => 
      a.id === prescription.appointmentId ? { ...a, prescription, status: 'completed' as const } : a
    );
    onUpdateAppointments(updated);
    setActivePrescriptionAppt(null);
  };

  const handleCompleteAndPrescribe = (appointmentId: string) => {
    const target = appointments.find(a => a.id === appointmentId);
    if (target) {
      handleMarkCompleted(appointmentId);
      setActiveVideoAppt(null);
      setActivePrescriptionAppt(target);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F4EE] text-slate-800 font-sans pb-16">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#032F31] text-white border-b border-teal-900 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand & Doctor Credentials */}
          <div className="flex items-center gap-4">
            <button
              onClick={onBackToPatientSite}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              title="Return to Public Patient Booking Website"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Patient Portal</span>
            </button>

            <div className="h-8 w-px bg-teal-800/80 hidden sm:block"></div>

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#FAE58D] text-[#032F31] flex items-center justify-center font-bold shadow-md shrink-0">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                    MediNest Doctor Portal
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 hidden md:inline-flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" /> NMC Verified
                  </span>
                </div>
                <p className="text-[11px] text-teal-200 truncate">
                  {doctor.name} • {doctor.specialty} ({doctor.clinicName})
                </p>
              </div>
            </div>
          </div>

          {/* Right Tools: Status, Doctor Avatar, Logout */}
          <div className="flex items-center gap-3">
            {/* Online Status Toggle */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-950/60 border border-teal-800 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-200 font-semibold">
                {doctor.acceptingNewAppointments ? 'Accepting Patients' : 'Consultations Paused'}
              </span>
            </div>

            {/* Doctor Avatar Profile */}
            <button
              onClick={() => setActiveTab('profile')}
              className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/10 hover:bg-white/15 transition-colors cursor-pointer"
              title="Edit Doctor Profile"
            >
              <img
                src={doctor.photo}
                alt={doctor.name}
                className="w-8 h-8 rounded-xl object-cover border border-[#FAE58D]"
              />
              <span className="text-xs font-bold text-white hidden sm:inline pr-1">
                {doctor.name.split(' ')[1] || doctor.name}
              </span>
            </button>

            {/* Logout Button */}
            <button
              onClick={onDoctorLogout}
              className="p-2 rounded-xl bg-white/10 hover:bg-rose-900/60 text-slate-200 hover:text-white transition-colors cursor-pointer"
              title="Sign Out of Doctor Portal"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-Header Navigation Tabs */}
        <div className="bg-[#022224] border-t border-teal-950/80 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto py-2">
            {[
              { id: 'overview', label: 'Dashboard Overview', icon: Stethoscope },
              { id: 'schedule', label: 'My Schedule & Slots', icon: Clock },
              { id: 'appointments', label: `Appointments (${appointments.length})`, icon: Calendar },
              { id: 'patients', label: 'Patient Records', icon: Users },
              { id: 'earnings', label: `Earnings (₹${totalEarningsINR.toLocaleString('en-IN')})`, icon: IndianRupee },
              { id: 'profile', label: 'Profile & Clinic Settings', icon: Settings },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                    isActive
                      ? 'bg-[#FAE58D] text-[#032F31] shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* TAB: OVERVIEW / DASHBOARD */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Welcome Greeting Banner */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#DDD6C5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
              <div className="space-y-2 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF7EE] text-[#032F31] text-xs font-bold border border-[#DDD6C5]">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Today is Friday, 11 September 2026 • India Standard Time (IST)
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#032F31]">
                  Good morning, {doctor.name}
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                  You have <strong className="text-teal-800">{todayAppts.length} appointments</strong> scheduled for today at <strong>{doctor.clinicName}</strong>. 
                  Your afternoon break is active from 03:00 PM to 05:00 PM.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 relative z-10">
                <button
                  type="button"
                  onClick={() => setActiveTab('schedule')}
                  className="px-4 py-2.5 rounded-xl bg-[#032F31] hover:bg-[#074749] text-[#FAE58D] text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  <Clock className="w-4 h-4" /> Manage Slots & Breaks
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('appointments')}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" /> View All Appointments
                </button>
              </div>
            </div>

            {/* 4 Primary Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Today's Appointments */}
              <div 
                onClick={() => setActiveTab('appointments')}
                className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs hover:border-teal-700 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-slate-500 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Today's Appointments</span>
                  <div className="w-9 h-9 rounded-2xl bg-teal-50 text-teal-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-[#032F31]">{todayAppts.length}</div>
                <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                  <span>{todayAppts.filter(a => a.appointmentType === 'video').length} Video • {todayAppts.filter(a => a.appointmentType === 'clinic').length} Clinic</span>
                  <ChevronRight className="w-4 h-4 text-teal-700" />
                </div>
              </div>

              {/* Card 2: Upcoming Appointments */}
              <div 
                onClick={() => setActiveTab('appointments')}
                className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs hover:border-teal-700 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-slate-500 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Upcoming Appointments</span>
                  <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-[#032F31]">{upcomingAppts.length}</div>
                <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                  <span>Next 7 days scheduled</span>
                  <ChevronRight className="w-4 h-4 text-teal-700" />
                </div>
              </div>

              {/* Card 3: Completed Consultations */}
              <div 
                onClick={() => setActiveTab('appointments')}
                className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs hover:border-teal-700 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-slate-500 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Completed Consultations</span>
                  <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-[#032F31]">{completedAppts.length + 94}</div>
                <div className="text-xs text-emerald-700 font-semibold mt-1 flex items-center justify-between">
                  <span>99.2% Patient Satisfaction</span>
                  <ChevronRight className="w-4 h-4 text-teal-700" />
                </div>
              </div>

              {/* Card 4: Total Earnings in INR */}
              <div 
                onClick={() => setActiveTab('earnings')}
                className="p-5 rounded-3xl bg-[#032F31] text-white shadow-xs hover:border-teal-500 transition-all cursor-pointer group border border-teal-800"
              >
                <div className="flex items-center justify-between text-[#FAE58D] mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Earnings (₹ INR)</span>
                  <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <IndianRupee className="w-4 h-4 text-[#FAE58D]" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-[#FAE58D]">
                  ₹{totalEarningsINR.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-teal-200 mt-1 flex items-center justify-between">
                  <span>₹{doctor.feeINR} / consultation</span>
                  <ChevronRight className="w-4 h-4 text-[#FAE58D]" />
                </div>
              </div>
            </div>

            {/* Next Up Consultation Spotlight Banner */}
            {nextUpAppointment && (
              <div className="p-6 rounded-3xl bg-[#FAF7EE] border-2 border-[#032F31] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#032F31] text-[#FAE58D] flex items-center justify-center font-bold text-xl shrink-0 shadow-md">
                    {nextUpAppointment.patientName.charAt(0)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-extrabold uppercase tracking-wide">
                        Next Up
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {nextUpAppointment.date} • {nextUpAppointment.timeSlot}
                      </span>
                    </div>
                    <h3 className="text-lg font-extrabold text-[#032F31]">
                      {nextUpAppointment.patientName}
                      <span className="text-xs font-normal text-slate-500 ml-2">
                        ({nextUpAppointment.patientAge} Years, {nextUpAppointment.patientGender})
                      </span>
                    </h3>
                    <p className="text-xs text-slate-700 font-medium">
                      Reason: <span className="font-semibold">{nextUpAppointment.visitReason}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {nextUpAppointment.appointmentType === 'video' ? (
                    <button
                      type="button"
                      onClick={() => setActiveVideoAppt(nextUpAppointment)}
                      className="px-5 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-2"
                    >
                      <Video className="w-4 h-4 text-[#FAE58D]" />
                      Launch HD Video Room
                    </button>
                  ) : (
                    <div className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-teal-700" />
                      In-Clinic Patient Check-In
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setActivePrescriptionAppt(nextUpAppointment)}
                    className="px-4 py-3 rounded-2xl bg-white hover:bg-slate-50 text-[#032F31] border border-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-teal-700" />
                    Issue Digital Rx
                  </button>
                </div>
              </div>
            )}

            {/* Quick Consultation Timeline Schedule */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-[#032F31] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-700" />
                    Today's Consultation Schedule (IST)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Showing booked sessions, breaks, and available slots for {doctor.name}.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('schedule')}
                  className="text-xs font-bold text-teal-700 hover:underline cursor-pointer flex items-center gap-1"
                >
                  Configure Weekly Calendar <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Today's Timeline */}
              <div className="space-y-3">
                {todayAppts.map(appt => (
                  <div
                    key={appt.id}
                    className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-extrabold text-[#032F31] font-mono shrink-0">
                        {appt.timeSlot}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#032F31]">{appt.patientName}</span>
                          <span className="text-[11px] text-slate-500">({appt.patientAge}y, {appt.patientGender})</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-100 text-teal-900">
                            {appt.appointmentType}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 truncate mt-0.5">
                          {appt.visitReason}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {appt.appointmentType === 'video' && appt.status === 'upcoming' && (
                        <button
                          type="button"
                          onClick={() => setActiveVideoAppt(appt)}
                          className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5"
                        >
                          <Video className="w-3.5 h-3.5 text-[#FAE58D]" /> Start Video
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setActivePrescriptionAppt(appt)}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-white text-slate-700 text-xs font-semibold cursor-pointer flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5 text-teal-700" />
                        {appt.prescription ? 'View Rx' : 'Add Rx'}
                      </button>
                    </div>
                  </div>
                ))}

                {/* Afternoon Break Visual Marker */}
                <div className="p-3.5 rounded-2xl bg-[#FAF7EE] border border-dashed border-[#DDD6C5] flex items-center justify-between text-xs text-[#032F31]">
                  <div className="flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-amber-700" />
                    <span className="font-bold">03:00 PM – 05:00 PM • Afternoon Break & Ward Rounds</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">Slots Auto-Hidden to Patients</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: MY SCHEDULE */}
        {activeTab === 'schedule' && (
          <DoctorScheduleTab
            schedule={schedule}
            onUpdateSchedule={onUpdateSchedule}
            appointments={appointments}
          />
        )}

        {/* TAB: APPOINTMENTS */}
        {activeTab === 'appointments' && (
          <DoctorAppointmentsTab
            appointments={appointments}
            onStartVideoRoom={(appt) => setActiveVideoAppt(appt)}
            onOpenPrescription={(appt) => setActivePrescriptionAppt(appt)}
            onMarkCompleted={handleMarkCompleted}
            onRescheduleAppointment={handleReschedule}
            onCancelAppointment={handleCancel}
            onUpdateNotes={handleUpdateNotes}
          />
        )}

        {/* TAB: PATIENTS */}
        {activeTab === 'patients' && (
          <DoctorPatientsTab
            appointments={appointments}
            onOpenPrescription={(appt) => setActivePrescriptionAppt(appt)}
          />
        )}

        {/* TAB: EARNINGS */}
        {activeTab === 'earnings' && (
          <DoctorEarningsTab
            appointments={appointments}
            doctorFeeINR={doctor.feeINR}
          />
        )}

        {/* TAB: PROFILE */}
        {activeTab === 'profile' && (
          <DoctorProfileTab
            doctor={doctor}
            onUpdateProfile={onUpdateDoctor}
          />
        )}
      </main>

      {/* Video Room Modal */}
      {activeVideoAppt && (
        <DoctorVideoRoomModal
          isOpen={!!activeVideoAppt}
          appointment={activeVideoAppt}
          onClose={() => setActiveVideoAppt(null)}
          onCompleteAndPrescribe={handleCompleteAndPrescribe}
        />
      )}

      {/* Digital Prescription Modal */}
      {activePrescriptionAppt && (
        <DoctorPrescriptionModal
          isOpen={!!activePrescriptionAppt}
          appointment={activePrescriptionAppt}
          doctor={doctor}
          onClose={() => setActivePrescriptionAppt(null)}
          onSavePrescription={handleSavePrescription}
        />
      )}
    </div>
  );
};
