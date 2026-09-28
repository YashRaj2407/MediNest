import React, { useState } from 'react';
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
  ChevronDown
} from 'lucide-react';
import { INDIAN_CITIES } from '../data/specialtiesData';
import { UserProfile } from '../types';
import { MediNestLogo } from './MediNestLogo';

interface NavbarProps {
  selectedCity: string;
  onSelectCity: (city: string) => void;
  onOpenSymptomChecker: () => void;
  onOpenDashboard: () => void;
  onOpenAuth: (initialTab?: 'signin' | 'signup') => void;
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
  doctorName = 'Dr. Rohan Gupta',
  isAdminLoggedIn = false
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#FAF7EE]/95 backdrop-blur-md border-b border-[#E8E3D7] transition-all box-border">
      {/* Emergency Helpline Top Banner */}
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

      {/* Main Navigation Bar — Exact Order: Logo, Find Doctors, How It Works, Services, Symptom Checker, Doctor Portal, Admin, Sign In, Sign Up, Book Now */}
      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6 w-full box-border">
        <div className="flex items-center justify-between h-20 gap-2 xl:gap-3 box-border">
          
          {/* 1. Logo / MediNest */}
          <div className="flex items-center shrink-0">
            <button 
              onClick={() => onNavigateToSection('hero')} 
              className="flex items-center gap-2 text-left focus:outline-none group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-2xl bg-[#032F31] flex items-center justify-center text-[#FAE58D] shadow-sm group-hover:scale-105 transition-transform p-1.5 shrink-0">
                <span className="flex items-center justify-center w-full h-full">
                  <MediNestLogo variant="gold" className="w-5 h-5" />
                </span>
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-[#032F31] font-display block leading-none whitespace-nowrap">
                  MediNest
                </span>
                <span className="text-[9px] font-semibold tracking-wider uppercase text-teal-800/80 block mt-1 whitespace-nowrap">
                  Healthcare
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Nav Links (Order 2 - 7) */}
          <nav className="hidden md:flex items-center gap-2.5 xl:gap-3.5 2xl:gap-4.5 text-xs lg:text-sm font-medium text-slate-700 shrink-0">
            {/* 2. Find Doctors */}
            <button 
              onClick={() => onNavigateToSection('doctors-section')} 
              className="hover:text-[#032F31] transition-colors cursor-pointer py-1 font-semibold text-[#032F31] whitespace-nowrap shrink-0"
            >
              Find Doctors
            </button>

            {/* 3. How It Works */}
            <button 
              onClick={() => onNavigateToSection('how-it-works')} 
              className="hidden xl:block hover:text-[#032F31] transition-colors cursor-pointer py-1 whitespace-nowrap shrink-0"
            >
              How It Works
            </button>

            {/* 4. Services */}
            <button 
              onClick={() => onNavigateToSection('services-section')} 
              className="hidden xl:block hover:text-[#032F31] transition-colors cursor-pointer py-1 whitespace-nowrap shrink-0"
            >
              Services
            </button>

            {/* Dropdown for medium screen widths (md & lg) to hold How It Works / Services */}
            <div className="relative xl:hidden">
              <button
                type="button"
                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                className="hover:text-[#032F31] transition-colors cursor-pointer py-1 font-semibold flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                More <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {moreMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-fadeIn space-y-1">
                  <button
                    onClick={() => { onNavigateToSection('how-it-works'); setMoreMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#032F31] whitespace-nowrap"
                  >
                    How It Works
                  </button>
                  <button
                    onClick={() => { onNavigateToSection('services-section'); setMoreMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#032F31] whitespace-nowrap"
                  >
                    Services
                  </button>
                </div>
              )}
            </div>

            {/* 5. Symptom Checker */}
            <button 
              onClick={onOpenSymptomChecker}
              className="inline-flex items-center gap-1 text-[#032F31] hover:text-black font-semibold px-2.5 py-1 rounded-full bg-[#EAE4D4] hover:bg-[#DDD6C5] transition-all cursor-pointer text-xs whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3 h-3 text-teal-800" />
              Symptom Checker
            </button>

            {/* 6. Doctor Portal — Hide if Patient is logged in */}
            {(!user.isLoggedIn || isDoctorLoggedIn) && (
              <button
                onClick={onOpenDoctorPortal}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isDoctorLoggedIn
                    ? 'bg-[#032F31] text-[#FAE58D] hover:bg-[#074749]'
                    : 'text-teal-800 hover:text-[#032F31] border border-teal-200 hover:border-teal-700 bg-teal-50 hover:bg-teal-100'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                {isDoctorLoggedIn ? doctorName?.split(' ')[1] || 'Doctor Portal' : 'Doctor Portal'}
              </button>
            )}

            {/* 7. Admin — Hide if Patient is logged in */}
            {onOpenAdminPortal && (!user.isLoggedIn || isAdminLoggedIn) && (
              <button
                onClick={onOpenAdminPortal}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isAdminLoggedIn
                    ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                    : 'text-slate-600 hover:text-slate-900 border border-slate-300 hover:border-slate-400 bg-slate-100/80'
                }`}
                title="Secure Admin Portal"
              >
                <Shield className="w-3.5 h-3.5 text-amber-700" />
                {isAdminLoggedIn ? 'Admin Active' : 'Admin'}
              </button>
            )}
          </nav>

          {/* User Account & Actions (Order 8 - 10) */}
          <div className="hidden sm:flex items-center gap-2 xl:gap-2.5 shrink-0">
            {user.isLoggedIn ? (
              <button
                onClick={onOpenDashboard}
                className="relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-[#FAF7EE] hover:bg-[#EAE5D8] rounded-full transition-colors cursor-pointer border border-[#DDD6C5] whitespace-nowrap shrink-0"
              >
                <User className="w-3.5 h-3.5 text-[#032F31]" />
                <span className="whitespace-nowrap">{user.name.split(' ')[0]}</span>
                {upcomingCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#032F31] text-[#FAE58D] text-[9px] flex items-center justify-center font-bold">
                    {upcomingCount}
                  </span>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-1 xl:gap-1.5 shrink-0">
                {/* 8. Sign In */}
                <button
                  onClick={() => onOpenAuth('signin')}
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:text-[#032F31] transition-colors cursor-pointer whitespace-nowrap"
                >
                  Sign In
                </button>
                {/* 9. Sign Up */}
                <button
                  onClick={() => onOpenAuth('signup')}
                  className="px-3 py-1.5 text-xs font-semibold text-[#032F31] hover:text-black bg-[#FAF7EE] hover:bg-[#EAE5D8] border border-[#DDD6C5] rounded-full transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
                >
                  Sign Up
                </button>
              </div>
            )}

            {/* 10. Book Now — Guaranteed Visible & Unclipped */}
            <button
              onClick={() => onNavigateToSection('doctors-section')}
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 lg:px-4.5 py-2.5 rounded-full bg-[#032F31] hover:bg-[#074749] text-white text-xs font-semibold tracking-wide shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Calendar className="w-3.5 h-3.5 text-[#FAE58D]" />
              Book Now
            </button>
          </div>

          {/* Mobile menu toggle */}
          <div className="flex md:hidden items-center gap-2 shrink-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-800 hover:bg-[#EAE5D8] focus:outline-none cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-4 shadow-xl box-border">
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

          <div className="grid grid-cols-1 gap-2 text-sm font-medium text-slate-700">
            <button
              onClick={() => { onNavigateToSection('doctors-section'); setMobileMenuOpen(false); }}
              className="text-left py-2 px-3 rounded-lg hover:bg-slate-50 flex items-center justify-between font-semibold text-[#032F31]"
            >
              <span>Find Verified Doctors</span>
              <Search className="w-4 h-4 text-slate-400" />
            </button>
            <button
              onClick={() => { onNavigateToSection('specialties-section'); setMobileMenuOpen(false); }}
              className="text-left py-2 px-3 rounded-lg hover:bg-slate-50"
            >
              Browse Specialties
            </button>
            <button
              onClick={() => { onOpenSymptomChecker(); setMobileMenuOpen(false); }}
              className="text-left py-2 px-3 rounded-lg bg-teal-50 text-teal-800 font-semibold flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-teal-600" />
              AI Symptom Checker
            </button>
            <button
              onClick={() => { onNavigateToSection('how-it-works'); setMobileMenuOpen(false); }}
              className="text-left py-2 px-3 rounded-lg hover:bg-slate-50"
            >
              How It Works
            </button>
            <button
              onClick={() => { onOpenDashboard(); setMobileMenuOpen(false); }}
              className="text-left py-2 px-3 rounded-lg hover:bg-slate-50 flex items-center justify-between"
            >
              <span>My Appointments</span>
              {upcomingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-bold">
                  {upcomingCount}
                </span>
              )}
            </button>
            
            {/* Doctor Portal — mobile (Hide if Patient logged in) */}
            {(!user.isLoggedIn || isDoctorLoggedIn) && (
              <button
                onClick={() => { onOpenDoctorPortal(); setMobileMenuOpen(false); }}
                className="text-left py-2.5 px-3 rounded-xl bg-[#032F31]/5 hover:bg-[#032F31]/10 text-[#032F31] font-bold flex items-center gap-2 border border-teal-900/10"
              >
                <Stethoscope className="w-4 h-4 text-teal-700" />
                {isDoctorLoggedIn ? `Doctor Portal (${doctorName})` : 'Doctor Portal'}
              </button>
            )}

            {/* Admin Portal — mobile (Hide if Patient logged in) */}
            {onOpenAdminPortal && (!user.isLoggedIn || isAdminLoggedIn) && (
              <button
                onClick={() => { onOpenAdminPortal(); setMobileMenuOpen(false); }}
                className="text-left py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold flex items-center gap-2 border border-amber-200"
              >
                <Shield className="w-4 h-4 text-amber-700" />
                {isAdminLoggedIn ? 'Admin Portal (Active)' : 'Admin Portal'}
              </button>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
            {!user.isLoggedIn ? (
              <div className="w-1/2 grid grid-cols-2 gap-2">
                <button
                  onClick={() => { onOpenAuth('signin'); setMobileMenuOpen(false); }}
                  className="py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-50 text-center cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => { onOpenAuth('signup'); setMobileMenuOpen(false); }}
                  className="py-2.5 rounded-xl bg-[#032F31] text-xs font-bold text-white hover:bg-[#074749] text-center cursor-pointer"
                >
                  Sign Up
                </button>
              </div>
            ) : (
              <button
                onClick={() => { onOpenDashboard(); setMobileMenuOpen(false); }}
                className="w-1/2 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 truncate"
              >
                Profile ({user.name})
              </button>
            )}
            <button
              onClick={() => { onNavigateToSection('doctors-section'); setMobileMenuOpen(false); }}
              className="w-1/2 py-2.5 rounded-xl bg-[#0C182B] text-white text-xs font-bold shadow text-center cursor-pointer"
            >
              Book Now
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
