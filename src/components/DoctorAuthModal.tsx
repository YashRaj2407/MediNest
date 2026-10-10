import React, { useState, useEffect, useRef } from 'react';
import {
  X, Stethoscope, Lock, Mail, ShieldCheck,
  Eye, EyeOff, CheckCircle, Award, AlertCircle, Loader2,
  Play, Camera, FileText, ChevronDown, ArrowRight, UserPlus, LogIn, Phone
} from 'lucide-react';
import { useSignIn, useSignUp, useUser, useAuth, useClerk } from '@clerk/clerk-react';
import { SPECIALTIES, INDIAN_CITIES } from '../data/specialtiesData';
import { DoctorAuthData } from '../types';
import { INITIAL_DOCTORS } from '../data/doctorsData';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

interface DoctorAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDoctorLoginSuccess: (doctor: DoctorAuthData) => void;
  initialTab?: 'login' | 'register';
}

// ─── Step states ──────────────────────────────────────────────────────────────
type LoginStep = 'form' | 'loading' | 'done';
type RegStep = 'clerk-auth' | 'profile-form' | 'uploading' | 'done';

export const DoctorAuthModal: React.FC<DoctorAuthModalProps> = ({
  isOpen, onClose, onDoctorLoginSuccess, initialTab = 'login'
}) => {
  if (!isOpen) return null;

  // Clerk hooks
  const clerk = useClerk();
  const { isLoaded: signInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: signUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();
  const { isSignedIn, isLoaded: authLoaded, getToken } = useAuth();
  const { user } = useUser();

  // Tabs
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);

  // ── Login state ──────────────────────────────────────────────────────────────
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [loginStep, setLoginStep] = useState<LoginStep>('form');
  const [loginError, setLoginError] = useState('');

  // ── Registration state ───────────────────────────────────────────────────────
  const [regStep, setRegStep] = useState<RegStep>(isSignedIn ? 'profile-form' : 'clerk-auth');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPw, setShowRegPw] = useState(false);
  const [regClerkError, setRegClerkError] = useState('');
  const [regClerkLoading, setRegClerkLoading] = useState(false);
  const [regDuplicateEmail, setRegDuplicateEmail] = useState(false);
  const [regReconciling, setRegReconciling] = useState(false);
  const [regSuccessNotice, setRegSuccessNotice] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);


  // Profile form fields
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRegNumber, setRegRegNumber] = useState('');
  const [regSpecialty, setRegSpecialty] = useState(SPECIALTIES[0]?.name || 'General Physician');
  const [regQualifications, setRegQualifications] = useState('');
  const [regExperience, setRegExperience] = useState('5');
  const [regClinicName, setRegClinicName] = useState('');
  const [regCity, setRegCity] = useState(INDIAN_CITIES[0] || 'Mumbai');
  const [regAbout, setRegAbout] = useState('');
  const [regFee, setRegFee] = useState('');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // Photo upload
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ID proof upload
  const [idProofFile, setIdProofFile] = useState<File | null>(null);
  const idProofInputRef = useRef<HTMLInputElement>(null);

  // Sync signed-in state
  useEffect(() => {
    if (isSignedIn && regStep === 'clerk-auth') {
      setRegStep('profile-form');
      const email = user?.primaryEmailAddress?.emailAddress || '';
      const defaultName = user?.fullName || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : '');
      setRegEmail(email);
      setRegName(defaultName);
    }
  }, [isSignedIn, regStep, user?.id]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setLoginError('');
      setRegClerkError('');
      setRegError('');
      setLoginStep('form');
      setRegStep(isSignedIn ? 'profile-form' : 'clerk-auth');
      const email = user?.primaryEmailAddress?.emailAddress || '';
      const defaultName = user?.fullName || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : '');
      setRegEmail(email);
      setRegName(defaultName);
    }
  }, [isOpen, initialTab, user?.id]);

  // ── Photo handler ────────────────────────────────────────────────────────────
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Photo must be under 5 MB.'); return; }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ── Doctor Sign-In ────────────────────────────────────────────────────────────
  const handleDoctorSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginEmail.trim()) { setLoginError('Please enter your email address.'); return; }
    if (!loginPassword) { setLoginError('Please enter your password.'); return; }
    if (!signInLoaded || !signIn) { setLoginError('Authentication service is initializing…'); return; }

    setLoginStep('loading');
    try {
      const result = await signIn.create({ identifier: loginEmail.trim(), password: loginPassword });

      if (result.status === 'complete') {
        await setSignInActive({ session: result.createdSessionId });

        // Retrieve verified Clerk User ID for this doctor session (never use session ID)
        const activeSession = clerk.client?.sessions?.find(s => s.id === result.createdSessionId);
        const verifiedDoctorUserId =
          (result as any).createdUserId ||
          activeSession?.user?.id ||
          clerk.user?.id ||
          user?.id ||
          '';

        // Get Clerk token and look up doctor profile
        try {
          let token = '';
          try {
            if (getToken) token = (await getToken()) || '';
          } catch (_tErr) {}

          const res = await fetch(`${API_BASE_URL}/doctors/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
              ...(verifiedDoctorUserId ? { 'x-user-id': verifiedDoctorUserId } : {}),
              'x-user-role': 'doctor',
            },
            body: JSON.stringify({ email: loginEmail.trim() }),
          });
          const body = await res.json();
          if (res.ok && body.success && body.data) {
            setLoginStep('done');
            onDoctorLoginSuccess(body.data as DoctorAuthData);
            onClose();
          } else {
            setLoginError(body?.error || 'No doctor profile found for this account. Please register as a doctor first.');
            setLoginStep('form');
          }
        } catch (err: any) {
          console.error('[Doctor Auth Error]:', err);
          setLoginError('Signed in to Clerk, but could not reach the doctor profile API. Ensure the backend is running.');
          setLoginStep('form');
        }
      } else {
        setLoginError(`Additional verification required: ${result.status}`);
        setLoginStep('form');
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || 'Sign-in failed.';
      setLoginError(msg);
      setLoginStep('form');
    }
  };

  // ── Clerk Sign-Up for Doctors ────────────────────────────────────────────────
  const handleClerkSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegClerkError('');
    if (!regEmail.trim() || !regEmail.includes('@')) { setRegClerkError('Valid email is required.'); return; }
    if (regPassword.length < 15) { setRegClerkError('Password must be at least 15 characters.'); return; }
    if (!signUpLoaded || !signUp) { setRegClerkError('Auth service is initializing…'); return; }

    setRegClerkLoading(true);
    try {
      const parts = regName.trim().split(' ');
      const result = await signUp.create({
        emailAddress: regEmail.trim(),
        password: regPassword,
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' ') || '',
      });

      if (result.status === 'complete') {
        await setSignUpActive({ session: result.createdSessionId });
        setRegStep('profile-form');
      } else {
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setPendingVerification(true);
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || 'Sign-up failed.';
      const isDuplicate =
        msg.toLowerCase().includes('taken') ||
        msg.toLowerCase().includes('already') ||
        err?.errors?.[0]?.code === 'form_identifier_exists';

      if (isDuplicate) {
        setRegDuplicateEmail(true);
        setRegClerkError('That email address is already registered in our authentication system.');
      } else {
        setRegDuplicateEmail(false);
        setRegClerkError(msg);
      }
    } finally {
      setRegClerkLoading(false);
    }
  };


  // ── Existing Clerk account sign-in during registration ───────────────────────
  const handleClerkSignInForReg = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegClerkError('');
    if (!regEmail.trim()) { setRegClerkError('Enter your email.'); return; }
    if (!regPassword) { setRegClerkError('Enter your password.'); return; }
    if (!signInLoaded || !signIn) { setRegClerkError('Auth service is initializing…'); return; }

    setRegClerkLoading(true);
    try {
      const result = await signIn.create({ identifier: regEmail.trim(), password: regPassword });
      if (result.status === 'complete') {
        await setSignInActive({ session: result.createdSessionId });
        setRegStep('profile-form');
      } else {
        setRegClerkError(`Additional step required: ${result.status}`);
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || 'Sign-in failed.';
      setRegClerkError(msg);
    } finally {
      setRegClerkLoading(false);
    }
  };

  // ── Verify Email Code ────────────────────────────────────────────────────────
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode.trim()) { setVerifyError('Enter the verification code.'); return; }
    if (!signUpLoaded || !signUp) return;

    setVerifyLoading(true);
    setVerifyError('');
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: verifyCode.trim() });
      if (result.status === 'complete') {
        await setSignUpActive({ session: result.createdSessionId });
        setPendingVerification(false);
        setRegStep('profile-form');
      } else {
        setVerifyError(`Verification incomplete: ${result.status}`);
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Invalid or expired code.';
      setVerifyError(msg);
    } finally {
      setVerifyLoading(false);
    }
  };

  // ── Submit Doctor Profile ────────────────────────────────────────────────────
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regName.trim()) { setRegError('Full name is required.'); return; }
    if (!regPhone.trim()) { setRegError('Mobile number is required.'); return; }
    if (!regRegNumber.trim()) { setRegError('Medical registration number is required.'); return; }
    if (!regQualifications.trim()) { setRegError('Qualifications are required.'); return; }

    if (!isSignedIn || !user) {
      setRegError('Session expired. Please sign in again.');
      setRegStep('clerk-auth');
      return;
    }

    setRegLoading(true);
    try {
      const formattedPhone = regPhone.trim() ? (regPhone.trim().startsWith('+') ? regPhone.trim() : `+91 ${regPhone.trim()}`) : (user.primaryPhoneNumber?.phoneNumber || '');

      // Upload photo first if provided
      let photoUrl = '';
      if (photoFile) {
        const fd = new FormData();
        fd.append('photo', photoFile);
        try {
          const uploadRes = await fetch(`${API_BASE_URL}/doctors/upload-photo`, {
            method: 'POST',
            headers: { 'x-user-id': user.id, 'x-user-role': 'doctor' },
            body: fd,
          });
          if (uploadRes.ok) {
            const uploadBody = await uploadRes.json();
            photoUrl = uploadBody.data?.url || '';
          }
        } catch (_) { /* photo upload is optional */ }
      }

      // Upload ID proof if provided
      let idProofUrl = '';
      if (idProofFile) {
        const fd2 = new FormData();
        fd2.append('document', idProofFile);
        try {
          const idRes = await fetch(`${API_BASE_URL}/doctors/upload-document`, {
            method: 'POST',
            headers: { 'x-user-id': user.id, 'x-user-role': 'doctor' },
            body: fd2,
          });
          if (idRes.ok) {
            const idBody = await idRes.json();
            idProofUrl = idBody.data?.url || '';
          }
        } catch (_) { /* optional */ }
      }

      // Register doctor profile
      const res = await fetch(`${API_BASE_URL}/doctors/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          'x-user-role': 'doctor',
        },
        body: JSON.stringify({
          email: user.primaryEmailAddress?.emailAddress || regEmail,
          fullName: user.fullName || regName,
          phone: formattedPhone,
          name: regName.startsWith('Dr.') ? regName : `Dr. ${regName}`,
          registrationNumber: regRegNumber,
          specialty: regSpecialty,
          qualifications: regQualifications,
          experienceYears: Number(regExperience) || 0,
          clinicName: regClinicName || '',
          city: regCity,
          about: regAbout,
          feeINR: regFee ? Number(regFee) : null,
          photo: photoUrl || null,
          idProofUrl: idProofUrl || null,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        setRegError(body?.error || 'Registration failed. Please try again.');
        return;
      }

      setRegStep('done');

      // Auto-login after successful registration
      setTimeout(async () => {
        try {
          const profileRes = await fetch(`${API_BASE_URL}/doctors/profile/by-user/${user.id}`, {
            headers: { 'x-user-id': user.id, 'x-user-role': 'doctor' },
          });
          const profileBody = await profileRes.json();
          if (profileRes.ok && profileBody.success && profileBody.data) {
            onDoctorLoginSuccess(profileBody.data as DoctorAuthData);
            onClose();
          }
        } catch (_) {}
      }, 1000);

    } catch (err: any) {
      setRegError(`Error: ${err?.message || 'Server unreachable.'}`);
    } finally {
      setRegLoading(false);
    }
  };

  // ── Demo Doctor click ────────────────────────────────────────────────────────
  const handleDemoDoctor = (doc: typeof INITIAL_DOCTORS[0]) => {
    const demoData: DoctorAuthData = {
      id: doc.id,
      doctorId: doc.id,
      name: doc.name,
      email: `${doc.id}@demo.medinest.in`,
      phone: '+91 0000000000',
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

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-xl mx-auto bg-white rounded-3xl shadow-2xl border border-[#DDD6C5] my-4 sm:my-8 overflow-hidden flex flex-col">

        {/* Header */}
        <div className="bg-[#032F31] text-white p-5 sm:p-7 flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer z-10"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FAE58D] text-[#032F31] flex items-center justify-center flex-shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 text-[#FAE58D] text-[10px] font-bold uppercase tracking-wider border border-[#FAE58D]/30 mb-1">
                <ShieldCheck className="w-3 h-3" /> NMC Verified Portal
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white leading-tight">MediNest Doctor Portal</h2>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 flex-shrink-0 bg-white">
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'login'
                ? 'text-teal-700 border-b-2 border-teal-700 bg-teal-50/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" /> Sign In
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'register'
                ? 'text-teal-700 border-b-2 border-teal-700 bg-teal-50/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Register
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="overflow-y-auto flex-1">
          <div className="p-5 sm:p-7">

            {/* ── TAB: SIGN IN ─────────────────────────────────────────────── */}
            {activeTab === 'login' && (
              <form onSubmit={handleDoctorSignIn} className="space-y-4">
                <p className="text-xs text-slate-500">Sign in with your registered doctor account.</p>

                {loginError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="email" required value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="doctor@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type={showLoginPw ? 'text' : 'password'} required value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
                    />
                    <button type="button" onClick={() => setShowLoginPw(!showLoginPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                      {showLoginPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loginStep === 'loading'}
                  className="w-full py-3 rounded-xl bg-[#032F31] hover:bg-teal-900 disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm">
                  {loginStep === 'loading'
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
                    : <><ShieldCheck className="w-4 h-4 text-[#FAE58D]" /> Access Doctor Portal</>
                  }
                </button>

                <p className="text-center text-xs text-slate-500">
                  Don't have an account?{' '}
                  <button type="button" onClick={() => setActiveTab('register')} className="text-teal-700 font-bold hover:underline cursor-pointer">
                    Register as a Doctor
                  </button>
                </p>
              </form>
            )}

            {/* ── TAB: REGISTER ────────────────────────────────────────────── */}
            {activeTab === 'register' && (
              <div className="space-y-4">

                {/* Step: Done */}
                {regStep === 'done' && (
                  <div className="text-center py-8 space-y-3">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-bold text-[#032F31]">Registration Submitted</h3>
                    <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                      Your credentials are under review. You'll receive an email confirmation once your account is verified.
                    </p>
                    <div className="p-3 rounded-xl bg-[#FAF7EE] border border-[#DDD6C5] text-xs text-slate-700">
                      <strong>Verification typically takes 1–2 business days.</strong>
                    </div>
                    <button onClick={() => { setActiveTab('login'); setRegStep(isSignedIn ? 'profile-form' : 'clerk-auth'); }}
                      className="text-xs font-bold text-teal-700 hover:underline cursor-pointer">
                      Go to Sign In
                    </button>
                  </div>
                )}

                {/* Step: Clerk Auth */}
                {regStep === 'clerk-auth' && !pendingVerification && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500">Create a Clerk account or sign in to link your doctor profile.</p>

                    {regClerkError && (
                      <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                          <span>{regClerkError}</span>
                        </div>

                        {regDuplicateEmail && (
                          <div className="pt-2 border-t border-rose-200 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setLoginEmail(regEmail);
                                setActiveTab('login');
                                setRegClerkError('');
                                setRegDuplicateEmail(false);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-[#032F31] text-white font-bold text-xs hover:bg-teal-900 transition-colors cursor-pointer"
                            >
                              Sign In Instead
                            </button>
                            <button
                              type="button"
                              disabled={regReconciling}
                              onClick={async () => {
                                setRegReconciling(true);
                                try {
                                  const res = await fetch(`${API_BASE_URL}/auth/reconcile-deleted-account`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ email: regEmail.trim() })
                                  });
                                  const data = await res.json();
                                  if (res.ok && data.success) {
                                    setRegSuccessNotice('Authentication record released! You can now create your doctor account.');
                                    setRegClerkError('');
                                    setRegDuplicateEmail(false);
                                  } else {
                                    setRegClerkError(data.error || 'Could not release email. Please sign in or contact admin.');
                                  }
                                } catch (e: any) {
                                  setRegClerkError(e.message || 'Network error during reconciliation.');
                                } finally {
                                  setRegReconciling(false);
                                }
                              }}
                              className="px-3 py-1.5 rounded-xl border border-rose-300 text-rose-900 font-bold text-xs hover:bg-rose-100 transition-colors cursor-pointer"
                            >
                              {regReconciling ? 'Reconciling...' : 'Account Was Deleted? Release Email'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {regSuccessNotice && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                        <span>{regSuccessNotice}</span>
                      </div>
                    )}


                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input type="email" required value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="doctor@example.com"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Password (min. 15 characters)</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input type={showRegPw ? 'text' : 'password'} required minLength={15} value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Create a strong password (min 15 chars)"
                          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
                        />
                        <button type="button" onClick={() => setShowRegPw(!showRegPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                          {showRegPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={handleClerkSignUp} disabled={regClerkLoading}
                        className="py-2.5 rounded-xl bg-[#032F31] hover:bg-teal-900 disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                        {regClerkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5 text-[#FAE58D]" />}
                        Create Account
                      </button>
                      <button type="button" onClick={handleClerkSignInForReg} disabled={regClerkLoading}
                        className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                        <LogIn className="w-3.5 h-3.5" />
                        Sign In Instead
                      </button>
                    </div>
                  </div>
                )}

                {/* Step: Email Verification */}
                {regStep === 'clerk-auth' && pendingVerification && (
                  <form onSubmit={handleVerifyCode} className="space-y-4">
                    <p className="text-xs text-slate-600 bg-teal-50 border border-teal-200 rounded-xl p-3">
                      A verification code was sent to <strong>{regEmail}</strong>. Enter it below to continue.
                    </p>
                    {verifyError && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{verifyError}</span>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Verification Code</label>
                      <input type="text" required value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value)}
                        placeholder="6-digit code"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50 text-center tracking-widest text-base"
                      />
                    </div>
                    <button type="submit" disabled={verifyLoading}
                      className="w-full py-3 rounded-xl bg-[#032F31] hover:bg-teal-900 disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer">
                      {verifyLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : <><CheckCircle className="w-4 h-4 text-[#FAE58D]" /> Verify Email</>}
                    </button>
                  </form>
                )}

                {/* Step: Profile Form */}
                {regStep === 'profile-form' && (
                  <form onSubmit={handleProfileSubmit} className="space-y-4">
                    {isSignedIn && (
                      <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-800 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        Signed in as <strong>{user?.primaryEmailAddress?.emailAddress}</strong>
                      </div>
                    )}

                    {regError && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{regError}</span>
                      </div>
                    )}

                    {/* Photo upload */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Profile Photo (Optional)</label>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {photoPreview
                            ? <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                            : <Camera className="w-6 h-6 text-slate-400" />
                          }
                        </div>
                        <div className="flex flex-col gap-2">
                          <button type="button" onClick={() => photoInputRef.current?.click()}
                            className="px-3 py-2 text-xs font-bold text-teal-700 border border-teal-300 rounded-xl hover:bg-teal-50 cursor-pointer transition-colors">
                            {photoPreview ? 'Change Photo' : 'Upload Photo'}
                          </button>
                          {photoFile && <p className="text-[10px] text-slate-500 truncate max-w-[140px]">{photoFile.name}</p>}
                        </div>
                      </div>
                      <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoChange} className="hidden" />
                    </div>

                    {/* Name + Mobile Number */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Full Name (with Title) *</label>
                        <input type="text" required value={regName} onChange={(e) => setRegName(e.target.value)}
                          placeholder="Dr. Aakash Patel"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mobile Number *</label>
                        <input type="tel" required value={regPhone} onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="e.g. 9820145890"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
                        />
                      </div>
                    </div>

                    {/* Registration Number + Specialty */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Registration Number *</label>
                        <input type="text" required value={regRegNumber} onChange={(e) => setRegRegNumber(e.target.value)}
                          placeholder="e.g. KMC-2016-99241"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Specialty *</label>
                        <select value={regSpecialty} onChange={(e) => setRegSpecialty(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50">
                          {SPECIALTIES.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Qualifications + Experience */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Qualifications *</label>
                        <input type="text" required value={regQualifications} onChange={(e) => setRegQualifications(e.target.value)}
                          placeholder="MBBS, MD"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Experience (Years) *</label>
                        <input type="number" required min="0" max="60" value={regExperience} onChange={(e) => setRegExperience(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
                        />
                      </div>
                    </div>

                    {/* Clinic + City */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Clinic / Hospital</label>
                        <input type="text" value={regClinicName} onChange={(e) => setRegClinicName(e.target.value)}
                          placeholder="Apollo Hospital"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">City *</label>
                        <select value={regCity} onChange={(e) => setRegCity(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50">
                          {INDIAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Fee */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Consultation Fee (₹)</label>
                      <input type="number" min="0" value={regFee} onChange={(e) => setRegFee(e.target.value)}
                        placeholder="e.g. 500 (leave blank if not yet decided)"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
                      />
                    </div>

                    {/* About */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Professional Bio (Optional)</label>
                      <textarea rows={3} value={regAbout} onChange={(e) => setRegAbout(e.target.value)}
                        placeholder="Brief description of your practice and expertise…"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50 resize-none"
                      />
                    </div>

                    {/* ID Proof */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">ID Proof / Supporting Document (Optional)</label>
                      <div
                        onClick={() => idProofInputRef.current?.click()}
                        className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-slate-300 hover:border-teal-500 cursor-pointer transition-colors bg-slate-50/50"
                      >
                        <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-slate-700">
                            {idProofFile ? idProofFile.name : 'Click to upload PDF, JPG, or PNG (max 10 MB)'}
                          </p>
                          <p className="text-[10px] text-slate-400">NMC Registration, Aadhaar, PAN — kept private, not shown to patients</p>
                        </div>
                      </div>
                      <input ref={idProofInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setIdProofFile(e.target.files?.[0] || null)} className="hidden" />
                    </div>

                    <button type="submit" disabled={regLoading}
                      className="w-full py-3 rounded-xl bg-[#032F31] hover:bg-teal-900 disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm">
                      {regLoading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                        : <><Award className="w-4 h-4 text-[#FAE58D]" /> Submit for Verification</>
                      }
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* ── DEMO DOCTORS PANEL ────────────────────────────────────────────── */}
          <div className="bg-slate-50 border-t border-slate-200 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <Play className="w-4 h-4 text-teal-700 flex-shrink-0" />
              <h3 className="text-xs font-bold text-[#032F31] uppercase tracking-wider">Demo Doctors — Explore Sample Profiles</h3>
            </div>
            <p className="text-[10px] text-slate-400 mb-3">
              Click any card to explore a demo doctor's portal. No registration required.
            </p>
            {/* Compact scrollable panel — 4 cards visible */}
            <div className="overflow-y-auto" style={{ maxHeight: '13rem' }}>
              <div className="grid grid-cols-1 gap-2 pr-1">
                {INITIAL_DOCTORS.map(doc => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => handleDemoDoctor(doc)}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200 hover:border-teal-400 hover:shadow-sm transition-all text-left cursor-pointer group w-full"
                    aria-label={`Open demo profile for ${doc.name}`}
                  >
                    <img
                      src={doc.photo}
                      alt={doc.name}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200 flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-[#032F31] truncate group-hover:text-teal-700 transition-colors">
                        {doc.name}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {doc.specialty} · {doc.city}
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-teal-600 transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
