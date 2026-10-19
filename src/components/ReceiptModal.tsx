import React, { useEffect } from 'react';
import { X, Printer, Download } from 'lucide-react';
import { Appointment } from '../types';
import { MediNestLogo } from './MediNestLogo';
import { generateReceiptPDF } from '../lib/receipts';
import { formatTimeSlotRange } from '../lib/appointments';

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
      {/* ─── PRINT-ONLY MEDICAL A4 RECEIPT STYLES ───────────────────────────────── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #receipt-printable-document, #receipt-printable-document * {
            visibility: visible !important;
          }
          #receipt-printable-document {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #1a202c !important;
            padding: 32px !important;
            box-sizing: border-box !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 12mm;
          }
        }
      `}</style>

      {/* ─── PRINTABLE DOCUMENT (Visible only during browser print preview) ─────── */}
      <div id="receipt-printable-document" className="hidden print:block font-sans text-slate-900 bg-white">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #032F31', paddingBottom: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', backgroundColor: '#032F31', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px' }}>
              <MediNestLogo variant="gold" className="w-7 h-7" />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#032F31', margin: 0, lineHeight: 1.1 }}>MediNest</h1>
              <p style={{ fontSize: '11px', color: '#526368', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                Digital Telehealth &amp; Clinic Appointment Services<br />
                GSTIN: 29AAAAA0000A1Z5 | HSN Code: 999312
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', backgroundColor: '#E8F3EE', color: '#032F31', fontWeight: '700', fontSize: '10px', border: '1px solid #BCE0D1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              PAID IN FULL (₹ INR)
            </span>
            <p style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '12px', color: '#032F31', margin: '6px 0 2px 0' }}>
              Receipt #{appointment.id}
            </p>
            <p style={{ fontSize: '11px', color: '#526368', margin: 0 }}>
              Date: {appointment.createdAt}
            </p>
          </div>
        </div>

        {/* Patient & Doctor Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div style={{ padding: '14px', backgroundColor: '#FAF7EE', borderRadius: '12px', border: '1px solid #E8E2D5' }}>
            <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#526368', display: 'block', marginBottom: '4px' }}>
              Billed To (Patient)
            </span>
            <p style={{ fontWeight: '700', color: '#032F31', fontSize: '13px', margin: '0 0 4px 0' }}>{appointment.patientName}</p>
            <p style={{ fontSize: '11px', color: '#526368', margin: '2px 0' }}>{appointment.patientGender}, {appointment.patientAge} Years</p>
            <p style={{ fontSize: '11px', color: '#526368', margin: '2px 0' }}>{appointment.patientPhone}</p>
            <p style={{ fontSize: '11px', color: '#526368', margin: '2px 0' }}>{appointment.patientEmail}</p>
          </div>

          <div style={{ padding: '14px', backgroundColor: '#FAF7EE', borderRadius: '12px', border: '1px solid #E8E2D5' }}>
            <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#526368', display: 'block', marginBottom: '4px' }}>
              Doctor &amp; Clinic
            </span>
            <p style={{ fontWeight: '700', color: '#032F31', fontSize: '13px', margin: '0 0 4px 0' }}>{appointment.doctorName}</p>
            <p style={{ fontSize: '11px', color: '#526368', margin: '2px 0' }}>{appointment.doctorSpecialty}</p>
            <p style={{ fontSize: '11px', color: '#526368', margin: '2px 0' }}>{appointment.clinicName}</p>
            <p style={{ fontSize: '11px', color: '#526368', margin: '2px 0' }}>{appointment.city}</p>
          </div>
        </div>

        {/* Appointment Particulars */}
        <div style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid #E2DCCE', backgroundColor: '#FAF7EE', marginBottom: '20px', fontSize: '11px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
            <span style={{ color: '#526368' }}>Scheduled Date:</span>
            <strong style={{ color: '#032F31' }}>{appointment.date}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
            <span style={{ color: '#526368' }}>Scheduled Time Slot:</span>
            <strong style={{ color: '#032F31' }}>{formatTimeSlotRange(appointment.timeSlot)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
            <span style={{ color: '#526368' }}>Consultation Mode:</span>
            <strong style={{ color: '#032F31', textTransform: 'capitalize' }}>
              {appointment.appointmentType === 'video' ? 'HD Tele-Consultation (Online)' : 'In-Person Clinic Visit'}
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
            <span style={{ color: '#526368' }}>Payment Mode / Txn ID:</span>
            <span style={{ fontFamily: 'monospace', color: '#032F31', fontWeight: '600' }}>{appointment.paymentMethod} • {appointment.paymentTransactionId}</span>
          </div>
        </div>

        {/* Financial Breakdown Table in INR */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '24px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E2DCCE' }}>
              <th style={{ padding: '8px 0', color: '#526368', fontWeight: '700', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em', textAlign: 'left' }}>Description</th>
              <th style={{ padding: '8px 0', color: '#526368', fontWeight: '700', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em', textAlign: 'right' }}>Amount (₹ INR)</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #EAE5D8' }}>
              <td style={{ padding: '10px 0', color: '#243B42' }}>
                Medical Specialist Consultation Fee ({appointment.doctorSpecialty})
              </td>
              <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: '700', color: '#032F31' }}>
                ₹{appointment.feeINR}
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #EAE5D8' }}>
              <td style={{ padding: '8px 0', color: '#243B42' }}>Platform Processing Convenience Fee</td>
              <td style={{ padding: '8px 0', textAlign: 'right', color: '#16a34a', fontWeight: '700' }}>₹0.00 (Waived)</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #EAE5D8' }}>
              <td style={{ padding: '8px 0', color: '#243B42' }}>Applicable Taxes (inclusive)</td>
              <td style={{ padding: '8px 0', textAlign: 'right', color: '#526368' }}>Included</td>
            </tr>
            <tr style={{ borderTop: '2px solid #032F31' }}>
              <td style={{ padding: '12px 0', fontWeight: '800', fontSize: '13px', color: '#032F31' }}>Total Amount Paid</td>
              <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: '800', fontSize: '15px', color: '#032F31' }}>₹{appointment.totalINR}</td>
            </tr>
          </tbody>
        </table>

        {/* Footer note */}
        <div style={{ borderTop: '1px solid #E2DCCE', paddingTop: '16px', textAlign: 'center', fontSize: '10px', color: '#526368', lineHeight: 1.6 }}>
          <p style={{ fontWeight: '700', color: '#032F31', margin: '0 0 2px 0' }}>
            Thank you for trusting MediNest.
          </p>
          <p style={{ margin: 0 }}>
            This is a computer-generated tax invoice. No physical signature is required under the Indian IT Act 2000.
          </p>
        </div>
      </div>

      {/* ─── ON-SCREEN MODAL DIALOG (Hidden during print) ─────────────────────── */}
      <div
        className="no-print fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Modal shell — flex column, max-height capped to viewport */}
        <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[calc(100vh-32px)] overflow-hidden my-4">

          {/* Sticky Toolbar */}
          <div className="flex-shrink-0 p-4 bg-[#F4EFE2] border-b border-[#E2DCCE] flex items-center justify-between">
            <span className="text-xs font-bold text-[#032F31]">Tax Invoice &amp; Appointment Receipt</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="px-3 py-1.5 rounded-xl bg-[#032F31] hover:bg-[#074749] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#FAE58D]" />
                Download PDF
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#D5CDBC] hover:bg-[#FAF7EE] text-xs font-bold text-[#032F31] flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-[#032F31]" />
                Print
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-[#EAE5D8] text-[#032F31] cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Invoice Body */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-[#243B42] font-sans">
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
                <strong className="text-[#032F31]">{formatTimeSlotRange(appointment.timeSlot)}</strong>
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
