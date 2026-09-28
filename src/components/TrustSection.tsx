import React from 'react';
import { ShieldCheck, RotateCcw, Lock, HeartHandshake } from 'lucide-react';

export const TrustSection: React.FC = () => {
  const pillars = [
    {
      icon: ShieldCheck,
      title: '100% NMC Verified Doctors',
      desc: 'Every specialist undergoes strict credential verification with State Medical Councils & the National Medical Commission (NMC).'
    },
    {
      icon: Lock,
      title: 'Bank-Grade INR Payments',
      desc: 'Secure UPI & card gateways. Complete encryption with transparent ₹ INR fees and zero convenience markups.'
    },
    {
      icon: RotateCcw,
      title: '1-Click Free Rescheduling',
      desc: 'Schedule changes? Reschedule effortlessly up to 2 hours before your consultation without any penalty.'
    },
    {
      icon: HeartHandshake,
      title: 'DPDP Privacy Guaranteed',
      desc: 'Compliant with India’s Digital Personal Data Protection Act and Telemedicine Practice Guidelines. Full medical privacy.'
    }
  ];

  return (
    <section className="py-20 bg-[#FAF7EE] border-t border-[#E8E2D5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5 space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#D5CDBC] bg-[#F4EFE2] text-xs font-semibold text-[#032F31] uppercase tracking-wider">
              Safety & Trust
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-[#032F31] leading-tight">
              Trusted by Over 2.5 Million Patients in India
            </h2>
            <p className="text-sm sm:text-base text-[#526368] leading-relaxed">
              We prioritize patient well-being, clinical integrity, and upfront pricing. From metro hubs to emerging cities, MediNest delivers healthcare you can trust.
            </p>
            <div className="pt-2 flex items-center gap-4">
              <div className="flex -space-x-2 overflow-hidden">
                {['https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120',
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120',
                  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120'].map((src, i) => (
                  <img key={i} className="inline-block h-10 w-10 rounded-full border-2 border-[#FAF7EE] object-cover" src={src} alt="Patient" />
                ))}
              </div>
              <div className="text-xs">
                <strong className="text-[#032F31] block font-bold text-sm">4.9 / 5.0 Star Rating</strong>
                <span className="text-[#526368]">From 85,000+ verified patient visits</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pillars.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-[24px] bg-[#F4EFE2] border border-[#E2DCCE] space-y-3 hover:border-[#032F31] transition-all shadow-xs"
                >
                  <div className="w-11 h-11 rounded-2xl bg-[#032F31] text-[#FAE58D] flex items-center justify-center shadow-xs">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-[#032F31]">{item.title}</h3>
                  <p className="text-xs text-[#526368] leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
