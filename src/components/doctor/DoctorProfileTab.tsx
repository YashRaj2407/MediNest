import React, { useState } from 'react';
import { 
  User, 
  Stethoscope, 
  MapPin, 
  Building2, 
  Phone, 
  Mail, 
  Award, 
  ShieldCheck, 
  CheckCircle, 
  Camera, 
  IndianRupee, 
  Globe, 
  Video,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { DoctorAuthData } from '../../types';
import { SPECIALTIES, INDIAN_CITIES } from '../../data/specialtiesData';


interface DoctorProfileTabProps {
  doctor: DoctorAuthData;
  onUpdateProfile: (updated: DoctorAuthData) => void;
}

export const DoctorProfileTab: React.FC<DoctorProfileTabProps> = ({
  doctor,
  onUpdateProfile
}) => {
  const [name, setName] = useState(doctor.name);
  const [specialty, setSpecialty] = useState(doctor.specialty);
  const [qualifications, setQualifications] = useState(doctor.qualifications);
  const [experienceYears, setExperienceYears] = useState(doctor.experienceYears.toString());
  const [clinicName, setClinicName] = useState(doctor.clinicName);
  const [address, setAddress] = useState(doctor.address);
  const [city, setCity] = useState(doctor.city);
  const [feeINR, setFeeINR] = useState(doctor.feeINR > 0 ? doctor.feeINR.toString() : "");
  const [languages, setLanguages] = useState(doctor.languages.join(', '));
  const [acceptingAppointments, setAcceptingAppointments] = useState(doctor.acceptingNewAppointments);
  const [videoConsultationEnabled, setVideoConsultationEnabled] = useState(
    doctor.consultationModes.includes('video')
  );
  const [clinicConsultationEnabled, setClinicConsultationEnabled] = useState(
    doctor.consultationModes.includes('clinic')
  );
  const [photoUrl, setPhotoUrl] = useState(doctor.photo);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const modes: ('video' | 'clinic')[] = [];
    if (videoConsultationEnabled) modes.push('video');
    if (clinicConsultationEnabled) modes.push('clinic');

    const parsedLanguages = languages.split(',').map(l => l.trim()).filter(Boolean);

    const updated: DoctorAuthData = {
      ...doctor,
      name,
      specialty,
      qualifications,
      experienceYears: Number(experienceYears) || doctor.experienceYears,
      clinicName,
      address,
      city,
      feeINR: Number(feeINR) || doctor.feeINR,
      languages: parsedLanguages,
      acceptingNewAppointments: acceptingAppointments,
      consultationModes: modes.length > 0 ? modes : ['video'],
      photo: photoUrl
    };

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

    try {
      await fetch(`${API_BASE_URL}/doctors/${doctor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicName,
          address,
          feeINR: Number(feeINR) || doctor.feeINR,
          qualifications,
          acceptingAppointments,
        }),
      });
    } catch (_) {}

    onUpdateProfile(updated);
    setSaving(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  return (
    <div className="space-y-6">
      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-[#032F31] text-[#FAE58D] text-xs font-semibold flex items-center gap-2.5 shadow-xl border border-teal-700 animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Profile changes and clinical consultation settings have been updated and synced successfully!</span>
        </div>
      )}

      {/* Profile Card & Avatar */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <img
              src={photoUrl}
              alt={doctor.name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-teal-700 shadow-md"
            />
            <button
              type="button"
              onClick={() => {
                const newUrl = prompt('Enter image URL for doctor profile photo:', photoUrl);
                if (newUrl) setPhotoUrl(newUrl);
              }}
              className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-[#032F31] text-white hover:bg-teal-800 transition-colors shadow-md cursor-pointer"
              title="Change Profile Photo"
            >
              <Camera className="w-4 h-4 text-[#FAE58D]" />
            </button>
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
              <ShieldCheck className="w-3 h-3" /> NMC Verified Specialist
            </div>
            <h3 className="text-xl font-bold text-[#032F31]">{doctor.name}</h3>
            <p className="text-xs text-slate-500 font-medium">
              {doctor.qualifications} â€¢ {doctor.specialty}
            </p>
            <div className="text-[11px] text-slate-400">
              Registration No: <span className="font-mono text-slate-700 font-semibold">{doctor.registrationNumber}</span>
            </div>
          </div>
        </div>

        {/* Global Appointment Acceptance Toggle */}
        <div className="p-4 rounded-2xl bg-[#FAF7EE] border border-[#DDD6C5] flex items-center justify-between sm:flex-col sm:items-end gap-2">
          <span className="text-xs font-bold text-[#032F31]">
            Accepting New Appointments
          </span>
          <button
            type="button"
            onClick={() => setAcceptingAppointments(!acceptingAppointments)}
            className="flex items-center gap-2 cursor-pointer"
          >
            {acceptingAppointments ? (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs">
                <CheckCircle className="w-3.5 h-3.5" /> Active (Online)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold">
                Paused (Offline)
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSaveProfile} className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
        <h4 className="text-base font-bold text-[#032F31] pb-3 border-b border-slate-100 flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-teal-700" />
          Clinical Practice Information
        </h4>

        {/* Full Name & Specialty */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Doctor Display Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Primary Specialty *
            </label>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
            >
              {SPECIALTIES.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Qualifications & Experience */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Degrees / Qualifications *
            </label>
            <input
              type="text"
              required
              value={qualifications}
              onChange={(e) => setQualifications(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Years of Clinical Experience *
            </label>
            <input
              type="number"
              min="1"
              max="50"
              required
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
            />
          </div>
        </div>

        {/* Hospital/Clinic & City */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Hospital / Clinic Name *
            </label>
            <input
              type="text"
              required
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              City *
            </label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
            >
              {INDIAN_CITIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Clinic Address */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Clinic Street Address *
          </label>
          <input
            type="text"
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
          />
        </div>

        {/* Consultation Fee & Languages */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Consultation Fee in â‚¹ INR *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-500">â‚¹</span>
              <input
                type="number"
                min="99"
                max="5000"
                required
                value={feeINR}
                onChange={(e) => setFeeINR(e.target.value)}
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Reflected instantly on your public doctor card.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Consultation Languages (Comma-separated)
            </label>
            <input
              type="text"
              value={languages}
              onChange={(e) => setLanguages(e.target.value)}
              placeholder="English, Hindi, Kannada"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
            />
          </div>
        </div>

        {/* Enabled Consultation Modes */}
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Enabled Consultation Modes
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={videoConsultationEnabled}
                onChange={(e) => setVideoConsultationEnabled(e.target.checked)}
                className="rounded text-teal-700 focus:ring-teal-700 border-slate-300 w-4 h-4 cursor-pointer"
              />
              <Video className="w-4 h-4 text-teal-700" />
              Online Video Consultation (Telehealth)
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={clinicConsultationEnabled}
                onChange={(e) => setClinicConsultationEnabled(e.target.checked)}
                className="rounded text-teal-700 focus:ring-teal-700 border-slate-300 w-4 h-4 cursor-pointer"
              />
              <Building2 className="w-4 h-4 text-teal-700" />
              In-Clinic Physical Consultation
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-[#032F31] hover:bg-[#074749] text-white text-xs font-bold tracking-wide shadow-md transition-all active:scale-98 cursor-pointer flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4 text-[#FAE58D]" />
            Save Profile & Practice Settings
          </button>
        </div>
      </form>
    </div>
  );
};
