import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  User, 
  Stethoscope, 
  Shield, 
  ShieldCheck, 
  Mail, 
  Lock, 
  Phone, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  KeyRound, 
  RefreshCw, 
  LogIn, 
  UserPlus, 
  Building2, 
  Award, 
  Camera, 
  FileText,
  ChevronDown,
  Info
} from 'lucide-react';
import { useSignIn, useSignUp, useClerk, useUser, useAuth } from '@clerk/clerk-react';
import { SPECIALTIES, INDIAN_CITIES } from '../data/specialtiesData';
import { INITIAL_DOCTORS } from '../data/doctorsData';
import { UserProfile, DoctorAuthData } from '../types';
import { AdminAuthData } from './AdminAuthModal';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export type AuthRole = 'patient' | 'doctor' | 'admin';
export type AuthMode = 'signin' | 'signup';

interface UnifiedAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: AuthRole;
  initialMode?: AuthMode;
  customMessage?: string | null;
  onPatientLoginSuccess: (user: UserProfile) => void;
  onDoctorLoginSuccess: (doctor: DoctorAuthData) => void;
  onAdminLoginSuccess: (admin: AdminAuthData) => void;
}

export const UnifiedAuthModal: React.FC<UnifiedAuthModalProps> = ({
  isOpen,
  onClose,
  initialRole = 'patient',
  initialMode = 'signin',
  customMessage,
  onPatientLoginSuccess,
  onDoctorLoginSuccess,
  onAdminLoginSuccess
}) => {
  // Master selection states
  const [selectedRole, setSelectedRole] = useState<AuthRole>(initialRole);
  const [activeMode, setActiveMode] = useState<AuthMode>(initialMode);

  // Clerk Auth Hooks
  const clerk = useClerk();
  const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();
  const { isSignedIn, getToken } = useAuth();
  const { user: clerkUser } = useUser();

  // ── Common Feedback States ──────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // ── Patient Form States ─────────────────────────────────────────────────────
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPassword, setPatientPassword] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [pendingPatientVerification, setPendingPatientVerification] = useState(false);
  const [patientVerificationCode, setPatientVerificationCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // ── Doctor Form States ──────────────────────────────────────────────────────
  const [docEmail, setDocEmail] = useState('');
  const [docPassword, setDocPassword] = useState('');
  const [docName, setDocName] = useState('');
  const [docPhone, setDocPhone] = useState('');
  const [docRegNumber, setDocRegNumber] = useState('');
  const [docSpecialty, setDocSpecialty] = useState(SPECIALTIES[0]?.name || 'General Physician');
  const [docQualifications, setDocQualifications] = useState('');
  const [docExperience, setDocExperience] = useState('5');
  const [docClinicName, setDocClinicName] = useState('');
  const [docCity, setDocCity] = useState(INDIAN_CITIES[0] || 'Mumbai');
  const [docAbout, setDocAbout] = useState('');
  const [docFee, setDocFee] = useState('499');
  const [docStep, setDocStep] = useState<'creds' | 'profile' | 'done'>('creds');
  const [docPhotoFile, setDocPhotoFile] = useState<File | null>(null);
  const [docPhotoPreview, setDocPhotoPreview] = useState<string>('');
  const [docIdProofFile, setDocIdProofFile] = useState<File | null>(null);
  const docPhotoInputRef = useRef<HTMLInputElement>(null);
  const docIdProofInputRef = useRef<HTMLInputElement>(null);

  // ── Admin Form States ───────────────────────────────────────────────────────
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Synchronize on modal open or prop change
  useEffect(() => {
    if (isOpen) {
      setSelectedRole(initialRole);
      setActiveMode(initialMode);
      setErrorMessage(null);
      setSuccessMessage(null);
      setLoading(false);
      setDocStep('creds');
      setPendingPatientVerification(false);
    }
  }, [isOpen, initialRole, initialMode]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // ────────────────────────────────────────────────────────────────────────────
  // PATIENT SUBMISSION HANDLERS
  // ────────────────────────────────────────────────────────────────────────────
  const handlePatientSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!patientEmail.trim() || !patientEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!patientPassword) {
      setErrorMessage('Please enter your password.');
      return;
    }
    if (!isSignInLoaded || !signIn) {
      setErrorMessage('Clerk authentication service is initializing. Please try again.');
      return;
    }

    setLoading(true);
    try {
      const result = await signIn.create({
        identifier: patientEmail.trim(),
        password: patientPassword,
      });

      if (result.status === 'complete') {
        await setSignInActive({ session: result.createdSessionId });
        const activeSession = clerk.client?.sessions?.find(s => s.id === result.createdSessionId);
        const verifiedUserId =
          (result as any).createdUserId ||
          activeSession?.user?.id ||
          clerk.user?.id ||
          undefined;

        const formattedPhone = patientPhone.trim() ? (patientPhone.trim().startsWith('+') ? patientPhone.trim() : `+91 ${patientPhone.trim()}`) : '';
        const loggedInUser: UserProfile = {
          id: verifiedUserId,
          name: patientName.trim() || patientEmail.trim().split('@')[0],
          phone: formattedPhone,
          email: patientEmail.trim(),
          isLoggedIn: true,
        };

        try {
          await fetch(`${API_BASE_URL}/auth/sync-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: verifiedUserId,
              sessionId: result.createdSessionId,
              email: patientEmail.trim(),
              fullName: loggedInUser.name,
              role: 'patient',
              phone: formattedPhone,
            }),
          });
        } catch (_) {}

        onPatientLoginSuccess(loggedInUser);
        onClose();
      } else {
        setErrorMessage(`Additional authentication required: ${result.status}`);
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || 'Sign in failed.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!patientName.trim()) { setErrorMessage('Full name is required.'); return; }
    if (!patientEmail.trim() || !patientEmail.includes('@')) { setErrorMessage('Valid email address is required.'); return; }
    if (patientPassword.length < 8) { setErrorMessage('Password must be at least 8 characters.'); return; }
    if (!isSignUpLoaded || !signUp) { setErrorMessage('Auth service is initializing.'); return; }

    setLoading(true);
    try {
      const parts = patientName.trim().split(' ');
      const firstName = parts[0] || 'Patient';
      const lastName = parts.slice(1).join(' ') || '';

      await signUp.create({
        emailAddress: patientEmail.trim(),
        password: patientPassword,
        firstName,
        lastName,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingPatientVerification(true);
      setResendCooldown(60);
      setSuccessMessage(`A 6-digit verification code has been sent to ${patientEmail.trim()}.`);
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || 'Registration failed.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!patientVerificationCode.trim() || patientVerificationCode.trim().length < 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }
    if (!isSignUpLoaded || !signUp) return;

    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: patientVerificationCode.trim(),
      });

      if (result.status === 'complete') {
        await setSignUpActive({ session: result.createdSessionId });
        const activeSession = clerk.client?.sessions?.find(s => s.id === result.createdSessionId);
        const verifiedUserId =
          (result as any).createdUserId ||
          activeSession?.user?.id ||
          clerk.user?.id ||
          undefined;

        const formattedPhone = patientPhone.trim() ? (patientPhone.trim().startsWith('+') ? patientPhone.trim() : `+91 ${patientPhone.trim()}`) : '';
        const loggedInUser: UserProfile = {
          id: verifiedUserId,
          name: patientName.trim() || patientEmail.trim().split('@')[0],
          phone: formattedPhone,
          email: patientEmail.trim(),
          isLoggedIn: true,
        };

        try {
          await fetch(`${API_BASE_URL}/auth/sync-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: verifiedUserId,
              sessionId: result.createdSessionId,
              email: patientEmail.trim(),
              fullName: loggedInUser.name,
              role: 'patient',
              phone: formattedPhone,
            }),
          });
        } catch (_) {}

        onPatientLoginSuccess(loggedInUser);
        onClose();
      } else {
        setErrorMessage(`Verification incomplete: ${result.status}`);
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || 'Invalid verification code.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // DOCTOR SUBMISSION HANDLERS
  // ────────────────────────────────────────────────────────────────────────────
  const handleDoctorSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!docEmail.trim()) { setErrorMessage('Please enter doctor email address.'); return; }
    if (!docPassword) { setErrorMessage('Please enter password.'); return; }
    if (!isSignInLoaded || !signIn) { setErrorMessage('Auth service is initializing.'); return; }

    setLoading(true);
    try {
      const result = await signIn.create({
        identifier: docEmail.trim(),
        password: docPassword,
      });

      if (result.status === 'complete') {
        await setSignInActive({ session: result.createdSessionId });
        const activeSession = clerk.client?.sessions?.find(s => s.id === result.createdSessionId);
        const verifiedDocId =
          (result as any).createdUserId ||
          activeSession?.user?.id ||
          clerk.user?.id ||
          '';

        let token = '';
        try { if (getToken) token = (await getToken()) || ''; } catch (_) {}

        const res = await fetch(`${API_BASE_URL}/doctors/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...(verifiedDocId ? { 'x-user-id': verifiedDocId } : {}),
            'x-user-role': 'doctor',
          },
          body: JSON.stringify({ email: docEmail.trim() }),
        });

        const body = await res.json();
        if (res.ok && body.success && body.data) {
          onDoctorLoginSuccess(body.data as DoctorAuthData);
          onClose();
        } else {
          setErrorMessage(body?.error || 'No verified doctor profile found for this account. Please register first.');
        }
      } else {
        setErrorMessage(`Doctor sign in requires additional verification: ${result.status}`);
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || 'Doctor login failed.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoDoctorClick = (doc: typeof INITIAL_DOCTORS[0]) => {
    const demoData: DoctorAuthData = {
      id: doc.id,
      doctorId: doc.id,
      name: doc.name,
      email: `${doc.id}@demo.medinest.in`,
      phone: '+91 9876543210',
      specialty: doc.specialty,
      qualifications: doc.qualifications,
      experienceYears: doc.experienceYears,
      clinicName: doc.clinicName,
      address: doc.address,
      city: doc.city,
      feeINR: doc.feeINR,
      rating: doc.rating,
      reviewCount: doc.reviewCount,
      registrationNumber: doc.registrationNumber || `REG-${doc.id.toUpperCase()}`,
      photo: doc.photo,
      languages: doc.languages,
      isLoggedIn: true,
      acceptingNewAppointments: true,
      consultationModes: doc.consultationModes,
    };
    onDoctorLoginSuccess(demoData);
    onClose();
  };

  const handleDoctorRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!docName.trim()) { setErrorMessage('Doctor full name is required.'); return; }
    if (!docRegNumber.trim()) { setErrorMessage('Medical Registration Number (NMC/SMC) is required.'); return; }
    if (!docEmail.trim() || !docEmail.includes('@')) { setErrorMessage('Valid email address is required.'); return; }
    if (docPassword.length < 8) { setErrorMessage('Password must be at least 8 characters.'); return; }

    setLoading(true);
    try {
      // 1. Create Clerk Account for Doctor
      const parts = docName.trim().split(' ');
      const firstName = parts[0] || 'Dr.';
      const lastName = parts.slice(1).join(' ') || '';

      let createdUserId = '';
      try {
        const signupRes = await signUp?.create({
          emailAddress: docEmail.trim(),
          password: docPassword,
          firstName,
          lastName,
        });
        if (signupRes?.createdUserId) createdUserId = signupRes.createdUserId;
      } catch (_) {}

      // 2. Upload photo if selected
      let photoUrl = '';
      if (docPhotoFile) {
        const photoData = new FormData();
        photoData.append('photo', docPhotoFile);
        try {
          const upRes = await fetch(`${API_BASE_URL}/doctors/upload-photo`, {
            method: 'POST',
            body: photoData,
          });
          const upBody = await upRes.json();
          if (upBody?.success && upBody?.photoUrl) photoUrl = upBody.photoUrl;
        } catch (_) {}
      }

      // 3. Register doctor profile on backend
      const res = await fetch(`${API_BASE_URL}/doctors/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: createdUserId || undefined,
          email: docEmail.trim(),
          fullName: docName.trim(),
          phone: docPhone.trim(),
          name: docName.trim().startsWith('Dr.') ? docName.trim() : `Dr. ${docName.trim()}`,
          registrationNumber: docRegNumber.trim(),
          specialty: docSpecialty,
          qualifications: docQualifications.trim() || 'MBBS',
          experienceYears: Number(docExperience) || 5,
          clinicName: docClinicName.trim() || 'MediNest Partner Clinic',
          city: docCity,
          about: docAbout.trim() || 'Experienced medical practitioner.',
          feeINR: Number(docFee) || 499,
          photo: photoUrl || null,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        setErrorMessage(body?.error || 'Doctor registration failed. Please review your details.');
        return;
      }

      setDocStep('done');
      setSuccessMessage('Doctor credentials submitted successfully! NMC verification is under review.');
    } catch (err: any) {
      setErrorMessage(`Registration error: ${err?.message || 'Server unreachable'}`);
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // ADMIN SUBMISSION HANDLERS
  // ────────────────────────────────────────────────────────────────────────────
  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!adminEmail.trim()) { setErrorMessage('Please enter administrator email.'); return; }
    if (!adminPassword) { setErrorMessage('Please enter administrator password.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail.trim(), password: adminPassword }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        setErrorMessage(body?.error || 'Administrator verification failed. Unauthorized account.');
        return;
      }

      if (body.token) {
        localStorage.setItem('medinest_admin_token', body.token);
      }

      onAdminLoginSuccess({
        id: body.admin?.id || 'admin_medinest',
        name: body.admin?.name || 'MediNest Platform Administrator',
        email: body.admin?.email || adminEmail.trim(),
        role: 'admin',
        token: body.token,
        isLoggedIn: true,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unable to connect to administration server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unified-auth-title"
    >
      <div 
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top Header ──────────────────────────────────────────────────────── */}
        <div className="bg-[#032F31] text-white p-5 sm:p-6 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 text-[#FAE58D] text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-[#FAE58D]" />
            Unified Healthcare Access
          </div>

          <h2 id="unified-auth-title" className="text-xl sm:text-2xl font-display font-medium text-white">
            Welcome to MediNest
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Sign in or create an account to access clinical services, doctor management, or platform administration.
          </p>

          {/* Mode Switcher Tabs (Sign In vs Sign Up) */}
          <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-black/25 rounded-2xl border border-teal-900/40">
            <button
              type="button"
              onClick={() => {
                setActiveMode('signin');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeMode === 'signin'
                  ? 'bg-[#FAE58D] text-[#032F31] shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMode('signup');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeMode === 'signup'
                  ? 'bg-[#FAE58D] text-[#032F31] shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Sign Up</span>
            </button>
          </div>
        </div>

        {/* ── Scrollable Body ─────────────────────────────────────────────────── */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Custom booking / context message */}
          {customMessage && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Action Required</span>
                <span className="text-slate-700 mt-0.5 block">{customMessage}</span>
              </div>
            </div>
          )}

          {/* Role Selection Options (3 Cards) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Select Your Role
              </label>
              <span className="text-[11px] font-semibold text-teal-800">
                {selectedRole === 'patient' ? 'Patient Access' : selectedRole === 'doctor' ? 'Practitioner Access' : 'Administration Access'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Patient Card */}
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('patient');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                  selectedRole === 'patient'
                    ? 'border-teal-700 bg-teal-50/80 shadow-xs ring-2 ring-teal-700/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    selectedRole === 'patient' ? 'bg-[#032F31] text-[#FAE58D]' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <User className="w-3.5 h-3.5" />
                  </div>
                  {selectedRole === 'patient' && (
                    <span className="w-2 h-2 rounded-full bg-teal-700" />
                  )}
                </div>
                <div className="text-xs font-bold text-[#0C182B]">Patient</div>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                  Access healthcare services, find doctors, and manage appointments.
                </p>
              </button>

              {/* Doctor Card */}
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('doctor');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                  selectedRole === 'doctor'
                    ? 'border-teal-700 bg-teal-50/80 shadow-xs ring-2 ring-teal-700/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    selectedRole === 'doctor' ? 'bg-[#032F31] text-[#FAE58D]' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Stethoscope className="w-3.5 h-3.5" />
                  </div>
                  {selectedRole === 'doctor' && (
                    <span className="w-2 h-2 rounded-full bg-teal-700" />
                  )}
                </div>
                <div className="text-xs font-bold text-[#0C182B]">Doctor</div>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                  Access the doctor dashboard and manage professional activities.
                </p>
              </button>

              {/* Admin Card */}
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('admin');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                  selectedRole === 'admin'
                    ? 'border-amber-600 bg-amber-50/80 shadow-xs ring-2 ring-amber-600/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    selectedRole === 'admin' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  {selectedRole === 'admin' && (
                    <span className="w-2 h-2 rounded-full bg-amber-600" />
                  )}
                </div>
                <div className="text-xs font-bold text-[#0C182B]">Admin</div>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                  Access administrative tools and manage the platform.
                </p>
              </button>
            </div>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-medium">{successMessage}</span>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────────
              ROLE 1: PATIENT FORMS
              ──────────────────────────────────────────────────────────────────── */}
          {selectedRole === 'patient' && (
            <div>
              {activeMode === 'signin' ? (
                /* Patient Sign In Form */
                <form onSubmit={handlePatientSignIn} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="email"
                        value={patientEmail}
                        onChange={(e) => setPatientEmail(e.target.value)}
                        placeholder="patient@example.com"
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-teal-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={patientPassword}
                        onChange={(e) => setPatientPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-teal-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-2xl bg-[#032F31] hover:bg-[#074749] text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-[#FAE58D]" />
                        <span>Verifying Patient Account...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4 text-[#FAE58D]" />
                        <span>Sign In as Patient</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Patient Sign Up Form */
                <div>
                  {!pendingPatientVerification ? (
                    <form onSubmit={handlePatientSignUp} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Full Name
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                          <input
                            type="text"
                            value={patientName}
                            onChange={(e) => setPatientName(e.target.value)}
                            placeholder="e.g. Yash Dhawale"
                            required
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-teal-600"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Email Address
                          </label>
                          <div className="relative">
                            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                            <input
                              type="email"
                              value={patientEmail}
                              onChange={(e) => setPatientEmail(e.target.value)}
                              placeholder="name@example.com"
                              required
                              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-teal-600"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Phone Number
                          </label>
                          <div className="relative">
                            <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                            <input
                              type="tel"
                              value={patientPhone}
                              onChange={(e) => setPatientPhone(e.target.value)}
                              placeholder="+91 9876543210"
                              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-teal-600"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Create Password
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={patientPassword}
                            onChange={(e) => setPatientPassword(e.target.value)}
                            placeholder="Minimum 8 characters"
                            required
                            minLength={8}
                            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-teal-600"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          Must be at least 8 characters with letters and numbers.
                        </span>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-2xl bg-[#032F31] hover:bg-[#074749] text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-[#FAE58D]" />
                            <span>Creating Patient Profile...</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 text-[#FAE58D]" />
                            <span>Create Patient Account</span>
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    /* Verification Code Screen */
                    <form onSubmit={handlePatientVerifyCode} className="space-y-4">
                      <div className="text-center py-2">
                        <KeyRound className="w-8 h-8 text-teal-700 mx-auto mb-2" />
                        <h4 className="text-sm font-bold text-[#0C182B]">Enter Verification Code</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          We sent a 6-digit confirmation code to <strong>{patientEmail}</strong>.
                        </p>
                      </div>

                      <div>
                        <input
                          type="text"
                          value={patientVerificationCode}
                          onChange={(e) => setPatientVerificationCode(e.target.value)}
                          placeholder="123456"
                          maxLength={6}
                          required
                          className="w-full text-center tracking-widest text-lg font-bold py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-2xl bg-[#032F31] text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-[#FAE58D]" />}
                        <span>Verify & Sign In</span>
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────────
              ROLE 2: DOCTOR FORMS
              ──────────────────────────────────────────────────────────────────── */}
          {selectedRole === 'doctor' && (
            <div>
              {activeMode === 'signin' ? (
                /* Doctor Sign In Form */
                <form onSubmit={handleDoctorSignIn} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Doctor Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="email"
                        value={docEmail}
                        onChange={(e) => setDocEmail(e.target.value)}
                        placeholder="doctor@medinest.in"
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-teal-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Doctor Portal Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={docPassword}
                        onChange={(e) => setDocPassword(e.target.value)}
                        placeholder="Enter password"
                        required
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-teal-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-2xl bg-[#032F31] hover:bg-[#074749] text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-[#FAE58D]" />
                        <span>Verifying NMC Doctor Credentials...</span>
                      </>
                    ) : (
                      <>
                        <Stethoscope className="w-4 h-4 text-[#FAE58D]" />
                        <span>Sign In to Doctor Portal</span>
                      </>
                    )}
                  </button>

                  {/* Quick Demo Doctor Access for Evaluation */}
                  <div className="pt-3 border-t border-slate-100">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-2">
                      Quick Demo Doctor Profiles (1-Click Test Access):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {INITIAL_DOCTORS.filter(d =>
                        ['doc-1','doc-2','doc-3','doc-4','doc-5','doc-6','doc-7','doc-8'].includes(d.id)
                      ).map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => handleDemoDoctorClick(d)}
                          className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-semibold border border-teal-200 transition-colors cursor-pointer"
                          title={`${d.name} — ${d.specialty} | ${d.qualifications} | ${d.clinicName}, ${d.city} | ₹${d.feeINR}`}
                        >
                          {d.name.replace(/^Dr\.\s*/i, '').split(' ')[0]} ({d.specialty.split(' ')[0]})
                        </button>
                      ))}
                    </div>
                  </div>
                </form>
              ) : (
                /* Doctor Registration Form */
                <div>
                  {docStep !== 'done' ? (
                    <form onSubmit={handleDoctorRegistrationSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Doctor Full Name
                          </label>
                          <input
                            type="text"
                            value={docName}
                            onChange={(e) => setDocName(e.target.value)}
                            placeholder="Dr. Rajesh Sharma"
                            required
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-teal-600"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            NMC / SMC Reg Number
                          </label>
                          <input
                            type="text"
                            value={docRegNumber}
                            onChange={(e) => setDocRegNumber(e.target.value)}
                            placeholder="MCI-2019-98213"
                            required
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-teal-600"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={docEmail}
                            onChange={(e) => setDocEmail(e.target.value)}
                            placeholder="doctor@hospital.in"
                            required
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-teal-600"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Password
                          </label>
                          <input
                            type="password"
                            value={docPassword}
                            onChange={(e) => setDocPassword(e.target.value)}
                            placeholder="Min. 8 characters"
                            required
                            minLength={8}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-teal-600"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Specialty
                          </label>
                          <select
                            value={docSpecialty}
                            onChange={(e) => setDocSpecialty(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:border-teal-600"
                          >
                            {SPECIALTIES.map((s) => (
                              <option key={s.id} value={s.name}>{s.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Practice City
                          </label>
                          <select
                            value={docCity}
                            onChange={(e) => setDocCity(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:border-teal-600"
                          >
                            {INDIAN_CITIES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Fee in INR (₹)
                          </label>
                          <input
                            type="number"
                            value={docFee}
                            onChange={(e) => setDocFee(e.target.value)}
                            placeholder="499"
                            required
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold focus:outline-none focus:border-teal-600"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-2xl bg-[#032F31] hover:bg-[#074749] text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-[#FAE58D]" />
                            <span>Submitting Verification Credentials...</span>
                          </>
                        ) : (
                          <>
                            <Stethoscope className="w-4 h-4 text-[#FAE58D]" />
                            <span>Register as Verified Doctor</span>
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    <div className="text-center py-6">
                      <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
                      <h4 className="text-base font-bold text-[#0C182B]">Credentials Received</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Your registration has been submitted. The clinical review board will verify your credentials.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMode('signin');
                          setDocStep('creds');
                        }}
                        className="mt-4 px-5 py-2 rounded-xl bg-[#032F31] text-white text-xs font-bold"
                      >
                        Proceed to Doctor Sign In
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────────
              ROLE 3: ADMIN FORMS
              ──────────────────────────────────────────────────────────────────── */}
          {selectedRole === 'admin' && (
            <div>
              {activeMode === 'signin' ? (
                /* Admin Sign In Form */
                <form onSubmit={handleAdminSignIn} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Administrator Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="admin@medinest.in"
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-amber-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Administrator Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Enter admin credentials"
                        required
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-amber-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Verifying Cryptographic Credentials...</span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        <span>Authenticate Administrator Access</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Admin Sign Up: Restricted Policy Notice */
                <div className="p-6 rounded-2xl bg-amber-50/70 border border-amber-200 text-center space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                    <Shield className="w-5 h-5" />
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">
                    Administrator Registration is Restricted
                  </h3>

                  <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                    MediNest platform administrator accounts cannot be registered publicly. To maintain HIPAA compliance, healthcare audit integrity, and data protection, administrator access is provisioned internally by platform security engineers.
                  </p>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveMode('signin')}
                      className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-slate-950 font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Proceed to Administrator Sign In</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
