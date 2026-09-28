import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rjacrstbafbfcsovgehz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqYWNyc3RiYWZiZmNzb3ZnZWh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMzkwOTcsImV4cCI6MjEwNDcxNTA5N30.KsHhHRMnC-aTEcMtOBeZ2n7rkXBGbWRnie0iCIfRRWs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TEST_ACCOUNTS = [
  { role: 'doctor', name: 'Dr. Aditi Nair', email: 'dr.aditi.nair@aarogyacare.in', password: 'AditiNair#2026Doc!' },
  { role: 'doctor', name: 'Dr. Karthik Menon', email: 'dr.karthik.menon@aarogyacare.in', password: 'KarthikMenon#2026Doc!' },
  { role: 'doctor', name: 'Dr. Sana Qureshi', email: 'dr.sana.qureshi@aarogyacare.in', password: 'SanaQureshi#2026Doc!' },
  { role: 'doctor', name: 'Dr. Vivek Bansal', email: 'dr.vivek.bansal@aarogyacare.in', password: 'VivekBansal#2026Doc!' },
  { role: 'doctor', name: 'Dr. Priyanka Rao', email: 'dr.priyanka.rao@aarogyacare.in', password: 'PriyankaRao#2026Doc!' },
  { role: 'patient', name: 'Meera Joshi', email: 'meera.joshi@aarogyacare.in', password: 'MeeraJoshi#2026Pat!' },
  { role: 'patient', name: 'Arnav Kapoor', email: 'arnav.kapoor@aarogyacare.in', password: 'ArnavKapoor#2026Pat!' },
  { role: 'admin', name: 'Aarogya Care Admin', email: 'admin@aarogyacare.in', password: 'AarogyaAdmin#2026Sec!' },
];

async function testAllAccounts() {
  console.log('====================================================');
  console.log('  TESTING REAL SUPABASE SIGN-IN FOR ALL 8 ACCOUNTS  ');
  console.log('====================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < TEST_ACCOUNTS.length; i++) {
    const acc = TEST_ACCOUNTS[i];
    console.log(`[Test ${i + 1}/8] ${acc.role.toUpperCase()} — ${acc.name} (${acc.email})`);

    // 1. Sign out any existing session
    await supabase.auth.signOut();

    // 2. Perform live signInWithPassword
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: acc.email,
      password: acc.password,
    });

    if (signInError) {
      console.error(`  ❌ Sign In FAILED: ${signInError.message}`);
      failedCount++;
      continue;
    }

    const userId = signInData.user?.id;
    console.log(`  ✅ Auth Sign-In Successful! User ID: ${userId}`);

    // 3. Fetch profile from public.profiles using authenticated session
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId!)
      .single();

    if (profileError) {
      console.error(`  ❌ Profile Fetch FAILED: ${profileError.message}`);
      failedCount++;
      continue;
    }

    console.log(`  ✅ Profile Verified! Role in DB: "${profile.role}", Name: "${profile.full_name}"`);

    // 4. Verify role matches expected
    if (profile.role !== acc.role) {
      console.error(`  ❌ Role Mismatch! Expected "${acc.role}", got "${profile.role}"`);
      failedCount++;
      continue;
    }

    // 5. If doctor, verify doctor_profiles
    if (acc.role === 'doctor') {
      const { data: docProfile, error: docError } = await supabase
        .from('doctor_profiles')
        .select('*')
        .eq('profile_id', userId!)
        .single();

      if (docError) {
        console.error(`  ❌ Doctor Profile Fetch FAILED: ${docError.message}`);
        failedCount++;
        continue;
      }
      console.log(`  ✅ Doctor Profile Verified! Specialty: "${docProfile.specialty}", Clinic: "${docProfile.clinic_name}"`);
    }

    console.log(`  🎉 Test ${i + 1}/8 PASSED CLEANLY!\n`);
    passedCount++;
  }

  console.log('====================================================');
  console.log(`  SUMMARY: ${passedCount}/8 PASSED, ${failedCount}/8 FAILED`);
  console.log('====================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

testAllAccounts();
