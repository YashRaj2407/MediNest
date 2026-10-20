import React, { useState, useEffect, useMemo } from 'react';
import { useUser, useClerk, useAuth } from '@clerk/clerk-react';
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
import { UnifiedAuthModal } from './components/UnifiedAuthModal';
import type { AuthRole, AuthMode } from './components/UnifiedAuthModal';
import { ReceiptModal } from './components/ReceiptModal';

// Doctor Portal
import { DoctorAuthModal } from './components/DoctorAuthModal';
import { DoctorPortalView } from './components/DoctorPortalView';
import { DoctorPortalErrorBoundary } from './components/DoctorPortalErrorBoundary';

// Admin Portal
import { AdminAuthModal, AdminAuthData } from './components/AdminAuthModal';
import { AdminPortalView } from './components/AdminPortalView';

import { INITIAL_DOCTORS } from './data/doctorsData';
import { INITIAL_SCHEDULE_CONFIG, INITIAL_DOCTOR_APPOINTMENTS } from './data/doctorPortalData';
import { Doctor, ConsultationType, Appointment, UserProfile, DoctorAuthData, DoctorScheduleConfig } from './types';
import { fetchDoctors, fetchFeaturedDoctors, fetchSavedDoctorIds, saveDoctorInDB, removeSavedDoctorInDB } from './lib/doctors';
import { 
  fetchPatientAppointments, 
  fetchDoctorAppointments, 
  cancelAppointmentInDB, 
  rescheduleAppointmentInDB,
  deleteCancelledAppointmentInDB,
  formatTimeSlotRange 
} from './lib/appointments';


export default function App() {
  // -- Master state ----------------------------------------------------------
  const [doctors, setDoctors] = useState<Doctor[]>(INITIAL_DOCTORS);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('All Cities');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [consultationTypeFilter, setConsultationTypeFilter] = useState<'all' | ConsultationType>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // -- Clerk Auth Hooks ------------------------------------------------------
  const { user: clerkUser, isLoaded: isClerkUserLoaded, isSignedIn: isClerkSignedIn } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const { getToken } = useAuth();

  // -- Patient User State ----------------------------------------------------
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('mediconnect_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.isLoggedIn && parsed?.email) {
          return parsed;
        }
      } catch (e) { /* ignore */ }
    }
    return {
      name: 'Guest Patient',
      phone: '',
      email: '',
      isLoggedIn: false
    };
  });

  // -- Sync Clerk User to App State ------------------------------------------
  useEffect(() => {
    if (!isClerkUserLoaded) return;
    const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

    if (isClerkSignedIn && clerkUser) {
      const email = clerkUser.primaryEmailAddress?.emailAddress || '';
      const clerkFullName = clerkUser.fullName || (clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() : '');
      const name = clerkFullName || email.split('@')[0] || 'User';
      const phone = clerkUser.primaryPhoneNumber?.phoneNumber || '';

      // Check authoritative role from MySQL database first
      fetch(`${API_BASE_URL}/auth/profile/${clerkUser.id}`)
        .then(res => res.json())
        .then(async (body) => {
          if (body.success && body.data) {
            const dbRole = body.data.role;
            if (dbRole === 'doctor' && !loggedInDoctor) {
              // User is registered as a doctor — restore doctor portal session
              try {
                let token = '';
                try { if (getToken) token = (await getToken()) || ''; } catch (_) {}
                const docRes = await fetch(`${API_BASE_URL}/doctors/profile/by-user/${clerkUser.id}`, {
                  headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                    'x-user-id': clerkUser.id,
                    'x-user-role': 'doctor'
                  }
                });
                const docBody = await docRes.json();
                if (docRes.ok && docBody.success && docBody.data) {
                  const docData = {
                    ...docBody.data,
                    isLoggedIn: true,
                    acceptingNewAppointments: docBody.data.acceptingNewAppointments ?? true,
                    consultationModes: Array.isArray(docBody.data.consultationModes)
                      ? docBody.data.consultationModes
                      : ['video', 'clinic'],
                    languages: Array.isArray(docBody.data.languages)
                      ? docBody.data.languages
                      : ['English'],
                  };
                  setLoggedInDoctor(docData as DoctorAuthData);
                  setIsDoctorPortalOpen(true);
                  setUser({ name: 'Guest Patient', phone: '', email: '', isLoggedIn: false });
                  return;
                }
              } catch (_e) {}
              // If doctor profile fetch fails, still set as patient UI so the page is not blank
              setUser({ id: clerkUser.id, name: body.data.full_name || name, email, phone, isLoggedIn: true });
              return;
            } else if (dbRole === 'patient') {
              // If user is currently in Doctor Auth modal, don't trap them in patient mode
              if (isUnifiedAuthOpen && unifiedAuthRole === 'doctor') {
                return;
              }
              setUser({
                id: clerkUser.id,
                name: body.data.full_name || name,
                email,
                phone: body.data.phone || phone,
                isLoggedIn: true,
              });
              return;
            }
          }
          // Note: If no profile exists in MySQL, the user is in the middle of registration.
          // We DO NOT auto-create a patient profile. Registration handlers create the correct role explicitly.
        })
        .catch(() => {});
    } else if (!isClerkSignedIn && user.isLoggedIn && !loggedInDoctor && !loggedInAdmin) {
      setUser({
        name: 'Guest Patient',
        phone: '',
        email: '',
        isLoggedIn: false,
      });
    }
  }, [isClerkUserLoaded, isClerkSignedIn, clerkUser]);

  // -- Patient Appointments State --------------------------------------------
  // Clean initialization: isolated per user identity, never shared across accounts
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // -- Doctor Portal State ---------------------------------------------------
  const [isDoctorPortalOpen, setIsDoctorPortalOpen] = useState(false);
  const [isDoctorAuthModalOpen, setIsDoctorAuthModalOpen] = useState(false);
  const [loggedInDoctor, setLoggedInDoctor] = useState<DoctorAuthData | null>(null);
  const [doctorSchedule, setDoctorSchedule] = useState<DoctorScheduleConfig>(INITIAL_SCHEDULE_CONFIG);
  const [doctorAppointments, setDoctorAppointments] = useState<Appointment[]>([]);

  // -- Admin Portal State ----------------------------------------------------
  const [isAdminPortalOpen, setIsAdminPortalOpen] = useState(false);
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [loggedInAdmin, setLoggedInAdmin] = useState<AdminAuthData | null>(null);

  // -- Saved Doctors State (persisted per-user in MySQL + localStorage cache) -
  // Key is strictly scoped to the authenticated user ID so each patient has an isolated list.
  const getSavedDoctorsKey = (uid: string | undefined) =>
    uid ? `medinest_saved_doctors_${uid}` : null;

  const [savedDoctorIds, setSavedDoctorIds] = useState<string[]>([]);

  // Reload saved-doctor IDs whenever the active patient identity changes.
  // Fetches authoritative patient-specific saved doctors from MySQL backend.
  useEffect(() => {
    const uid = user.id || clerkUser?.id;
    if (!uid || (!user.isLoggedIn && !isClerkSignedIn)) {
      setSavedDoctorIds([]);
      return;
    }
    const key = getSavedDoctorsKey(uid);
    // Optimistically load cached data for this specific user
    if (key) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) setSavedDoctorIds(JSON.parse(stored));
      } catch (_) {}
    }

    // Fetch authoritative saved doctor list from backend MySQL
    getToken().then(token => {
      fetchSavedDoctorIds(uid, token || undefined).then(ids => {
        if (Array.isArray(ids)) {
          setSavedDoctorIds(ids);
          if (key) {
            try { localStorage.setItem(key, JSON.stringify(ids)); } catch (_) {}
          }
        }
      });
    }).catch(() => {
      fetchSavedDoctorIds(uid).then(ids => {
        if (Array.isArray(ids)) {
          setSavedDoctorIds(ids);
          if (key) {
            try { localStorage.setItem(key, JSON.stringify(ids)); } catch (_) {}
          }
        }
      });
    });
  }, [user.id, user.isLoggedIn, clerkUser?.id, isClerkSignedIn, getToken]);

  const handleToggleSaveDoctor = async (docId: string) => {
    const uid = user.id || clerkUser?.id;
    if (!uid) {
      showToast('Please sign in to save doctors.');
      return;
    }
    const exists = savedDoctorIds.includes(docId);
    const next = exists ? savedDoctorIds.filter(id => id !== docId) : [...savedDoctorIds, docId];
    setSavedDoctorIds(next);

    const key = getSavedDoctorsKey(uid);
    if (key) {
      try { localStorage.setItem(key, JSON.stringify(next)); } catch (_) {}
    }

    const targetDoc = doctors.find(d => d.id === docId) || INITIAL_DOCTORS.find(d => d.id === docId);
    const name = targetDoc?.name || 'Doctor';
    showToast(exists ? `Removed ${name} from saved doctors.` : `Saved ${name} to your dashboard.`);

    let token: string | null = null;
    try { token = await getToken(); } catch (_) {}

    if (exists) {
      await removeSavedDoctorInDB(docId, uid, token || undefined);
    } else {
      await saveDoctorInDB(docId, uid, token || undefined);
    }
  };

  const [authCallbackNotice, setAuthCallbackNotice] = useState<string | null>(null);

  // Detect `/admin` URL route on mount
  useEffect(() => {
    if (window.location.pathname === '/admin') {
      if (loggedInAdmin) {
        setIsAdminPortalOpen(true);
      } else {
        setUnifiedAuthRole('admin');
        setUnifiedAuthMode('signin');
        setIsUnifiedAuthOpen(true);
      }
    }
  }, [loggedInAdmin]);

  // -- Load doctors from API (falls back to static on failure) ----------
  useEffect(() => {
    setDoctorsLoading(true);
    fetchDoctors().then(data => {
      setDoctors(data);
    }).finally(() => {
      setDoctorsLoading(false);
    });
  }, []);

  // -- Load patient appointments from MySQL with strict user isolation -------
  const loadPatientAppointments = React.useCallback(async () => {
    const patientId = user.id || clerkUser?.id;
    if (!patientId || (!user.isLoggedIn && !isClerkSignedIn)) {
      setAppointments([]);
      return;
    }
    try {
      let token: string | null = null;
      try {
        token = await getToken();
      } catch (_) {}

      const data = await fetchPatientAppointments(patientId, token || undefined);
      // Explicitly set array: if empty (0 past consultations), it sets []
      const validData = Array.isArray(data) ? data : [];
      setAppointments(validData);
      localStorage.setItem(`mediconnect_appointments_${patientId}`, JSON.stringify(validData));
    } catch (_err) {
      // Fallback to user-isolated cached data if offline
      const cached = localStorage.getItem(`mediconnect_appointments_${patientId}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) setAppointments(parsed);
        } catch (_) {}
      }
    }
  }, [user.id, user.isLoggedIn, clerkUser?.id, isClerkSignedIn, getToken]);

  // Reset & re-load appointments whenever patient identity changes or logs out
  useEffect(() => {
    const activePatientId = user.id || clerkUser?.id;
    if (!activePatientId || (!user.isLoggedIn && !isClerkSignedIn)) {
      setAppointments([]);
    } else {
      // Preload user's own cached appointments if present to avoid flicker
      const cached = localStorage.getItem(`mediconnect_appointments_${activePatientId}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) setAppointments(parsed);
        } catch (_) {}
      } else {
        setAppointments([]);
      }
      loadPatientAppointments();
    }
  }, [user.id, user.isLoggedIn, clerkUser?.id, isClerkSignedIn, loadPatientAppointments]);

  // -- Load doctor appointments from MySQL whenever loggedInDoctor changes --
  useEffect(() => {
    if (loggedInDoctor?.id) {
      fetchDoctorAppointments(loggedInDoctor.id).then(data => {
        setDoctorAppointments(data || []);
      });
    }
  }, [loggedInDoctor?.id]);

  // -- Sync user-isolated appointments to localStorage ------------------------
  useEffect(() => {
    const activePatientId = user.id || clerkUser?.id;
    if (activePatientId && (user.isLoggedIn || isClerkSignedIn)) {
      localStorage.setItem(`mediconnect_appointments_${activePatientId}`, JSON.stringify(appointments));
    }
  }, [appointments, user.id, clerkUser?.id, user.isLoggedIn, isClerkSignedIn]);

  useEffect(() => {
    localStorage.setItem('mediconnect_user', JSON.stringify(user));
  }, [user]);

  // -- Modals & Navigation State ---------------------------------------------
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

  // Unified Auth Modal state (replaces separate auth modals for navbar entry point)
  const [isUnifiedAuthOpen, setIsUnifiedAuthOpen] = useState(false);
  const [unifiedAuthRole, setUnifiedAuthRole] = useState<AuthRole>('patient');
  const [unifiedAuthMode, setUnifiedAuthMode] = useState<AuthMode>('signin');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-sync appointments when patient dashboard opens or every 3 seconds while open
  useEffect(() => {
    if (!isDashboardOpen) return;
    loadPatientAppointments();
    const interval = setInterval(() => {
      loadPatientAppointments();
    }, 3000);
    return () => clearInterval(interval);
  }, [isDashboardOpen, loadPatientAppointments]);

  // Real-time synchronization via Server-Sent Events (SSE) for patient appointments
  useEffect(() => {
    const activePatientId = user.id || clerkUser?.id;
    if (!activePatientId || (!user.isLoggedIn && !isClerkSignedIn)) return;

    const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`${API_BASE_URL}/appointments/events?patientId=${encodeURIComponent(activePatientId)}`);
      
      eventSource.addEventListener('appointment_update', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.action === 'appointment_completed' || data.action === 'appointment_updated') {
            loadPatientAppointments();
          }
        } catch (_) {
          loadPatientAppointments();
        }
      });

      eventSource.onerror = () => {
        // SSE connection dropped; 3s auto-poll when dashboard is open acts as robust fallback
      };
    } catch (_) {}

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [user.id, clerkUser?.id, user.isLoggedIn, isClerkSignedIn, loadPatientAppointments]);

  // -- Helpers ---------------------------------------------------------------
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

  // -- Patient Handlers ------------------------------------------------------
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
      setUnifiedAuthRole('patient');
      setUnifiedAuthMode('signin');
      setIsUnifiedAuthOpen(true);
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
      setUnifiedAuthRole('patient');
      setUnifiedAuthMode('signin');
      setIsUnifiedAuthOpen(true);
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
    setIsUnifiedAuthOpen(false);
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
    if (loggedInDoctor && loggedInDoctor.id === newAppointment.doctorId) {
      setDoctorAppointments(prev => [newAppointment, ...prev]);
    }
    loadPatientAppointments();
    showToast(`Appointment confirmed with ${newAppointment.doctorName}! Payment recorded.`);
  };

  const handleCancelAppointment = async (id: string) => {
    setAppointments(prev =>
      prev.map(a => a.id === id ? { ...a, status: 'cancelled' as const } : a)
    );
    let token: string | null = null;
    try { token = await getToken(); } catch (_) {}
    const patientId = user.id || clerkUser?.id;
    await cancelAppointmentInDB(id, undefined, token || undefined, patientId);
    showToast('Appointment successfully cancelled. ₹ Refund initiated.');
  };

  const handleRescheduleAppointment = async (id: string, newDate: string, newTime: string) => {
    let displayDate = newDate;
    if (/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      const parts = newDate.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      displayDate = d.toLocaleDateString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata'
      });
    }

    const formattedTime = formatTimeSlotRange(newTime, 30);

    setAppointments(prev =>
      prev.map(a => a.id === id ? { ...a, date: displayDate, timeSlot: formattedTime } : a)
    );
    let token: string | null = null;
    try { token = await getToken(); } catch (_) {}
    const patientId = user.id || clerkUser?.id;
    try {
      await rescheduleAppointmentInDB(id, newDate, newTime, token || undefined, patientId);
      await loadPatientAppointments();
      showToast('Appointment rescheduled with 30-minute slot!');
    } catch (err: any) {
      await loadPatientAppointments();
      showToast(err?.message || 'Could not reschedule appointment. Please select another slot.');
    }
  };

  const handleDeleteCancelledAppointment = async (id: string) => {
    let token: string | null = null;
    try { token = await getToken(); } catch (_) {}
    const patientId = user.id || clerkUser?.id;
    try {
      await deleteCancelledAppointmentInDB(id, token || undefined, patientId);
      setAppointments(prev => prev.filter(a => a.id !== id));
      showToast('Cancelled appointment record dismissed.');
    } catch (err: any) {
      showToast(err?.message || 'Could not dismiss appointment record.');
    }
  };

  const handleViewReceipt = (appt: Appointment) => {
    setActiveReceiptAppointment(appt);
  };

  // -- Doctor Portal Handlers ------------------------------------------------
  const handleOpenDoctorPortal = async () => {
    if (loggedInDoctor) {
      setIsDoctorPortalOpen(true);
      return;
    }

    const currentUserId = clerkUser?.id || (user.isLoggedIn ? user.id : null);
    if (currentUserId) {
      // Check if user already has a doctor profile in MySQL database
      try {
        let token = '';
        try { if (getToken) token = (await getToken()) || ''; } catch (_) {}
        const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
        const docRes = await fetch(`${API_BASE_URL}/doctors/profile/by-user/${currentUserId}`, {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            'x-user-id': currentUserId,
            'x-user-role': 'doctor'
          }
        });
        const docBody = await docRes.json();
        if (docRes.ok && docBody.success && docBody.data) {
          handleDoctorLoginSuccess(docBody.data as DoctorAuthData);
          return;
        }
      } catch (_) {}
    }

    // Open Doctor Auth modal to sign in or complete doctor registration
    setUnifiedAuthRole('doctor');
    setUnifiedAuthMode(currentUserId ? 'signup' : 'signin');
    setIsUnifiedAuthOpen(true);
  };

  const handleDoctorLoginSuccess = async (doctorData: DoctorAuthData) => {
    setUser({ name: 'Guest Patient', phone: '', email: '', isLoggedIn: false });
    setLoggedInAdmin(null);
    setIsDashboardOpen(false);
    setIsAdminPortalOpen(false);

    setLoggedInDoctor(doctorData);
    setIsDoctorPortalOpen(true);
    setIsDoctorAuthModalOpen(false);
    setIsUnifiedAuthOpen(false);
    showToast(`Welcome, ${doctorData.name}! Doctor Portal active.`);
  };

  const handleDoctorLogout = async () => {
    try {
      await clerkSignOut();
    } catch (_) {}
    setLoggedInDoctor(null);
    setIsDoctorPortalOpen(false);
    localStorage.removeItem('mediconnect_user');
    localStorage.removeItem('mediconnect_appointments');
    setAppointments([]);
    setUser({ name: 'Guest Patient', phone: '', email: '', isLoggedIn: false });
    showToast('Signed out of Doctor Portal.');
  };

  // -- Admin Portal Handlers -------------------------------------------------
  const handleOpenAdminPortal = () => {
    if (user.isLoggedIn && !loggedInAdmin) {
      showToast('You are currently signed in as a Patient. Please sign out of your patient account to access the Admin Portal.');
      setIsDashboardOpen(true);
      return;
    }
    if (loggedInAdmin) {
      setIsAdminPortalOpen(true);
    } else {
      setUnifiedAuthRole('admin');
      setUnifiedAuthMode('signin');
      setIsUnifiedAuthOpen(true);
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
    setIsUnifiedAuthOpen(false);
    showToast(`Welcome, ${admin.name}! Admin Portal active.`);
  };

  const handleAdminLogout = async () => {
    setLoggedInAdmin(null);
    setIsAdminPortalOpen(false);
    showToast('Signed out of Admin Portal.');
  };

  const savedDoctorsList = useMemo(() => {
    const list = doctors.filter(d => savedDoctorIds.includes(d.id));
    const missingIds = savedDoctorIds.filter(id => !list.some(d => d.id === id));
    if (missingIds.length > 0) {
      const fromInitial = INITIAL_DOCTORS.filter(d => missingIds.includes(d.id));
      return [...list, ...fromInitial];
    }
    return list;
  }, [doctors, savedDoctorIds]);

  // -- Admin Portal full-page view -------------------------------------------
  if (isAdminPortalOpen && loggedInAdmin) {
    return (
      <AdminPortalView
        admin={loggedInAdmin}
        onBackToMainSite={() => setIsAdminPortalOpen(false)}
        onAdminLogout={handleAdminLogout}
      />
    );
  }

  // -- Doctor Portal full-page view ------------------------------------------
  if (isDoctorPortalOpen && loggedInDoctor) {
    return (
      <DoctorPortalErrorBoundary onReset={() => {
        setLoggedInDoctor(null);
        setIsDoctorPortalOpen(false);
      }}>
        <DoctorPortalView
          doctor={loggedInDoctor}
          schedule={doctorSchedule}
          appointments={doctorAppointments}
          onUpdateDoctor={setLoggedInDoctor}
          onUpdateSchedule={setDoctorSchedule}
          onUpdateAppointments={(updated) => {
            setDoctorAppointments(updated);
            setAppointments(prev => prev.map(p => {
              const match = updated.find(u => u.id === p.id);
              return match ? { ...p, ...match } : p;
            }));
          }}
          onBackToPatientSite={() => setIsDoctorPortalOpen(false)}
          onDoctorLogout={handleDoctorLogout}
        />
      </DoctorPortalErrorBoundary>
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
        onOpenAuth={(tab = 'signin', role = 'patient') => {
          setUnifiedAuthRole(role);
          setUnifiedAuthMode(tab);
          setAuthCustomMessage(null);
          setIsUnifiedAuthOpen(true);
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
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
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
        onOpenDoctorPortal={handleOpenDoctorPortal}
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
          userId={clerkUser?.id || (user.isLoggedIn ? (user as any).id : undefined)}
        />
      )}

      {/* 2. Doctor Detailed Profile Modal */}
      {!!activeDoctorForProfile && (
        <DoctorPortalErrorBoundary onReset={() => setActiveDoctorForProfile(null)}>
          <DoctorProfileModal
            doctor={activeDoctorForProfile}
            isOpen={!!activeDoctorForProfile}
            onClose={() => setActiveDoctorForProfile(null)}
            onProceedToBooking={handleProceedToBookingFromProfile}
            savedDoctorIds={savedDoctorIds}
            onToggleSaveDoctor={handleToggleSaveDoctor}
          />
        </DoctorPortalErrorBoundary>
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
          onToggleSaveDoctor={handleToggleSaveDoctor}
          onCancelAppointment={handleCancelAppointment}
          onRescheduleAppointment={handleRescheduleAppointment}
          onDeleteCancelledAppointment={handleDeleteCancelledAppointment}
          onViewReceipt={handleViewReceipt}
          onBookDoctorAgain={handleDirectBook}
          onRefreshAppointments={loadPatientAppointments}
          onLogout={async () => {
            const activeId = user.id || clerkUser?.id;
            try {
              await clerkSignOut();
            } catch (_) {}
            setUser({ name: 'Guest Patient', phone: '', email: '', isLoggedIn: false });
            setAppointments([]);
            setSavedDoctorIds([]);
            localStorage.removeItem('mediconnect_appointments');
            if (activeId) {
              localStorage.removeItem(`mediconnect_appointments_${activeId}`);
            }
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

      {/* 8. Admin Auth Modal (kept for backward compat / direct calls) */}
      {isAdminAuthModalOpen && (
        <AdminAuthModal
          isOpen={isAdminAuthModalOpen}
          onClose={() => setIsAdminAuthModalOpen(false)}
          onAdminLoginSuccess={handleAdminLoginSuccess}
        />
      )}

      {/* 9. Unified Auth Modal — primary entry point for all roles via Navbar */}
      {isUnifiedAuthOpen && (
        <UnifiedAuthModal
          isOpen={isUnifiedAuthOpen}
          onClose={() => {
            setIsUnifiedAuthOpen(false);
            setAuthCustomMessage(null);
          }}
          initialRole={unifiedAuthRole}
          initialMode={unifiedAuthMode}
          customMessage={authCustomMessage}
          onRoleChange={(role) => setUnifiedAuthRole(role)}
          onPatientLoginSuccess={handlePatientLoginSuccess}
          onDoctorLoginSuccess={handleDoctorLoginSuccess}
          onAdminLoginSuccess={handleAdminLoginSuccess}
        />
      )}

      {/* 9. Floating MediNest AI Health Assistant Action Button */}
      <button
        type="button"
        onClick={() => setIsSymptomCheckerOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-[#0C182B] hover:bg-[#162D50] text-white p-3.5 sm:px-5 sm:py-3.5 rounded-full shadow-2xl border border-teal-500/40 hover:border-teal-400 transition-all flex items-center gap-2.5 group cursor-pointer hover:scale-105 active:scale-95"
        title="Consult MediNest AI Assistant"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
        </span>
        <span className="hidden sm:inline font-bold text-xs tracking-wide">
          MediNest AI Assistant
        </span>
      </button>
    </div>
  );
}
