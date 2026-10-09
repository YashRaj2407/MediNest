import React, { useState, useEffect } from 'react';
import { 
  X, 
  Star, 
  ShieldCheck, 
  MapPin, 
  Video, 
  Building2, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Languages, 
  Award, 
  FileText, 
  AlertCircle,
  Share2,
  Bookmark,
  RefreshCw
} from 'lucide-react';
import { Doctor, ConsultationType } from '../types';
import { DoctorAvatar } from './DoctorAvatar';
import { generateSlots, TimeSlot } from '../lib/slots';


interface DoctorProfileModalProps {
  doctor: Doctor | null;
  isOpen: boolean;
  onClose: () => void;
  onProceedToBooking: (
    doctor: Doctor, 
    consultationType: ConsultationType, 
    date: string, 
    timeSlot: string
  ) => void;
}

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const DoctorProfileModal: React.FC<DoctorProfileModalProps> = ({
  doctor,
  isOpen,
  onClose,
  onProceedToBooking
}) => {
  // ── ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURN ──────────────────────
  const [consultationMode, setConsultationMode] = useState<ConsultationType>('video');
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState('10:30 AM');
  const [slotsList, setSlotsList] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'clinic'>('overview');
  const [isSaved, setIsSaved] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [slotAlert, setSlotAlert] = useState<string | null>(null);

  // Generate next 7 days for booking calendar — memoized so it doesn't change on every render
  const nextDays = React.useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = d.getDate();
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    return {
      weekday,
      dateStr: `${dayNum} ${month}`,
      fullDateString: `${weekday}, ${dayNum} ${month}`,
      dayName: weekday,
      isoString: d.toISOString().split('T')[0]
    };
  }), []); // computed once per component mount

  const fetchFreshSlots = React.useCallback((silent = false) => {
    if (!doctor) return;
    if (!silent) setLoadingSlots(true);
    setIsRefreshing(true);
    const chosenIsoDate = nextDays[selectedDateIndex]?.isoString || new Date().toISOString().split('T')[0];
    generateSlots(doctor.id, chosenIsoDate).then((generated) => {
      setSlotsList(generated);

      // Check if previously selected slot has become unavailable
      if (selectedSlot) {
        const match = generated.find(s => s.time === selectedSlot);
        if (match && match.status !== 'available') {
          setSelectedSlot('');
          setSlotAlert('This slot is no longer available. Please select another time.');
          setTimeout(() => setSlotAlert(null), 6000);
        }
      }

      // Auto-select first available slot if none selected
      if (!selectedSlot) {
        const avail = generated.find(s => s.status === 'available');
        if (avail) {
          setSelectedSlot(avail.time);
        }
      }
    }).finally(() => {
      setLoadingSlots(false);
      setIsRefreshing(false);
    });
  }, [doctor, selectedDateIndex, nextDays, selectedSlot]);

  // Load slots when doctor or selected date changes
  useEffect(() => {
    if (!doctor) return;
    fetchFreshSlots(false);
  }, [doctor?.id, selectedDateIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time synchronization via Server-Sent Events (SSE)
  useEffect(() => {
    if (!doctor?.id || !isOpen) return;

    const sseUrl = `${API_BASE_URL}/slots/events?doctorId=${encodeURIComponent(doctor.id)}`;
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(sseUrl);

      eventSource.addEventListener('schedule_update', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[SSE] Received schedule_update in DoctorProfileModal:', data);
          // Silently refresh slots without loading spinner flash
          fetchFreshSlots(true);
        } catch (err) {
          console.error('[SSE Parse Error]:', err);
        }
      });

      eventSource.onerror = (err) => {
        console.warn('[SSE Connection Warning]: Connection dropped, will auto-reconnect.', err);
      };
    } catch (err) {
      console.error('[SSE Setup Error]:', err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [doctor?.id, isOpen, fetchFreshSlots]);

  // ── EARLY RETURN GUARD (after all hooks) ───────────────────────────────────
  if (!isOpen || !doctor) return null;

  const handleBook = () => {
    const chosenDate = nextDays[selectedDateIndex].fullDateString;
    onProceedToBooking(doctor, consultationMode, chosenDate, selectedSlot);
  };


  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-6">
        {/* Top Header Banner */}
        <div className="bg-[#032F31] text-white p-6 sm:p-8 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close Doctor Profile Modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            <div className="relative shrink-0">
              <DoctorAvatar
                photo={doctor.photo}
                name={doctor.name}
                className="w-24 h-28 sm:w-32 sm:h-36 rounded-2xl border-2 border-[#FAE58D] shadow-md"
                imgClassName="w-full h-full object-cover object-top"
                theme="dark"
              />
              <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-0.5 rounded-full bg-white text-[#032F31] text-xs font-bold shadow-xs flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                {doctor.rating} ({doctor.reviewCount})
              </span>
            </div>

            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-[#FAE58D] text-xs font-semibold border border-[#FAE58D]/30">
                  {doctor.specialty}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-emerald-300 font-semibold">
                  <ShieldCheck className="w-4 h-4" /> NMC Reg: {doctor.registrationNumber}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-white">
                {doctor.name}
              </h2>

              <p className="text-xs sm:text-sm text-slate-200">
                {doctor.qualifications} • <strong className="text-[#FAE58D]">{doctor.experienceYears} Years</strong> Clinical Experience
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-200 pt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-teal-400" />
                  {doctor.city}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Languages className="w-3.5 h-3.5 text-teal-400" />
                  {doctor.languages.join(', ')}
                </span>
              </div>
            </div>

            {/* Bookmark / Share buttons */}
            <div className="flex sm:flex-col gap-2 shrink-0">
              <button
                onClick={() => setIsSaved(!isSaved)}
                className={`p-2.5 rounded-xl border transition-colors flex items-center justify-center ${
                  isSaved 
                    ? 'bg-teal-500 border-teal-500 text-slate-950 font-bold' 
                    : 'border-slate-700 hover:bg-slate-800 text-slate-300'
                }`}
                title={isSaved ? 'Doctor Saved' : 'Save Doctor'}
              >
                <Bookmark className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 bg-slate-50 flex items-center gap-6 text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3.5 border-b-2 transition-all ${
              activeTab === 'overview'
                ? 'border-[#0C182B] text-[#0C182B]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Overview & Services
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`py-3.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'reviews'
                ? 'border-[#0C182B] text-[#0C182B]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Verified Patient Reviews
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">
              {doctor.reviews.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('clinic')}
            className={`py-3.5 border-b-2 transition-all ${
              activeTab === 'clinic'
                ? 'border-[#0C182B] text-[#0C182B]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Clinic Location
          </button>
        </div>

        {/* Modal Main Content: Split 2 columns */}
        <div className="p-6 sm:p-8 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Details / Reviews */}
            <div className="lg:col-span-7 space-y-6">
              {activeTab === 'overview' && (
                <>
                  {/* About Doctor */}
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-2">
                      About the Doctor
                    </h3>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {doctor.about}
                    </p>
                  </div>

                  {/* Services & Treatment Fees in INR */}
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
                      Services & Transparent Fees (INR)
                    </h3>
                    <div className="space-y-2">
                      {doctor.services.map((srv, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                        >
                          <span className="font-semibold text-slate-800">{srv.name}</span>
                          <span className="font-bold text-[#0C182B] bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                            ₹{srv.feeINR}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rescheduling & Cancellation Policy */}
                  <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 text-xs text-teal-950 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-teal-900">
                      <CheckCircle2 className="w-4 h-4 text-teal-600" />
                      Cancellation & Rescheduling Policy
                    </div>
                    <p className="text-slate-700 leading-relaxed">
                      Free cancellation and 100% instant refund up to 2 hours before the scheduled appointment time. You can also reschedule your slot anytime with a single click at zero additional cost.
                    </p>
                  </div>
                </>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-800">
                      Patient Feedback ({doctor.reviewCount} total ratings)
                    </h3>
                    <div className="flex items-center gap-1 text-sm font-bold text-slate-900">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-500" /> {doctor.rating} / 5.0
                    </div>
                  </div>

                  {doctor.reviews.map((rev) => (
                    <div key={rev.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">{rev.author}</span>
                            {rev.verified && (
                              <span className="text-[10px] font-semibold text-teal-700 bg-teal-100 px-1.5 py-0.2 rounded">
                                Verified Patient
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">{rev.city} • {rev.date}</span>
                        </div>
                        <div className="flex text-amber-400">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-current" />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed italic">
                        "{rev.comment}"
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'clinic' && (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <h3 className="text-sm font-bold text-[#0C182B] flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-teal-600" />
                      {doctor.clinicName}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {doctor.address}
                    </p>
                    <div className="pt-2 flex items-center gap-3">
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(doctor.clinicName + ' ' + doctor.address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-teal-700 hover:text-teal-900 underline flex items-center gap-1"
                      >
                        <MapPin className="w-3.5 h-3.5" /> Open in Google Maps
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Appointment Booking Calendar & Slot Picker */}
            <div className="lg:col-span-5 p-5 rounded-3xl bg-slate-50 border border-slate-200/90 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Select Consultation Mode
                </span>
                <span className="text-sm font-extrabold text-[#0C182B]">
                  ₹{doctor.feeINR}
                </span>
              </div>

              {/* Video vs In-Clinic Toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConsultationMode('video')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    consultationMode === 'video'
                      ? 'bg-white border-teal-600 shadow-sm ring-1 ring-teal-600'
                      : 'bg-slate-100/70 border-slate-200 text-slate-600 hover:bg-white'
                  }`}
                >
                  <Video className="w-4 h-4 text-teal-600 mb-1" />
                  <div className="text-xs font-bold text-[#0C182B]">Video Consult</div>
                  <div className="text-[10px] text-slate-500">HD call link via SMS</div>
                </button>

                <button
                  type="button"
                  onClick={() => setConsultationMode('clinic')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    consultationMode === 'clinic'
                      ? 'bg-white border-teal-600 shadow-sm ring-1 ring-teal-600'
                      : 'bg-slate-100/70 border-slate-200 text-slate-600 hover:bg-white'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-teal-600 mb-1" />
                  <div className="text-xs font-bold text-[#0C182B]">Clinic Visit</div>
                  <div className="text-[10px] text-slate-500">In-person at hospital</div>
                </button>
              </div>

              {/* Date Selector Carousel */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Choose Appointment Date
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
                  {nextDays.map((d, index) => {
                    const isSelected = selectedDateIndex === index;
                    return (
                      <button
                        key={d.isoString}
                        type="button"
                        onClick={() => setSelectedDateIndex(index)}
                        className={`flex-1 min-w-[72px] h-16 rounded-2xl flex flex-col items-center justify-center p-2 border text-center transition-all cursor-pointer shrink-0 snap-start ${
                          isSelected
                            ? 'bg-[#032F31] text-[#FAE58D] border-[#032F31] shadow-md font-bold ring-2 ring-[#FAE58D]'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-xs font-extrabold block leading-none">{d.weekday}</span>
                        <span className={`text-[11px] block mt-1 leading-none whitespace-nowrap ${isSelected ? 'text-[#FAE58D] font-semibold' : 'text-slate-500 font-medium'}`}>
                          {d.dateStr}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Select Slot (Asia/Kolkata IST)
                  </label>
                  <button
                    type="button"
                    onClick={fetchFreshSlots}
                    disabled={isRefreshing}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh Availability
                  </button>
                </div>

                {/* Status Legend */}
                <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-slate-600 py-1.5 border-b border-slate-200/80">
                  <span className="flex items-center gap-1 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Available
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#032F31]"></span> Selected
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Booked
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Doctor on Break
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span> Blocked / Leave
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span> Payment Pending
                  </span>
                </div>

                {slotAlert && (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{slotAlert}</span>
                  </div>
                )}

                {loadingSlots ? (
                  <div className="py-6 text-center text-xs text-slate-400 animate-pulse">
                    Loading real-time availability...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                    {slotsList.map((slot) => {
                      const isSelected = selectedSlot === slot.time;
                      const isAvailable = slot.status === 'available';
                      const isBreak = slot.status === 'break';
                      const isBooked = slot.status === 'booked';
                      const isBlocked = slot.status === 'blocked';

                      let btnStyle = 'bg-emerald-50/70 text-emerald-950 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-500';
                      if (isSelected) {
                        btnStyle = 'bg-[#032F31] text-[#FAE58D] border-[#032F31] shadow-md font-bold ring-2 ring-[#FAE58D]';
                      } else if (isBreak) {
                        btnStyle = 'bg-amber-50 text-amber-900 border-amber-300 cursor-not-allowed';
                      } else if (isBlocked && slot.label === 'Payment Pending') {
                        btnStyle = 'bg-yellow-50 text-yellow-900 border-yellow-300 cursor-not-allowed';
                      } else if (isBlocked) {
                        btnStyle = 'bg-rose-50 text-rose-900 border-rose-200 cursor-not-allowed';
                      } else if (isBooked || slot.status === 'expired') {
                        btnStyle = 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through';
                      }

                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!isAvailable && !isSelected}
                          onClick={() => setSelectedSlot(slot.time)}
                          className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-center flex flex-col items-center justify-center cursor-pointer ${btnStyle}`}
                        >
                          <span>{slot.time} – {slot.timeEnd}</span>
                          {isBreak && <span className="text-[9px] font-semibold text-amber-800 mt-0.5">Doctor on Break</span>}
                          {isBooked && <span className="text-[9px] font-semibold text-slate-400 mt-0.5">Already Booked</span>}
                          {isBlocked && slot.label && <span className="text-[9px] font-semibold text-rose-700 mt-0.5">{slot.label}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Book Action CTA */}
              <div className="pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleBook}
                  className="w-full py-3 px-4 rounded-xl bg-[#032F31] hover:bg-[#074245] text-white text-xs font-bold tracking-wide shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-[#FAE58D]" />
                  Proceed to Book ({nextDays[selectedDateIndex].fullDateString}, {selectedSlot})
                </button>
                <p className="text-[10px] text-center text-slate-400 mt-2">
                  100% Secure INR Checkout • Free Rescheduling
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
