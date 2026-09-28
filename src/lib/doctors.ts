import { supabase, SUPABASE_CONFIGURED } from './supabase';
import { Doctor } from '../types';
import { INITIAL_DOCTORS } from '../data/doctorsData';

/**
 * Transforms a Supabase doctor_profiles row into the app's Doctor type.
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
    experienceYears: (row.experience_years as number) || 0,
    clinicName: (row.clinic_name as string) || '',
    address: (row.clinic_address as string) || '',
    city: (row.city as string) || '',
    languages: (row.languages as string[]) || ['English', 'Hindi'],
    rating: row.rating ? Number(row.rating) : 4.8,
    reviewCount: (row.review_count as number) || 10,
    nextAvailableSlot: 'Today',
    feeINR: (row.fee_inr as number) || 499,
    consultationModes: (row.consultation_types as ('video' | 'clinic')[]) || ['video', 'clinic'],
    about: (row.about as string) || '',
    registrationNumber: (row.registration_number as string) || '',
    availableToday: (row.accepting_appointments as boolean) ?? true,
    services: [],
    reviews: [],
  };
}

/**
 * Fetches verified doctors from Supabase, or falls back to static data.
 */
export async function fetchDoctors(filters?: {
  specialty?: string;
  city?: string;
  consultationType?: string;
  search?: string;
}): Promise<Doctor[]> {
  if (!SUPABASE_CONFIGURED) {
    return INITIAL_DOCTORS;
  }

  let query = supabase
    .from('doctor_profiles')
    .select('*')
    .eq('verification_status', 'verified')
    .eq('accepting_appointments', true);

  if (filters?.specialty && filters.specialty !== 'all') {
    query = query.eq('specialty_id', filters.specialty);
  }
  if (filters?.city && filters.city !== 'All Cities') {
    query = query.eq('city', filters.city);
  }
  if (filters?.consultationType && filters.consultationType !== 'all') {
    query = query.contains('consultation_types', [filters.consultationType]);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    console.warn('[MediNest] Supabase doctor fetch failed or empty, using static data:', error?.message);
    return INITIAL_DOCTORS;
  }

  // Filter out any incomplete doctor records that lack name or photo
  return data
    .map(mapRowToDoctor)
    .filter(doc => doc.name && doc.name !== 'Unknown Doctor' && doc.name !== 'Doctor' && doc.photo);
}

/**
 * Fetches a single doctor by ID, or falls back to static data.
 */
export async function fetchDoctorById(id: string): Promise<Doctor | null> {
  if (!SUPABASE_CONFIGURED) {
    return INITIAL_DOCTORS.find(d => d.id === id) ?? null;
  }

  const { data, error } = await supabase
    .from('doctor_profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return INITIAL_DOCTORS.find(d => d.id === id) ?? null;
  }

  return mapRowToDoctor(data as Record<string, unknown>);
}
