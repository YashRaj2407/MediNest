import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  ShieldAlert,
  Send,
  CheckCircle2,
  Lock,
  FileText,
  Loader2,
  Info
} from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { Doctor } from '../types';

interface ReportDoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: {
    id: string;
    name: string;
    specialty?: string;
    clinicName?: string;
  } | null;
  appointmentId?: string;
  patientUserId?: string;
  onReportSubmitted?: (reportId: string) => void;
}

const REPORT_CATEGORIES = [
  { value: 'unprofessional_behaviour', label: 'Unprofessional Behaviour', desc: 'Rude conduct, lack of care, or poor communication' },
  { value: 'missed_appointment', label: 'Missed Appointment / No-Show', desc: 'Doctor did not join video room or was absent at clinic' },
  { value: 'false_credentials', label: 'Suspected False Credentials', desc: 'Concerns about NMC license, qualification, or identity' },
  { value: 'billing_issue', label: 'Billing or Overcharging Issue', desc: 'Discrepancy in fee, extra charges, or receipt issues' },
  { value: 'inappropriate_conduct', label: 'Inappropriate or Harmful Conduct', desc: 'Safety concerns or medical boundary violations' },
  { value: 'other', label: 'Other Clinical Concern', desc: 'Other grievance requiring administrative review' }
];

export const ReportDoctorModal: React.FC<ReportDoctorModalProps> = ({
  isOpen,
  onClose,
  doctor,
  appointmentId,
  patientUserId,
  onReportSubmitted
}) => {
  const { getToken, isSignedIn } = useAuth();

  const [category, setCategory] = useState(REPORT_CATEGORIES[0].value);
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);

  if (!isOpen || !doctor) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!description.trim() || description.trim().length < 15) {
      setError('Please provide a detailed description (at least 15 characters) to help our clinical board investigate.');
      return;
    }

    setSubmitting(true);
    try {
      let token = '';
      try {
        if (getToken) token = (await getToken()) || '';
      } catch (_) {}

      const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

      const res = await fetch(`${API_BASE_URL}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(patientUserId ? { 'x-user-id': patientUserId } : {})
        },
        body: JSON.stringify({
          doctorId: doctor.id,
          category,
          description: description.trim() + (appointmentId ? `\n[Associated Booking ID: ${appointmentId}]` : ''),
          evidenceUrl: evidenceUrl.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to submit report. Please try again.');
        return;
      }

      setSubmittedReportId(data.reportId || 'RPT-ACK');
      if (onReportSubmitted) onReportSubmitted(data.reportId);
    } catch (err: any) {
      setError(err.message || 'Network error submitting report. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setCategory(REPORT_CATEGORIES[0].value);
    setDescription('');
    setEvidenceUrl('');
    setError(null);
    setSubmittedReportId(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) handleResetAndClose(); }}
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">

        {/* Modal Header */}
        <div className="bg-[#0C182B] text-white p-6 relative">
          <button
            onClick={handleResetAndClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold tracking-wider uppercase border border-rose-500/30">
                <AlertTriangle className="w-3 h-3" /> Confidential Patient Grievance
              </div>
              <h2 className="text-lg font-bold tracking-tight text-white mt-0.5">
                Report Medical Specialist
              </h2>
            </div>
          </div>

          <p className="text-xs text-slate-300">
            Reporting <strong>{doctor.name}</strong>
            {doctor.specialty ? ` (${doctor.specialty})` : ''}. All reports are reviewed by our medical directorate.
          </p>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {submittedReportId ? (
            /* Success confirmation screen */
            <div className="text-center py-6 space-y-4 animate-fadeIn">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Grievance Submitted Confidentially</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Your reference ID is <code className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{submittedReportId.slice(0, 13)}</code>.
                  Our administrative and clinical ethics team investigates every complaint thoroughly.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Lock className="w-3.5 h-3.5 text-teal-700" /> Whistleblower &amp; Patient Protection:
                </div>
                <p className="text-[11px] text-slate-500">
                  Your personal identity is shielded and kept strictly confidential. The doctor cannot view your private contact information.
                </p>
              </div>

              <button
                type="button"
                onClick={handleResetAndClose}
                className="w-full py-3 rounded-xl bg-[#0C182B] text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Done / Close Window
              </button>
            </div>
          ) : (
            /* Reporting form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Category Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nature of Concern *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-rose-600 bg-slate-50/50"
                >
                  {REPORT_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  {REPORT_CATEGORIES.find(c => c.value === category)?.desc}
                </p>
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Detailed Explanation *
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {description.length} characters (min 15)
                  </span>
                </div>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what occurred, dates, time of consultation, or specific clinical/behavioral details..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-rose-600 bg-slate-50/50 resize-none"
                />
              </div>

              {/* Optional Link / Evidence URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Supporting Evidence / Document Link <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="e.g. drive link, prescription reference, or transaction ID"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-rose-600 bg-slate-50/50"
                />
              </div>

              {/* Notice */}
              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  MediNest maintains a zero-tolerance policy for medical misconduct. Submitting this form initiates an administrative case file.
                </span>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || description.trim().length < 15}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
                >
                  {submitting ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting…</>
                  ) : (
                    <><Send className="w-3.5 h-3.5" /> Submit Confidential Report</>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};
