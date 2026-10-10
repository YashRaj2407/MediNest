import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  FileText, 
  Plus, 
  Trash2, 
  CheckCircle, 
  ShieldCheck, 
  Calendar,
  AlertCircle,
  Download
} from 'lucide-react';
import { Appointment, Prescription, PrescriptionMedicine, DoctorAuthData, Doctor } from '../../types';
import { generatePrescriptionPDF } from '../../lib/prescriptions';

interface DoctorPrescriptionModalProps {
  isOpen: boolean;
  appointment: Appointment | null;
  doctor?: DoctorAuthData | Doctor | null;
  onClose: () => void;
  onSavePrescription: (appointmentId: string, prescription: Prescription) => void;
}

export const DoctorPrescriptionModal: React.FC<DoctorPrescriptionModalProps> = ({
  isOpen,
  appointment,
  doctor,
  onClose,
  onSavePrescription
}) => {
  if (!isOpen || !appointment) return null;

  const [diagnosis, setDiagnosis] = useState('');
  const [medicines, setMedicines] = useState<PrescriptionMedicine[]>([]);
  const [advice, setAdvice] = useState('');
  const [followUpDate, setFollowUpDate] = useState('After 7 days');
  const [isSaved, setIsSaved] = useState(false);

  // Sync state whenever modal opens or target appointment changes
  React.useEffect(() => {
    if (!appointment) return;
    const rx = appointment.prescription;
    setDiagnosis(
      rx?.diagnosis || (appointment.visitReason ? `${appointment.visitReason} - Evaluation` : 'General Clinical Consultation')
    );
    setMedicines(
      rx?.medicines && rx.medicines.length > 0
        ? rx.medicines
        : [
            { name: 'Tab Paracetamol 650mg', dosage: '1 Tab', timing: 'Sos after food (Max 3/day)', duration: '3 Days' },
            { name: 'Tab Pantoprazole 40mg', dosage: '1 Tab', timing: 'Empty stomach in morning', duration: '5 Days' }
          ]
    );
    setAdvice(rx?.advice || 'Adequate hydration (2.5L water/day), warm saline gargles, light nutritious diet.');
    setFollowUpDate(rx?.followUpDate || 'After 7 days');
    setIsSaved(false);
  }, [appointment, isOpen]);

  const docName = doctor?.name || appointment.doctorName || 'Dr. Rohan Gupta';
  const docSpecialty = doctor?.specialty || appointment.doctorSpecialty || 'General Physician';
  const docQuals = ('qualifications' in (doctor || {}) && (doctor as any).qualifications)
    ? (doctor as any).qualifications 
    : 'MBBS, MD (General Medicine)';
  const docReg = ('registrationNumber' in (doctor || {}) && (doctor as any).registrationNumber)
    ? (doctor as any).registrationNumber 
    : 'KMC-2015-88241';
  const clinicName = doctor?.clinicName || appointment.clinicName || 'MediNest Clinic';
  const clinicAddr = ('address' in (doctor || {}) && (doctor as any).address)
    ? (doctor as any).address 
    : appointment.clinicAddress || 'Indiranagar 100ft Road, Bengaluru';

  const handleAddMedicine = () => {
    setMedicines([
      ...medicines,
      { name: '', dosage: '1 Tab', timing: 'After meals', duration: '5 Days' }
    ]);
  };

  const handleRemoveMedicine = (index: number) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const handleMedicineChange = (index: number, field: keyof PrescriptionMedicine, value: string) => {
    const updated = [...medicines];
    updated[index] = { ...updated[index], [field]: value };
    setMedicines(updated);
  };

  const buildCurrentPrescription = (): Prescription => {
    const rx = appointment.prescription;
    return {
      id: rx?.id || `RX-MN-${appointment.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || '2026'}`,
      appointmentId: appointment.id,
      diagnosis: diagnosis.trim() || (appointment.visitReason ? `${appointment.visitReason} - Evaluation` : 'General Clinical Consultation'),
      medicines: medicines.filter(m => m.name.trim().length > 0),
      advice,
      followUpDate,
      issuedAt: rx?.issuedAt || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    };
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosis.trim()) {
      alert('Please enter a clinical diagnosis');
      return;
    }

    const newRx = buildCurrentPrescription();
    onSavePrescription(appointment.id, newRx);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1000);
  };

  const handleDownloadPDF = () => {
    const currentRx = buildCurrentPrescription();
    generatePrescriptionPDF(appointment, doctor, currentRx);
  };

  const currentRx = buildCurrentPrescription();

  return (
    <>
      {/* ─── PRINT ONLY MEDICAL A4 DOCUMENT ─────────────────────────────────── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #prescription-printable-document, #prescription-printable-document * {
            visibility: visible;
          }
          #prescription-printable-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            padding: 20px !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Hidden container formatted purely for browser window.print() */}
      <div id="prescription-printable-document" className="hidden print:block font-sans text-black">
        {/* Header */}
        <div className="border-b-2 border-[#032F31] pb-4 mb-4 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold text-[#032F31]">{docName}</h1>
            <p className="text-xs font-semibold text-slate-700">{docQuals} • {docSpecialty}</p>
            <p className="text-xs text-slate-600">{clinicName} — {clinicAddr}</p>
            <p className="text-xs text-teal-800 font-bold">NMC Registration No: {docReg}</p>
          </div>
          <div className="text-right">
            <div className="inline-block px-3 py-1 bg-[#032F31] text-[#FAE58D] text-xs font-bold rounded">
              OFFICIAL e-PRESCRIPTION
            </div>
            <p className="text-xs text-slate-500 mt-2">Rx ID: {currentRx.id}</p>
            <p className="text-xs text-slate-500">Date: {currentRx.issuedAt}</p>
          </div>
        </div>

        {/* Patient Details */}
        <div className="bg-slate-50 p-3 rounded border border-slate-300 text-xs mb-4 grid grid-cols-2 gap-2">
          <div>
            <p><strong className="text-slate-700">Patient Name:</strong> {appointment.patientName}</p>
            <p><strong className="text-slate-700">Age / Gender:</strong> {appointment.patientAge} Yrs / {appointment.patientGender}</p>
            <p><strong className="text-slate-700">Phone:</strong> {appointment.patientPhone}</p>
          </div>
          <div>
            <p><strong className="text-slate-700">Consultation Mode:</strong> {appointment.appointmentType === 'video' ? 'Video Consult' : 'Clinic Visit'}</p>
            <p><strong className="text-slate-700">Chief Complaint:</strong> {appointment.visitReason || 'General Evaluation'}</p>
          </div>
        </div>

        {/* Clinical Diagnosis */}
        <div className="mb-4 p-2.5 bg-teal-50 border border-teal-200 rounded text-xs">
          <strong className="text-teal-900 uppercase">Clinical Diagnosis: </strong>
          <span className="font-bold text-teal-950">{currentRx.diagnosis}</span>
        </div>

        {/* Medicines Table */}
        <div className="mb-6">
          <h2 className="text-sm font-bold text-[#032F31] mb-2 font-serif italic text-base">℞ Prescribed Medicines</h2>
          <table className="w-full text-xs border-collapse border border-slate-300">
            <thead>
              <tr className="bg-[#032F31] text-[#FAE58D]">
                <th className="border border-slate-300 p-2 text-left w-8">#</th>
                <th className="border border-slate-300 p-2 text-left">Medicine Name</th>
                <th className="border border-slate-300 p-2 text-left">Dosage</th>
                <th className="border border-slate-300 p-2 text-left">Timing & Frequency</th>
                <th className="border border-slate-300 p-2 text-right">Duration</th>
              </tr>
            </thead>
            <tbody>
              {currentRx.medicines.map((m, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                  <td className="border border-slate-300 p-2 font-bold">{idx + 1}</td>
                  <td className="border border-slate-300 p-2 font-bold text-teal-950">{m.name}</td>
                  <td className="border border-slate-300 p-2">{m.dosage}</td>
                  <td className="border border-slate-300 p-2">{m.timing}</td>
                  <td className="border border-slate-300 p-2 text-right">{m.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Advice */}
        {currentRx.advice && (
          <div className="mb-6 p-3 bg-slate-50 border border-slate-300 rounded text-xs">
            <strong className="text-slate-700 uppercase block mb-1">Doctor's Advice & Lifestyle Instructions:</strong>
            <p className="text-slate-800 leading-relaxed">{currentRx.advice}</p>
          </div>
        )}

        {/* Footer & Signature */}
        <div className="mt-12 pt-4 border-t border-slate-300 flex justify-between items-end text-xs">
          <div>
            <p><strong className="text-slate-700">Follow-up Date:</strong> {currentRx.followUpDate}</p>
            <p className="text-slate-500 text-[10px] mt-1">Valid under Telemedicine Practice Guidelines 2020</p>
          </div>
          <div className="text-right">
            <div className="w-40 border-b border-slate-400 mb-1 ml-auto"></div>
            <p className="font-bold text-[#032F31]">{docName}</p>
            <p className="text-slate-600 text-[10px]">Digitally Signed Medical Practitioner</p>
          </div>
        </div>
      </div>

      {/* ─── MODAL DIALOG ON SCREEN (no-print) ─────────────────────────────── */}
      <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
        <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
          {/* Header */}
          <div className="bg-[#032F31] text-white p-5 sm:p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FAE58D] text-[#032F31] flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Digital Prescription (e-Rx)
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    NMC Compliant
                  </span>
                </h3>
                <p className="text-xs text-slate-300">
                  Patient: <span className="font-semibold text-white">{appointment.patientName}</span> ({appointment.patientAge}y, {appointment.patientGender})
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Doctor Header Banner Preview */}
          <div className="bg-[#FAF7EE] border-b border-[#EAE4D4] p-4 text-xs text-[#032F31] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="font-bold text-sm text-[#032F31]">{docName}, {docQuals}</div>
              <div className="text-slate-600 text-[11px]">{clinicName} • {clinicAddr}</div>
            </div>
            <div className="text-right sm:text-right">
              <div className="font-semibold text-[11px] text-teal-800 flex items-center sm:justify-end gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> NMC Reg: {docReg}
              </div>
              <div className="text-slate-500 text-[10px]">Date: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            </div>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Reason for visit reference */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-700">Patient Chief Complaint: </span>
                <span className="text-slate-600">{appointment.visitReason || 'Routine consultation'}</span>
              </div>
            </div>

            {/* Clinical Diagnosis */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Clinical Diagnosis *
              </label>
              <input
                type="text"
                required
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g. Acute Upper Respiratory Tract Infection, Allergic Rhinitis, Type 2 Diabetes"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-700"
              />
            </div>

            {/* Medicines Rx Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-base text-teal-800 font-serif italic">℞</span> Prescribed Medicines
                </label>
                <button
                  type="button"
                  onClick={handleAddMedicine}
                  className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Medicine
                </button>
              </div>

              <div className="space-y-2.5">
                {medicines.map((med, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <div className="sm:col-span-4">
                      <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Medicine Name</span>
                      <input
                        type="text"
                        value={med.name}
                        onChange={(e) => handleMedicineChange(idx, 'name', e.target.value)}
                        placeholder="e.g. Tab Levocetirizine 5mg"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 font-medium focus:outline-none focus:border-teal-700"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Dosage</span>
                      <input
                        type="text"
                        value={med.dosage}
                        onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                        placeholder="1 Tab"
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:border-teal-700"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Frequency & Timing</span>
                      <input
                        type="text"
                        value={med.timing}
                        onChange={(e) => handleMedicineChange(idx, 'timing', e.target.value)}
                        placeholder="After food at bed"
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:border-teal-700"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Duration</span>
                      <input
                        type="text"
                        value={med.duration}
                        onChange={(e) => handleMedicineChange(idx, 'duration', e.target.value)}
                        placeholder="5 Days"
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:border-teal-700"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end pt-2 sm:pt-4">
                      <button
                        type="button"
                        onClick={() => handleRemoveMedicine(idx)}
                        disabled={medicines.length === 1}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors disabled:opacity-30 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* General Advice & Diet */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Doctor's Advice & Lifestyle Instructions
              </label>
              <textarea
                rows={2}
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                placeholder="e.g. Plenty of oral fluids, avoid cold food, steam inhalation twice a day..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-700"
              />
            </div>

            {/* Follow-up Date */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF7EE] border border-[#DDD6C5]">
              <div className="flex items-center gap-2 text-xs font-bold text-[#032F31]">
                <Calendar className="w-4 h-4 text-teal-800" />
                <span>Recommended Follow-up Review:</span>
              </div>
              <input
                type="text"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                placeholder="e.g. After 5 days"
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-teal-700"
              />
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-500" /> Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-xs font-bold transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-teal-700" /> Download PDF
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#032F31] hover:bg-[#074749] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  {isSaved ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-400" /> Saved!
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-[#FAE58D]" /> Issue Digital Prescription
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
