import React, { useState } from 'react';
import { 
  X, 
  Stethoscope, 
  Lock, 
  Mail, 
  ShieldCheck, 
  UploadCloud, 
  Building2, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  CheckCircle,
  FileCheck,
  Award,
  Sparkles,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { SPECIALTIES, INDIAN_CITIES } from '../data/specialtiesData';
import { DoctorAuthData } from '../types';
import { INITIAL_DEMO_DOCTOR } from '../data/doctorPortalData';
import { doctorSupabase, SUPABASE_CONFIGURED } from '../lib/supabase';

interface DoctorAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDoctorLoginSuccess: (doctor: DoctorAuthData) => void;
  initialTab?: 'login' | 'register';
}

export const DoctorAuthModal: React.FC<DoctorAuthModalProps> = ({
  isOpen,
  onClose,
  onDoctorLoginSuccess,
  initialTab = 'login'
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);
  const [showPassword, setShowPassword] = useState(false);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Registration Form State
  const [regName, setRegName] = useState('');
  const [regRegNumber, setRegRegNumber] = useState('');
  const [regSpecialty, setRegSpecialty] = useState('General Physician');
  const [regQualifications, setRegQualifications] = useState('');
  const [regExperience, setRegExperience] = useState('8');
  const [regClinicName, setRegClinicName] = useState('');
  const [regClinicAddress, setRegClinicAddress] = useState('');
  const [regCity, setRegCity] = useState('Bengaluru');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFeeINR, setRegFeeINR] = useState('499');
  const [regUploadedDocs, setRegUploadedDocs] = useState<string[]>([]);
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');

  // ── Demo login (only when SUPABASE_CONFIGURED is false) ────────────────────
  const handleDemoLogin = () => {
    onDoctorLoginSuccess(INITIAL_DEMO_DOCTOR);
    onClose();
  };

  // ── Real Supabase doctor sign-in ────────────────────────────────────────────
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginEmail.trim()) {
      setLoginError('Please enter your registered doctor email address.');
      return;
    }

    if (!SUPABASE_CONFIGURED) {
      onDoctorLoginSuccess(INITIAL_DEMO_DOCTOR);
      onClose();
      return;
    }

    setLoginLoading(true);
    try {
      const { data, error } = await doctorSupabase.auth.signInWithPassword({
        email: loginEmail.trim().toLowerCase(),
        password: password,
      });

      if (error) {
        setLoginError(error.message || 'Sign-in failed. Check your credentials and try again.');
        return;
      }

      if (!data.user) {
        setLoginError('Authentication failed. Please try again.');
        return;
      }

      // Fetch doctor profile from public.profiles
      const { data: profile, error: profileError } = await doctorSupabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .eq('role', 'doctor')
        .maybeSingle();

      if (profileError || !profile) {
        setLoginError(
          'No verified doctor account found for this email. If you are a patient, use the Patient Sign In instead.'
        );
        await doctorSupabase.auth.signOut();
        return;
      }

      // Fetch extended doctor_profiles row
      const { data: doctorProfile } = await doctorSupabase
        .from('doctor_profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      const doctorName = doctorProfile?.name || profile.full_name || 'Dr. Doctor';
      const doctorPhoto = doctorProfile?.photo || profile.avatar_url || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=600';

      // Build DoctorAuthData from DB data
      const doctorData: DoctorAuthData = {
        id: data.user.id,
        doctorId: doctorProfile?.registration_number || `DOC-${data.user.id.slice(0, 6).toUpperCase()}`,
        name: doctorName,
        email: profile.email || data.user.email || '',
        phone: profile.phone || '+91 0000000000',
        specialty: doctorProfile?.specialty || 'General Physician',
        qualifications: doctorProfile?.qualifications || 'MBBS',
        experienceYears: doctorProfile?.experience_years || 1,
        clinicName: doctorProfile?.clinic_name || 'Private Practice',
        address: doctorProfile?.clinic_address || 'India',
        city: doctorProfile?.city || 'India',
        feeINR: doctorProfile?.fee_inr || 499,
        rating: doctorProfile?.rating ? Number(doctorProfile.rating) : 4.8,
        reviewCount: doctorProfile?.review_count || 1,
        registrationNumber: doctorProfile?.registration_number || '',
        photo: doctorPhoto,
        languages: doctorProfile?.languages || ['English', 'Hindi'],
        isLoggedIn: true,
        acceptingNewAppointments: doctorProfile?.accepting_appointments ?? true,
        consultationModes: doctorProfile?.consultation_types || ['video', 'clinic'],
      };

      onDoctorLoginSuccess(doctorData);
      onClose();
    } catch (err: any) {
      setLoginError('An unexpected error occurred. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Doctor registration (creates Supabase auth + sends for admin verification) ─
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regName || !regRegNumber || !regQualifications || !regPhone || !regEmail || !regPassword) {
      setRegError('Please fill all mandatory fields including password.');
      return;
    }
    if (regPassword.length < 8) {
      setRegError('Password must be at least 8 characters.');
      return;
    }

    if (!SUPABASE_CONFIGURED) {
      // Demo mode: instant sandbox access
      setRegistrationSubmitted(true);
      setTimeout(() => {
        const newDoctor: DoctorAuthData = {
          id: `doc-${Date.now()}`,
          doctorId: `DOC-${Math.floor(1000 + Math.random() * 9000)}`,
          name: regName.startsWith('Dr.') ? regName : `Dr. ${regName}`,
          email: regEmail,
          phone: regPhone.startsWith('+91') ? regPhone : `+91 ${regPhone}`,
          specialty: regSpecialty,
          qualifications: regQualifications,
          experienceYears: Number(regExperience) || 5,
          clinicName: regClinicName || 'Private Practice',
          address: regClinicAddress || `${regCity}, India`,
          city: regCity,
          feeINR: Number(regFeeINR) || 499,
          rating: 5.0,
          reviewCount: 1,
          registrationNumber: regRegNumber,
          photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=600',
          languages: ['English', 'Hindi'],
          isLoggedIn: true,
          acceptingNewAppointments: true,
          consultationModes: ['video', 'clinic']
        };
        onDoctorLoginSuccess(newDoctor);
        onClose();
      }, 1500);
      return;
    }

    setRegLoading(true);
    try {
      // 1. Create Supabase auth user
      const { data: signUpData, error: signUpError } = await doctorSupabase.auth.signUp({
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        options: {
          data: {
            full_name: regName.startsWith('Dr.') ? regName : `Dr. ${regName}`,
            role: 'doctor',
          }
        }
      });

      if (signUpError) {
        setRegError(signUpError.message || 'Registration failed. Please try again.');
        return;
      }

      setRegistrationSubmitted(true);
      // Doctor accounts require admin verification before portal access.
      // We do NOT call onDoctorLoginSuccess here — they must wait for verification.
    } catch (err: any) {
      setRegError('An unexpected error occurred. Please try again.');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#DDD6C5] overflow-hidden my-6">
        {/* Top Decorative Header */}
        <div className="bg-[#032F31] text-white p-6 sm:p-7 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close Doctor Authentication Modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-[#FAE58D] text-[#032F31] flex items-center justify-center font-bold shadow-md">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[#FAE58D] text-[10px] font-bold tracking-wider uppercase border border-[#FAE58D]/30">
                <ShieldCheck className="w-3 h-3" /> NMC &amp; State Medical Council Verified
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white mt-1">
                MediNest Doctor Portal
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-200">
            Dedicated portal for certified practitioners to manage schedule, video consults, patient history, and INR payouts.
          </p>

          {/* Tab Switcher */}
          <div className="flex items-center gap-2 mt-5 border-b border-teal-800/80">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setRegistrationSubmitted(false);
              }}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'login'
                  ? 'border-[#FAE58D] text-[#FAE58D]'
                  : 'border-transparent text-slate-300 hover:text-white'
              }`}
            >
              Doctor Sign In
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'register'
                  ? 'border-[#FAE58D] text-[#FAE58D]'
                  : 'border-transparent text-slate-300 hover:text-white'
              }`}
            >
              Register as a Doctor
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 max-h-[68vh] overflow-y-auto">
          {/* TAB 1: DOCTOR SIGN IN */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}


              {/* Email Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Registered Doctor Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="doctor@clinic.in"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => alert('Please use Supabase Auth dashboard to reset your doctor password, or contact support at care@medinest.in')}
                    className="text-xs text-teal-700 hover:underline font-semibold cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-3 space-y-3">
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3 px-4 rounded-xl bg-[#032F31] hover:bg-[#074749] disabled:opacity-60 text-white text-xs font-bold tracking-wide shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                >
                  {loginLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Verifying Doctor Credentials…</>
                  ) : (
                    <><ShieldCheck className="w-4 h-4 text-[#FAE58D]" /> Access Secure Doctor Portal</>
                  )}
                </button>

                <div className="text-center">
                  <span className="text-xs text-slate-500">New medical specialist? </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
                  >
                    Register as a Doctor
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: REGISTER AS A DOCTOR */}
          {activeTab === 'register' && (
            <div>
              {registrationSubmitted ? (
                <div className="text-center py-8 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                    <CheckCircle className="w-9 h-9" />
                  </div>
                  <h3 className="text-lg font-bold text-[#032F31]">
                    Application Submitted for NMC Verification
                  </h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                    Thank you, {regName || 'Doctor'}. Your registration details are being reviewed by our credentials committee.
                    You will receive an email at <strong>{regEmail}</strong> when your account is verified and activated.
                  </p>
                  <div className="p-3 rounded-xl bg-[#FAF7EE] border border-[#DDD6C5] text-xs text-slate-700 max-w-md mx-auto">
                    <strong>Doctor accounts are activated after verification.</strong> This typically takes 1–2 business days.
                  </div>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('login'); setRegistrationSubmitted(false); }}
                    className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  {/* Verification Note Banner */}
                  <div className="p-3.5 rounded-xl bg-[#FAF7EE] border border-[#E0D8C3] text-xs text-[#032F31] flex items-start gap-2.5">
                    <Award className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Medical Credentialing Policy:</span>
                      <span className="text-slate-600">
                        Doctor accounts are activated after verification against the National Medical Commission (NMC) or State Medical Council registry.
                      </span>
                    </div>
                  </div>

                  {regError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{regError}</span>
                    </div>
                  )}

                  {/* Doctor Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Full Name (with Title) *
                    </label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Dr. Aakash Patel"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
                    />
                  </div>

                  {/* Medical Reg Number & Specialty */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Medical Registration Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={regRegNumber}
                        onChange={(e) => setRegRegNumber(e.target.value)}
                        placeholder="e.g. KMC-2016-99241"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Specialty *
                      </label>
                      <select
                        value={regSpecialty}
                        onChange={(e) => setRegSpecialty(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
                      >
                        {SPECIALTIES.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Qualifications & Experience */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Qualifications *
                      </label>
                      <input
                        type="text"
                        required
                        value={regQualifications}
                        onChange={(e) => setRegQualifications(e.target.value)}
                        placeholder="e.g. MBBS, MD (General Medicine)"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Years of Experience *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        required
                        value={regExperience}
                        onChange={(e) => setRegExperience(e.target.value)}
                        placeholder="e.g. 9"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
                      />
                    </div>
                  </div>

                  {/* Hospital/Clinic Name & City */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Hospital or Clinic Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={regClinicName}
                        onChange={(e) => setRegClinicName(e.target.value)}
                        placeholder="e.g. MediNest Clinic"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        City *
                      </label>
                      <select
                        value={regCity}
                        onChange={(e) => setRegCity(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
                      >
                        {INDIAN_CITIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Clinic Address */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Clinic Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={regClinicAddress}
                      onChange={(e) => setRegClinicAddress(e.target.value)}
                      placeholder="e.g. 100ft Road, Indiranagar, Bengaluru - 560038"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
                    />
                  </div>

                  {/* Mobile & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Mobile Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="+91 9845012345"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Official Doctor Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="doctor@clinic.in"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Set Portal Password * (min 8 characters)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Consultation Fee in INR */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Consultation Fee in ₹ INR *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        required
                        min="99"
                        max="5000"
                        value={regFeeINR}
                        onChange={(e) => setRegFeeINR(e.target.value)}
                        placeholder="499"
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Platform charges 0% commission on consultations.
                    </p>
                  </div>

                  {/* Upload Profile Photo & Verification Documents */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Upload Profile Photo &amp; Verification Documents *
                    </label>
                    <div 
                      onClick={() => setRegUploadedDocs(['NMC_Registration_Certificate.pdf', 'Doctor_Profile_Photo.jpg'])}
                      className="border-2 border-dashed border-slate-300 hover:border-teal-600 rounded-2xl p-4 text-center cursor-pointer bg-slate-50 transition-colors"
                    >
                      <UploadCloud className="w-6 h-6 text-teal-700 mx-auto mb-1" />
                      <div className="text-xs font-bold text-slate-700">Click to attach State Medical Certificate / ID</div>
                      <div className="text-[10px] text-slate-400">PDF, JPG, PNG up to 10MB</div>
                      {regUploadedDocs.length > 0 && (
                        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                          {regUploadedDocs.map((d, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 text-[10px] font-semibold">
                              <FileCheck className="w-3 h-3" /> {d}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2 space-y-3">
                    <button
                      type="submit"
                      disabled={regLoading}
                      className="w-full py-3 px-4 rounded-xl bg-[#032F31] hover:bg-[#074749] disabled:opacity-60 text-white text-xs font-bold tracking-wide shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                    >
                      {regLoading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Submitting Registration…</>
                      ) : (
                        <><ShieldCheck className="w-4 h-4 text-[#FAE58D]" /> Submit Doctor Registration</>
                      )}
                    </button>

                    <div className="text-center">
                      <span className="text-xs text-slate-500">Already registered? </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('login')}
                        className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
                      >
                        Sign In here
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
