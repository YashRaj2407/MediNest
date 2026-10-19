import assert from 'assert';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectMongoDB, disconnectMongoDB, isMongoConnected } from './config/mongodb.js';
import Conversation from './models/Conversation.js';

dotenv.config();
dotenv.config({ path: '.env.local' });

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000/api/v1/chat';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function pass(desc) {
  totalTests++;
  passedTests++;
  console.log(`[PASS] ${desc}`);
}

function fail(desc, err) {
  totalTests++;
  failedTests++;
  console.error(`[FAIL] ${desc}: ${err?.message || err}`);
}

async function runChatTestSuite() {
  console.log('====================================================');
  console.log('  MEDINEST MONGODB & AI CHAT INTEGRATION TEST SUITE ');
  console.log('====================================================\n');

  // ── TEST 1: Direct MongoDB Connection & URI Masking ───────────────
  console.log('--- Test 1: MongoDB Direct Connection & Database Check ---');
  try {
    const conn = await connectMongoDB();
    assert(isMongoConnected(), 'Mongoose readyState indicates connected (1)');
    assert.strictEqual(conn.name, 'medinest', 'Connected to medinest database');
    pass('Direct MongoDB connection succeeded on medinest database');
  } catch (err) {
    fail('Direct MongoDB connection failed', err);
  }

  // ── TEST 2: Model Schema & Validation Enforcement ────────────────
  console.log('\n--- Test 2: Mongoose Schema Validation Rules ---');
  try {
    // 2a. Missing ownerUserId
    let validationFailed = false;
    try {
      const invalidConv = new Conversation({ title: 'No Owner' });
      await invalidConv.validate();
    } catch (err) {
      validationFailed = true;
      assert(err.errors['ownerUserId'], 'Validation error on ownerUserId present');
    }
    assert(validationFailed, 'Model rejects creation without ownerUserId');
    pass('Schema requires ownerUserId');

    // 2b. Message content limit (max 4000 chars)
    let contentLimitFailed = false;
    try {
      const longConv = new Conversation({
        ownerUserId: 'test_user_val',
        messages: [{ role: 'user', content: 'A'.repeat(4001) }],
      });
      await longConv.validate();
    } catch (err) {
      contentLimitFailed = true;
      assert(err.errors['messages.0.content'], 'Validation error on message length');
    }
    assert(contentLimitFailed, 'Model rejects messages over 4000 characters');
    pass('Schema enforces 4000 character maximum per message');

    // 2c. Invalid message role
    let invalidRoleFailed = false;
    try {
      const badRoleConv = new Conversation({
        ownerUserId: 'test_user_val',
        messages: [{ role: 'hacker', content: 'hello' }],
      });
      await badRoleConv.validate();
    } catch (err) {
      invalidRoleFailed = true;
      assert(err.errors['messages.0.role'], 'Validation error on role enum');
    }
    assert(invalidRoleFailed, 'Model rejects non-enum role');
    pass('Schema restricts message role to user, assistant, system');
  } catch (err) {
    fail('Schema validation tests failed', err);
  }

  // ── TEST 3: Chat Service API Status Check ────────────────────────
  console.log('\n--- Test 3: Chat Status API Endpoint ---');
  try {
    const res = await fetch(`${BASE_URL}/status`);
    const json = await res.json();
    assert.strictEqual(res.status, 200, 'Status endpoint returns 200');
    assert.strictEqual(json.success, true, 'Status success is true');
    assert.strictEqual(json.mongoConnected, true, 'Status reports mongoConnected is true');
    assert.strictEqual(json.database, 'medinest', 'Status reports medinest database');
    pass('GET /api/v1/chat/status returns online status and medinest DB');
  } catch (err) {
    fail('GET /api/v1/chat/status check failed', err);
  }

  // ── TEST 4: Create Conversation with Initial Clinical Message ────
  console.log('\n--- Test 4: Create Conversation via API ---');
  let testConversationId = null;
  const userA_Id = 'user_test_patient_alpha_' + Date.now();
  const userB_Id = 'user_test_patient_beta_' + Date.now();

  try {
    const res = await fetch(`${BASE_URL}/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userA_Id,
      },
      body: JSON.stringify({
        title: 'Cardiac Symptoms Inquiry',
        initialMessage: 'I have had mild chest tightness and elevated blood pressure for 2 days.',
      }),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 201, 'Returns 201 Created');
    assert.strictEqual(json.success, true, 'Response indicates success');
    assert(json.data && json.data.id, 'Response contains conversation id');
    assert.strictEqual(json.data.ownerUserId, userA_Id, 'Conversation owner matches userA');
    assert.strictEqual(json.data.messages.length, 2, 'Has 2 messages (user + AI response)');
    assert.strictEqual(json.data.messages[0].role, 'user', 'First message is user');
    assert.strictEqual(json.data.messages[1].role, 'assistant', 'Second message is assistant');
    assert(json.data.messages[1].content.length > 20, 'Assistant message contains clinical guidance');

    testConversationId = json.data.id;
    pass('POST /api/v1/chat/conversations initialized conversation with user message and AI response');
  } catch (err) {
    fail('Create conversation failed', err);
  }

  // ── TEST 5: Fetch User Conversations List ────────────────────────
  console.log('\n--- Test 5: List User Conversations ---');
  try {
    const res = await fetch(`${BASE_URL}/conversations`, {
      headers: { 'x-user-id': userA_Id },
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200, 'Returns 200 OK');
    assert.strictEqual(json.success, true, 'Success is true');
    assert(Array.isArray(json.data), 'Data is an array');
    assert(json.data.length >= 1, 'Contains at least the created conversation');
    assert.strictEqual(json.data[0].id, testConversationId, 'Lists the created conversation');
    pass('GET /api/v1/chat/conversations retrieved caller conversation list');
  } catch (err) {
    fail('List conversations failed', err);
  }

  // ── TEST 6: Fetch Conversation By ID ─────────────────────────────
  console.log('\n--- Test 6: Fetch Conversation by ID ---');
  try {
    const res = await fetch(`${BASE_URL}/conversations/${testConversationId}`, {
      headers: { 'x-user-id': userA_Id },
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200, 'Returns 200 OK');
    assert.strictEqual(json.success, true, 'Success is true');
    assert.strictEqual(json.data.id, testConversationId, 'Returns correct document');
    assert.strictEqual(json.data.messages.length, 2, 'Preserves all messages');
    pass('GET /api/v1/chat/conversations/:id fetched single conversation details');
  } catch (err) {
    fail('Fetch conversation by ID failed', err);
  }

  // ── TEST 7: Send Follow-up Message to Existing Conversation ──────
  console.log('\n--- Test 7: Send Follow-up Message ---');
  try {
    const res = await fetch(`${BASE_URL}/conversations/${testConversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userA_Id,
      },
      body: JSON.stringify({
        content: 'Which cardiologist in Pune can I consult for this?',
      }),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 200, 'Returns 200 OK');
    assert.strictEqual(json.success, true, 'Success is true');
    assert(json.reply && json.reply.role === 'assistant', 'Returns assistant reply');
    assert.strictEqual(json.data.messages.length, 4, 'Conversation now has 4 messages');
    pass('POST /api/v1/chat/conversations/:id/messages appended user message and generated assistant reply');
  } catch (err) {
    fail('Send follow-up message failed', err);
  }

  // ── TEST 8: Unified Quick Chat API ───────────────────────────────
  console.log('\n--- Test 8: Unified Quick Chat Endpoint ---');
  let quickConvId = null;
  try {
    const res = await fetch(`${BASE_URL}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userA_Id,
      },
      body: JSON.stringify({
        message: 'I have a red skin rash on my elbow that itches.',
      }),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 200, 'Returns 200 OK');
    assert.strictEqual(json.success, true, 'Success is true');
    assert(json.conversationId, 'Returns created conversationId');
    assert(json.reply && json.reply.role === 'assistant', 'Returns assistant response');
    quickConvId = json.conversationId;
    pass('POST /api/v1/chat/message created new session and provided instant clinical response');
  } catch (err) {
    fail('Quick chat test failed', err);
  }

  // ── TEST 9: Privacy & User Isolation (User B Blocked from User A) ──
  console.log('\n--- Test 9: Conversation Ownership & Security Isolation ---');
  try {
    // User B tries to view User A's conversation
    const resGet = await fetch(`${BASE_URL}/conversations/${testConversationId}`, {
      headers: { 'x-user-id': userB_Id },
    });
    assert.strictEqual(resGet.status, 403, 'User B blocked with 403 Forbidden from viewing User A conversation');

    // User B tries to message in User A's conversation
    const resPost = await fetch(`${BASE_URL}/conversations/${testConversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userB_Id,
      },
      body: JSON.stringify({ content: 'Malicious injection into someone elses chat' }),
    });
    assert.strictEqual(resPost.status, 403, 'User B blocked with 403 Forbidden from posting in User A conversation');

    // User B tries to delete User A's conversation
    const resDel = await fetch(`${BASE_URL}/conversations/${testConversationId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userB_Id },
    });
    assert.strictEqual(resDel.status, 403, 'User B blocked with 403 Forbidden from deleting User A conversation');

    pass('Data isolation confirmed: User B cannot access, mutate, or delete User A conversation');
  } catch (err) {
    fail('Security isolation test failed', err);
  }

  // ── TEST 10: Input Validation & Edge Case Handling ───────────────
  console.log('\n--- Test 10: Input Validation & Error Handling ---');
  try {
    // 10a. Invalid ObjectId format
    const resInvalidId = await fetch(`${BASE_URL}/conversations/invalid-id-xyz`, {
      headers: { 'x-user-id': userA_Id },
    });
    assert.strictEqual(resInvalidId.status, 400, 'Invalid ObjectId returns 400');

    // 10b. Empty message content
    const resEmptyMsg = await fetch(`${BASE_URL}/conversations/${testConversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userA_Id,
      },
      body: JSON.stringify({ content: '   ' }),
    });
    assert.strictEqual(resEmptyMsg.status, 400, 'Empty message returns 400');

    // 10c. Non-existent conversation ID
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const resNotFound = await fetch(`${BASE_URL}/conversations/${nonExistentId}`, {
      headers: { 'x-user-id': userA_Id },
    });
    assert.strictEqual(resNotFound.status, 404, 'Non-existent ID returns 404');

    pass('Input validation correctly handles invalid IDs, empty content, and missing records');
  } catch (err) {
    fail('Validation & error handling test failed', err);
  }

  // ── TEST 11: Conversation Deletion ───────────────────────────────
  console.log('\n--- Test 11: Conversation Deletion by Owner ---');
  try {
    const resDel = await fetch(`${BASE_URL}/conversations/${testConversationId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userA_Id },
    });
    assert.strictEqual(resDel.status, 200, 'Deletion returns 200 OK');

    // Verify it is gone from MongoDB
    const deletedInDb = await Conversation.findById(testConversationId);
    assert.strictEqual(deletedInDb, null, 'Document removed from MongoDB');

    // Also clean up quick chat test conversation
    if (quickConvId) {
      await Conversation.findByIdAndDelete(quickConvId);
    }

    pass('DELETE /api/v1/chat/conversations/:id successfully removed conversation document');
  } catch (err) {
    fail('Conversation deletion failed', err);
  }

  // ── TEST 12: MySQL Preservation Verification ─────────────────────
  console.log('\n--- Test 12: Independent Verification: MySQL Healthcare Data Untouched ---');
  try {
    const healthRes = await fetch('http://localhost:5000/api/v1/health');
    assert.strictEqual(healthRes.status, 200, 'Health check returns 200');

    const doctorsRes = await fetch('http://localhost:5000/api/v1/doctors');
    const doctorsJson = await doctorsRes.json();
    assert.strictEqual(doctorsRes.status, 200, 'MySQL doctors API returns 200');
    assert(Array.isArray(doctorsJson.data) && doctorsJson.data.length >= 8, 'MySQL doctors intact (>= 8)');

    pass('MySQL relational endpoints completely intact and unaffected by MongoDB');
  } catch (err) {
    fail('MySQL preservation verification failed', err);
  }

  // Clean up any remaining test documents
  await Conversation.deleteMany({ ownerUserId: { $in: [userA_Id, userB_Id] } });
  await disconnectMongoDB();

  console.log('\n====================================================');
  console.log(`  MONGODB TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runChatTestSuite().catch((err) => {
  console.error('[Fatal Test Error]:', err);
  process.exit(1);
});
