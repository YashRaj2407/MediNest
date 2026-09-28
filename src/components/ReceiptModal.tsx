import React, { useEffect } from 'react';
import { X, Printer, Download } from 'lucide-react';
import { Appointment } from '../types';
import { MediNestLogo } from './MediNestLogo';
import { generateReceiptPDF } from '../lib/receipts';

interface ReceiptModalProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  appointment,
  isOpen,
  onClose
}) => {
  if (!isOpen || !appointment) return null;

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleDownloadPDF = () => {
    generateReceiptPDF(appointment);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Print-only styles — hide overlay chrome from the printed/PDF page */}
      <style>{`
        @media print {
          body > *:not(#receipt-print-root) { display: none !important; }
          #receipt-print-root { display: block !important; position: static !important; }
          .print\\:hidden { display: none !important; }
          .receipt-overlay { background: none !important; backdrop-filter: none !important; padding: 0 !important; }
          .receipt-modal-shell { box-shadow: none !important; border: none !important; border-radius: 0 !important; max-height: none !important; overflow: visible !important; }
          .receipt-toolbar { display: none !important; }
          .receipt-body { overflow: visible !important; }
        }
      `}</style>

      <div
        id="receipt-print-root"
        className="receipt-overlay fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn print:hidden"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Modal shell — flex column, max-height capped to viewport */}
        <div className="receipt-modal-shell relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[calc(100vh-32px)] overflow-hidden my-4">

          {/* ── Sticky Toolbar (always visible) ── */}
          <div className="receipt-toolbar flex-shrink-0 p-4 bg-[#F4EFE2] border-b border-[#E2DCCE] flex items-center justify-between print:hidden">
            <span className="text-xs font-bold text-[#032F31]">Tax Invoice &amp; Appointment Receipt</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPDF}
                className="px-3 py-1.5 rounded-xl bg-[#032F31] hover:bg-[#074749] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-[#FAE58D]" />
                Download PDF
              </button>
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#D5CDBC] hover:bg-[#FAF7EE] text-xs font-bold text-[#032F31] flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#032F31]" />
                Print
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-[#EAE5D8] text-[#032F31] cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── Scrollable Invoice Body ── */}
          <div className="receipt-body flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-[#243B42] font-sans" id="printable-receipt">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-[#E2DCCE] pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#032F31] flex items-center justify-center text-[#FAE58D] p-1.5 shrink-0">
                  <MediNestLogo variant="gold" className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#032F31]">MediNest</h2>
                  <p className="text-[11px] text-[#526368] mt-0.5">
                    Digital Telehealth &amp; Clinic Appointment Services<br />
                    GSTIN: 29AAAAA0000A1Z5 | HSN Code: 999312
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-2.5 py-1 rounded-full bg-[#E8F3EE] text-[#032F31] font-bold text-[10px] uppercase border border-[#BCE0D1]">
                  PAID IN FULL (₹ INR)
                </span>
                <p className="text-xs font-mono font-bold text-[#032F31] mt-1">Receipt #{appointment.id}</p>
                <p className="text-[11px] text-[#526368]">Date: {appointment.createdAt}</p>
              </div>
            </div>

            {/* Patient & Doctor Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-[#FAF7EE] rounded-xl border border-[#E8E2D5]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#526368] block mb-1">Billed To (Patient)</span>
                <p className="font-bold text-[#032F31]">{appointment.patientName}</p>
                <p className="text-[#526368]">{appointment.patientGender}, {appointment.patientAge} Years</p>
                <p className="text-[#526368]">{appointment.patientPhone}</p>
                <p className="text-[#526368]">{appointment.patientEmail}</p>
              </div>

              <div className="p-3 bg-[#FAF7EE] rounded-xl border border-[#E8E2D5]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#526368] block mb-1">Doctor &amp; Clinic</span>
                <p className="font-bold text-[#032F31]">{appointment.doctorName}</p>
                <p className="text-[#526368]">{appointment.doctorSpecialty}</p>
                <p className="text-[#526368]">{appointment.clinicName}</p>
                <p className="text-[#526368]">{appointment.city}</p>
              </div>
            </div>

            {/* Appointment Particulars */}
            <div className="p-3.5 rounded-xl border border-[#E2DCCE] text-xs space-y-2 bg-[#FAF7EE]">
              <div className="flex justify-between">
                <span className="text-[#526368]">Scheduled Date:</span>
                <strong className="text-[#032F31]">{appointment.date}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#526368]">Scheduled Time Slot:</span>
                <strong className="text-[#032F31]">{appointment.timeSlot}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#526368]">Consultation Mode:</span>
                <strong className="text-[#032F31] capitalize">
                  {appointment.appointmentType === 'video' ? 'HD Tele-Consultation (Online)' : 'In-Person Clinic Visit'}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#526368]">Payment Mode / Txn ID:</span>
                <span className="font-mono text-[#032F31]">{appointment.paymentMethod} • {appointment.paymentTransactionId}</span>
              </div>
            </div>

            {/* Financial Breakdown Table in INR */}
            <div className="space-y-2">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#E2DCCE] text-[#526368] font-bold uppercase text-[10px]">
                    <th className="py-2">Description</th>
                    <th className="py-2 text-right">Amount (₹ INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE5D8]">
                  <tr>
                    <td className="py-2.5">
                      Medical Specialist Consultation Fee ({appointment.doctorSpecialty})
                    </td>
                    <td className="py-2.5 text-right font-bold text-[#032F31]">
                      ₹{appointment.feeINR}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2">Platform Processing Convenience Fee</td>
                    <td className="py-2 text-right text-emerald-700 font-bold">₹0.00 (Waived)</td>
                  </tr>
                  <tr>
                    <td className="py-2">Applicable Taxes (inclusive)</td>
                    <td className="py-2 text-right text-[#526368]">Included</td>
                  </tr>
                  <tr className="border-t-2 border-[#032F31] text-sm font-bold text-[#032F31]">
                    <td className="py-3">Total Amount Paid</td>
                    <td className="py-3 text-right text-base">₹{appointment.totalINR}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer note */}
            <div className="text-[11px] text-[#526368] text-center pt-2 border-t border-[#E2DCCE] space-y-1">
              <p className="font-medium text-[#032F31]">
                Thank you for trusting MediNest.
              </p>
              <p>
                This is a computer-generated tax invoice. No physical signature is required under the Indian IT Act 2000.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
