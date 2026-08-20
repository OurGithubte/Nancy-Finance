import { db } from "../src/db";
import { users, creditCards, creditCardStatements } from "../src/db/schema";
import { calendarService } from "../src/server/services/calendar";
import * as assert from "assert";
import { eq } from "drizzle-orm";

async function run() {
  console.log("Setting up Credit Card Calendar tests...");

  const [user] = await db.select().from(users).limit(1);
  if (!user) throw new Error("No user found");

  const cleanupIds: string[] = [];

  try {
    // CC1: statement 25, due 5
    const [cc1] = await db.insert(creditCards).values({
      id: crypto.randomUUID(),
      userId: user.id,
      name: "CC1",
      bankName: "Bank",
      last4Digits: "1111",
      creditLimit: 10000000,
      statementDay: 25,
      dueDay: 5,
    }).returning();
    cleanupIds.push(cc1.id);

    // CC2: statement 5, due 25
    const [cc2] = await db.insert(creditCards).values({
      id: crypto.randomUUID(),
      userId: user.id,
      name: "CC2",
      bankName: "Bank",
      last4Digits: "2222",
      creditLimit: 10000000,
      statementDay: 5,
      dueDay: 25,
    }).returning();
    cleanupIds.push(cc2.id);

    // CC3: statement 31, due 5 (Feb non-leap)
    const [cc3] = await db.insert(creditCards).values({
      id: crypto.randomUUID(),
      userId: user.id,
      name: "CC3",
      bankName: "Bank",
      last4Digits: "3333",
      creditLimit: 10000000,
      statementDay: 31,
      dueDay: 5,
    }).returning();
    cleanupIds.push(cc3.id);

    // CC4: statement 31, due 31
    const [cc4] = await db.insert(creditCards).values({
      id: crypto.randomUUID(),
      userId: user.id,
      name: "CC4",
      bankName: "Bank",
      last4Digits: "4444",
      creditLimit: 10000000,
      statementDay: 31,
      dueDay: 31,
    }).returning();
    cleanupIds.push(cc4.id);

    // Add a mock statement for CC1 to test exact amount resolution
    const cc1DueDate = new Date(2026, 7, 5); // 05/08/2026
    await db.insert(creditCardStatements).values({
      id: crypto.randomUUID(),
      creditCardId: cc1.id,
      statementDate: new Date(2026, 6, 25), // 25/07
      dueDate: cc1DueDate,
      totalDue: 1500000,
      minPaymentDue: 100000,
      isPaid: "unpaid",
    });

    console.log("Running assertions...");

    // Test range: 01/08/2026 -> 31/08/2026
    const startAugust = new Date(2026, 7, 1);
    const endAugust = new Date(2026, 7, 31);
    const events = await calendarService.getEventsInRange(user.id, startAugust, endAugust);

    const getEvents = (cardId: string, type: string) => events.filter(e => e.id.includes(cardId) && e.type === type);

    // 1. CC1: stmt 25, due 5
    const cc1Stmts = getEvents(cc1.id, "statement");
    const cc1Dues = getEvents(cc1.id, "payment_due");
    assert.strictEqual(cc1Stmts.length, 1);
    assert.strictEqual(cc1Stmts[0].date.getDate(), 25);
    assert.strictEqual(cc1Dues.length, 1);
    assert.strictEqual(cc1Dues[0].date.getDate(), 5);
    // Unpaid statement amount mapping check
    assert.strictEqual(cc1Dues[0].amount, 1500000); 

    // 2. CC2: stmt 5, due 25
    const cc2Stmts = getEvents(cc2.id, "statement");
    const cc2Dues = getEvents(cc2.id, "payment_due");
    assert.strictEqual(cc2Stmts.length, 1);
    assert.strictEqual(cc2Stmts[0].date.getDate(), 5);
    assert.strictEqual(cc2Dues.length, 1);
    assert.strictEqual(cc2Dues[0].date.getDate(), 25);

    // 3. CC3: stmt 31, due 5 (Feb non-leap)
    // Range 01/02/2026 -> 28/02/2026
    const startFeb = new Date(2026, 1, 1);
    const endFeb = new Date(2026, 1, 28);
    const febEvents = await calendarService.getEventsInRange(user.id, startFeb, endFeb);
    
    const cc3FebStmts = febEvents.filter(e => e.id.includes(cc3.id) && e.type === "statement");
    assert.strictEqual(cc3FebStmts.length, 1);
    assert.strictEqual(cc3FebStmts[0].date.getDate(), 28); // clamped to 28

    const cc3FebDues = febEvents.filter(e => e.id.includes(cc3.id) && e.type === "payment_due");
    assert.strictEqual(cc3FebDues.length, 1);
    assert.strictEqual(cc3FebDues[0].date.getDate(), 5); 

    // 4. CC4: stmt 31, due 31 (Feb leap year 2028)
    const startFeb28 = new Date(2028, 1, 1);
    const endFeb28 = new Date(2028, 1, 29);
    const feb28Events = await calendarService.getEventsInRange(user.id, startFeb28, endFeb28);

    const cc4FebStmts = feb28Events.filter(e => e.id.includes(cc4.id) && e.type === "statement");
    assert.strictEqual(cc4FebStmts.length, 1);
    assert.strictEqual(cc4FebStmts[0].date.getDate(), 29); // clamped to 29

    const cc4FebDues = feb28Events.filter(e => e.id.includes(cc4.id) && e.type === "payment_due");
    assert.strictEqual(cc4FebDues.length, 1);
    assert.strictEqual(cc4FebDues[0].date.getDate(), 29); 

    // 5. Test narrow range 10/08 -> 20/08
    const startNarrow = new Date(2026, 7, 10);
    const endNarrow = new Date(2026, 7, 20);
    const narrowEvents = await calendarService.getEventsInRange(user.id, startNarrow, endNarrow);
    
    // CC1 has stmt on 25 and due on 5, so narrowEvents should have ZERO for CC1
    const cc1Narrow = narrowEvents.filter(e => e.id.includes(cc1.id));
    assert.strictEqual(cc1Narrow.length, 0);

    console.log("✅ CALENDAR CC TESTS PASSED");

  } finally {
    console.log("Cleaning up...");
    for (const id of cleanupIds) {
      await db.delete(creditCards).where(eq(creditCards.id, id));
    }
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
