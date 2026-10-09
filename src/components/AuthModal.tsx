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
  KeyRound,
  AlertCircle,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import { useSignIn, useSignUp } from '@clerk/clerk-react';
import { UserProfile } from '../types';

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
  customMessage
}) => {
  const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();

  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>(initialTab);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Verification Code State (for Clerk email_code flow)
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  // Status & Feedback State
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  useEffect(() => {
    setActiveTab(initialTab);
    setAuthError(null);
    setSuccessMessage(null);
    setPendingVerification(false);
    setVerificationCode('');
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  // ── Clerk Sign-In Handler ─────────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setSuccessMessage(null);

    if (!email.trim() || !email.includes('@')) {
      setAuthError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setAuthError('Please enter your password.');
      return;
    }

    if (!isSignInLoaded || !signIn) {
      setAuthError('Clerk authentication service is initializing. Please try again in a moment.');
      return;
    }

    setLoading(true);

    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password: password,
      });

      if (result.status === 'complete') {
        await setSignInActive({ session: result.createdSessionId });

        const userId = (result as any).createdUserId || (signIn as any)?.userData?.id;
        const loggedInUser: UserProfile = {
          id: userId || undefined,
          name: fullName.trim() || email.trim().split('@')[0],
          phone: phoneNumber ? `+91 ${phoneNumber}` : '+91 9820145890',
          email: email.trim(),
          isLoggedIn: true,
        };

        // Sync with backend profile
        try {
          const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
          await fetch(`${API_BASE_URL}/auth/sync-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: userId || result.createdSessionId,
              email: email.trim(),
              fullName: loggedInUser.name,
              role: 'patient',
              phone: loggedInUser.phone,
            }),
          });
        } catch (_) {}

        onLoginSuccess(loggedInUser);
        onClose();
      } else {
        setAuthError(`Sign-in requires additional verification step: ${result.status}`);
      }
    } catch (err: any) {
      const clerkMsg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        'Authentication failed. Please check your credentials and try again.';
      setAuthError(clerkMsg);
    } finally {
      setLoading(false);
    }
  };

  // ── Clerk Sign-Up Handler ─────────────────────────────────────────────────
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setSuccessMessage(null);

    if (!fullName.trim()) {
      setAuthError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setAuthError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setAuthError('Password must be at least 8 characters long.');
      return;
    }

    if (!isSignUpLoaded || !signUp) {
      setAuthError('Clerk authentication service is initializing. Please try again in a moment.');
      return;
    }

    setLoading(true);

    try {
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const result = await signUp.create({
        emailAddress: email.trim(),
        password: password,
        firstName: firstName,
        lastName: lastName,
      });

      if (result.status === 'complete') {
        await setSignUpActive({ session: result.createdSessionId });

        const registeredUser: UserProfile = {
          id: result.createdUserId || undefined,
          name: fullName.trim(),
          phone: phoneNumber ? `+91 ${phoneNumber}` : '+91 9820145890',
          email: email.trim(),
          isLoggedIn: true,
        };

        // Sync with backend profile
        try {
          const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
          await fetch(`${API_BASE_URL}/auth/sync-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: result.createdUserId,
              email: email.trim(),
              fullName: fullName.trim(),
              role: 'patient',
              phone: registeredUser.phone,
            }),
          });
        } catch (_) {}

        onLoginSuccess(registeredUser);
        onClose();
      } else {
        // Clerk requires verification (email_code)
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setPendingVerification(true);
        setSuccessMessage(`A verification code was sent to ${email.trim()}. Please enter it below to complete registration.`);
      }
    } catch (err: any) {
      const clerkMsg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        'Registration failed. Please check your information.';
      setAuthError(clerkMsg);
    } finally {
      setLoading(false);
    }
  };

  // ── Clerk Email Verification Handler ──────────────────────────────────────
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      setAuthError('Please enter the verification code sent to your email.');
      return;
    }

    if (!isSignUpLoaded || !signUp) return;

    setLoading(true);
    setAuthError(null);

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      if (result.status === 'complete') {
        await setSignUpActive({ session: result.createdSessionId });

        const verifiedUser: UserProfile = {
          id: result.createdUserId || undefined,
          name: fullName.trim() || 'MediNest Patient',
          phone: phoneNumber ? `+91 ${phoneNumber}` : '+91 9820145890',
          email: email.trim(),
          isLoggedIn: true,
        };

        // Sync with backend profile
        try {
          const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
          await fetch(`${API_BASE_URL}/auth/sync-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: result.createdUserId,
              email: email.trim(),
              fullName: verifiedUser.name,
              role: 'patient',
              phone: verifiedUser.phone,
            }),
          });
        } catch (_) {}

        onLoginSuccess(verifiedUser);
        onClose();
      } else {
        setAuthError(`Verification incomplete (${result.status}). Please check your code.`);
      }
    } catch (err: any) {
      const clerkMsg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        'Invalid or expired verification code. Please try again.';
      setAuthError(clerkMsg);
    } finally {
      setLoading(false);
    }
  };

  // ── Resend Verification Code ──────────────────────────────────────────────
  const handleResendCode = async () => {
    if (!isSignUpLoaded || !signUp || resendCooldown > 0) return;
    setResending(true);
    setAuthError(null);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setResendCooldown(60);
      setSuccessMessage(`A new verification code was sent to ${email.trim()}.`);
    } catch (err: any) {
      setAuthError(err?.errors?.[0]?.message || 'Failed to resend verification code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-[#0C182B] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            MediNest Patient Access
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-medium">
            {pendingVerification 
              ? 'Verify Your Email' 
              : activeTab === 'signin' ? 'Welcome Back' : 'Create Patient Account'}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            {pendingVerification
              ? `Enter the code sent to ${email} to activate your MediNest account.`
              : customMessage || (activeTab === 'signin' 
                ? 'Access your appointments, prescriptions, and health records.' 
                : 'Join MediNest for 24/7 access to top medical specialists.')}
          </p>

          {/* Tab Selector (hidden during verification step) */}
          {!pendingVerification && (
            <div className="flex bg-slate-800/60 p-1 rounded-xl mt-4 border border-slate-700/60">
              <button
                type="button"
                onClick={() => { setActiveTab('signin'); setAuthError(null); setSuccessMessage(null); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'signin'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" /> Sign In
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('signup'); setAuthError(null); setSuccessMessage(null); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'signup'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" /> Register
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {authError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{authError}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{successMessage}</p>
              </div>
            </div>
          )}

          {/* STEP 1: VERIFICATION CODE FORM (If Clerk requires email verification) */}
          {pendingVerification ? (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  6-Digit Verification Code *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 font-mono tracking-widest focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => { setPendingVerification(false); setAuthError(null); }}
                  className="inline-flex items-center gap-1 text-teal-700 hover:underline font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Edit Details
                </button>
                <button
                  type="button"
                  disabled={resendCooldown > 0 || resending}
                  onClick={handleResendCode}
                  className="text-teal-700 hover:underline font-semibold disabled:text-slate-400 cursor-pointer"
                >
                  {resending ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 rounded-2xl bg-[#0C182B] hover:bg-[#162C4E] disabled:bg-slate-300 text-white font-bold text-sm tracking-wide shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-teal-300" />
                    Verifying Code...
                  </>
                ) : (
                  <>
                    Verify &amp; Access Account
                    <ArrowRight className="w-4 h-4 text-teal-300" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* STEP 2: STANDARD SIGN-IN / SIGN-UP FORM */
            <form onSubmit={activeTab === 'signin' ? handleSignIn : handleSignUp} className="space-y-3.5">
              {activeTab === 'signup' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-teal-600"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="patient@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Password * {activeTab === 'signup' && <span className="normal-case font-normal text-slate-400">(min 8 characters)</span>}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    minLength={activeTab === 'signup' ? 8 : 1}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 rounded-2xl bg-[#0C182B] hover:bg-[#162C4E] disabled:bg-slate-300 text-white font-bold text-sm tracking-wide shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-teal-300" />
                    {activeTab === 'signin' ? 'Signing In...' : 'Registering...'}
                  </>
                ) : (
                  <>
                    {activeTab === 'signin' ? 'Sign In to Account' : 'Create MediNest Account'}
                    <ArrowRight className="w-4 h-4 text-teal-300" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
