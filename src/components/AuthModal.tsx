import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  UserPlus, 
  LogIn, 
  User, 
  Sparkles,
  Smartphone,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { UserProfile } from '../types';
import { patientSupabase, SUPABASE_CONFIGURED } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
  initialTab?: 'signin' | 'signup';
  customMessage?: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialTab = 'signin',
  customMessage = null
}) => {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>(initialTab);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // States
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
    setAuthError(null);
    setSuccessMessage(null);
  }, [initialTab, isOpen]);

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  // ── Live Supabase Email + Password Auth Handler ──────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    setSuccessMessage(null);

    // If Phone OTP selected, block execution as Phone OTP is disabled per spec
    if (authMethod === 'phone') {
      setLoading(false);
      setAuthError('Phone OTP is currently unavailable. Please use Email & Password to sign in or sign up.');
      return;
    }

    // Demo fallback when Supabase credentials are missing
    if (!SUPABASE_CONFIGURED) {
      setTimeout(() => {
        setLoading(false);
        onLoginSuccess({
          name: fullName.trim() || 'Demo Patient',
          phone: phoneNumber ? `+91 ${phoneNumber}` : '+91 9820145890',
          email: email.trim() || 'patient@medinest.in',
          isLoggedIn: true,
        });
        onClose();
      }, 500);
      return;
    }

    try {
      if (activeTab === 'signup') {
        // 1. SIGN UP WITH EMAIL & PASSWORD
        if (!fullName.trim()) throw new Error('Please enter your full name');
        if (!email.trim() || !email.includes('@')) throw new Error('Please enter a valid email address');
        if (password.length < 6) throw new Error('Password must be at least 6 characters long');

        const callbackUrl = `${window.location.origin}/auth/callback`;

        const { data, error } = await patientSupabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: callbackUrl,
            data: {
              full_name: fullName.trim(),
              phone: phoneNumber ? `+91${phoneNumber}` : undefined,
            },
          },
        });

        if (error) throw error;

        // Upsert profile table row
        if (data.user) {
          await patientSupabase.from('profiles').upsert({
            id: data.user.id,
            full_name: fullName.trim(),
            email: email.trim(),
            phone: phoneNumber ? `+91${phoneNumber}` : null,
            role: 'patient',
          }, { onConflict: 'id' });
        }

        if (data.session) {
          // Direct sign-in (email confirmation disabled in Supabase config)
          onLoginSuccess({
            id: data.user?.id,
            name: fullName.trim() || email,
            phone: phoneNumber ? `+91 ${phoneNumber}` : '',
            email: email.trim(),
            isLoggedIn: true,
          });
          onClose();
        } else {
          // Email confirmation link dispatched by Supabase
          setSuccessMessage(`Account created! A confirmation email has been sent to ${email.trim()}. Please check your inbox and click the verification link to confirm your MediNest account.`);
          setResendCooldown(60);
        }

      } else {
        // 2. SIGN IN WITH EMAIL & PASSWORD
        if (!email.trim() || !email.includes('@')) throw new Error('Please enter your email address');
        if (!password) throw new Error('Please enter your password');

        const { data, error } = await patientSupabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          if (error.message.toLowerCase().includes('email not confirmed')) {
            setAuthError('Your email address has not been confirmed yet. Please click the confirmation link sent to your inbox, or click "Resend Confirmation Email" below.');
            setLoading(false);
            return;
          }
          throw error;
        }

        if (!data.user) throw new Error('Authentication failed. User not found.');

        // Fetch patient profile details
        const { data: profile } = await patientSupabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', data.user.id)
          .maybeSingle();

        onLoginSuccess({
          id: data.user.id,
          name: profile?.full_name || data.user.email || 'Patient',
          phone: profile?.phone || '',
          email: data.user.email || email.trim(),
          isLoggedIn: true,
        });
        onClose();
      }

    } catch (err: unknown) {
      setAuthError((err as Error).message || 'Authentication failed. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  // ── Resend Confirmation Email Handler (Real Supabase Call) ───────────────
  const handleResendConfirmation = async () => {
    if (!email.trim() || !email.includes('@')) {
      setAuthError('Please enter your valid email address to resend the confirmation email.');
      return;
    }
    if (resendCooldown > 0) return;

    setResending(true);
    setAuthError(null);
    setSuccessMessage(null);

    try {
      const callbackUrl = `${window.location.origin}/auth/callback`;
      const { error } = await patientSupabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: callbackUrl,
        },
      });

      if (error) throw error;

      setSuccessMessage(`Confirmation email successfully resent to ${email.trim()}. Please check your inbox (and spam folder).`);
      setResendCooldown(60);
    } catch (err: unknown) {
      setAuthError((err as Error).message || 'Failed to resend confirmation email. Please verify your email address.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="relative w-full max-w-md md:max-w-2xl lg:max-w-3xl bg-[#FAF7EE] rounded-3xl shadow-2xl border border-[#DDD6C5] overflow-hidden flex flex-col md:flex-row">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/40 hover:bg-black/60 md:bg-[#FAF7EE] md:hover:bg-[#EAE5D8] text-white md:text-slate-700 transition-colors cursor-pointer shadow-xs"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Banner (Desktop) */}
        <div className="hidden md:flex md:w-5/12 relative flex-col justify-between overflow-hidden bg-[#032F31]">
          <img
            src="/doctor_auth.jpg"
            alt="MediNest Healthcare"
            className="absolute inset-0 w-full h-full object-cover object-top"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/doctor_hero.jpg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#032F31] via-[#032F31]/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#032F31]/40 via-transparent to-transparent" />

          <div className="relative z-10 p-5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#032F31]/80 backdrop-blur-md text-[#FAE58D] text-[11px] font-bold border border-[#FAE58D]/30 shadow-xs">
              <Sparkles className="w-3 h-3 text-[#FAE58D]" />
              MediNest Security
            </span>
          </div>

          <div className="relative z-10 p-5 space-y-2">
            <div className="p-3.5 rounded-2xl bg-[#032F31]/85 backdrop-blur-md border border-white/10 text-white shadow-lg space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#FAE58D]">
                  Encrypted Patient Data
                </span>
              </div>
              <p className="text-xs text-slate-100 font-medium leading-relaxed">
                Simple access to care, anytime, anywhere. Verified doctors &amp; encrypted medical records.
              </p>
            </div>
          </div>
        </div>

        {/* Right Form Area */}
        <div className="w-full md:w-7/12 flex flex-col justify-between">
          
          {/* Header */}
          <div className="bg-[#032F31] text-white p-5 sm:p-6 relative">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#FAE58D] block mb-1">
              MediNest Patient Portal
            </span>
            <h2 className="text-xl font-display font-bold text-white">
              {activeTab === 'signup' ? 'Create Patient Account' : 'Patient Sign In'}
            </h2>
            {customMessage ? (
              <div className="mt-2 p-2.5 rounded-xl bg-[#FAE58D] text-[#032F31] text-xs font-bold shadow-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0 text-[#032F31]" />
                <span>{customMessage}</span>
              </div>
            ) : (
              <p className="text-xs text-teal-100/80 mt-1">
                {activeTab === 'signup' 
                  ? 'Sign up with your email to book appointments and access digital prescriptions.' 
                  : 'Sign in to access your appointments and medical history.'}
              </p>
            )}

            {/* Tab Switcher */}
            <div className="mt-4 grid grid-cols-2 p-1 bg-black/25 rounded-xl border border-teal-700/50">
              <button
                type="button"
                onClick={() => { setActiveTab('signin'); setAuthError(null); setSuccessMessage(null); }}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'signin'
                    ? 'bg-white text-[#032F31] shadow-xs'
                    : 'text-teal-100 hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" /> Sign In
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('signup'); setAuthError(null); setSuccessMessage(null); }}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'signup'
                    ? 'bg-white text-[#032F31] shadow-xs'
                    : 'text-teal-100 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" /> Sign Up
              </button>
            </div>
          </div>

          {/* Form Body */}
          <div className="p-5 sm:p-6 space-y-4 bg-white flex-1 overflow-y-auto max-h-[70vh]">
            
            {/* Auth Method Selector */}
            <div className="flex items-center justify-between bg-[#F4EFE2] p-1 rounded-xl border border-[#E2DCCE]">
              <button
                type="button"
                onClick={() => { setAuthMethod('email'); setAuthError(null); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  authMethod === 'email'
                    ? 'bg-white text-[#032F31] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-[#032F31]" /> Email &amp; Password
              </button>
              <button
                type="button"
                onClick={() => { setAuthMethod('phone'); setAuthError('Phone OTP is currently unavailable. Please use Email & Password.'); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  authMethod === 'phone'
                    ? 'bg-white text-[#032F31] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-slate-400" /> Phone OTP (Disabled)
              </button>
            </div>

            {/* Notifications / Errors */}
            {authError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed font-medium">{authError}</div>
                </div>
                {email && (
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={resending || resendCooldown > 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#032F31] hover:bg-[#074749] text-white text-[11px] font-bold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 text-[#FAE58D] ${resending ? 'animate-spin' : ''}`} />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Confirmation Email'}
                  </button>
                )}
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed font-medium">{successMessage}</div>
                </div>
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={resending || resendCooldown > 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#032F31] hover:bg-[#074749] text-white text-[11px] font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 text-[#FAE58D] ${resending ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Confirmation Email'}
                </button>
              </div>
            )}

            {authMethod === 'phone' ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2 text-center">
                <p className="font-bold text-amber-950">Phone OTP is currently unavailable.</p>
                <p>Please use <strong>Email &amp; Password</strong> to sign in or register your MediNest account.</p>
                <button
                  type="button"
                  onClick={() => { setAuthMethod('email'); setAuthError(null); }}
                  className="mt-2 px-4 py-2 rounded-xl bg-[#032F31] text-white text-xs font-bold hover:bg-[#074749] cursor-pointer"
                >
                  Switch to Email &amp; Password
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                
                {/* Full Name (Only on Sign Up) */}
                {activeTab === 'signup' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Full Name (Required)
                    </label>
                    <div className="relative flex items-center">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 pointer-events-none" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Vikram Malhotra"
                        required
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#032F31] font-medium"
                      />
                    </div>
                  </div>
                )}

                {/* Email Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="vikram.malhotra@gmail.com"
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#032F31] font-medium"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 pointer-events-none" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      minLength={6}
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#032F31] font-medium"
                    />
                  </div>
                </div>

                {/* Phone Field (Optional during Sign Up) */}
                {activeTab === 'signup' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      10-Digit Mobile Number (Optional)
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-xs font-bold text-slate-600">+91</span>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="9876543210"
                        maxLength={10}
                        className="w-full pl-12 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#032F31] font-medium"
                      />
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-[#032F31] hover:bg-[#074749] text-white text-xs font-bold tracking-wide shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  {loading ? (
                    'Authenticating with Supabase...'
                  ) : activeTab === 'signup' ? (
                    <>
                      Create Verified Account <ArrowRight className="w-3.5 h-3.5 text-[#FAE58D]" />
                    </>
                  ) : (
                    <>
                      Sign In to MediNest <ArrowRight className="w-3.5 h-3.5 text-[#FAE58D]" />
                    </>
                  )}
                </button>

                {/* Switch link */}
                <div className="text-center pt-1">
                  {activeTab === 'signin' ? (
                    <p className="text-xs text-slate-600">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => { setActiveTab('signup'); setAuthError(null); setSuccessMessage(null); }}
                        className="font-bold text-[#032F31] hover:underline cursor-pointer"
                      >
                        Create one here
                      </button>
                    </p>
                  ) : (
                    <p className="text-xs text-slate-600">
                      Already registered?{' '}
                      <button
                        type="button"
                        onClick={() => { setActiveTab('signin'); setAuthError(null); setSuccessMessage(null); }}
                        className="font-bold text-[#032F31] hover:underline cursor-pointer"
                      >
                        Sign In here
                      </button>
                    </p>
                  )}
                </div>
              </form>
            )}

            {/* Privacy Note */}
            <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 text-center flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
              DPDP Act 2023 compliant. Your medical records remain strictly private.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
