import React from 'react';
import { ShieldCheck, Clock, Award, CheckCircle } from 'lucide-react';

export const AboutSection: React.FC = () => {
  return (
    <section id="about-section" className="py-20 md:py-28 bg-[#FAF7EE] text-[#1A2E35]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          {/* Left Column: Eyebrow + Large Editorial Heading */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#D5CDBC] bg-[#F4EFE2] text-xs font-semibold text-[#032F31] uppercase tracking-wider">
              About Us
            </div>

            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-[#032F31] leading-[1.1]">
              Care that's clear, <br />
              convenient, and <br />
              <span className="italic font-normal">human.</span>
            </h2>

            <div className="pt-4 flex items-center gap-6">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#032F31]">
                <CheckCircle className="w-4 h-4 text-teal-700" />
                <span>NMC Verified Doctors</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#032F31]">
                <CheckCircle className="w-4 h-4 text-teal-700" />
                <span>Fixed ₹ INR Pricing</span>
              </div>
            </div>
          </div>

          {/* Right Column: Mission Statement & Key Values */}
          <div className="lg:col-span-6 space-y-8 lg:pt-8">
            <p className="text-xl sm:text-2xl font-normal text-[#032F31] leading-relaxed">
              We're a modern healthcare team focused on making it easy to get quality care—online or in-clinic.
            </p>

            <p className="text-base text-[#465A61] leading-relaxed">
              Our mission is simple: connect you with trusted doctors, transparent pricing in ₹ INR, and appointments that fit your life. From first symptom to follow-up, we keep every step clear, secure, and stress-free.
            </p>

            {/* Micro Highlights Grid */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#E2DCCE]">
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-[#032F31]">15,000+</div>
                <div className="text-xs text-[#5D7076] mt-0.5">Verified Doctors</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-[#032F31]">98.4%</div>
                <div className="text-xs text-[#5D7076] mt-0.5">Positive Ratings</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-[#032F31]">₹0</div>
                <div className="text-xs text-[#5D7076] mt-0.5">Convenience Markup</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
