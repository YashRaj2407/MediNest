import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rjacrstbafbfcsovgehz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqYWNyc3RiYWZiZmNzb3ZnZWh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMzkwOTcsImV4cCI6MjEwNDcxNTA5N30.KsHhHRMnC-aTEcMtOBeZ2n7rkXBGbWRnie0iCIfRRWs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface AccountSeed {
  email: string;
  password: string;
  fullName: string;
  role: 'doctor' | 'patient' | 'admin';
  phone?: string;
  doctorDetails?: {
    specialty: string;
    specialtyId: string;
    qualifications: string;
    experienceYears: number;
    clinicName: string;
    address: string;
    city: string;
    languages: string[];
    feeINR: number;
    rating: number;
    reviewCount: number;
    about: string;
    registrationNumber: string;
    photo: string;
    availableToday: boolean;
  };
}

export const ACCOUNTS_TO_SEED: AccountSeed[] = [
  // 5 Doctors
  {
    email: 'dr.aditi.nair@aarogyacare.in',
    password: 'AditiNair#2026Doc!',
    fullName: 'Dr. Aditi Nair',
    role: 'doctor',
    phone: '+91 9876543201',
    doctorDetails: {
      specialty: 'Dermatologist',
      specialtyId: 'dermatologist',
      qualifications: 'MBBS, MD (Dermatology, Venereology & Leprosy)',
      experienceYears: 12,
      clinicName: 'Aura Dermatology & Laser Centre',
      address: 'B-14, Greater Kailash 1, New Delhi - 110048',
      city: 'Delhi NCR',
      languages: ['English', 'Hindi', 'Malayalam'],
      feeINR: 799,
      rating: 4.9,
      reviewCount: 382,
      about: 'Dr. Aditi Nair is a leading consultant dermatologist with 12 years of clinical experience specializing in acne scar revision, laser therapies, eczema, and hair restoration.',
      registrationNumber: 'DMC-2012-48201',
      photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=600',
      availableToday: true
    }
  },
  {
    email: 'dr.karthik.menon@aarogyacare.in',
    password: 'KarthikMenon#2026Doc!',
    fullName: 'Dr. Karthik Menon',
    role: 'doctor',
    phone: '+91 9876543202',
    doctorDetails: {
      specialty: 'Cardiologist',
      specialtyId: 'cardiologist',
      qualifications: 'MBBS, MD (Internal Medicine), DM (Cardiology)',
      experienceYears: 16,
      clinicName: 'Apollo Heart Institute',
      address: '154/11, Bannerghatta Road, Bengaluru - 560076',
      city: 'Bengaluru',
      languages: ['English', 'Hindi', 'Kannada', 'Tamil'],
      feeINR: 1200,
      rating: 4.9,
      reviewCount: 512,
      about: 'Dr. Karthik Menon is a senior interventional cardiologist with 16+ years of clinical excellence in preventative cardiology, hypertension, and angiographies.',
      registrationNumber: 'KMC-2008-39210',
      photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=600',
      availableToday: true
    }
  },
  {
    email: 'dr.sana.qureshi@aarogyacare.in',
    password: 'SanaQureshi#2026Doc!',
    fullName: 'Dr. Sana Qureshi',
    role: 'doctor',
    phone: '+91 9876543203',
    doctorDetails: {
      specialty: 'General Physician',
      specialtyId: 'general-physician',
      qualifications: 'MBBS, MD (General Medicine)',
      experienceYears: 9,
      clinicName: 'Aarogya Family Health Clinic',
      address: 'Indiranagar 100ft Road, Bengaluru - 560038',
      city: 'Bengaluru',
      languages: ['English', 'Hindi', 'Urdu'],
      feeINR: 499,
      rating: 4.8,
      reviewCount: 310,
      about: 'Dr. Sana Qureshi provides primary health care, viral fever management, diabetes control, and preventive health screenings with evidence-based medicine.',
      registrationNumber: 'MMC-2015-88241',
      photo: 'https://images.unsplash.com/photo-1594824813576-a4c330df30b3?auto=format&fit=crop&q=80&w=600',
      availableToday: true
    }
  },
  {
    email: 'dr.vivek.bansal@aarogyacare.in',
    password: 'VivekBansal#2026Doc!',
    fullName: 'Dr. Vivek Bansal',
    role: 'doctor',
    phone: '+91 9876543204',
    doctorDetails: {
      specialty: 'Orthopedic Surgeon',
      specialtyId: 'orthopedic',
      qualifications: 'MBBS, MS (Orthopaedics), MCh (Joint Replacement)',
      experienceYears: 18,
      clinicName: 'Medanta Bone & Joint Clinic',
      address: 'Sector 38, Gurugram, Delhi NCR - 122001',
      city: 'Delhi NCR',
      languages: ['English', 'Hindi'],
      feeINR: 1100,
      rating: 4.9,
      reviewCount: 590,
      about: 'Dr. Vivek Bansal is a renowned joint replacement surgeon and spine specialist with over 18 years of orthopedic clinical excellence.',
      registrationNumber: 'DMC-2006-28104',
      photo: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=600',
      availableToday: false
    }
  },
  {
    email: 'dr.priyanka.rao@aarogyacare.in',
    password: 'PriyankaRao#2026Doc!',
    fullName: 'Dr. Priyanka Rao',
    role: 'doctor',
    phone: '+91 9876543205',
    doctorDetails: {
      specialty: 'Psychiatrist',
      specialtyId: 'psychiatrist',
      qualifications: 'MBBS, MD (Psychiatry), Fellowship in Neuropsychiatry',
      experienceYears: 10,
      clinicName: 'MindCare Wellness Centre',
      address: 'FC Road, Shivaji Nagar, Pune - 411005',
      city: 'Pune',
      languages: ['English', 'Marathi', 'Hindi'],
      feeINR: 1200,
      rating: 4.9,
      reviewCount: 275,
      about: 'Dr. Priyanka Rao specializes in clinical depression, anxiety management, stress disorders, and adult neuropsychiatry in a supportive space.',
      registrationNumber: 'MMC-2014-91024',
      photo: 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&q=80&w=600',
      availableToday: true
    }
  },
  // 2 Patients
  {
    email: 'meera.joshi@aarogyacare.in',
    password: 'MeeraJoshi#2026Pat!',
    fullName: 'Meera Joshi',
    role: 'patient',
    phone: '+91 9876543210'
  },
  {
    email: 'arnav.kapoor@aarogyacare.in',
    password: 'ArnavKapoor#2026Pat!',
    fullName: 'Arnav Kapoor',
    role: 'patient',
    phone: '+91 9876543211'
  },
  // 1 Admin
  {
    email: 'admin@aarogyacare.in',
    password: 'AarogyaAdmin#2026Sec!',
    fullName: 'Aarogya Care Admin',
    role: 'admin',
    phone: '+91 9999900000'
  }
];

async function seedRealAccounts() {
  console.log('=== SEEDING REAL SUPABASE AUTH ACCOUNTS ===');
  
  const createdUserMap: Record<string, { id: string; seed: AccountSeed }> = {};

  for (const account of ACCOUNTS_TO_SEED) {
    console.log(`\nCreating Supabase Auth user for: ${account.fullName} (${account.email})...`);
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: account.email,
      password: account.password,
      options: {
        data: {
          full_name: account.fullName,
          role: account.role,
          phone: account.phone || ''
        }
      }
    });

    if (signUpError) {
      console.error(`❌ Error creating ${account.email}:`, signUpError.message);
      process.exit(1);
    }

    if (!signUpData.user) {
      console.error(`❌ User null returned for ${account.email}`);
      process.exit(1);
    }

    console.log(`✅ Created Auth User! ID: ${signUpData.user.id}`);
    createdUserMap[account.email] = { id: signUpData.user.id, seed: account };
  }

  console.log('\n=== ALL 8 SUPABASE AUTH USERS CREATED SUCCESSFULLY ===');
}

seedRealAccounts();
