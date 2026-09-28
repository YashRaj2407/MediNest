import React from 'react';
import { Star, Quote } from 'lucide-react';

export const PatientTestimonials: React.FC = () => {
  const testimonials = [
    {
      name: 'Sunita Mehra',
      city: 'Mumbai',
      specialtyConsulted: 'Cardiology Consultation',
      comment: 'Booking a top cardiologist through MediNest was effortless. The doctor explained my ECG thoroughly via video consultation and helped prevent an unnecessary hospital admission.',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150',
      rating: 5
    },
    {
      name: 'Aditya Swaminathan',
      city: 'Bengaluru',
      specialtyConsulted: 'Dermatology (Dr. Ananya Sharma)',
      comment: 'Found the right dermatologist using the symptom checker. Dr. Ananya prescribed the right care for my dermatitis, and consultation fees were transparent in ₹ INR.',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150',
      rating: 5
    },
    {
      name: 'Priyanka Sen',
      city: 'Kolkata',
      specialtyConsulted: 'Dental (Dr. Aditya Banerjee)',
      comment: 'Painless single-sitting root canal. Paid ₹499 consultation fee directly via UPI with zero extra charges. Clinic hygiene standards were outstanding.',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
      rating: 5
    },
    {
      name: 'Rahul Deshmukh',
      city: 'Pune',
      specialtyConsulted: 'Orthopedics (Dr. Rajesh Singhal)',
      comment: '1-click free rescheduling saved me when meetings ran late. Got my knee MRI reports reviewed without waiting in hospital queues.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
      rating: 5
    }
  ];

  return (
    <section id="reviews-section" className="py-20 md:py-24 bg-[#FAF7EE] border-t border-[#E8E2D5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#D5CDBC] bg-[#F4EFE2] text-xs font-semibold text-[#032F31] uppercase tracking-wider">
            Patient Stories
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-[#032F31] leading-tight">
            Patient-Focused Care
          </h2>
          <p className="text-sm sm:text-base text-[#526368] leading-relaxed">
            Read authentic reviews from verified patients across India who found the right doctor with MediNest.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="p-6 rounded-[24px] bg-[#F4EFE2] border border-[#E2DCCE] hover:border-[#032F31] hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Quote className="w-5 h-5 text-[#032F31]/40" />
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-[#243B42] leading-relaxed italic mb-6">
                  "{t.comment}"
                </p>
              </div>

              <div className="pt-4 border-t border-[#E2DCCE] flex items-center gap-3">
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="w-10 h-10 rounded-full object-cover border border-[#D5CDBC]"
                />
                <div>
                  <h4 className="text-xs font-bold text-[#032F31]">{t.name}</h4>
                  <p className="text-[11px] text-[#526368]">{t.city}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
