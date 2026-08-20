import * as assert from 'assert';
import { GET } from '../src/app/api/cron/recurring/route';

async function test() {
  console.log("Running Cron Security tests...");

  // Backup original env
  const originalSecret = process.env.CRON_SECRET;

  try {
    // 1. Missing CRON_SECRET
    delete process.env.CRON_SECRET;
    const req1 = new Request("http://localhost/api/cron/recurring");
    const res1 = await GET(req1);
    assert.strictEqual(res1.status, 500);
    const body1 = await res1.json();
    assert.ok(body1.error.includes("configuration error"));

    // 2. Set CRON_SECRET, but missing Authorization
    process.env.CRON_SECRET = "supersecret";
    const req2 = new Request("http://localhost/api/cron/recurring");
    const res2 = await GET(req2);
    assert.strictEqual(res2.status, 401);

    // 3. Wrong secret
    const req3 = new Request("http://localhost/api/cron/recurring", {
      headers: { Authorization: "Bearer wrongsecret" }
    });
    const res3 = await GET(req3);
    assert.strictEqual(res3.status, 401);

    // 4. Correct secret
    // To prevent the actual DB logic from running during unit test and cluttering logs, 
    // we can just check if we get past the auth check (we'll see if it throws or returns 200).
    const req4 = new Request("http://localhost/api/cron/recurring", {
      headers: { Authorization: "Bearer supersecret" }
    });
    const res4 = await GET(req4);
    // Since automationService.processDueRecurringTransactions might fail without DB connection
    // or return 200 if DB is connected.
    assert.ok(res4.status === 200 || res4.status === 500);
    
    if (res4.status === 500) {
       const body4 = await res4.json();
       assert.ok(body4.error !== "Server configuration error: CRON_SECRET is not set.");
    }
    
    console.log("✅ CRON SECURITY TESTS PASSED");

  } finally {
    process.env.CRON_SECRET = originalSecret;
  }
}

test().catch(e => {
  console.error(e);
  process.exit(1);
});
