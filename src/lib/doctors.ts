import { Doctor } from '../types';
import { INITIAL_DOCTORS } from '../data/doctorsData';
import { supabase, SUPABASE_CONFIGURED } from './supabase';

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
    specialtyId: (row.specialty_id as string) || 'general',
    qualifications: (row.qualifications as string) || '',
    experienceYears: (row.experience_years as number) || (row.experienceYears as number) || 0,
    clinicName: (row.clinic_name as string) || (row.clinicName as string) || '',
    address: (row.clinic_address as string) || (row.address as string) || '',
    city: (row.city as string) || '',
    languages: (row.languages as string[]) || ['English', 'Hindi'],
    rating: row.rating ? Number(row.rating) : 4.8,
    reviewCount: (row.review_count as number) || (row.reviewCount as number) || 10,
    nextAvailableSlot: 'Today',
    feeINR: (row.fee_inr as number) || (row.feeINR as number) || 499,
    consultationModes: (row.consultation_types as ('video' | 'clinic')[]) || (row.consultationModes as ('video' | 'clinic')[]) || ['video', 'clinic'],
    about: (row.about as string) || '',
    registrationNumber: (row.registration_number as string) || (row.registrationNumber as string) || '',
    availableToday: (row.accepting_appointments as boolean) ?? (row.availableToday as boolean) ?? true,
    services: [],
    reviews: [],
  };
}

/**
 * Fetches verified doctors from Express REST API (or Supabase / static fallback).
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
    }
  } catch (_err) {
    // Backend API unavailable — try Supabase or static fallback
  }

  if (SUPABASE_CONFIGURED) {
    try {
      let query = supabase
        .from('doctor_profiles')
        .select('*')
        .eq('verification_status', 'verified')
        .eq('accepting_appointments', true);

      if (filters?.specialty && filters.specialty !== 'all') query = query.eq('specialty_id', filters.specialty);
      if (filters?.city && filters.city !== 'All Cities') query = query.eq('city', filters.city);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map(mapRowToDoctor).filter(doc => doc.name && doc.name !== 'Unknown Doctor' && doc.photo);
      }
    } catch (_) {}
  }

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

  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase.from('doctor_profiles').select('*').eq('id', id).single();
      if (!error && data) return mapRowToDoctor(data);
    } catch (_) {}
  }

  return INITIAL_DOCTORS.find(d => d.id === id) ?? null;
}
