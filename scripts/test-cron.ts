import * as assert from 'assert';
import { createRecurringCronHandler } from '../src/app/api/cron/recurring/route';

async function test() {
  console.log("Running Cron Security tests...");

  // Backup original env
  const originalSecret = process.env.CRON_SECRET;

  try {
    let callCount = 0;
    const fakeProcessor = async () => {
      callCount++;
      return { status: "fake_ok" };
    };

    const handler = createRecurringCronHandler(fakeProcessor);

    // 1. Missing CRON_SECRET
    delete process.env.CRON_SECRET;
    const req1 = new Request("http://localhost/api/cron/recurring");
    const res1 = await handler(req1);
    assert.strictEqual(res1.status, 500);
    const body1 = await res1.json();
    assert.ok(body1.error.includes("configuration error"));
    assert.strictEqual(callCount, 0);

    // 2. Set CRON_SECRET, but missing Authorization
    process.env.CRON_SECRET = "supersecret";
    const req2 = new Request("http://localhost/api/cron/recurring");
    const res2 = await handler(req2);
    assert.strictEqual(res2.status, 401);
    assert.strictEqual(callCount, 0);

    // 3. Wrong secret
    const req3 = new Request("http://localhost/api/cron/recurring", {
      headers: { Authorization: "Bearer wrongsecret" }
    });
    const res3 = await handler(req3);
    assert.strictEqual(res3.status, 401);
    assert.strictEqual(callCount, 0);

    // 4. Correct secret
    const req4 = new Request("http://localhost/api/cron/recurring", {
      headers: { Authorization: "Bearer supersecret" }
    });
    const res4 = await handler(req4);
    assert.strictEqual(res4.status, 200);
    assert.strictEqual(callCount, 1);
    
    console.log("✅ CRON SECURITY TESTS PASSED");

  } finally {
    process.env.CRON_SECRET = originalSecret;
  }
}

test().catch(e => {
  console.error(e);
  process.exit(1);
});
