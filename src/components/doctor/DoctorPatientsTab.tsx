import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  ShieldCheck, 
  Calendar, 
  FileText, 
  Phone, 
  Mail, 
  Clock, 
  Lock,
  ChevronRight,
  Eye,
  AlertCircle
} from 'lucide-react';
import { Appointment } from '../../types';

interface DoctorPatientsTabProps {
  appointments: Appointment[];
  onOpenPrescription: (appointment: Appointment) => void;
}

export const DoctorPatientsTab: React.FC<DoctorPatientsTabProps> = ({
  appointments,
  onOpenPrescription
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientName, setSelectedPatientName] = useState<string | null>(null);

  // Group appointments by unique patient (phone / name)
  const patientsMap = new Map<string, {
    name: string;
    age: number;
    gender: string;
    phone: string;
    email: string;
    appointments: Appointment[];
    lastVisit: string;
    latestSymptoms: string;
    latestNotes?: string;
  }>();

  appointments.forEach(appt => {
    const key = appt.patientPhone || appt.patientName;
    if (!patientsMap.has(key)) {
      patientsMap.set(key, {
        name: appt.patientName,
        age: appt.patientAge,
        gender: appt.patientGender,
        phone: appt.patientPhone,
        email: appt.patientEmail,
        appointments: [appt],
        lastVisit: appt.date,
        latestSymptoms: appt.visitReason,
        latestNotes: appt.consultationNotes
      });
    } else {
      const existing = patientsMap.get(key)!;
      existing.appointments.push(appt);
      if (appt.consultationNotes) {
        existing.latestNotes = appt.consultationNotes;
      }
    }
  });

  const patientsList = Array.from(patientsMap.values()).filter(p => {
    if (!searchQuery.trim()) return true;
    const q = (searchQuery || '').toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.phone || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.latestSymptoms || '').toLowerCase().includes(q)
    );
  });

  const selectedPatient = selectedPatientName 
    ? patientsList.find(p => p.name === selectedPatientName) 
    : patientsList[0];

  return (
    <div className="space-y-6">
      {/* Privacy Notice Banner */}
      <div className="p-4 rounded-2xl bg-[#032F31] text-slate-200 text-xs border border-teal-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FAE58D] text-[#032F31] flex items-center justify-center font-bold shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-[#FAE58D] block">
              Patient Data Protection & Medical Confidentiality Notice
            </span>
            <span className="text-slate-300 text-[11px]">
              Access restricted solely to your verified consulting patients under Digital Personal Data Protection (DPDP) Act 2023 & NMC Guidelines.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-emerald-300 font-semibold shrink-0">
          <ShieldCheck className="w-4 h-4" /> 256-Bit Vault Storage
        </div>
      </div>

      {/* Search Header */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-[#032F31] flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-700" />
            My Consulted Patients ({patientsList.length})
          </h3>
          <p className="text-xs text-slate-500">
            Patients who have scheduled in-clinic or video consultations with Dr. Rohan Gupta.
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patients by name, phone, email..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-700 bg-slate-50/50"
          />
        </div>
      </div>

      {/* Master Detail Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Patients List Left Column */}
        <div className="lg:col-span-5 space-y-3">
          {patientsList.map(patient => {
            const isSelected = selectedPatient?.name === patient.name;
            return (
              <div
                key={patient.phone}
                onClick={() => setSelectedPatientName(patient.name)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#FAF7EE] border-[#032F31] shadow-sm ring-1 ring-[#032F31]'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#032F31] text-[#FAE58D] flex items-center justify-center font-bold text-sm">
                      {patient.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#032F31] flex items-center gap-1.5">
                        {patient.name}
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({patient.age}y, {patient.gender})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {patient.phone}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md block mb-1">
                      {patient.appointments.length} Consult{patient.appointments.length > 1 ? 's' : ''}
                    </span>
                    <span className="text-[10px] text-slate-400">{patient.lastVisit}</span>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-600 truncate">
                  <span className="font-semibold text-slate-700">Recent issue: </span>
                  {patient.latestSymptoms}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Patient Dossier Right Column */}
        <div className="lg:col-span-7">
          {selectedPatient ? (
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
              {/* Profile Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#032F31] text-[#FAE58D] flex items-center justify-center font-bold text-xl shadow-md">
                    {selectedPatient.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#032F31]">
                      {selectedPatient.name}
                    </h3>
                    <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                      <span>Age: {selectedPatient.age} Years</span>
                      <span>•</span>
                      <span>Gender: {selectedPatient.gender}</span>
                      <span>•</span>
                      <span className="text-teal-700 font-semibold">{selectedPatient.appointments.length} Total Visits</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Patient Contact Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Phone Number</span>
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-teal-700" />
                    {selectedPatient.phone}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Email Address</span>
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-teal-700" />
                    <span className="truncate">{selectedPatient.email}</span>
                  </div>
                </div>
              </div>

              {/* Consultation History */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-teal-800" />
                  Consultation History with Dr. Rohan Gupta
                </h4>

                <div className="space-y-3">
                  {selectedPatient.appointments.map(appt => (
                    <div key={appt.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#032F31]">{appt.date}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-600 font-medium">{appt.timeSlot}</span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-800">
                            {appt.appointmentType}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          appt.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {appt.status}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Reported Symptoms:</span>
                        <p className="text-xs font-medium text-slate-800 mt-0.5">{appt.visitReason}</p>
                      </div>

                      {appt.consultationNotes && (
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700">
                          <span className="font-bold text-teal-800 block text-[10px] uppercase mb-0.5">Doctor Notes:</span>
                          <p className="italic text-[11px] leading-relaxed">{appt.consultationNotes}</p>
                        </div>
                      )}

                      {/* e-Prescription shortcut */}
                      {appt.prescription && (
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" /> Rx Issued ({appt.prescription.diagnosis})
                          </span>
                          <button
                            type="button"
                            onClick={() => onOpenPrescription(appt)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" /> View Prescription
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 text-slate-400">
              Select a patient from the left list to view their complete clinical profile and history.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
