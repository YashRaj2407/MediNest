import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  'https://rjacrstbafbfcsovgehz.supabase.co';

const supabaseAnonKey = (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqYWNyc3RiYWZiZmNzb3ZnZWh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMzkwOTcsImV4cCI6MjEwNDcxNTA5N30.KsHhHRMnC-aTEcMtOBeZ2n7rkXBGbWRnie0iCIfRRWs';

// If env vars are missing, we operate in demo/localStorage mode.
export const SUPABASE_CONFIGURED =
  !!supabaseUrl && supabaseUrl !== 'YOUR_SUPABASE_URL' &&
  !!supabaseAnonKey && supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY';

/**
 * Isolated Supabase Client for Patient Portal (storageKey: medinest_patient_auth)
 */
export const patientSupabase: SupabaseClient = SUPABASE_CONFIGURED
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storageKey: 'medinest_patient_auth',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : (createClient('https://placeholder.supabase.co', 'placeholder') as SupabaseClient);

/**
 * Isolated Supabase Client for Doctor Portal (storageKey: medinest_doctor_auth)
 */
export const doctorSupabase: SupabaseClient = SUPABASE_CONFIGURED
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storageKey: 'medinest_doctor_auth',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : (createClient('https://placeholder.supabase.co', 'placeholder') as SupabaseClient);

/**
 * Isolated Supabase Client for Admin Portal (storageKey: medinest_admin_auth)
 */
export const adminSupabase: SupabaseClient = SUPABASE_CONFIGURED
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storageKey: 'medinest_admin_auth',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : (createClient('https://placeholder.supabase.co', 'placeholder') as SupabaseClient);

// Default export alias pointing to patientSupabase for backward compatibility
export const supabase = patientSupabase;
