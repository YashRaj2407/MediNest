import React, { useState } from 'react';
import { 
  X, 
  Shield, 
  Lock, 
  Mail, 
  ShieldCheck, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { adminSupabase, SUPABASE_CONFIGURED } from '../lib/supabase';

export interface AdminAuthData {
  id: string;
  name: string;
  email: string;
  role: 'admin';
  isLoggedIn: boolean;
}

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdminLoginSuccess: (admin: AdminAuthData) => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onAdminLoginSuccess
}) => {
  if (!isOpen) return null;

  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [nonAdminUser, setNonAdminUser] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && SUPABASE_CONFIGURED) {
      setLoginError('');
      adminSupabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user) {
          const { data: profile } = await adminSupabase
            .from('profiles')
            .select('role, full_name, email')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profile && profile.role !== 'admin') {
            setNonAdminUser(profile.full_name || profile.email || session.user.email || 'Current User');
          } else if (profile && profile.role === 'admin') {
            onAdminLoginSuccess({
              id: session.user.id,
              name: profile.full_name || 'MediNest Admin',
              email: profile.email || session.user.email || '',
              role: 'admin',
              isLoggedIn: true
            });
            onClose();
          }
        }
      });
    }
  }, [isOpen]);

  const handleSignOutAndSwitch = async () => {
    if (SUPABASE_CONFIGURED) {
      await adminSupabase.auth.signOut();
    }
    setNonAdminUser(null);
    setAdminEmail('');
    setPassword('');
    setLoginError('');
  };

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!adminEmail.trim()) {
      setLoginError('Please enter administrator email address.');
      return;
    }

    if (!SUPABASE_CONFIGURED) {
      onAdminLoginSuccess({
        id: 'admin-1',
        name: 'MediNest Admin',
        email: adminEmail.trim(),
        role: 'admin',
        isLoggedIn: true
      });
      onClose();
      return;
    }

    setLoginLoading(true);
    try {
      const { data, error } = await adminSupabase.auth.signInWithPassword({
        email: adminEmail.trim().toLowerCase(),
        password: password,
      });

      if (error) {
        setLoginError(error.message || 'Admin sign-in failed. Please verify credentials.');
        return;
      }

      if (!data.user) {
        setLoginError('Authentication failed.');
        return;
      }

      // Check role in public.profiles table
      const { data: profile, error: profileError } = await adminSupabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileError || !profile || profile.role !== 'admin') {
        setLoginError('This account is not an administrator. Please sign in with an administrator account.');
        await adminSupabase.auth.signOut();
        return;
      }

      onAdminLoginSuccess({
        id: data.user.id,
        name: profile.full_name || 'MediNest Admin',
        email: profile.email || data.user.email || '',
        role: 'admin',
        isLoggedIn: true
      });
      onClose();

    } catch (err: any) {
      setLoginError('An unexpected error occurred. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Top Header */}
        <div className="bg-[#0C182B] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close Admin Modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-md">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold tracking-wider uppercase border border-amber-500/30">
                <ShieldCheck className="w-3 h-3" /> System Administration
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white mt-1">
                Admin Control Portal
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-300">
            Secure sign-in for platform managers to manage patients, verify doctors, and monitor system appointments.
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {nonAdminUser && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                <div>
                  <span className="font-bold block">Currently signed in as: {nonAdminUser}</span>
                  <span>This account is not an administrator. Please sign in with an administrator account.</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOutAndSwitch}
                className="w-full py-2 px-3 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Sign Out &amp; Switch to Admin Account
              </button>
            </div>
          )}

          {loginError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLoginSubmit} className="space-y-4">

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Administrator Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@medinest.in"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-600 bg-slate-50/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-600 bg-slate-50/50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loginLoading}
            className="w-full py-3 px-4 rounded-xl bg-[#0C182B] hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold tracking-wide shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer mt-2"
          >
            {loginLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Verifying Admin Rights…</>
            ) : (
              <><ShieldCheck className="w-4 h-4 text-amber-400" /> Access Secure Admin Portal</>
            )}
          </button>
        </form>
      </div>
    </div>
  </div>
);
};
