import React, { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
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
import { fetchDoctors } from './lib/doctors';
import { fetchPatientAppointments, fetchDoctorAppointments, cancelAppointmentInDB, rescheduleAppointmentInDB } from './lib/appointments';


export default function App() {
  // â”€â”€ Master state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [doctors, setDoctors] = useState<Doctor[]>(INITIAL_DOCTORS);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('All Cities');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [consultationTypeFilter, setConsultationTypeFilter] = useState<'all' | ConsultationType>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // â”€â”€ Clerk Auth Hooks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const { user: clerkUser, isLoaded: isClerkUserLoaded, isSignedIn: isClerkSignedIn } = useUser();
  const { signOut: clerkSignOut } = useClerk();

  // â”€â”€ Patient User State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Sync Clerk User to App State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!isClerkUserLoaded) return;
    if (isClerkSignedIn && clerkUser) {
      const email = clerkUser.primaryEmailAddress?.emailAddress || '';
      const name = clerkUser.fullName || clerkUser.firstName || email.split('@')[0] || 'Patient';
      const phone = clerkUser.primaryPhoneNumber?.phoneNumber || '';
      setUser({
        id: clerkUser.id,
        name,
        email,
        phone,
        isLoggedIn: true,
      });

      // Sync with MySQL backend
      const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
      fetch(`${API_BASE_URL}/auth/sync-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: clerkUser.id,
          email,
          fullName: name,
          role: 'patient',
          phone,
        }),
      }).catch(() => {});
    } else if (!isClerkSignedIn && user.isLoggedIn && !loggedInDoctor && !loggedInAdmin) {
      setUser({
        name: 'Guest Patient',
        phone: '',
        email: '',
        isLoggedIn: false,
      });
    }
  }, [isClerkUserLoaded, isClerkSignedIn, clerkUser]);

  // â”€â”€ Patient Appointments State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem('mediconnect_appointments');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return [];
  });

  // â”€â”€ Doctor Portal State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [isDoctorPortalOpen, setIsDoctorPortalOpen] = useState(false);
  const [isDoctorAuthModalOpen, setIsDoctorAuthModalOpen] = useState(false);
  const [loggedInDoctor, setLoggedInDoctor] = useState<DoctorAuthData | null>(null);
  const [doctorSchedule, setDoctorSchedule] = useState<DoctorScheduleConfig>(INITIAL_SCHEDULE_CONFIG);
  const [doctorAppointments, setDoctorAppointments] = useState<Appointment[]>([]);

  // â”€â”€ Admin Portal State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [isAdminPortalOpen, setIsAdminPortalOpen] = useState(false);
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [loggedInAdmin, setLoggedInAdmin] = useState<AdminAuthData | null>(null);

  // Saved Doctors State
  const [savedDoctorIds, setSavedDoctorIds] = useState<string[]>(['doc-1', 'doc-2']);

  const [authCallbackNotice, setAuthCallbackNotice] = useState<string | null>(null);

  // Detect `/admin` and `/auth/callback` URL routes on mount
  // Detect `/admin` URL route on mount
  useEffect(() => {
    if (window.location.pathname === '/admin') {
      if (loggedInAdmin) {
        setIsAdminPortalOpen(true);
      } else {
        setIsAdminAuthModalOpen(true);
      }
    }
  }, [loggedInAdmin]);

  // â”€â”€ Load doctors from API (falls back to static on failure) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    setDoctorsLoading(true);
    fetchDoctors().then(data => {
      setDoctors(data);
    }).finally(() => {
      setDoctorsLoading(false);
    });
  }, []);

  // â”€â”€ Load doctor appointments from MySQL whenever loggedInDoctor changes â”€â”€
  useEffect(() => {
    if (loggedInDoctor?.id) {
      fetchDoctorAppointments(loggedInDoctor.id).then(data => {
        setDoctorAppointments(data || []);
      });
    }
  }, [loggedInDoctor?.id]);

  // â”€â”€ Sync state to localStorage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    localStorage.setItem('mediconnect_appointments', JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem('mediconnect_user', JSON.stringify(user));
  }, [user]);

  // â”€â”€ Modals & Navigation State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Patient Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      setAuthCustomMessage(`Sign in or create an account to book an appointment with ${doctor.name}.`);
      setAuthModalTab('signin');
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
      setAuthCustomMessage(`Sign in or create an account to book an appointment with ${doctor.name}.`);
      setAuthModalTab('signin');
      setIsAuthModalOpen(true);
      return;
    }

    setActiveDoctorForBooking(doctor);
    setBookingConsultationType(type);
    setBookingDate(date);
    setBookingSlot(timeSlot);
  };

  const handlePatientLoginSuccess = async (loggedInUser: UserProfile) => {
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
    showToast('Appointment successfully cancelled. â‚¹ Refund initiated.');
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

  // â”€â”€ Doctor Portal Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    setLoggedInDoctor(null);
    setIsDoctorPortalOpen(false);
    showToast('Signed out of Doctor Portal.');
  };

  // â”€â”€ Admin Portal Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    setLoggedInAdmin(null);
    setIsAdminPortalOpen(false);
    showToast('Signed out of Admin Portal.');
  };

  const savedDoctorsList = doctors.filter(d => savedDoctorIds.includes(d.id));

  // â”€â”€ Admin Portal full-page view â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (isAdminPortalOpen && loggedInAdmin) {
    return (
      <AdminPortalView
        admin={loggedInAdmin}
        onBackToMainSite={() => setIsAdminPortalOpen(false)}
        onAdminLogout={handleAdminLogout}
      />
    );
  }

  // â”€â”€ Doctor Portal full-page view â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          <button onClick={() => setAuthCallbackNotice(null)} className="text-teal-200 hover:text-white text-xs cursor-pointer font-bold">âœ•</button>
        </div>
      )}

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0C182B] text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-fadeIn text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2 text-sm cursor-pointer">âœ•</button>
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
          setAuthCustomMessage(null); // clear any stale booking message when user explicitly opens auth
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
      {isSymptomCheckerOpen && (
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
      )}

      {/* 2. Doctor Detailed Profile Modal */}
      {!!activeDoctorForProfile && (
        <DoctorProfileModal
          doctor={activeDoctorForProfile}
          isOpen={!!activeDoctorForProfile}
          onClose={() => setActiveDoctorForProfile(null)}
          onProceedToBooking={handleProceedToBookingFromProfile}
        />
      )}

      {/* 3. Booking and Indian Payment Modal */}
      {!!activeDoctorForBooking && (
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
      )}

      {/* 5. User Account Dashboard Modal */}
      {isDashboardOpen && (
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
            try {
              await clerkSignOut();
            } catch (_) {}
            setUser({ name: 'Guest Patient', phone: '', email: '', isLoggedIn: false });
            setIsDashboardOpen(false);
            showToast('Signed out of MediNest account.');
          }}
        />
      )}

      {/* 6. Tax Invoice & Receipt Modal (Highest z-index overlay) */}
      {!!activeReceiptAppointment && (
        <ReceiptModal
          isOpen={!!activeReceiptAppointment}
          appointment={activeReceiptAppointment}
          onClose={() => setActiveReceiptAppointment(null)}
        />
      )}

      {/* 6. Patient Auth Modal */}
      {isAuthModalOpen && (
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
      )}

      {/* 7. Doctor Auth Modal */}
      {isDoctorAuthModalOpen && (
        <DoctorAuthModal
          isOpen={isDoctorAuthModalOpen}
          onClose={() => setIsDoctorAuthModalOpen(false)}
          onDoctorLoginSuccess={handleDoctorLoginSuccess}
          initialTab="login"
        />
      )}

      {/* 8. Admin Auth Modal */}
      {isAdminAuthModalOpen && (
        <AdminAuthModal
          isOpen={isAdminAuthModalOpen}
          onClose={() => setIsAdminAuthModalOpen(false)}
          onAdminLoginSuccess={handleAdminLoginSuccess}
        />
      )}
    </div>
  );
}
