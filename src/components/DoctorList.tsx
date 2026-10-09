import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  MapPin, 
  Star, 
  ShieldCheck, 
  Clock, 
  Building2, 
  Video, 
  Calendar, 
  RotateCcw,
  SlidersHorizontal,
  ArrowRight
} from 'lucide-react';
import { Doctor, ConsultationType } from '../types';
import { SPECIALTIES, INDIAN_CITIES } from '../data/specialtiesData';
import { DoctorAvatar } from './DoctorAvatar';

interface DoctorListProps {
  doctors: Doctor[];
  selectedSpecialty: string;
  onSpecialtyChange: (specialtyId: string) => void;
  selectedCity: string;
  onCityChange: (city: string) => void;
  consultationTypeFilter: 'all' | ConsultationType;
  onConsultationTypeChange: (mode: 'all' | ConsultationType) => void;
  onViewProfile: (doctor: Doctor) => void;
  onBookAppointment: (doctor: Doctor) => void;
}

export const DoctorList: React.FC<DoctorListProps> = ({
  doctors,
  selectedSpecialty,
  onSpecialtyChange,
  selectedCity,
  onCityChange,
  consultationTypeFilter,
  onConsultationTypeChange,
  onViewProfile,
  onBookAppointment
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [selectedGender, setSelectedGender] = useState<'all' | 'male' | 'female'>('all');
  const [selectedExperience, setSelectedExperience] = useState<number>(0);
  const [availableTodayOnly, setAvailableTodayOnly] = useState(false);
  const [maxFeeINR, setMaxFeeINR] = useState<number>(2000);
  const [sortBy, setSortBy] = useState<'recommended' | 'rating' | 'fee-asc' | 'fee-desc' | 'experience'>('recommended');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Available languages from data
  const allLanguages = useMemo(() => {
    const set = new Set<string>();
    doctors.forEach(d => d.languages.forEach(l => set.add(l)));
    return Array.from(set);
  }, [doctors]);

  // Filtering Logic
  const filteredDoctors = useMemo(() => {
    const isDefaultState = selectedSpecialty === "all" && selectedCity === "All Cities" && consultationTypeFilter === "all" && selectedLanguage === "all" && selectedGender === "all" && selectedExperience === 0 && !availableTodayOnly && maxFeeINR === 2000 && !searchQuery.trim();
    
    return doctors.filter(doc => {
      if (isDefaultState) {
        return doc.isFeatured;
      }
      if (selectedSpecialty !== "all" && doc.specialtyId !== selectedSpecialty) return false;
      if (selectedCity !== "All Cities" && doc.city !== selectedCity) return false;
      if (consultationTypeFilter !== "all" && !doc.consultationModes.includes(consultationTypeFilter)) return false;
      if (selectedLanguage !== "all" && !doc.languages.includes(selectedLanguage)) return false;
      if (selectedGender !== "all" && doc.gender !== selectedGender) return false;
      if (doc.experienceYears < selectedExperience) return false;
      if (availableTodayOnly && !doc.availableToday) return false;
      if (doc.feeINR > maxFeeINR) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = doc.name.toLowerCase().includes(q);
        const matchSpecialty = doc.specialty.toLowerCase().includes(q);
        const matchHospital = doc.clinicName.toLowerCase().includes(q);
        const matchCity = doc.city.toLowerCase().includes(q);
        const matchAbout = doc.about.toLowerCase().includes(q);
        if (!matchName && !matchSpecialty && !matchHospital && !matchCity && !matchAbout) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'fee-asc') return a.feeINR - b.feeINR;
      if (sortBy === 'fee-desc') return b.feeINR - a.feeINR;
      if (sortBy === 'experience') return b.experienceYears - a.experienceYears;
      return 0; // recommended order
    });
  }, [
    doctors,
    selectedSpecialty,
    selectedCity,
    consultationTypeFilter,
    selectedLanguage,
    selectedGender,
    selectedExperience,
    availableTodayOnly,
    maxFeeINR,
    searchQuery,
    sortBy
  ]);

  const resetAllFilters = () => {
    onSpecialtyChange('all');
    onCityChange('All Cities');
    onConsultationTypeChange('all');
    setSelectedLanguage('all');
    setSelectedGender('all');
    setSelectedExperience(0);
    setAvailableTodayOnly(false);
    setMaxFeeINR(2000);
    setSearchQuery('');
    setSortBy('recommended');
  };

  return (
    <section id="doctors-section" className="py-16 md:py-24 bg-[#FAF7EE] border-t border-[#E8E2D5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#D5CDBC] bg-[#F4EFE2] text-xs font-semibold text-[#032F31] uppercase tracking-wider mb-2">
              Verified Doctors
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-[#032F31] leading-tight">
              Specialist Profiles & Availability
            </h2>
            <p className="text-sm sm:text-base text-[#526368] mt-1">
              Showing {filteredDoctors.length} NMC-verified medical specialists ready for consultation across India.
            </p>
          </div>

          {/* Quick controls: Sort & Mobile Filter Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="lg:hidden px-4 py-2.5 rounded-xl bg-[#F4EFE2] border border-[#D5CDBC] text-xs font-bold text-[#032F31] flex items-center gap-2"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
            </button>

            <div className="flex items-center gap-2 bg-[#F4EFE2] px-3.5 py-2.5 rounded-2xl border border-[#D5CDBC]">
              <span className="text-xs text-[#526368] font-medium">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                aria-label="Sort Doctors By"
                className="bg-transparent text-xs font-bold text-[#032F31] focus:outline-none cursor-pointer"
              >
                <option value="recommended">Recommended</option>
                <option value="rating">Highest Rated (4.9+)</option>
                <option value="fee-asc">Fee: Low to High (â‚¹)</option>
                <option value="fee-desc">Fee: High to Low (â‚¹)</option>
                <option value="experience">Experience (Years)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Grid: Filters Sidebar + Doctor Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Filters Sidebar */}
          <div
            className={`lg:col-span-4 xl:col-span-3 space-y-6 ${
              mobileFilterOpen ? 'block' : 'hidden lg:block'
            }`}
          >
            <div className="p-6 rounded-[28px] bg-[#F4EFE2] border border-[#E2DCCE] space-y-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-[#E2DCCE]">
                <div className="flex items-center gap-2 font-bold text-[#032F31] text-sm">
                  <Filter className="w-4 h-4 text-[#032F31]" />
                  Filter Specialists
                </div>
                <button
                  onClick={resetAllFilters}
                  className="text-xs font-semibold text-[#526368] hover:text-[#032F31] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              </div>

              {/* Search keyword */}
              <div>
                <label className="block text-[11px] font-bold text-[#032F31] uppercase tracking-wider mb-2">
                  Doctor or Clinic Name
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#70848B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search doctor, hospital, or specialty..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-[#D5CDBC] text-[#032F31] placeholder-[#70848B] focus:outline-none focus:border-[#032F31]"
                  />
                </div>
              </div>

              {/* Specialty Filter */}
              <div>
                <label className="block text-[11px] font-bold text-[#032F31] uppercase tracking-wider mb-2">
                  Specialty
                </label>
                <select
                  value={selectedSpecialty}
                  onChange={(e) => onSpecialtyChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D5CDBC] focus:outline-none focus:border-[#032F31] bg-white font-medium text-[#032F31] cursor-pointer"
                >
                  <option value="all">All Specialties ({SPECIALTIES.length})</option>
                  {SPECIALTIES.map(sp => (
                    <option key={sp.id} value={sp.id}>{sp.name}</option>
                  ))}
                </select>
              </div>

              {/* City Filter */}
              <div>
                <label className="block text-[11px] font-bold text-[#032F31] uppercase tracking-wider mb-2">
                  City
                </label>
                <select
                  value={selectedCity}
                  onChange={(e) => onCityChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D5CDBC] focus:outline-none focus:border-[#032F31] bg-white font-medium text-[#032F31] cursor-pointer"
                >
                  {INDIAN_CITIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Consultation Type */}
              <div>
                <label className="block text-[11px] font-bold text-[#032F31] uppercase tracking-wider mb-2">
                  Consultation Mode
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#E8E2D5] rounded-xl">
                  <button
                    type="button"
                    onClick={() => onConsultationTypeChange('all')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      consultationTypeFilter === 'all'
                        ? 'bg-[#032F31] text-white shadow-xs'
                        : 'text-[#032F31] hover:text-black'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => onConsultationTypeChange('clinic')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      consultationTypeFilter === 'clinic'
                        ? 'bg-[#032F31] text-white shadow-xs'
                        : 'text-[#032F31] hover:text-black'
                    }`}
                  >
                    <Building2 className="w-3 h-3" /> Clinic
                  </button>
                  <button
                    type="button"
                    onClick={() => onConsultationTypeChange('video')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      consultationTypeFilter === 'video'
                        ? 'bg-[#032F31] text-white shadow-xs'
                        : 'text-[#032F31] hover:text-black'
                    }`}
                  >
                    <Video className="w-3 h-3" /> Video
                  </button>
                </div>
              </div>

              {/* Availability Filter */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={availableTodayOnly}
                    onChange={(e) => setAvailableTodayOnly(e.target.checked)}
                    className="w-4 h-4 text-[#032F31] rounded border-[#D5CDBC] focus:ring-[#032F31]"
                  />
                  <span className="text-xs font-semibold text-[#032F31]">
                    Available Today Only
                  </span>
                </label>
              </div>

              {/* Experience Filter */}
              <div>
                <label className="block text-[11px] font-bold text-[#032F31] uppercase tracking-wider mb-2">
                  Experience: {selectedExperience > 0 ? `${selectedExperience}+ Years` : 'Any Experience'}
                </label>
                <div className="flex gap-1.5">
                  {[0, 5, 10, 15].map((exp) => (
                    <button
                      key={exp}
                      type="button"
                      onClick={() => setSelectedExperience(exp)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        selectedExperience === exp
                          ? 'bg-[#032F31] text-[#FAE58D] border-[#032F31]'
                          : 'bg-white text-[#526368] border-[#D5CDBC] hover:bg-[#EAE5D8]'
                      }`}
                    >
                      {exp === 0 ? 'Any' : `${exp}+y`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Languages Filter */}
              <div>
                <label className="block text-[11px] font-bold text-[#032F31] uppercase tracking-wider mb-2">
                  Doctor Speaks
                </label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D5CDBC] focus:outline-none focus:border-[#032F31] bg-white font-medium text-[#032F31] cursor-pointer"
                >
                  <option value="all">All Languages</option>
                  {allLanguages.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              {/* Fee Range Slider (INR Only) */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[#032F31] uppercase tracking-wider mb-2">
                  <span>Max Fee (â‚¹ INR)</span>
                  <span className="text-[#032F31] font-extrabold text-sm">â‚¹{maxFeeINR}</span>
                </div>
                <input
                  type="range"
                  min={499}
                  max={2000}
                  step={100}
                  value={maxFeeINR}
                  onChange={(e) => setMaxFeeINR(Number(e.target.value))}
                  className="w-full accent-[#032F31] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#526368] mt-1">
                  <span>â‚¹499</span>
                  <span>â‚¹1,200</span>
                  <span>â‚¹2,000</span>
                </div>
              </div>
            </div>
          </div>

          {/* Doctor Cards List */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-4">
            {filteredDoctors.length > 0 ? (
              filteredDoctors.map((doctor: Doctor) => {
                return (
                  <div
                    key={doctor.id}
                    className="p-5 sm:p-6 rounded-[28px] bg-[#F4EFE2] border border-[#E2DCCE] hover:border-[#032F31] hover:shadow-md transition-all duration-300 group flex flex-col sm:flex-row gap-5 justify-between"
                  >
                    {/* Left: Doctor Photo & Core Details */}
                    <div className="flex gap-4 sm:gap-5">
                      {/* Doctor Photo or Drawing Avatar Fallback */}
                      <div className="relative shrink-0">
                        <DoctorAvatar
                          photo={doctor.photo}
                          name={doctor.name}
                          className="w-20 h-24 sm:w-28 sm:h-32 rounded-2xl border border-[#D5CDBC] shadow-xs"
                          imgClassName="w-full h-full object-cover object-top"
                          theme="light"
                        />
                        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full bg-[#FAF7EE] border border-[#D5CDBC] shadow-xs text-[10px] font-bold text-[#032F31] flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                          {doctor.rating}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 
                            onClick={() => onViewProfile(doctor)}
                            className="text-base sm:text-lg font-bold text-[#032F31] hover:underline cursor-pointer transition-colors"
                          >
                            {doctor.name}
                          </h3>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#032F31] bg-[#FAF7EE] px-2.5 py-0.5 rounded-full border border-[#D5CDBC]">
                            <ShieldCheck className="w-3 h-3 text-teal-700" /> NMC Verified
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-[#032F31]">
                          {doctor.specialty} â€¢ {doctor.experienceYears} Years Exp
                        </p>

                        <p className="text-xs text-[#526368] font-medium">
                          {doctor.qualifications}
                        </p>

                        {/* Clinic & City */}
                        <div className="flex items-center gap-1 text-xs text-[#526368] pt-0.5">
                          <Building2 className="w-3.5 h-3.5 text-[#526368] shrink-0" />
                          <span className="truncate max-w-[240px] sm:max-w-xs">{doctor.clinicName}</span>
                          <span>â€¢</span>
                          <span className="font-semibold text-[#032F31]">{doctor.city}</span>
                        </div>

                        {/* Languages */}
                        <div className="text-[11px] text-[#70848B] pt-0.5">
                          Speaks: <span className="text-[#032F31] font-medium">{doctor.languages.join(', ')}</span>
                        </div>

                        {/* Availability Pill */}
                        <div className="pt-1.5">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#032F31] bg-[#FAF7EE] px-3 py-1 rounded-full border border-[#D5CDBC]">
                            <Clock className="w-3 h-3 text-teal-700" />
                            Next Slot: {doctor.nextAvailableSlot}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Fees in INR & Action Buttons */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-4 sm:pt-0 sm:pl-5 sm:border-l sm:border-[#E2DCCE] shrink-0 gap-3">
                      <div className="text-left sm:text-right">
                        <span className="text-[11px] text-[#526368] block font-medium">Consultation Fee</span>
                        <div className="text-2xl font-bold text-[#032F31]">
                          â‚¹{doctor.feeINR}
                        </div>
                        <span className="text-[10px] text-teal-700 font-semibold block">
                          Fixed â‚¹ INR price
                        </span>
                      </div>

                      <div className="flex flex-col sm:w-36 gap-2">
                        <button
                          onClick={() => onBookAppointment(doctor)}
                          className="w-full py-2.5 px-4 rounded-xl bg-[#032F31] hover:bg-[#074245] text-white text-xs font-bold tracking-tight shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                        >
                          <Calendar className="w-3.5 h-3.5 text-[#FAE58D]" />
                          <span>Book Slot</span>
                        </button>

                        <button
                          onClick={() => onViewProfile(doctor)}
                          className="w-full py-2 px-3 rounded-xl bg-[#FAF7EE] hover:bg-white text-[#032F31] border border-[#D5CDBC] text-xs font-semibold transition-all text-center cursor-pointer"
                        >
                          View Profile
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              /* Empty State */
              <div className="p-12 text-center bg-[#F4EFE2] rounded-[28px] border border-dashed border-[#D5CDBC] space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#FAF7EE] border border-[#D5CDBC] flex items-center justify-center mx-auto text-[#032F31]">
                  <Search className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-[#032F31]">No doctors match your filter criteria</h3>
                <p className="text-xs text-[#526368] max-w-md mx-auto">
                  We couldn't find verified doctors with the selected combination. Try clearing some filters or switch to Video Consultation mode for all-India specialists.
                </p>
                <button
                  onClick={resetAllFilters}
                  className="px-6 py-2.5 rounded-full bg-[#032F31] text-[#FAE58D] text-xs font-bold cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

