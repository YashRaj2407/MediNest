import React from 'react';
import { 
  Stethoscope, 
  Phone, 
  Mail, 
  MapPin, 
  ShieldAlert, 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin 
} from 'lucide-react';
import { SPECIALTIES } from '../data/specialtiesData';
import { MediNestLogo } from './MediNestLogo';

interface FooterProps {
  onSelectSpecialty: (id: string) => void;
  onOpenSymptomChecker: () => void;
  onOpenDoctorPortal: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onSelectSpecialty,
  onOpenSymptomChecker,
  onOpenDoctorPortal
}) => {
  return (
    <footer className="bg-[#032F31] text-slate-300 pt-16 pb-12 border-t border-[#0d4447]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* Brand & Overview */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FAE58D] flex items-center justify-center text-[#032F31] font-bold shadow-md p-1.5">
                <MediNestLogo variant="dark" className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-white block leading-tight">
                  MediNest
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-[#FAE58D] block">
                  Simple access to care, anytime, anywhere
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed pr-4">
              India's premier appointment booking platform connecting patients with NMC-verified specialists across leading medical centers and modern digital clinics. Transparent ₹ INR pricing and zero convenience markups.
            </p>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#FAE58D] shrink-0" />
                <span>Patient Support: +91 1800-266-9900 (Toll-Free, 24/7)</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#FAE58D] shrink-0" />
                <a href="mailto:yashdhawale2407@gmail.com" className="hover:text-[#FAE58D] transition-colors">
                  yashdhawale2407@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#FAE58D] shrink-0" />
                <span>Bansal Vihar Bhosari pune Dighi Road -411039</span>
              </div>
            </div>
          </div>

          {/* Core Specialties */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">
              Medical Specialties
            </h4>
            <ul className="space-y-2 text-xs text-slate-300">
              {SPECIALTIES.slice(0, 6).map((sp) => (
                <li key={sp.id}>
                  <button
                    onClick={() => onSelectSpecialty(sp.id)}
                    className="hover:text-[#FAE58D] transition-colors text-left cursor-pointer"
                  >
                    {sp.name} (from ₹{sp.startingFeeINR})
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links & Tools */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs text-slate-300">
              <li>
                <button 
                  onClick={onOpenDoctorPortal} 
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FAE58D] text-[#032F31] font-bold hover:bg-white transition-all cursor-pointer text-[11px]"
                >
                  <Stethoscope className="w-3.5 h-3.5" /> Doctor Login / Portal
                </button>
              </li>
              <li>
                <button onClick={onOpenSymptomChecker} className="text-[#FAE58D] hover:underline transition-colors font-semibold cursor-pointer">
                  Symptom Checker
                </button>
              </li>
              <li><a href="#about-section" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#specialties-section" className="hover:text-white transition-colors">Services</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#doctors-section" className="hover:text-white transition-colors">Find Doctors</a></li>
              <li><a href="#reviews-section" className="hover:text-white transition-colors">Patient Reviews</a></li>
            </ul>
          </div>

          {/* Legal, Privacy & Compliance */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">
              Compliance & Safety
            </h4>
            <ul className="space-y-2 text-xs text-slate-300">
              <li><span>Telemedicine Practice Guidelines (NMC 2020)</span></li>
              <li><span>Digital Personal Data Protection Act (DPDP)</span></li>
              <li><span>Verified Medical Credentials</span></li>
              <li><span>Transparent ₹ INR Pricing Policy</span></li>
              <li><span>100% Refundable Cancellations</span></li>
            </ul>

            <div className="pt-3">
              <span className="text-[11px] font-bold text-slate-200 block mb-2">Connect with us</span>
              <div className="flex items-center gap-2">
                <a 
                  href="https://www.facebook.com/share/1CXVHCNr55/" 
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook" 
                  className="w-8 h-8 rounded-lg bg-[#084042] flex items-center justify-center text-slate-300 hover:bg-[#FAE58D] hover:text-[#032F31] transition-colors cursor-pointer"
                  title="Follow on Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a 
                  href="https://x.com/yash_dhawa59836" 
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Twitter / X" 
                  className="w-8 h-8 rounded-lg bg-[#084042] flex items-center justify-center text-slate-300 hover:bg-[#FAE58D] hover:text-[#032F31] transition-colors cursor-pointer"
                  title="Follow on X (Twitter)"
                >
                  <Twitter className="w-4 h-4" />
                </a>
                <a 
                  href="https://www.linkedin.com/in/yash-dhawale-54322a395?utm_source=share_via&utm_content=profile&utm_medium=member_android" 
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn" 
                  className="w-8 h-8 rounded-lg bg-[#084042] flex items-center justify-center text-slate-300 hover:bg-[#FAE58D] hover:text-[#032F31] transition-colors cursor-pointer"
                  title="Connect on LinkedIn"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Medical Disclaimer Banner */}
        <div className="p-4 rounded-2xl bg-[#022122] border border-[#0d4447] text-xs text-slate-300 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-[#FAE58D] shrink-0" />
          <div className="leading-relaxed">
            <strong className="text-white">Statutory Medical Disclaimer:</strong> MediNest is a digital healthcare technology platform facilitating appointment scheduling with independent licensed medical practitioners registered with Indian State Medical Councils. Symptom suggestions and informational content are not a formal diagnostic prescription. In case of acute chest pain, trauma, breathlessness, or life-threatening emergencies, please dial <strong>112</strong> or <strong>108</strong> immediately.
          </div>
        </div>

        {/* Bottom Copyright & Currency Notice */}
        <div className="pt-6 border-t border-[#0e484a] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            © {new Date().getFullYear()} MediNest Healthcare Technologies Pvt. Ltd. All rights reserved.
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-[#FAE58D] font-semibold">Pricing strictly in Indian Rupees (₹ INR)</span>
            <span>•</span>
            <span>Privacy Policy</span>
            <span>•</span>
            <span>Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
