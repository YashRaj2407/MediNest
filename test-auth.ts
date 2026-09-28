import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rjacrstbafbfcsovgehz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqYWNyc3RiYWZiZmNzb3ZnZWh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMzkwOTcsImV4cCI6MjEwNDcxNTA5N30.KsHhHRMnC-aTEcMtOBeZ2n7rkXBGbWRnie0iCIfRRWs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runRealAuthTest() {
  console.log('=== STARTING REAL SUPABASE AUTH TEST ===');
  const testEmail = `real.test.${Date.now()}@aarogyacare.in`;
  const testPassword = 'RealTestPass123!';
  const testFullName = 'Real Test Patient';

  // 1. Create brand-new user via signUp
  console.log(`\n1. Creating brand-new user: ${testEmail}`);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        full_name: testFullName,
        phone: '+91 9123456789',
      },
    },
  });

  if (signUpError) {
    console.error('❌ Sign Up Error:', signUpError);
    process.exit(1);
  }

  const userId = signUpData.user?.id;
  console.log('✅ Sign Up successful! Created User ID:', userId);

  // 2. Sign In to authenticate session & query profile
  console.log('\n2. Signing in as brand-new user...');
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (signInError) {
    console.error('❌ Sign In Error:', signInError);
    process.exit(1);
  }
  console.log('✅ Sign In successful! Session active for:', signInData.user?.email);

  // 3. Query public.profiles with authenticated user session
  console.log('\n3. Querying public.profiles table for user ID:', userId);
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId!)
    .single();

  if (profileError) {
    console.error('❌ Profile Fetch Error:', profileError);
    process.exit(1);
  }

  console.log('✅ Profile row verified in public.profiles:');
  console.log('   - ID:', profileData.id);
  console.log('   - Full Name:', profileData.full_name);
  console.log('   - Email:', profileData.email);
  console.log('   - Role:', profileData.role);

  // 4. Sign Out
  console.log('\n4. Signing out user...');
  await supabase.auth.signOut();
  console.log('✅ Signed out successfully!');

  // 5. Sign In Again to verify repeated authentication
  console.log('\n5. Signing in AGAIN with the same brand-new user...');
  const { data: reSignInData, error: reSignInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (reSignInError) {
    console.error('❌ Repeated Sign In Error:', reSignInError);
    process.exit(1);
  }
  console.log('✅ Repeated Sign In successful! User ID:', reSignInData.user?.id);

  // 6. Test Doctor Sign In
  console.log('\n6. Testing Doctor Account Sign In (dr.rohan.gupta@aarogyacare.in)...');
  await supabase.auth.signOut();
  const { data: docData, error: docError } = await supabase.auth.signInWithPassword({
    email: 'dr.rohan.gupta@aarogyacare.in',
    password: 'DoctorPass123!',
  });

  if (docError) {
    console.error('❌ Doctor Sign In Error:', docError);
    process.exit(1);
  }
  console.log('✅ Doctor Sign In successful! Doctor User ID:', docData.user?.id);

  console.log('\n=== ALL REAL SUPABASE AUTH TESTS PASSED 100% CLEANLY! ===');
}

runRealAuthTest();
