import { Doctor } from '../types';
import { INITIAL_DOCTORS } from '../data/doctorsData';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

/**
 * Transforms a raw API/DB doctor profile row into the app's Doctor model.
 */
function mapRowToDoctor(row: Record<string, unknown>): Doctor {
  const profile = (row.profiles as Record<string, unknown>) || {};
  const doctorName = (row.name as string) || (profile.full_name as string) || '';
  const doctorPhoto = (row.photo as string) || (profile.avatar_url as string) || '';

  return {
    id: row.id as string,
    name: doctorName,
    gender: (row.gender as 'male' | 'female') || 'female',
    photo: doctorPhoto,
    specialty: (row.specialty as string) || 'Specialist',
    specialtyId: (row.specialtyId as string) || (row.specialty_id as string) || 'general',
    qualifications: (row.qualifications as string) || '',
    experienceYears: (row.experienceYears as number) || (row.experience_years as number) || 0,
    clinicName: (row.clinicName as string) || (row.clinic_name as string) || '',
    address: (row.address as string) || (row.clinic_address as string) || '',
    city: (row.city as string) || '',
    languages: Array.isArray(row.languages)
      ? row.languages as string[]
      : typeof row.languages === 'string' && row.languages
        ? (row.languages as string).split(/[\s,]+/).filter(Boolean)
        : ['English', 'Hindi'],
    rating: row.rating ? Number(row.rating) : 0,
    reviewCount: (row.reviewCount as number) || (row.review_count as number) || 0,
    nextAvailableSlot: 'Today',
    feeINR: (row.feeINR as number) || (row.fee_inr as number) || 0,
    consultationModes: Array.isArray(row.consultationModes)
      ? row.consultationModes as ('video' | 'clinic')[]
      : Array.isArray(row.consultation_types)
        ? row.consultation_types as ('video' | 'clinic')[]
        : typeof row.consultationModes === 'string' && row.consultationModes
          ? (row.consultationModes as string).split(/[\s,]+/).filter((m): m is 'video' | 'clinic' => m === 'video' || m === 'clinic')
          : ['video', 'clinic'],
    about: (row.about as string) || '',
    registrationNumber: (row.registrationNumber as string) || (row.registration_number as string) || '',
    availableToday: (row.availableToday as boolean) ?? (row.accepting_appointments as boolean) ?? true,
    services: (row.services as any) || [],
    reviews: (row.reviews as any) || [],
  };
}

/**
 * Fetches verified doctors from Express REST API (or static fallback).
 */
export async function fetchDoctors(filters?: {
  specialty?: string;
  city?: string;
  consultationType?: string;
  search?: string;
}): Promise<Doctor[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.specialty) params.append('specialty', filters.specialty);
    if (filters?.city) params.append('city', filters.city);
    if (filters?.consultationType) params.append('consultationType', filters.consultationType);
    if (filters?.search) params.append('search', filters.search);

    const res = await fetch(`${API_BASE_URL}/doctors?${params.toString()}`);
    if (res.ok) {
      const body = await res.json();
      if (body.success && Array.isArray(body.data) && body.data.length > 0) {
        return body.data.map(mapRowToDoctor).filter(d => d.name && d.name !== 'Unknown Doctor' && d.name !== 'Doctor');
      }
      return [];
    }
  } catch (_err) {
    // Backend API unavailable — use static fallback
  }

  return INITIAL_DOCTORS;
}

/**
 * Fetches featured doctors for the homepage.
 */
export async function fetchFeaturedDoctors(): Promise<Doctor[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/doctors/featured`);
    if (res.ok) {
      const body = await res.json();
      if (body.success && Array.isArray(body.data)) {
        return body.data.map(mapRowToDoctor).filter(d => d.name && d.name !== 'Unknown Doctor' && d.name !== 'Doctor');
      }
    }
  } catch (_err) {}
  return INITIAL_DOCTORS;
}

/**
 * Fetches a single doctor by ID.
 */
export async function fetchDoctorById(id: string): Promise<Doctor | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/doctors/${id}`);
    if (res.ok) {
      const body = await res.json();
      if (body.success && body.data) {
        return mapRowToDoctor(body.data);
      }
    }
  } catch (_err) {}

  return INITIAL_DOCTORS.find(d => d.id === id) ?? null;
}
