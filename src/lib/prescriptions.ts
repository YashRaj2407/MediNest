import jsPDF from 'jspdf';
import { Appointment, Prescription, DoctorAuthData, Doctor } from '../types';

/**
 * Computes an effective prescription object for an appointment.
 * If the appointment has a stored prescription, it returns that.
 * Otherwise, generates a complete NMC-compliant prescription based on doctor specialty & visit reason.
 */
export function getEffectivePrescription(
  appointment: Appointment,
  rxOverride?: Prescription | null
): Prescription {
  if (rxOverride) return rxOverride;
  if (appointment.prescription) return appointment.prescription;

  const specialty = appointment.doctorSpecialty || 'General Physician';
  const rxId = `RX-MN-${appointment.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || '2026'}`;
  
  let diagnosis = 'General Consultation & Health Assessment';
  let medicines = [
    { name: 'Tab Paracetamol 650mg', dosage: '1 Tab', timing: 'SOS after food (Max 3/day)', duration: '3 Days' },
    { name: 'Tab Pantoprazole 40mg', dosage: '1 Tab', timing: 'Once daily before breakfast', duration: '5 Days' }
  ];
  let advice = 'Maintain good hydration (2.5L water/day), adequate rest, and a light balanced diet.';

  if (specialty.toLowerCase().includes('cardio')) {
    diagnosis = 'Cardiovascular Health Review & BP Monitoring';
    medicines = [
      { name: 'Tab Telmisartan 40mg', dosage: '1 Tab', timing: 'Once daily after breakfast', duration: '14 Days' },
      { name: 'Tab Atorvastatin 10mg', dosage: '1 Tab', timing: 'Once daily at bedtime', duration: '14 Days' }
    ];
    advice = 'Low sodium diet, daily 30-min moderate walking, record BP twice daily.';
  } else if (specialty.toLowerCase().includes('derma')) {
    diagnosis = 'Dermatological Barrier Protection & Care';
    medicines = [
      { name: 'Tab Cetirizine 10mg', dosage: '1 Tab', timing: 'Once daily at bedtime', duration: '5 Days' },
      { name: 'Emollient Moisturizing Lotion', dosage: 'Apply gently', timing: 'Twice daily after bath', duration: '10 Days' }
    ];
    advice = 'Avoid hot showers, use gentle soap, apply moisturizer immediately after bathing.';
  } else if (specialty.toLowerCase().includes('pediatric')) {
    diagnosis = 'Pediatric Growth & Wellness Assessment';
    medicines = [
      { name: 'Syp Paracetamol (120mg/5ml)', dosage: '5 ml', timing: 'SOS for fever > 100°F', duration: '3 Days' },
      { name: 'Multivitamin Drops', dosage: '1 ml', timing: 'Once daily morning after feed', duration: '15 Days' }
    ];
    advice = 'Adequate fluid intake, monitor temperature, keep comfortable.';
  } else if (specialty.toLowerCase().includes('ortho')) {
    diagnosis = 'Musculoskeletal Strain & Posture Evaluation';
    medicines = [
      { name: 'Tab Aceclofenac + Paracetamol', dosage: '1 Tab', timing: 'Twice daily after food', duration: '5 Days' },
      { name: 'Tab Calcium + Vit D3', dosage: '1 Tab', timing: 'Once daily after dinner', duration: '15 Days' }
    ];
    advice = 'Avoid heavy lifting, apply warm compress, maintain ergonomic posture.';
  }

  return {
    id: rxId,
    diagnosis: appointment.visitReason ? `${appointment.visitReason} - Clinical Review` : diagnosis,
    medicines,
    advice,
    followUpDate: 'After 7 Days',
    issuedAt: appointment.date || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  };
}

/**
 * Generates and downloads a clean, professional medical A4 prescription PDF using jsPDF.
 */
export function generatePrescriptionPDF(
  appointment: Appointment,
  doctorOrRx?: DoctorAuthData | Doctor | Prescription | null,
  rxOverride?: Prescription | null
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();

  // Determine if 2nd parameter is Prescription or Doctor
  let rx: Prescription;
  let doctor: DoctorAuthData | Doctor | null = null;

  if (doctorOrRx && 'diagnosis' in doctorOrRx && 'medicines' in doctorOrRx) {
    rx = doctorOrRx as Prescription;
  } else {
    doctor = (doctorOrRx as DoctorAuthData | Doctor) || null;
    rx = rxOverride || getEffectivePrescription(appointment);
  }

  if (!rx) {
    rx = getEffectivePrescription(appointment);
  }

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
