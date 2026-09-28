import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { AboutSection } from './components/AboutSection';
import { SpecialtyGrid } from './components/SpecialtyGrid';
import { DoctorList } from './components/DoctorList';
import { HowItWorks } from './components/HowItWorks';
import { TrustSection } from './components/TrustSection';
import { PatientTestimonials } from './components/PatientTestimonials';
import { FAQSection } from './components/FAQSection';
import { Footer } from './components/Footer';

import { SymptomCheckerModal } from './components/SymptomCheckerModal';
import { DoctorProfileModal } from './components/DoctorProfileModal';
import { BookingPaymentModal } from './components/BookingPaymentModal';
import { UserDashboardModal } from './components/UserDashboardModal';
import { AuthModal } from './components/AuthModal';
import { ReceiptModal } from './components/ReceiptModal';

// Doctor Portal
import { DoctorAuthModal } from './components/DoctorAuthModal';
import { DoctorPortalView } from './components/DoctorPortalView';

// Admin Portal
import { AdminAuthModal, AdminAuthData } from './components/AdminAuthModal';
import { AdminPortalView } from './components/AdminPortalView';

import { INITIAL_DOCTORS } from './data/doctorsData';
import { INITIAL_SCHEDULE_CONFIG, INITIAL_DOCTOR_APPOINTMENTS } from './data/doctorPortalData';
import { Doctor, ConsultationType, Appointment, UserProfile, DoctorAuthData, DoctorScheduleConfig } from './types';
import { patientSupabase, doctorSupabase, adminSupabase, SUPABASE_CONFIGURED } from './lib/supabase';
import { fetchDoctors } from './lib/doctors';
import { fetchPatientAppointments, cancelAppointmentInDB, rescheduleAppointmentInDB } from './lib/appointments';


export default function App() {
  // ── Master state ──────────────────────────────────────────────────────────
  const [doctors, setDoctors] = useState<Doctor[]>(INITIAL_DOCTORS);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('All Cities');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [consultationTypeFilter, setConsultationTypeFilter] = useState<'all' | ConsultationType>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // ── Patient User State ────────────────────────────────────────────────────
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('mediconnect_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {
      name: 'Guest Patient',
      phone: '',
      email: '',
      isLoggedIn: false
    };
  });

  // ── Patient Appointments State ────────────────────────────────────────────
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem('mediconnect_appointments');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return [];
  });

  // ── Doctor Portal State ───────────────────────────────────────────────────
  const [isDoctorPortalOpen, setIsDoctorPortalOpen] = useState(false);
  const [isDoctorAuthModalOpen, setIsDoctorAuthModalOpen] = useState(false);
  const [loggedInDoctor, setLoggedInDoctor] = useState<DoctorAuthData | null>(null);
  const [doctorSchedule, setDoctorSchedule] = useState<DoctorScheduleConfig>(INITIAL_SCHEDULE_CONFIG);
  const [doctorAppointments, setDoctorAppointments] = useState<Appointment[]>(INITIAL_DOCTOR_APPOINTMENTS);

  // ── Admin Portal State ────────────────────────────────────────────────────
  const [isAdminPortalOpen, setIsAdminPortalOpen] = useState(false);
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [loggedInAdmin, setLoggedInAdmin] = useState<AdminAuthData | null>(null);

  // Saved Doctors State
  const [savedDoctorIds, setSavedDoctorIds] = useState<string[]>(['doc-1', 'doc-2']);

  const [authCallbackNotice, setAuthCallbackNotice] = useState<string | null>(null);

  // Detect `/admin` and `/auth/callback` URL routes on mount
  useEffect(() => {
    if (window.location.pathname === '/admin') {
      if (loggedInAdmin) {
        setIsAdminPortalOpen(true);
      } else {
        setIsAdminAuthModalOpen(true);
      }
    }

    // Handle Supabase Auth Callback (/auth/callback)
    if (window.location.pathname.startsWith('/auth/callback') || window.location.hash.includes('access_token')) {
      if (SUPABASE_CONFIGURED) {
        patientSupabase.auth.getSession().then(({ data, error }) => {
          if (data.session?.user) {
            setAuthCallbackNotice('Email confirmed successfully! Your MediNest patient account is now active.');
            setUser({
              id: data.session.user.id,
              name: data.session.user.user_metadata?.full_name || data.session.user.email || 'Patient',
              phone: data.session.user.phone || '',
              email: data.session.user.email || '',
              isLoggedIn: true,
            });
            // Upsert profile in case it was pending
            patientSupabase.from('profiles').upsert({
              id: data.session.user.id,
              full_name: data.session.user.user_metadata?.full_name || data.session.user.email || 'Patient',
              email: data.session.user.email || '',
              role: 'patient',
            }, { onConflict: 'id' });
          } else if (error) {
            setAuthCallbackNotice(`Email confirmation error: ${error.message}`);
          }
          window.history.replaceState({}, document.title, '/');
        });
      } else {
        window.history.replaceState({}, document.title, '/');
      }
    }
  }, [loggedInAdmin]);

  // ── Supabase: Isolated auth session listeners & data loading ─────────────
  useEffect(() => {
    if (SUPABASE_CONFIGURED) {
      // 1. Patient Auth Listener (medinest_patient_auth)
      const { data: patientListener } = patientSupabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const { data: profile } = await patientSupabase
            .from('profiles')
            .select('full_name, email, phone, role')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profile?.role === 'patient') {
            setUser({
              name: profile?.full_name || session.user.email || 'Patient',
              phone: profile?.phone || '',
              email: profile?.email || session.user.email || '',
              isLoggedIn: true,
            });

            const remoteAppts = await fetchPatientAppointments();
            if (remoteAppts.length > 0) {
              setAppointments(remoteAppts);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setUser({ name: 'Guest Patient', phone: '', email: '', isLoggedIn: false });
        }
      });

      // 2. Doctor Auth Listener (medinest_doctor_auth)
      const { data: doctorListener } = doctorSupabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const { data: profile } = await doctorSupabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .eq('role', 'doctor')
            .maybeSingle();

          if (profile) {
            const { data: doctorProfile } = await doctorSupabase
              .from('doctor_profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();

            setLoggedInDoctor({
              id: session.user.id,
              doctorId: doctorProfile?.registration_number || `DOC-${session.user.id.slice(0, 6).toUpperCase()}`,
              name: doctorProfile?.name || profile.full_name || 'Dr. Doctor',
              email: profile.email || session.user.email || '',
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
              photo: doctorProfile?.photo || profile.avatar_url || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=600',
              languages: doctorProfile?.languages || ['English', 'Hindi'],
              isLoggedIn: true,
              acceptingNewAppointments: doctorProfile?.accepting_appointments ?? true,
              consultationModes: doctorProfile?.consultation_types || ['video', 'clinic'],
            });
          }
        }
      });

      return () => {
        patientListener.subscription.unsubscribe();
        doctorListener.subscription.unsubscribe();
      };
    }
  }, []);

  // ── Load doctors from Supabase (falls back to static on failure) ──────────
  useEffect(() => {
    setDoctorsLoading(true);
    fetchDoctors().then(data => {
      setDoctors(data);
    }).finally(() => {
      setDoctorsLoading(false);
    });
  }, []);

  // ── Sync state to localStorage ────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('mediconnect_appointments', JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem('mediconnect_user', JSON.stringify(user));
  }, [user]);

  // ── Modals & Navigation State ─────────────────────────────────────────────
  const [isSymptomCheckerOpen, setIsSymptomCheckerOpen] = useState(false);
  const [activeDoctorForProfile, setActiveDoctorForProfile] = useState<Doctor | null>(null);
  const [activeDoctorForBooking, setActiveDoctorForBooking] = useState<Doctor | null>(null);
  const [bookingConsultationType, setBookingConsultationType] = useState<ConsultationType>('video');
  const [bookingDate, setBookingDate] = useState<string>('Today');
  const [bookingSlot, setBookingSlot] = useState<string>('10:30 AM');
  const [pendingBooking, setPendingBooking] = useState<{
    doctor: Doctor;
    consultationType: ConsultationType;
    date: string;
    slot: string;
  } | null>(null);

  const [activeReceiptAppointment, setActiveReceiptAppointment] = useState<Appointment | null>(null);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup'>('signin');
  const [authCustomMessage, setAuthCustomMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // ── Patient Handlers ──────────────────────────────────────────────────────
  const handleSearchSubmit = () => scrollToSection('doctors-section');

  const handleSelectSpecialty = (specialtyId: string) => {
    setSelectedSpecialty(specialtyId);
    scrollToSection('doctors-section');
  };

  const handleOpenDoctorProfile = (doctor: Doctor) => {
    setActiveDoctorForProfile(doctor);
  };

  const handleDirectBook = (doctor: Doctor) => {
    if (!user.isLoggedIn) {
      setPendingBooking({
        doctor,
        consultationType: 'video',
        date: 'Today, Fri, 12 Sep',
        slot: '10:30 AM'
      });
      setAuthCustomMessage(`Create a patient account to book an appointment with ${doctor.name}.`);
      setAuthModalTab('signup');
      setIsAuthModalOpen(true);
      return;
    }

    setActiveDoctorForBooking(doctor);
    setBookingConsultationType('video');
    setBookingDate('Today, Fri, 12 Sep');
    setBookingSlot('10:30 AM');
  };

  const handleProceedToBookingFromProfile = (
    doctor: Doctor,
    type: ConsultationType,
    date: string,
    timeSlot: string
  ) => {
    setActiveDoctorForProfile(null);
    if (!user.isLoggedIn) {
      setPendingBooking({
        doctor,
        consultationType: type,
        date,
        slot: timeSlot
      });
      setAuthCustomMessage(`Create a patient account to book an appointment with ${doctor.name}.`);
      setAuthModalTab('signup');
      setIsAuthModalOpen(true);
      return;
    }

    setActiveDoctorForBooking(doctor);
    setBookingConsultationType(type);
    setBookingDate(date);
    setBookingSlot(timeSlot);
  };

  const handlePatientLoginSuccess = async (loggedInUser: UserProfile) => {
    // Role isolation: sign out doctor & admin sessions
    if (SUPABASE_CONFIGURED) {
      try { await doctorSupabase.auth.signOut(); } catch (_) {}
      try { await adminSupabase.auth.signOut(); } catch (_) {}
    }
    setLoggedInDoctor(null);
    setLoggedInAdmin(null);
    setIsDoctorPortalOpen(false);
    setIsAdminPortalOpen(false);

    setUser(loggedInUser);
    setIsAuthModalOpen(false);
    setAuthCustomMessage(null);

    if (pendingBooking) {
      setActiveDoctorForBooking(pendingBooking.doctor);
      setBookingConsultationType(pendingBooking.consultationType);
      setBookingDate(pendingBooking.date);
      setBookingSlot(pendingBooking.slot);
      showToast(`Signed in successfully! Continuing appointment booking with ${pendingBooking.doctor.name}.`);
      setPendingBooking(null);
    } else {
      showToast(`Welcome, ${loggedInUser.name}! Patient Portal active.`);
    }
  };

  const handleBookingSuccess = (newAppointment: Appointment) => {
    setAppointments(prev => [newAppointment, ...prev]);
    showToast(`Appointment confirmed with ${newAppointment.doctorName}!`);
  };

  const handleCancelAppointment = (id: string) => {
    setAppointments(prev =>
      prev.map(a => a.id === id ? { ...a, status: 'cancelled' as const } : a)
    );
    cancelAppointmentInDB(id);
    showToast('Appointment successfully cancelled. ₹ Refund initiated.');
  };

  const handleRescheduleAppointment = (id: string, newDate: string, newTime: string) => {
    setAppointments(prev =>
      prev.map(a => a.id === id ? { ...a, date: newDate, timeSlot: newTime } : a)
    );
    rescheduleAppointmentInDB(id, newDate, newTime);
    showToast('Appointment rescheduled with updated time slot!');
  };

  const handleViewReceipt = (appt: Appointment) => {
    setActiveReceiptAppointment(appt);
  };

  // ── Doctor Portal Handlers ────────────────────────────────────────────────
  const handleOpenDoctorPortal = () => {
    if (user.isLoggedIn && !loggedInDoctor) {
      showToast('You are currently signed in as a Patient. Please sign out of your patient account to access the Doctor Portal.');
      setIsDashboardOpen(true);
      return;
    }
    if (loggedInDoctor) {
      setIsDoctorPortalOpen(true);
    } else {
      setIsDoctorAuthModalOpen(true);
    }
  };

  const handleDoctorLoginSuccess = async (doctorData: DoctorAuthData) => {
    // Role isolation: sign out patient & admin sessions
    if (SUPABASE_CONFIGURED) {
      try { await patientSupabase.auth.signOut(); } catch (_) {}
      try { await adminSupabase.auth.signOut(); } catch (_) {}
    }
    setUser({ name: 'Guest Patient', phone: '', email: '', isLoggedIn: false });
    setLoggedInAdmin(null);
    setIsDashboardOpen(false);
    setIsAdminPortalOpen(false);

    setLoggedInDoctor(doctorData);
    setIsDoctorPortalOpen(true);
    setIsDoctorAuthModalOpen(false);
    showToast(`Welcome, ${doctorData.name}! Doctor Portal active.`);
  };

  const handleDoctorLogout = async () => {
    if (SUPABASE_CONFIGURED) {
      try { await doctorSupabase.auth.signOut(); } catch (_) {}
    }
    setLoggedInDoctor(null);
    setIsDoctorPortalOpen(false);
    showToast('Signed out of Doctor Portal.');
  };

  // ── Admin Portal Handlers ─────────────────────────────────────────────────
  const handleOpenAdminPortal = () => {
    if (user.isLoggedIn && !loggedInAdmin) {
      showToast('You are currently signed in as a Patient. Please sign out of your patient account to access the Admin Portal.');
      setIsDashboardOpen(true);
      return;
    }
    if (loggedInAdmin) {
      setIsAdminPortalOpen(true);
    } else {
      setIsAdminAuthModalOpen(true);
    }
  };

  const handleAdminLoginSuccess = async (admin: AdminAuthData) => {
    // Role isolation: sign out patient & doctor sessions
    if (SUPABASE_CONFIGURED) {
      try { await patientSupabase.auth.signOut(); } catch (_) {}
      try { await doctorSupabase.auth.signOut(); } catch (_) {}
    }
    setUser({ name: 'Guest Patient', phone: '', email: '', isLoggedIn: false });
    setLoggedInDoctor(null);
    setIsDashboardOpen(false);
    setIsDoctorPortalOpen(false);

    setLoggedInAdmin(admin);
    setIsAdminPortalOpen(true);
    setIsAdminAuthModalOpen(false);
    showToast(`Welcome, ${admin.name}! Admin Portal active.`);
  };

  const handleAdminLogout = async () => {
    if (SUPABASE_CONFIGURED) {
      try { await adminSupabase.auth.signOut(); } catch (_) {}
    }
    setLoggedInAdmin(null);
    setIsAdminPortalOpen(false);
    showToast('Signed out of Admin Portal.');
  };

  const savedDoctorsList = doctors.filter(d => savedDoctorIds.includes(d.id));

  // ── Admin Portal full-page view ───────────────────────────────────────────
  if (isAdminPortalOpen && loggedInAdmin) {
    return (
      <AdminPortalView
        admin={loggedInAdmin}
        onBackToMainSite={() => setIsAdminPortalOpen(false)}
        onAdminLogout={handleAdminLogout}
      />
    );
  }

  // ── Doctor Portal full-page view ──────────────────────────────────────────
  if (isDoctorPortalOpen && loggedInDoctor) {
    return (
      <DoctorPortalView
        doctor={loggedInDoctor}
        schedule={doctorSchedule}
        appointments={doctorAppointments}
        onUpdateDoctor={setLoggedInDoctor}
        onUpdateSchedule={setDoctorSchedule}
        onUpdateAppointments={setDoctorAppointments}
        onBackToPatientSite={() => setIsDoctorPortalOpen(false)}
        onDoctorLogout={handleDoctorLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-800 flex flex-col selection:bg-teal-100 selection:text-teal-900">
      {/* Auth Callback Notice Banner */}
      {authCallbackNotice && (
        <div className="bg-[#032F31] text-[#FAE58D] px-4 py-2.5 text-xs font-bold flex items-center justify-between z-50 border-b border-teal-800">
          <div className="flex items-center gap-2 max-w-7xl mx-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{authCallbackNotice}</span>
          </div>
          <button onClick={() => setAuthCallbackNotice(null)} className="text-teal-200 hover:text-white text-xs cursor-pointer font-bold">✕</button>
        </div>
      )}

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0C182B] text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-fadeIn text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2 text-sm cursor-pointer">✕</button>
        </div>
      )}

      {/* Navigation Bar */}
      <Navbar
        selectedCity={selectedCity}
        onSelectCity={setSelectedCity}
        onOpenSymptomChecker={() => setIsSymptomCheckerOpen(true)}
        onOpenDashboard={() => setIsDashboardOpen(true)}
        onOpenAuth={(tab = 'signin') => {
          setAuthModalTab(tab);
          setIsAuthModalOpen(true);
        }}
        onOpenDoctorPortal={handleOpenDoctorPortal}
        onOpenAdminPortal={handleOpenAdminPortal}
        onNavigateToSection={scrollToSection}
        user={user}
        upcomingCount={appointments.filter(a => a.status === 'upcoming').length}
        isDoctorLoggedIn={!!loggedInDoctor}
        doctorName={loggedInDoctor?.name}
        isAdminLoggedIn={!!loggedInAdmin}
      />

      {/* Hero Section */}
      <main className="flex-1">
        <Hero
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedSpecialty={selectedSpecialty}
          onSpecialtyChange={setSelectedSpecialty}
          selectedCity={selectedCity}
          onCityChange={setSelectedCity}
          consultationTypeFilter={consultationTypeFilter}
          onConsultationTypeChange={setConsultationTypeFilter}
          onSearchSubmit={handleSearchSubmit}
          onOpenSymptomChecker={() => setIsSymptomCheckerOpen(true)}
          onBookNowClick={() => scrollToSection('doctors-section')}
        />

        <AboutSection />

        <SpecialtyGrid
          onSelectSpecialty={handleSelectSpecialty}
          selectedSpecialtyId={selectedSpecialty}
        />

        <DoctorList
          doctors={doctors}
          selectedSpecialty={selectedSpecialty}
          onSpecialtyChange={setSelectedSpecialty}
          selectedCity={selectedCity}
          onCityChange={setSelectedCity}
          consultationTypeFilter={consultationTypeFilter}
          onConsultationTypeChange={setConsultationTypeFilter}
          onViewProfile={handleOpenDoctorProfile}
          onBookAppointment={handleDirectBook}
        />

        <HowItWorks />
        <TrustSection />
        <PatientTestimonials />
        <FAQSection />
      </main>

      <Footer
        onSelectSpecialty={handleSelectSpecialty}
        onOpenSymptomChecker={() => setIsSymptomCheckerOpen(true)}
      />

      {/* MODALS */}
      {/* 1. AI Symptom Checker Modal */}
      <SymptomCheckerModal
        isOpen={isSymptomCheckerOpen}
        onClose={() => setIsSymptomCheckerOpen(false)}
        doctors={doctors}
        onSelectDoctorForBooking={handleDirectBook}
        onFilterSpecialty={(specId) => {
          setSelectedSpecialty(specId);
          scrollToSection('doctors-section');
        }}
      />

      {/* 2. Doctor Detailed Profile Modal */}
      <DoctorProfileModal
        doctor={activeDoctorForProfile}
        isOpen={!!activeDoctorForProfile}
        onClose={() => setActiveDoctorForProfile(null)}
        onProceedToBooking={handleProceedToBookingFromProfile}
      />

      {/* 3. Booking and Indian Payment Modal */}
      <BookingPaymentModal
        isOpen={!!activeDoctorForBooking}
        onClose={() => setActiveDoctorForBooking(null)}
        doctor={activeDoctorForBooking}
        consultationType={bookingConsultationType}
        selectedDate={bookingDate}
        selectedTimeSlot={bookingSlot}
        user={user}
        onBookingSuccess={handleBookingSuccess}
        onViewReceipt={handleViewReceipt}
        onManageAppointments={() => {
          setActiveDoctorForBooking(null);
          setIsDashboardOpen(true);
        }}
      />

      {/* 5. User Account Dashboard Modal */}
      <UserDashboardModal
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        user={user}
        appointments={appointments}
        savedDoctors={savedDoctorsList}
        onCancelAppointment={handleCancelAppointment}
        onRescheduleAppointment={handleRescheduleAppointment}
        onViewReceipt={handleViewReceipt}
        onBookDoctorAgain={handleDirectBook}
        onLogout={async () => {
          if (SUPABASE_CONFIGURED) {
            try { await patientSupabase.auth.signOut(); } catch (_) {}
          }
          setUser({ name: 'Guest Patient', phone: '', email: '', isLoggedIn: false });
          setIsDashboardOpen(false);
          showToast('Signed out of MediNest account.');
        }}
      />

      {/* 6. Tax Invoice & Receipt Modal (Highest z-index overlay) */}
      <ReceiptModal
        isOpen={!!activeReceiptAppointment}
        appointment={activeReceiptAppointment}
        onClose={() => setActiveReceiptAppointment(null)}
      />

      {/* 6. Patient Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialTab={authModalTab}
        customMessage={authCustomMessage}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthCustomMessage(null);
        }}
        onLoginSuccess={handlePatientLoginSuccess}
      />

      {/* 7. Doctor Auth Modal */}
      <DoctorAuthModal
        isOpen={isDoctorAuthModalOpen}
        onClose={() => setIsDoctorAuthModalOpen(false)}
        onDoctorLoginSuccess={handleDoctorLoginSuccess}
        initialTab="login"
      />

      {/* 8. Admin Auth Modal */}
      <AdminAuthModal
        isOpen={isAdminAuthModalOpen}
        onClose={() => setIsAdminAuthModalOpen(false)}
        onAdminLoginSuccess={handleAdminLoginSuccess}
      />
    </div>
  );
}
