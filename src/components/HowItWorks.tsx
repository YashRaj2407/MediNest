import React from 'react';
import { Search, UserCheck, CalendarCheck, CreditCard, CheckCircle2, ArrowRight } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: '1',
      icon: Search,
      title: 'Search',
      desc: 'Filter by symptoms, medical specialty, Indian city, or preferred clinic vs. video mode.'
    },
    {
      num: '2',
      icon: UserCheck,
      title: 'Select Doctor',
      desc: 'Review NMC-verified credentials, hospital affiliations, patient ratings, and transparent INR fees.'
    },
    {
      num: '3',
      icon: CalendarCheck,
      title: 'Choose Slot',
      desc: 'Pick your preferred date and convenient time slot with guaranteed zero overbooking.'
    },
    {
      num: '4',
      icon: CreditCard,
      title: 'Pay Securely',
      desc: 'Pay safely in ₹ INR via UPI (GPay/PhonePe), RuPay cards, or Net Banking with zero extra markup.'
    },
    {
      num: '5',
      icon: CheckCircle2,
      title: 'Instant Confirm',
      desc: 'Receive instant WhatsApp and SMS confirmation with clinic directions or HD video link.'
    }
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-24 bg-[#FAF7EE] border-t border-[#E8E2D5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#D5CDBC] bg-[#F4EFE2] text-xs font-semibold text-[#032F31] uppercase tracking-wider">
            Simple Process
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-[#032F31] leading-tight">
            How MediNest Works
          </h2>
          <p className="text-sm sm:text-base text-[#526368] leading-relaxed">
            Booking quality medical care in India shouldn't be stressful. Experience our transparent 5-step process.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-[24px] bg-[#F4EFE2] border border-[#E2DCCE] hover:border-[#032F31] hover:bg-white hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-11 h-11 rounded-2xl bg-[#032F31] text-[#FAE58D] flex items-center justify-center shadow-xs">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xl font-bold text-[#A89F8D] group-hover:text-[#032F31] transition-colors">
                      0{step.num}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#032F31] mb-2">
                    {step.title}
                  </h3>

                  <p className="text-xs text-[#526368] leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-[#E2DCCE] flex items-center justify-between text-[11px] font-semibold text-[#032F31]">
                  <span>Step {step.num} of 5</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#526368] group-hover:text-[#032F31] group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
