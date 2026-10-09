import jsPDF from 'jspdf';
import { Appointment } from '../types';
import { genReceiptNumber } from './appointments';

/**
 * Generates and downloads a real PDF receipt for an appointment using jsPDF.
 */
export function generateReceiptPDF(appointment: Appointment): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();

  // ─── Colors ────────────────────────────────────────────────────────────
  const teal  = [3, 47, 49] as [number, number, number];
  const gold  = [250, 229, 141] as [number, number, number];
  const cream = [250, 247, 238] as [number, number, number];
  const slate = [82, 99, 104] as [number, number, number];
  const white = [255, 255, 255] as [number, number, number];
  const green = [16, 185, 129] as [number, number, number];

  // ─── Header band ───────────────────────────────────────────────────────
  doc.setFillColor(...teal);
  doc.rect(0, 0, W, 42, 'F');

  // Logo square
  doc.setFillColor(...gold);
  doc.roundedRect(12, 8, 20, 20, 3, 3, 'F');
  doc.setFontSize(12);
  doc.setTextColor(...teal);
  doc.setFont('helvetica', 'bold');
  doc.text('AC', 22, 21, { align: 'center' });

  // Brand name
  doc.setTextColor(...white);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('MediNest', 36, 17);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 230, 230);
  doc.text('Digital Telehealth & Clinic Appointment Services', 36, 23);
  doc.text('GSTIN: 29AAAAA0000A1Z5  |  HSN Code: 999312', 36, 28);

  // "PAID IN FULL" badge
  doc.setFillColor(...green);
  doc.roundedRect(W - 50, 10, 38, 9, 2, 2, 'F');
  doc.setTextColor(...white);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('PAID IN FULL (Rs.  INR)', W - 31, 15.5, { align: 'center' });

  // Receipt number + date
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 230, 230);
  doc.text(`Receipt #${appointment.id}`, W - 12, 23, { align: 'right' });
  doc.text(`Issued: ${appointment.createdAt}`, W - 12, 28, { align: 'right' });

  // ─── Patient & Doctor Info boxes ────────────────────────────────────────
  let y = 50;
  const boxH = 34;
  const halfW = (W - 24) / 2;

  // Patient box
  doc.setFillColor(...cream);
  doc.roundedRect(12, y, halfW, boxH, 3, 3, 'F');
  doc.setDrawColor(210, 205, 188);
  doc.setLineWidth(0.3);
  doc.roundedRect(12, y, halfW, boxH, 3, 3, 'S');

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...slate);
  doc.text('BILLED TO (PATIENT)', 16, y + 6);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...teal);
  doc.text(appointment.patientName, 16, y + 13);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slate);
  doc.text(`${appointment.patientGender}, ${appointment.patientAge} Years`, 16, y + 19);
  doc.text(appointment.patientPhone, 16, y + 24);
  doc.text(appointment.patientEmail, 16, y + 29);

  // Doctor box
  const dx = 12 + halfW + 8;
  doc.setFillColor(...cream);
  doc.roundedRect(dx, y, halfW, boxH, 3, 3, 'F');
  doc.setDrawColor(210, 205, 188);
  doc.roundedRect(dx, y, halfW, boxH, 3, 3, 'S');

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...slate);
  doc.text('DOCTOR & CLINIC', dx + 4, y + 6);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...teal);
  doc.text(appointment.doctorName, dx + 4, y + 13);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slate);
  doc.text(appointment.doctorSpecialty, dx + 4, y + 19);
  doc.text(appointment.clinicName, dx + 4, y + 24, { maxWidth: halfW - 8 });
  doc.text(appointment.city, dx + 4, y + 30);

  // ─── Appointment Details box ────────────────────────────────────────────
  y += boxH + 8;
  doc.setFillColor(...cream);
  doc.roundedRect(12, y, W - 24, 36, 3, 3, 'F');
  doc.setDrawColor(210, 205, 188);
  doc.roundedRect(12, y, W - 24, 36, 3, 3, 'S');

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...slate);
  doc.text('APPOINTMENT DETAILS', 16, y + 6);

  const details: [string, string][] = [
    ['Appointment Date:', appointment.date],
    ['Selected Time Slot:', appointment.timeSlot],
    ['Consultation Mode:', appointment.appointmentType === 'video' ? 'HD Tele-Consultation (Online)' : 'In-Person Clinic Visit'],
    ['Payment Method / Txn ID:', `${appointment.paymentMethod}  •  ${appointment.paymentTransactionId}`],
  ];

  details.forEach(([label, value], i) => {
    const row = y + 13 + i * 6;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slate);
    doc.text(label, 16, row);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...teal);
    doc.text(value, 90, row);
  });

  // ─── Fee breakdown table ─────────────────────────────────────────────────
  y += 36 + 8;

  // Table header
  doc.setFillColor(...teal);
  doc.rect(12, y, W - 24, 8, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...gold);
  doc.text('DESCRIPTION', 16, y + 5.2);
  doc.text('AMOUNT (Rs.  INR)', W - 14, y + 5.2, { align: 'right' });

  const rows: [string, string, boolean][] = [
    [`Medical Specialist Consultation Fee (${appointment.doctorSpecialty})`, `Rs. ${appointment.feeINR}`, false],
    ['Platform Processing Convenience Fee', 'Rs. 0.00 (Waived)', false],
    ['Applicable Taxes (inclusive)', 'Included', false],
  ];

  y += 8;
  rows.forEach(([desc, amount, highlight], i) => {
    const rowBg = i % 2 === 0 ? cream : white;
    doc.setFillColor(...rowBg);
    doc.rect(12, y + i * 8, W - 24, 8, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slate);
    doc.text(desc, 16, y + i * 8 + 5.2);
    doc.setFont(highlight ? 'bold' : 'normal', 'normal');
    doc.setTextColor(highlight ? teal[0] : slate[0], highlight ? teal[1] : slate[1], highlight ? teal[2] : slate[2]);
    doc.text(amount, W - 14, y + i * 8 + 5.2, { align: 'right' });
  });

  // Total row
  y += rows.length * 8;
  doc.setFillColor(3, 47, 49);
  doc.rect(12, y, W - 24, 10, 'F');
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...gold);
  doc.text('TOTAL AMOUNT PAID', 16, y + 6.8);
  doc.text(`Rs. ${appointment.totalINR}`, W - 14, y + 6.8, { align: 'right' });

  // ─── Footer ─────────────────────────────────────────────────────────────
  y += 18;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slate);
  doc.text('Thank you for trusting MediNest.', W / 2, y, { align: 'center' });
  doc.text(
    'This is a computer-generated tax invoice. No physical signature required under the Indian IT Act 2000.',
    W / 2, y + 5, { align: 'center' }
  );
  doc.text('For support: support@medinest.in  |  www.medinest.in', W / 2, y + 10, { align: 'center' });

  // Thin teal line at bottom
  doc.setDrawColor(...teal);
  doc.setLineWidth(0.8);
  doc.line(12, y + 15, W - 12, y + 15);

  // ─── Save ────────────────────────────────────────────────────────────────
  const fileName = `MediNest_Receipt_${appointment.id}.pdf`;
  doc.save(fileName);
}

/**
 * Saves a receipt record.
 */
export async function saveReceiptRecord(
  appointmentId: string
): Promise<string> {
  const receiptNumber = genReceiptNumber();

  try {
    const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
    await fetch(`${API_BASE_URL}/receipts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appointment_id: appointmentId,
        receipt_number: receiptNumber,
      }),
    });
  } catch (err) {
    console.warn('[MediNest] Receipt record save failed:', err);
  }

  return receiptNumber;
}
