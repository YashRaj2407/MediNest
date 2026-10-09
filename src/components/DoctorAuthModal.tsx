import React, { useState, useEffect } from 'react';
import { 
  X, Stethoscope, Lock, Mail, ShieldCheck, 
  Eye, EyeOff, CheckCircle, Award, AlertCircle, Loader2, Play
} from 'lucide-react';
import { SPECIALTIES, INDIAN_CITIES } from '../data/specialtiesData';
import { DoctorAuthData } from '../types';
import { useAuth, useUser } from '@clerk/clerk-react';
import { INITIAL_DOCTORS } from '../data/doctorsData';

interface DoctorAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDoctorLoginSuccess: (doctor: DoctorAuthData) => void;
  initialTab?: 'login' | 'register';
}

export const DoctorAuthModal: React.FC<DoctorAuthModalProps> = ({
  isOpen, onClose, onDoctorLoginSuccess, initialTab = 'login'
}) => {
  if (!isOpen) return null;
  
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { user } = useUser();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [regName, setRegName] = useState('');
  const [regRegNumber, setRegRegNumber] = useState('');
  const [regSpecialty, setRegSpecialty] = useState(SPECIALTIES[0].name);
  const [regQualifications, setRegQualifications] = useState('');
  const [regExperience, setRegExperience] = useState('5');
  const [regClinicName, setRegClinicName] = useState('');
  const [regClinicAddress, setRegClinicAddress] = useState('');
  const [regCity, setRegCity] = useState(INDIAN_CITIES[0]);
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!isLoaded) {
      setLoginError('Authentication service is initializing. Please wait.');
      return;
    }

    if (!isSignedIn || !user) {
      setLoginError('You must sign in with your Clerk account first. Please close this modal and use the Patient Sign In button, or create an account, then return here.');
      return;
    }

    setLoginLoading(true);
    const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
    
    try {
      const token = await getToken();
      
      const res = await fetch(`${API_BASE_URL}/doctors/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ email: user.primaryEmailAddress?.emailAddress }),
      });
      const body = await res.json();
      if (!res.ok || !body.success || !body.data) {
        setLoginError(body?.error || 'No verified doctor profile found for your account.');
        return;
      }
      onDoctorLoginSuccess(body.data as DoctorAuthData);
      onClose();
    } catch (err: any) {
      setLoginError(`Network error connecting to doctor portal: ${err?.message || 'Server unreachable'}`);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    
    if (!isSignedIn || !user) {
      setRegError('Please sign in to your Clerk account first using the main Sign In button.');
      return;
    }
    
    if (!regName || !regRegNumber || !regQualifications) {
      setRegError('Please fill all mandatory fields.');
      return;
    }

    setRegLoading(true);
    const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
    
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/doctors/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: user.primaryEmailAddress?.emailAddress || '',
          fullName: user.fullName || regName,
          phone: user.primaryPhoneNumber?.phoneNumber || '',
          name: regName.startsWith('Dr.') ? regName : `Dr. ${regName}`,
          registrationNumber: regRegNumber,
          specialty: regSpecialty,
          qualifications: regQualifications,
          experienceYears: Number(regExperience) || 0,
          clinicName: regClinicName || '',
          address: regClinicAddress || '',
          city: regCity
        }),
      });
      
      const body = await res.json();
      if (!res.ok || !body.success) {
        setRegError(body?.error || 'Failed to register doctor profile.');
        setRegLoading(false);
        return;
      }
      
      setRegistrationSubmitted(true);
      setTimeout(async () => {
        try {
          const profileRes = await fetch(`${API_BASE_URL}/doctors/profile/by-user/${user.id}`);
          const profileBody = await profileRes.json();
          if (profileRes.ok && profileBody.success && profileBody.data) {
            onDoctorLoginSuccess(profileBody.data as DoctorAuthData);
            onClose();
          } else {
            setRegError('Registration successful, but failed to log in automatically.');
          }
        } catch (e) {
          setRegError('Registration successful. Please log in.');
        }
        setRegLoading(false);
      }, 1500);
      
    } catch (err: any) {
      setRegError(`Network error: ${err?.message || 'Server unreachable'}`);
      setRegLoading(false);
    }
  };

  const handleDemoDoctorClick = (doc: any) => {
    // Open the selected demo doctor profile
    const demoAuthData: DoctorAuthData = {
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
      registrationNumber: `REG-${doc.id.toUpperCase()}`,
      photo: doc.photo,
      languages: doc.languages,
      isLoggedIn: true,
      acceptingNewAppointments: true,
      consultationModes: ['video', 'clinic']
    };
    onDoctorLoginSuccess(demoAuthData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#DDD6C5] overflow-hidden my-6">
        <div className="bg-[#032F31] text-white p-6 sm:p-7 relative">
          <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer">
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
              <h2 className="text-2xl font-bold tracking-tight text-white mt-1">MediNest Doctor Portal</h2>
            </div>
          </div>
          <p className="text-xs text-slate-200">Dedicated portal for certified practitioners.</p>
        </div>

        <div className="flex border-b border-slate-200">
          <button onClick={() => setActiveTab('login')} className={`flex-1 py-4 text-sm font-bold text-center transition-colors ${activeTab === 'login' ? 'text-teal-700 border-b-2 border-teal-700 bg-teal-50/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
            Sign In to Portal
          </button>
          <button onClick={() => setActiveTab('register')} className={`flex-1 py-4 text-sm font-bold text-center transition-colors ${activeTab === 'register' ? 'text-teal-700 border-b-2 border-teal-700 bg-teal-50/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
            Register as Doctor
          </button>
        </div>

        <div className="p-6 sm:p-8">
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              {loginError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}
              
              {!isSignedIn ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800 text-center">
                  You are not signed in. Please close this modal, sign in using the main Clerk authentication, and then return here.
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-sm text-teal-800 text-center font-medium">
                  Signed in as {user?.primaryEmailAddress?.emailAddress}
                </div>
              )}

              <button type="submit" disabled={loginLoading || !isSignedIn} className="w-full py-3 px-4 rounded-xl bg-[#032F31] hover:bg-[#074749] disabled:opacity-60 text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer">
                {loginLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : <><ShieldCheck className="w-4 h-4 text-[#FAE58D]" /> Access Secure Doctor Portal</>}
              </button>
            </form>
          )}

          {activeTab === 'register' && (
            <div>
              {registrationSubmitted ? (
                <div className="text-center py-8 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                    <CheckCircle className="w-9 h-9" />
                  </div>
                  <h3 className="text-lg font-bold text-[#032F31]">Application Submitted</h3>
                  <button onClick={() => { setActiveTab('login'); setRegistrationSubmitted(false); }} className="text-xs font-bold text-teal-700 hover:underline cursor-pointer">Back to Sign In</button>
                </div>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  {regError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{regError}</span>
                    </div>
                  )}

                  {!isSignedIn && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                      You must be signed in via Clerk before registering.
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name (with Title) *</label>
                    <input type="text" required value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="e.g. Dr. Aakash Patel" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-teal-700 bg-slate-50/50" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Registration Number *</label>
                      <input type="text" required value={regRegNumber} onChange={(e) => setRegRegNumber(e.target.value)} placeholder="e.g. KMC-2016-99241" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-teal-700 bg-slate-50/50" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Specialty *</label>
                      <select value={regSpecialty} onChange={(e) => setRegSpecialty(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-teal-700 bg-slate-50/50">
                        {SPECIALTIES.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Qualifications *</label>
                      <input type="text" required value={regQualifications} onChange={(e) => setRegQualifications(e.target.value)} placeholder="e.g. MBBS, MD" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-teal-700 bg-slate-50/50" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Experience (Years) *</label>
                      <input type="number" required min="0" value={regExperience} onChange={(e) => setRegExperience(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-teal-700 bg-slate-50/50" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Clinic/Hospital Name</label>
                      <input type="text" value={regClinicName} onChange={(e) => setRegClinicName(e.target.value)} placeholder="e.g. Apollo Hospital" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-teal-700 bg-slate-50/50" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">City *</label>
                      <select value={regCity} onChange={(e) => setRegCity(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-teal-700 bg-slate-50/50">
                        {INDIAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <button type="submit" disabled={regLoading || !isSignedIn} className="w-full py-3 px-4 rounded-xl bg-[#032F31] hover:bg-[#074749] disabled:opacity-60 text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer mt-4">
                    {regLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <><Award className="w-4 h-4 text-[#FAE58D]" /> Submit Credentials for Verification</>}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
        
        {/* DEMO DOCTORS SECTION */}
        <div className="bg-slate-50 border-t border-slate-200 p-6 sm:p-8">
          <h3 className="text-sm font-bold text-[#032F31] mb-4 flex items-center gap-2">
            <Play className="w-4 h-4 text-teal-700" /> Demo Doctors — Explore Sample Profiles
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Click to explore sample doctor profiles, their schedules, and features without registering.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {INITIAL_DOCTORS.map(doc => (
              <button 
                key={doc.id}
                type="button"
                onClick={() => handleDemoDoctorClick(doc)}
                className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all text-left cursor-pointer"
              >
                <img src={doc.photo} alt={doc.name} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-[#032F31] truncate">{doc.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{doc.specialty} • {doc.city}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
