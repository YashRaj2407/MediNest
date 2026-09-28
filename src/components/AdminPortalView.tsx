import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  Stethoscope, 
  Calendar, 
  CreditCard, 
  Search, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Edit, 
  Eye, 
  Filter, 
  ArrowLeft, 
  LogOut, 
  ShieldCheck, 
  AlertCircle,
  Building2,
  Video,
  FileText,
  UserCheck,
  UserX,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { adminSupabase, SUPABASE_CONFIGURED } from '../lib/supabase';
import { AdminAuthData } from './AdminAuthModal';

interface AdminPortalViewProps {
  admin: AdminAuthData;
  onBackToMainSite: () => void;
  onAdminLogout: () => void;
}

interface PatientRecord {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
  status: 'active' | 'deactivated';
}

interface DoctorRecord {
  id: string;
  profile_id: string;
  name: string;
  email: string;
  phone: string;
  registration_number: string;
  specialty: string;
  qualifications: string;
  city: string;
  clinic_name: string;
  fee_inr: number;
  verification_status: 'verified' | 'pending' | 'rejected';
  accepting_appointments: boolean;
  appointment_count: number;
}

interface AppointmentRecord {
  id: string;
  patient_id: string;
  patient_name: string;
  doctor_id: string;
  doctor_name: string;
  doctor_specialty: string;
  consultation_type: 'video' | 'clinic';
  date: string;
  timeSlot: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded';
  total_inr: number;
}

export const AdminPortalView: React.FC<AdminPortalViewProps> = ({
  admin,
  onBackToMainSite,
  onAdminLogout
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'patients' | 'doctors' | 'appointments'>('dashboard');

  // Loading & Data States
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingPatient, setEditingPatient] = useState<PatientRecord | null>(null);
  const [editingDoctor, setEditingDoctor] = useState<DoctorRecord | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Load all system data from Supabase / Local Fallbacks
  const loadData = async () => {
    setLoading(true);
    try {
      if (SUPABASE_CONFIGURED) {
        // 1. Fetch Patients
        const { data: profilesData } = await adminSupabase
          .from('profiles')
          .select('*')
          .eq('role', 'patient')
          .order('created_at', { ascending: false });

        if (profilesData) {
          setPatients(profilesData.map(p => ({
            id: p.id,
            full_name: p.full_name || 'Patient',
            email: p.email || '',
            phone: p.phone || 'N/A',
            created_at: p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN') : 'Recent',
            status: 'active'
          })));
        }

        // 2. Fetch Doctors
        const { data: docData } = await adminSupabase
          .from('doctor_profiles')
          .select('*, profiles(full_name, email, phone)');

        if (docData) {
          setDoctors(docData.map(d => {
            const p = (d.profiles as any) || {};
            const docName = d.name || p.full_name || 'Dr. Specialist';
            return {
              id: d.id,
              profile_id: d.profile_id,
              name: docName,
              email: p.email || '',
              phone: p.phone || 'N/A',
              registration_number: d.registration_number || 'N/A',
              specialty: d.specialty || 'General Physician',
              qualifications: d.qualifications || 'MBBS',
              city: d.city || 'India',
              clinic_name: d.clinic_name || 'Private Practice',
              fee_inr: d.fee_inr || 499,
              verification_status: d.verification_status || 'verified',
              accepting_appointments: d.accepting_appointments ?? true,
              appointment_count: 0
            };
          }));
        }

        // 3. Fetch Appointments
        const { data: apptData } = await adminSupabase
          .from('appointments')
          .select('*, profiles(full_name), doctor_profiles(clinic_name, name)')
          .order('created_at', { ascending: false });

        if (apptData) {
          setAppointments(apptData.map(a => ({
            id: a.id,
            patient_id: a.patient_id,
            patient_name: a.patient_name || (a.profiles as any)?.full_name || 'Patient',
            doctor_id: a.doctor_id,
            doctor_name: 'Dr. Specialist',
            doctor_specialty: 'Specialist',
            consultation_type: (a.consultation_type as any) || 'video',
            date: a.start_datetime ? new Date(a.start_datetime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today',
            timeSlot: a.start_datetime ? new Date(a.start_datetime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '10:00 AM',
            status: a.status as any || 'upcoming',
            payment_status: a.payment_status as any || 'paid',
            total_inr: a.total_inr || a.fee_inr || 499
          })));
        }
      } else {
        // Fallback Seed Data
        setPatients([
          { id: 'p-1', full_name: 'Meera Joshi', email: 'meera.joshi@medinest.in', phone: '+91 9820112233', created_at: '11 Sep 2026', status: 'active' },
          { id: 'p-2', full_name: 'Arnav Kapoor', email: 'arnav.kapoor@medinest.in', phone: '+91 9845998877', created_at: '11 Sep 2026', status: 'active' }
        ]);
        setDoctors([
          { id: 'd-1', profile_id: 'd-1', name: 'Dr. Aditi Nair', email: 'dr.aditi.nair@medinest.in', phone: '+91 9845112233', registration_number: 'KMC-2018-77123', specialty: 'Dermatologist', qualifications: 'MBBS, MD (Dermatology)', city: 'Delhi NCR', clinic_name: 'Aura Skin & Hair Clinic', fee_inr: 799, verification_status: 'verified', accepting_appointments: true, appointment_count: 1 },
          { id: 'd-2', profile_id: 'd-2', name: 'Dr. Karthik Menon', email: 'dr.karthik.menon@medinest.in', phone: '+91 9820445566', registration_number: 'MMC-2012-44589', specialty: 'Cardiologist', qualifications: 'MBBS, MD, DM (Cardiology)', city: 'Mumbai', clinic_name: 'Apex Heart Institute', fee_inr: 1200, verification_status: 'verified', accepting_appointments: true, appointment_count: 1 },
          { id: 'd-3', profile_id: 'd-3', name: 'Dr. Sana Qureshi', email: 'dr.sana.qureshi@medinest.in', phone: '+91 9910778899', registration_number: 'DMC-2016-99341', specialty: 'General Physician', qualifications: 'MBBS, MD (General Medicine)', city: 'Bengaluru', clinic_name: 'CareFirst Family Clinic', fee_inr: 499, verification_status: 'verified', accepting_appointments: true, appointment_count: 1 },
          { id: 'd-4', profile_id: 'd-4', name: 'Dr. Vivek Bansal', email: 'dr.vivek.bansal@medinest.in', phone: '+91 9742334455', registration_number: 'TSMC-2014-55102', specialty: 'Orthopedic Surgeon', qualifications: 'MBBS, MS (Orthopedics)', city: 'Hyderabad', clinic_name: 'Joint Care Trauma Center', fee_inr: 899, verification_status: 'verified', accepting_appointments: true, appointment_count: 0 },
          { id: 'd-5', profile_id: 'd-5', name: 'Dr. Priyanka Rao', email: 'dr.priyanka.rao@medinest.in', phone: '+91 9890667788', registration_number: 'MMC-2017-33891', specialty: 'Psychiatrist', qualifications: 'MBBS, MD (Psychiatry)', city: 'Pune', clinic_name: 'MindCare Wellness Clinic', fee_inr: 999, verification_status: 'verified', accepting_appointments: true, appointment_count: 0 }
        ]);

        setAppointments([
          { id: 'a-1', patient_id: 'p-1', patient_name: 'Meera Joshi', doctor_id: 'd-1', doctor_name: 'Dr. Aditi Nair', doctor_specialty: 'Dermatologist', consultation_type: 'video', date: '12 Sep 2026', timeSlot: '10:30 AM', status: 'upcoming', payment_status: 'paid', total_inr: 799 },
          { id: 'a-2', patient_id: 'p-2', patient_name: 'Arnav Kapoor', doctor_id: 'd-3', doctor_name: 'Dr. Sana Qureshi', doctor_specialty: 'General Physician', consultation_type: 'clinic', date: '12 Sep 2026', timeSlot: '11:00 AM', status: 'upcoming', payment_status: 'paid', total_inr: 499 }
        ]);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showSuccessNotice = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  // Doctor Verification Toggle
  const handleToggleDoctorVerification = async (doctorId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'verified' ? 'pending' : 'verified';
    
    if (SUPABASE_CONFIGURED) {
      await adminSupabase
        .from('doctor_profiles')
        .update({ verification_status: nextStatus })
        .eq('id', doctorId);
    }

    setDoctors(prev => prev.map(d => d.id === doctorId ? { ...d, verification_status: nextStatus as any } : d));
    showSuccessNotice(`Doctor verification status updated to '${nextStatus}'.`);
  };

  // Patient Status Toggle
  const handleTogglePatientStatus = (patientId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'deactivated' : 'active';
    setPatients(prev => prev.map(p => p.id === patientId ? { ...p, status: nextStatus as any } : p));
    showSuccessNotice(`Patient account status updated to '${nextStatus}'.`);
  };

  // Cancel Appointment
  const handleCancelAppointment = async (apptId: string) => {
    if (SUPABASE_CONFIGURED) {
      await adminSupabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', apptId);
    }

    setAppointments(prev => prev.map(a => a.id === apptId ? { ...a, status: 'cancelled' as const } : a));
    showSuccessNotice(`Appointment #${apptId} has been cancelled.`);
  };

  // System Stats
  const totalRevenueINR = appointments.reduce((acc, a) => acc + (a.payment_status === 'paid' ? a.total_inr : 0), 0);
  const appointmentsTodayCount = appointments.filter(a => a.status === 'upcoming').length;
  const verifiedDoctorsCount = doctors.filter(d => d.verification_status === 'verified').length;

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-slate-800 flex flex-col font-sans selection:bg-amber-100">
      
      {/* Toast Notice */}
      {actionSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0C182B] text-white px-5 py-3 rounded-2xl shadow-2xl border border-amber-500/40 flex items-center gap-3 animate-fadeIn text-xs font-bold">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Top Admin Header Bar */}
      <header className="sticky top-0 z-40 bg-[#0C182B] text-white border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo / Admin Title */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-white block leading-none">
                  MediNest Admin
                </span>
                <span className="text-[10px] font-semibold text-amber-300 block mt-0.5">
                  Platform Operations Portal
                </span>
              </div>
            </div>

            {/* Admin Nav Tabs */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs font-bold">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'dashboard' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" /> Dashboard
              </button>
              <button
                onClick={() => setActiveTab('patients')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'patients' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Patients ({patients.length})
              </button>
              <button
                onClick={() => setActiveTab('doctors')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'doctors' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" /> Doctors ({doctors.length})
              </button>
              <button
                onClick={() => setActiveTab('appointments')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'appointments' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" /> Appointments ({appointments.length})
              </button>
            </nav>

            {/* User & Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={onBackToMainSite}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Main Website
              </button>

              <button
                onClick={onAdminLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Tab Bar */}
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 py-2 flex items-center justify-between text-xs font-bold">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-1 px-2.5 rounded-lg ${activeTab === 'dashboard' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('patients')}
            className={`py-1 px-2.5 rounded-lg ${activeTab === 'patients' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'}`}
          >
            Patients
          </button>
          <button
            onClick={() => setActiveTab('doctors')}
            className={`py-1 px-2.5 rounded-lg ${activeTab === 'doctors' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'}`}
          >
            Doctors
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={`py-1 px-2.5 rounded-lg ${activeTab === 'appointments' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'}`}
          >
            Bookings
          </button>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        
        {/* ─── TAB 1: DASHBOARD OVERVIEW ───────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Patients</span>
                  <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{patients.length}</span>
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                    <UserCheck className="w-3 h-3" /> Registered Users
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Verified Doctors</span>
                  <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{verifiedDoctorsCount} / {doctors.length}</span>
                  <span className="text-[11px] text-amber-600 font-semibold flex items-center gap-1 mt-1">
                    <ShieldCheck className="w-3 h-3" /> NMC Verified
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Stethoscope className="w-6 h-6" />
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Appointments Today</span>
                  <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{appointmentsTodayCount}</span>
                  <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" /> Active Telehealth/OPD
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">System Volume</span>
                  <span className="text-2xl font-extrabold text-slate-900 mt-1 block">₹{totalRevenueINR}</span>
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                    <CreditCard className="w-3 h-3" /> 100% Paid in INR
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* System Status Banner */}
            <div className="p-5 rounded-3xl bg-[#0C182B] text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
                  <CheckCircle className="w-3 h-3" /> Supabase Database &amp; RLS Active
                </span>
                <h3 className="text-lg font-bold text-white">System Operation Normal</h3>
                <p className="text-xs text-slate-300">
                  All 8 database tables, Row Level Security policies, and doctor schedule break systems are operating normally.
                </p>
              </div>

              <button
                onClick={loadData}
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Admin Feed
              </button>
            </div>

            {/* Quick Doctor Roster Overview */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-teal-700" /> Platform Medical Specialists Roster
                </h3>
                <button
                  onClick={() => setActiveTab('doctors')}
                  className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
                >
                  Manage All Doctors →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {doctors.slice(0, 6).map((doc) => (
                  <div key={doc.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{doc.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        doc.verification_status === 'verified'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {doc.verification_status}
                      </span>
                    </div>
                    <p className="text-[11px] text-teal-800 font-semibold">{doc.specialty} • ₹{doc.fee_inr}</p>
                    <p className="text-[10px] text-slate-500">{doc.clinic_name}, {doc.city}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ─── TAB 2: PATIENT MANAGEMENT ─────────────────────────────────── */}
        {activeTab === 'patients' && (
          <div className="space-y-6">
            
            {/* Header & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Patient User Management</h2>
                <p className="text-xs text-slate-500">View registered patients, check appointment histories, and manage accounts.</p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search patients by name/email..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 font-medium focus:outline-none focus:border-teal-700 bg-slate-50"
                />
              </div>
            </div>

            {/* Patients Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="p-4">Patient Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Mobile Phone</th>
                      <th className="p-4">Registered Date</th>
                      <th className="p-4">Account Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {patients
                      .filter(p => p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || p.email.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-4 font-bold text-slate-900">{p.full_name}</td>
                          <td className="p-4 text-slate-600">{p.email}</td>
                          <td className="p-4 text-slate-600 font-mono">{p.phone}</td>
                          <td className="p-4 text-slate-500">{p.created_at}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              p.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {p.status === 'active' ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                              {p.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <button
                              onClick={() => handleTogglePatientStatus(p.id, p.status)}
                              className={`px-3 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-colors ${
                                p.status === 'active'
                                  ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                                  : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              {p.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ─── TAB 3: DOCTOR MANAGEMENT ─────────────────────────────────── */}
        {activeTab === 'doctors' && (
          <div className="space-y-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Doctor Credentials & Verification</h2>
                <p className="text-xs text-slate-500">Review NMC registrations, manage consultation fees, and set verification status.</p>
              </div>
            </div>

            {/* Doctor Cards List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {doctors.map((doc) => (
                <div key={doc.id} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-slate-900">{doc.name}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          doc.verification_status === 'verified'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {doc.verification_status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-teal-800 font-semibold mt-0.5">{doc.specialty} • {doc.qualifications}</p>
                    </div>

                    <span className="text-base font-extrabold text-[#0C182B] bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                      ₹{doc.fee_inr}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1 text-slate-600">
                    <p><strong>NMC Registration:</strong> <code className="text-slate-800">{doc.registration_number}</code></p>
                    <p><strong>Clinic:</strong> {doc.clinic_name} ({doc.city})</p>
                    <p><strong>Contact:</strong> {doc.email} • {doc.phone}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <button
                      onClick={() => handleToggleDoctorVerification(doc.id, doc.verification_status)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        doc.verification_status === 'verified'
                          ? 'border-amber-300 text-amber-900 hover:bg-amber-50'
                          : 'bg-emerald-700 text-white hover:bg-emerald-800'
                      }`}
                    >
                      {doc.verification_status === 'verified' ? 'Revoke Verification' : 'Approve Doctor Verification'}
                    </button>

                    <span className="text-[11px] text-slate-400 font-medium">
                      {doc.accepting_appointments ? '🟢 OPD Open' : '🔴 OPD Paused'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ─── TAB 4: APPOINTMENT MANAGEMENT ─────────────────────────────── */}
        {activeTab === 'appointments' && (
          <div className="space-y-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-slate-900">System-Wide Appointments</h2>
                <p className="text-xs text-slate-500">Monitor live bookings, payment status, and consultation modes.</p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold bg-slate-50 text-slate-800"
                >
                  <option value="all">All Statuses</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Appointments List */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="p-4">Booking ID</th>
                      <th className="p-4">Patient Name</th>
                      <th className="p-4">Doctor</th>
                      <th className="p-4">Date &amp; Time</th>
                      <th className="p-4">Mode</th>
                      <th className="p-4">Amount (INR)</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {appointments
                      .filter(a => statusFilter === 'all' || a.status === statusFilter)
                      .map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-4 font-mono font-bold text-slate-800">{a.id.slice(0, 8)}...</td>
                          <td className="p-4 font-bold text-slate-900">{a.patient_name}</td>
                          <td className="p-4 text-slate-700">{a.doctor_name}</td>
                          <td className="p-4 text-slate-600">{a.date} at {a.timeSlot}</td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                              {a.consultation_type === 'video' ? <Video className="w-3.5 h-3.5 text-teal-600" /> : <Building2 className="w-3.5 h-3.5 text-teal-600" />}
                              {a.consultation_type === 'video' ? 'Video' : 'Clinic'}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-slate-900">₹{a.total_inr}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              a.status === 'upcoming'
                                ? 'bg-emerald-100 text-emerald-800'
                                : a.status === 'completed'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {a.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {a.status === 'upcoming' && (
                              <button
                                onClick={() => handleCancelAppointment(a.id)}
                                className="px-3 py-1 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-[11px] font-bold cursor-pointer"
                              >
                                Cancel
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
};
