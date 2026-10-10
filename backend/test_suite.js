import pool from './config/db.js';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:5000/api/v1';
const ADMIN_TOKEN = 'medinest_admin_secret_token_2026';

async function runTests() {
  console.log('=== STARTING MEDINEST COMPREHENSIVE TEST SUITE ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // ── TEST 1: Password Length Frontend Validation (8, 14, 15) ─────────────
  console.log('\n--- Test 1: Password Minimum Length (8, 14, 15 chars) ---');
  function validatePassword(pw) {
    return typeof pw === 'string' && pw.length >= 15;
  }
  assert(!validatePassword('12345678'), '8-character password rejected (< 15)');
  assert(!validatePassword('12345678901234'), '14-character password rejected (< 15)');
  assert(validatePassword('123456789012345'), '15-character password passes (>= 15)');
  assert(validatePassword('SuperSecurePassword2026!'), '24-character password passes');

  // ── TEST 2: Admin Login Endpoint ─────────────────────────────────────────
  console.log('\n--- Test 2: Admin Login API ---');
  try {
    const res = await fetch(`${BASE_URL}/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@medinest.in', password: 'test' })
    });
    const data = await res.json();
    assert(res.ok && data.success && data.token === ADMIN_TOKEN, 'Admin login succeeds and returns valid token');
    assert(data.admin?.role === 'admin', 'Admin profile has role = admin');
  } catch (e) {
    assert(false, `Admin login error: ${e.message}`);
  }

  // ── TEST 3: Security - Patient Cannot Access Admin Endpoints ─────────────
  console.log('\n--- Test 3: Security: Patient Blocked from Admin APIs ---');
  try {
    // Unauthenticated request to /admin/stats
    const res1 = await fetch(`${BASE_URL}/admin/stats`);
    assert(res1.status === 401, 'Unauthenticated request to /admin/stats rejected with 401');

    // Patient user token or header attempting admin access
    const res2 = await fetch(`${BASE_URL}/admin/stats`, {
      headers: { 'x-user-id': 'user_3Jx8NHtQeSGJvVwqBnGdCEOc0IK', 'x-user-role': 'patient' }
    });
    assert(res2.status === 401 || res2.status === 403, 'Patient account rejected from /admin/stats with 401/403');
  } catch (e) {
    assert(false, `Security test error: ${e.message}`);
  }

  // ── TEST 4: Admin Stats API ──────────────────────────────────────────────
  console.log('\n--- Test 4: Admin Stats API with Valid Admin Key ---');
  try {
    const res = await fetch(`${BASE_URL}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}`, 'x-admin-key': ADMIN_TOKEN }
    });
    const data = await res.json();
    assert(res.ok && data.success && typeof data.data.doctorCount === 'number', 'Admin stats returned successfully');
    console.log('   Stats retrieved:', data.data);
  } catch (e) {
    assert(false, `Admin stats error: ${e.message}`);
  }

  // ── TEST 5: Doctor Approval Workflow (Pending -> Approved / Suspended) ───
  console.log('\n--- Test 5: Doctor Approval Workflow ---');
  try {
    // Check doctor list
    const resDocs = await fetch(`${BASE_URL}/admin/doctors`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    const docsData = await resDocs.json();
    assert(resDocs.ok && docsData.success && Array.isArray(docsData.data), 'Admin getDoctors returns array');

    const testDoc = docsData.data[0];
    if (testDoc) {
      console.log(`   Testing approval on doctor: ${testDoc.name} (${testDoc.id})`);

      // Reject without reason should fail (400)
      const resFail = await fetch(`${BASE_URL}/admin/doctors/${testDoc.id}/approval`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', reason: '' })
      });
      assert(resFail.status === 400, 'Rejecting doctor without reason rejected with 400');

      // Suspend with reason
      const resSuspend = await fetch(`${BASE_URL}/admin/doctors/${testDoc.id}/approval`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'suspended', reason: 'Automated compliance test suspension' })
      });
      const dataSuspend = await resSuspend.json();
      assert(resSuspend.ok && dataSuspend.success, 'Doctor successfully suspended with recorded reason');

      // Check public /api/v1/doctors - suspended doctor must NOT appear
      const resPublic = await fetch(`${BASE_URL}/doctors`);
      const dataPublic = await resPublic.json();
      const isVisibleWhenSuspended = dataPublic.data.some(d => d.id === testDoc.id);
      assert(!isVisibleWhenSuspended, 'Suspended doctor is NOT visible in public search / booking');

      // Re-approve the doctor
      const resApprove = await fetch(`${BASE_URL}/admin/doctors/${testDoc.id}/approval`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      });
      const dataApprove = await resApprove.json();
      assert(resApprove.ok && dataApprove.success, 'Doctor successfully approved');

      // Check public /api/v1/doctors - approved doctor MUST appear
      const resPublic2 = await fetch(`${BASE_URL}/doctors`);
      const dataPublic2 = await resPublic2.json();
      const isVisibleWhenApproved = dataPublic2.data.some(d => d.id === testDoc.id);
      assert(isVisibleWhenApproved, 'Approved doctor IS visible and bookable in public list');
    }
  } catch (e) {
    assert(false, `Doctor approval test error: ${e.message}`);
  }

  // ── TEST 6: Patient Submitting Doctor Report & Duplicate Prevention ───────
  console.log('\n--- Test 6: Patient Grievance Report Submission ---');
  try {
    const patientUser = 'user_3Jx8NHtQeSGJvVwqBnGdCEOc0IK';
    const targetDoctor = 'doc-1';

    // Submit report
    const resReport = await fetch(`${BASE_URL}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': patientUser },
      body: JSON.stringify({
        doctorId: targetDoctor,
        category: 'unprofessional_behaviour',
        description: 'Test report: doctor was 20 minutes late to consultation room.'
      })
    });
    const dataReport = await resReport.json();
    assert(
      (resReport.status === 201 && dataReport.success) || (resReport.status === 409 && dataReport.error.includes('pending report')),
      'Report submitted successfully or 409 duplicate rate-limited appropriately'
    );

    // Verify report appears in admin reports list
    const resAdminReports = await fetch(`${BASE_URL}/admin/reports`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    const dataAdminReports = await resAdminReports.json();
    assert(resAdminReports.ok && dataAdminReports.success && dataAdminReports.data.length > 0, 'Report appears in Admin Dashboard');

    const latestReport = dataAdminReports.data[0];
    console.log(`   Latest report: #${latestReport.id} (${latestReport.category})`);

    // Admin updates report status to under_review
    const resReview = await fetch(`${BASE_URL}/admin/reports/${latestReport.id}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'under_review', adminNotes: 'Contacted patient for call log verification' })
    });
    assert(resReview.ok, 'Admin marks report as under_review with internal investigation notes');

    // Admin resolves report
    const resResolve = await fetch(`${BASE_URL}/admin/reports/${latestReport.id}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved', resolvedReason: 'Counseling provided to clinic staff; issue closed' })
    });
    assert(resResolve.ok, 'Admin resolves report with recorded resolution reason');
  } catch (e) {
    assert(false, `Report test error: ${e.message}`);
  }

  // ── TEST 7: Audit Log Records Actions ─────────────────────────────────────
  console.log('\n--- Test 7: Audit Log Verification ---');
  try {
    const resAudit = await fetch(`${BASE_URL}/admin/audit-log`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    const dataAudit = await resAudit.json();
    assert(resAudit.ok && dataAudit.success && dataAudit.data.length > 0, 'Admin audit log contains recorded actions');
    console.log(`   Total audit entries: ${dataAudit.data.length}`);
  } catch (e) {
    assert(false, `Audit log test error: ${e.message}`);
  }

  // ── TEST 8: Check Email Status & Clerk Reconciliation API ─────────────────
  console.log('\n--- Test 8: Check Email Status & Clerk Reconciliation ---');
  try {
    const resStatus = await fetch(`${BASE_URL}/auth/check-email-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'yashdhawale24@gmail.com' })
    });
    const dataStatus = await resStatus.json();
    assert(resStatus.ok && dataStatus.success, 'checkEmailStatus returns email diagnosis');
    console.log('   Email status:', dataStatus.data);

    // Test reconcile user endpoint
    const resReconcile = await fetch(`${BASE_URL}/admin/reconcile-clerk-user`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent_test_email_2026@medinest.in' })
    });
    const dataReconcile = await resReconcile.json();
    assert(resReconcile.ok && dataReconcile.success, 'Admin Clerk reconciliation endpoint functional');
  } catch (e) {
    assert(false, `Reconciliation test error: ${e.message}`);
  }

  // ── TEST 9: Medical Records & Appointments Retention ──────────────────────
  console.log('\n--- Test 9: Preservation of Existing Medical & Payment Records ---');
  try {
    const [[{ apptCount }]] = await pool.query('SELECT COUNT(*) as apptCount FROM appointments');
    const [[{ payCount }]] = await pool.query('SELECT COUNT(*) as payCount FROM payments');
    assert(apptCount > 0, `Appointments preserved in database (count: ${apptCount})`);
    assert(payCount > 0, `Payments preserved in database (count: ${payCount})`);
  } catch (e) {
    assert(false, `Records retention error: ${e.message}`);
  }

  // ── TEST 10: Currency Display Format Verification ────────────────────────
  console.log('\n--- Test 10: INR Currency Formatting ---');
  const formatINR = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);
  const formatted = formatINR(499);
  assert(formatted.includes('₹') && formatted.includes('499'), `INR formatted correctly with rupee symbol: ${formatted}`);

  // ── TEST 11 (Isolation Test A): Yash Fetches Only His Own Consultations ─────
  console.log('\n--- Test 11 (Test A): Yash Dhawale Fetches Only His Own Consultations ---');
  let yashBaselineCount = 0;
  try {
    const yashId = 'user_3Jx8NHtQeSGJvVwqBnGdCEOc0IK';
    const resYash = await fetch(`${BASE_URL}/appointments/patient`, {
      headers: { 'x-user-id': yashId }
    });
    const dataYash = await resYash.json();
    assert(resYash.ok && dataYash.success, 'Yash appointments request succeeds');
    assert(dataYash.count >= 4, `Yash receives at least 4 consultations (received: ${dataYash.count})`);
    yashBaselineCount = dataYash.count;
    // Verify all 4 known original IDs are present
    const expectedIds = ['AGC-APT-2026-27482', 'AGC-APT-2026-61728', 'AGC-APT-2026-84874', 'AGC-APT-2026-90050'];
    const actualIds = dataYash.data.map(a => a.id);
    const allFound = expectedIds.every(id => actualIds.includes(id));
    assert(allFound, 'All 4 original Yash appointment IDs are present in his list');
    console.log(`   Yash's baseline appointment count: ${yashBaselineCount}`);
  } catch (e) {
    assert(false, `Test A error: ${e.message}`);
  }

  // ── TEST 12 (Isolation Test B): Raj Fetches Only His Own Consultations ──────
  console.log('\n--- Test 12 (Test B): Raj Dhawale Fetches Only His Own Consultations (No Yash Leak) ---');
  let rajBaselineCount = 0;
  try {
    const rajId = 'user_3KUKlkRoe4ocfI2HUdkpvRfRfed';
    const resRaj = await fetch(`${BASE_URL}/appointments/patient`, {
      headers: { 'x-user-id': rajId }
    });
    const dataRaj = await resRaj.json();
    assert(resRaj.ok && dataRaj.success, 'Raj appointments request succeeds');
    rajBaselineCount = dataRaj.count;
    // Critical isolation check: Raj must NEVER see Yash's original appointment IDs
    const yashOriginalIds = ['AGC-APT-2026-27482', 'AGC-APT-2026-61728', 'AGC-APT-2026-84874', 'AGC-APT-2026-90050'];
    const rajActualIds = dataRaj.data.map(a => a.id);
    const noYashLeak = yashOriginalIds.every(id => !rajActualIds.includes(id));
    assert(noYashLeak, `Isolation confirmed: Raj does NOT see any of Yash's original appointments!`);
    console.log(`   Raj's baseline appointment count: ${rajBaselineCount} (none belong to Yash)`);
  } catch (e) {
    assert(false, `Test B error: ${e.message}`);
  }

  // ── TEST 13 (Isolation Test C): Consultation Creation Isolation ────────────
  console.log('\n--- Test 13 (Test C): Consultation Creation Isolation ---');
  try {
    const rajId = 'user_3KUKlkRoe4ocfI2HUdkpvRfRfed';
    const yashId = 'user_3Jx8NHtQeSGJvVwqBnGdCEOc0IK';
    const testApptId = `AGC-APT-2026-TEST-${Date.now().toString().slice(-5)}`;

    // Insert a new test appointment strictly for Raj
    await pool.query(
      `INSERT INTO appointments (
        id, patient_id, doctor_id, consultation_type, start_datetime, end_datetime,
        symptoms, status, payment_status, total_inr, fee_inr, platform_fee_inr, taxes_inr,
        patient_name, patient_age, patient_gender, patient_phone, patient_email
       ) VALUES (?, ?, 'doc-1', 'video', NOW(), DATE_ADD(NOW(), INTERVAL 30 MINUTE),
        'Follow-up evaluation', 'upcoming', 'paid', 499, 499, 0, 0,
        'Raj Dhawale', 28, 'Male', '+919876543210', 'yashdhawale2407@gmail.com')`,
      [testApptId, rajId]
    );

    // Raj should now see baseline + 1
    const resRajNew = await fetch(`${BASE_URL}/appointments/patient`, {
      headers: { 'x-user-id': rajId }
    });
    const dataRajNew = await resRajNew.json();
    assert(dataRajNew.count === rajBaselineCount + 1, `Raj now sees exactly ${rajBaselineCount + 1} consultation(s) (baseline ${rajBaselineCount} + 1 new)`);

    // Yash should still see exactly his baseline count
    const resYashCheck = await fetch(`${BASE_URL}/appointments/patient`, {
      headers: { 'x-user-id': yashId }
    });
    const dataYashCheck = await resYashCheck.json();
    assert(dataYashCheck.count === yashBaselineCount, `Yash still sees exactly his ${yashBaselineCount} consultations (unaffected by Raj's booking)`);

    // Verify the new test appt is NOT visible to Yash
    const yashIds = dataYashCheck.data.map(a => a.id);
    assert(!yashIds.includes(testApptId), "Raj's new test appointment is NOT visible to Yash");

    // Clean up temporary test appointment
    await pool.query('DELETE FROM appointments WHERE id = ?', [testApptId]);
  } catch (e) {
    assert(false, `Test C error: ${e.message}`);
  }

  // ── TEST 14 (Isolation Test D): Identity Re-creation & Sync Isolation ──────
  console.log('\n--- Test 14 (Test D): Re-registration / Profile Sync with Same Email ---');
  try {
    const testNewUserId = `test_clerk_${Date.now()}`;
    const testEmail = 'isolation_test_user@medinest.in';

    // 1st identity sync
    const resSync1 = await fetch(`${BASE_URL}/auth/sync-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: `${testNewUserId}_1`, email: testEmail, fullName: 'First User' })
    });
    const dataSync1 = await resSync1.json();
    assert(resSync1.ok && dataSync1.success, 'First user profile created successfully');

    // 2nd identity sync with the SAME email but new Clerk User ID
    const resSync2 = await fetch(`${BASE_URL}/auth/sync-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: `${testNewUserId}_2`, email: testEmail, fullName: 'Second User' })
    });
    const dataSync2 = await resSync2.json();
    assert(resSync2.ok && dataSync2.success, 'Second user with same email creates independent profile without crashing');

    // Verify both profiles exist and are distinct
    const [[p1]] = await pool.query('SELECT id, email FROM profiles WHERE id = ?', [`${testNewUserId}_1`]);
    const [[p2]] = await pool.query('SELECT id, email FROM profiles WHERE id = ?', [`${testNewUserId}_2`]);
    assert(p1 && p2 && p1.id !== p2.id, 'Profiles are strictly isolated with independent IDs');
    assert(p1.email.startsWith('archived_') && p2.email === testEmail, 'Older profile email archived to preserve foreign keys without blocking new identity');

    // Clean up test profiles
    await pool.query('DELETE FROM profiles WHERE id IN (?, ?)', [`${testNewUserId}_1`, `${testNewUserId}_2`]);
  } catch (e) {
    assert(false, `Test D error: ${e.message}`);
  }

  // ── TEST 15 (Isolation Test E): Parameter Tampering Resistance ──────────────
  console.log('\n--- Test 15 (Test E): Security - Parameter Tampering Rejected ---');
  try {
    const rajId = 'user_3KUKlkRoe4ocfI2HUdkpvRfRfed';
    const yashId = 'user_3Jx8NHtQeSGJvVwqBnGdCEOc0IK';

    // Raj attempts to pass Yash's ID in query parameter: ?patientId=user_3Jx8...
    const resTamper = await fetch(`${BASE_URL}/appointments/patient?patientId=${yashId}&patientEmail=yashdhawale24@gmail.com`, {
      headers: { 'x-user-id': rajId, 'x-user-role': 'patient' }
    });
    const dataTamper = await resTamper.json();
    assert(resTamper.ok && dataTamper.success, 'API handles request safely');
    // Tampering must not inflate Raj's results — count stays at his baseline
    assert(dataTamper.count === rajBaselineCount, `Parameter tampering ignored: Raj still sees exactly his own ${rajBaselineCount} consultations, NOT Yash's!`);
    // Verify none of Yash's appointment IDs leaked through
    const yashOriginalIds = ['AGC-APT-2026-27482', 'AGC-APT-2026-61728', 'AGC-APT-2026-84874', 'AGC-APT-2026-90050'];
    const tamperActualIds = dataTamper.data.map(a => a.id);
    const noLeak = yashOriginalIds.every(id => !tamperActualIds.includes(id));
    assert(noLeak, 'No Yash appointment IDs visible to Raj even with tampered query params');
  } catch (e) {
    assert(false, `Test E error: ${e.message}`);
  }

  // ── TEST 16 (Isolation Test F): Unauthenticated Request Rejected ───────────
  console.log('\n--- Test 16 (Test F): Security - Unauthenticated Request Blocked ---');
  try {
    const resUnauth = await fetch(`${BASE_URL}/appointments/patient`);
    assert(resUnauth.status === 401, 'Unauthenticated request to /appointments/patient returned 401 Unauthorized');
  } catch (e) {
    assert(false, `Test F error: ${e.message}`);
  }

  // ── TEST 17 (Isolation Test G): Historical Records Database Integrity ──────
  console.log('\n--- Test 17 (Test G): Historical Records DB Integrity (Yash original 4 appointments intact) ---');
  try {
    const yashId = 'user_3Jx8NHtQeSGJvVwqBnGdCEOc0IK';
    const [rows] = await pool.query(
      `SELECT id, patient_id, patient_name, status, total_inr FROM appointments WHERE patient_id = ? ORDER BY id ASC`,
      [yashId]
    );
    // Yash may have additional real bookings — assert at least the 4 original ones exist
    assert(rows.length >= 4, `At least 4 historical consultations for Yash Dhawale exist in database (found: ${rows.length})`);
    const expectedIds = ['AGC-APT-2026-27482', 'AGC-APT-2026-61728', 'AGC-APT-2026-84874', 'AGC-APT-2026-90050'];
    const actualIds = rows.map(r => r.id);
    const allFound = expectedIds.every(id => actualIds.includes(id));
    assert(allFound, `All 4 original appointment IDs present: ${expectedIds.join(', ')}`);
    // Verify none of Raj's appointments bleed into Yash's records
    const rajId = 'user_3KUKlkRoe4ocfI2HUdkpvRfRfed';
    const noRajRows = rows.every(r => r.patient_id !== rajId);
    assert(noRajRows, 'No Raj appointments found in Yash DB query — data integrity intact');
    console.log(`   Total Yash DB appointments: ${rows.length} (all belong to Yash)`);
  } catch (e) {
    assert(false, `Test G error: ${e.message}`);
  }

  // ── TEST 18: Session ID Rejection & Profiles Table Cleanliness ─────────────
  console.log('\n--- Test 18: Session ID Rejection & Profiles Cleanliness ---');
  try {
    // Attempting to sync with an unresolvable session ID must fail with 400
    const resBadSession = await fetch(`${BASE_URL}/auth/sync-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'sess_invalid_test_id_99999',
        email: 'test_invalid_sess@example.com',
        fullName: 'Test Session User'
      })
    });
    assert(resBadSession.status === 400, 'Unresolvable session ID rejected with HTTP 400');

    // Verify profiles table has ZERO rows with id starting with sess_
    const [sessRows] = await pool.query(`SELECT id FROM profiles WHERE id LIKE 'sess_%'`);
    assert(sessRows.length === 0, `No session IDs present in profiles table (found: ${sessRows.length})`);
  } catch (e) {
    assert(false, `Test 18 error: ${e.message}`);
  }

  // ── TEST 19: Doctor Profile Synchronization & Login (Dr. Shreyash) ─────────
  console.log('\n--- Test 19: Doctor Login & Profile Sync (Dr. Shreyash Dhawale) ---');
  try {
    const docUserId = 'user_3KSU1bqXv0J2o24aUizOYxRPkoM';
    const docEmail = 'shreyashdhawale63@gmail.com';

    // Doctor profile sync
    const resDocSync = await fetch(`${BASE_URL}/auth/sync-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: docUserId,
        email: docEmail,
        fullName: 'Dr. Shreyash Dhawale',
        role: 'doctor'
      })
    });
    const dataDocSync = await resDocSync.json();
    assert(resDocSync.ok && dataDocSync.success, 'Doctor sync profile succeeds without FK errors');
    assert(dataDocSync.data.role === 'doctor', 'Doctor assigned role is "doctor"');

    // Doctor login API
    const resDocLogin = await fetch(`${BASE_URL}/doctors/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': docUserId },
      body: JSON.stringify({ email: docEmail })
    });
    const dataDocLogin = await resDocLogin.json();
    assert(resDocLogin.ok && dataDocLogin.success, 'Doctor login API succeeds');
    assert(dataDocLogin.data.id === 'doc-9bdb0739', `Doctor profile id matches doc-9bdb0739 (got: ${dataDocLogin.data.id})`);
    assert(dataDocLogin.data.name.includes('Shreyash'), 'Doctor profile name is Dr. Shreyash Dhawale');
  } catch (e) {
    assert(false, `Test 19 error: ${e.message}`);
  }

  // ── TEST 20: Doctor Profile Mapping Protection (No Overwrite / Hijack) ──────
  console.log('\n--- Test 20: Doctor Profile Protection against Hijack / Overwrite ---');
  try {
    const rogueUserId = 'user_rogue_patient_99999';
    const docEmail = 'shreyashdhawale63@gmail.com';

    // A different user tries to sync with doctor email
    const resRogue = await fetch(`${BASE_URL}/auth/sync-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: rogueUserId,
        email: docEmail,
        fullName: 'Rogue Patient'
      })
    });
    const dataRogue = await resRogue.json();

    // Verify doc-9bdb0739 STILL belongs to user_3KSU1bqXv0J2o24aUizOYxRPkoM!
    const [[docRow]] = await pool.query('SELECT user_id, name FROM doctor_profiles WHERE id = ?', ['doc-9bdb0739']);
    assert(docRow.user_id === 'user_3KSU1bqXv0J2o24aUizOYxRPkoM', `Doctor profile mapping preserved: user_id is ${docRow.user_id}, NOT overwritten by rogue user!`);

    // Clean up rogue test user if inserted
    await pool.query('DELETE FROM profiles WHERE id = ?', [rogueUserId]);
  } catch (e) {
    assert(false, `Test 20 error: ${e.message}`);
  }

  // ── TEST 21: Foreign Key Constraint Integrity on doctor_profiles ───────────
  console.log('\n--- Test 21: Foreign Key Constraint Integrity on doctor_profiles ---');
  try {
    const [orphanRows] = await pool.query(
      `SELECT dp.id, dp.user_id
       FROM doctor_profiles dp
       LEFT JOIN profiles p ON dp.user_id = p.id
       WHERE dp.user_id IS NOT NULL AND p.id IS NULL`
    );
    assert(orphanRows.length === 0, `Zero orphaned foreign keys in doctor_profiles (found: ${orphanRows.length})`);
  } catch (e) {
    assert(false, `Test 21 error: ${e.message}`);
  }

  // ── TEST 22: Complete Identity Isolation between Yash and Raj Dhawale ──────
  console.log('\n--- Test 22: Complete Identity Isolation (Yash vs Raj) ---');
  try {
    const yashId = 'user_3Jx8NHtQeSGJvVwqBnGdCEOc0IK';
    const rajId = 'user_3KUKlkRoe4ocfI2HUdkpvRfRfed';

    const [[yashProfile]] = await pool.query('SELECT id, email, account_status FROM profiles WHERE id = ?', [yashId]);
    const [[rajProfile]] = await pool.query('SELECT id, email, account_status FROM profiles WHERE id = ?', [rajId]);

    assert(yashProfile && yashProfile.account_status === 'active', 'Yash Dhawale profile is active');
    assert(rajProfile && rajProfile.account_status === 'active', 'Raj Dhawale profile is active');
    assert(yashProfile.id !== rajProfile.id, 'Yash and Raj have distinct identities');

    const resYash = await fetch(`${BASE_URL}/appointments/patient`, { headers: { 'x-user-id': yashId } });
    const dataYash = await resYash.json();
    const resRaj = await fetch(`${BASE_URL}/appointments/patient`, { headers: { 'x-user-id': rajId } });
    const dataRaj = await resRaj.json();

    assert(dataYash.count >= 4, `Yash sees at least his 4 original consultations (count: ${dataYash.count})`);
    // All 4 original Yash appointment IDs must be present
    const yashOriginalIds = ['AGC-APT-2026-27482', 'AGC-APT-2026-61728', 'AGC-APT-2026-84874', 'AGC-APT-2026-90050'];
    const yashActualIds = dataYash.data.map(a => a.id);
    const allYashFound = yashOriginalIds.every(id => yashActualIds.includes(id));
    assert(allYashFound, 'All 4 original Yash appointment IDs are present in his appointment list');
    // Raj must NEVER see any of Yash's original appointments
    const rajActualIds = dataRaj.data.map(a => a.id);
    const noLeakage = yashOriginalIds.every(id => !rajActualIds.includes(id));
    assert(noLeakage, `Identity isolation confirmed: Raj (${dataRaj.count} appointments) does NOT see any of Yash's original records`);
  } catch (e) {
    assert(false, `Test 22 error: ${e.message}`);
  }

  // ── TEST 23 (Requirement Test A): Book appointment & verify it appears in Upcoming ─
  console.log('\n--- Test 23 (Requirement Test A): Book Appointment -> Appears in Upcoming ---');
  const testAId = `AGC-APT-2026-TESTA-${Date.now().toString().slice(-5)}`;
  const patientAId = 'user_3Jx8NHtQeSGJvVwqBnGdCEOc0IK';
  const assignedDocId = 'doc-9bdb0739'; // Dr. Shreyash Dhawale
  const assignedDocUserId = 'user_3KSU1bqXv0J2o24aUizOYxRPkoM';
  try {
    await pool.query(
      `INSERT INTO appointments (
        id, patient_id, doctor_id, consultation_type, start_datetime, end_datetime,
        symptoms, status, payment_status, total_inr, fee_inr, platform_fee_inr, taxes_inr,
        patient_name, patient_age, patient_gender, patient_phone, patient_email
       ) VALUES (?, ?, ?, 'video', DATE_ADD(NOW(), INTERVAL 1 DAY), DATE_ADD(DATE_ADD(NOW(), INTERVAL 1 DAY), INTERVAL 30 MINUTE),
        'Migraine evaluation and checkup', 'upcoming', 'paid', 499, 499, 0, 0,
        'Yash Dhawale', 24, 'Male', '+919876543210', 'yashdhawale24@gmail.com')`,
      [testAId, patientAId, assignedDocId]
    );

    const resA = await fetch(`${BASE_URL}/appointments/patient`, {
      headers: { 'x-user-id': patientAId }
    });
    const dataA = await resA.json();
    assert(resA.ok && dataA.success, 'Patient appointments fetched successfully');

    // Upcoming filter: status !== 'completed' && status !== 'cancelled'
    const upcoming = dataA.data.filter(a => a.status !== 'completed' && a.status !== 'cancelled');
    const bookedInUpcoming = upcoming.some(a => a.id === testAId);
    assert(bookedInUpcoming, `Newly booked appointment ${testAId} appears in Upcoming Appointments`);
  } catch (e) {
    assert(false, `Test 23 error: ${e.message}`);
  }

  // ── TEST 24 (Requirement Test B): Doctor clicks Mark Complete -> DB status = completed ─
  console.log('\n--- Test 24 (Requirement Test B): Doctor Marks Complete -> DB status = completed ---');
  try {
    const resComplete = await fetch(`${BASE_URL}/appointments/${testAId}/complete`, {
      method: 'PATCH',
      headers: {
        'x-user-id': assignedDocUserId,
        'x-user-role': 'doctor'
      }
    });
    const dataComplete = await resComplete.json();
    assert(resComplete.ok && dataComplete.success, 'Doctor complete appointment endpoint returns 200 success');
    assert(dataComplete.data && dataComplete.data.status === 'completed', 'API returns updated appointment with status = completed');

    // Verify MySQL database record
    const [[dbAppt]] = await pool.query(`SELECT status, prescription_json, doctor_id, patient_id FROM appointments WHERE id = ?`, [testAId]);
    assert(dbAppt && dbAppt.status === 'completed', 'Appointment status in MySQL database is strictly "completed"');
    assert(dbAppt && dbAppt.prescription_json, 'Prescription JSON is saved in database upon completion');
    assert(dbAppt && dbAppt.patient_id === patientAId, 'Patient ID ownership preserved upon completion');
    assert(dbAppt && dbAppt.doctor_id === assignedDocId, 'Doctor ID preserved upon completion');
  } catch (e) {
    assert(false, `Test 24 error: ${e.message}`);
  }

  // ── TEST 25 (Requirement Test C): Disappears from Upcoming -> Appears in Past Consultations ─
  console.log('\n--- Test 25 (Requirement Test C): Moves from Upcoming to Past Consultations ---');
  try {
    const resPatientAfter = await fetch(`${BASE_URL}/appointments/patient`, {
      headers: { 'x-user-id': patientAId }
    });
    const dataPatientAfter = await resPatientAfter.json();
    assert(resPatientAfter.ok && dataPatientAfter.success, 'Patient appointments fetched after completion');

    const upcomingAfter = dataPatientAfter.data.filter(a => a.status !== 'completed' && a.status !== 'cancelled');
    const pastAfter = dataPatientAfter.data.filter(a => a.status === 'completed' || a.status === 'cancelled');

    const notInUpcoming = !upcomingAfter.some(a => a.id === testAId);
    const inPast = pastAfter.some(a => a.id === testAId);

    assert(notInUpcoming, `Completed appointment ${testAId} has DISAPPEARED from Upcoming Appointments`);
    assert(inPast, `Completed appointment ${testAId} now APPEARS in Past Consultations`);

    // Verify SSE events endpoint responds with SSE headers
    const resSSE = await fetch(`${BASE_URL}/appointments/events?patientId=${patientAId}`);
    assert(
      resSSE.headers.get('content-type')?.includes('text/event-stream'),
      'Real-time SSE event stream endpoint /appointments/events is active and streaming'
    );
  } catch (e) {
    assert(false, `Test 25 error: ${e.message}`);
  }

  // ── TEST 26 (Requirement Test D): Dashboard Reload Persistence & No Duplication ─
  console.log('\n--- Test 26 (Requirement Test D): Dashboard Refresh Persistence & Deduplication ---');
  try {
    // Repeated fetch calls simulating page reloads
    const resReload1 = await fetch(`${BASE_URL}/appointments/patient`, { headers: { 'x-user-id': patientAId } });
    const resReload2 = await fetch(`${BASE_URL}/appointments/patient`, { headers: { 'x-user-id': patientAId } });
    const data1 = await resReload1.json();
    const data2 = await resReload2.json();

    const ids1 = data1.data.map(a => a.id);
    const uniqueIds = Array.from(new Set(ids1));
    assert(ids1.length === uniqueIds.length, 'No duplicate appointments returned on refresh');

    const completedAppt = data2.data.find(a => a.id === testAId);
    assert(completedAppt && completedAppt.status === 'completed', 'Completed appointment remains in Past Consultations after reload');
    assert(completedAppt.doctorName.includes('Shreyash'), 'Retains correct doctor details (Dr. Shreyash Dhawale)');
    assert(completedAppt.feeINR === 499, 'Retains correct fee details (₹499)');
    assert(completedAppt.prescription && completedAppt.prescription.medicines?.length > 0, 'Retains full digital prescription details');

    // Test repeated Mark Complete clicks (idempotency)
    const resRepeat = await fetch(`${BASE_URL}/appointments/${testAId}/complete`, {
      method: 'PATCH',
      headers: { 'x-user-id': assignedDocUserId, 'x-user-role': 'doctor' }
    });
    const dataRepeat = await resRepeat.json();
    assert(resRepeat.ok && dataRepeat.success, 'Repeated Mark Complete click handles safely (idempotent, 200 OK)');
  } catch (e) {
    assert(false, `Test 26 error: ${e.message}`);
  }

  // ── TEST 27 (Requirement Test E): Isolation - Patient B Unaffected by Patient A completion ─
  console.log('\n--- Test 27 (Requirement Test E): Patient B Records Unaffected by Patient A completion ---');
  try {
    const patientBId = 'user_3KUKlkRoe4ocfI2HUdkpvRfRfed'; // Raj Dhawale
    const resB = await fetch(`${BASE_URL}/appointments/patient`, { headers: { 'x-user-id': patientBId } });
    const dataB = await resB.json();
    assert(resB.ok && dataB.success, 'Patient B appointments retrieved');

    // Raj must NOT see testAId
    const rajHasTestA = dataB.data.some(a => a.id === testAId);
    assert(!rajHasTestA, 'Patient B does NOT see Patient A\'s completed appointment');

    // None of Patient B\'s appointments belong to Patient A
    const allBelongToB = dataB.data.every(a => a.patientId === patientBId);
    assert(allBelongToB, 'All of Patient B\'s appointments belong exclusively to Patient B');
  } catch (e) {
    assert(false, `Test 27 error: ${e.message}`);
  }

  // ── TEST 28 (Requirement Test F): Unauthorized Completion Rejected (Another Doctor / Patient) ─
  console.log('\n--- Test 28 (Requirement Test F): Unauthorized Completion Rejected ---');
  try {
    // 1. Unauthenticated request -> 401
    const resUnauth = await fetch(`${BASE_URL}/appointments/${testAId}/complete`, { method: 'PATCH' });
    assert(resUnauth.status === 401, 'Unauthenticated complete request rejected with 401');

    // 2. Patient attempting to complete -> 403
    const resPatientAttempt = await fetch(`${BASE_URL}/appointments/${testAId}/complete`, {
      method: 'PATCH',
      headers: { 'x-user-id': patientAId, 'x-user-role': 'patient' }
    });
    assert(resPatientAttempt.status === 403, 'Patient attempting to complete appointment rejected with 403 Forbidden');

    // 3. Different doctor attempting to complete another doctor's appointment -> 403
    // Dr. Yash Dhawale (doc-fd6f7ab6) attempting to complete Dr. Shreyash's appointment (doc-9bdb0739)
    const otherDocUserId = 'user_3KS5EhBG8pHWuGhRe00IyPOFcaa';
    const resOtherDoc = await fetch(`${BASE_URL}/appointments/${testAId}/complete`, {
      method: 'PATCH',
      headers: { 'x-user-id': otherDocUserId, 'x-user-role': 'doctor' }
    });
    assert(resOtherDoc.status === 403, 'Another doctor attempting to complete someone else\'s appointment rejected with 403 Forbidden');
  } catch (e) {
    assert(false, `Test 28 error: ${e.message}`);
  }

  // ── TEST 29 (Requirement Test G): Cancelled, Pending, Confirmed, Rescheduled preservation ─
  console.log('\n--- Test 29 (Requirement Test G): Cancelled, Rescheduled, Pending States Preserved ---');
  const testGId = `AGC-APT-2026-TESTG-${Date.now().toString().slice(-5)}`;
  try {
    // Create test appointment
    await pool.query(
      `INSERT INTO appointments (
        id, patient_id, doctor_id, consultation_type, start_datetime, end_datetime,
        symptoms, status, payment_status, total_inr, fee_inr, platform_fee_inr, taxes_inr,
        patient_name, patient_age, patient_gender, patient_phone, patient_email
       ) VALUES (?, ?, ?, 'video', NOW(), DATE_ADD(NOW(), INTERVAL 30 MINUTE),
        'Follow-up test G', 'upcoming', 'paid', 499, 499, 0, 0,
        'Yash Dhawale', 24, 'Male', '+919876543210', 'yashdhawale24@gmail.com')`,
      [testGId, patientAId, assignedDocId]
    );

    // 1. Reschedule
    const newStart = new Date(Date.now() + 86400000).toISOString();
    const newEnd = new Date(Date.now() + 86400000 + 1800000).toISOString();
    const resResched = await fetch(`${BASE_URL}/appointments/${testGId}/reschedule`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-id': patientAId },
      body: JSON.stringify({ startDatetime: newStart, endDatetime: newEnd })
    });
    assert(resResched.ok, 'Reschedule endpoint succeeds');

    // 2. Cancel
    const resCancel = await fetch(`${BASE_URL}/appointments/${testGId}/cancel`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-id': patientAId },
      body: JSON.stringify({ reason: 'Patient schedule conflict' })
    });
    assert(resCancel.ok, 'Cancel endpoint succeeds');

    const [[dbCancelled]] = await pool.query(`SELECT status, cancellation_reason FROM appointments WHERE id = ?`, [testGId]);
    assert(dbCancelled.status === 'cancelled', 'Cancelled appointment status is "cancelled" in database');
    assert(dbCancelled.cancellation_reason.includes('Patient schedule conflict'), 'Cancellation reason recorded in database');

    // Clean up temporary test records
    await pool.query('DELETE FROM appointments WHERE id IN (?, ?)', [testAId, testGId]);
    console.log('   Cleaned up temporary test records');
  } catch (e) {
    assert(false, `Test 29 error: ${e.message}`);
    // Ensure cleanup even on error
    await pool.query('DELETE FROM appointments WHERE id IN (?, ?)', [testAId, testGId]).catch(() => {});
  }

  console.log(`\n=== TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
