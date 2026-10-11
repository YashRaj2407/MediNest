export type ConsultationType = 'video' | 'clinic';

export interface DoctorReview {
  id: string;
  author: string;
  city: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
}

export interface DoctorService {
  name: string;
  feeINR: number;
}

export interface Doctor {
  id: string;
  name: string;
  gender: 'male' | 'female';
  photo: string;
  specialty: string;
  specialtyId: string;
  qualifications: string;
  experienceYears: number;
  clinicName: string;
  address: string;
  city: string;
  languages: string[];
  rating: number;
  reviewCount: number;
  nextAvailableSlot: string;
  feeINR: number;
  consultationModes: ConsultationType[];
  about: string;
  registrationNumber: string;
  services: DoctorService[];
  reviews: DoctorReview[];
  availableToday: boolean;
  acceptingNewAppointments?: boolean;
}

export interface Specialty {
  id: string;
  name: string;
  iconName: string;
  description: string;
  startingFeeINR: number;
  doctorCount: number;
  commonSymptoms: string[];
}

export interface PrescriptionMedicine {
  name: string;
  dosage: string;
  timing: string;
  duration: string;
}

export interface Prescription {
  id: string;
  appointmentId?: string;
  diagnosis: string;
  medicines: PrescriptionMedicine[];
  advice: string;
  followUpDate?: string;
  issuedAt: string;
}

export interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorPhoto: string;
  clinicName: string;
  clinicAddress: string;
  city: string;
  appointmentType: ConsultationType;
  date: string; // YYYY-MM-DD or readable string
  timeSlot: string; // e.g. "10:30 AM"
  patientName: string;
  patientAge: number;
  patientGender: 'Male' | 'Female' | 'Other';
  patientPhone: string;
  patientEmail: string;
  visitReason: string;
  feeINR: number;
  platformFeeINR: number;
  taxesINR: number;
  totalINR: number;
  status: 'upcoming' | 'completed' | 'cancelled';
  paymentMethod: 'UPI' | 'Card' | 'Net Banking' | 'Wallet' | 'Razorpay';
  paymentTransactionId: string;
  createdAt: string;
  videoLink?: string;
  consultationNotes?: string;
  prescription?: Prescription;
  cancellationReason?: string;
}

export interface DoctorAuthData {
  id: string;
  doctorId: string; // e.g. "DOC-8824"
  name: string;
  email: string;
  phone: string;
  specialty: string;
  qualifications: string;
  experienceYears: number;
  clinicName: string;
  address: string;
  city: string;
  feeINR: number;
  rating: number;
  reviewCount: number;
  registrationNumber: string;
  photo: string;
  languages: string[];
  isLoggedIn: boolean;
  acceptingNewAppointments: boolean; isFeatured?: boolean;
  consultationModes: ConsultationType[];
}

export interface DoctorBreak {
  id: string;
  startTime: string; // e.g. "03:00 PM"
  endTime: string; // e.g. "05:00 PM"
  label: string;
  days: string[];
}

export interface BlockedSlot {
  date: string; // "Today", "Tomorrow", or YYYY-MM-DD
  timeSlot: string; // e.g. "11:00 AM"
  reason: string;
}

export interface DoctorLeave {
  id: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: 'active' | 'upcoming';
}

export interface DoctorScheduleConfig {
  workingDays: string[];
  startHour: string; // e.g. "08:00 AM"
  endHour: string; // e.g. "06:00 PM"
  slotDurationMinutes: 15 | 20 | 30 | 45;
  breaks: DoctorBreak[];
  blockedSlots: BlockedSlot[];
  blockedDays: string[];
  leaves: DoctorLeave[];
}

export interface UserProfile {
  id?: string;        // Auth user ID (set when patient is logged in)
  name: string;
  phone: string;
  email: string;
  isLoggedIn: boolean;
}

export interface SymptomAnalysisResult {
  symptoms: string[];
  primarySpecialty: string;
  secondarySpecialty?: string;
  urgency: 'routine' | 'soon' | 'emergency';
  summary: string;
  possibleCauses: string[];
  disclaimer: string;
  matchingDoctorIds: string[];
}
