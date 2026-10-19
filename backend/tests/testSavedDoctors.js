import assert from 'assert';

const BASE_URL = 'http://localhost:5000/api/v1';

async function testSavedDoctors() {
  console.log('--- Testing Saved Doctors Backend API ---');

  const yashId = 'user_3KaDJ8vK0TUIwZ0fZygyB5UQadX'; // Yash
  const rajId = 'user_3Jx8NHtQeSGJvVwqBnGdCEOc0IK';  // Raj

  // 1. Unauthenticated request must fail with 401
  const unauthRes = await fetch(`${BASE_URL}/doctors/saved`);
  assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must return 401');
  console.log('✓ Test 1: Unauthenticated request rejected with 401');

  // Clean up any test records for both
  await fetch(`${BASE_URL}/doctors/saved/doc-6`, { method: 'DELETE', headers: { 'x-user-id': yashId } });
  await fetch(`${BASE_URL}/doctors/saved/doc-5`, { method: 'DELETE', headers: { 'x-user-id': rajId } });

  // 2. Initial state is empty for Yash
  const yashInitial = await fetch(`${BASE_URL}/doctors/saved`, { headers: { 'x-user-id': yashId } });
  const yashInitialJson = await yashInitial.json();
  assert.strictEqual(yashInitialJson.success, true);
  assert.strictEqual(yashInitialJson.data.includes('doc-6'), false);
  console.log('✓ Test 2: Yash initial saved doctors does not have doc-6');

  // 3. Yash saves Dr. Rajesh Singhal (doc-6)
  const saveDoc6 = await fetch(`${BASE_URL}/doctors/saved/doc-6`, {
    method: 'POST',
    headers: { 'x-user-id': yashId }
  });
  const saveDoc6Json = await saveDoc6.json();
  assert.strictEqual(saveDoc6Json.success, true);
  console.log('✓ Test 3: Yash saved Dr. Rajesh Singhal (doc-6)');

  // 4. Yash sees doc-6
  const yashAfter = await fetch(`${BASE_URL}/doctors/saved`, { headers: { 'x-user-id': yashId } });
  const yashAfterJson = await yashAfter.json();
  assert.strictEqual(yashAfterJson.data.includes('doc-6'), true);
  console.log('✓ Test 4: Yash successfully sees doc-6 in saved list');

  // 5. Raj does NOT see doc-6!
  const rajCheck = await fetch(`${BASE_URL}/doctors/saved`, { headers: { 'x-user-id': rajId } });
  const rajCheckJson = await rajCheck.json();
  assert.strictEqual(rajCheckJson.data.includes('doc-6'), false, "Raj must NOT see Yash's saved doctor!");
  console.log('✓ Test 5: Raj does NOT see doc-6 (Isolation verified)');

  // 6. Raj saves Dr. Priya Nambiar (doc-5)
  const saveDoc5 = await fetch(`${BASE_URL}/doctors/saved/doc-5`, {
    method: 'POST',
    headers: { 'x-user-id': rajId }
  });
  const saveDoc5Json = await saveDoc5.json();
  assert.strictEqual(saveDoc5Json.success, true);
  console.log('✓ Test 6: Raj saved Dr. Priya Nambiar (doc-5)');

  // 7. Verify Raj has doc-5 only, Yash has doc-6 only
  const rajFinal = await fetch(`${BASE_URL}/doctors/saved`, { headers: { 'x-user-id': rajId } });
  const rajFinalJson = await rajFinal.json();
  assert.strictEqual(rajFinalJson.data.includes('doc-5'), true);
  assert.strictEqual(rajFinalJson.data.includes('doc-6'), false);

  const yashFinal = await fetch(`${BASE_URL}/doctors/saved`, { headers: { 'x-user-id': yashId } });
  const yashFinalJson = await yashFinal.json();
  assert.strictEqual(yashFinalJson.data.includes('doc-6'), true);
  assert.strictEqual(yashFinalJson.data.includes('doc-5'), false);
  console.log('✓ Test 7: Yash sees only doc-6; Raj sees only doc-5 (Strict cross-account isolation)');

  // 8. Yash unsaves doc-6
  const deleteDoc6 = await fetch(`${BASE_URL}/doctors/saved/doc-6`, {
    method: 'DELETE',
    headers: { 'x-user-id': yashId }
  });
  const deleteDoc6Json = await deleteDoc6.json();
  assert.strictEqual(deleteDoc6Json.success, true);

  const yashClean = await fetch(`${BASE_URL}/doctors/saved`, { headers: { 'x-user-id': yashId } });
  const yashCleanJson = await yashClean.json();
  assert.strictEqual(yashCleanJson.data.includes('doc-6'), false);

  // Raj still has doc-5
  const rajStillHas = await fetch(`${BASE_URL}/doctors/saved`, { headers: { 'x-user-id': rajId } });
  const rajStillHasJson = await rajStillHas.json();
  assert.strictEqual(rajStillHasJson.data.includes('doc-5'), true);
  console.log('✓ Test 8: Removing from Yash leaves Raj unaffected');

  // Clean up Raj
  await fetch(`${BASE_URL}/doctors/saved/doc-5`, { method: 'DELETE', headers: { 'x-user-id': rajId } });
  console.log('\n=== ALL SAVED DOCTOR BACKEND TESTS PASSED ===\n');
}

testSavedDoctors().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
