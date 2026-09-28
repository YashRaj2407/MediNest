import React, { useState } from 'react';
import { 
  Stethoscope, 
  Sparkles, 
  Heart, 
  Brain, 
  Baby, 
  Smile, 
  Bone, 
  Headphones, 
  Eye,
  HeartPulse,
  ArrowRight,
  ChevronDown,
  Calendar
} from 'lucide-react';
import { SPECIALTIES } from '../data/specialtiesData';
import { Specialty } from '../types';

interface SpecialtyGridProps {
  onSelectSpecialty: (specialtyId: string) => void;
  selectedSpecialtyId: string;
}

export const SpecialtyGrid: React.FC<SpecialtyGridProps> = ({
  onSelectSpecialty,
  selectedSpecialtyId
}) => {
  const [showAllSpecialties, setShowAllSpecialties] = useState(false);

  // Top 4 featured services corresponding to Screenshot 2 layout
  const primaryCare = SPECIALTIES.find(s => s.id === 'general-physician') || SPECIALTIES[0];
  const cardiology = SPECIALTIES.find(s => s.id === 'cardiologist') || SPECIALTIES[6];
  const dermatology = SPECIALTIES.find(s => s.id === 'dermatologist') || SPECIALTIES[1];
  const mentalHealth = SPECIALTIES.find(s => s.id === 'psychiatrist') || SPECIALTIES[8];

  const remainingSpecialties = SPECIALTIES.filter(
    s => ![primaryCare.id, cardiology.id, dermatology.id, mentalHealth.id].includes(s.id)
  );

  return (
    <section id="services-section" className="py-12 sm:py-16 bg-[#FAF7EE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Dark Teal Rounded Section from Screenshot 2 */}
        <div className="rounded-[32px] sm:rounded-[40px] bg-[#032F31] text-white p-6 sm:p-10 lg:p-16 relative overflow-hidden shadow-xl">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14 space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#084042] border border-[#185F62] text-xs font-semibold text-[#FAE58D] uppercase tracking-wider">
              Services
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-white leading-tight">
              Comprehensive care, <br className="hidden sm:inline" />
              all in one place
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
              Healthcare center offers diverse medical specialties, from routine check-ups to advanced clinical treatments.
            </p>
          </div>

          {/* 5-Column layout matching Screenshot 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
            {/* Left 2 Cards Column */}
            <div className="lg:col-span-4 flex flex-col justify-between gap-5">
              {/* Card 1: Primary Care */}
              <div 
                onClick={() => onSelectSpecialty(primaryCare.id)}
                className={`p-6 sm:p-7 rounded-[26px] bg-[#FAF7EE] text-[#032F31] cursor-pointer hover:shadow-lg transition-all duration-300 flex flex-col justify-between border-2 ${
                  selectedSpecialtyId === primaryCare.id ? 'border-[#FAE58D] shadow-md ring-2 ring-[#FAE58D]/30' : 'border-transparent'
                }`}
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#032F31] text-[#FAE58D] flex items-center justify-center mb-5 shadow-xs">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-[#032F31] mb-2 tracking-tight">
                    Primary Care
                  </h3>
                  <p className="text-xs text-[#526368] leading-relaxed mb-4">
                    Your first stop for everyday health needs, preventive check-ups, seasonal infections, and ongoing wellness care.
                  </p>
                </div>
                <div className="pt-3 border-t border-[#E2DDD0] flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#032F31]">From ₹{primaryCare.startingFeeINR}</span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#032F31] group-hover:translate-x-0.5 transition-transform">
                    Book Doctor <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              {/* Card 2: Cardiology */}
              <div 
                onClick={() => onSelectSpecialty(cardiology.id)}
                className={`p-6 sm:p-7 rounded-[26px] bg-[#FAF7EE] text-[#032F31] cursor-pointer hover:shadow-lg transition-all duration-300 flex flex-col justify-between border-2 ${
                  selectedSpecialtyId === cardiology.id ? 'border-[#FAE58D] shadow-md ring-2 ring-[#FAE58D]/30' : 'border-transparent'
                }`}
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#032F31] text-[#FAE58D] flex items-center justify-center mb-5 shadow-xs">
                    <Heart className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-[#032F31] mb-2 tracking-tight">
                    Cardiology
                  </h3>
                  <p className="text-xs text-[#526368] leading-relaxed mb-4">
                    Expert heart care, from blood pressure control and ECG diagnosis to advanced treatment for cardiovascular conditions.
                  </p>
                </div>
                <div className="pt-3 border-t border-[#E2DDD0] flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#032F31]">From ₹{cardiology.startingFeeINR}</span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#032F31]">
                    Book Doctor <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>

            {/* Center Column: Tall Doctor Photography from Screenshot 2 */}
            <div className="lg:col-span-4 relative rounded-[28px] overflow-hidden min-h-[380px] lg:min-h-full flex items-end shadow-2xl border border-teal-800/40">
              <img
                src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=800"
                alt="Doctor in consultation room"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#032F31]/95 via-[#032F31]/30 to-transparent"></div>

              {/* Bottom Badge in Center Image */}
              <div className="relative z-10 p-6 text-white w-full">
                <div className="inline-block px-3 py-1 rounded-full bg-[#FAE58D] text-[#032F31] text-[11px] font-bold mb-2">
                  Top Medical Faculty
                </div>
                <h4 className="text-xl font-bold tracking-tight text-white mb-1">
                  AIIMS & Apollo Certified Specialists
                </h4>
                <p className="text-xs text-slate-200 leading-relaxed mb-3">
                  Consult with India's most respected medical practitioners online or at affiliated clinics.
                </p>
                <button
                  onClick={() => onSelectSpecialty('all')}
                  className="w-full py-2.5 rounded-full bg-white hover:bg-[#FAE58D] text-[#032F31] text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>View All Specialists</span>
                </button>
              </div>
            </div>

            {/* Right 2 Cards Column */}
            <div className="lg:col-span-4 flex flex-col justify-between gap-5">
              {/* Card 3: Dermatology */}
              <div 
                onClick={() => onSelectSpecialty(dermatology.id)}
                className={`p-6 sm:p-7 rounded-[26px] bg-[#FAF7EE] text-[#032F31] cursor-pointer hover:shadow-lg transition-all duration-300 flex flex-col justify-between border-2 ${
                  selectedSpecialtyId === dermatology.id ? 'border-[#FAE58D] shadow-md ring-2 ring-[#FAE58D]/30' : 'border-transparent'
                }`}
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#032F31] text-[#FAE58D] flex items-center justify-center mb-5 shadow-xs">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-[#032F31] mb-2 tracking-tight">
                    Dermatology
                  </h3>
                  <p className="text-xs text-[#526368] leading-relaxed mb-4">
                    Advanced clinical skin care for acne, eczema, psoriasis, hair fall treatments, and personalized dermatological solutions.
                  </p>
                </div>
                <div className="pt-3 border-t border-[#E2DDD0] flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#032F31]">From ₹{dermatology.startingFeeINR}</span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#032F31]">
                    Book Doctor <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              {/* Card 4: Mental Health */}
              <div 
                onClick={() => onSelectSpecialty(mentalHealth.id)}
                className={`p-6 sm:p-7 rounded-[26px] bg-[#FAF7EE] text-[#032F31] cursor-pointer hover:shadow-lg transition-all duration-300 flex flex-col justify-between border-2 ${
                  selectedSpecialtyId === mentalHealth.id ? 'border-[#FAE58D] shadow-md ring-2 ring-[#FAE58D]/30' : 'border-transparent'
                }`}
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#032F31] text-[#FAE58D] flex items-center justify-center mb-5 shadow-xs">
                    <Brain className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-[#032F31] mb-2 tracking-tight">
                    Mental Health
                  </h3>
                  <p className="text-xs text-[#526368] leading-relaxed mb-4">
                    Supportive clinical therapy and psychiatric counseling for emotional well-being, stress, anxiety, and mental clarity.
                  </p>
                </div>
                <div className="pt-3 border-t border-[#E2DDD0] flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#032F31]">From ₹{mentalHealth.startingFeeINR}</span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#032F31]">
                    Book Doctor <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Expandable All Specialties Drawer */}
          <div className="mt-10 pt-8 border-t border-[#0e484a]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">
                Need another specialty? Browse our full clinical network:
              </span>
              <button
                onClick={() => setShowAllSpecialties(!showAllSpecialties)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#084042] hover:bg-[#0d4f52] text-white text-xs font-semibold transition-all cursor-pointer"
              >
                <span>{showAllSpecialties ? 'Collapse Specialties' : 'Explore All 10 Specialties'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllSpecialties ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {showAllSpecialties && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-4 border-t border-[#0e484a]/60">
                {remainingSpecialties.map((item: Specialty) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectSpecialty(item.id)}
                    className="p-3.5 rounded-2xl bg-[#FAF7EE] text-[#032F31] hover:bg-white cursor-pointer transition-all hover:scale-102 flex flex-col justify-between shadow-xs"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#032F31]">{item.name}</div>
                      <div className="text-[10px] text-[#526368] line-clamp-1 mt-0.5">{item.description}</div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-[#E2DDD0] flex items-center justify-between text-[11px] font-bold">
                      <span>₹{item.startingFeeINR}</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
