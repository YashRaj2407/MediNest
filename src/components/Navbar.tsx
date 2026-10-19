import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  ShieldCheck, 
  User, 
  Calendar, 
  Search, 
  Sparkles, 
  Menu, 
  X,
  Stethoscope,
  Shield,
  ChevronDown,
  Info,
  HelpCircle,
  HeartHandshake
} from 'lucide-react';
import { INDIAN_CITIES } from '../data/specialtiesData';
import { UserProfile } from '../types';
import { MediNestLogo } from './MediNestLogo';

interface NavbarProps {
  selectedCity: string;
  onSelectCity: (city: string) => void;
  onOpenSymptomChecker: () => void;
  onOpenDashboard: () => void;
  onOpenAuth: (initialTab?: 'signin' | 'signup', initialRole?: 'patient' | 'doctor' | 'admin') => void;
  onOpenDoctorPortal: () => void;
  onOpenAdminPortal?: () => void;
  onNavigateToSection: (sectionId: string) => void;
  user: UserProfile;
  upcomingCount: number;
  isDoctorLoggedIn?: boolean;
  doctorName?: string;
  isAdminLoggedIn?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  selectedCity,
  onSelectCity,
  onOpenSymptomChecker,
  onOpenDashboard,
  onOpenAuth,
  onOpenDoctorPortal,
  onOpenAdminPortal,
  onNavigateToSection,
  user,
  upcomingCount,
  isDoctorLoggedIn = false,
  doctorName = 'Doctor',
  isAdminLoggedIn = false
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreDropdownRef = useRef<HTMLDivElement>(null);

  // Close More dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine primary Account button action and label when authenticated
  const handleAccountClick = () => {
    if (isDoctorLoggedIn) {
      onOpenDoctorPortal();
    } else if (isAdminLoggedIn && onOpenAdminPortal) {
      onOpenAdminPortal();
    } else if (user.isLoggedIn) {
      onOpenDashboard();
    } else {
      onOpenAuth('signin', 'patient');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#FAF7EE]/95 backdrop-blur-md border-b border-[#E8E3D7] transition-all box-border">
      {/* ── Emergency Helpline Top Banner ─────────────────────────────────── */}
      <div className="bg-[#032F31] text-slate-200 text-xs py-2 px-4 border-b border-[#0b4345] w-full box-border">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30 text-[11px] whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
              Emergency 24x7
            </span>
            <span className="hidden sm:inline text-slate-300 whitespace-nowrap">
              For acute life-threatening emergencies, dial:
            </span>
            <a 
              href="tel:112" 
              className="text-[#FAE58D] hover:underline font-bold flex items-center gap-1 whitespace-nowrap"
            >
              <Phone className="w-3 h-3" />
              112 / 108 (National Helpline)
            </a>
          </div>

          <div className="flex items-center gap-4 text-slate-300 text-[11px]">
            <span className="hidden md:inline-flex items-center gap-1 whitespace-nowrap">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-300" />
              NMC-Registered Doctors Only
            </span>
            <span className="text-slate-500 hidden sm:inline">|</span>
            <span className="text-[#FAE58D] font-medium whitespace-nowrap">100% INR Transparency (₹)</span>
          </div>
        </div>
      </div>

      {/* ── Main Navigation Bar ───────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full box-border">
        <div className="flex items-center justify-between h-20 gap-4 box-border">
          
          {/* 1. Left Section: Logo & Brand */}
          <div className="flex items-center shrink-0">
            <button 
              type="button"
              onClick={() => onNavigateToSection('hero')} 
              className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#032F31] flex items-center justify-center text-[#FAE58D] shadow-sm group-hover:scale-105 transition-transform p-2 shrink-0">
                <span className="flex items-center justify-center w-full h-full">
                  <MediNestLogo variant="gold" className="w-5 h-5" />
                </span>
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-[#032F31] font-display block leading-none whitespace-nowrap">
                  MediNest
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-teal-800/80 block mt-1 whitespace-nowrap">
                  Healthcare
                </span>
              </div>
            </button>
          </div>

          {/* 2. Center Section: Navigation Items */}
          <nav className="hidden md:flex items-center gap-5 lg:gap-7 text-xs lg:text-sm font-medium text-slate-700">
            {/* Find Doctors */}
            <button 
              type="button"
              onClick={() => onNavigateToSection('doctors-section')} 
              className="hover:text-[#032F31] transition-colors cursor-pointer py-1 font-semibold text-[#032F31] whitespace-nowrap"
            >
              Find Doctors
            </button>

            {/* How It Works (visible directly on large desktop screens) */}
            <button 
              type="button"
              onClick={() => onNavigateToSection('how-it-works')} 
              className="hidden lg:block hover:text-[#032F31] transition-colors cursor-pointer py-1 whitespace-nowrap"
            >
              How It Works
            </button>

            {/* More Dropdown */}
            <div className="relative" ref={moreDropdownRef}>
              <button
                type="button"
                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                className="hover:text-[#032F31] transition-colors cursor-pointer py-1 font-semibold flex items-center gap-1 whitespace-nowrap"
                aria-expanded={moreMenuOpen}
              >
                <span>More</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${moreMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {moreMenuOpen && (
                <div className="absolute top-full left-0 mt-2.5 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-2.5 z-50 animate-fadeIn space-y-1">
                  <button
                    type="button"
                    onClick={() => { onNavigateToSection('about-section'); setMoreMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-teal-50/70 hover:text-[#032F31] transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5 text-teal-700" />
                    <span>About MediNest</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { onNavigateToSection('how-it-works'); setMoreMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-teal-50/70 hover:text-[#032F31] transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <HeartHandshake className="w-3.5 h-3.5 text-teal-700" />
                    <span>How It Works</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { onNavigateToSection('specialties-section'); setMoreMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-teal-50/70 hover:text-[#032F31] transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                    <span>Clinical Specialties</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { onNavigateToSection('faq-section'); setMoreMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-teal-50/70 hover:text-[#032F31] transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-teal-700" />
                    <span>Frequently Asked Questions</span>
                  </button>
                </div>
              )}
            </div>

            {/* Symptom Checker */}
            <button 
              type="button"
              onClick={onOpenSymptomChecker}
              className="inline-flex items-center gap-1.5 text-[#032F31] hover:text-black font-semibold px-3 py-1.5 rounded-full bg-[#EAE4D4] hover:bg-[#DDD6C5] transition-all cursor-pointer text-xs whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-800" />
              <span>Symptom Checker</span>
            </button>
          </nav>

          {/* 3. Right Section: Unified Account Button + Book Now */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            {/* Unified Account Button */}
            {isDoctorLoggedIn ? (
              <button
                type="button"
                onClick={handleAccountClick}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold bg-[#032F31] text-[#FAE58D] hover:bg-[#074749] border border-teal-800 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                title="Doctor Portal"
              >
                <Stethoscope className="w-4 h-4 text-[#FAE58D]" />
                <span>Dr. {doctorName?.replace(/^Dr\.?\s*/i, '').split(' ')[0] || 'Doctor'}</span>
              </button>
            ) : isAdminLoggedIn ? (
              <button
                type="button"
                onClick={handleAccountClick}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 border border-amber-600 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                title="Administrator Portal"
              >
                <Shield className="w-4 h-4 text-slate-950" />
                <span>Admin Portal</span>
              </button>
            ) : user.isLoggedIn ? (
              <button
                type="button"
                onClick={handleAccountClick}
                className="relative inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-800 bg-[#FAF7EE] hover:bg-[#EAE5D8] rounded-full transition-colors cursor-pointer border border-[#DDD6C5] shadow-2xs whitespace-nowrap"
                title="Patient Dashboard & Appointments"
              >
                <User className="w-4 h-4 text-[#032F31]" />
                <span>{user.name.split(' ')[0]}</span>
                {upcomingCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#032F31] text-[#FAE58D] text-[9px] flex items-center justify-center font-bold">
                    {upcomingCount}
                  </span>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAccountClick}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold text-[#032F31] hover:text-black bg-[#FAF7EE] hover:bg-[#EAE5D8] border border-[#DDD6C5] shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                aria-label="Open Account Authentication"
              >
                <User className="w-4 h-4 text-[#032F31]" />
                <span>Account</span>
              </button>
            )}

            {/* Book Now Button */}
            <button
              type="button"
              onClick={() => onNavigateToSection('doctors-section')}
              className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-full bg-[#032F31] hover:bg-[#074749] text-white text-xs font-semibold tracking-wide shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Calendar className="w-3.5 h-3.5 text-[#FAE58D]" />
              <span>Book Now</span>
            </button>
          </div>

          {/* Mobile menu hamburger toggle */}
          <div className="flex md:hidden items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-800 hover:bg-[#EAE5D8] focus:outline-none cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Navigation Drawer ──────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-4 shadow-xl box-border animate-fadeIn">
          {/* City Filter */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <span className="text-xs font-medium text-slate-600">Select City Filter:</span>
            <select
              value={selectedCity}
              onChange={(e) => onSelectCity(e.target.value)}
              className="bg-white border border-slate-200 text-xs font-semibold rounded-lg px-2 py-1 text-slate-800"
            >
              {INDIAN_CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Navigation Links */}
          <div className="grid grid-cols-1 gap-1.5 text-sm font-medium text-slate-700">
            <button
              type="button"
              onClick={() => { onNavigateToSection('doctors-section'); setMobileMenuOpen(false); }}
              className="text-left py-2.5 px-3 rounded-lg hover:bg-slate-50 flex items-center justify-between font-semibold text-[#032F31] cursor-pointer"
            >
              <span>Find Verified Doctors</span>
              <Search className="w-4 h-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => { onOpenSymptomChecker(); setMobileMenuOpen(false); }}
              className="text-left py-2.5 px-3 rounded-lg bg-teal-50 text-teal-900 font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-teal-700" />
              <span>AI Symptom Checker</span>
            </button>

            <button
              type="button"
              onClick={() => { onNavigateToSection('how-it-works'); setMobileMenuOpen(false); }}
              className="text-left py-2 px-3 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              How It Works
            </button>

            <button
              type="button"
              onClick={() => { onNavigateToSection('about-section'); setMobileMenuOpen(false); }}
              className="text-left py-2 px-3 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              About MediNest
            </button>

            <button
              type="button"
              onClick={() => { onNavigateToSection('specialties-section'); setMobileMenuOpen(false); }}
              className="text-left py-2 px-3 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Browse Specialties
            </button>

            <button
              type="button"
              onClick={() => { onNavigateToSection('faq-section'); setMobileMenuOpen(false); }}
              className="text-left py-2 px-3 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Frequently Asked Questions
            </button>
          </div>

          {/* Bottom Action Bar: Account & Book Now */}
          <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
            <button
              type="button"
              onClick={() => { handleAccountClick(); setMobileMenuOpen(false); }}
              className="w-1/2 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center justify-center gap-2 cursor-pointer truncate"
            >
              {isDoctorLoggedIn ? (
                <>
                  <Stethoscope className="w-3.5 h-3.5 text-teal-700" />
                  <span>Dr. {doctorName?.replace(/^Dr\.?\s*/i, '').split(' ')[0]}</span>
                </>
              ) : isAdminLoggedIn ? (
                <>
                  <Shield className="w-3.5 h-3.5 text-amber-700" />
                  <span>Admin</span>
                </>
              ) : user.isLoggedIn ? (
                <>
                  <User className="w-3.5 h-3.5 text-[#032F31]" />
                  <span>{user.name.split(' ')[0]}</span>
                </>
              ) : (
                <>
                  <User className="w-3.5 h-3.5 text-[#032F31]" />
                  <span>Account</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => { onNavigateToSection('doctors-section'); setMobileMenuOpen(false); }}
              className="w-1/2 py-2.5 rounded-xl bg-[#032F31] text-white text-xs font-bold shadow hover:bg-[#074749] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-[#FAE58D]" />
              <span>Book Now</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
