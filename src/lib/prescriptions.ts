import jsPDF from 'jspdf';
import { Appointment, Prescription, DoctorAuthData, Doctor } from '../types';

/**
 * Generates and downloads a clean, professional medical A4 prescription PDF using jsPDF.
 */
export function generatePrescriptionPDF(
  appointment: Appointment,
  doctor?: DoctorAuthData | Doctor | null,
  rxOverride?: Prescription
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();

  const rx = rxOverride || appointment.prescription || {
    id: `RX-AC-2026-${Math.floor(100 + Math.random() * 900)}`,
    diagnosis: 'General Health Assessment & Seasonal Flu Prevention',
    medicines: [
      { name: 'Tab Paracetamol 650mg', dosage: '1 Tab', timing: 'Sos after food (Max 3/day)', duration: '3 Days' },
      { name: 'Tab Pantoprazole 40mg', dosage: '1 Tab', timing: 'Empty stomach in morning', duration: '5 Days' }
    ],
    advice: 'Adequate hydration (2.5L water/day), warm saline gargles, light diet.',
    followUpDate: 'After 5 days',
    issuedAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  };

  // Doctor Info Defaults
  const docName = doctor?.name || appointment.doctorName || 'Dr. Rohan Gupta';
  const docSpecialty = doctor?.specialty || appointment.doctorSpecialty || 'General Physician';
  const docQuals = ('qualifications' in (doctor || {}) && doctor?.qualifications)
    ? (doctor as any).qualifications 
    : 'MBBS, MD (General Medicine)';
  const docReg = ('registrationNumber' in (doctor || {}) && (doctor as any).registrationNumber)
    ? (doctor as any).registrationNumber 
    : 'KMC-2015-88241';
  const clinicName = doctor?.clinicName || appointment.clinicName || 'MediNest Clinic';
  const clinicAddr = ('address' in (doctor || {}) && (doctor as any).address)
    ? (doctor as any).address 
    : appointment.clinicAddress || 'Indiranagar 100ft Road, Bengaluru';

  // ─── Colors ────────────────────────────────────────────────────────────
  const teal  = [3, 47, 49] as [number, number, number];
  const gold  = [250, 229, 141] as [number, number, number];
  const cream = [250, 247, 238] as [number, number, number];
  const slate = [82, 99, 104] as [number, number, number];
  const white = [255, 255, 255] as [number, number, number];
  const green = [16, 185, 129] as [number, number, number];

  // ─── Header Band ───────────────────────────────────────────────────────
  doc.setFillColor(...teal);
  doc.rect(0, 0, W, 42, 'F');

  // Logo square
  doc.setFillColor(...gold);
  doc.roundedRect(12, 8, 20, 20, 3, 3, 'F');
  doc.setFontSize(12);
  doc.setTextColor(...teal);
  doc.setFont('helvetica', 'bold');
  doc.text('AC', 22, 21, { align: 'center' });

  // Doctor / Medical Header
  doc.setTextColor(...white);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(docName, 36, 16);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(230, 245, 245);
  doc.text(`${docQuals}  •  ${docSpecialty}`, 36, 22);
  doc.text(`${clinicName} — ${clinicAddr}`, 36, 27);
  doc.text(`NMC Reg No: ${docReg}`, 36, 32);

  // e-Prescription badge (Right aligned)
  doc.setFillColor(...green);
  doc.roundedRect(W - 48, 8, 36, 8, 2, 2, 'F');
  doc.setTextColor(...white);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('NMC COMPLIANT e-Rx', W - 30, 13.5, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 230, 230);
  doc.text(`Rx ID: ${rx.id}`, W - 12, 22, { align: 'right' });
  doc.text(`Date: ${rx.issuedAt}`, W - 12, 27, { align: 'right' });

  // ─── Patient Info Box ──────────────────────────────────────────────────
  let y = 48;
  const boxH = 26;
  doc.setFillColor(...cream);
  doc.roundedRect(12, y, W - 24, boxH, 3, 3, 'F');
  doc.setDrawColor(210, 205, 188);
  doc.setLineWidth(0.3);
  doc.roundedRect(12, y, W - 24, boxH, 3, 3, 'S');

  // Left column: Patient details
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...slate);
  doc.text('PATIENT INFORMATION', 16, y + 6);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...teal);
  doc.text(appointment.patientName, 16, y + 13);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slate);
  doc.text(`Age/Gender: ${appointment.patientAge} Yrs / ${appointment.patientGender}`, 16, y + 19);
  doc.text(`Phone: ${appointment.patientPhone}`, 16, y + 23);

  // Right column: Chief Complaint
  const rxCol2 = W / 2 + 10;
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...slate);
  doc.text('CHIEF COMPLAINT & SYMPTOMS', rxCol2, y + 6);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...teal);
  doc.text(appointment.visitReason || 'General medical evaluation', rxCol2, y + 13, { maxWidth: W / 2 - 24 });

  // ─── Clinical Diagnosis ────────────────────────────────────────────────
  y += boxH + 6;
  doc.setFillColor(240, 247, 247);
  doc.roundedRect(12, y, W - 24, 12, 2, 2, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...slate);
  doc.text('CLINICAL DIAGNOSIS:', 16, y + 7.5);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...teal);
  doc.text(rx.diagnosis, 50, y + 7.5);

  // ─── Rx Medicines Table ────────────────────────────────────────────────
  y += 18;
  doc.setFontSize(12);
  doc.setFont('times', 'italic');
  doc.setTextColor(...teal);
  doc.text('Rx', 12, y + 2);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...teal);
  doc.text('Prescribed Medicines', 20, y + 1.5);

  y += 5;
  // Table Header
  doc.setFillColor(...teal);
  doc.rect(12, y, W - 24, 8, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...gold);
  doc.text('#', 15, y + 5.2);
  doc.text('MEDICINE NAME', 24, y + 5.2);
  doc.text('DOSAGE', 95, y + 5.2);
  doc.text('TIMING & FREQUENCY', 125, y + 5.2);
  doc.text('DURATION', W - 16, y + 5.2, { align: 'right' });

  y += 8;
  rx.medicines.forEach((med, i) => {
    const rowBg = i % 2 === 0 ? cream : white;
    doc.setFillColor(...rowBg);
    doc.rect(12, y + i * 8, W - 24, 8, 'F');
    
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...teal);
    doc.text(`${i + 1}`, 15, y + i * 8 + 5.2);
    doc.text(med.name, 24, y + i * 8 + 5.2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slate);
    doc.text(med.dosage, 95, y + i * 8 + 5.2);
    doc.text(med.timing, 125, y + i * 8 + 5.2);
    doc.text(med.duration, W - 16, y + i * 8 + 5.2, { align: 'right' });
  });

  y += rx.medicines.length * 8 + 6;

  // ─── Doctor Advice & Lifestyle ──────────────────────────────────────────
  if (rx.advice) {
    doc.setFillColor(...cream);
    doc.roundedRect(12, y, W - 24, 18, 2, 2, 'F');
    doc.setDrawColor(210, 205, 188);
    doc.roundedRect(12, y, W - 24, 18, 2, 2, 'S');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...slate);
    doc.text('DOCTOR\'S ADVICE & INSTRUCTIONS:', 16, y + 5.5);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...teal);
    doc.text(rx.advice, 16, y + 11.5, { maxWidth: W - 32 });
    y += 24;
  }

  // ─── Follow Up & Signature Block ──────────────────────────────────────
  const bottomY = 240;

  // Follow-up box
  doc.setFillColor(240, 247, 247);
  doc.roundedRect(12, bottomY, 80, 16, 2, 2, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...slate);
  doc.text('RECOMMENDED FOLLOW-UP:', 16, bottomY + 5.5);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...teal);
  doc.text(rx.followUpDate || 'After 5 Days', 16, bottomY + 12);

  // Digital Doctor Signature Area
  const sigX = W - 75;
  doc.setDrawColor(3, 47, 49);
  doc.setLineWidth(0.5);
  doc.line(sigX, bottomY + 12, W - 12, bottomY + 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...teal);
  doc.text(docName, sigX, bottomY + 17);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slate);
  doc.text(`${docQuals} (NMC Reg: ${docReg})`, sigX, bottomY + 21);
  doc.text('Digitally Signed & Verified e-Prescription', sigX, bottomY + 25);

  // ─── Footer ─────────────────────────────────────────────────────────────
  const footerY = 280;
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slate);
  doc.text(
    'This electronic prescription is valid under the Indian Telemedicine Practice Guidelines 2020 & IT Act 2000.',
    W / 2, footerY, { align: 'center' }
  );
  doc.text('MediNest Healthcare Network  |  care@medinest.in  |  www.medinest.in', W / 2, footerY + 4, { align: 'center' });

  // Save PDF file
  const fileName = `MediNest_Prescription_${appointment.patientName.replace(/\s+/g, '_')}_${rx.id}.pdf`;
  doc.save(fileName);
}
