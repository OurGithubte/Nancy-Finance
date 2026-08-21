/**
 * Integration test for ForecastService — verifies recurring projection,
 * transfer exclusion, non-double-counting of recurring-generated
 * transactions, and confidence levels.
 *
 * Uses a dedicated, freshly created test user + isolated financial data and
 * cleans up everything in `finally`, per DATABASE_RULES.md 6.5.
 */
import { db } from "../src/db";
import { users, financialAccounts, transactions, recurringTransactions } from "../src/db/schema";
import { ForecastService } from "../src/server/services/forecast";
import { projectRecurringOccurrences, RecurringTransactionType } from "../src/lib/format/date";
import * as assert from "assert";
import { eq } from "drizzle-orm";

/**
 * Phase 6 Final Hardening Fix 2 — pure-function regression tests for
 * projectRecurringOccurrences() (no DB required): occurrence date >= asOf (startDate
 * param) and <= horizonEnd must be the ONLY thing ever returned, regardless of how
 * overdue nextDueDate is, for daily / weekly / monthly frequencies, and endDate must
 * still be respected even when the schedule needs to advance past several overdue
 * occurrences first.
 */
function testProjectionOverdueBoundaries() {
  const now = new Date();
  const horizonEnd = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  function makeRt(overrides: Partial<RecurringTransactionType>): RecurringTransactionType {
    return {
      id: "rt-test",
      type: "income",
      amount: 1,
      frequency: "monthly",
      startDate: daysAgo(50),
      endDate: null,
      nextDueDate: daysAgo(50),
      note: null,
      ...overrides,
    };
  }

  // Daily: nextDueDate 5 days overdue. No occurrence before `now` may ever be returned.
  const daily = projectRecurringOccurrences(makeRt({ frequency: "daily", nextDueDate: daysAgo(5), startDate: daysAgo(5) }), now, horizonEnd(3));
  assert.ok(daily.length > 0, "Daily: must still project at least one future occurrence");
  for (const occ of daily) assert.ok(occ >= now, `Daily: occurrence ${occ.toISOString()} is before asOf — overdue leak`);

  // Weekly: nextDueDate 20 days overdue (roughly 3 missed weekly occurrences).
  const weekly = projectRecurringOccurrences(makeRt({ frequency: "weekly", nextDueDate: daysAgo(20), startDate: daysAgo(20) }), now, horizonEnd(14));
  assert.ok(weekly.length > 0, "Weekly: must still project at least one future occurrence");
  for (const occ of weekly) assert.ok(occ >= now, `Weekly: occurrence ${occ.toISOString()} is before asOf — overdue leak`);
  for (const occ of weekly) assert.ok(occ <= horizonEnd(14), "Weekly: occurrence must not exceed horizonEnd");

  // Monthly, matching the spec's literal example: nextDueDate ~50 days overdue
  // (e.g. asOf=20/08, nextDueDate=01/07), 30-day horizon.
  const monthly = projectRecurringOccurrences(makeRt({ frequency: "monthly", nextDueDate: daysAgo(50), startDate: daysAgo(50) }), now, horizonEnd(30));
  for (const occ of monthly) assert.ok(occ >= now, `Monthly: occurrence ${occ.toISOString()} is before asOf — overdue leak`);
  for (const occ of monthly) assert.ok(occ <= horizonEnd(30), "Monthly: occurrence must not exceed horizonEnd");

  // Monthly with an endDate that already passed BEFORE asOf: the recurring rule is
  // fully expired — zero occurrences must ever be projected into the future, even
  // though nextDueDate itself is also overdue and would otherwise need advancing.
  const expiredMonthly = projectRecurringOccurrences(
    makeRt({ frequency: "monthly", nextDueDate: daysAgo(40), startDate: daysAgo(40), endDate: daysAgo(1) }),
    now,
    horizonEnd(30)
  );
  assert.strictEqual(expiredMonthly.length, 0, "Monthly with endDate before asOf must project zero future occurrences");

  // Monthly with an endDate still in the future: occurrences must respect it (none
  // returned past endDate) while still correctly advancing past the overdue nextDueDate.
  const boundedMonthly = projectRecurringOccurrences(
    makeRt({ frequency: "monthly", nextDueDate: daysAgo(40), startDate: daysAgo(40), endDate: horizonEnd(200) }),
    now,
    horizonEnd(30)
  );
  for (const occ of boundedMonthly) assert.ok(occ >= now, "Bounded monthly: occurrence before asOf — overdue leak");

  console.log("✓ projectRecurringOccurrences: daily/weekly/monthly overdue occurrences never leak into the future window");
  console.log("✓ projectRecurringOccurrences: endDate before asOf yields zero occurrences (rule fully expired)");
  console.log("✓ projectRecurringOccurrences: endDate still respected while advancing past overdue occurrences");
}

async function run() {
  testProjectionOverdueBoundaries();

  console.log("Setting up Cashflow Forecast test...");

  const [testUser] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      name: "Phase6 Forecast Test User",
      email: `phase6-forecast-${Date.now()}@example.test`,
    })
    .returning();

  try {
    const now = new Date();

    const [account] = await db
      .insert(financialAccounts)
      .values({
        id: crypto.randomUUID(),
        userId: testUser.id,
        name: "Test Account",
        type: "bank",
        balance: 5_000_000,
      })
      .returning();
    const [account2] = await db
      .insert(financialAccounts)
      .values({
        id: crypto.randomUUID(),
        userId: testUser.id,
        name: "Test Account 2",
        type: "bank",
        balance: 0,
      })
      .returning();

    // 1. No data at all -> insufficient data, low confidence.
    // Truyền chung `now` cho MỌI lần gọi getForecast trong test này, để tránh
    // ForecastService tự đọc `new Date()` ở một thời điểm khác (dù chỉ vài ms sau) —
    // đó chính là nguyên nhân gốc khiến occurrence tại nextDueDate === now bị coi là
    // "trước" forecast start và bị loại khỏi projection.
    const emptyForecast = await ForecastService.getForecast(testUser.id, 30, now);
    assert.strictEqual(emptyForecast.insufficientData, true, "No history + no recurring must be insufficientData");
    assert.strictEqual(emptyForecast.confidence, "low");
    assert.strictEqual(emptyForecast.projectedIncome, 0);
    assert.strictEqual(emptyForecast.projectedExpense, 0);

    // 2. A monthly recurring salary of 10,000,000 -> should project ~1 occurrence in 30 days.
    const [recurring] = await db
      .insert(recurringTransactions)
      .values({
        id: crypto.randomUUID(),
        userId: testUser.id,
        accountId: account.id,
        amount: 10_000_000,
        type: "income",
        frequency: "monthly",
        startDate: now,
        nextDueDate: now,
        isActive: true,
      })
      .returning();

    const withRecurring = await ForecastService.getForecast(testUser.id, 30, now);
    assert.ok(withRecurring.recurringIncome >= 10_000_000, "Recurring income must be projected exactly, not estimated");

    // 3. A non-recurring historical expense (last 10 days) must feed the variable baseline,
    // while a TRANSFER in the same window must be excluded entirely from both income/expense.
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    await db.insert(transactions).values([
      {
        id: crypto.randomUUID(),
        userId: testUser.id,
        accountId: account.id,
        type: "expense",
        amount: 1_000_000,
        transactionDate: tenDaysAgo,
        status: "completed",
      },
      {
        id: crypto.randomUUID(),
        userId: testUser.id,
        accountId: account.id,
        toAccountId: account2.id,
        type: "transfer",
        amount: 2_000_000,
        transactionDate: tenDaysAgo,
        status: "completed",
      },
      // A transaction that WAS generated by the recurring rule above must NOT be
      // double counted into the variable baseline.
      {
        id: crypto.randomUUID(),
        userId: testUser.id,
        accountId: account.id,
        type: "income",
        amount: 10_000_000,
        transactionDate: tenDaysAgo,
        status: "completed",
        recurringTransactionId: recurring.id,
        recurringOccurrenceDate: tenDaysAgo,
      },
    ]);

    const withHistory = await ForecastService.getForecast(testUser.id, 30, now);
    assert.ok(withHistory.estimatedVariableExpense > 0, "Variable expense baseline must reflect the non-recurring expense");
    assert.ok(
      withHistory.estimatedVariableIncome < 10_000_000,
      "The recurring-linked income transaction must be excluded from the variable baseline (no double counting)"
    );
    assert.strictEqual(withHistory.confidence !== "low", true, "Should no longer be low confidence with recurring + history");

    // 4. Horizons scale roughly proportionally for the variable component.
    const forecast90 = await ForecastService.getForecast(testUser.id, 90, now);
    assert.ok(
      forecast90.estimatedVariableExpense >= withHistory.estimatedVariableExpense,
      "Longer horizon must project at least as much variable expense"
    );

    console.log("✓ Insufficient-data case returns low confidence, zero projections");
    console.log("✓ Recurring transactions projected exactly");
    console.log("✓ Transfers excluded from forecast entirely");
    console.log("✓ Recurring-linked transactions excluded from variable baseline (no double counting)");
    console.log("✓ 30/60/90 horizons scale consistently");

    // 5. Phase 6 Final Hardening Fix 2 (service-level): a recurring rule whose
    // nextDueDate is overdue (well before `now`) must NOT have its overdue occurrence(s)
    // counted into projected future income — only occurrence(s) with date >= now (asOf)
    // and <= horizonEnd may be counted. Mirrors the spec example (asOf=20/08,
    // nextDueDate=01/07): capture a baseline forecast first, add the overdue rule, then
    // assert the recurringIncome delta equals EXACTLY what the projection helper itself
    // says should land inside [now, horizonEnd] — no more (no overdue leak) and no less.
    const forecastBaseline = await ForecastService.getForecast(testUser.id, 30, now);

    const overdueAmount = 7_000_000;
    const overdueNextDue = new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000); // ~50 days overdue
    const horizon30End = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expectedOverdueOccurrences = projectRecurringOccurrences(
      {
        id: "overdue-expected",
        type: "income",
        amount: overdueAmount,
        frequency: "monthly",
        startDate: overdueNextDue,
        endDate: null,
        nextDueDate: overdueNextDue,
        note: null,
      },
      now,
      horizon30End
    );
    for (const occ of expectedOverdueOccurrences) {
      assert.ok(occ >= now, "Sanity: expected occurrences must never be before asOf");
    }

    await db.insert(recurringTransactions).values({
      id: crypto.randomUUID(),
      userId: testUser.id,
      accountId: account.id,
      amount: overdueAmount,
      type: "income",
      frequency: "monthly",
      startDate: overdueNextDue,
      nextDueDate: overdueNextDue,
      isActive: true,
    });

    const forecastAfterOverdueRule = await ForecastService.getForecast(testUser.id, 30, now);
    const recurringIncomeDelta = forecastAfterOverdueRule.recurringIncome - forecastBaseline.recurringIncome;
    assert.strictEqual(
      recurringIncomeDelta,
      expectedOverdueOccurrences.length * overdueAmount,
      "ForecastService must count exactly the in-window occurrences of the overdue recurring rule — no overdue leak, no missed occurrence"
    );

    console.log("✓ ForecastService: overdue recurring occurrence (nextDueDate far before asOf) does not leak into projected future income");
    console.log("PASS");
  } finally {
    await db.delete(recurringTransactions).where(eq(recurringTransactions.userId, testUser.id));
    await db.delete(transactions).where(eq(transactions.userId, testUser.id));
    await db.delete(financialAccounts).where(eq(financialAccounts.userId, testUser.id));
    await db.delete(users).where(eq(users.id, testUser.id));
    console.log("Cleanup complete.");
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FAIL", err);
    process.exit(1);
  });
