/**
 * Automated Verification Script for Transaction Ledger API
 * Uses native Node fetch (no extra dependencies required).
 *
 * Usage:
 *   1. Start the server: npm start
 *   2. In another terminal, run: node scripts/verify-api.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api/v1';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

let passedCount = 0;
let failedCount = 0;

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  let json = null;
  try {
    json = await response.json();
  } catch (_e) {
    // response not json
  }

  return { status: response.status, data: json };
}

function assert(description, condition, actualInfo = '') {
  if (condition) {
    console.log(` ${colors.green}✔ PASS${colors.reset} | ${description}`);
    passedCount++;
  } else {
    console.error(` ${colors.red}✖ FAIL${colors.reset} | ${description}`);
    if (actualInfo) console.error(`   ${colors.yellow}Details: ${actualInfo}${colors.reset}`);
    failedCount++;
  }
}

async function runTests() {
  console.log(`\n${colors.bold}${colors.cyan}====================================================`);
  console.log(` Starting Transaction Ledger API Verification Suite `);
  console.log(` Target Server: ${BASE_URL}`);
  console.log(`====================================================${colors.reset}\n`);

  try {
    // 0. Health Check
    const health = await request('/health');
    assert('Health Check endpoint returns 200 OK', health.status === 200);

    // 1. Create Account A
    const accARes = await request('/accounts', {
      method: 'POST',
      body: JSON.stringify({ name: 'Alice Smith' }),
    });
    assert('Create Account A returns 201 Created', accARes.status === 201);
    assert('Account A has initial balance of 0', accARes.data?.data?.balance === 0);
    assert('Account A has generated unique id', typeof accARes.data?.data?.id === 'string');
    const accountAId = accARes.data?.data?.id;

    // 2. Client not allowed to set initial balance
    const rejectedAcc = await request('/accounts', {
      method: 'POST',
      body: JSON.stringify({ name: 'Hacker Account', balance: 5000 }),
    });
    assert('Creating account with custom initial balance rejected (400)', rejectedAcc.status === 400);

    // 3. Create Account B
    const accBRes = await request('/accounts', {
      method: 'POST',
      body: JSON.stringify({ name: 'Bob Jones' }),
    });
    assert('Create Account B returns 201 Created', accBRes.status === 201);
    const accountBId = accBRes.data?.data?.id;

    // 4. Credit $100 to Account A
    const credit1 = await request('/transactions', {
      method: 'POST',
      body: JSON.stringify({
        account_id: accountAId,
        type: 'credit',
        amount: 100,
        description: 'First deposit',
        reference_id: 'REF-ALICE-001',
      }),
    });
    assert('Credit transaction of $100 returns 201 Created', credit1.status === 201);

    // 5. Credit $50 to Account A
    const credit2 = await request('/transactions', {
      method: 'POST',
      body: JSON.stringify({
        account_id: accountAId,
        type: 'credit',
        amount: 50,
        description: 'Second deposit',
        reference_id: 'REF-ALICE-002',
      }),
    });
    assert('Credit transaction of $50 returns 201 Created', credit2.status === 201);

    // 6. Verify Account A balance is 150
    const balCheck1 = await request(`/accounts/${accountAId}/balance`);
    assert('Account A balance after 2 credits is exactly 150', balCheck1.data?.data?.balance === 150);

    // 7. Debit $30 from Account A
    const debit1 = await request('/transactions', {
      method: 'POST',
      body: JSON.stringify({
        account_id: accountAId,
        type: 'debit',
        amount: 30,
        description: 'Utility payment',
        reference_id: 'REF-ALICE-003',
      }),
    });
    assert('Debit transaction of $30 returns 201 Created', debit1.status === 201);

    // 8. Verify Account A balance is 120
    const balCheck2 = await request(`/accounts/${accountAId}/balance`);
    assert('Account A balance after debit is exactly 120', balCheck2.data?.data?.balance === 120);

    // 9. Debit with insufficient balance ($500)
    const debitFailed = await request('/transactions', {
      method: 'POST',
      body: JSON.stringify({
        account_id: accountAId,
        type: 'debit',
        amount: 500,
        description: 'Overdraft attempt',
        reference_id: 'REF-ALICE-OVERDRAFT',
      }),
    });
    assert('Debit exceeding current balance rejected with 400', debitFailed.status === 400);

    // 10. Verify balance remains unchanged (120)
    const balCheck3 = await request(`/accounts/${accountAId}/balance`);
    assert('Account A balance unaffected by rejected debit (still 120)', balCheck3.data?.data?.balance === 120);

    // 11. Duplicate reference_id for same account rejected
    const dupTxn = await request('/transactions', {
      method: 'POST',
      body: JSON.stringify({
        account_id: accountAId,
        type: 'credit',
        amount: 10,
        description: 'Duplicate attempt',
        reference_id: 'REF-ALICE-001',
      }),
    });
    assert('Duplicate reference_id for same account rejected with 409 Conflict', dupTxn.status === 409);

    // 12. Same reference_id for DIFFERENT account allowed
    const otherAccountTxn = await request('/transactions', {
      method: 'POST',
      body: JSON.stringify({
        account_id: accountBId,
        type: 'credit',
        amount: 75,
        description: 'Same reference ID on Account B',
        reference_id: 'REF-ALICE-001',
      }),
    });
    assert('Same reference_id allowed for different account (201 Created)', otherAccountTxn.status === 201);

    // 13. Transaction History Pagination & Sorting
    const history = await request(`/accounts/${accountAId}/transactions?page=1&limit=2`);
    assert('History endpoint returns 200 OK', history.status === 200);
    assert('History pagination contains totalRecords', history.data?.pagination?.totalRecords === 3);
    assert('History pageSize matches limit', history.data?.data?.length === 2);
    // Verify latest-first sort
    const firstTxnTime = new Date(history.data?.data[0]?.created_at).getTime();
    const secondTxnTime = new Date(history.data?.data[1]?.created_at).getTime();
    assert('Transactions sorted in latest-first order', firstTxnTime >= secondTxnTime);

    // 14. Transaction History Filtering by type
    const debitHistory = await request(`/accounts/${accountAId}/transactions?type=debit`);
    assert('Filtered debit transactions returns only debit', debitHistory.data?.data?.every((t) => t.type === 'debit'));

    // 14b. Transaction History via Query Param (/transactions?account_id=...)
    const queryHistory = await request(`/transactions?account_id=${accountAId}`);
    assert('Query param based transaction history returns 200 OK', queryHistory.status === 200 && queryHistory.data?.data?.length === 3);

    // 15. Immutability Check: PUT/PATCH/DELETE on transactions rejected (405)
    const putAttempt = await request('/transactions/some_id', {
      method: 'PUT',
      body: JSON.stringify({ amount: 999 }),
    });
    assert('Updating transaction via PUT rejected with 405 Method Not Allowed', putAttempt.status === 405);

    // 16. Bonus: Atomic Money Transfer ($40 from Account A to Account B)
    const transferRes = await request('/transfers', {
      method: 'POST',
      body: JSON.stringify({
        from_account_id: accountAId,
        to_account_id: accountBId,
        amount: 40,
        reference_id: 'TXF-001',
        description: 'Payment from Alice to Bob',
      }),
    });
    assert('Bonus atomic money transfer returns 200 OK', transferRes.status === 200);

    // 17. Verify updated balances after transfer
    const aliceFinalBal = await request(`/accounts/${accountAId}/balance`);
    const bobFinalBal = await request(`/accounts/${accountBId}/balance`);
    assert('Alice final balance reduced by transfer amount ($120 - $40 = $80)', aliceFinalBal.data?.data?.balance === 80);
    assert('Bob final balance increased by transfer amount ($75 + $40 = $115)', bobFinalBal.data?.data?.balance === 115);

    // Summary
    console.log(`\n${colors.bold}----------------------------------------------------`);
    console.log(` Test Results: ${colors.green}${passedCount} Passed${colors.reset}, ${failedCount > 0 ? colors.red : colors.green}${failedCount} Failed${colors.reset}`);
    console.log(`----------------------------------------------------${colors.reset}\n`);

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n${colors.red}Verification failed with connection error:${colors.reset}`, error.message);
    console.log(`\n${colors.yellow}Make sure the API server is running ('npm start') before executing tests.${colors.reset}\n`);
    process.exit(1);
  }
}

runTests();
