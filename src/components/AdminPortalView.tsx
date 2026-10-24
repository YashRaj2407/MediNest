import { formatINR } from '../lib/formatCurrency';
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
  RefreshCw,
  AlertTriangle,
  Flag,
  Trash2,
  Check,
  X,
  HelpCircle,
  KeyRound,
  History,
  Send,
  Loader2
} from 'lucide-react';

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
  account_status: 'active' | 'deactivated' | 'deleted';
}

interface DoctorRecord {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  account_status: string;
  registration_number: string;
  specialty: string;
  qualifications: string;
  city: string;
  clinic_name: string;
  fee_inr: number;
  verification_status: 'pending' | 'verified' | 'approved' | 'rejected' | 'suspended';
  approval_reason?: string;
  approved_by?: string;
  approved_at?: string;
  suspension_reason?: string;
  accepting_appointments: boolean;
  appointment_count: number;
  created_at: string;
}

interface AppointmentRecord {
  id: string;
  patient_id: string;
  patient_name: string;
  doctor_id: string;
  doctor_name: string;
  doctor_specialty: string;
  consultation_type: 'video' | 'clinic';
  start_datetime: string;
  end_datetime?: string;
  status: 'upcoming' | 'completed' | 'cancelled' | 'rescheduled' | 'RESCHEDULE_REQUIRED';
  payment_status: 'pending' | 'paid' | 'refunded' | 'failed';
  total_inr: number;
  created_at: string;
}

interface ReportRecord {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_email: string;
  doctor_id: string;
  doctor_name: string;
  doctor_specialty: string;
  category: string;
  description: string;
  evidence_url?: string;
  status: 'open' | 'under_review' | 'resolved' | 'dismissed';
  admin_notes?: string;
  resolved_reason?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

interface AuditRecord {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  prev_status?: string;
  new_status?: string;
  reason?: string;
  created_at: string;
}

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const AdminPortalView: React.FC<AdminPortalViewProps> = ({
  admin,
  onBackToMainSite,
  onAdminLogout
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'patients' | 'doctors' | 'appointments' | 'reports' | 'audit'>('dashboard');

  // Loading & Data States
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>([]);
  const [stats, setStats] = useState({
    patientCount: 0,
    doctorCount: 0,
    verifiedDoctors: 0,
    pendingDoctors: 0,
    apptCount: 0,
    revenue: 0,
    openReports: 0
  });

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [patientStatusFilter, setPatientStatusFilter] = useState<'active' | 'all' | 'deactivated' | 'deleted'>('active');
  const [doctorStatusFilter, setDoctorStatusFilter] = useState<string>('all');
  const [reportStatusFilter, setReportStatusFilter] = useState<string>('all');
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState<string>('all');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals
  const [patientToDelete, setPatientToDelete] = useState<PatientRecord | null>(null);
  const [patientDeleteReason, setPatientDeleteReason] = useState('');
  const [deletingPatient, setDeletingPatient] = useState(false);

  const [doctorToApprove, setDoctorToApprove] = useState<{ doctor: DoctorRecord; targetStatus: 'approved' | 'rejected' | 'suspended' } | null>(null);
  const [doctorActionReason, setDoctorActionReason] = useState('');
  const [submittingDoctorApproval, setSubmittingDoctorApproval] = useState(false);

  const [doctorToDelete, setDoctorToDelete] = useState<DoctorRecord | null>(null);
  const [doctorDeleteReason, setDoctorDeleteReason] = useState('');
  const [deletingDoctor, setDeletingDoctor] = useState(false);

  const [doctorToPurge, setDoctorToPurge] = useState<DoctorRecord | null>(null);
  const [purgingDoctor, setPurgingDoctor] = useState(false);
  const [purgeConfirmationText, setPurgeConfirmationText] = useState('');

  const [reportToUpdate, setReportToUpdate] = useState<{ report: ReportRecord; targetStatus: 'under_review' | 'resolved' | 'dismissed' } | null>(null);
  const [reportActionReason, setReportActionReason] = useState('');
  const [reportAdminNotes, setReportAdminNotes] = useState('');
  const [submittingReportAction, setSubmittingReportAction] = useState(false);

  // Reconciliation Modal
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [reconcileEmail, setReconcileEmail] = useState('');
  const [reconcileResult, setReconcileResult] = useState<any | null>(null);
  const [reconciling, setReconciling] = useState(false);

  const getAuthHeader = () => {
    const token = admin.token || localStorage.getItem('medinest_admin_token') || 'medinest_admin_secret_token_2026';
    return {
      'Authorization': `Bearer ${token}`,
      'x-admin-key': 'medinest_admin_secret_token_2026',
      'Content-Type': 'application/json'
    };
  };

  const showToast = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const showError = (msg: string) => {
    setActionError(msg);
    setTimeout(() => setActionError(null), 5000);
  };

  // ── Load system data from API ─────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const headers = getAuthHeader();

      // Parallel fetch
      const [statsRes, patientsRes, doctorsRes, apptsRes, reportsRes, auditRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/admin/stats`, { headers }).then(r => r.json()),
        fetch(`${API_BASE_URL}/admin/patients`, { headers }).then(r => r.json()),
        fetch(`${API_BASE_URL}/admin/doctors`, { headers }).then(r => r.json()),
        fetch(`${API_BASE_URL}/admin/appointments`, { headers }).then(r => r.json()),
        fetch(`${API_BASE_URL}/admin/reports`, { headers }).then(r => r.json()),
        fetch(`${API_BASE_URL}/admin/audit-log`, { headers }).then(r => r.json()),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.success) {
        setStats(statsRes.value.data);
      }
      if (patientsRes.status === 'fulfilled' && patientsRes.value?.success) {
        setPatients(patientsRes.value.data);
      }
      if (doctorsRes.status === 'fulfilled' && doctorsRes.value?.success) {
        setDoctors(doctorsRes.value.data);
      }
      if (apptsRes.status === 'fulfilled' && apptsRes.value?.success) {
        setAppointments(apptsRes.value.data);
      }
      if (reportsRes.status === 'fulfilled' && reportsRes.value?.success) {
        setReports(reportsRes.value.data);
      }
      if (auditRes.status === 'fulfilled' && auditRes.value?.success) {
        setAuditLogs(auditRes.value.data);
      }
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      showError('Failed to synchronize with administrative database. Check server connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ── Patient Handlers ──────────────────────────────────────────────────────
  const handleTogglePatientStatus = async (patientId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'deactivated' : 'active';
    try {
      const res = await fetch(`${API_BASE_URL}/admin/patients/${patientId}/status`, {
        method: 'PATCH',
        headers: getAuthHeader(),
        body: JSON.stringify({ status: nextStatus, reason: `Admin toggled status to ${nextStatus}` })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showError(data.error || 'Failed to update patient status');
        return;
      }
      showToast(`Patient account status updated to '${nextStatus}'.`);
      setPatients(prev => prev.map(p => p.id === patientId ? { ...p, account_status: nextStatus as any } : p));
    } catch (err: any) {
      showError(err.message || 'Error updating patient status');
    }
  };

  const handleConfirmDeletePatient = async () => {
    if (!patientToDelete) return;
    setDeletingPatient(true);
    const targetId = patientToDelete.id;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/patients/${targetId}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
        body: JSON.stringify({ reason: patientDeleteReason.trim() || 'Admin permanent deletion' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showError(data.error || 'Failed to delete patient account');
        return;
      }
      showToast(data.message || 'Patient account deleted and credentials cleared.');
      setPatientToDelete(null);
      setPatientDeleteReason('');
      setPatients(prev => prev.filter(p => p.id !== targetId));
      loadData();
    } catch (err: any) {
      showError(err.message || 'Error deleting patient');
    } finally {
      setDeletingPatient(false);
    }
  };

  // ── Doctor Approval Handlers ──────────────────────────────────────────────
  const handleConfirmDoctorApproval = async () => {
    if (!doctorToApprove) return;
    const { doctor, targetStatus } = doctorToApprove;
    if (['rejected', 'suspended'].includes(targetStatus) && !doctorActionReason.trim()) {
      showError(`A reason is required to ${targetStatus} a doctor.`);
      return;
    }

    setSubmittingDoctorApproval(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/doctors/${doctor.id}/approval`, {
        method: 'PATCH',
        headers: getAuthHeader(),
        body: JSON.stringify({ status: targetStatus, reason: doctorActionReason.trim() })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showError(data.error || 'Failed to update doctor verification status');
        return;
      }
      showToast(`Doctor '${doctor.name}' status updated to '${targetStatus}'.`);
      setDoctorToApprove(null);
      setDoctorActionReason('');
      loadData();
    } catch (err: any) {
      showError(err.message || 'Error updating doctor approval');
    } finally {
      setSubmittingDoctorApproval(false);
    }
  };

  const handleConfirmDeleteDoctor = async () => {
    if (!doctorToDelete) return;
    setDeletingDoctor(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/doctors/${doctorToDelete.id}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
        body: JSON.stringify({ reason: doctorDeleteReason.trim() || 'Admin deleted doctor profile' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showError(data.error || 'Failed to deactivate doctor account');
        return;
      }
      showToast(data.message || 'Doctor account deactivated. Medical records preserved.');
      setDoctorToDelete(null);
      setDoctorDeleteReason('');
      loadData();
    } catch (err: any) {
      showError(err.message || 'Error deactivating doctor');
    } finally {
      setDeletingDoctor(false);
    }
  };

  const handleConfirmPermanentDeleteDoctor = async () => {
    if (!doctorToPurge) return;
    setPurgingDoctor(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/doctors/${doctorToPurge.id}/permanent`, {
        method: 'DELETE',
        headers: getAuthHeader(),
        body: JSON.stringify({ reason: 'Permanently deleted by admin from database and project' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showError(data.error || 'Failed to permanently delete doctor');
        return;
      }
      showToast(data.message || `Doctor ${doctorToPurge.name} permanently deleted from database.`);
      setDoctors(prev => prev.filter(d => d.id !== doctorToPurge.id));
      setDoctorToPurge(null);
      setPurgeConfirmationText('');
      loadData();
    } catch (err: any) {
      showError(err.message || 'Error deleting doctor permanently');
    } finally {
      setPurgingDoctor(false);
    }
  };

  // ── Report Handlers ───────────────────────────────────────────────────────
  const handleConfirmReportAction = async () => {
    if (!reportToUpdate) return;
    const { report, targetStatus } = reportToUpdate;

    if (['resolved', 'dismissed'].includes(targetStatus) && !reportActionReason.trim()) {
      showError(`A reason is required when marking a report as ${targetStatus}.`);
      return;
    }

    setSubmittingReportAction(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/reports/${report.id}`, {
        method: 'PATCH',
        headers: getAuthHeader(),
        body: JSON.stringify({
          status: targetStatus,
          resolvedReason: reportActionReason.trim() || undefined,
          adminNotes: reportAdminNotes.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showError(data.error || 'Failed to update report status');
        return;
      }
      showToast(`Report updated to '${targetStatus}'.`);
      setReportToUpdate(null);
      setReportActionReason('');
      setReportAdminNotes('');
      loadData();
    } catch (err: any) {
      showError(err.message || 'Error updating report');
    } finally {
      setSubmittingReportAction(false);
    }
  };

  // ── Clerk Reconciliation ──────────────────────────────────────────────────
  const handleRunReconciliation = async () => {
    if (!reconcileEmail.trim()) {
      showError('Please enter an email address to reconcile.');
      return;
    }

    setReconciling(true);
    setReconcileResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/reconcile-clerk-user`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({ email: reconcileEmail.trim() })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showError(data.error || 'Reconciliation failed.');
        return;
      }
      setReconcileResult(data);
      showToast(data.message);
      loadData();
    } catch (err: any) {
      showError(err.message || 'Error during reconciliation');
    } finally {
      setReconciling(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-slate-800 flex flex-col font-sans selection:bg-amber-100">
      
      {/* Toast Notice */}
      {actionSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0C182B] text-white px-5 py-3 rounded-2xl shadow-2xl border border-amber-500/40 flex items-center gap-3 animate-fadeIn text-xs font-bold">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="fixed bottom-6 right-6 z-50 bg-rose-950 text-white px-5 py-3 rounded-2xl shadow-2xl border border-rose-500/50 flex items-center gap-3 animate-fadeIn text-xs font-bold">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>{actionError}</span>
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
                  Platform Operations &amp; Clinical Directorate
                </span>
              </div>
            </div>

            {/* Admin Nav Tabs */}
            <nav className="hidden lg:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs font-bold">
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
                {stats.pendingDoctors > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[9px] font-bold">
                    {stats.pendingDoctors}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'reports' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Flag className="w-3.5 h-3.5" /> Reports ({reports.length})
                {stats.openReports > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded-full text-[9px] font-bold">
                    {stats.openReports}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('appointments')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'appointments' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" /> Appointments ({appointments.length})
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'audit' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" /> Audit Log
              </button>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsReconcileModalOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30 hover:bg-amber-400/30 text-xs font-bold cursor-pointer"
                title="Fix Clerk duplicate email errors"
              >
                <KeyRound className="w-3.5 h-3.5" /> Reconcile Auth
              </button>

              <button
                onClick={onBackToMainSite}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Main Site
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
        <div className="lg:hidden border-t border-slate-800 bg-slate-950 px-2 py-2 flex items-center justify-between text-[11px] font-bold overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-1 px-2.5 rounded-lg shrink-0 ${activeTab === 'dashboard' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('patients')}
            className={`py-1 px-2.5 rounded-lg shrink-0 ${activeTab === 'patients' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'}`}
          >
            Patients
          </button>
          <button
            onClick={() => setActiveTab('doctors')}
            className={`py-1 px-2.5 rounded-lg shrink-0 ${activeTab === 'doctors' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'}`}
          >
            Doctors ({doctors.length})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`py-1 px-2.5 rounded-lg shrink-0 ${activeTab === 'reports' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'}`}
          >
            Reports ({reports.length})
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={`py-1 px-2.5 rounded-lg shrink-0 ${activeTab === 'appointments' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'}`}
          >
            Bookings
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-1 px-2.5 rounded-lg shrink-0 ${activeTab === 'audit' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'}`}
          >
            Audit
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
              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Registered Patients</span>
                  <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{patients.length}</span>
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                    <UserCheck className="w-3 h-3" /> In Application Database
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Doctor Verification</span>
                  <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
                    {doctors.filter(d => ['verified', 'approved'].includes(d.verification_status)).length} / {doctors.length}
                  </span>
                  <span className="text-[11px] text-amber-600 font-semibold flex items-center gap-1 mt-1">
                    <ShieldCheck className="w-3 h-3" />
                    {doctors.filter(d => d.verification_status === 'pending').length} Awaiting Approval
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Stethoscope className="w-6 h-6" />
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Doctor Grievances</span>
                  <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{reports.length}</span>
                  <span className="text-[11px] text-rose-600 font-semibold flex items-center gap-1 mt-1">
                    <Flag className="w-3 h-3" /> {reports.filter(r => ['open', 'under_review'].includes(r.status)).length} Active Cases
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center">
                  <Flag className="w-6 h-6" />
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Bookings</span>
                  <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{appointments.length}</span>
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                    <CreditCard className="w-3 h-3" />
                    {formatINR(appointments.reduce((acc, a) => acc + (a.payment_status === 'paid' ? a.total_inr : 0), 0))}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Quick Actions & Status Banner */}
            <div className="p-6 rounded-3xl bg-[#0C182B] text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
                  <CheckCircle className="w-3 h-3" /> Live MySQL Database &amp; Clerk Auth Sync Active
                </span>
                <h3 className="text-lg font-bold text-white">Platform Governance Active</h3>
                <p className="text-xs text-slate-300 max-w-xl">
                  Enforcing strict 15-character password policies, administrative doctor verification workflows,
                  and safe user deactivations preserving medical history.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsReconcileModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/30 font-bold text-xs flex items-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" /> Reconcile Stale Emails
                </button>
                <button
                  onClick={loadData}
                  className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Admin Feed
                </button>
              </div>
            </div>

            {/* Pending Doctor Approvals Callout */}
            {doctors.filter(d => d.verification_status === 'pending').length > 0 && (
              <div className="p-6 rounded-3xl bg-amber-50 border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-700" />
                    <h3 className="text-sm font-bold text-amber-900">
                      {doctors.filter(d => d.verification_status === 'pending').length} Doctor Application(s) Awaiting Admin Review
                    </h3>
                  </div>
                  <button
                    onClick={() => { setActiveTab('doctors'); setDoctorStatusFilter('pending'); }}
                    className="text-xs font-bold text-amber-800 hover:underline cursor-pointer"
                  >
                    Review All Pending Doctors →
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {doctors.filter(d => d.verification_status === 'pending').map((doc) => (
                    <div key={doc.id} className="p-3.5 rounded-2xl bg-white border border-amber-200 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs text-slate-900">{doc.name}</div>
                        <div className="text-[11px] text-teal-800">{doc.specialty} • {doc.city}</div>
                        <div className="text-[10px] text-slate-500 font-mono">Reg: {doc.registration_number}</div>
                      </div>
                      <button
                        onClick={() => setDoctorToApprove({ doctor: doc, targetStatus: 'approved' })}
                        className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                      >
                        Approve
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Audit Log Preview */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-teal-700" /> Recent Administrative Audit Trail
                </h3>
                <button
                  onClick={() => setActiveTab('audit')}
                  className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
                >
                  View Full Audit Log →
                </button>
              </div>

              {auditLogs.length > 0 ? (
                <div className="space-y-2">
                  {auditLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 mr-2">{log.action.replace('_', ' ').toUpperCase()}</span>
                        <span className="text-slate-600">[{log.target_type}: {log.target_id.slice(0, 18)}]</span>
                        {log.reason && <span className="text-slate-500 italic ml-2">— "{log.reason}"</span>}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{log.created_at}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">No audit actions recorded yet.</p>
              )}
            </div>

          </div>
        )}

        {/* ─── TAB 2: PATIENT MANAGEMENT ───────────────────────────────────── */}
        {activeTab === 'patients' && (
          <div className="space-y-6">
            
            {/* Header, Search & Status Filters */}
            <div className="flex flex-col gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Patient User Management</h2>
                  <p className="text-xs text-slate-500">
                    Manage patient accounts, deactivation, and safe deletion. Historical medical records are strictly preserved.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search name, email, or phone..."
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 font-medium focus:outline-none focus:border-teal-700 bg-slate-50"
                    />
                  </div>
                  <button
                    onClick={() => setIsReconcileModalOpen(true)}
                    className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold hover:bg-amber-100 cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <KeyRound className="w-3.5 h-3.5" /> Release Email
                  </button>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                {(['active', 'all', 'deactivated', 'deleted'] as const).map((st) => {
                  let count = 0;
                  if (st === 'active') {
                    count = patients.filter(p => p.account_status === 'active' && !p.email.includes('@medinest.archived') && !p.email.includes('@medinest.deleted')).length;
                  } else if (st === 'all') {
                    count = patients.filter(p => p.account_status !== 'deleted' && !p.email.includes('@medinest.archived') && !p.email.includes('@medinest.deleted')).length;
                  } else if (st === 'deactivated') {
                    count = patients.filter(p => p.account_status === 'deactivated' && !p.email.includes('@medinest.deleted')).length;
                  } else if (st === 'deleted') {
                    count = patients.filter(p => p.account_status === 'deleted' || p.email.includes('@medinest.deleted') || p.email.includes('@medinest.archived')).length;
                  }

                  const labels: Record<string, string> = {
                    active: 'Active Patients',
                    all: 'All Active & Inactive',
                    deactivated: 'Deactivated',
                    deleted: 'Deleted / Archived',
                  };

                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setPatientStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        patientStatusFilter === st
                          ? 'bg-[#032F31] text-[#FAE58D] shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      <span>{labels[st]}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        patientStatusFilter === st ? 'bg-white/20 text-[#FAE58D]' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Patients Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse table-fixed min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <th className="p-4 w-[24%]">Patient Name</th>
                      <th className="p-4 w-[28%]">Email</th>
                      <th className="p-4 w-[16%]">Phone</th>
                      <th className="p-4 w-[14%]">Account Status</th>
                      <th className="p-4 w-[10%]">Registered Date</th>
                      <th className="p-4 w-[8%] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      const list = patients.filter((p) => {
                        const q = searchQuery.toLowerCase().trim();
                        const matchesSearch =
                          !q ||
                          (p.full_name || '').toLowerCase().includes(q) ||
                          (p.email || '').toLowerCase().includes(q) ||
                          (p.phone || '').includes(q);

                        if (!matchesSearch) return false;

                        const isArchived = (p.email || '').includes('@medinest.archived');
                        const isDeleted = p.account_status === 'deleted' || (p.email || '').includes('@medinest.deleted');

                        if (patientStatusFilter === 'active') {
                          return p.account_status === 'active' && !isArchived && !isDeleted;
                        }
                        if (patientStatusFilter === 'all') {
                          return !isDeleted && !isArchived;
                        }
                        if (patientStatusFilter === 'deactivated') {
                          return p.account_status === 'deactivated' && !isDeleted;
                        }
                        if (patientStatusFilter === 'deleted') {
                          return isDeleted || isArchived;
                        }
                        return true;
                      });

                      if (list.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                              No patients found in this view.
                            </td>
                          </tr>
                        );
                      }

                      return list.map((p) => {
                        const isDeleted = p.account_status === 'deleted' || (p.email || '').includes('@medinest.deleted');
                        const isArchived = (p.email || '').includes('@medinest.archived');

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-4">
                              {isDeleted ? (
                                <span className="text-slate-400 italic font-normal">Deleted Patient</span>
                              ) : (
                                <span className="font-bold text-slate-900 truncate block" title={p.full_name}>
                                  {p.full_name}
                                </span>
                              )}
                            </td>
                            <td className="p-4 overflow-hidden">
                              {isDeleted ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10px] font-semibold border border-rose-200" title={p.email}>
                                  Account Deleted
                                </span>
                              ) : isArchived ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold border border-slate-200" title={p.email}>
                                  Archived Identity
                                </span>
                              ) : (
                                <span className="truncate block font-mono text-slate-600" title={p.email}>
                                  {p.email}
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-slate-600 whitespace-nowrap">
                              {p.phone || '—'}
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isDeleted
                                  ? 'bg-rose-100 text-rose-800'
                                  : p.account_status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {isDeleted ? (
                                  <UserX className="w-3 h-3" />
                                ) : p.account_status === 'active' ? (
                                  <UserCheck className="w-3 h-3" />
                                ) : (
                                  <UserX className="w-3 h-3" />
                                )}
                                {(isDeleted ? 'DELETED' : p.account_status || 'active').toUpperCase()}
                              </span>
                            </td>
                            <td className="p-4 text-slate-500 whitespace-nowrap">
                              {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                            </td>
                            <td className="p-4 text-right space-x-2 whitespace-nowrap">
                              {!isDeleted ? (
                                <>
                                  <button
                                    onClick={() => handleTogglePatientStatus(p.id, p.account_status)}
                                    className={`px-3 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-colors ${
                                      p.account_status === 'active'
                                        ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                        : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                    }`}
                                  >
                                    {p.account_status === 'active' ? 'Deactivate' : 'Activate'}
                                  </button>
                                  <button
                                    onClick={() => setPatientToDelete(p)}
                                    className="px-3 py-1 rounded-lg text-[11px] font-bold border border-rose-200 text-rose-700 hover:bg-rose-50 cursor-pointer transition-colors"
                                  >
                                    Delete
                                  </button>
                                </>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">Account Deleted</span>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ─── TAB 3: DOCTOR MANAGEMENT & APPROVAL WORKFLOW ─────────────────── */}
        {activeTab === 'doctors' && (
          <div className="space-y-6">
            
            {/* Header & Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Doctor Credentials &amp; Approval Workflow</h2>
                <p className="text-xs text-slate-500">
                  Review NMC credentials, approve, reject or suspend doctors. Only approved/verified doctors are visible to patients.
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                {['all', 'pending', 'approved', 'rejected', 'suspended'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setDoctorStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg transition-all capitalize cursor-pointer ${
                      doctorStatusFilter === st
                        ? 'bg-[#0C182B] text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st} {st !== 'all' && `(${doctors.filter(d => st === 'approved' ? ['approved', 'verified'].includes(d.verification_status) : d.verification_status === st).length})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Doctor Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {doctors
                .filter(d => {
                  if (doctorStatusFilter === 'all') return true;
                  if (doctorStatusFilter === 'approved') return ['approved', 'verified'].includes(d.verification_status);
                  return d.verification_status === doctorStatusFilter;
                })
                .map((doc) => {
                  const isApproved = ['approved', 'verified'].includes(doc.verification_status);
                  const isPending = doc.verification_status === 'pending';
                  const isRejected = doc.verification_status === 'rejected';
                  const isSuspended = doc.verification_status === 'suspended';

                  return (
                    <div key={doc.id} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-slate-900">{doc.name}</h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              isApproved
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : isPending
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : isSuspended
                                ? 'bg-rose-100 text-rose-800 border-rose-200'
                                : 'bg-slate-100 text-slate-800 border-slate-200'
                            }`}>
                              {doc.verification_status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs text-teal-800 font-semibold mt-0.5">{doc.specialty} • {doc.qualifications}</p>
                        </div>

                        <span className="text-sm font-extrabold text-[#0C182B] bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                          {formatINR(doc.fee_inr || 499)}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1 text-slate-600">
                        <p><strong>NMC Registration:</strong> <code className="text-slate-800 font-bold">{doc.registration_number}</code></p>
                        <p><strong>Clinic:</strong> {doc.clinic_name} ({doc.city})</p>
                        <p><strong>Contact:</strong> {doc.email} • {doc.phone || 'N/A'}</p>
                        <p><strong>Total Appointments:</strong> {doc.appointment_count || 0}</p>
                        {doc.suspension_reason && (
                          <p className="text-rose-700 bg-rose-50 p-2 rounded-xl mt-1">
                            <strong>Suspension Reason:</strong> {doc.suspension_reason}
                          </p>
                        )}
                        {doc.approval_reason && (
                          <p className="text-slate-700 bg-slate-100 p-2 rounded-xl mt-1">
                            <strong>Note:</strong> {doc.approval_reason}
                          </p>
                        )}
                      </div>

                      {/* Approval Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {!isApproved && (
                            <button
                              onClick={() => setDoctorToApprove({ doctor: doc, targetStatus: 'approved' })}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                            >
                              Approve Doctor
                            </button>
                          )}
                          {!isRejected && (
                            <button
                              onClick={() => setDoctorToApprove({ doctor: doc, targetStatus: 'rejected' })}
                              className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold cursor-pointer"
                            >
                              Reject
                            </button>
                          )}
                          {!isSuspended && (
                            <button
                              onClick={() => setDoctorToApprove({ doctor: doc, targetStatus: 'suspended' })}
                              className="px-3 py-1.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold cursor-pointer"
                            >
                              Suspend
                            </button>
                          )}
                          <button
                            onClick={() => setDoctorToDelete(doc)}
                            className="px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 text-[11px] font-bold cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline mr-1" /> Deactivate
                          </button>
                          <button
                            onClick={() => {
                              setDoctorToPurge(doc);
                              setPurgeConfirmationText('');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold cursor-pointer flex items-center gap-1 shadow-xs transition-colors"
                            title="Completely delete doctor and all data permanently from database and project"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" /> Delete Permanently
                          </button>
                        </div>

                        <span className="text-[11px] font-medium text-slate-500">
                          {doc.accepting_appointments ? '🟢 Bookable' : '🔴 Paused'}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* End of Doctors Admin: Permanent Doctor Deletion from Database & Project */}
            <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200/90 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Permanent Doctor Deletion (Hard Delete / Database Purge)</span>
                  </div>
                  <p className="text-xs text-rose-800">
                    Completely remove any doctor, their login profile, schedule blocks, reviews, and bookmarks permanently from the MySQL database and project. This action cannot be reversed.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <select
                  id="permanent-doctor-select"
                  aria-label="Select doctor to permanently delete"
                  className="flex-1 p-2.5 rounded-xl border border-rose-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-rose-600 cursor-pointer"
                  defaultValue=""
                  onChange={(e) => {
                    const sel = doctors.find(d => d.id === e.target.value);
                    if (sel) {
                      setDoctorToPurge(sel);
                      setPurgeConfirmationText('');
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="" disabled>-- Select Doctor to Delete Completely from Database &amp; Project --</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.specialty}) — {d.email || d.registration_number} [{d.verification_status.toUpperCase()}]
                    </option>
                  ))}
                </select>
              </div>
            </div>

          </div>
        )}

        {/* ─── TAB 4: DOCTOR GRIEVANCE REPORTS ─────────────────────────────── */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            
            {/* Header & Status Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Doctor Grievance Reports</h2>
                <p className="text-xs text-slate-500">
                  Confidential patient grievances submitted against platform doctors. Review, investigate, resolve, or dismiss with recorded reasons.
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                {['all', 'open', 'under_review', 'resolved', 'dismissed'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setReportStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg transition-all capitalize cursor-pointer ${
                      reportStatusFilter === st
                        ? 'bg-[#0C182B] text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st.replace('_', ' ')} ({st === 'all' ? reports.length : reports.filter(r => r.status === st).length})
                  </button>
                ))}
              </div>
            </div>

            {/* Reports List */}
            {reports.filter(r => reportStatusFilter === 'all' || r.status === reportStatusFilter).length > 0 ? (
              <div className="space-y-4">
                {reports
                  .filter(r => reportStatusFilter === 'all' || r.status === reportStatusFilter)
                  .map((rep) => (
                    <div key={rep.id} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            rep.status === 'open'
                              ? 'bg-amber-100 text-amber-800'
                              : rep.status === 'under_review'
                              ? 'bg-blue-100 text-blue-800'
                              : rep.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {rep.status.replace('_', ' ')}
                          </span>
                          <span className="text-xs font-bold text-slate-900 capitalize">
                            Category: <span className="text-rose-700">{rep.category.replace('_', ' ')}</span>
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Submitted: {new Date(rep.created_at).toLocaleString()}
                        </span>
                      </div>

                      {/* Doctor & Patient info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Reported Doctor</span>
                          <span className="font-bold text-slate-900 text-sm block mt-0.5">{rep.doctor_name}</span>
                          <span className="text-teal-800">{rep.doctor_specialty}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Reporting Patient (Confidential)</span>
                          <span className="font-bold text-slate-900 text-sm block mt-0.5">{rep.patient_name}</span>
                          <span className="text-slate-500 font-mono">{rep.patient_email}</span>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-700 uppercase">Patient's Statement:</span>
                        <p className="text-xs text-slate-800 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-200/60 leading-relaxed whitespace-pre-wrap">
                          {rep.description}
                        </p>
                      </div>

                      {/* Evidence Link */}
                      {rep.evidence_url && (
                        <div className="text-xs text-teal-800 bg-teal-50 p-3 rounded-xl border border-teal-200">
                          <strong>Supporting Evidence Link:</strong>{' '}
                          <a href={rep.evidence_url} target="_blank" rel="noreferrer" className="underline font-bold">
                            {rep.evidence_url}
                          </a>
                        </div>
                      )}

                      {/* Admin Notes / Resolution */}
                      {rep.admin_notes && (
                        <div className="text-xs bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900">
                          <strong>Internal Investigation Notes:</strong> {rep.admin_notes}
                        </div>
                      )}
                      {rep.resolved_reason && (
                        <div className="text-xs bg-slate-100 p-3 rounded-xl text-slate-800">
                          <strong>Closure Reason:</strong> {rep.resolved_reason}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          {rep.status === 'open' && (
                            <button
                              onClick={() => {
                                setReportToUpdate({ report: rep, targetStatus: 'under_review' });
                                setReportActionReason('');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                            >
                              Mark Under Review
                            </button>
                          )}
                          {['open', 'under_review'].includes(rep.status) && (
                            <>
                              <button
                                onClick={() => {
                                  setReportToUpdate({ report: rep, targetStatus: 'resolved' });
                                  setReportActionReason('');
                                }}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                              >
                                Resolve Report
                              </button>
                              <button
                                onClick={() => {
                                  setReportToUpdate({ report: rep, targetStatus: 'dismissed' });
                                  setReportActionReason('');
                                }}
                                className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold cursor-pointer"
                              >
                                Dismiss Report
                              </button>
                            </>
                          )}
                        </div>

                        {/* Quick suspend doctor if report justifies */}
                        {['open', 'under_review'].includes(rep.status) && (
                          <button
                            onClick={() => {
                              const docMatch = doctors.find(d => d.id === rep.doctor_id);
                              if (docMatch) {
                                setDoctorToApprove({ doctor: docMatch, targetStatus: 'suspended' });
                                setDoctorActionReason(`Suspended pursuant to Patient Grievance Report #${rep.id.slice(0, 8)}`);
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-[11px] font-bold cursor-pointer flex items-center gap-1"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" /> Suspend Reported Doctor
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-base font-bold text-slate-800">No Grievances Found</h4>
                <p className="text-xs text-slate-500">
                  No doctor reports in status '{reportStatusFilter.replace('_', ' ')}'.
                </p>
              </div>
            )}

          </div>
        )}

        {/* ─── TAB 5: APPOINTMENTS ─────────────────────────────────────────── */}
        {activeTab === 'appointments' && (
          <div className="space-y-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <div>
                <h2 className="text-lg font-bold text-slate-900">System-Wide Appointments</h2>
                <p className="text-xs text-slate-500">Monitor live bookings, payment status, and consultation modes.</p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={appointmentStatusFilter}
                  onChange={(e) => setAppointmentStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold bg-slate-50 text-slate-800"
                >
                  <option value="all">All Statuses</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="RESCHEDULE_REQUIRED">Reschedule Required</option>
                </select>
              </div>
            </div>

            {/* Appointments List */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="p-4">Booking ID</th>
                      <th className="p-4">Patient Name</th>
                      <th className="p-4">Doctor</th>
                      <th className="p-4">Date &amp; Time</th>
                      <th className="p-4">Mode</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Payment</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {appointments
                      .filter(a => appointmentStatusFilter === 'all' || a.status === appointmentStatusFilter)
                      .map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-4 font-mono font-bold text-slate-800">{a.id.slice(0, 14)}</td>
                          <td className="p-4 font-bold text-slate-900">{a.patient_name}</td>
                          <td className="p-4 text-slate-700">{a.doctor_name}</td>
                          <td className="p-4 text-slate-600">{new Date(a.start_datetime).toLocaleDateString()} {new Date(a.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700 capitalize">
                              {a.consultation_type === 'video' ? <Video className="w-3.5 h-3.5 text-teal-600" /> : <Building2 className="w-3.5 h-3.5 text-teal-600" />}
                              {a.consultation_type}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-slate-900">{formatINR(a.total_inr)}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              a.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {a.payment_status.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              a.status === 'upcoming'
                                ? 'bg-emerald-100 text-emerald-800'
                                : a.status === 'completed'
                                ? 'bg-blue-100 text-blue-800'
                                : a.status === 'RESCHEDULE_REQUIRED'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {a.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ─── TAB 6: AUDIT TRAIL ──────────────────────────────────────────── */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Administrative Audit Trail</h2>
                <p className="text-xs text-slate-500">
                  Immutable record of all administrative actions, doctor verifications, patient deletions, and grievance reviews.
                </p>
              </div>
              <button
                onClick={loadData}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Log
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">Admin ID</th>
                      <th className="p-4">Action</th>
                      <th className="p-4">Target Type &amp; ID</th>
                      <th className="p-4">Status Shift</th>
                      <th className="p-4">Reason / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 text-slate-500 font-mono">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="p-4 font-mono text-slate-700">{log.admin_id}</td>
                        <td className="p-4 font-bold text-slate-900">{log.action}</td>
                        <td className="p-4 text-slate-700 font-mono">{log.target_type} ({log.target_id.slice(0, 16)})</td>
                        <td className="p-4">
                          {log.prev_status && log.new_status ? (
                            <span className="font-semibold text-slate-600">
                              {log.prev_status} → <span className="text-teal-700 font-bold">{log.new_status}</span>
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="p-4 text-slate-600 italic">{log.reason || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* ── MODAL 1: CONFIRM PATIENT DELETION ──────────────────────────────── */}
      {patientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-rose-200 shadow-2xl animate-fadeIn">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Confirm Patient Account Deletion</h3>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 text-xs text-rose-900 space-y-2 border border-rose-200/80">
              <p>
                You are about to permanently delete the account for:
                <br />
                <strong className="text-slate-900 text-sm">{patientToDelete.full_name}</strong>
                <br />
                <code className="text-slate-700 font-bold">{patientToDelete.email}</code>
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-rose-800">
                <li>Clerk authentication credentials will be removed so the email can be registered afresh.</li>
                <li>Upcoming appointments will be cancelled with 100% refund.</li>
                <li>Prescriptions, past consultation notes, and payment invoices are preserved for legal retention.</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Reason for Deletion <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={patientDeleteReason}
                onChange={(e) => setPatientDeleteReason(e.target.value)}
                placeholder="e.g. User requested account closure, GDPR right to be forgotten"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-rose-600 bg-slate-50"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                disabled={deletingPatient}
                onClick={() => { setPatientToDelete(null); setPatientDeleteReason(''); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={deletingPatient}
                onClick={handleConfirmDeletePatient}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {deletingPatient ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Confirm Deletion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: CONFIRM DOCTOR APPROVAL / REJECTION / SUSPENSION ───────── */}
      {doctorToApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-fadeIn">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-teal-700" />
              <h3 className="text-base font-bold text-slate-900 capitalize">
                {doctorToApprove.targetStatus} Doctor Profile
              </h3>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 text-xs text-slate-700 space-y-1 border border-slate-200">
              <p>Doctor: <strong className="text-slate-900">{doctorToApprove.doctor.name}</strong></p>
              <p>Specialty: <strong>{doctorToApprove.doctor.specialty}</strong></p>
              <p>NMC Registration: <code className="font-bold text-slate-900">{doctorToApprove.doctor.registration_number}</code></p>
              <p>Current Status: <span className="font-bold uppercase text-teal-800">{doctorToApprove.doctor.verification_status}</span></p>
            </div>

            {['rejected', 'suspended'].includes(doctorToApprove.targetStatus) && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Reason for {doctorToApprove.targetStatus} *
                </label>
                <textarea
                  required
                  rows={3}
                  value={doctorActionReason}
                  onChange={(e) => setDoctorActionReason(e.target.value)}
                  placeholder="Provide reason for audit log and doctor notification..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-amber-600 bg-slate-50 resize-none"
                />
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                disabled={submittingDoctorApproval}
                onClick={() => { setDoctorToApprove(null); setDoctorActionReason(''); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={submittingDoctorApproval}
                onClick={handleConfirmDoctorApproval}
                className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm capitalize ${
                  doctorToApprove.targetStatus === 'approved'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : doctorToApprove.targetStatus === 'suspended'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-slate-800 hover:bg-slate-900'
                }`}
              >
                {submittingDoctorApproval ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Confirm {doctorToApprove.targetStatus}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: CONFIRM DOCTOR DELETION ───────────────────────────────── */}
      {doctorToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-rose-200 shadow-2xl animate-fadeIn">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Deactivate Doctor Account</h3>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 text-xs text-rose-900 space-y-2 border border-rose-200/80">
              <p>
                Deactivating <strong className="text-slate-900">{doctorToDelete.name}</strong> ({doctorToDelete.email}):
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-rose-800">
                <li>Doctor will no longer appear on the platform or receive bookings.</li>
                <li>Upcoming appointments will be marked for patient rescheduling.</li>
                <li>Past consultations, invoices, and audit logs are safely preserved.</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Reason for Deactivation
              </label>
              <input
                type="text"
                value={doctorDeleteReason}
                onChange={(e) => setDoctorDeleteReason(e.target.value)}
                placeholder="e.g. License revocation, doctor relocation, departure"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-rose-600 bg-slate-50"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                disabled={deletingDoctor}
                onClick={() => { setDoctorToDelete(null); setDoctorDeleteReason(''); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={deletingDoctor}
                onClick={handleConfirmDeleteDoctor}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {deletingDoctor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Confirm Deactivation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 5: CONFIRM PERMANENT DOCTOR DELETION ─────────────────────── */}
      {doctorToPurge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border-2 border-rose-500 shadow-2xl animate-fadeIn">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Delete Doctor Completely</h3>
                <p className="text-xs text-rose-600 font-semibold">Permanent Database &amp; Project Purge</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 text-xs text-rose-950 space-y-2 border border-rose-200">
              <p>
                You are about to <strong className="text-rose-700 underline">permanently delete</strong>:
              </p>
              <div className="p-2.5 rounded-xl bg-white border border-rose-200 font-mono text-[11px] text-slate-800 space-y-0.5">
                <div><strong>Name:</strong> {doctorToPurge.name}</div>
                <div><strong>Doctor ID:</strong> {doctorToPurge.id}</div>
                <div><strong>Email:</strong> {doctorToPurge.email}</div>
                <div><strong>Registration:</strong> {doctorToPurge.registration_number}</div>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-rose-900 pt-1 font-medium">
                <li>Completely purged from <code className="bg-rose-100 px-1 rounded">doctor_profiles</code> and <code className="bg-rose-100 px-1 rounded">profiles</code>.</li>
                <li>All schedule rules, blocks, holds, and saved bookmarks will be deleted.</li>
                <li>Any associated doctor reviews and grievance reports will be removed.</li>
                <li>Clerk authentication credentials will be revoked.</li>
                <li className="font-bold text-rose-700">This action CANNOT be undone!</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Type <span className="font-mono text-rose-600 select-all font-extrabold">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={purgeConfirmationText}
                onChange={(e) => setPurgeConfirmationText(e.target.value)}
                placeholder="DELETE"
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-mono uppercase tracking-wider focus:outline-none focus:border-rose-600 bg-slate-50"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                disabled={purgingDoctor}
                onClick={() => {
                  setDoctorToPurge(null);
                  setPurgeConfirmationText('');
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={purgingDoctor || purgeConfirmationText.trim().toUpperCase() !== 'DELETE'}
                onClick={handleConfirmPermanentDeleteDoctor}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
              >
                {purgingDoctor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete Completely
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: REPORT ACTION / RESOLUTION ────────────────────────────── */}
      {reportToUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-fadeIn">
            <div className="flex items-center gap-3">
              <Flag className="w-6 h-6 text-teal-700" />
              <h3 className="text-base font-bold text-slate-900 capitalize">
                {reportToUpdate.targetStatus.replace('_', ' ')} Report
              </h3>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 text-xs text-slate-700 border border-slate-200 space-y-1">
              <p>Doctor: <strong>{reportToUpdate.report.doctor_name}</strong></p>
              <p>Patient: <strong>{reportToUpdate.report.patient_name}</strong></p>
              <p>Issue: <em>{reportToUpdate.report.category.replace('_', ' ')}</em></p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Internal Investigation Notes
              </label>
              <textarea
                rows={2}
                value={reportAdminNotes}
                onChange={(e) => setReportAdminNotes(e.target.value)}
                placeholder="Findings, actions taken, contact with parties..."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-teal-700 bg-slate-50 resize-none"
              />
            </div>

            {['resolved', 'dismissed'].includes(reportToUpdate.targetStatus) && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Closure Reason *
                </label>
                <input
                  type="text"
                  required
                  value={reportActionReason}
                  onChange={(e) => setReportActionReason(e.target.value)}
                  placeholder="e.g. Warning issued to doctor; Full fee refunded to patient"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-teal-700 bg-slate-50"
                />
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                disabled={submittingReportAction}
                onClick={() => { setReportToUpdate(null); setReportActionReason(''); setReportAdminNotes(''); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={submittingReportAction}
                onClick={handleConfirmReportAction}
                className="flex-1 py-2.5 rounded-xl bg-[#0C182B] hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm capitalize"
              >
                {submittingReportAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Confirm {reportToUpdate.targetStatus.replace('_', ' ')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 5: RECONCILE / FREE CLERK EMAIL ──────────────────────────── */}
      {isReconcileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-amber-200 shadow-2xl animate-fadeIn">
            <div className="flex items-center gap-3 text-amber-700">
              <KeyRound className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Authentication &amp; Clerk Reconciliation</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              When an account was deleted or orphaned, Clerk may still hold the email and reject new registrations with
              <span className="font-semibold text-rose-700"> "That email address is taken"</span>. Enter the email below to safely purge lingering Clerk credentials.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Target Email Address *
              </label>
              <input
                type="email"
                required
                value={reconcileEmail}
                onChange={(e) => setReconcileEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-amber-600 bg-slate-50"
              />
            </div>

            {reconcileResult && (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  {reconcileResult.message}
                </p>
                <p className="text-[11px] text-emerald-700">
                  Removed {reconcileResult.deletedCount} Clerk account(s). The user can now register freshly.
                </p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                disabled={reconciling}
                onClick={() => { setIsReconcileModalOpen(false); setReconcileResult(null); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
              <button
                disabled={reconciling || !reconcileEmail.trim()}
                onClick={handleRunReconciliation}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {reconciling ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                Purge &amp; Release Email
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
