import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does an online video consultation work on MediNest?',
      a: 'Once your appointment is confirmed and payment is completed in ₹ INR, you receive a secure consultation link via SMS, WhatsApp, and email. You can join the private video room directly from your phone or computer browser without downloading extra software. The doctor reviews your symptoms, medical history, and issues a verified digital prescription.'
    },
    {
      q: 'Are all consultation fees strictly in Indian Rupees (₹ INR)?',
      a: 'Yes, 100% of our doctor consultation fees and healthcare services are quoted and processed in Indian Rupees (₹ INR). We support all standard Indian payment methods including UPI (Google Pay, PhonePe, Paytm, BHIM), RuPay/Visa/Mastercard debit and credit cards, Net Banking across 40+ Indian banks, and digital wallets with zero hidden markups.'
    },
    {
      q: 'What is the cancellation and refund policy?',
      a: 'We offer hassle-free cancellation and a 100% instant refund if cancelled up to 2 hours before the scheduled appointment time. The refunded amount is credited back to your original payment method within 2-4 business days. You can also reschedule your slot for free at any time.'
    },
    {
      q: 'Are digital prescriptions legally valid in Indian pharmacies?',
      a: 'Yes. All video consultations and digital prescriptions issued on MediNest strictly adhere to the National Medical Commission (NMC) and Ministry of Health & Family Welfare Telemedicine Practice Guidelines (2020). Registered medical practitioners sign every prescription with their official NMC registration number, making it valid at pharmacies across India.'
    },
    {
      q: 'Can I book an appointment for my parents or family members?',
      a: 'Yes! During the booking process, simply select "Family Member / Dependent" and input their name, age, and contact information. The prescription and appointment confirmation will be issued under the patient\'s name.'
    }
  ];

  return (
    <section className="py-20 md:py-24 bg-[#FAF7EE] border-t border-[#E8E2D5]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#D5CDBC] bg-[#F4EFE2] text-xs font-semibold text-[#032F31] uppercase tracking-wider">
            Got Questions?
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-[#032F31] leading-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-sm sm:text-base text-[#526368]">
            Everything you need to know about booking verified doctor appointments in India.
          </p>
        </div>

        <div className="space-y-3.5">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-[22px] bg-[#F4EFE2] border border-[#E2DCCE] overflow-hidden transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-[#032F31] hover:text-[#084042] transition-colors cursor-pointer"
                >
                  <span className="leading-snug">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-[#526368] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#032F31]' : ''}`} />
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-xs sm:text-sm text-[#465A61] leading-relaxed border-t border-[#E2DCCE] pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
