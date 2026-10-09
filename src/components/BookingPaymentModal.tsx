import { formatINR } from '../lib/formatCurrency';
import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Download,
  Lock,
  Video,
  Building2,
  Check,
  Clock,
  User,
  Mail,
  AlertCircle,
} from 'lucide-react';
import { Doctor, ConsultationType, Appointment, UserProfile } from '../types';
import { DoctorAvatar } from './DoctorAvatar';
import { computeSlotEndTime } from '../lib/appointments';
import {
  loadRazorpayScript,
  createRazorpayOrder,
  openRazorpayCheckout,
  verifyRazorpayPayment,
  buildAppointmentPayload,
  resolveDate,
  parseTimeStr,
} from '../lib/razorpay';
import { generateReceiptPDF } from '../lib/receipts';

interface BookingPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: Doctor | null;
  consultationType: ConsultationType;
  selectedDate: string;
  selectedTimeSlot: string;
  user: UserProfile;
  onBookingSuccess: (appointment: Appointment) => void;
  onViewReceipt: (appointment: Appointment) => void;
  onManageAppointments: () => void;
}

export const BookingPaymentModal: React.FC<BookingPaymentModalProps> = ({
  isOpen,
  onClose,
  doctor,
  consultationType,
  selectedDate,
  selectedTimeSlot,
  user,
  onBookingSuccess,
  onViewReceipt,
  onManageAppointments
}) => {
  if (!isOpen || !doctor) return null;

  const [step, setStep] = useState<'patient' | 'payment' | 'confirmation'>('patient');

  // Patient Info State
  const [patientType, setPatientType] = useState<'self' | 'someone-else'>('self');
  const [patientName, setPatientName] = useState(user.isLoggedIn ? user.name : '');
  const [patientAge, setPatientAge] = useState<string>('28');
  const [patientGender, setPatientGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [patientPhone, setPatientPhone] = useState(user.isLoggedIn ? user.phone : '');
  const [patientEmail, setPatientEmail] = useState(user.isLoggedIn ? user.email : '');
  const [visitReason, setVisitReason] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Razorpay state
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  // Confirmed Appointment state
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);

  // Price calculations in INR strictly
  const feeINR = doctor.feeINR;
  const platformFeeINR = 0; // Promotional {formatINR(0)}
  const taxesINR = 0; // Inclusive
  const totalINR = feeINR + platformFeeINR + taxesINR;

  // Pre-load Razorpay checkout script as soon as the modal opens
  useEffect(() => {
    loadRazorpayScript().then(setRazorpayLoaded);
  }, []);

  const validatePatientDetails = () => {
    const errs: Record<string, string> = {};
    if (!patientName.trim()) errs.name = 'Patient name is required';
    if (!patientAge || Number(patientAge) <= 0) errs.age = 'Valid age is required';
    if (!patientPhone.trim() || patientPhone.replace(/\D/g, '').length < 10) {
      errs.phone = 'Valid 10-digit Indian mobile number is required';
    }
    if (!patientEmail.trim() || !patientEmail.includes('@')) {
      errs.email = 'Valid email is required for confirmation';
    }
    if (!agreeTerms) {
      errs.terms = 'Please accept patient consent to proceed';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleProceedToPayment = () => {
    if (validatePatientDetails()) {
      setPaymentError(null);
      setStep('payment');
    }
  };

  // Close on Escape key (confirmation step excluded to prevent accidents)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'confirmation') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, onClose]);

  /** Compute time slot parts */
  const getSlotTimes = () => {
    const timeParts = selectedTimeSlot.split('–').map(s => s.trim());
    const startTime = timeParts[0] || selectedTimeSlot;
    const endTime = timeParts[1] && timeParts[1] !== '05:00 PM'
      ? timeParts[1]
      : computeSlotEndTime(startTime, 30);
    return { startTime, endTime };
  };

  /** Build a local Appointment object for display (before DB write) */
  const buildLocalAppointment = (apptId: string, razorpayPaymentId: string): Appointment => {
    const { startTime, endTime } = getSlotTimes();
    const createdAt = new Date().toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
    });
    return {
      id: apptId,
      doctorId: doctor.id,
      doctorName: doctor.name,
      doctorSpecialty: doctor.specialty,
      doctorPhoto: doctor.photo,
      clinicName: doctor.clinicName,
      clinicAddress: doctor.address,
      city: doctor.city,
      appointmentType: consultationType,
      date: selectedDate,
      timeSlot: `${startTime} – ${endTime}`,
      patientName,
      patientAge: Number(patientAge),
      patientGender,
      patientPhone: patientPhone.startsWith('+91') ? patientPhone : `+91 ${patientPhone}`,
      patientEmail,
      visitReason: visitReason || 'Routine consultation',
      feeINR,
      platformFeeINR,
      taxesINR,
      totalINR,
      status: 'upcoming',
      paymentMethod: 'Razorpay',
      paymentTransactionId: razorpayPaymentId,
      createdAt,
      videoLink: consultationType === 'video'
        ? `https://meet.google.com/medinest-${Math.random().toString(36).substring(2, 6)}`
        : undefined,
    };
  };

  /**
   * Main Razorpay checkout flow:
   * 1. Create server-side order (holds slot for 10 min)
   * 2. Open Razorpay popup
   * 3. On success → verify signature server-side → confirm appointment + lock slot
   */
  const handleOpenRazorpayCheckout = async () => {
    setPaymentError(null);
    setIsProcessingPayment(true);

    try {
      const apptId = `AGC-APT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 89999)}`;
      const { startTime } = getSlotTimes();

      // Compute standard slot ISO datetime for concurrency checks and slot holds
      const dateObj = resolveDate(selectedDate);
      const { h, m } = parseTimeStr(startTime);
      const startDT = new Date(dateObj);
      startDT.setHours(h, m, 0, 0);
      const slotIsoDatetime = startDT.toISOString();

      // Step 1: Create Razorpay order via Express backend
      const order = await createRazorpayOrder(
        totalINR,
        apptId,
        doctor.id,
        slotIsoDatetime,
      );

      setIsProcessingPayment(false);

      // Step 2: Open Razorpay popup
      openRazorpayCheckout(
        order,
        {
          name:    patientName,
          email:   patientEmail,
          contact: patientPhone.replace(/\D/g, '').slice(-10),
        },
        apptId,
        // ── On successful payment ─────────────────────────────────────────
        async (paymentResult) => {
          setIsProcessingPayment(true);
          setPaymentError(null);
          try {
            // Step 3: Verify signature server-side → save appointment in DB
            const { startTime: st, endTime: et } = getSlotTimes();
            const localAppt = buildLocalAppointment(apptId, paymentResult.razorpay_payment_id);

            // Build DB payload for the Edge Function
            const dbPayload = buildAppointmentPayload(
              {
                doctorId: doctor.id,
                doctorName: doctor.name,
                doctorSpecialty: doctor.specialty,
                doctorPhoto: doctor.photo,
                clinicName: doctor.clinicName,
                clinicAddress: doctor.address,
                city: doctor.city,
                consultationType,
                date: selectedDate,
                timeSlot: st,
                timeSlotEnd: et,
                patientId: user.isLoggedIn ? user.id : undefined,
                patientName,
                patientAge: Number(patientAge),
                patientGender,
                patientPhone,
                patientEmail,
                visitReason: visitReason || 'Routine consultation',
                feeINR,
                platformFeeINR,
                taxesINR,
                totalINR,
                paymentMethod: 'Razorpay' as any,
                paymentTransactionId: paymentResult.razorpay_payment_id,
                videoLink: localAppt.videoLink,
              },
              apptId,
            );

            await verifyRazorpayPayment(paymentResult, dbPayload);

            // Payment verified ✓ — show confirmation
            setConfirmedAppointment(localAppt);
            onBookingSuccess(localAppt);
            setStep('confirmation');
          } catch (verifyErr: any) {
            setPaymentError(verifyErr?.message ?? 'Payment verification failed. Please contact support.');
          } finally {
            setIsProcessingPayment(false);
          }
        },
        // ── On failure / cancel ───────────────────────────────────────────
        (errorMsg) => {
          setPaymentError(errorMsg);
          setIsProcessingPayment(false);
        },
      );
    } catch (err: any) {
      setPaymentError(err?.message ?? 'Failed to initialize payment. Please try again.');
      setIsProcessingPayment(false);
    }
  };

  const downloadCalendarICS = () => {
    if (!confirmedAppointment) return;
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MediConnect India//Appointment Booking//EN
BEGIN:VEVENT
SUMMARY:Doctor Appointment: ${confirmedAppointment.doctorName} (${confirmedAppointment.doctorSpecialty})
DESCRIPTION:Consultation with ${confirmedAppointment.doctorName} at ${confirmedAppointment.clinicName}. Mode: ${confirmedAppointment.appointmentType === 'video' ? 'HD Video Call' : 'Clinic Visit'}. Booking ID: ${confirmedAppointment.id}
DTSTART:${new Date().toISOString().replace(/-|:|\.\d+/g, '')}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `appointment-${confirmedAppointment.id}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[calc(100vh-32px)] overflow-hidden my-4">
        {/* Modal Header */}
        <div className="bg-[#0C182B] text-white p-6 relative flex-shrink-0">
          {/* Close X — always visible; on confirmation step it navigates to My Appointments */}
          <button
            onClick={() => {
              if (step === 'confirmation') {
                onClose();
                onManageAppointments();
              } else {
                onClose();
              }
            }}
            className="absolute top-5 right-5 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            aria-label={step === 'confirmation' ? 'Close confirmation' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Lock className="w-3.5 h-3.5" />
            256-Bit Encrypted Healthcare Checkout
          </div>

          <h2 className="text-xl sm:text-2xl font-display font-medium text-white">
            {step === 'patient' && 'Patient Details & Appointment'}
            {step === 'payment' && 'Review & Indian Payment Gateway'}
            {step === 'confirmation' && 'Booking Confirmed!'}
          </h2>

          <p className="text-xs text-slate-300 mt-0.5">
            {doctor.name} • {doctor.specialty} • {selectedDate} at {selectedTimeSlot}
          </p>

          {/* Stepper Indicator */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800 text-xs font-bold">
            <div className={`flex items-center gap-1.5 ${step === 'patient' ? 'text-teal-400' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'patient' ? 'bg-teal-500 text-slate-950' : 'bg-slate-700 text-white'}`}>1</span>
              <span>Patient Info</span>
            </div>
            <div className="w-8 h-px bg-slate-700"></div>
            <div className={`flex items-center gap-1.5 ${step === 'payment' ? 'text-teal-400' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'payment' ? 'bg-teal-500 text-slate-950' : 'bg-slate-700 text-white'}`}>2</span>
              <span>Payment (INR)</span>
            </div>
            <div className="w-8 h-px bg-slate-700"></div>
            <div className={`flex items-center gap-1.5 ${step === 'confirmation' ? 'text-teal-400' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'confirmation' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-white'}`}>3</span>
              <span>Confirmation</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 flex-1 overflow-y-auto space-y-6">
          {/* STEP 1: PATIENT DETAILS */}
          {step === 'patient' && (
            <div className="space-y-5">
              {/* Doctor & Slot Mini Summary */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <DoctorAvatar
                    photo={doctor.photo}
                    name={doctor.name}
                    className="w-12 h-12 rounded-xl border border-slate-200"
                    imgClassName="w-full h-full object-cover object-top"
                    theme="light"
                  />
                  <div>
                    <div className="text-xs font-bold text-[#0C182B]">{doctor.name}</div>
                    <div className="text-[11px] text-teal-700 font-semibold">{doctor.specialty}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      {consultationType === 'video' ? <Video className="w-3 h-3 text-teal-600" /> : <Building2 className="w-3 h-3 text-teal-600" />}
                      {consultationType === 'video' ? 'HD Video Consultation' : `In-Clinic at ${doctor.city}`}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-medium">Slot</span>
                  <span className="text-xs font-bold text-[#0C182B] block">{selectedTimeSlot}</span>
                  <span className="text-[11px] text-slate-500">{selectedDate.split(',')[0]}</span>
                </div>
              </div>

              {/* Patient Booking For Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Who is this consultation for?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPatientType('self')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      patientType === 'self'
                        ? 'bg-[#0C182B] text-white border-[#0C182B]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Myself
                  </button>
                  <button
                    type="button"
                    onClick={() => setPatientType('someone-else')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      patientType === 'someone-else'
                        ? 'bg-[#0C182B] text-white border-[#0C182B]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Family Member / Dependent
                  </button>
                </div>
              </div>

              {/* Patient Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Patient Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-600"
                  />
                </div>
                {formErrors.name && <p className="text-[11px] text-rose-500 mt-1">{formErrors.name}</p>}
              </div>

              {/* Age & Gender */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Age (Years) *
                  </label>
                  <input
                    type="number"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    placeholder="e.g. 28"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-600"
                  />
                  {formErrors.age && <p className="text-[11px] text-rose-500 mt-1">{formErrors.age}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Gender *
                  </label>
                  <select
                    value={patientGender}
                    onChange={(e: any) => setPatientGender(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:border-teal-600 cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Mobile Phone (Indian +91) & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mobile Number (For SMS & WhatsApp) *
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs font-bold text-slate-500">+91</span>
                    <input
                      type="tel"
                      value={patientPhone.replace('+91', '').trim()}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full pl-12 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-600"
                    />
                  </div>
                  {formErrors.phone && <p className="text-[11px] text-rose-500 mt-1">{formErrors.phone}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Address (For Invoice & Prescription) *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      value={patientEmail}
                      onChange={(e) => setPatientEmail(e.target.value)}
                      placeholder="name@gmail.com"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-600"
                    />
                  </div>
                  {formErrors.email && <p className="text-[11px] text-rose-500 mt-1">{formErrors.email}</p>}
                </div>
              </div>

              {/* Reason for visit */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Reason for Visit / Main Symptoms
                </label>
                <textarea
                  value={visitReason}
                  onChange={(e) => setVisitReason(e.target.value)}
                  placeholder="e.g. Mild throat pain and cough for past 3 days, seeking doctor's prescription."
                  rows={2}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-600"
                />
              </div>

              {/* Medical Privacy & Consent */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                  />
                  <span>
                    I confirm the patient information is accurate and consent to teleconsultation / clinic guidelines under Indian Medical Council (NMC) regulations.
                  </span>
                </label>
                {formErrors.terms && <p className="text-[11px] text-rose-500 mt-1">{formErrors.terms}</p>}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProceedToPayment}
                  className="px-6 py-2.5 rounded-xl bg-[#032F31] hover:bg-[#074245] text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  Proceed to Payment ({formatINR(totalINR)})
                  <ArrowRight className="w-3.5 h-3.5 text-[#FAE58D]" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PRICE SUMMARY + RAZORPAY PAYMENT */}
          {step === 'payment' && (
            <div className="space-y-6">
              {/* Itemized INR Price Breakdown */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Appointment Summary
                  </h3>
                  <span className="text-xs font-bold text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded-md">
                    {consultationType === 'video' ? 'Video Consult' : 'Clinic Visit'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Doctor Consultation Fee</span>
                    <span className="font-bold text-slate-900">{formatINR(feeINR)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Platform Booking Convenience Fee</span>
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                      FREE ({formatINR(0)} Promo)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Applicable GST (18%)</span>
                    <span className="text-slate-500 font-medium">Included</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-[#0C182B]">Total Payable Amount</span>
                  <span className="text-xl font-bold font-display text-[#0C182B]">
                    {formatINR(totalINR)}
                  </span>
                </div>
              </div>

              {/* Razorpay Security Badge */}
              <div className="p-4 rounded-2xl bg-[#F4EFE2] border border-[#E2DCCE] flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#032F31] flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-5 h-5 text-[#FAE58D]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#032F31]">Pay securely with Razorpay</p>
                    <p className="text-[11px] text-[#526368] mt-0.5">
                      UPI · RuPay · Visa · Mastercard · Net Banking · Wallets
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  {['256-bit SSL', 'PCI-DSS Compliant', 'RBI Licensed', 'Auto-refund on failure'].map(badge => (
                    <span key={badge} className="px-2 py-0.5 rounded-full bg-white border border-[#D5CDBC] text-[#526368] font-medium">
                      {badge}
                    </span>
                  ))}
                </div>
              </div>

              {/* Error banner */}
              {paymentError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Payment issue</p>
                    <p>{paymentError}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => { setPaymentError(null); setStep('patient'); }}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  type="button"
                  onClick={handleOpenRazorpayCheckout}
                  disabled={isProcessingPayment || !razorpayLoaded}
                  className="px-7 py-3 rounded-xl bg-[#032F31] hover:bg-[#074245] disabled:opacity-60 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-98"
                >
                  {isProcessingPayment ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#FAE58D] border-t-transparent rounded-full animate-spin" />
                      {paymentError ? 'Retrying...' : 'Opening payment...'}
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-[#FAE58D]" />
                      Pay {formatINR(totalINR)} with Razorpay
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CONFIRMATION SCREEN */}
          {step === 'confirmation' && confirmedAppointment && (
            <div className="text-center py-4 space-y-6">
              {/* Animated Success Badge */}
              <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center mx-auto shadow-lg animate-bounce">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Payment Successful • Slot Reserved
                </span>
                <h3 className="text-2xl sm:text-3xl font-display font-medium text-[#0C182B]">
                  Appointment Confirmed!
                </h3>
                <p className="text-xs text-slate-500">
                  Confirmation SMS and email receipt have been dispatched to {confirmedAppointment.patientPhone}.
                </p>
              </div>

              {/* Confirmation Details Card */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 text-left space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Booking Reference ID</span>
                    <span className="text-sm font-mono font-extrabold text-[#0C182B]">{confirmedAppointment.id}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Amount Paid (INR)</span>
                    <span className="text-base font-bold text-emerald-700">{formatINR(confirmedAppointment.totalINR)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Doctor</span>
                    <strong className="text-slate-800">{confirmedAppointment.doctorName}</strong>
                    <span className="text-slate-500 block text-[11px]">{confirmedAppointment.doctorSpecialty}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Date & Time</span>
                    <strong className="text-slate-800">{confirmedAppointment.timeSlot}</strong>
                    <span className="text-slate-500 block text-[11px]">{confirmedAppointment.date}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Patient</span>
                    <strong className="text-slate-800">{confirmedAppointment.patientName}</strong>
                    <span className="text-slate-500 block text-[11px]">{confirmedAppointment.patientGender}, {confirmedAppointment.patientAge} yrs</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Consultation Mode</span>
                    <strong className="text-slate-800 capitalize">
                      {confirmedAppointment.appointmentType === 'video' ? 'Video Call (Meet link sent)' : 'In-Clinic Visit'}
                    </strong>
                    <span className="text-slate-500 block text-[11px]">{confirmedAppointment.city}</span>
                  </div>
                </div>

                {confirmedAppointment.appointmentType === 'video' && confirmedAppointment.videoLink && (
                  <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-teal-900 font-semibold">
                      <Video className="w-4 h-4 text-teal-700" />
                      <span>Video Consultation Room Ready</span>
                    </div>
                    <a
                      href={confirmedAppointment.videoLink}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 rounded-lg bg-teal-700 text-white font-bold text-[11px] hover:bg-teal-800"
                    >
                      Test Camera / Join
                    </a>
                  </div>
                )}
              </div>

              {/* Three Mandatory Action Buttons: Download Receipt, Add to Calendar, Manage Appointment */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onViewReceipt(confirmedAppointment)}
                  className="py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                  Download Receipt
                </button>

                <button
                  type="button"
                  onClick={downloadCalendarICS}
                  className="py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Calendar className="w-4 h-4 text-slate-600" />
                  Add to Calendar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onManageAppointments();
                  }}
                  className="py-3 px-4 rounded-xl bg-[#032F31] hover:bg-[#074245] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-[#FAE58D]" />
                  Manage Appointment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
