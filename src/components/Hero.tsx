import React from 'react';
import { 
  Search, 
  MapPin, 
  Video, 
  Building2, 
  Sparkles, 
  ShieldCheck, 
  Star, 
  Calendar,
  CheckCircle2,
  Users,
  ArrowRight
} from 'lucide-react';
import { SPECIALTIES, INDIAN_CITIES } from '../data/specialtiesData';
import { ConsultationType } from '../types';

interface HeroProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  selectedSpecialty: string;
  onSpecialtyChange: (val: string) => void;
  selectedCity: string;
  onCityChange: (val: string) => void;
  consultationTypeFilter: 'all' | ConsultationType;
  onConsultationTypeChange: (val: 'all' | ConsultationType) => void;
  onSearchSubmit: () => void;
  onOpenSymptomChecker: () => void;
  onBookNowClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  searchTerm,
  onSearchChange,
  selectedSpecialty,
  onSpecialtyChange,
  selectedCity,
  onCityChange,
  consultationTypeFilter,
  onConsultationTypeChange,
  onSearchSubmit,
  onOpenSymptomChecker,
  onBookNowClick
}) => {
  return (
    <section id="hero" className="py-6 sm:py-8 lg:py-12 bg-[#FAF7EE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Editorial Dark-Teal Rounded Card from Screenshot 1 */}
        <div className="rounded-[32px] sm:rounded-[40px] bg-[#032F31] text-white p-6 sm:p-10 lg:p-16 relative overflow-hidden shadow-xl">
          {/* Subtle warm architectural glow in background */}
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[#FAE58D]/10 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl pointer-events-none"></div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center relative z-10">
            {/* Left Text & CTA Column */}
            <div className="lg:col-span-7 space-y-6 sm:space-y-8">
              {/* Pill badge: 50k+ Happy Patients */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#084042] border border-[#185F62] text-xs font-semibold text-[#FAE58D]">
                <Star className="w-3.5 h-3.5 fill-[#FAE58D]" />
                <span>50k+ Happy Patients in India</span>
              </div>

              {/* Exact Editorial Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-white leading-[1.15]">
                Simple access <br />
                to care, <br />
                <span className="text-[#FAE58D] font-normal italic">anytime, anywhere</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-200 max-w-xl font-normal leading-relaxed">
                Search by specialty, location, or symptoms and choose the right doctor with confidence. See real-time availability and transparent fees in ₹ INR.
              </p>

              {/* Action Buttons matching screenshot */}
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <button
                  onClick={onBookNowClick}
                  className="px-7 py-3.5 rounded-full bg-[#FAE58D] hover:bg-[#fae17b] text-[#032F31] text-sm font-semibold tracking-tight shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-[#032F31]" />
                  Book Appointment
                </button>

                <button
                  onClick={onOpenSymptomChecker}
                  className="px-6 py-3.5 rounded-full bg-[#083D3F] hover:bg-[#0E494B] border border-[#165659] text-white text-sm font-semibold tracking-tight transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#FAE58D]" />
                  Try Symptom Checker
                </button>
              </div>

              {/* Micro-trust line */}
              <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#FAE58D]" />
                  Zero Convenience Fees
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#FAE58D]" />
                  100% Refundable Cancellations
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#FAE58D]" />
                  NMC Verified Specialists
                </span>
              </div>
            </div>

            {/* Right Doctor Visual Column */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Doctor Visual Card with Doctor Photo */}
                <div className="relative rounded-[28px] overflow-hidden shadow-2xl bg-[#022122] aspect-[4/4.9] flex flex-col items-center justify-end border border-teal-700/50 p-5 sm:p-6 group">
                  {/* Doctor Photograph */}
                  <img
                    src="/doctor_auth.jpg"
                    alt="Senior Consulting Physician"
                    className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/doctor_hero.jpg';
                    }}
                  />

                  {/* Gradient overlays to blend into card and keep badge text legible */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#022122] via-[#022122]/35 to-transparent pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-transparent pointer-events-none" />

                  {/* Verified Medical Network Credential Badge */}
                  <div className="relative z-10 w-full p-4 rounded-2xl bg-[#FAF7EE]/95 backdrop-blur-md text-[#032F31] flex items-center justify-between shadow-xl border border-[#DDD6C5]">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-amber-600 mb-0.5">
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <span className="text-xs font-bold text-[#032F31]">4.9 / 5.0</span>
                        <span className="text-[10px] text-slate-500 font-medium">(250K+ consultations)</span>
                      </div>
                      <div className="text-sm font-bold text-[#032F31] tracking-tight">Registered Medical Network</div>
                      <div className="text-[11px] text-[#526368] font-medium">15,000+ NMC Verified Doctors Across India</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-[#032F31] flex items-center justify-center text-[#FAE58D] font-bold shrink-0 shadow-sm">
                      <ShieldCheck className="w-5 h-5 text-[#FAE58D]" />
                    </div>
                  </div>
                </div>

                {/* Floating pill: 15,000+ Doctors */}
                <div className="absolute -top-3 -left-3 bg-[#FAF7EE] text-[#032F31] px-4 py-2 rounded-2xl shadow-lg border border-[#DDD6C5] flex items-center gap-2.5 z-20">
                  <Users className="w-4 h-4 text-[#032F31]" />
                  <span className="text-xs font-bold">15,000+ Verified Doctors in India</span>
                </div>
              </div>
            </div>
          </div>

          {/* Integrated Search Bar inside Hero */}
          <div className="mt-10 sm:mt-14 pt-8 border-t border-[#0e484a]">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 text-xs text-slate-200 font-medium">
                <span className="w-2 h-2 rounded-full bg-[#FAE58D]"></span>
                <span>Find & Book an Appointment Instantly:</span>
              </div>
              
              {/* Consultation Type Selector */}
              <div className="flex items-center gap-1 p-1 bg-[#022122] rounded-xl border border-[#0d4447] text-xs">
                <button
                  type="button"
                  onClick={() => onConsultationTypeChange('all')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    consultationTypeFilter === 'all'
                      ? 'bg-[#FAE58D] text-[#032F31] font-bold shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  All Modes
                </button>
                <button
                  type="button"
                  onClick={() => onConsultationTypeChange('clinic')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    consultationTypeFilter === 'clinic'
                      ? 'bg-[#FAE58D] text-[#032F31] font-bold shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Clinic Visit
                </button>
                <button
                  type="button"
                  onClick={() => onConsultationTypeChange('video')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    consultationTypeFilter === 'video'
                      ? 'bg-[#FAE58D] text-[#032F31] font-bold shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  Video Consultation
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
              {/* Doctor or Symptom Input */}
              <div className="lg:col-span-4 relative">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Health Concern or Doctor
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="e.g. skin rash, chest ache, Dr. Sharma"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[#022122] border border-[#0d4447] text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#FAE58D] transition-colors"
                  />
                </div>
              </div>

              {/* Specialty Dropdown */}
              <div className="lg:col-span-3">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Medical Specialty
                </label>
                <select
                  value={selectedSpecialty}
                  onChange={(e) => onSpecialtyChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#022122] border border-[#0d4447] text-xs sm:text-sm text-white focus:outline-none focus:border-[#FAE58D] transition-colors cursor-pointer"
                >
                  <option value="all">All Specialties (10+)</option>
                  {SPECIALTIES.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* City Dropdown */}
              <div className="lg:col-span-3">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  City in India
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={selectedCity}
                    onChange={(e) => onCityChange(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[#022122] border border-[#0d4447] text-xs sm:text-sm text-white focus:outline-none focus:border-[#FAE58D] transition-colors cursor-pointer"
                  >
                    {INDIAN_CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="lg:col-span-2 flex items-end">
                <button
                  type="button"
                  onClick={onSearchSubmit}
                  className="w-full py-2.5 rounded-xl bg-[#FAE58D] hover:bg-[#fae17b] text-[#032F31] font-bold text-xs sm:text-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span>Search</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
