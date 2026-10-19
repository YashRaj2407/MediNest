import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How can I find a doctor on MediNest?',
      a: 'Use the Find Doctors section on the homepage. You can search by doctor name, filter by clinical specialty (Cardiologist, Dermatologist, Pediatrician, and more), select your city, and filter by consultation type (Video or Clinic). Each doctor card shows their qualifications, experience, rating, clinic, languages spoken, and consultation fee in ₹ INR. Click View Profile for full details.'
    },
    {
      q: 'How do I book an appointment on MediNest?',
      a: 'Click Book Slot on any doctor card or View Profile to open the full profile and choose a time slot. Select your preferred consultation mode (Video or In-Clinic), date, and slot. You will be prompted to sign in or create a patient account if you are not already logged in. After signing in, you can complete the secure ₹ INR payment to confirm the booking.'
    },
    {
      q: 'How can I view a doctor\'s full profile?',
      a: 'Click View Profile on any doctor card in the Find Doctors section. The profile shows the doctor\'s full qualifications, registration number, clinic details, available time slots, services with individual fees, patient reviews, and available consultation modes. You can also save the doctor to your dashboard for future reference.'
    },
    {
      q: 'How does an online video consultation work on MediNest?',
      a: 'Once your appointment is confirmed and payment is completed in ₹ INR, you receive a secure consultation link. You can join the private video room directly from your phone or computer browser. The doctor reviews your symptoms and issues a verified digital prescription bearing their NMC registration number.'
    },
    {
      q: 'How does the Symptom Checker work?',
      a: 'Click the Symptom Checker button in the top navigation bar. The AI-powered assistant asks about your symptoms and provides an initial assessment along with recommended specialties. Based on its analysis, it can suggest relevant doctors from the MediNest platform. The Symptom Checker is for informational guidance only and does not replace a qualified medical consultation.'
    },
    {
      q: 'How can patients create an account on MediNest?',
      a: 'Click the Account button in the navigation bar. Select Patient, then choose Sign Up. Enter your full name, email address, and password. A verification code will be sent to your email. Once verified, your patient account is active and you can book appointments, view consultation history, save doctors, and manage your profile from the patient dashboard.'
    },
    {
      q: 'How do doctors access their portal?',
      a: 'Doctors click the Account button in the navigation bar and select Doctor, then Sign In. After verifying their credentials through the secure Clerk authentication system and a backend NMC profile check, they are taken to the Doctor Portal. From there, they can manage their schedule, view and respond to appointments, issue digital prescriptions, update their profile, and track their earnings.'
    },
    {
      q: 'How is administrator access controlled?',
      a: 'Administrator access is tightly restricted. There is no self-registration for admin accounts. Admin credentials are provisioned directly by the MediNest team. Admins sign in through the Account → Admin flow using a separate secure backend authentication endpoint. The admin panel provides tools for managing doctors, patients, appointments, and platform operations.'
    },
    {
      q: 'How can I manage or cancel an appointment?',
      a: 'Open your patient dashboard by clicking the Account button once signed in. Under your Appointments section, you can view upcoming and past consultations, download digital receipts, cancel upcoming appointments, or reschedule them to a different date and time slot. Cancellation and rescheduling are available for upcoming appointments.'
    },
    {
      q: 'Are all consultation fees in Indian Rupees (₹ INR)?',
      a: 'Yes. 100% of consultation fees on MediNest are quoted and processed in Indian Rupees (₹ INR). Supported payment methods include UPI (Google Pay, PhonePe, Paytm, BHIM), RuPay/Visa/Mastercard debit and credit cards, Net Banking, and digital wallets — all with complete fee transparency and no hidden charges.'
    },
    {
      q: 'Are digital prescriptions legally valid in Indian pharmacies?',
      a: 'Yes. All digital prescriptions issued through MediNest comply with the National Medical Commission (NMC) and Ministry of Health & Family Welfare Telemedicine Practice Guidelines (2020). Each prescription carries the doctor\'s official NMC registration number and is valid at pharmacies across India.'
    },
    {
      q: 'How can I contact MediNest for assistance?',
      a: 'You can reach us via the contact details listed in the footer of the website. For acute life-threatening emergencies, please dial the national emergency numbers 112 or 108 immediately — do not rely on any telemedicine platform for emergencies.'
    }
  ];

  return (
    <section id="faq-section" className="py-20 md:py-24 bg-[#FAF7EE] border-t border-[#E8E2D5]">
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
